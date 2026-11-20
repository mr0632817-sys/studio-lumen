import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import './style.css';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = () => window.innerWidth < 768;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const ease = (t) => t * t * (3 - 2 * t);

let applySceneTheme = () => {};

/* ---------- Theme toggle (persisted) ---------- */
const themeBtn = document.getElementById('theme');
themeBtn.addEventListener('click', () => {
  const dark = root.classList.toggle('dark');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  applySceneTheme();
});

/* ---------- Mobile menu ---------- */
const menuBtn = document.getElementById('menu');
const nav = document.getElementById('nav');
const setMenu = (open) => {
  nav.classList.toggle('open', open);
  menuBtn.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
};
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* ---------- Scroll reveal ---------- */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('visible'));
}

/* ---------- 3D scene ---------- */
const canvas = document.getElementById('scene');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  canvas.style.display = 'none';
}

if (renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Organic, polished sculpture: a subdivided sphere with a fixed, smooth displacement
  let base = new THREE.IcosahedronGeometry(1.5, 7);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  base = mergeVertices(base);
  const pos = base.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = 1
      + 0.08 * Math.sin(v.x * 3.1 + 0.4) * Math.cos(v.y * 2.3)
      + 0.06 * Math.sin(v.z * 4.2 - v.x * 1.7)
      + 0.04 * Math.cos(v.y * 5.5 + v.z * 2.1);
    pos.setXYZ(i, v.x * 1.5 * n, v.y * 1.5 * n, v.z * 1.5 * n);
  }
  base.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x9fb3d9, metalness: 0.2, roughness: 0.12,
    clearcoat: 1, clearcoatRoughness: 0.06,
    iridescence: 0.55, iridescenceIOR: 1.35,
    envMapIntensity: 1.1,
  });
  const orb = new THREE.Mesh(base, material);
  scene.add(orb);

  // Two fine metallic rings
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xbfd4ff, metalness: 1, roughness: 0.2 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.012, 16, 220), ringMat);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.008, 16, 220), ringMat);
  ringA.rotation.set(1.15, 0, 0.3);
  ringB.rotation.set(0.45, 0.9, 0);
  scene.add(ringA, ringB);

  // Soft depth particles
  const count = isMobile() ? 160 : 360;
  const dots = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 9;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dots[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dots[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    dots[i * 3 + 2] = r * Math.cos(ph) - 3;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dots, 3));
  const dotMat = new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.5, depthWrite: false });
  const particles = new THREE.Points(dotGeo, dotMat);
  scene.add(particles);

  // Light, theme-aware
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 5, 6);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  applySceneTheme = function applyThemeToScene() {
    const dark = root.classList.contains('dark');
    material.color.set(dark ? 0x7f98d6 : 0x8aa0cc);
    ringMat.color.set(dark ? 0xc7d8ff : 0x9fb0c9);
    dotMat.color.set(dark ? 0xbfd4ff : 0x475569);
    key.intensity = dark ? 1.4 : 1.0;
  };
  applySceneTheme();

  // Scroll path: the orb moves between the sections it sits beside
  // Desktop: hero text left -> orb right; about card right -> orb left; products -> centre; contact left -> orb right
  const DESKTOP = [[0.72, 0.1, 1], [-0.72, 0, 0.95], [0, -0.3, 1.12], [0.72, 0.1, 1]];
  const MOBILE  = [[0, 2.4, 0.55], [0, 3.0, 0.5], [0, 3.3, 0.45], [0, 3.3, 0.45]];
  const halfWidth = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
  const stops = () => (isMobile() ? MOBILE : DESKTOP);

  function pathAt(p) {
    const s = stops();
    const seg = Math.min(Math.floor(p * (s.length - 1)), s.length - 2);
    const t = ease(clamp01(p * (s.length - 1) - seg));
    const a = s[seg], b = s[seg + 1];
    const x = a[0] + (b[0] - a[0]) * t;
    return { x: isMobile() ? x : x * halfWidth(), y: a[1] + (b[1] - a[1]) * t, s: a[2] + (b[2] - a[2]) * t };
  }

  let targetP = 0, smoothP = 0;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const onScroll = () => { targetP = clamp01((window.scrollY || 0) / maxScroll()); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = isMobile() ? 11 : 9;
    camera.updateProjectionMatrix();
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();
  onScroll();
  smoothP = targetP;

  const clock = new THREE.Clock();
  let t = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const k = 1 - Math.exp(-dt * 3.2);           // frame-rate independent smoothing
    smoothP += (targetP - smoothP) * k;
    smoothX += (pointerX - smoothX) * (1 - Math.exp(-dt * 2));
    smoothY += (pointerY - smoothY) * (1 - Math.exp(-dt * 2));

    const p = pathAt(smoothP);
    const bob = reduceMotion.matches ? 0 : Math.sin(t * 0.7) * 0.1;
    orb.position.set(p.x, p.y + bob, 0);
    orb.scale.setScalar(p.s);
    const spin = reduceMotion.matches ? 0 : t * 0.12;
    orb.rotation.y = spin + smoothP * 1.4 + smoothX * 0.15;
    orb.rotation.x = 0.2 + smoothY * 0.1;

    for (const r of [ringA, ringB]) { r.position.copy(orb.position); r.scale.setScalar(p.s); }
    ringA.rotation.z = t * 0.07;
    ringB.rotation.z = -t * 0.05;
    particles.rotation.y = t * 0.01 + smoothP * 0.3;

    camera.position.x = smoothX * 0.2;
    camera.position.y = -smoothY * 0.12;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  // Keep the loop cheap: pause work when the tab is hidden
  document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });
  requestAnimationFrame(frame);
}

