import * as THREE from 'three';

const M = (color, roughness=.72, metalness=.02) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mat = {
  stone:M('#ebedf0',.82), side:M('#b5c8dd',.9), trim:M('#fff8e8',.65), glass:new THREE.MeshPhysicalMaterial({color:'#63bed9',metalness:.18,roughness:.16,transmission:.2,thickness:.3}),
  navy:M('#071c57'), cobalt:M('#174dff',.48,.16), coral:M('#ff624c',.45), teal:M('#00a99d',.46,.14), lime:M('#e8ff55',.55), paper:M('#fffdf7',.89), ink:M('#253453'), steel:M('#79889a',.3,.55)
};
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(parent,w,h,d,m,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,parent,x,y,z)}
function cyl(parent,r1,r2,h,m,x=0,y=0,z=0,n=24){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,parent,x,y,z)}
function bevelBox(parent,w,h,d,m,x=0,y=0,z=0,r=.045){
  const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:4});g.translate(0,0,-d/2);return mesh(g,m,parent,x,y,z)
}
function line(parent,pts,color='#e8ff55',radius=.015){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),38,radius,7,false),M(color,.35,.1),parent)}
function sheet(color=mat.paper,kind='paper'){
  const g=new THREE.Group(); g.userData.docKind=kind;
  bevelBox(g,1.34,1.76,.035,color,0,0,0,.035);
  // Fine rule pattern is geometry, never raster text. The readable original is HTML.
  for(let i=0;i<7;i++)box(g,i===0?.76:i===1?.94:.88,.011,.004,i===0?mat.cobalt:mat.side,-.08,.54-i*.165,.026);
  box(g,.23,.23,.008,mat.coral,.4,-.53,.029);
  for(let i=0;i<3;i++)box(g,.13,.013,.006,mat.trim,.4,-.46-i*.05,.037);
  cyl(g,.055,.055,.016,mat.steel,-.54,.78,.025,12).rotation.x=Math.PI/2;
  return g;
}
function building(kind='registration'){
  const g=new THREE.Group();
  const modern=kind==='registration';
  const base=modern?mat.stone:mat.trim;
  bevelBox(g,3.25,1.95,1.52,base,0,1.12,0,.06);
  box(g,3.46,.17,1.74,modern?mat.cobalt:mat.navy,0,2.17,0);
  box(g,3.47,.13,1.74,mat.side,0,.12,0);
  box(g,3.18,.14,1.64,modern?mat.navy:mat.coral,0,2.32,0);
  for(let level=0;level<2;level++) for(let col=0;col<6;col++){
    const x=-1.34+col*.535,y=.62+level*.80;
    bevelBox(g,.37,.54,.022,mat.ink,x,y,.778,.02);
    bevelBox(g,.30,.47,.015,mat.glass,x,y,.802,.015);
    box(g,.024,.50,.019,mat.trim,x,y,.821);
    if(modern)box(g,.04,.72,.08,mat.cobalt,x-.255,y,.75);
  }
  // Entrance contains a recessed glass plane and metal handle.
  box(g,.76,1.04,.08,mat.ink,0,.60,.83);
  box(g,.63,.91,.02,mat.glass,0,.60,.89);
  box(g,.024,.92,.028,mat.steel,0,.60,.91);
  box(g,.025,.20,.05,mat.trim,.13,.56,.93);
  if(!modern){
    for(let col=0;col<5;col++){
      const x=-1.42+col*.71;
      cyl(g,.055,.055,1.94,mat.trim,x,1.15,.87,16);
      box(g,.22,.085,.16,mat.navy,x,2.09,.87);
    }
    const roof=mesh(new THREE.ConeGeometry(1.9,.42,4),mat.navy,g,0,2.55,0);roof.rotation.y=Math.PI/4;roof.scale.z=.53;
  } else {
    for(let i=0;i<9;i++)box(g,.018,.9,.025,mat.cobalt,-1.52+i*.38,2.5,-.1);
    box(g,2.2,.07,.8,mat.steel,0,2.63,.2);
  }
  return g;
}
function plinth(parent,w=4.2){
  const g=new THREE.Group();parent.add(g);
  box(g,w,.18,2.55,mat.navy,0,-.07,0);
  box(g,w-.12,.025,2.45,mat.cobalt,0,.035,0);
  for(let x=-w/2+.18;x<w/2;x+=.28)box(g,.014,.08,2.42,mat.side,x,-.17,0);
  return g;
}
function apparatus(parent){
  const g=new THREE.Group();parent.add(g);
  bevelBox(g,.48,.54,.48,mat.steel,0,.28,0,.035);
  box(g,.37,.27,.018,mat.ink,0,.37,.26);
  for(let i=0;i<5;i++)box(g,.25,.012,.005,mat.glass,0,.25-i*.042,.274);
  cyl(g,.022,.022,.04,mat.coral,.16,.09,.27);
  return g;
}
function ribbon(color=mat.lime){
  const g=new THREE.Group();
  line(g,[[-2.5,.54,.9],[-1.35,.9,1.28],[.1,1.15,1.36],[1.6,.88,1.27],[2.5,.68,.8]],color.color.getStyle(),.028);
  const arrow=mesh(new THREE.ConeGeometry(.115,.3,16),color,g,2.5,.68,.8);arrow.rotation.z=-Math.PI/2;
  return g;
}
function registration(scene){
  const root=new THREE.Group();scene.add(root);plinth(root,4.5);
  const object={building:building('registration'),contract:sheet(mat.paper,'contract'),application:sheet(mat.paper,'application'),register:sheet(mat.glass,'register'),ban:sheet(mat.coral,'ban'),refusal:sheet(mat.coral,'refusal'),court:sheet(mat.paper,'court'),rent:sheet(mat.paper,'rent'),forecast:sheet(mat.paper,'forecast'),objection:sheet(mat.paper,'objection'),link:ribbon(mat.teal)};
  Object.entries(object).forEach(([k,o])=>{o.userData.id=k;root.add(o)});
  // Physical registry rails around the architecture; they reveal the procedural layer.
  const rails=new THREE.Group();for(let i=0;i<5;i++)line(rails,[[-2.03,-.02+i*.37,.8],[-1.6,-.02+i*.37,1.34],[1.6,-.02+i*.37,1.34],[2.06,-.02+i*.37,.8]],'#71e7f1',.007);
  object.rails=rails;root.add(rails);
  return {root,object};
}
function municipality(scene){
  const root=new THREE.Group();scene.add(root);plinth(root,4.4);
  const object={building:building('municipality'),contract:sheet(mat.paper,'contract'),register:sheet(mat.glass,'register'),company:sheet(mat.paper,'company'),authority:sheet(mat.paper,'authority'),provision:sheet(mat.paper,'provision'),link:ribbon(mat.lime)};
  Object.entries(object).forEach(([k,o])=>{o.userData.id=k;root.add(o)});
  return {root,object};
}
function institutionHouse(kind){
  const g=new THREE.Group();
  const treasury=kind==='treasury',color=treasury?mat.cobalt:mat.coral;
  bevelBox(g,treasury?1.57:1.78,treasury?1.45:1.26,1.17,treasury?mat.stone:mat.trim,0,treasury?.91:.81,0,.05);
  box(g,treasury?1.77:1.96,.13,1.37,color,0,treasury?1.73:1.48,0);
  box(g,treasury?1.69:1.87,.09,1.28,mat.navy,0,.12,0);
  for(const x of [-.5,0,.5])for(const y of treasury?[.62,1.13]:[.54,1.0]){
    bevelBox(g,.27,.3,.02,mat.ink,x,y,.6,.02);
    bevelBox(g,.21,.25,.012,mat.glass,x,y,.62,.015);
  }
  box(g,.34,.61,.04,mat.ink,0,.44,.64);
  if(treasury){
    for(const x of [-.78,.78]){cyl(g,.047,.047,1.5,color,x,.88,.64,16);box(g,.16,.065,.16,mat.trim,x,1.64,.64)}
    const pediment=mesh(new THREE.ConeGeometry(.91,.28,3),mat.navy,g,0,1.92,.65);pediment.rotation.z=Math.PI;
    box(g,1.2,.035,.04,mat.lime,0,1.76,.69);
  }else{
    box(g,.46,.94,.66,mat.coral,.83,.54,-.13);
    for(let i=0;i<4;i++)box(g,.045,.97,.04,mat.steel,-.72+i*.46,.81,.66);
    box(g,.84,.028,.04,mat.teal,.36,1.29,.65);
  }
  return g;
}
function institutions(scene){
  const root=new THREE.Group();scene.add(root);
  const floor=box(root,7.4,.16,3.45,mat.navy,0,-.08,0);floor.receiveShadow=true;
  const object={left:institutionHouse('treasury'),right:institutionHouse('budget'),deviceA:apparatus(root),deviceB:apparatus(root),contractA:sheet(mat.paper,'contractA'),contractB:sheet(mat.paper,'contractB'),assets:sheet(mat.paper,'assets'),claim:sheet(mat.paper,'claim'),link:ribbon(mat.teal)};
  Object.entries(object).forEach(([k,o])=>{o.userData.id=k; if(o.parent!==root)root.add(o)});
  return {root,object};
}
const transforms={
  registration:{
    building:[0,0,-.55,0,-.15,0,1], rails:[0,.22,-.45,0,0,0,1],
    contract:[-1.72,1.45,1.1,0,-.14,-.06,1], application:[1.65,1.47,1.15,0,.12,.08,1],
    register:[1.72,1.52,1.32,0,.1,.04,1], ban:[1.72,1.5,1.46,0,.09,.06,1], refusal:[1.56,1.4,1.64,0,.1,-.03,1],
    court:[-1.54,1.47,1.52,0,-.13,-.04,1], rent:[-1.72,1.5,1.56,0,-.12,-.07,1],forecast:[1.68,1.47,1.52,0,.12,.06,1], objection:[1.62,1.5,1.6,0,.13,0,1],link:[0,.7,.75,0,0,0,1]
  },
  municipality:{building:[0,0,-.55,0,.18,0,1],contract:[1.69,1.48,1.16,0,.12,.06,1],register:[-1.68,1.5,1.35,0,-.12,-.07,1],company:[1.68,1.4,1.47,0,.1,.07,1],authority:[-1.72,1.45,1.55,0,-.12,-.03,1],provision:[1.72,1.5,1.55,0,.1,.02,1],link:[0,.65,.9,0,0,0,1]},
  institutions:{left:[-1.75,0,-.15,0,-.12,0,1],right:[1.75,0,-.15,0,.12,0,1],deviceA:[-1.6,.1,1.25,0,.05,0,1],deviceB:[1.6,.1,1.25,0,-.04,0,1],contractA:[-2.65,1.25,1.23,0,-.1,-.06,1],contractB:[2.65,1.25,1.23,0,.11,.06,1],assets:[1.78,1.5,1.52,0,.12,.06,1],claim:[-.02,1.5,1.58,0,0,0,1],link:[0,.7,1.2,0,0,0,1]}
};
const appearances={
  registration:[['building'],['building','contract','application'],['building','register','rails'],['building','rails','ban','refusal'],['building','court'],['building','rent'],['building','forecast'],['building','objection'],['building','court','link']],
  municipality:[['building'],['building','contract'],['building','register'],['building','register','company'],['building','authority','provision'],['building','register','contract','authority'],['building','authority','link']],
  institutions:[['left','right','deviceA','deviceB'],['left','right','deviceA','contractA'],['left','right','deviceB','contractB'],['left','right','deviceA','deviceB','claim'],['left','right','assets','deviceA','deviceB'],['left','right','deviceA','deviceB']]
};
const cameras={
  registration:[[4,3.1,7.4],[3.1,2.5,6.6],[-3.4,2.7,6.4],[3.7,2.55,6.2],[-3,2.7,6.1],[-3.3,2.75,6.4],[3.2,2.7,6.3],[3.1,2.65,6.4],[4,3.2,7.2]],
  municipality:[[3.8,3,7.4],[3.1,2.5,6.5],[-3,2.7,6.4],[2.9,2.7,6.3],[3.2,2.5,6.4],[3.7,2.9,7],[4,3.1,7.2]],
  institutions:[[0,3.2,8.7],[-3.3,2.7,7.4],[3.3,2.7,7.4],[0,3.3,8.5],[2.2,3.1,8.2],[0,3.3,8.8]]
};

export function mountWorld(container,id,onDocument){
  let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{return null}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='world-canvas';canvas.setAttribute('aria-hidden','true');container.appendChild(canvas);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(36,1,.1,100);
  scene.add(new THREE.AmbientLight('#d4e9ff',1.25));
  const key=new THREE.DirectionalLight('#fff1d4',3.2);key.position.set(-4,8,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.00035;scene.add(key);
  const rim=new THREE.DirectionalLight('#00b8ff',1.3);rim.position.set(5,4,-5);scene.add(rim);
  const stage=id==='registration'?registration(scene):id==='municipality'?municipality(scene):institutions(scene);
  const shadow=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.24}),scene,0,-.26,0);shadow.rotation.x=-Math.PI/2;shadow.receiveShadow=true;
  const all=stage.object;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf=0,active=true,current=0,off=false,hover=null;
  const target=(name,index)=>{
    const tr=transforms[id][name]||[0,0,0,0,0,0,1];
    const shown=appearances[id][index].includes(name);
    return [...tr.slice(0,6),shown?tr[6]:.001];
  };
  const apply=(obj,v)=>{obj.position.set(v[0],v[1],v[2]);obj.rotation.set(v[3],v[4],v[5]);obj.scale.setScalar(v[6]);obj.visible=v[6]>.002};
  const snapshot=obj=>[...obj.position.toArray(),...obj.rotation.toArray(),obj.scale.x];
  const look=new THREE.Vector3(0,1.15,0);
  function resize(){if(!active)return;let w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)}
  function setStep(index,animated=true,forceFromPrevious=false){
    index=Math.max(0,Math.min(index,appearances[id].length-1));
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(forceFromPrevious){const before=Math.max(0,index-1);for(const [k,o] of Object.entries(all)){apply(o,target(k,before));if(index===0&&o.visible){o.position.y-=1.1;o.scale.setScalar(.001)}}camera.position.set(...cameras[id][before]);if(index===0)camera.position.z+=3.2;}
    const start=Object.fromEntries(Object.entries(all).map(([k,o])=>[k,snapshot(o)]));
    const startCam=camera.position.clone();const endCam=new THREE.Vector3(...cameras[id][index]);
    for(const [k,o] of Object.entries(all))if(target(k,index)[6]>.002)o.visible=true;
    current=index;
    const duration=animated&&!off&&!reduced?850:0,begin=performance.now();
    function frame(now){
      if(!active)return;
      const p=duration?Math.min(1,(now-begin)/duration):1;
      const t=1-Math.pow(1-p,3);
      for(const [k,o] of Object.entries(all)){
        const from=start[k],to=target(k,index);
        apply(o,from.map((v,i)=>v+(to[i]-v)*t));
        if(p<1&&from[6]<=.002&&to[6]>.002)o.visible=true;
      }
      camera.position.copy(startCam).lerp(endCam,t);camera.lookAt(look);renderer.render(scene,camera);
      raf=p<1?requestAnimationFrame(frame):0;
    }
    raf=requestAnimationFrame(frame);
  }
  // The 3D document itself is clickable; its sharp HTML reading layer is shown by the host.
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const visible=Object.values(all).filter(o=>o.visible&&o.userData.docKind);const its=ray.intersectObjects(visible,true);if(!its.length)return null;let o=its[0].object;while(o&&!o.userData.docKind)o=o.parent;return o?.userData.docKind||null}
  function move(e){const h=hit(e);if(h!==hover){hover=h;canvas.style.cursor=h?'pointer':'default'}}
  function click(e){const h=hit(e);if(h)onDocument?.(h)}
  canvas.addEventListener('pointermove',move);canvas.addEventListener('click',click);
  const observer=new ResizeObserver(resize);observer.observe(container);
  for(const [k,o] of Object.entries(all)){apply(o,target(k,0));if(o.visible){o.position.y-=1.1;o.scale.setScalar(.001)}}camera.position.set(...cameras[id][0]);camera.position.z+=3.2;camera.lookAt(look);resize();
  setStep(0,true);
  return {setStep,resize,setMotion(v){off=v},destroy(){active=false;if(raf)cancelAnimationFrame(raf);observer.disconnect();canvas.removeEventListener('pointermove',move);canvas.removeEventListener('click',click);scene.traverse(o=>{o.geometry?.dispose?.();const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>m?.dispose?.())});renderer.dispose();canvas.remove()}};
}

// The concluding frame compares three distinct legal constructions. No line
// connects the subjects as if they were parties to one transaction.
export function mountFinalWorld(container){
  let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})}catch{return null}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='world-canvas';container.append(canvas);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);
  scene.add(new THREE.AmbientLight('#e3efff',1.7));
  const key=new THREE.DirectionalLight('#fff3da',3.5);key.position.set(-4,7,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const rim=new THREE.DirectionalLight('#47e6db',1.4);rim.position.set(4,5,-4);scene.add(rim);
  const stages=[municipality(scene),institutions(scene),registration(scene)];
  stages.forEach((s,i)=>{s.root.position.x=(i-1)*4.55;s.root.scale.setScalar(i===1?.48:.58);
    Object.entries(s.object).forEach(([k,o])=>{o.visible=['building','left','right','deviceA','deviceB'].includes(k)});
  });
  const floor=mesh(new THREE.PlaneGeometry(20,10),new THREE.ShadowMaterial({opacity:.25}),scene,0,-.24,0);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;
  camera.position.set(0,4.25,16.6);camera.lookAt(0,.9,0);
  let active=true,raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){if(!active)return;let w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.render(scene,camera)}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const begin=performance.now();
  function frame(now){if(!active)return;const p=reduced?1:Math.min(1,(now-begin)/1350);stages.forEach((s,i)=>{s.root.position.y=(p-1)*1.7;s.root.rotation.y=(1-p)*(i-1)*.36});
    camera.position.z=16.6+(1-p)*3.2;camera.lookAt(0,.9,0);renderer.render(scene,camera);raf=p<1?requestAnimationFrame(frame):0}
  resize();raf=requestAnimationFrame(frame);
  return {destroy(){active=false;if(raf)cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose?.();const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>m?.dispose?.())});renderer.dispose();canvas.remove()}}
}
