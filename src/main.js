import * as THREE from 'https://esm.sh/three@0.165.0';

// ============================================================================
// Advanced Three.js 3D Background — Scroll-Reactive Glass Spheres & Torus Meshes
// Mobile-optimized: capped pixel ratio, responsive camera, centered objects
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

function detectMobile() {
  return window.innerWidth < 768;
}

function initThree() {
  const canvas = document.getElementById('bg-canvas');
  isMobile = detectMobile();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf8fafc, 0.005);

  // Mobile: move camera further back so wide 3D spread fits on narrow screens
  const camZ = isMobile ? 24 : 14;
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, camZ);

  // Mobile: cap pixel ratio at 1.5 to save GPU/battery; desktop up to 2
  const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Ambient light — soft base
  ambientLight = new THREE.AmbientLight(0xffffff, isMobile ? 0.3 : 0.4);
  scene.add(ambientLight);

  // Point light 1 — accent blue
  pointLight1 = new THREE.PointLight(0x0ea5e9, isMobile ? 1.5 : 2.0, 100);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  // Point light 2 — soft fill
  pointLight2 = new THREE.PointLight(0xffffff, isMobile ? 0.8 : 1.0, 100);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  // Main mesh group — scaled down on mobile to fit narrow screens
  meshGroup = new THREE.Group();
  meshGroup.scale.setScalar(isMobile ? 0.6 : 1.0);
  scene.add(meshGroup);

  // Create glassmorphic reflective spheres — fewer on mobile
  const sphereCount = isMobile ? 5 : 8;
  const sphereSpread = isMobile ? 2.5 : 20; // keep spheres closer to center on mobile
  for (let i = 0; i < sphereCount; i++) {
    const radius = 0.4 + Math.random() * 0.8;
    const geometry = new THREE.SphereGeometry(radius, isMobile ? 24 : 64, isMobile ? 24 : 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.08,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(
      (Math.random() - 0.5) * sphereSpread,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * sphereSpread
    );
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.userData = {
      floatSpeed: 0.6 + Math.random() * 1.2,
      floatOffset: Math.random() * Math.PI * 2,
      rotateSpeed: {
        x: 0.15 + Math.random() * 0.25,
        y: 0.15 + Math.random() * 0.25,
        z: 0.1 + Math.random() * 0.2,
      },
      baseY: sphere.position.y,
      baseX: sphere.position.x,
      baseZ: sphere.position.z,
      driftMultiplier: 0.3 + Math.random() * 0.5,
    };
    scene.add(sphere);
    spheres.push(sphere);
  }

  // Create glass torus knots — fewer on mobile
  const torusCount = isMobile ? 2 : 3;
  const torusSpread = isMobile ? 2.0 : 15; // keep torus knots closer to center on mobile
  for (let i = 0; i < torusCount; i++) {
    const geometry = new THREE.TorusKnotGeometry(0.7 + i * 0.4, 0.25 + i * 0.1, isMobile ? 64 : 128, isMobile ? 16 : 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.6,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.8,
      clearcoat: 1.2,
      clearcoatRoughness: 0.05,
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
      floatSpeed: 0.4 + Math.random() * 0.8,
      floatOffset: Math.random() * Math.PI * 2,
      rotateSpeed: {
        x: 0.2 + Math.random() * 0.3,
        y: 0.2 + Math.random() * 0.3,
      },
      baseY: torus.position.y,
      baseX: torus.position.x,
      baseZ: torus.position.z,
      driftMultiplier: 0.4 + Math.random() * 0.6,
    };
    scene.add(torus);
    torusKnots.push(torus);
  }

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // init scroll progress
}

function onWindowResize() {
  const wasMobile = isMobile;
  isMobile = detectMobile();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Adjust camera Z for mobile framing
  const camZ = isMobile ? 24 : 14;
  camera.position.z = camZ;

  // Mobile: cap pixel ratio at 1.5; desktop up to 2
  const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);

  // Update group scale when crossing mobile/desktop boundary
  if (wasMobile !== isMobile) {
    meshGroup.scale.setScalar(isMobile ? 0.6 : 1.0);
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

function animateThree() {
  const elapsed = clock.getElapsedTime();

  // Animate spheres — float, rotate, react to scroll
  spheres.forEach((sphere, i) => {
    // Vertical float
    sphere.position.y =
      sphere.userData.baseY +
      Math.sin(elapsed * sphere.userData.floatSpeed + sphere.userData.floatOffset) * 0.7;

    // Scroll-driven vertical shift
    sphere.position.y += Math.sin(scrollProgress * Math.PI * 4 + i) * 0.4;

    // Rotation
    sphere.rotation.x += sphere.userData.rotateSpeed.x * 0.4;
    sphere.rotation.y += sphere.userData.rotateSpeed.y * 0.4;
    sphere.rotation.z += sphere.userData.rotateSpeed.z * 0.3;

    // Mouse/touch drift
    sphere.position.x += (mouseX * 3 * sphere.userData.driftMultiplier - sphere.position.x) * 0.02;
    sphere.position.y += (mouseY * 2 * sphere.userData.driftMultiplier - sphere.position.y) * 0.02;

    // Scroll-driven horizontal drift
    sphere.position.x += Math.cos(scrollProgress * Math.PI * 2 + i) * 0.3;
  });

  // Animate torus knots — react more strongly to scroll
  torusKnots.forEach((torus, i) => {
    // Base rotation
    torus.rotation.x += torus.userData.rotateSpeed.x * 0.5;
    torus.rotation.y += torus.userData.rotateSpeed.y * 0.5;

    // Vertical float
    torus.position.y =
      torus.userData.baseY +
      Math.sin(elapsed * torus.userData.floatSpeed + torus.userData.floatOffset) * 0.6;

    // Scroll-driven vertical lift (stronger effect)
    torus.position.y += Math.sin(scrollProgress * Math.PI * 3 + i * 2) * 1.0;

    // Scroll-driven horizontal shift
    torus.position.x =
      torus.userData.baseX +
      Math.cos(scrollProgress * Math.PI * 2.5 + i) * 1.5;

    // Scroll-driven Z shift (depth movement)
    torus.position.z =
      torus.userData.baseZ +
      Math.sin(scrollProgress * Math.PI * 1.5 + i) * 1.0;

    // Mouse/touch drift
    torus.position.x += (mouseX * 2 * torus.userData.driftMultiplier - torus.position.x) * 0.02;
  });

  // Group-level slow rotation
  meshGroup.rotation.y = elapsed * 0.05 + mouseX * 0.1;
  meshGroup.rotation.x = Math.sin(elapsed * 0.15) * 0.1;

  // Camera subtle drift
  camera.position.x += (mouseX * 1.0 - camera.position.x) * 0.04;
  camera.position.y += (-mouseY * 1.0 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  // Scroll-driven light movement
  pointLight1.position.x = Math.sin(scrollProgress * Math.PI * 2) * 6;
  pointLight1.position.y = Math.cos(scrollProgress * Math.PI) * 6 + 4;
  pointLight1.color.setHSL(0.55 + scrollProgress * 0.1, 0.8, 0.6);

  pointLight2.position.x = Math.cos(scrollProgress * Math.PI * 1.5) * 6;
  pointLight2.position.y = Math.sin(scrollProgress * Math.PI * 1.5) * 6 - 2;

  renderer.render(scene, camera);
}

// ============================================================================
// Scroll-triggered reveals via IntersectionObserver
// ============================================================================
function initScrollReveals() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.12,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
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

  // Close menu when clicking a link
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================================================
// Initialize
// ============================================================================
function init() {
  initThree();
  initScrollReveals();
  initScrollProgress();
  initMobileMenu();

  function loop() {
    onScroll(); // keep scroll progress synced
    animateThree();
    requestAnimationFrame(loop);
  }
  loop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
