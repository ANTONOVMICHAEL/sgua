import * as THREE from 'three';

// A quiet, real geometry library scene. No render loop remains active at rest.
const INK = '#17212c';
const PAPER = '#f4f0e8';
const TITLES = [
  { number: 'I', title: ['КТО ЯВЛЯЕТСЯ', 'СУБЪЕКТОМ?'], sub: 'МУНИЦИПАЛИТЕТ / КОМИТЕТ', color: '#1555c8', deep: '#073b94', accent: '#ddf35a' },
  { number: 'II', title: ['КТО ОТВЕЧАЕТ', 'ПО ОБЯЗАТЕЛЬСТВУ?'], sub: 'УЧРЕЖДЕНИЕ / КАЗНА', color: '#dc553d', deep: '#aa301e', accent: '#f5debb' },
  { number: 'III', title: ['КТО ВОЗМЕЩАЕТ', 'ВРЕД?'], sub: 'РОСРЕЕСТР / УБЫТКИ', color: '#078183', deep: '#075d61', accent: '#ddf35a' },
];

function makeCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return [c, c.getContext('2d')];
}

function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grain(ctx, width, height, count, color) {
  // Seeded, sparse ink flecks add a printed fabric feel without random flicker.
  let seed = 53;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = .3 + rand() * 1.35;
    ctx.fillRect(x, y, r, r);
  }
}

function coverTexture(book, index) {
  const [canvas, c] = makeCanvas(1024, 1536);
  c.fillStyle = book.color;
  c.fillRect(0, 0, 1024, 1536);
  c.fillStyle = book.deep;
  c.fillRect(0, 0, 38, 1536);
  c.fillRect(986, 0, 38, 1536);
  grain(c, 1024, 1536, 6500, 'rgba(255,255,255,.045)');

  c.fillStyle = '#f8f4e9';
  c.font = '600 28px "Golos Text", Arial, sans-serif';
  c.letterSpacing = '4px';
  c.fillText('Ц И В И Л И С Т', 106, 134);
  c.fillRect(106, 168, 812, 3);
  c.font = '500 23px "Golos Text", Arial, sans-serif';
  c.letterSpacing = '2px';
  c.fillText('ПРАВОВАЯ ЛАБОРАТОРИЯ', 106, 215);

  if (index === 0) {
    // A square register, shifted axis and circular seal: ownership and agency.
    c.strokeStyle = '#e4f2f3';
    c.lineWidth = 7;
    c.strokeRect(108, 325, 652, 614);
    c.fillStyle = book.accent;
    c.fillRect(624, 603, 296, 212);
    c.fillStyle = book.deep;
    c.fillRect(746, 325, 174, 219);
    c.strokeStyle = book.accent;
    c.lineWidth = 18;
    c.beginPath(); c.arc(656, 525, 74, 0, Math.PI * 2); c.stroke();
    c.fillStyle = book.accent;
    c.fillRect(395, 507, 76, 279);
    c.fillRect(326, 490, 214, 47);
    c.fillRect(326, 755, 214, 47);
    c.fillStyle = book.deep;
    c.font = '700 66px "Unbounded", Arial, sans-serif';
    c.fillText('124', 654, 748);
  } else if (index === 1) {
    // Two asymmetric contracting blocks and a hard rule mark separate estates.
    c.fillStyle = '#f3debd';
    c.fillRect(107, 340, 357, 525);
    c.fillStyle = book.deep;
    c.fillRect(477, 468, 443, 430);
    c.strokeStyle = '#f8f4e9';
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(105, 930); c.lineTo(919, 348); c.stroke();
    c.fillStyle = book.deep;
    c.font = '700 266px "Unbounded", Arial, sans-serif';
    c.letterSpacing = '-30px';
    c.fillText('II', 117, 724);
    c.fillStyle = '#f3debd';
    c.font = '700 52px "Unbounded", Arial, sans-serif';
    c.fillText('123.22', 522, 741);
  } else {
    // An interrupted registration grid. The break is the legal event.
    c.strokeStyle = '#e7eee3';
    c.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const y = 366 + i * 111;
      c.beginPath(); c.moveTo(112, y); c.lineTo(i === 2 ? 464 : 916, y); c.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = 139 + i * 193;
      c.beginPath(); c.moveTo(x, 348); c.lineTo(x, i === 2 ? 611 : 912); c.stroke();
    }
    c.fillStyle = book.accent;
    c.fillRect(495, 578, 378, 173);
    c.fillStyle = book.deep;
    c.font = '700 173px "Unbounded", Arial, sans-serif';
    c.letterSpacing = '-19px';
    c.fillText('III', 513, 714);
    c.fillStyle = '#f8f4e9';
    c.font = '700 70px "Unbounded", Arial, sans-serif';
    c.fillText('1069', 112, 862);
  }

  c.fillStyle = '#f8f4e9';
  c.fillRect(106, 1025, 812, 3);
  c.letterSpacing = '-2px';
  book.title.forEach((line, i) => {
    let size = 71;
    do { c.font = `700 ${size}px "Unbounded", Arial, sans-serif`; size -= 1; }
    while (c.measureText(line).width > 812 && size > 48);
    c.fillText(line, 106, 1124 + i * 88);
  });
  c.font = '500 25px "Golos Text", Arial, sans-serif';
  c.letterSpacing = '3px';
  c.fillText(book.sub, 108, 1355);
  c.fillRect(107, 1415, 812, 2);
  c.font = '600 21px "Golos Text", Arial, sans-serif';
  c.letterSpacing = '2px';
  c.fillText('АНТОНОВ М. А.  ·  СГЮА', 107, 1473);
  return texture(canvas);
}

function spineTexture(book) {
  const [canvas, c] = makeCanvas(256, 1536);
  c.fillStyle = book.deep;
  c.fillRect(0, 0, 256, 1536);
  grain(c, 256, 1536, 2400, 'rgba(255,255,255,.06)');
  c.fillStyle = book.accent;
  c.fillRect(22, 48, 212, 5);
  c.fillRect(22, 1482, 212, 5);
  c.fillStyle = '#f8f4e9';
  c.textAlign = 'center';
  c.font = '700 115px "Unbounded", Arial, sans-serif';
  c.fillText(book.number, 128, 245);
  c.save();
  c.translate(128, 833);
  c.rotate(Math.PI / 2);
  c.font = '600 61px "Golos Text", Arial, sans-serif';
  c.letterSpacing = '6px';
  c.fillText('ЦИВИЛИСТ / ПРАВОВАЯ ЛАБОРАТОРИЯ', 0, 0);
  c.restore();
  c.font = '600 36px "Golos Text", Arial, sans-serif';
  c.fillText('СГЮА', 128, 1410);
  return texture(canvas);
}

function pageTexture() {
  const [canvas, c] = makeCanvas(128, 1024);
  c.fillStyle = '#e8dfcc';
  c.fillRect(0, 0, 128, 1024);
  for (let i = 0; i < 128; i += 3) {
    c.fillStyle = i % 9 === 0 ? 'rgba(75,65,49,.22)' : 'rgba(90,75,54,.08)';
    c.fillRect(i, 0, 1, 1024);
  }
  grain(c, 128, 1024, 2400, 'rgba(89,74,55,.055)');
  return texture(canvas);
}

function roundedBoardGeometry(w, h, depth) {
  const r = .045;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: .014, bevelSize: .016,
    bevelSegments: 2, curveSegments: 4, steps: 1,
  });
}

function createBook(book, index, sharedPageTexture) {
  const group = new THREE.Group();
  group.userData.volume = index + 1;
  const W = 2.08, H = 3.27, D = .34;
  const cloth = new THREE.MeshStandardMaterial({ color: book.color, roughness: .86, metalness: .015 });
  const spineCloth = new THREE.MeshStandardMaterial({ color: book.deep, roughness: .84 });
  const pages = new THREE.MeshStandardMaterial({ color: '#eee5d2', roughness: 1 });
  const edge = new THREE.MeshStandardMaterial({ map: sharedPageTexture, roughness: 1 });

  const block = new THREE.Mesh(new THREE.BoxGeometry(W - .135, H - .125, D - .10),
    [edge, pages, edge, edge, pages, pages]);
  block.position.set(.06, 0, 0);
  block.castShadow = true;
  group.add(block);

  const boardGeo = roundedBoardGeometry(W, H, .06);
  const front = new THREE.Mesh(boardGeo, cloth);
  front.position.z = .135;
  front.castShadow = true;
  group.add(front);
  const back = new THREE.Mesh(boardGeo, cloth);
  back.position.z = -.195;
  back.castShadow = true;
  group.add(back);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(.13, H - .015, .44),
    [spineCloth, new THREE.MeshStandardMaterial({ map: spineTexture(book), roughness: .9 }),
      spineCloth, spineCloth, spineCloth, spineCloth]);
  spine.position.set(-W / 2 + .015, 0, 0);
  spine.castShadow = true;
  group.add(spine);

  // A slight rounded hinge joins the cover board to the spine, visible obliquely.
  for (const z of [.155, -.157]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, H - .04, 12), spineCloth);
    hinge.position.set(-W / 2 + .093, 0, z);
    hinge.castShadow = true;
    group.add(hinge);
  }

  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - .083, H - .088),
    new THREE.MeshStandardMaterial({ map: coverTexture(book, index), roughness: .88, metalness: 0 }));
  face.position.set(.018, 0, .211);
  group.add(face);

  // Headbands at both ends, a physical detail of the binding.
  const headband = new THREE.MeshStandardMaterial({ color: book.accent, roughness: .85 });
  for (const y of [-H / 2 + .055, H / 2 - .055]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(W - .20, .018, .012), headband);
    band.position.set(.04, y, -.125);
    group.add(band);
  }

  group.userData.materials = [cloth, spineCloth, pages, edge, headband];
  return group;
}

function disposeScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(obj => {
    if (obj.geometry) geometries.add(obj.geometry);
    const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
    mats.forEach(m => {
      materials.add(m);
      if (m.map) textures.add(m.map);
    });
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  textures.forEach(t => t.dispose());
}

/**
 * Mounts an accessible-by-fallback 3D selector inside `container`.
 * `onSelect` receives the 1-based volume number. Returns null without WebGL.
 */
export function mountBooks(container, onSelect) {
  if (!container || !window.WebGLRenderingContext) return null;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'books-webgl';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const hemi = new THREE.HemisphereLight('#ffffff', '#b1a796', 2.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff8ed', 3.1);
  key.position.set(-3, 6, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#a4c9ff', .7);
  rim.position.set(4, 3, -5);
  scene.add(rim);

  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(18, 11), new THREE.ShadowMaterial({ opacity: .20 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.73;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const pageEdge = pageTexture();
  const groups = TITLES.map((item, index) => {
    const g = createBook(item, index, pageEdge);
    scene.add(g);
    return g;
  });
  const basePositions = [-2.76, 0, 2.76];
  const baseYaw = [-.15, .07, .18];
  const baseRoll = [-.045, .01, .035];
  const targets = groups.map((g, i) => ({
    x: basePositions[i], y: .01, z: 0, rx: 0, ry: baseYaw[i], rz: baseRoll[i], scale: 1,
  }));
  groups.forEach((g, i) => {
    g.position.set(targets[i].x, targets[i].y, targets[i].z);
    g.rotation.set(0, targets[i].ry, targets[i].rz);
    g.scale.setScalar(1);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let active = true, raf = 0, hovered = -1, selected = -1, selectTimeout = 0;
  const canvas = renderer.domElement;
  const render = () => renderer.render(scene, camera);

  function resize() {
    if (!active) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.position.set(0, .12, Math.max(6.75, 10.1 / (2 * tan * camera.aspect), 4.55 / (2 * tan)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    render();
  }

  function animate() {
    raf = 0;
    if (!active) return;
    let moving = false;
    groups.forEach((g, i) => {
      const t = targets[i];
      const k = reducedMotion ? 1 : .17;
      for (const [obj, prop, dest] of [
        [g.position, 'x', t.x], [g.position, 'y', t.y], [g.position, 'z', t.z],
        [g.rotation, 'x', t.rx], [g.rotation, 'y', t.ry], [g.rotation, 'z', t.rz],
      ]) {
        if (Math.abs(obj[prop] - dest) > .001) {
          obj[prop] = THREE.MathUtils.lerp(obj[prop], dest, k);
          moving = true;
        } else obj[prop] = dest;
      }
      if (Math.abs(g.scale.x - t.scale) > .001) {
        const s = THREE.MathUtils.lerp(g.scale.x, t.scale, k);
        g.scale.setScalar(s);
        moving = true;
      } else g.scale.setScalar(t.scale);
    });
    render();
    if (moving) raf = requestAnimationFrame(animate);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(animate);
  }

  function setHover(index, x = 0, y = 0) {
    if (selected >= 0) return;
    hovered = index;
    canvas.style.cursor = index < 0 ? 'default' : 'pointer';
    targets.forEach((t, i) => {
      t.x = basePositions[i]; t.y = .01; t.z = 0;
      t.rx = 0; t.ry = baseYaw[i]; t.rz = baseRoll[i]; t.scale = 1;
      if (i === index) {
        t.y = .09;
        t.z = .32;
        t.rx = THREE.MathUtils.clamp(-y * .07, -.07, .07);
        t.ry = baseYaw[i] + THREE.MathUtils.clamp(x * .13, -.13, .13);
        t.scale = 1.025;
      }
    });
    schedule();
  }

  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(groups, true);
    if (!intersects.length) return -1;
    let obj = intersects[0].object;
    while (obj && !obj.userData.volume) obj = obj.parent;
    return obj?.userData.volume ? obj.userData.volume - 1 : -1;
  }

  function pointerMove(e) {
    const i = hit(e);
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * 2 - 1;
    const relY = (e.clientY - rect.top) / rect.height * 2 - 1;
    setHover(i, relX, relY);
  }

  function choose(e) {
    if (selected >= 0) return;
    const i = hit(e);
    if (i < 0) return;
    selected = i;
    canvas.style.cursor = 'default';
    targets.forEach((t, j) => {
      t.x = basePositions[j] + (j < i ? -.42 : j > i ? .42 : -basePositions[i] * .08);
      t.y = j === i ? .15 : -.09;
      t.z = j === i ? .7 : -.3;
      t.ry = j === i ? 0 : baseYaw[j];
      t.rx = 0;
      t.rz = j === i ? 0 : baseRoll[j];
      t.scale = j === i ? 1.07 : .96;
    });
    schedule();
    selectTimeout = window.setTimeout(() => { if (active) onSelect?.(i + 1); }, reducedMotion ? 0 : 370);
  }

  canvas.addEventListener('pointermove', pointerMove, { passive: true });
  const pointerLeave = () => setHover(-1);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('click', choose);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  document.fonts?.ready.then(() => { if (active) { // Repaint only if fonts arrived after WebGL initialization.
    groups.forEach((g, i) => {
      // Front cover and spine keep stable geometry while their print is retypeset.
      const face = g.children.find(x => x.geometry?.type === 'PlaneGeometry');
      if (face) {
        face.material.map?.dispose();
        face.material.map = coverTexture(TITLES[i], i);
        face.material.needsUpdate = true;
      }
      const spine = g.children.find(x => x.geometry?.type === 'BoxGeometry' && x.geometry.parameters.width === .13);
      if (spine) {
        spine.material[1].map?.dispose();
        spine.material[1].map = spineTexture(TITLES[i]);
        spine.material[1].needsUpdate = true;
      }
    });
    render();
  }});
  resize();

  return {
    resize,
    destroy() {
      active = false;
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (selectTimeout) clearTimeout(selectTimeout);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('click', choose);
      disposeScene(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
}

/**
 * Software fallback for browsers where WebGL is unavailable. The three printed
 * covers are the same artwork as the 3D models. The separate case list remains
 * the keyboard and screen reader path; this canvas is a visual click target.
 */
export function renderFallbackBooks(container, onSelect) {
  if (!container) return null;
  container.querySelector('.stage-loading')?.remove();
  const canvas = document.createElement('canvas');
  canvas.className = 'books-fallback';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    display: 'block', width: '100%', height: '100%',
    cursor: 'pointer', touchAction: 'manipulation',
  });
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return null; }
  let alive = true, hovered = -1;
  let covers = TITLES.map((b, i) => coverTexture(b, i));

  function bookRect(i, w, h) {
    const size = Math.min(w * .29, h * .43, 300);
    return {
      x: w * (.175 + .325 * i) - size * .49,
      y: h * [.235, .255, .215][i] - (hovered === i ? 7 : 0),
      w: size,
      h: size * 1.54,
      angle: [-.048, .025, .058][i],
    };
  }

  function polygon(points, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let j = 1; j < points.length; j++) ctx.lineTo(points[j][0], points[j][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function drawBook(i, w, h) {
    const r = bookRect(i, w, h);
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(r.angle);
    ctx.translate(-r.w / 2, -r.h / 2);
    const s = r.w / 164;
    const side = 11 * s;
    const corner = 7 * s;

    // Ground contact is a diffuse printed shadow, with a sharper edge below.
    ctx.save();
    ctx.shadowColor = 'rgba(20,25,28,.32)';
    ctx.shadowBlur = 23 * s;
    ctx.shadowOffsetX = 9 * s;
    ctx.shadowOffsetY = 22 * s;
    ctx.fillStyle = 'rgba(20,25,28,.15)';
    ctx.fillRect(2 * s, 8 * s, r.w + side, r.h);
    ctx.restore();

    polygon([[side + 3*s, 0], [r.w + 10*s, -3*s], [r.w + 6*s, 8*s], [side, 10*s]], '#f1e9d6', '#a8a18d', .7*s);
    for (let line = 0; line < 5; line++) {
      ctx.strokeStyle = `rgba(66,58,45,${.10 + line * .019})`;
      ctx.lineWidth = .6 * s;
      ctx.beginPath(); ctx.moveTo(side + 6*s, line * 1.5*s + 1*s);
      ctx.lineTo(r.w + 7*s, line * 1.5*s - 1*s); ctx.stroke();
    }

    polygon([[r.w + 2*s, 7*s], [r.w + 12*s, 1*s], [r.w + 11*s, r.h - 5*s], [r.w + 1*s, r.h + 4*s]], '#dcd0b8', '#918673', .9*s);
    for (let line = 1; line < 5; line++) {
      ctx.strokeStyle = 'rgba(82,74,60,.16)'; ctx.lineWidth = .6*s;
      ctx.beginPath(); ctx.moveTo(r.w + 2*s + line*s, 10*s);
      ctx.lineTo(r.w + 2*s + line*s, r.h - 3*s); ctx.stroke();
    }

    polygon([[0, 8*s], [side + 2*s, 2*s], [side + 2*s, r.h + 3*s], [0, r.h + 10*s]], TITLES[i].deep, '#0f2530', .9*s);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(side - 2*s, 6*s, 1*s, r.h - 4*s);
    ctx.save();
    ctx.translate(5*s, r.h - 15*s); ctx.rotate(-Math.PI/2);
    ctx.fillStyle = '#f8f4e9';
    ctx.font = `600 ${7*s}px "Golos Text", Arial, sans-serif`;
    ctx.fillText('ЦИВИЛИСТ  /  ' + TITLES[i].number, 0, 0);
    ctx.restore();

    // Physical face is a slightly sheared parallelogram, not a flat card.
    polygon([[side, 4*s], [r.w + 2*s, 0], [r.w + 1*s, r.h + 4*s], [side - 1*s, r.h + 8*s]], TITLES[i].color, '#183342', 1.25*s);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(side + 1*s, 5*s); ctx.lineTo(r.w + 1*s, 1*s);
    ctx.lineTo(r.w, r.h + 3*s); ctx.lineTo(side, r.h + 7*s);
    ctx.closePath(); ctx.clip();
    const coverW = r.w - side;
    ctx.transform(coverW / 1024, -4*s / 1024, -2*s / 1536, r.h / 1536, side, 5*s);
    ctx.drawImage(covers[i].image, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.fillRect(side + 2*s, 6*s, 2*s, r.h - corner);
    ctx.restore();
  }

  function draw() {
    if (!alive) return;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) drawBook(i, w, h);
  }

  function indexAt(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    for (let i = 0; i < 3; i++) {
      const b = bookRect(i, rect.width, rect.height);
      if (x >= b.x - 10 && x <= b.x + b.w + 18 && y >= b.y - 12 && y <= b.y + b.h + 15) return i;
    }
    return -1;
  }
  const move = e => { const i = indexAt(e); if (i !== hovered) { hovered = i; canvas.style.cursor = i < 0 ? 'default' : 'pointer'; draw(); } };
  const leave = () => { hovered = -1; canvas.style.cursor = 'default'; draw(); };
  const click = e => { const i = indexAt(e); if (i >= 0) onSelect?.(i + 1); };
  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('click', click);
  const observer = new ResizeObserver(draw);
  observer.observe(container);
  document.fonts?.ready.then(() => { if (!alive) return; covers.forEach(t => t.dispose()); covers = TITLES.map((b, i) => coverTexture(b, i)); draw(); });
  draw();
  return {
    resize: draw,
    destroy() {
      alive = false;
      observer.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('click', click);
      covers.forEach(t => t.dispose());
      canvas.remove();
    },
  };
}
