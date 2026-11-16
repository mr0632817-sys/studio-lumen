import * as THREE from 'https://esm.sh/three@0.165.0';

// ============================================================================
// Advanced Three.js 3D Background — Apple-Grade Liquid Glass Centerpiece
// Scroll-driven choreography + responsive camera + 60fps performance
// ============================================================================
let scene, camera, renderer, clock;
let meshGroup;
let spheres = [];
let torusKnots = [];
let pointLight1, pointLight2, ambientLight;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let mouseX = 0;
let mouseY = 0;
let scrollProgress = 0;
let isMobile = false;
let isPaused = false;
let prefersReducedMotion = false;
let animationId = null;

const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function detectMobile() {
  return window.innerWidth < 768;
}

function initThree() {
  const canvas = document.getElementById('bg-canvas');
  isMobile = detectMobile();
  prefersReducedMotion = prefersReducedMotionQuery.matches;
  prefersReducedMotionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf8fafc, isMobile ? 0.004 : 0.006);

  // Camera: Desktop Z=14, Mobile Z = 14 * 1.65 ≈ 23
  const camZ = isMobile ? 23 : 14;
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, camZ);

  // Lock pixelRatio at min(devicePixelRatio, 2)
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Ambient light — soft base
  ambientLight = new THREE.AmbientLight(0xffffff, isMobile ? 0.35 : 0.45);
  scene.add(ambientLight);

  // Point light 1 — crisp blue accent
  pointLight1 = new THREE.PointLight(0x0ea5e9, isMobile ? 2.0 : 3.0, 100);
  pointLight1.position.set(6, 6, 8);
  scene.add(pointLight1);

  // Point light 2 — warm fill for dimensional glass refraction
  pointLight2 = new THREE.PointLight(0xffffff, isMobile ? 1.0 : 1.5, 100);
  pointLight2.position.set(-6, -4, 6);
  scene.add(pointLight2);

  // Main mesh group — scaled down on mobile so entire sculpture fits narrow screens
  meshGroup = new THREE.Group();
  meshGroup.scale.setScalar(isMobile ? 0.72 : 1.0);
  scene.add(meshGroup);

  // Create glass spheres — fewer on mobile, constrained to center
  const sphereCount = isMobile ? 6 : 10;
  const sphereSpread = isMobile ? 1.8 : 16; // keep within -1.8 to 1.8 on mobile
  for (let i = 0; i < sphereCount; i++) {
    const radius = 0.35 + Math.random() * 0.6;
    const geometry = new THREE.SphereGeometry(radius, isMobile ? 32 : 64, isMobile ? 32 : 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0.06,
      transmission: 0.72,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.2,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(
      (Math.random() - 0.5) * sphereSpread,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * sphereSpread
    );
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.userData = {
      floatSpeed: 0.5 + Math.random() * 1.0,
      floatOffset: Math.random() * Math.PI * 2,
      rotateSpeed: {
        x: 0.12 + Math.random() * 0.18,
        y: 0.12 + Math.random() * 0.18,
        z: 0.08 + Math.random() * 0.12,
      },
      baseY: sphere.position.y,
      baseX: sphere.position.x,
      baseZ: sphere.position.z,
      driftMultiplier: 0.3 + Math.random() * 0.4,
    };
    scene.add(sphere);
    spheres.push(sphere);
  }

  // Create glass torus knots — fewer on mobile
  const torusCount = isMobile ? 2 : 3;
  const torusSpread = isMobile ? 1.6 : 14;
  for (let i = 0; i < torusCount; i++) {
    const geometry = new THREE.TorusKnotGeometry(0.6 + i * 0.35, 0.22 + i * 0.12, isMobile ? 64 : 128, isMobile ? 16 : 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.7,
      roughness: 0.08,
      transmission: 0.85,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.4,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    });
    const torus = new THREE.Mesh(geometry, material);
    torus.position.set(
      (Math.random() - 0.5) * torusSpread,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * torusSpread
    );
    torus.castShadow = true;
    torus.receiveShadow = true;
    torus.userData = {
      floatSpeed: 0.4 + Math.random() * 0.7,
      floatOffset: Math.random() * Math.PI * 2,
      rotateSpeed: {
        x: 0.18 + Math.random() * 0.22,
        y: 0.18 + Math.random() * 0.22,
      },
      baseY: torus.position.y,
      baseX: torus.position.x,
      baseZ: torus.position.z,
      driftMultiplier: 0.4 + Math.random() * 0.5,
    };
    scene.add(torus);
    torusKnots.push(torus);
  }

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  onScroll(); // init scroll progress
}

function onWindowResize() {
  const wasMobile = isMobile;
  isMobile = detectMobile();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Adjust camera Z for mobile framing
  const camZ = isMobile ? 23 : 14;
  camera.position.z = camZ;

  // Mobile: cap pixel ratio at 1.5; desktop up to 2
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);

  // Update group scale when crossing mobile/desktop boundary
  if (wasMobile !== isMobile) {
    meshGroup.scale.setScalar(isMobile ? 0.72 : 1.0);
  }
}

function onMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) / windowHalfX;
  mouseY = (event.clientY - windowHalfY) / windowHalfY;
}

function onTouchMove(event) {
  if (event.touches.length > 0) {
    const touch = event.touches[0];
    mouseX = (touch.clientX - windowHalfX) / windowHalfX;
    mouseY = (touch.clientY - windowHalfY) / windowHalfY;
  }
}

function onScroll() {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  scrollProgress = height > 0 ? winScroll / height : 0;
}

function onVisibilityChange() {
  isPaused = document.hidden;
  if (!isPaused && animationId === null) {
    animate();
  }
}

function getScrollCameraTarget() {
  // Scroll-driven camera Z: zoomed-in at Hero (0), shifts at About (~0.25),
  // pulled back at Software (~0.5), gliding back at Contact (~0.75+)
  const isMob = isMobile;
  const baseZ = isMob ? 23 : 14;

  let targetZ = baseZ;
  let targetY = 0;
  let targetX = 0;

  if (scrollProgress < 0.15) {
    // Hero: closer camera
    targetZ = isMob ? 20 : 12;
  } else if (scrollProgress < 0.40) {
    // About: slight shift
    targetZ = isMob ? 22 : 13;
    targetY = (scrollProgress - 0.15) / 0.25 * 0.5;
  } else if (scrollProgress < 0.65) {
    // Software: pulled back for text clarity
    targetZ = isMob ? 24 : 15;
    targetY = 0.5 - ((scrollProgress - 0.40) / 0.25 * 0.5);
  } else {
    // Contact: gliding back
    targetZ = isMob ? 23 : 14;
  }

  return { targetZ, targetY, targetX };
}

function animate() {
  if (isPaused) {
    animationId = null;
    return;
  }

  const elapsed = clock.getElapsedTime();
  const { targetZ, targetY, targetX } = getScrollCameraTarget();

  // Smooth camera interpolation
  camera.position.z += (targetZ - camera.position.z) * 0.05;
  camera.position.y += (targetY - camera.position.y) * 0.05;
  camera.position.x += (targetX - camera.position.x) * 0.05;

  // Animate spheres — float, rotate, react to scroll
  spheres.forEach((sphere, i) => {
    // Vertical float
    sphere.position.y =
      sphere.userData.baseY +
      Math.sin(elapsed * sphere.userData.floatSpeed + sphere.userData.floatOffset) * 0.55;

    // Scroll-driven vertical shift
    sphere.position.y += Math.sin(scrollProgress * Math.PI * 3 + i) * 0.35;

    // Rotation
    sphere.rotation.x += sphere.userData.rotateSpeed.x * 0.4;
    sphere.rotation.y += sphere.userData.rotateSpeed.y * 0.4;
    sphere.rotation.z += sphere.userData.rotateSpeed.z * 0.3;

    // Mouse/touch drift
    sphere.position.x += (mouseX * 2.5 * sphere.userData.driftMultiplier - sphere.position.x) * 0.02;
    sphere.position.y += (mouseY * 1.8 * sphere.userData.driftMultiplier - sphere.position.y) * 0.02;

    // Scroll-driven horizontal drift (constrained)
    sphere.position.x += Math.cos(scrollProgress * Math.PI * 2 + i) * 0.25;
  });

  // Animate torus knots — react to scroll
  torusKnots.forEach((torus, i) => {
    torus.rotation.x += torus.userData.rotateSpeed.x * 0.5;
    torus.rotation.y += torus.userData.rotateSpeed.y * 0.5;

    torus.position.y =
      torus.userData.baseY +
      Math.sin(elapsed * torus.userData.floatSpeed + torus.userData.floatOffset) * 0.5;

    torus.position.y += Math.sin(scrollProgress * Math.PI * 2.5 + i * 2) * 0.8;

    torus.position.x =
      torus.userData.baseX +
      Math.cos(scrollProgress * Math.PI * 2 + i) * 1.2;

    torus.position.z =
      torus.userData.baseZ +
      Math.sin(scrollProgress * Math.PI * 1.2 + i) * 0.8;

    torus.position.x += (mouseX * 1.8 * torus.userData.driftMultiplier - torus.position.x) * 0.02;
  });

  // Group-level slow rotation
  meshGroup.rotation.y = elapsed * 0.04 + mouseX * 0.08;
  meshGroup.rotation.x = Math.sin(elapsed * 0.12) * 0.08;

  // Camera subtle drift
  camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03;
  camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  // Scroll-driven light movement
  pointLight1.position.x = Math.sin(scrollProgress * Math.PI * 1.5) * 7;
  pointLight1.position.y = Math.cos(scrollProgress * Math.PI) * 7 + 4;
  pointLight1.color.setHSL(0.55 + scrollProgress * 0.08, 0.85, 0.65);

  pointLight2.position.x = Math.cos(scrollProgress * Math.PI * 1.2) * 7;
  pointLight2.position.y = Math.sin(scrollProgress * Math.PI * 1.2) * 6 - 1;

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// ============================================================================
// Scroll-triggered reveals via IntersectionObserver
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
