import * as THREE from 'three';

// ============================================================================
// ABM IT — 3D background: one polished crystal that glides with the scroll.
// Local Three.js bundle, aspect-safe framing (zero edge clipping), dual-theme.
// ============================================================================
let scene, camera, renderer, clock;
let hero, edges, innerCore, ringA, ringB, stars, envTex, keyLight, rimLight;
let isMobile = false;
let isPaused = false;
let prefersReducedMotion = false;
let animationId = null;
let targetProgress = 0;
let smoothProgress = 0;
let maxScroll = 0; // cached/stabilized scroll height range
let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDark = () => document.documentElement.classList.contains('dark');
const mix = (a, b, t) => a + (b - a) * t;

// Aspect-safe position / scale stops along the page: [x, y, scale]
// Outer ring radius is 2.75, so max horizontal extent is ~2.45 + 2.75 = 5.20 units,
// safely inside the camera frustum on 16:10, 16:9, and mobile viewports.
const DESKTOP_PATH = [
  [2.45, 0.1, 0.96],
  [-2.45, 0.0, 0.92],
  [2.45, -0.1, 0.96],
  [0.0, 0.25, 1.04],
];
const MOBILE_PATH = [
  [0, 1.75, 0.56],
  [0, 1.45, 0.52],
  [0, 1.65, 0.55],
  [0, 1.25, 0.62],
];

function computeCameraZ() {
  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  if (aspect < 0.75) {
    // Portrait phones
    return Math.max(11.8, 7.2 / aspect);
  }
  if (aspect < 1.35) {
    // Tablets / narrow windows
    return Math.max(10.8, 12.2 / aspect);
  }
  // 16:10 (1.6) -> ~10.3, 16:9 (1.77) -> ~9.8
  return Math.max(9.8, 16.5 / aspect);
}

function pathAt(p) {
  const stops = isMobile ? MOBILE_PATH : DESKTOP_PATH;
  const n = stops.length - 1;
  const f = Math.min(Math.max(p, 0), 0.9999) * n;
  const i = Math.floor(f);
  const t = f - i;
  const s = t * t * (3 - 2 * t); // smoothstep
  const a = stops[i], b = stops[i + 1];
  return { x: mix(a[0], b[0], s), y: mix(a[1], b[1], s), s: mix(a[2], b[2], s) };
}

// Soft studio-light reflections painted on an offscreen canvas (zero external assets)
function makeEnvironment(dark) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (dark) {
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#040711');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#475569');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);

  const box = (x, y, w, h, a) => {
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.fillRect(x, y, w, h);
  };
  box(55, 35, 115, 55, dark ? 0.6 : 0.95);
  box(305, 25, 135, 45, dark ? 0.45 : 0.85);
  box(200, 155, 95, 30, dark ? 0.3 : 0.55);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

function applyTheme() {
  if (!hero) return;
  const dark = isDark();
  if (envTex) envTex.dispose();
  envTex = makeEnvironment(dark);

  hero.material.envMap = envTex;
  hero.material.color.set(dark ? 0x93c5fd : 0x1e293b);
  hero.material.emissive.set(dark ? 0x0c4a6e : 0x000000);
  hero.material.emissiveIntensity = dark ? 0.22 : 0.0;
  hero.material.needsUpdate = true;

  if (innerCore) {
    innerCore.material.color.set(dark ? 0x38bdf8 : 0x0284c7);
    innerCore.material.emissive.set(dark ? 0x0ea5e9 : 0x38bdf8);
    innerCore.material.emissiveIntensity = dark ? 0.9 : 0.25;
  }

  edges.material.color.set(dark ? 0x7dd3fc : 0x0284c7);
  edges.material.opacity = dark ? 0.45 : 0.32;

  ringA.material.color.set(dark ? 0x38bdf8 : 0x0284c7);
  ringA.material.opacity = dark ? 0.55 : 0.42;

  ringB.material.color.set(dark ? 0xa78bfa : 0x64748b);
  ringB.material.opacity = dark ? 0.36 : 0.28;

  stars.material.color.set(dark ? 0xbae6fd : 0x64748b);
  stars.material.opacity = dark ? 0.6 : 0.42;

  keyLight.intensity = dark ? 1.55 : 1.15;
  if (rimLight) rimLight.intensity = dark ? 1.2 : 0.5;

  if (prefersReducedMotion) renderer.render(scene, camera);
}

function initThree() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  isMobile = window.innerWidth < 768;
  prefersReducedMotion = reducedQuery.matches;
  reducedQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    renderer = { render() {}, setSize() {}, setPixelRatio() {} };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, computeCameraZ());

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);

  rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
  rimLight.position.set(-5, -3, -4);
  scene.add(rimLight);

  // Hero crystal: faceted, polished, with crisp edge lines & glowing inner core
  const geo = new THREE.IcosahedronGeometry(1.38, 1);
  hero = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.84,
      roughness: 0.16,
      clearcoat: isMobile ? 0 : 1,
      clearcoatRoughness: 0.08,
      iridescence: isMobile ? 0 : 0.45,
      iridescenceIOR: 1.38,
      envMapIntensity: 1.25,
      flatShading: true,
    })
  );

  innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      roughness: 0.25,
      metalness: 0.6,
    })
  );
  hero.add(innerCore);

  edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.32 })
  );
  hero.add(edges);
  scene.add(hero);

  // Two hairline orbit rings sized so they never clip at viewport edges
  const ringMat = (o) => new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: o });
  ringA = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.013, 12, 160), ringMat(0.45));
  ringB = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.009, 12, 160), ringMat(0.28));
  ringA.rotation.x = 1.15;
  ringB.rotation.set(0.52, 0.88, 0);
  scene.add(ringA, ringB);

  // Sparse depth particles
  const count = isMobile ? 180 : 400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 9;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 4;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(
    sg,
    new THREE.PointsMaterial({ size: 0.034, transparent: true, opacity: 0.45, depthWrite: false })
  );
  scene.add(stars);

  clock = new THREE.Clock();
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
  });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
  onScroll();
  smoothProgress = targetProgress;
}

function onMouseMove(e) {
  pointerX = (e.clientX / window.innerWidth) * 2 - 1;
  pointerY = (e.clientY / window.innerHeight) * 2 - 1;
}

function onVisibilityChange() {
  isPaused = document.hidden;
  if (!isPaused && animationId === null && !prefersReducedMotion) {
    clock.getDelta();
    animate();
  }
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const widthChanged = width !== lastWidth;
  const heightChanged = height !== lastHeight;
  const significantHeightChange = Math.abs(height - lastHeight) >= 150;

  lastWidth = width;
  lastHeight = height;
  isMobile = width < 768;

  // On mobile, ignore height-only changes smaller than 150px. These are caused
  // by the browser URL bar / toolbars showing or hiding while the user scrolls
  // — without this guard the camera z, aspect ratio, and canvas size jump
  // mid-scroll, producing visible 3D jitter near the bottom of the page.
  // Only resize when the width changes (orientation) or height changes by
  // >= 150px (real layout change).
  if (isMobile && !widthChanged && !significantHeightChange) {
    return;
  }

  camera.aspect = width / Math.max(height, 1);
  camera.position.z = computeCameraZ();
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(width, height);
  if (prefersReducedMotion) onScroll();
}

function onScroll() {
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  maxScroll = max > 0 ? max : 0; // cache/stabilize so it isn't recomputed erratically
  const raw = maxScroll > 0 ? (window.scrollY || document.documentElement.scrollTop) / maxScroll : 0;
  // Clamp targetProgress between 0 and 1 so mobile rubber-band overscroll
  // (scrollY > maxScroll at the bottom, or scrollY < 0 at the top) cannot
  // produce sudden velocity snaps in the crystal animation.
  targetProgress = Math.min(Math.max(raw, 0), 1);
  if (prefersReducedMotion && hero) {
    smoothProgress = targetProgress;
    renderFrame(0, 0);
  }
}

function renderFrame(delta, elapsed) {
  // Cap delta so frame spikes never cause visual jumps.
  const cappedDelta = Math.min(Math.max(delta, 0), 0.05);
  // Smoother damping on mobile so the crystal glides without snapping all the
  // way to the footer; desktop keeps the original factor.
  const damp = isMobile
    ? 1 - Math.exp(-cappedDelta * 6)
    : 1 - Math.exp(-cappedDelta * 4);
  smoothProgress += (targetProgress - smoothProgress) * (cappedDelta ? damp : 1);
  smoothX += (pointerX - smoothX) * (cappedDelta ? 1 - Math.exp(-cappedDelta * 3) : 1);
  smoothY += (pointerY - smoothY) * (cappedDelta ? 1 - Math.exp(-cappedDelta * 3) : 1);

  const p = pathAt(smoothProgress);
  const bob = Math.sin(elapsed * 0.65) * 0.11;
  hero.position.set(p.x, p.y + bob, 0);
  hero.scale.setScalar(p.s);
  hero.rotation.y = smoothProgress * Math.PI * 1.2 + elapsed * 0.06 + smoothX * 0.22;
  hero.rotation.x = 0.25 + smoothProgress * 0.6 + smoothY * 0.14;

  if (innerCore) {
    innerCore.rotation.y = -elapsed * 0.35;
    innerCore.rotation.x = elapsed * 0.22;
  }

  ringA.position.copy(hero.position);
  ringA.scale.setScalar(p.s);
  ringB.position.copy(hero.position);
  ringB.scale.setScalar(p.s);
  ringA.rotation.z = elapsed * 0.09 + smoothProgress * 1.5;
  ringB.rotation.z = -elapsed * 0.06 - smoothProgress;

  stars.rotation.y = elapsed * 0.01 + smoothProgress * 0.35;
  stars.position.y = smoothProgress * 1.4;

  camera.position.x = smoothX * 0.22;
  camera.position.y = -smoothY * 0.14;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

function animate() {
  if (isPaused || !hero) {
    animationId = null;
    return;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  renderFrame(delta, clock.elapsedTime);
  animationId = requestAnimationFrame(animate);
}

// ============================================================================
// Three.js resource disposal (cleanup on page unload / re-init)
// ============================================================================
function dispose() {
  // Stop the render loop
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isPaused = true;

  // Dispose materials
  const disposeMaterial = (m) => {
    if (!m) return;
    if (Array.isArray(m)) {
      m.forEach(disposeMaterial);
      return;
    }
    if (m.map) m.map.dispose();
    if (m.envMap) m.envMap.dispose();
    if (m.alphaMap) m.alphaMap.dispose();
    if (m.bumpMap) m.bumpMap.dispose();
    if (m.normalMap) m.normalMap.dispose();
    if (m.displacementMap) m.displacementMap.dispose();
    if (m.roughnessMap) m.roughnessMap.dispose();
    if (m.metalnessMap) m.metalnessMap.dispose();
    if (m.emissiveMap) m.emissiveMap.dispose();
    if (m.gradientMap) m.gradientMap.dispose();
    if (m.specularMap) m.specularMap.dispose();
    if (m.lightMap) m.lightMap.map.dispose && m.lightMap.dispose();
    m.dispose();
  };

  // Dispose geometries
  const disposeGeometry = (g) => {
    if (!g) return;
    if (g.geometry) disposeGeometry(g.geometry);
    g.dispose();
  };

  [hero, innerCore, edges, ringA, ringB, stars].forEach((obj) => {
    if (!obj) return;
    if (obj.geometry) disposeGeometry(obj.geometry);
    if (obj.material) disposeMaterial(obj.material);
    if (obj.parent) obj.parent.remove(obj);
  });

  if (envTex) envTex.dispose();

  // Dispose renderer
  if (renderer) {
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  clock = null;
  hero = edges = innerCore = ringA = ringB = stars = envTex = keyLight = rimLight = null;

  // Remove window listeners
  window.removeEventListener('resize', onResize);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('scroll', updateProgress);
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

// ============================================================================
// Scroll Reveals (fail-safe so sections can never stay hidden)
// ============================================================================
function initScrollReveals() {
  const revealEls = document.querySelectorAll('.scroll-reveal');

  const revealAll = () => {
    revealEls.forEach((el) => el.classList.add('visible'));
  };

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    revealAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05,
    }
  );

  revealEls.forEach((el, idx) => {
    if (idx === 0) {
      // Hero is always immediately visible
      el.classList.add('visible');
    } else {
      observer.observe(el);
    }
  });

  // Safety fallback: ensure all sections are visible even on unusual viewports
  setTimeout(revealAll, 1500);
}

// ============================================================================
// Scroll progress bar
// ============================================================================
let progressBarEl = null;

function updateProgress() {
  if (!progressBarEl) return;
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  progressBarEl.style.width = scrolled + '%';
}

function initScrollProgress() {
  progressBarEl = document.getElementById('scroll-progress');
  if (!progressBarEl) return;

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ============================================================================
// Mobile hamburger menu
// ============================================================================
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    if (isOpen) {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    } else {
      mobileNav.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================================================
// Dark / Light mode toggle
// ============================================================================
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
const SUN_SVG =
  '<circle cx="12" cy="12" r="4"></circle>' +
  '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>';

function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const html = document.documentElement;
  if (!toggle) return;

  const syncIcon = (dark) => {
    if (icon) {
      icon.innerHTML = dark ? SUN_SVG : MOON_SVG;
    }
    toggle.setAttribute('title', dark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  };

  syncIcon(html.classList.contains('dark'));

  toggle.addEventListener('click', () => {
    const isNowDark = html.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
    } catch (e) {}
    syncIcon(isNowDark);
  });
}

// ============================================================================
// Copy Email with toast
// ============================================================================
function initCopyEmail() {
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (!emailLink) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('iftiazabm@gmail.com').then(() => {
        showToast('Email copied: iftiazabm@gmail.com');
      });
    } else {
      window.location.href = 'mailto:iftiazabm@gmail.com';
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.9);
    color: white;
    padding: 8px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 500;
    font-family: Inter, sans-serif;
    z-index: 100;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    opacity: 0;
    transition: opacity 0.25s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

// ============================================================================
// Initialize
// ============================================================================
function init() {
  initScrollReveals();
  initScrollProgress();
  initMobileMenu();
  initThemeToggle();
  initCopyEmail();
  initThree();

  // Clean up Three.js resources on page unload
  window.addEventListener('beforeunload', dispose, { passive: true });

  if (!prefersReducedMotion && hero) {
    animate();
  } else if (hero && renderer) {
    renderer.render(scene, camera);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
