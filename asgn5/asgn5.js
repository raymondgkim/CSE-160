import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 20);

// ─── Orbit Controls ──────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 80;

// ─── Skybox ──────────────────────────────────────────────────────────────────
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2; skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
skyGrad.addColorStop(0, '#5aabff');
skyGrad.addColorStop(1, '#c9e8ff');
skyCtx.fillStyle = skyGrad;
skyCtx.fillRect(0, 0, 2, 512);
const skyTex = new THREE.CanvasTexture(skyCanvas);
const skyGeo = new THREE.SphereGeometry(500, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ─── Lights ──────────────────────────────────────────────────────────────────

// 1. Ambient
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// 2. Directional (sun)
const dirLight = new THREE.DirectionalLight(0xfff5cc, 1.2);
dirLight.position.set(30, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
scene.add(dirLight);

// 3. Point Light (orbiting orb)
const pointLight = new THREE.PointLight(0xff6600, 2, 30);
pointLight.position.set(0, 8, 0);
pointLight.castShadow = true;
scene.add(pointLight);

// 4. Hemisphere Light
const hemiLight = new THREE.HemisphereLight(0x0088ff, 0x553300, 0.5);
scene.add(hemiLight);

// 5. Spot Light (off by default)
const spotLight = new THREE.SpotLight(0x00ffcc, 3, 60, Math.PI / 8, 0.3);
spotLight.position.set(0, 20, 0);
spotLight.castShadow = true;
spotLight.visible = false;
scene.add(spotLight);
const spotTarget = new THREE.Object3D();
spotTarget.position.set(0, 0, 0);
scene.add(spotTarget);
spotLight.target = spotTarget;

// ─── Light state ─────────────────────────────────────────────────────────────
const lightState = {
  ambient:     true,
  directional: true,
  point:       true,
  hemisphere:  true,
  spot:        false,
};

function applyLightState() {
  ambientLight.visible = lightState.ambient;
  dirLight.visible     = lightState.directional;
  pointLight.visible   = lightState.point;
  orb.visible          = lightState.point;
  hemiLight.visible    = lightState.hemisphere;
  spotLight.visible    = lightState.spot;
  // update button styles
  document.querySelectorAll('.light-btn').forEach(btn => {
    const key = btn.dataset.light;
    btn.classList.toggle('active', lightState[key]);
  });
}

// ─── Ground ──────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshLambertMaterial({ color: 0x4a7c59 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Circular Road ───────────────────────────────────────────────────────────
const roadCanvas = document.createElement('canvas');
roadCanvas.width = 512; roadCanvas.height = 512;
const rCtx = roadCanvas.getContext('2d');
const rcx = 256, rcy = 256, rOuter = 245, rInner = 155;
// Asphalt ring
rCtx.beginPath();
rCtx.arc(rcx, rcy, rOuter, 0, Math.PI * 2);
rCtx.arc(rcx, rcy, rInner, 0, Math.PI * 2, true);
rCtx.fillStyle = '#333333';
rCtx.fill('evenodd');
// Yellow center line
rCtx.beginPath();
rCtx.arc(rcx, rcy, (rOuter + rInner) / 2, 0, Math.PI * 2);
rCtx.strokeStyle = '#ffcc00';
rCtx.lineWidth = 5;
rCtx.stroke();
// Dashed white edge lines
rCtx.setLineDash([18, 14]);
rCtx.lineWidth = 3;
rCtx.strokeStyle = '#ffffff';
rCtx.beginPath();
rCtx.arc(rcx, rcy, rOuter - 14, 0, Math.PI * 2);
rCtx.stroke();
rCtx.beginPath();
rCtx.arc(rcx, rcy, rInner + 14, 0, Math.PI * 2);
rCtx.stroke();
rCtx.setLineDash([]);
const roadTex = new THREE.CanvasTexture(roadCanvas);
const roadGeo = new THREE.PlaneGeometry(52, 52);
const roadMat = new THREE.MeshBasicMaterial({ map: roadTex, transparent: true });
const roadMesh = new THREE.Mesh(roadGeo, roadMat);
roadMesh.rotation.x = -Math.PI / 2;
roadMesh.position.y = 0.05;
scene.add(roadMesh);

function makeMesh(geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ─── Materials ───────────────────────────────────────────────────────────────
const redMat    = new THREE.MeshPhongMaterial({ color: 0xe63946 });
const blueMat   = new THREE.MeshPhongMaterial({ color: 0x457b9d });
const greenMat  = new THREE.MeshPhongMaterial({ color: 0x2a9d8f });
const yellowMat = new THREE.MeshPhongMaterial({ color: 0xe9c46a });
const purpleMat = new THREE.MeshPhongMaterial({ color: 0x9b5de5 });
const orangeMat = new THREE.MeshPhongMaterial({ color: 0xf4a261 });
const whiteMat  = new THREE.MeshPhongMaterial({ color: 0xf1faee });
const darkMat   = new THREE.MeshPhongMaterial({ color: 0x1d3557 });
const tealMat   = new THREE.MeshPhongMaterial({ color: 0x06d6a0 });
const pinkMat   = new THREE.MeshPhongMaterial({ color: 0xff6b9d });

function makeCheckerTexture(c1, c2, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  ctx.fillStyle = c1; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

const stripeTex = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff4466' : '#ffffff';
    ctx.fillRect(0, i * 32, 64, 32);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();

const texMat1 = new THREE.MeshPhongMaterial({ map: makeCheckerTexture('#ff9900', '#222222') });
const texMat2 = new THREE.MeshPhongMaterial({ map: makeCheckerTexture('#00aaff', '#003366') });
const texMat3 = new THREE.MeshPhongMaterial({ map: stripeTex });

// ─── Shapes ──────────────────────────────────────────────────────────────────
const cube1     = makeMesh(new THREE.BoxGeometry(2, 2, 2),            texMat1,   -10, 1,    0);
const cube2     = makeMesh(new THREE.BoxGeometry(1.5, 1.5, 1.5),      redMat,     -7, 0.75, 3);
const cube3     = makeMesh(new THREE.BoxGeometry(3, 1, 2),            darkMat,     5, 0.5, -5);
const cube4     = makeMesh(new THREE.BoxGeometry(1, 3, 1),            yellowMat,   8, 1.5,  4);
const cube5     = makeMesh(new THREE.BoxGeometry(2, 2, 2),            texMat3,    -3, 1,   -8);
const sphere1   = makeMesh(new THREE.SphereGeometry(1.5, 32, 32),     texMat2,     0, 1.5,  0);
const sphere2   = makeMesh(new THREE.SphereGeometry(1, 32, 32),       blueMat,     4, 1,    6);
const sphere3   = makeMesh(new THREE.SphereGeometry(0.8, 32, 32),     pinkMat,    -5, 0.8,  5);
const cyl1      = makeMesh(new THREE.CylinderGeometry(1, 1, 3, 32),   greenMat,    7, 1.5, -3);
const cyl2      = makeMesh(new THREE.CylinderGeometry(0.5, 1, 2, 32), orangeMat,  -8, 1,   -4);
const cyl3      = makeMesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 16), tealMat,  12, 2,    2);
const cone1     = makeMesh(new THREE.ConeGeometry(1.2, 3, 32),        redMat,     -2, 1.5,  6);
const cone2     = makeMesh(new THREE.ConeGeometry(0.8, 2, 32),        purpleMat,   6, 1,  -10);
const cone3     = makeMesh(new THREE.ConeGeometry(1.5, 4, 6),         yellowMat, -12, 2,   -2);
const torus1    = makeMesh(new THREE.TorusGeometry(1.5, 0.4, 16, 100),texMat1,     2, 1.4, -4);
const torus2    = makeMesh(new THREE.TorusGeometry(1, 0.3, 16, 100),  pinkMat,    -6, 1,    8);
const torusKnot = makeMesh(new THREE.TorusKnotGeometry(1, 0.3, 100, 16), texMat2, 10, 1.5,  8);
const octa      = makeMesh(new THREE.OctahedronGeometry(1.2),         purpleMat, -14, 1.2,  3);
const dodeca    = makeMesh(new THREE.DodecahedronGeometry(1.2),       tealMat,    14, 1.2, -5);
const icosa     = makeMesh(new THREE.IcosahedronGeometry(1.3),        whiteMat,  -10, 1.3, -8);
const tetra     = makeMesh(new THREE.TetrahedronGeometry(1.2),        orangeMat,   3, 1.2, 10);
const ring      = makeMesh(new THREE.RingGeometry(0.8, 1.4, 32),      blueMat,     0, 3,   -6);
ring.rotation.x = -Math.PI / 4;

const capsuleGroup = new THREE.Group();
[
  [new THREE.CylinderGeometry(0.4, 0.4, 2, 16), 0],
  [new THREE.SphereGeometry(0.4, 16, 16),  1],
  [new THREE.SphereGeometry(0.4, 16, 16), -1],
].forEach(([geo, y]) => {
  const m = new THREE.Mesh(geo, greenMat);
  m.position.y = y; m.castShadow = true; m.receiveShadow = true;
  capsuleGroup.add(m);
});
capsuleGroup.position.set(-4, 1, -12);
scene.add(capsuleGroup);

// ─── Orb (point light visual) ────────────────────────────────────────────────
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff6600 })
);
orb.position.set(0, 8, 0);
scene.add(orb);

// ─── GLTF Models ─────────────────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();

// Car — drives circles around the scene
let car = null;
let carAngle = 0;
const CAR_RADIUS = 22;

gltfLoader.load('model.glb', (gltf) => {
  car = gltf.scene;
  car.scale.set(2, 2, 2);
  car.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  scene.add(car);
}, undefined, () => console.warn('No model.glb found.'));

// Spaceship — flies around randomly in the sky
let spaceship = null;
// Smooth random target position for the spaceship
const shipTarget = new THREE.Vector3(10, 20, 10);
const shipCurrent = new THREE.Vector3(10, 20, 10);

function newShipTarget() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * 40,
    12 + Math.random() * 20,
    (Math.random() - 0.5) * 40
  );
}
let shipTarget1 = newShipTarget();
let shipTarget2 = newShipTarget();
let shipT = 0;

gltfLoader.load('model2.glb', (gltf) => {
  spaceship = gltf.scene;
  spaceship.scale.set(0.02, 0.02, 0.02);
  spaceship.position.copy(shipTarget1);
  spaceship.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  scene.add(spaceship);
}, undefined, () => console.warn('No model2.glb found.'));

// ─── UI Panel ────────────────────────────────────────────────────────────────
const panel = document.createElement('div');
panel.style.cssText = `
  position: fixed; top: 16px; right: 16px; z-index: 100;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 12px;
  padding: 14px 16px; color: #fff; font-family: monospace; font-size: 13px;
  min-width: 200px; user-select: none;
`;
panel.innerHTML = `
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;opacity:0.5;margin-bottom:10px;">Lighting</div>
  <div id="light-buttons" style="display:flex;flex-direction:column;gap:7px;"></div>
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;opacity:0.5;margin-bottom:8px;">Camera</div>
  <div style="display:flex;gap:7px;flex-wrap:wrap;">
    <button class="cam-btn" data-action="reset">Reset View</button>
    <button class="cam-btn" data-action="top">Top</button>
    <button class="cam-btn" data-action="front">Front</button>
  </div>
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;">
  <div style="font-size:10px;opacity:0.4;line-height:1.6;">
    🖱 Drag to orbit<br>
    🖱 Scroll to zoom<br>
    🖱 Right-drag to pan
  </div>
`;
document.body.appendChild(panel);

// Light toggle buttons
const lightDefs = [
  { key: 'ambient',     label: '☀ Ambient',     color: '#ffe066' },
  { key: 'directional', label: '➡ Directional', color: '#fff5cc' },
  { key: 'point',       label: '● Point (Orb)', color: '#ff8844' },
  { key: 'hemisphere',  label: '◑ Hemisphere',  color: '#88ccff' },
  { key: 'spot',        label: '⬡ Spot',        color: '#00ffcc' },
];

const btnContainer = panel.querySelector('#light-buttons');
lightDefs.forEach(({ key, label, color }) => {
  const btn = document.createElement('button');
  btn.className = 'light-btn';
  btn.dataset.light = key;
  btn.textContent = label;
  btn.style.cssText = `
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
    color: #fff; border-radius: 6px; padding: 6px 10px; cursor: pointer;
    font-family: monospace; font-size: 12px; text-align: left;
    transition: background 0.15s, border-color 0.15s;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.15)'; });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = lightState[key] ? `rgba(${hexToRgb(color)},0.25)` : 'rgba(255,255,255,0.08)';
  });
  btn.addEventListener('click', () => {
    lightState[key] = !lightState[key];
    applyLightState();
    btn.style.background = lightState[key] ? `rgba(${hexToRgb(color)},0.25)` : 'rgba(255,255,255,0.08)';
    btn.style.borderColor = lightState[key] ? color : 'rgba(255,255,255,0.2)';
  });
  btnContainer.appendChild(btn);
});

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Camera preset buttons
const camStyle = `
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
  color: #fff; border-radius: 6px; padding: 5px 9px; cursor: pointer;
  font-family: monospace; font-size: 11px; transition: background 0.15s;
`;
panel.querySelectorAll('.cam-btn').forEach(btn => {
  btn.style.cssText = camStyle;
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.18)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.08)'; });
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'reset') {
      camera.position.set(0, 5, 20);
      controls.target.set(0, 0, 0);
    } else if (action === 'top') {
      camera.position.set(0, 40, 0.01);
      controls.target.set(0, 0, 0);
    } else if (action === 'front') {
      camera.position.set(0, 5, 30);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  });
});

// Init button active states
applyLightState();
lightDefs.forEach(({ key, color }) => {
  const btn = panel.querySelector(`[data-light="${key}"]`);
  if (lightState[key]) {
    btn.style.background = `rgba(${hexToRgb(color)},0.25)`;
    btn.style.borderColor = color;
  }
});

// ─── Clock & Animate ─────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  cube1.rotation.y = t * 0.8;
  cube1.rotation.x = t * 0.3;
  sphere1.position.y = 1.5 + Math.sin(t * 1.5) * 1.2;
  torusKnot.rotation.x = t * 0.5;
  torusKnot.rotation.y = t * 0.7;
  torus1.rotation.z = t * 1.0;
  torus2.rotation.x = t * 0.6;
  octa.rotation.y = t * 1.2;
  dodeca.rotation.y = t * 0.9;
  icosa.rotation.x = t * 0.8;
  tetra.rotation.z = t * 0.7;
  cone1.rotation.y = t * 0.5;
  cube2.rotation.y = t * 0.4;
  cube4.rotation.x = t * 0.6;
  cube5.rotation.y = t;
  sphere2.position.y = 1 + Math.abs(Math.sin(t * 2)) * 2;
  sphere3.position.y = 0.8 + Math.sin(t * 1.2 + 1) * 0.8;
  capsuleGroup.rotation.y = t * 0.4;

  // Orbiting point light
  pointLight.position.x = Math.sin(t * 0.7) * 10;
  pointLight.position.z = Math.cos(t * 0.7) * 10;
  orb.position.x = pointLight.position.x;
  orb.position.z = pointLight.position.z;

  // Spot light slowly rotates target
  spotTarget.position.x = Math.sin(t * 0.3) * 15;
  spotTarget.position.z = Math.cos(t * 0.3) * 15;

  // Car drives circles around the scene
  if (car) {
    carAngle += 0.006;
    const x = Math.sin(carAngle) * CAR_RADIUS;
    const z = Math.cos(carAngle) * CAR_RADIUS;
    car.position.set(x, 0, z);
    // Angle of movement tangent: derivative of (sin, cos) is (cos, -sin)
    car.rotation.y = Math.atan2(Math.cos(carAngle), -Math.sin(carAngle));
  }

  // Spaceship orbits around the orb at a higher altitude
  if (spaceship) {
    const orbPos = orb.position;
    const orbitRadius = 12;
    const shipX = orbPos.x + Math.sin(t * 0.7 + 1.2) * orbitRadius;
    const shipZ = orbPos.z + Math.cos(t * 0.7 + 1.2) * orbitRadius;
    const shipY = orbPos.y + 12;
    const target = new THREE.Vector3(shipX, shipY, shipZ);
    const prevPos = spaceship.position.clone();
    spaceship.position.lerp(target, 0.03);
    // Face direction of movement
    const dir = new THREE.Vector3().subVectors(spaceship.position, prevPos);
    if (dir.lengthSq() > 0.00001) {
      spaceship.rotation.y = Math.atan2(dir.x, dir.z);
      spaceship.rotation.x = -Math.atan2(dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z));
    }
    spaceship.rotation.z = Math.sin(t * 1.5) * 0.15;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
