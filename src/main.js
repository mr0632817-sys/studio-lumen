import * as THREE from 'https://esm.sh/three@0.165.0';

// ============================================================================
// ABM IT — 3D background: one polished crystal that glides with the scroll.
// Slow time-based idle motion, damped scroll, light/dark aware, very light on GPU.
// ============================================================================
let scene, camera, renderer, clock;
let hero, edges, ringA, ringB, stars, envTex, keyLight;
let isMobile = false;
let isPaused = false;
let prefersReducedMotion = false;
let animationId = null;
let targetProgress = 0;
let smoothProgress = 0;
let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDark = () => document.documentElement.classList.contains('dark');
const mix = (a, b, t) => a + (b - a) * t;

// Position / scale stops along the page: [x, y, scale]
const DESKTOP_PATH = [[3.4, 0.1, 1], [-3.4, 0, 0.95], [3.4, -0.1, 1], [0, 0.3, 1.15]];
const MOBILE_PATH = [[0, 1.9, 0.62], [0, 1.5, 0.55], [0, 1.7, 0.6], [0, 1.2, 0.7]];

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

// Soft studio-light reflections painted on a canvas, no external image needed
function makeEnvironment(dark) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (dark) {
    grad.addColorStop(0, '#22345c'); grad.addColorStop(0.5, '#0c1430'); grad.addColorStop(1, '#05070f');
  } else {
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#cbd5e1'); grad.addColorStop(1, '#475569');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  const box = (x, y, w, h, a) => { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, w, h); };
  box(110, 70, 230, 110, dark ? 0.55 : 0.95);
  box(610, 50, 270, 90, dark ? 0.4 : 0.85);
  box(400, 310, 190, 60, dark ? 0.25 : 0.5);
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
  hero.material.color.set(dark ? 0xaab8ff : 0x243247);
  hero.material.needsUpdate = true;
  edges.material.color.set(dark ? 0x7dd3fc : 0x0ea5e9);
  ringA.material.color.set(dark ? 0x7dd3fc : 0x0ea5e9);
  ringB.material.color.set(dark ? 0xc4b5fd : 0x64748b);
  stars.material.color.set(dark ? 0xbfd4ff : 0x64748b);
  keyLight.intensity = dark ? 1.4 : 1.0;
  if (prefersReducedMotion) renderer.render(scene, camera);
}

function initThree() {
  const canvas = document.getElementById('bg-canvas');
  isMobile = window.innerWidth < 768;
  prefersReducedMotion = reducedQuery.matches;
  reducedQuery.addEventListener('change', (e) => { prefersReducedMotion = e.matches; });

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    // No WebGL: keep the page working with a plain background
    renderer = { render() {}, setSize() {}, setPixelRatio() {} };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, isMobile ? 11 : 9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);

  // Hero crystal: faceted, polished, with crisp edge lines
  const geo = new THREE.IcosahedronGeometry(1.5, 1);
  hero = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0x243247, metalness: 0.85, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: 0.5, iridescenceIOR: 1.4, envMapIntensity: 1.25, flatShading: true,
  }));
  edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.35 })
  );
  hero.add(edges);
  scene.add(hero);

  // Two hairline orbit rings
  const ringMat = (o) => new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: o });
  ringA = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 12, 180), ringMat(0.5));
  ringB = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.008, 12, 180), ringMat(0.3));
  ringA.rotation.x = 1.15;
  ringB.rotation.set(0.5, 0.9, 0);
  scene.add(ringA, ringB);

  // Sparse depth particles
  const count = isMobile ? 220 : 480;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 10;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 4;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(stars);

  clock = new THREE.Clock();
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
  });
  window.addEventListener('mousemove', (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    isPaused = document.hidden;
    if (!isPaused && animationId === null && !prefersReducedMotion) { clock.getDelta(); animate(); }
  });
  onScroll();
  smoothProgress = targetProgress;
}

function onResize() {
  isMobile = window.innerWidth < 768;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = isMobile ? 11 : 9;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (prefersReducedMotion) onScroll();
}

function onScroll() {
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  targetProgress = max > 0 ? (window.scrollY || document.documentElement.scrollTop) / max : 0;
  if (prefersReducedMotion && hero) { smoothProgress = targetProgress; renderFrame(0, 0); }
}

function renderFrame(delta, elapsed) {
  // Frame-rate independent damping: same feel on 60Hz and 120Hz screens
  const damp = 1 - Math.exp(-delta * 4);
  smoothProgress += (targetProgress - smoothProgress) * (delta ? damp : 1);
  smoothX += (pointerX - smoothX) * (delta ? 1 - Math.exp(-delta * 3) : 1);
  smoothY += (pointerY - smoothY) * (delta ? 1 - Math.exp(-delta * 3) : 1);

  const p = pathAt(smoothProgress);
  const bob = Math.sin(elapsed * 0.6) * 0.12;
  hero.position.set(p.x, p.y + bob, 0);
  hero.scale.setScalar(p.s);
  hero.rotation.y = smoothProgress * Math.PI * 1.2 + elapsed * 0.05 + smoothX * 0.2;
  hero.rotation.x = 0.25 + smoothProgress * 0.6 + smoothY * 0.12;

  ringA.position.copy(hero.position); ringA.scale.setScalar(p.s);
  ringB.position.copy(hero.position); ringB.scale.setScalar(p.s);
  ringA.rotation.z = elapsed * 0.08 + smoothProgress * 1.5;
  ringB.rotation.z = -elapsed * 0.05 - smoothProgress;

  stars.rotation.y = elapsed * 0.01 + smoothProgress * 0.4;
  stars.position.y = smoothProgress * 1.5;

  camera.position.x = smoothX * 0.25;
  camera.position.y = -smoothY * 0.15;
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

function animate() {
  if (isPaused || !hero) { animationId = null; return; }
  const delta = Math.min(clock.getDelta(), 0.05);
  renderFrame(delta, clock.elapsedTime);
  animationId = requestAnimationFrame(animate);
}

// ============================================================================
function initScrollReveals() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -90px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
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
  }, observerOptions);

  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    observer.observe(el);
  });
}

// ============================================================================
// Scroll progress bar
// ============================================================================
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');

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
// Dark mode toggle
// ============================================================================
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const html = document.documentElement;

  // Set initial icon
  if (icon) {
    icon.innerHTML = html.classList.contains('dark')
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
      : '<path d="M12 3v1m0 16v1m9-9h-1M4 22H3m0 0h-1m4.43-4.43l-.707.707m14.143-14.143l-.707.707M17 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 11v5m-7 0H9m2 0h-3m-1 0H7m15 0h-1m-1 4l-.707-.707m-14.142 14.143l.707-.707m0-14.142l.707.707"></path>'
  }

  toggle.addEventListener('click', () => {
    const isNowDark = html.classList.toggle('dark');
    try { localStorage.setItem('theme', isNowDark ? 'dark' : 'light'); } catch (e) {}
    if (icon) {
      icon.innerHTML = isNowDark
        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
        : '<path d="M12 3v1m0 16v1m9-9h-1M4 22H3m0 0h-1m4.43-4.43l-.707.707m14.143-14.143l-.707.707M17 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 11v5m-7 0H9m2 0h-3m-1 0H7m15 0h-1m-1 4l-.707-.707m-14.142 14.143l.707-.707m0-14.142l.707.707"></path>'
    }
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
    navigator.clipboard.writeText('iftiazabm@gmail.com').then(() => {
      showToast('Email copied!');
    });
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
    background: rgba(15, 23, 42, 0.85);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-family: Inter, sans-serif;
    z-index: 100;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ============================================================================
// Initialize
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
  } else {
    // Still render once for static scene
    renderer.render(scene, camera);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
