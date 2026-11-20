import * as THREE from 'https://esm.sh/three@0.165.0';

// ============================================================================
// ABM IT — Apple VisionOS Liquid Glass 3D Sculpture
// Refractive iridescent torus-knot crystal + inner luminous core + orbital rings
// Scroll-choreographed, pointer-reactive, Light/Dark aware, locked 60fps.
// ============================================================================
let scene, camera, renderer, clock;
let sculptureGroup, glassKnot, innerCore, ringOuter, ringInner, motes, envTex;
let keyLight, rimLightA, rimLightB;
let isMobile = false;
let isPaused = false;
let prefersReducedMotion = false;
let animationId = null;
let targetProgress = 0;
let smoothProgress = 0;
let pointerX = 0;
let pointerY = 0;
let smoothX = 0;
let smoothY = 0;

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDark = () => document.documentElement.classList.contains('dark');
const mix = (a, b, t) => a + (b - a) * t;

// Scroll stops: [x, y, scale]
const DESKTOP_PATH = [
  [3.1, 0.15, 1.0],
  [-3.1, 0.05, 0.94],
  [3.1, -0.05, 0.98],
  [0.0, 0.2, 1.08],
];
const MOBILE_PATH = [
  [0.0, 1.75, 0.64],
  [0.0, 1.45, 0.58],
  [0.0, 1.65, 0.60],
  [0.0, 1.25, 0.68],
];

function pathAt(p) {
  const stops = isMobile ? MOBILE_PATH : DESKTOP_PATH;
  const n = stops.length - 1;
  const f = Math.min(Math.max(p, 0), 0.9999) * n;
  const i = Math.floor(f);
  const t = f - i;
  const s = t * t * (3 - 2 * t);
  const a = stops[i];
  const b = stops[i + 1];
  return {
    x: mix(a[0], b[0], s),
    y: mix(a[1], b[1], s),
    s: mix(a[2], b[2], s),
  };
}

// Studio HDRI-style equirectangular reflection texture painted procedurally
function makeEnvironment(dark) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (dark) {
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.45, '#0f172a');
    grad.addColorStop(1, '#020617');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#e0f2fe');
    grad.addColorStop(1, '#94a3b8');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);

  // Soft studio light panels for crisp specular glass highlights
  const panel = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, w, h, 24);
    g.fill();
  };

  if (dark) {
    panel(90, 60, 260, 110, 'rgba(56, 189, 248, 0.65)');
    panel(620, 50, 290, 100, 'rgba(167, 139, 250, 0.55)');
    panel(380, 320, 240, 70, 'rgba(255, 255, 255, 0.35)');
  } else {
    panel(90, 60, 260, 110, 'rgba(255, 255, 255, 0.96)');
    panel(620, 50, 290, 100, 'rgba(224, 242, 254, 0.92)');
    panel(380, 320, 240, 70, 'rgba(255, 255, 255, 0.70)');
  }

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
  if (!glassKnot) return;
  const dark = isDark();

  if (envTex) envTex.dispose();
  envTex = makeEnvironment(dark);

  glassKnot.material.envMap = envTex;
  glassKnot.material.color.set(dark ? 0xe0f2fe : 0xffffff);
  glassKnot.material.attenuationColor.set(dark ? 0x38bdf8 : 0x0ea5e9);
  glassKnot.material.envMapIntensity = dark ? 1.5 : 1.3;
  glassKnot.material.needsUpdate = true;

  innerCore.material.color.set(dark ? 0x38bdf8 : 0x0284c7);
  innerCore.material.emissive.set(dark ? 0x6366f1 : 0x38bdf8);
  innerCore.material.emissiveIntensity = dark ? 1.35 : 0.75;

  ringOuter.material.color.set(dark ? 0x7dd3fc : 0x0284c7);
  ringOuter.material.opacity = dark ? 0.55 : 0.38;

  ringInner.material.color.set(dark ? 0xc4b5fd : 0x6366f1);
  ringInner.material.opacity = dark ? 0.45 : 0.28;

  motes.material.color.set(dark ? 0xbae6fd : 0x0ea5e9);
  motes.material.opacity = dark ? 0.65 : 0.45;

  keyLight.intensity = dark ? 1.6 : 1.25;
  rimLightA.color.set(dark ? 0x38bdf8 : 0x0ea5e9);
  rimLightB.color.set(dark ? 0xa78bfa : 0x6366f1);

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
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, isMobile ? 11.5 : 9.2);

  // Studio lighting rig
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(5, 6, 7);
  scene.add(keyLight);

  rimLightA = new THREE.PointLight(0x0ea5e9, 2.2, 20);
  rimLightA.position.set(-4, 3, 4);
  scene.add(rimLightA);

  rimLightB = new THREE.PointLight(0x6366f1, 1.8, 20);
  rimLightB.position.set(4, -3, 3);
  scene.add(rimLightB);

  sculptureGroup = new THREE.Group();
  scene.add(sculptureGroup);

  // 1. Primary Apple Liquid Glass Torus-Knot Sculpture
  const knotGeo = new THREE.TorusKnotGeometry(
    1.12,
    0.34,
    isMobile ? 140 : 220,
    isMobile ? 32 : 48,
    2,
    3
  );
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.04,
    roughness: 0.06,
    transmission: 0.92,
    ior: 1.5,
    thickness: 1.65,
    attenuationColor: new THREE.Color(0x0ea5e9),
    attenuationDistance: 2.4,
    iridescence: 0.85,
    iridescenceIOR: 1.34,
    iridescenceThicknessRange: [140, 560],
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3,
  });
  glassKnot = new THREE.Mesh(knotGeo, glassMat);
  sculptureGroup.add(glassKnot);

  // 2. Luminous Refracted Inner Core Sphere
  const coreGeo = new THREE.IcosahedronGeometry(0.46, 3);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.3,
  });
  innerCore = new THREE.Mesh(coreGeo, coreMat);
  sculptureGroup.add(innerCore);

  // 3. Precision Orbital Rings
  ringOuter = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.011, 16, 180),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.38 })
  );
  ringOuter.rotation.set(1.12, 0.25, 0);
  sculptureGroup.add(ringOuter);

  ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.92, 0.008, 16, 180),
    new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.28 })
  );
  ringInner.rotation.set(0.48, -0.75, 0.2);
  sculptureGroup.add(ringInner);

  // 4. Floating Luminous Depth Motes
  const count = isMobile ? 160 : 360;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 5.5 + Math.random() * 9.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 3.5;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  motes = new THREE.Points(
    motesGeo,
    new THREE.PointsMaterial({
      size: 0.04,
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  scene.add(motes);

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

  window.addEventListener(
    'mousemove',
    (e) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
    if (!isPaused && animationId === null && !prefersReducedMotion) {
      clock.getDelta();
      animate();
    }
  });

  onScroll();
  smoothProgress = targetProgress;
}

function onResize() {
  isMobile = window.innerWidth < 768;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = isMobile ? 11.5 : 9.2;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (prefersReducedMotion) onScroll();
}

function onScroll() {
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  targetProgress = max > 0 ? (window.scrollY || document.documentElement.scrollTop) / max : 0;
  if (prefersReducedMotion && sculptureGroup) {
    smoothProgress = targetProgress;
    renderFrame(0, 0);
  }
}

function renderFrame(delta, elapsed) {
  const damp = 1 - Math.exp(-delta * 4.5);
  smoothProgress += (targetProgress - smoothProgress) * (delta ? damp : 1);
  smoothX += (pointerX - smoothX) * (delta ? 1 - Math.exp(-delta * 3.5) : 1);
  smoothY += (pointerY - smoothY) * (delta ? 1 - Math.exp(-delta * 3.5) : 1);

  const p = pathAt(smoothProgress);
  const bob = Math.sin(elapsed * 0.75) * 0.14;

  sculptureGroup.position.set(p.x, p.y + bob, 0);
  sculptureGroup.scale.setScalar(p.s);

  glassKnot.rotation.y = smoothProgress * Math.PI * 1.4 + elapsed * 0.14 + smoothX * 0.28;
  glassKnot.rotation.x = 0.3 + smoothProgress * 0.75 + smoothY * 0.18;
  glassKnot.rotation.z = elapsed * 0.06;

  const corePulse = 1 + Math.sin(elapsed * 1.8) * 0.08;
  innerCore.scale.setScalar(corePulse);
  innerCore.rotation.y = -elapsed * 0.35;

  ringOuter.rotation.z = elapsed * 0.12 + smoothProgress * 1.6;
  ringInner.rotation.z = -elapsed * 0.09 - smoothProgress * 1.2;

  motes.rotation.y = elapsed * 0.015 + smoothProgress * 0.35;
  motes.position.y = smoothProgress * 1.4;

  camera.position.x = smoothX * 0.28;
  camera.position.y = -smoothY * 0.16;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

function animate() {
  if (isPaused || !sculptureGroup) {
    animationId = null;
    return;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  renderFrame(delta, clock.elapsedTime);
  animationId = requestAnimationFrame(animate);
}

// ============================================================================
// Scroll reveal observer
// ============================================================================
function initScrollReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!prefersReducedMotion) {
            entry.target.classList.add('visible');
          } else {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
          }
          observer.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: '0px 0px -70px 0px', threshold: 0.08 }
  );

  document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
}

// ============================================================================
// Top scroll progress indicator
// ============================================================================
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  function updateProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    progressBar.style.width = scrolled + '%';
  }

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
    const isOpen = mobileNav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================================================
// Light / Obsidian Dark Theme Toggle with crisp Sun & Moon icons
// ============================================================================
const SUN_SVG =
  '<circle cx="12" cy="12" r="4"></circle>' +
  '<path d="M12 2v2"></path>' +
  '<path d="M12 20v2"></path>' +
  '<path d="m4.93 4.93 1.41 1.41"></path>' +
  '<path d="m17.66 17.66 1.41 1.41"></path>' +
  '<path d="M2 12h2"></path>' +
  '<path d="M20 12h2"></path>' +
  '<path d="m6.34 17.66-1.41 1.41"></path>' +
  '<path d="m19.07 4.93-1.41 1.41"></path>';

const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const html = document.documentElement;
  if (!toggle) return;

  const syncIcon = (dark) => {
    if (icon) icon.innerHTML = dark ? SUN_SVG : MOON_SVG;
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
// One-click Copy Email with Apple-style glass toast
// ============================================================================
function initCopyEmail() {
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (!emailLink) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('iftiazabm@gmail.com').then(() => {
        showToast('Copied: iftiazabm@gmail.com');
      });
    } else {
      showToast('iftiazabm@gmail.com');
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 84px;
    left: 50%;
    transform: translateX(-50%) translateY(-6px);
    background: rgba(15, 23, 42, 0.90);
    color: #f8fafc;
    padding: 10px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    font-family: Inter, -apple-system, sans-serif;
    z-index: 100;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.45);
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-6px)';
    setTimeout(() => toast.remove(), 260);
  }, 2200);
}

// ============================================================================
// Bootstrap
// ============================================================================
function init() {
  initThree();
  initScrollReveals();
  initScrollProgress();
  initMobileMenu();
  initThemeToggle();
  initCopyEmail();

  if (!prefersReducedMotion) {
    animate();
  } else if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
