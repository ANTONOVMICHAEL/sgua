import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const stage = document.querySelector('#stage');
const loading = document.querySelector('#loading');
const progress = document.querySelector('#loading-progress');
const error = document.querySelector('#webgl-error');
const button = document.querySelector('#explore');
const noteTitle = document.querySelector('#note-title');
const noteBody = document.querySelector('#note-body');
const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  loading.hidden = true;
  error.hidden = false;
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, .1, 100);
camera.position.set(0, 2.25, 5.65);
camera.lookAt(.18, .12, 0);

scene.add(new THREE.HemisphereLight(0xf8fff0, 0x6b7568, 2.35));
const key = new THREE.DirectionalLight(0xfff6e8, 3.5);
key.position.set(-2.9, 5.8, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -5;
key.shadow.camera.near = .1;
key.shadow.camera.far = 18;
key.shadow.bias = -.00012;
key.shadow.normalBias = .018;
key.shadow.radius = 3;
scene.add(key);
const bounce = new THREE.DirectionalLight(0xb3d8ff, 1.25);
bounce.position.set(4, 2, -4);
scene.add(bounce);
const edge = new THREE.DirectionalLight(0xf5a581, .8);
edge.position.set(-3, 1, -3);
scene.add(edge);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x283b30, opacity: .24 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.28;
ground.receiveShadow = true;
scene.add(ground);

const objectRig = new THREE.Group();
objectRig.position.set(.87, .26, -.17);
scene.add(objectRig);
const object = new THREE.Group();
object.scale.setScalar(8.8);
object.rotation.set(.04, -.20, -.11);
objectRig.add(object);

function makePage() {
  const image = document.createElement('canvas');
  image.width = 1024;
  image.height = 1320;
  const c = image.getContext('2d');
  c.fillStyle = '#f3f0e8';
  c.fillRect(0, 0, 1024, 1320);
  c.fillStyle = '#b4b1a7';
  c.font = '28px Arial';
  c.fillText('C / АРХИВ', 88, 112);
  c.textAlign = 'right';
  c.fillText('01', 936, 112);
  c.textAlign = 'left';
  c.fillStyle = '#2d393a';
  c.font = '600 92px Georgia, serif';
  c.fillText('ПРЕДМЕТ', 82, 270);
  c.fillText('ПРАВА', 82, 366);
  c.fillStyle = '#ed583b';
  c.fillRect(86, 432, 855, 5);
  c.fillStyle = '#a7a9a0';
  for (let i = 0; i < 12; i++) {
    const width = i % 3 === 2 ? 540 : 844;
    c.fillRect(86, 526 + i * 55, width, 2);
  }
  c.font = '24px Arial';
  c.fillStyle = '#636a64';
  c.fillText('АНТОНОВ М.А. / ГРАЖДАНСКОЕ ПРАВО', 86, 1236);
  const tex = new THREE.CanvasTexture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geometry = new THREE.PlaneGeometry(.117, .155, 28, 32);
  geometry.rotateX(-Math.PI / 2);
  const page = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .85, metalness: 0 }));
  page.name = 'Independently deforming case leaf';
  page.position.set(.086, .025, .001);
  page.castShadow = true;
  page.receiveShadow = true;
  page.userData.original = Float32Array.from(geometry.attributes.position.array);
  object.add(page);
  return page;
}

let page;
let modelLoaded = false;
new GLTFLoader().load('./asset/binder_notebook.glb', gltf => {
  gltf.scene.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.name.includes('closed')) child.visible = false;
    if (child.material) {
      child.material.roughness = Math.max(.43, child.material.roughness ?? .72);
      child.material.needsUpdate = true;
    }
  });
  object.add(gltf.scene);
  page = makePage();
  modelLoaded = true;
  loading.hidden = true;
}, event => {
  if (event.total) progress.textContent = String(Math.round(event.loaded / event.total * 100)).padStart(2, '0');
}, err => {
  console.error('Model load failed', err);
  loading.hidden = true;
  error.hidden = false;
  error.textContent = 'Не удалось загрузить трехмерный объект. Обнови страницу и попробуй снова.';
});

let detailed = false;
let drag = false;
let dragX = 0;
let dragY = 0;
let pointerX = 0;
let pointerY = 0;
let yaw = 0;
let pitch = 0;
let targetYaw = 0;
let targetPitch = 0;

button.addEventListener('click', () => {
  detailed = !detailed;
  button.setAttribute('aria-pressed', String(detailed));
  button.querySelector('.explore-label').textContent = detailed ? 'ОБЩИЙ РАКУРС' : 'РАССМОТРЕТЬ ОБЪЕКТ';
  button.querySelector('.explore-arrow').textContent = detailed ? '↙' : '↗';
  noteTitle.textContent = detailed ? 'Внутри дела.' : 'Дело открыто.';
  noteBody.textContent = detailed ? 'Лист поднимается отдельно от переплета. Его изгиб и тень пересчитываются при каждом кадре.' : 'Ракурс, материал и свет меняются в реальном времени.';
});

stage.addEventListener('pointerdown', e => {
  if (!modelLoaded) return;
  drag = true;
  dragX = e.clientX;
  dragY = e.clientY;
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  pointerX = (e.clientX / window.innerWidth - .5) * 2;
  pointerY = (e.clientY / window.innerHeight - .5) * 2;
  if (!drag) return;
  targetYaw = THREE.MathUtils.clamp(targetYaw + (e.clientX - dragX) * .006, -.82, .82);
  targetPitch = THREE.MathUtils.clamp(targetPitch + (e.clientY - dragY) * .003, -.32, .33);
  dragX = e.clientX;
  dragY = e.clientY;
});
stage.addEventListener('pointerup', () => drag = false);
stage.addEventListener('pointercancel', () => drag = false);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = width < 700 ? 42 : 36;
  camera.updateProjectionMatrix();
  camera.position.set(width < 700 ? 0 : 0, width < 700 ? 2.4 : 2.25, width < 700 ? 5.05 : 5.65);
  camera.lookAt(width < 700 ? .1 : .18, .12, 0);
  objectRig.position.x = width < 700 ? .27 : .87;
  object.scale.setScalar(width < 700 ? 7.0 : 8.8);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let reveal = 0;
let currentSheet = 0;
let currentCam = 0;
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const motion = motionReduced ? 0 : 1;
  reveal += (Number(modelLoaded) - reveal) * .035;
  yaw += (targetYaw - yaw) * .055;
  pitch += (targetPitch - pitch) * .055;
  currentSheet += (Number(detailed) - currentSheet) * .045;
  currentCam += (Number(detailed) - currentCam) * .035;

  objectRig.position.y = .26 + reveal * .1 + Math.sin(time * .63) * .025 * motion;
  objectRig.rotation.y = yaw - .12 + Math.sin(time * .26) * .06 * motion + currentCam * .34;
  objectRig.rotation.x = pitch * .35 + currentCam * .15;
  objectRig.rotation.z = -.03 + Math.sin(time * .39) * .016 * motion;
  objectRig.scale.setScalar(.94 + reveal * .06 + currentCam * .15);

  key.position.x = -2.9 + Math.sin(time * .47) * 1.7 * motion + pointerX * .42;
  key.position.z = 3.6 + Math.cos(time * .36) * .6 * motion;
  key.target.position.set(objectRig.position.x, 0, 0);
  key.target.updateMatrixWorld();
  camera.position.x = currentCam * 1.15 + pointerX * .06 * motion;
  camera.position.z = (window.innerWidth < 700 ? 5.05 : 5.65) - currentCam * .75;
  camera.lookAt(window.innerWidth < 700 ? .1 : .18 + currentCam * .45, .12 + currentCam * .22, 0);

  if (page) {
    const vertices = page.geometry.attributes.position;
    const original = page.userData.original;
    const lift = currentSheet * .105;
    for (let i = 0; i < vertices.count; i++) {
      const x = original[i * 3];
      const z = original[i * 3 + 2];
      const along = (x + .0585) / .117;
      vertices.setY(i, Math.sin(Math.PI * along) * (.004 + lift * .42) + along * lift + Math.sin(z * 24 + time * 2) * .0015 * motion);
    }
    vertices.needsUpdate = true;
    page.geometry.computeVertexNormals();
    page.position.y = .025 + currentSheet * .06;
    page.rotation.z = currentSheet * -.16;
    page.rotation.x = currentSheet * -.08;
  }
  renderer.render(scene, camera);
}
animate();
