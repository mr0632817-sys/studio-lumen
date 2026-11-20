import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ============================================================================
// ABM IT — Polished 3D Celestial Prism & Gyroscope Assembly
// Native Three.js r165 (Refractive Glass, Dispersion, PBR Rings, Selective Bloom)
// ============================================================================
let scene, camera, renderer, composer, bloomPass, clock;
let assembly, hero, edges, innerCore, innerCage, backGlow;
let ringOuter, ringMid, ringInner, satelliteOrbit;
let satGlowA, satGlowB, stars, envTex, bokehTex, glowTex;
let ambientLight, keyLight, rimLight, coreLight;

let isMobile = false;
let isPaused = false;
let prefersReducedMotion = false;
let animationId = null;
let targetProgress = 0;
let smoothProgress = 0;
let lastProgress = 0;
let scrollBoost = 0;
let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDark = () => document.documentElement.classList.contains('dark');
const mix = (a, b, t) => a + (b - a) * t;

// Aspect-safe position / scale stops along the page: [x, y, scale]
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
  if (aspect < 0.75) return Math.max(11.8, 7.2 / aspect);
  if (aspect < 1.35) return Math.max(10.8, 12.2 / aspect);
  return Math.max(9.8, 16.5 / aspect);
}

function pathAt(p) {
  const stops = isMobile ? MOBILE_PATH : DESKTOP_PATH;
  const n = stops.length - 1;
  const f = Math.min(Math.max(p, 0), 0.9999) * n;
  const i = Math.floor(f);
  const t = f - i;
  const s = t * t * (3 - 2 * t);
  const a = stops[i], b = stops[i + 1];
  return { x: mix(a[0], b[0], s), y: mix(a[1], b[1], s), s: mix(a[2], b[2], s) };
}

// Procedural soft radial glow texture for bokeh stars & satellite halos
function makeRadialTexture(innerAlpha = 1, midStop = 0.35) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(255, 255, 255, ${innerAlpha})`);
  grad.addColorStop(midStop, `rgba(255, 255, 255, ${innerAlpha * 0.42})`);
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Studio Lightformer environment map for crisp metallic & glass reflections
function makeEnvironment(dark) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (dark) {
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.45, '#0f172a');
    grad.addColorStop(1, '#040711');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);

  const softbox = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  softbox(48, 28, 130, 52, dark ? 'rgba(125,211,252,0.75)' : 'rgba(255,255,255,0.98)');
  softbox(295, 24, 145, 44, dark ? 'rgba(167,139,250,0.65)' : 'rgba(241,245,249,0.95)');
  softbox(185, 160, 120, 32, dark ? 'rgba(56,189,248,0.45)' : 'rgba(203,213,225,0.75)');

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

  // Sync scene background & depth fog with #bg-canvas for clean transmission + bloom
  const bgHex = dark ? 0x060913 : 0xf8fafc;
  scene.background = new THREE.Color(bgHex);
  if (scene.fog) scene.fog.color.setHex(bgHex);

  // Refractive prism shell
  hero.material.envMap = envTex;
  hero.material.color.set(dark ? 0xe0f2fe : 0xf1f5f9);
  hero.material.attenuationColor.set(dark ? 0x0284c7 : 0x38bdf8);
  hero.material.attenuationDistance = dark ? 1.8 : 2.6;
  hero.material.roughness = dark ? 0.08 : 0.12;
  hero.material.envMapIntensity = dark ? 1.55 : 1.25;
  hero.material.needsUpdate = true;

  // Faceted prism edge lines
  edges.material.color.set(dark ? 0x7dd3fc : 0x0284c7);
  edges.material.opacity = dark ? 0.52 : 0.34;

  // Glowing inner energy core + cage
  innerCore.material.color.set(dark ? 0x38bdf8 : 0x0284c7);
  innerCore.material.emissive.set(dark ? 0x38bdf8 : 0x0ea5e9);
  innerCore.material.emissiveIntensity = dark ? 2.6 : 1.85;

  innerCage.material.color.set(dark ? 0xa78bfa : 0x0284c7);
  innerCage.material.opacity = dark ? 0.48 : 0.32;

  // 3 PBR metallic gyroscope rings
  ringOuter.material.envMap = envTex;
  ringOuter.material.color.set(dark ? 0x334155 : 0x94a3b8);
  ringOuter.material.emissive.set(dark ? 0x0c4a6e : 0x000000);
  ringOuter.material.emissiveIntensity = dark ? 0.35 : 0;

  ringMid.material.envMap = envTex;
  ringMid.material.color.set(dark ? 0x38bdf8 : 0x0284c7);
  ringMid.material.emissive.set(dark ? 0x0ea5e9 : 0x0284c7);
  ringMid.material.emissiveIntensity = dark ? 0.85 : 0.35;

  ringInner.material.envMap = envTex;
  ringInner.material.color.set(dark ? 0xc4b5fd : 0x64748b);
  ringInner.material.emissive.set(dark ? 0x7c3aed : 0x000000);
  ringInner.material.emissiveIntensity = dark ? 0.45 : 0;

  // Ambient aura & bokeh particles
  backGlow.material.color.set(dark ? 0x0284c7 : 0x7dd3fc);
  backGlow.material.opacity = dark ? 0.24 : 0.16;

  satGlowA.material.color.set(dark ? 0x7dd3fc : 0x0284c7);
  satGlowB.material.color.set(dark ? 0xc084fc : 0x4f46e5);

  stars.material.color.set(dark ? 0xbae6fd : 0x64748b);
  stars.material.opacity = dark ? 0.72 : 0.46;

  // Scene & internal core lighting
  ambientLight.intensity = dark ? 0.55 : 1.05;
  keyLight.intensity = dark ? 1.85 : 1.5;
  rimLight.color.set(dark ? 0x818cf8 : 0x38bdf8);
  rimLight.intensity = dark ? 1.45 : 0.75;
  coreLight.color.set(dark ? 0x38bdf8 : 0x0ea5e9);
  coreLight.intensity = dark ? 3.2 : 1.6;

  // Selective bloom: higher threshold in light mode keeps #f8fafc background pure
  if (bloomPass) {
    bloomPass.threshold = dark ? 0.78 : 1.15;
    bloomPass.strength = dark ? 0.52 : 0.22;
    bloomPass.radius = dark ? 0.68 : 0.45;
  }

  renderNow();
}

function renderNow() {
  if (!renderer || !scene || !camera) return;
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
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
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    renderer = { render() {}, setSize() {}, setPixelRatio() {} };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf8fafc, 0.028);

  camera = new THREE.PerspectiveCamera(48, window.innerWidth / Math.max(window.innerHeight, 1), 0.1, 100);
  camera.position.set(0, 0, computeCameraZ());

  // Studio + internal core lights
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(4.5, 5.5, 6);
  scene.add(keyLight);

  rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
  rimLight.position.set(-5, -3.5, -4);
  scene.add(rimLight);

  // Root assembly so crystal, rings, glow, and satellites move together cleanly
  assembly = new THREE.Group();
  scene.add(assembly);

  coreLight = new THREE.PointLight(0x38bdf8, 2.5, 9, 1.5);
  assembly.add(coreLight);

  // Soft ambient halo behind the assembly
  glowTex = makeRadialTexture(0.95, 0.28);
  backGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x0284c7,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  backGlow.scale.set(6.4, 6.4, 1);
  backGlow.position.set(0, 0, -0.8);
  assembly.add(backGlow);

  // 1. Outer Refractive Prism Crystal (glass transmission + chromatic dispersion)
  const geo = new THREE.IcosahedronGeometry(1.32, 1);
  hero = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.92,
      thickness: 1.45,
      ior: 1.48,
      dispersion: 0.32,
      iridescence: 0.65,
      iridescenceIOR: 1.38,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      attenuationColor: new THREE.Color(0x0284c7),
      attenuationDistance: 1.8,
      flatShading: true,
    })
  );
  assembly.add(hero);

  // Crisp faceted crystal edges
  edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 12),
    new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.4,
    })
  );
  hero.add(edges);

  // 2. Inner Glowing Energy Nucleus + Geometric Lattice Cage
  innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.52, 0),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.3,
    })
  );
  assembly.add(innerCore);

  innerCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.78, 0),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
    })
  );
  assembly.add(innerCage);

  // 3. Three Concentric PBR Metallic Gyroscope / Astrolabe Rings
  ringOuter = new THREE.Mesh(
    new THREE.TorusGeometry(2.68, 0.022, 20, 160),
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.92,
      roughness: 0.2,
    })
  );
  ringOuter.rotation.set(0.55, 0.85, 0);
  assembly.add(ringOuter);

  ringMid = new THREE.Mesh(
    new THREE.TorusGeometry(2.22, 0.018, 20, 160),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.7,
      metalness: 0.88,
      roughness: 0.18,
    })
  );
  ringMid.rotation.set(1.15, 0.2, 0);
  assembly.add(ringMid);

  ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.78, 0.013, 16, 140),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.94,
      roughness: 0.16,
    })
  );
  ringInner.rotation.set(0.35, -0.75, 0.4);
  assembly.add(ringInner);

  // 4. Orbiting Luminous Satellite Nodes with Halo Sprites
  satelliteOrbit = new THREE.Group();
  satelliteOrbit.rotation.z = 0.38;
  assembly.add(satelliteOrbit);

  const satA = new THREE.Mesh(
    new THREE.SphereGeometry(0.068, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.6,
      roughness: 0.1,
    })
  );
  satA.position.set(2.45, 0, 0);
  satGlowA = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  satGlowA.scale.set(0.55, 0.55, 1);
  satA.add(satGlowA);
  satelliteOrbit.add(satA);

  const satB = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.082, 0),
    new THREE.MeshStandardMaterial({
      color: 0xf3e8ff,
      emissive: 0xa78bfa,
      emissiveIntensity: 2.4,
      roughness: 0.1,
    })
  );
  satB.position.set(-2.45, 0, 0);
  satGlowB = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xc084fc,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  satGlowB.scale.set(0.55, 0.55, 1);
  satB.add(satGlowB);
  satelliteOrbit.add(satB);

  // 5. Soft Circular Bokeh Depth Particles
  bokehTex = makeRadialTexture(1.0, 0.3);
  const count = isMobile ? 160 : 380;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 5.5 + Math.random() * 10.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 3.5;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(
    sg,
    new THREE.PointsMaterial({
      size: isMobile ? 0.12 : 0.14,
      map: bokehTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(stars);

  // 6. Post-Processing Pipeline (Selective HDR Bloom + ACES Output)
  try {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(window.innerWidth, window.innerHeight);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48,
      0.65,
      0.82
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
  } catch (e) {
    composer = null;
    bloomPass = null;
  }

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
  lastProgress = smoothProgress;
}

function onResize() {
  isMobile = window.innerWidth < 768;
  const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.position.z = computeCameraZ();
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setPixelRatio(dpr);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  if (prefersReducedMotion) onScroll();
}

function onScroll() {
  const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  targetProgress = max > 0 ? (window.scrollY || document.documentElement.scrollTop) / max : 0;
  if (prefersReducedMotion && assembly) {
    smoothProgress = targetProgress;
    renderFrame(0, 0);
  }
}

function renderFrame(delta, elapsed) {
  const damp = 1 - Math.exp(-delta * 4.2);
  smoothProgress += (targetProgress - smoothProgress) * (delta ? damp : 1);
  smoothX += (pointerX - smoothX) * (delta ? 1 - Math.exp(-delta * 3.5) : 1);
  smoothY += (pointerY - smoothY) * (delta ? 1 - Math.exp(-delta * 3.5) : 1);

  // Scroll velocity energy surge
  const velocity = Math.abs(smoothProgress - lastProgress) / Math.max(delta, 0.016);
  lastProgress = smoothProgress;
  scrollBoost += (Math.min(velocity * 1.4, 2.2) - scrollBoost) * (delta ? 1 - Math.exp(-delta * 5) : 1);

  const p = pathAt(smoothProgress);
  const bob = Math.sin(elapsed * 0.75) * 0.12;
  assembly.position.set(p.x, p.y + bob, 0);
  assembly.scale.setScalar(p.s);

  // Subtle interactive tilt on the whole assembly
  assembly.rotation.y = smoothX * 0.26;
  assembly.rotation.x = smoothY * 0.16;

  // Outer prism crystal rotation
  hero.rotation.y = smoothProgress * Math.PI * 1.35 + elapsed * 0.12;
  hero.rotation.x = 0.25 + smoothProgress * 0.65 + Math.sin(elapsed * 0.4) * 0.08;

  // Pulsing inner energy nucleus & counter-rotating lattice cage
  const pulse = 1 + Math.sin(elapsed * 2.4) * 0.08 + scrollBoost * 0.06;
  innerCore.scale.setScalar(pulse);
  innerCore.rotation.y = -elapsed * (0.55 + scrollBoost * 0.4);
  innerCore.rotation.x = elapsed * 0.35;

  innerCage.rotation.y = elapsed * 0.28;
  innerCage.rotation.z = -elapsed * 0.22;

  const baseCoreGlow = isDark() ? 2.5 : 1.8;
  innerCore.material.emissiveIntensity = baseCoreGlow + Math.sin(elapsed * 2.4) * 0.35 + scrollBoost * 0.6;
  coreLight.intensity = (isDark() ? 3.1 : 1.5) + Math.sin(elapsed * 2.4) * 0.45 + scrollBoost * 0.8;

  // Multi-axis precision gyroscope ring motion
  const spinBoost = 1 + scrollBoost * 0.85;
  ringOuter.rotation.z = elapsed * 0.11 * spinBoost + smoothProgress * 1.2;
  ringOuter.rotation.x = 0.55 + Math.sin(elapsed * 0.35) * 0.16;

  ringMid.rotation.y = -elapsed * 0.22 * spinBoost - smoothProgress * 1.6;
  ringMid.rotation.z = Math.cos(elapsed * 0.32) * 0.22;

  ringInner.rotation.x = 0.35 + elapsed * 0.31 * spinBoost + smoothProgress * 1.4;
  ringInner.rotation.y = -0.75 + elapsed * 0.18;

  // Orbiting satellites
  satelliteOrbit.rotation.y = elapsed * (0.52 + scrollBoost * 0.45) + smoothProgress * 2.0;

  // Bokeh starfield parallax
  stars.rotation.y = elapsed * 0.012 + smoothProgress * 0.35;
  stars.position.y = smoothProgress * 1.35;

  camera.position.x = smoothX * 0.24;
  camera.position.y = -smoothY * 0.15;
  camera.lookAt(0, 0, 0);

  renderNow();
}

function animate() {
  if (isPaused || !assembly) {
    animationId = null;
    return;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  renderFrame(delta, clock.elapsedTime);
  animationId = requestAnimationFrame(animate);
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
      el.classList.add('visible');
    } else {
      observer.observe(el);
    }
  });

  setTimeout(revealAll, 1500);
}

// ============================================================================
// Scroll progress bar
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

  if (!prefersReducedMotion && assembly) {
    animate();
  } else if (assembly) {
    renderNow();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
