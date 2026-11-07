import * as THREE from 'three';

const editions=[
  {base:'#12399c',accent:'#e6ff55',detail:'#82bdff',roman:'I',title:['КТО ЯВЛЯЕТСЯ','СУБЪЕКТОМ?'],sub:'МУНИЦИПАЛЬНОЕ ИМУЩЕСТВО'},
  {base:'#ec533c',accent:'#071c57',detail:'#ffcaaf',roman:'II',title:['КТО ОТВЕЧАЕТ','ПО ОБЯЗАТЕЛЬСТВУ?'],sub:'КАЗЕННОЕ И БЮДЖЕТНОЕ УЧРЕЖДЕНИЯ'},
  {base:'#00918c',accent:'#e6ff55',detail:'#a6fbdb',roman:'III',title:['КТО ВОЗМЕЩАЕТ','ВРЕД?'],sub:'НЕЗАКОННЫЙ РЕГИСТРАЦИОННЫЙ ОТКАЗ'}
];
function tex(paint,w=768,h=1120){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
function cover(e,i){return tex((c,w,h)=>{
  c.fillStyle=e.base;c.fillRect(0,0,w,h);
  let grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'rgba(255,255,255,.15)');grad.addColorStop(.5,'transparent');grad.addColorStop(1,'rgba(0,0,0,.25)');c.fillStyle=grad;c.fillRect(0,0,w,h);
  c.globalAlpha=.16;c.strokeStyle=e.detail;c.lineWidth=1;for(let j=0;j<150;j++){c.beginPath();c.moveTo(0,j*h/150);c.lineTo(w,j*h/150);c.stroke()}c.globalAlpha=1;
  c.strokeStyle=e.detail;c.lineWidth=3;c.strokeRect(35,35,w-70,h-70);c.fillStyle=e.accent;
  c.font='600 18px "Golos Text",sans-serif';c.letterSpacing='3px';c.fillText('Ц И В И Л И С Т    /    П Р А В О В А Я   Л А Б О Р А Т О Р И Я',68,94);
  c.save();c.translate(w/2,525);c.strokeStyle=e.detail;
  if(i===0){for(let r=40;r<260;r+=37){c.beginPath();c.arc(0,0,r,0,7);c.lineWidth=9;c.stroke()}c.strokeStyle=e.accent;c.lineWidth=26;c.beginPath();c.moveTo(-230,202);c.lineTo(230,-202);c.stroke()}
  if(i===1){for(let j=0;j<5;j++){c.fillStyle=j%2?e.accent:e.detail;c.fillRect(-205+j*94,-230+j*26,78,440-j*35)}}
  if(i===2){for(let j=0;j<20;j++){const a=j*Math.PI/10;c.beginPath();c.moveTo(Math.cos(a)*70,Math.sin(a)*70);c.lineTo(Math.cos(a)*260,Math.sin(a)*260);c.lineWidth=j%3?9:23;c.stroke()}c.fillStyle=e.accent;c.beginPath();c.arc(0,0,75,0,7);c.fill();c.fillStyle=e.base;c.beginPath();c.arc(0,0,25,0,7);c.fill()}
  c.restore();c.fillStyle=e.accent;c.font='700 58px "Unbounded",sans-serif';c.letterSpacing='-3px';e.title.forEach((line,j)=>c.fillText(line,67,875+j*72));
  c.font='600 19px "Golos Text",sans-serif';c.letterSpacing='1px';c.fillText(e.sub,68,1030);c.fillStyle=e.detail;c.font='600 18px "Golos Text",sans-serif';c.fillText('АНТОНОВ М. А.  /  СГЮА',68,1081);
})}
function pageTex(){return tex((c,w,h)=>{c.fillStyle='#f4efdf';c.fillRect(0,0,w,h);for(let j=0;j<230;j++){c.fillStyle=j%8?'rgba(57,60,67,.15)':'rgba(57,60,67,.33)';c.fillRect(0,j*h/230,w,j%8?1:2)}},512,1024)}
function add(parent,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function board(w,h,d){let s=new THREE.Shape(),r=.03;s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);let g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:3});g.translate(0,0,-d/2);return g}
function volume(e,i,pages){
  const v=new THREE.Group();v.userData.index=i;
  const cloth=new THREE.MeshPhysicalMaterial({color:e.base,roughness:.68,metalness:.03,clearcoat:.12});
  const ink=new THREE.MeshPhysicalMaterial({map:cover(e,i),roughness:.72,clearcoat:.08});
  const leaf=new THREE.MeshStandardMaterial({color:'#fff9ed',map:pages,roughness:.89});
  const endpaper=new THREE.MeshStandardMaterial({color:'#e8ddca',roughness:.9});
  const foil=new THREE.MeshStandardMaterial({color:e.accent,metalness:.35,roughness:.34});
  add(v,board(1.67,2.49,.05),cloth,-.025,0,-.18);
  add(v,new THREE.BoxGeometry(1.54,2.37,.27),[leaf,leaf,endpaper,endpaper,endpaper,endpaper],.05,0,0);
  add(v,board(1.68,2.50,.06),cloth,-.025,0,.18);
  // The cylinder segment rounds the book spine beyond the page block.
  const spine=add(v,new THREE.CylinderGeometry(.185,.185,2.45,32,1,false,Math.PI*.48,Math.PI*1.03),cloth,-.83,0,0);spine.rotation.y=Math.PI/2;
  for(const y of [-1.01,-.85,.85,1.01]){const band=add(v,new THREE.TorusGeometry(.18,.012,6,24,Math.PI),foil,-.83,y,0);band.rotation.z=Math.PI/2}
  add(v,new THREE.BoxGeometry(.024,2.43,.08),foil,-.77,0,.20);
  add(v,new THREE.PlaneGeometry(1.58,2.40),ink,.015,0,.222);
  const back=add(v,new THREE.PlaneGeometry(1.56,2.39),cloth,.015,0,-.213);back.rotation.y=Math.PI;
  add(v,new THREE.BoxGeometry(.021,2.33,.245),leaf,.83,0,0);
  add(v,new THREE.BoxGeometry(1.54,.014,.258),foil,.05,1.185,0);
  add(v,new THREE.BoxGeometry(1.54,.014,.258),foil,.05,-1.185,0);
  return v;
}
export function mountBooks(container,onSelect){
  let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})}catch{return null}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.55;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='books-canvas';container.append(canvas);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
  scene.add(new THREE.AmbientLight('#e5f1ff',1.7));
  const light=new THREE.DirectionalLight('#fff5dc',4);light.position.set(-4,6,7);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=5;light.shadow.camera.bottom=-5;scene.add(light);
  const rim=new THREE.DirectionalLight('#71e4ff',2);rim.position.set(5,4,-3);scene.add(rim);
  const floor=add(scene,new THREE.PlaneGeometry(16,16),new THREE.ShadowMaterial({opacity:.28}),.7,-2.1,-.3);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;
  const pages=pageTex(),books=editions.map((e,i)=>volume(e,i,pages));books.forEach(b=>scene.add(b));
  const pos=[[-1.25,-.55,.5],[.67,-.78,.2],[2.58,-.51,-.17]],ang=[[-.08,-.34,-.09],[-.08,.07,.07],[-.08,.37,-.06]];
  camera.position.set(.8,.8,9.3);camera.lookAt(.68,0,0);
  let active=true,raf=0,hover=-1,chosen=-1,start=performance.now();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){if(!active)return;const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.render(scene,camera)}
  function tick(now){if(!active)return;let moving=false;const arrival=reduced?1:Math.min(1,(now-start)/1050);
    books.forEach((v,i)=>{const target=[pos[i][0],pos[i][1]+(hover===i?.22:0)+(chosen===i?.1:0)-(1-arrival)*1.8,pos[i][2]+(hover===i?.45:0)+(chosen===i?1.5:0)],rot=[ang[i][0],ang[i][1]-(hover===i?.16:0)-(chosen===i?.14:0),ang[i][2]];
      for(let k=0;k<3;k++){const axis=['x','y','z'][k],d=target[k]-v.position[axis];if(Math.abs(d)>.001){v.position[axis]+=d*.18;moving=true}const a=rot[k]-v.rotation[axis];if(Math.abs(a)>.0005){v.rotation[axis]+=a*.17;moving=true}}
      const s=chosen===i?1.4:1.22;if(Math.abs(v.scale.x-s)>.001){v.scale.setScalar(v.scale.x+(s-v.scale.x)*.16);moving=true}
    });renderer.render(scene,camera);raf=moving||arrival<1?requestAnimationFrame(tick):0
  }
  function animate(){if(!raf)raf=requestAnimationFrame(tick)}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let o=ray.intersectObjects(books,true)[0]?.object;while(o&&!Number.isInteger(o.userData.index))o=o.parent;return o?.userData.index??-1}
  function move(e){const i=pick(e);if(i!==hover){hover=i;canvas.style.cursor=i<0?'default':'pointer';animate()}}
  function leave(){hover=-1;animate()}
  function click(e){const i=pick(e);if(i<0||chosen>=0)return;chosen=i;hover=-1;animate();setTimeout(()=>{if(active)onSelect(i)},reduced?90:650)}
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('click',click);
  const observer=new ResizeObserver(resize);observer.observe(container);
  books.forEach((v,i)=>{v.position.set(pos[i][0],pos[i][1]-(reduced?0:1.8),pos[i][2]);v.rotation.set(...ang[i]);v.scale.setScalar(1.22)});
  resize();animate();
  return {destroy(){active=false;if(raf)cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m?.dispose?.())});renderer.dispose();canvas.remove()}}
}
