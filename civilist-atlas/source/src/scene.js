import * as THREE from 'three';
import homeImage from './assets/home.webp';
import caseIImage from './assets/case-i.webp';
import caseIIImage from './assets/case-ii.webp';
import caseIIIImage from './assets/case-iii.webp';

// A stage for teaching: the camera may move, the evidence never advances itself.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const ease = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
const ink = '#183555';
const colors = [
  {cover:'#005da6',edge:'#e8d9b3',metal:'#d8b969',accent:'#006ed0'},
  {cover:'#ef5b35',edge:'#ebdbc7',metal:'#f7c990',accent:'#ef4c2b'},
  {cover:'#177d70',edge:'#ddcda6',metal:'#bed9bd',accent:'#067e89'},
];
const makeMat=(color,roughness=.68,metalness=0,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,...extra});
const solid=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m};
function roundPlate(w,h,d,r,mat){
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,curveSegments:6});
  g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m;
}
function line(points,r,mat,segments=48){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r,8,false),mat);m.castShadow=true;return m;
}
function canvasTexture(draw,w=1024,h=1024){
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function grainTexture(base,seed=1){
  let n=seed|0;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)|0;return (n>>>0)/4294967296};
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
    for(let i=0;i<22000;i++){
      const x=rng()*w,y=rng()*h,a=.008+rng()*.045;
      ctx.fillStyle=rng()>.5?`rgba(255,255,255,${a})`:`rgba(10,22,32,${a})`;
      ctx.fillRect(x,y,.5+rng()*1.2,2+rng()*13);
    }
    for(let i=0;i<600;i++){
      ctx.strokeStyle=`rgba(255,255,255,${.012+rng()*.022})`;ctx.lineWidth=.5;
      ctx.beginPath();const x=rng()*w,y=rng()*h;ctx.moveTo(x,y);ctx.lineTo(x+rng()*3,y+22+rng()*90);ctx.stroke();
    }
  });
}
function clothBump(seed=1){
  let n=seed|0;const rng=()=>{n=(Math.imul(n,1103515245)+12345)|0;return(n>>>0)/4294967296};
  return canvasTexture((g,w,h)=>{
    g.fillStyle='#777';g.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=3){g.strokeStyle=x%6?'#858585':'#606060';g.lineWidth=1;g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}
    for(let y=0;y<h;y+=5){g.strokeStyle=y%10?'#9b9b9b':'#707070';g.lineWidth=1;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
    for(let i=0;i<9000;i++){g.fillStyle=rng()>.5?'#a0a0a0':'#585858';g.fillRect(rng()*w,rng()*h,1,1)}
  },256,256);
}
function titleTexture(index){
  const titles=[['I','КТО ЯВЛЯЕТСЯ','СУБЪЕКТОМ?'],['II','КТО ОТВЕЧАЕТ','ПО ОБЯЗАТЕЛЬСТВУ?'],['III','КТО ВОЗМЕЩАЕТ','ВРЕД?']];
  const color='#fff9ed',foil=index===2?'#d3e4bb':'#edca83';
  return canvasTexture((g,w,h)=>{
    g.clearRect(0,0,w,h);g.textAlign='left';g.fillStyle=color;
    g.font='600 27px Onest, Arial';g.fillText('Ц И В И Л И С Т',85,98);
    g.fillStyle=foil;g.fillRect(85,131,w-170,2);g.fillRect(85,h-142,w-170,2);
    g.font='italic 440px Literata, Georgia';g.globalAlpha=index===2?.19:.27;g.fillText(titles[index][0],520,575);g.globalAlpha=1;
    g.font='500 69px Literata, Georgia';g.fillStyle=color;
    g.fillText(titles[index][1],85,928);g.fillText(titles[index][2],85,1002);
    g.fillStyle=foil;g.font='600 25px Onest, Arial';g.fillText('ГОСУДАРСТВО НА РАВНЫХ?',85,h-86);
    g.textAlign='right';g.fillText('ТОМ '+titles[index][0],w-85,98);
    if(index===0){
      g.strokeStyle=foil;g.lineWidth=4;g.globalAlpha=.6;
      for(let k=0;k<6;k++){g.beginPath();g.ellipse(510,368,265-k*32,155-k*19,-.28,0,TAU);g.stroke()}
      g.globalAlpha=1;
    } else if(index===1){
      g.strokeStyle=foil;g.lineWidth=3;g.globalAlpha=.5;
      for(let k=0;k<9;k++){g.beginPath();g.moveTo(102+k*95,182);g.lineTo(80+k*95,520);g.stroke()}
      g.globalAlpha=1;
    } else {
      g.strokeStyle=foil;g.lineWidth=3;
      for(let k=0;k<5;k++){g.beginPath();g.arc(545,360,115+k*31,0,TAU);g.stroke()}
      g.beginPath();g.moveTo(240,440);g.lineTo(855,277);g.stroke();
    }
  },1024,1424);
}
function textPlane(text,width,height,{size=75,color='#233c52',bg=null,weight=600,italic=false}={}){
  const texture=canvasTexture((g,w,h)=>{
    if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h)}else g.clearRect(0,0,w,h);
    g.fillStyle=color;g.font=`${italic?'italic ':''}${weight} ${size}px Onest, Arial`;
    g.textBaseline='middle';g.fillText(text,44,h/2);
  },1024,256);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:!bg,side:THREE.DoubleSide,depthWrite:false}));
  return m;
}
function volume(index){
  const group=new THREE.Group();group.userData.bookIndex=index;
  const c=colors[index],material=makeMat('#ffffff',.68,.02,{map:grainTexture(c.cover,199+index),bumpMap:clothBump(117+index),bumpScale:.032,clearcoat:.08,clearcoatRoughness:.56});
  const page=makeMat('#f7f0db',.96),foil=makeMat(c.metal,.23,.82);
  // Boards project beyond the page block; the spine is hinged, not painted on a cuboid.
  group.add(solid(2.28,3.31,.39,page,0,1.75,0));
  for(const z of [-.253,.205]){
    const board=roundPlate(2.55,3.54,.064,.07,material);board.position.set(-.09,1.76,z);group.add(board);
    const endpaper=solid(2.34,3.30,.006,makeMat(index===2?'#e2e9d9':'#d8d1b9',.95),-.04,1.76,z<0?z+.076:z-.012);group.add(endpaper);
  }
  const spine=new THREE.Mesh(new THREE.CylinderGeometry(.275,.275,3.53,32,1,false,Math.PI/2,Math.PI),material);
  spine.position.set(-1.32,1.76,-.004);spine.rotation.y=Math.PI/2;spine.castShadow=true;group.add(spine);
  for(let i=0;i<4;i++){
    const band=solid(.055,.017,.53,foil,-1.33,.31+i*.97,-.01);band.rotation.z=.03;group.add(band);
  }
  // The visible page fore edge is densely engraved, with uneven signatures.
  const dummy=new THREE.Object3D();
  const fore=new THREE.InstancedMesh(new THREE.BoxGeometry(.007,3.22,.0015),makeMat('#cdbb9b',.94),95);
  for(let i=0;i<95;i++){dummy.position.set(1.151,1.75,-.184+i*.0039);dummy.updateMatrix();fore.setMatrixAt(i,dummy.matrix)}
  fore.instanceMatrix.needsUpdate=true;fore.castShadow=false;group.add(fore);
  const top=new THREE.InstancedMesh(new THREE.BoxGeometry(2.17,.002,.0012),makeMat('#d2c3a3',.94),70);
  for(let i=0;i<70;i++){dummy.position.set(0,3.411,-.185+i*.0054);dummy.updateMatrix();top.setMatrixAt(i,dummy.matrix)}
  top.instanceMatrix.needsUpdate=true;top.castShadow=false;group.add(top);
  for(const x of [-1.15,1.00]){
    group.add(solid(.009,3.39,.009,foil,x,1.76,.281));
  }
  for(const y of [.074,3.446])group.add(solid(2.4,.008,.008,foil,-.09,y,.282));
  const front=new THREE.Mesh(new THREE.PlaneGeometry(2.38,3.31),new THREE.MeshBasicMaterial({map:titleTexture(index),transparent:true,depthWrite:false}));
  front.position.set(-.09,1.76,.289);group.add(front);
  const spineTitle=textPlane(`ЦИВИЛИСТ  /  ${['I','II','III'][index]}`,2.1,.26,{size:62,color:index===2?'#c74832':'#f8dd9e'});
  spineTitle.rotation.y=-Math.PI/2;spineTitle.rotation.z=Math.PI/2;spineTitle.position.set(-1.607,1.8,0);group.add(spineTitle);
  if(index===1){
    for(let y of [.6,1.63,2.65]){
      const raised=solid(2.39,.033,.024,foil,-.09,y,.295);group.add(raised);
    }
    group.add(solid(.10,1.01,.018,makeMat('#f1b9a6',.93),.92,-.34,.06));
  }
  if(index===2){
    for(let k=0;k<3;k++)group.add(solid(.10,.014,.55,foil,-1.34,.45+k*1.37,-.01));
    const bookmark=solid(.095,.58,.02,makeMat('#cc593f',.68),.32,-.26,-.1);group.add(bookmark);
  }
  group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh){o.castShadow=true;o.receiveShadow=true}});
  return group;
}

function folio(title,accent='#005da6',kind=0){
  const group=new THREE.Group();
  const sheet=makeMat('#faf9f2',.94),edge=makeMat('#dedbd1',.95),metal=makeMat('#a4abb0',.3,.6);
  const backing=roundPlate(1.78,2.26,.045,.018,makeMat(accent,.67,.03));backing.position.set(.04,-.035,-.065);group.add(backing);
  group.add(roundPlate(1.72,2.18,.029,.018,sheet));
  group.add(solid(1.72,.018,.045,edge,0,-1.09,.005));
  const face=canvasTexture((g,w,h)=>{
    g.fillStyle='#faf9f2';g.fillRect(0,0,w,h);
    g.fillStyle=accent;g.fillRect(65,63,10,88);
    g.font='600 30px Onest, Arial';g.fillText('ЦИВИЛИСТ / УЧЕБНОЕ ДЕЛО',99,85);
    g.font='600 52px Literata, Georgia';g.fillStyle='#21354b';
    const words=title.split(' ');let current='',rows=[];
    for(const word of words){if((current+' '+word).length>16){rows.push(current);current=word}else current+=(current?' ':'')+word}rows.push(current);
    rows.slice(0,3).forEach((row,i)=>g.fillText(row,65,230+i*68));
    g.fillStyle='#8f9ca5';g.font='400 25px Onest, Arial';
    for(let i=0;i<11;i++){g.fillRect(66,450+i*39,(i%4===0?790:690)+(i%3)*25,1)}
    g.strokeStyle=accent;g.globalAlpha=.4;g.lineWidth=4;g.beginPath();g.arc(790,825,88,0,TAU);g.stroke();g.globalAlpha=1;
    g.fillStyle=accent;g.font='600 27px Onest, Arial';g.fillText('УЧЕБНАЯ МОДЕЛЬ',65,h-70);
  },1024,1298);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(1.68,2.13),new THREE.MeshBasicMaterial({map:face,side:THREE.DoubleSide}));p.position.z=.050;group.add(p);
  if(kind%2===0){
    const clip=new THREE.Mesh(new THREE.TorusGeometry(.11,.019,8,24,Math.PI*1.75),metal);
    clip.position.set(-.48,1.07,.058);clip.rotation.z=-.32;group.add(clip);
  } else {
    const band=solid(.65,.058,.02,makeMat(accent,.5),-.4,1.12,.058);group.add(band);
  }
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return group;
}

function photoPlate(url,width=19.2,x=0,y=2.76){
  const texture=new THREE.TextureLoader().load(url);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  const plate=new THREE.Mesh(
    new THREE.PlaneGeometry(width,width*9/16),
    new THREE.MeshBasicMaterial({map:texture,toneMapped:false,depthWrite:false})
  );
  plate.position.set(x,y,-3.45);
  plate.renderOrder=-10;
  return plate;
}

function shipmentCase(){
  const g=new THREE.Group(),aluminium=makeMat('#a8adb0',.28,.72),
    black=makeMat('#242b30',.61,.09),foam=makeMat('#292d31',.96),
    equipment=makeMat('#e5e6e2',.36),glass=makeMat('#223646',.17,.17);
  // Deep equipment case, opening toward the camera, with a distinct lid and latches.
  const base=solid(2.7,.88,1.66,black,0,.52,0);g.add(base);
  for(const x of [-1.35,1.35])g.add(solid(.055,.90,1.69,aluminium,x,.52,0));
  for(const y of [.08,.97])g.add(solid(2.72,.045,1.72,aluminium,0,y,0));
  for(const z of [-.84,.84])g.add(solid(2.72,.86,.042,aluminium,0,.52,z));
  g.add(solid(2.54,.12,1.50,foam,0,.99,-.02));
  const instrument=roundPlate(1.27,.64,.47,.06,equipment);instrument.position.set(-.28,1.44,-.25);instrument.rotation.x=-.12;g.add(instrument);
  const display=solid(.40,.15,.012,glass,-.54,1.57,.025);display.rotation.x=-.12;g.add(display);
  for(let k=0;k<3;k++){
    const dial=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.04,24),aluminium);
    dial.rotation.x=Math.PI/2;dial.position.set(.06+k*.25,1.39,.04);g.add(dial);
  }
  const lid=solid(2.70,1.24,.10,black,0,1.64,-1.0);lid.rotation.x=-.30;g.add(lid);
  g.userData.lid=lid;
  g.add(solid(2.61,.04,.09,aluminium,0,2.2,-.85));
  for(const x of [-.91,.91]){
    g.add(solid(.16,.13,.055,aluminium,x,.79,.87));
    g.add(solid(.24,.03,.13,aluminium,x,.76,.94));
  }
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.31,.045,10,26,Math.PI),aluminium);
  handle.rotation.x=Math.PI/2;handle.position.set(0,.56,.96);g.add(handle);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g;
}

function deliveryCart(){
  const g=new THREE.Group(),metal=makeMat('#66777a',.31,.66),card=makeMat('#a9744c',.88),
    tape=makeMat('#d8c08d',.58),white=makeMat('#f6f3e9',.95);
  g.add(solid(2.5,.10,1.55,metal,0,.35,0));
  for(const x of [-.93,.93])for(const z of [-.60,.60]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.07,24),makeMat('#20282c',.85));
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.16,z);g.add(wheel);
  }
  for(const x of [-1.12,1.12])g.add(solid(.052,1.72,.053,metal,x,1.09,-.63));
  g.add(solid(2.31,.05,.05,metal,0,1.92,-.63));
  const box=solid(1.98,1.06,1.27,card,0,.93,.03);g.add(box);
  g.add(solid(.11,1.07,1.29,tape,0,.93,.035));
  for(const x of [-.55,.55]){
    const flap=solid(.91,.035,.58,card,x,1.49,-.30);
    flap.rotation.z=x<0?.32:-.32;g.add(flap);
  }
  const label=solid(.83,.45,.009,white,-.44,1.00,.67);g.add(label);
  for(let j=0;j<5;j++)g.add(solid(.55-j*.045,.008,.012,makeMat('#566a70',.85),-.46,1.12-j*.06,.682));
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g;
}

function registryFile(){
  const g=new THREE.Group(),tray=makeMat('#0b544b',.32,.16),paper=makeMat('#f1e9d5',.93),
    edge=makeMat('#c8bfae',.95),gold=makeMat('#bfa46d',.27,.7);
  g.add(solid(3.1,.12,1.94,tray,0,.20,0));
  for(const x of [-1.54,1.54])g.add(solid(.08,.33,1.95,tray,x,.36,0));
  g.add(solid(3.16,.34,.08,tray,0,.36,-.97));
  for(let j=0;j<13;j++)g.add(solid(2.62,.017,1.54,j%3?paper:edge,0,.36+j*.026,-.05-j*.005));
  const folder=roundPlate(2.66,1.6,.045,.035,makeMat('#f4efdf',.92));
  folder.rotation.x=-Math.PI/2;folder.position.set(0,.76,-.10);g.add(folder);
  const label=textPlane('РЕГИСТРАЦИОННОЕ ДЕЛО',2.18,.28,{size:51,color:'#214a55'});
  label.rotation.x=-Math.PI/2;label.position.set(-.09,.794,-.36);g.add(label);
  for(let i=0;i<3;i++)g.add(solid(2.84,.012,.01,gold,0,.56+i*.07,.79));
  const stamp=new THREE.Group(),pad=makeMat('#c0a16f',.24,.68);
  stamp.add(solid(.53,.095,.43,pad,0,.04,0));
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.30,18),pad);neck.position.y=.22;stamp.add(neck);
  const grip=new THREE.Mesh(new THREE.SphereGeometry(.12,18,12),makeMat('#654331',.36));grip.position.y=.42;stamp.add(grip);
  stamp.position.set(-1.92,.34,-.25);g.add(stamp);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g;
}

function windowOpening(x,y,front,colorset={}){
  const g=new THREE.Group();g.position.set(x,y,front);
  const stone=makeMat(colorset.stone??'#d9d4c8',.85),glass=makeMat('#446479',.14,.14,{transparent:true,opacity:.93}),timber=makeMat('#233c4a',.44),metal=makeMat('#b0a298',.38,.4);
  g.add(solid(1.35,2.05,.18,stone,0,0,.04));
  g.add(solid(1.10,1.81,.06,timber,0,0,.16));
  g.add(solid(1.03,1.73,.014,glass,0,0,.198));
  for(const vx of [-.52,0,.52])g.add(solid(.035,1.82,.07,metal,vx,0,.23));
  for(const vy of [-.38,.49])g.add(solid(1.08,.035,.07,metal,0,vy,.23));
  g.add(solid(1.53,.13,.31,stone,0,1.08,.19));g.add(solid(1.56,.12,.4,stone,0,-1.08,.22));
  const arch=new THREE.Mesh(new THREE.TorusGeometry(.60,.065,9,28,Math.PI),stone);
  arch.position.set(0,.84,.22);arch.castShadow=true;g.add(arch);
  g.add(solid(.16,.19,.32,stone,0,1.42,.22));
  const glint=solid(.22,1.61,.006,makeMat('#bfd5e2',.22,0,{transparent:true,opacity:.16}),-.26,0,.24);glint.rotation.z=.18;g.add(glint);
  return g;
}
function facade(){
  const g=new THREE.Group(),stone=makeMat('#c8bbac',.87),brick=makeMat('#a9574a',.91),mortar=makeMat('#dfcbb7',.97),metal=makeMat('#344a50',.32,.5);
  const masonry=canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#d6b7a2';ctx.fillRect(0,0,w,h);
    for(let row=0;row<47;row++){
      const bh=23,off=row%2?20:0;
      for(let col=-1;col<25;col++){
        let v=(row*37+col*17)%11;
        ctx.fillStyle=['#aa6254','#a95b4f','#b06959','#9f564a','#ae6352'][Math.abs(v)%5];
        const x=col*44+off+2,y=row*bh+2;
        ctx.fillRect(x,y,40,19);ctx.fillStyle='rgba(32,22,18,.06)';ctx.fillRect(x+1,y+1,38,2);
      }
    }
  });
  brick.map=masonry;brick.bumpMap=masonry;brick.bumpScale=.045;brick.needsUpdate=true;
  g.add(solid(9.9,5.9,.56,brick,0,2.87,-.46));
  for(const x of [-4.82,4.82])g.add(solid(.28,6,.87,stone,x,2.88,-.1));
  g.add(solid(10.3,.25,.96,stone,0,5.63,-.15));
  g.add(solid(10.2,.17,.82,stone,0,5.34,-.12));
  g.add(solid(10.12,.14,.76,stone,0,.13,-.08));
  g.add(solid(10,.13,.76,stone,0,2.78,-.07));
  for(const x of [-3.55,-1.22,1.22,3.55]){
    g.add(windowOpening(x,4.10,-.03));
    if(Math.abs(x)>1.4)g.add(windowOpening(x,1.47,-.03));
  }
  // Central entry has a real recess and layered timber leaves.
  const door=makeMat('#2e514d',.44),brass=makeMat('#c3a563',.28,.65);
  g.add(solid(2.15,2.42,.19,stone,0,1.30,.04));
  g.add(solid(1.82,2.24,.08,makeMat('#1c363d',.7),0,1.28,.18));
  for(const x of [-.45,.45]){
    g.add(solid(.86,2.11,.08,door,x,1.28,.25));
    g.add(solid(.63,1.15,.014,makeMat('#365d58',.55),x,1.63,.30));
    g.add(solid(.035,.29,.045,brass,x>0?.13:-.13,1.13,.32));
  }
  for(const x of [-2.32,2.32])g.add(solid(.32,5.25,.75,stone,x,2.88,.02));
  for(let i=0;i<3;i++)g.add(solid(2.75+i*.41,.13,.54,stone,0,.06+i*.12,.88+i*.40));
  const pipeMat=makeMat('#8b9a9a',.37,.5);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,5.4,16),pipeMat);pipe.position.set(4.51,2.88,.29);pipe.castShadow=true;g.add(pipe);
  for(const y of [.65,2.1,3.55,4.95])g.add(solid(.17,.08,.14,pipeMat,4.51,y,.28));
  const plaque=solid(.98,.38,.045,metal,1.78,2.24,.35);g.add(plaque);
  const plaqueText=textPlane('КОМИТЕТ',.91,.28,{size:67,color:'#f7dfaa'});plaqueText.position.set(1.78,2.24,.381);g.add(plaqueText);
  g.userData.anchors={building:new THREE.Vector3(0,2.5,.6),committee:new THREE.Vector3(1.8,2.24,.4),title:new THREE.Vector3(-2.9,3.1,.7)};
  return g;
}

function monitor(){
  const g=new THREE.Group(),shell=makeMat('#27343c',.44),glass=makeMat('#162c39',.18,.16),metal=makeMat('#838d94',.4,.4);
  const screen=roundPlate(1.65,1.05,.10,.046,shell);screen.position.set(0,.84,0);g.add(screen);
  const display=solid(1.49,.86,.008,glass,0,.85,.11);g.add(display);
  const sheen=solid(.34,.75,.004,makeMat('#8cb0c1',.15,0,{transparent:true,opacity:.11}),-.28,.86,.116);sheen.rotation.z=.15;g.add(sheen);
  g.add(solid(.09,.38,.18,metal,0,.19,-.04));g.add(solid(.75,.043,.37,shell,0,.04,-.015));
  g.add(solid(.055,.025,.011,makeMat('#50c2b1',.5),.69,.35,.11));
  return g;
}
function workstation(type=0){
  const g=new THREE.Group(),desktop=makeMat(type?'#d6e0dc':'#d4cbbd',.61),frame=makeMat('#5a6871',.37,.48),inkMat=makeMat('#293c47',.45),keys=makeMat('#f2f1e8',.54);
  g.add(solid(3.0,.09,2.18,desktop,0,1.18,0));
  for(const x of [-1.39,1.39])for(const z of [-.95,.95])g.add(solid(.06,1.17,.06,frame,x,.59,z));
  const unit=monitor();unit.position.set(-.39,1.24,-.52);unit.rotation.y=-.15;g.add(unit);
  if(type){
    const server=solid(.8,.86,.76,inkMat,.85,1.68,-.42);g.add(server);
    for(let k=0;k<7;k++)g.add(solid(.48,.019,.018,frame,.85,1.37+k*.105,-.03));
    for(let k=0;k<3;k++){
      const d=new THREE.Mesh(new THREE.SphereGeometry(.021,12,8),makeMat(k===0?'#4ae5b8':'#e9b890',.25));d.position.set(.54+k*.12,2.01,-.028);g.add(d);
    }
  } else {
    const keyboard=solid(.96,.055,.31,inkMat,-.22,1.26,.58);g.add(keyboard);
    for(let row=0;row<4;row++)for(let col=0;col<13;col++)g.add(solid(.055,.012,.045,keys,-.65+col*.07,1.294,.47+row*.068));
    g.add(solid(.26,.065,.43,inkMat,.91,1.27,.59));
  }
  const drawer=solid(.62,.42,.58,desktop,type?-.87:.81,.91,-.47);g.add(drawer);
  const handle=solid(.18,.023,.025,frame,type?-.87:.81,.91,-.15);g.add(handle);
  return g;
}
function officeScene(){
  const g=new THREE.Group();
  g.add(photoPlate(caseIIImage));
  const cart=deliveryCart();cart.scale.setScalar(.82);cart.position.set(-2.59,.02,1.12);cart.rotation.y=-.14;g.add(cart);
  const casework=shipmentCase();casework.scale.setScalar(.72);casework.position.set(2.90,.15,1.03);casework.rotation.y=.19;g.add(casework);
  g.userData.subjects={cart,casework};
  g.userData.anchors={left:new THREE.Vector3(-2.5,1.3,1.7),right:new THREE.Vector3(2.5,1.45,1.8),boundary:new THREE.Vector3(0,2.3,.4)};
  return g;
}
function registryScene(){
  const g=new THREE.Group();
  g.add(photoPlate(caseIIIImage,33,6.4,3.15));
  // The file is geometrically independent of the photographed intake counter.
  const file=registryFile();file.position.set(2.52,.49,1.38);file.rotation.y=-.13;g.add(file);
  g.userData.subjects={file};
  g.userData.anchors={contract:new THREE.Vector3(-1.9,1.58,1.3),register:new THREE.Vector3(2.15,1.48,1.85),treasury:new THREE.Vector3(3.5,2.4,-.2)};
  return g;
}

const documentSpecs=[
  [['ДОГОВОР ОТЧУЖДЕНИЯ','#005da6'],['ВЫПИСКА ЕГРН','#0077ae'],['СВЕДЕНИЯ ЕГРЮЛ','#64799a'],['ПОЛОЖЕНИЕ О КОМИТЕТЕ','#e9783c']],
  [['ГОСУДАРСТВЕННЫЙ КОНТРАКТ А','#005da6'],['ДОГОВОР ПОСТАВКИ Б','#ee5d37'],['ИМУЩЕСТВЕННОЕ ДОСЬЕ','#5c7e93']],
  [['ДОГОВОР И ЗАЯВЛЕНИЕ','#cf6c43'],['ХРОНОЛОГИЯ РЕЕСТРА','#198893'],['РЕГИСТРАЦИОННОЕ ДЕЛО','#dc7544'],['РЕШЕНИЕ СУДА','#174e86'],['ДОСЬЕ АРЕНДЫ','#8d70a3'],['ПРОГНОЗ ТОРГОВОГО ОБЪЕКТА','#b98a36'],['ВОЗРАЖЕНИЕ','#ae543d']]
];
const documentIndex=[[-1,0,1,2,3,-1,-1],[-1,0,1,-1,2,-1],[-1,0,1,2,3,4,5,6,-1]];
function glyphAt(point,color,shape='ring'){
  const g=new THREE.Group();g.position.set(...point);const mat=makeMat(color,.27,.44);
  if(shape==='ring'){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.012,8,36),mat);g.add(ring);
  }else if(shape==='square'){
    for(const [x,y,w,h] of [[0,.10,.20,.017],[0,-.10,.20,.017],[-.10,0,.017,.20],[.10,0,.017,.20]])g.add(solid(w,h,.018,mat,x,y,0));
  }else{
    const mark=new THREE.Mesh(new THREE.OctahedronGeometry(.105,0),mat);mark.scale.z=.15;g.add(mark);
  }
  return g;
}
function relation(points,color,kind='ownership'){
  const g=new THREE.Group(),mat=makeMat(color,.26,kind==='authority'?.25:.1,{transparent:true,opacity:.90});
  if(kind==='ownership'){
    g.add(line(points,.018,mat));
    const inner=line(points.map(([x,y,z])=>[x,y-.05,z]),.006,makeMat('#f7f4d5',.3));g.add(inner);
  } else if(kind==='authority'){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    for(let i=0;i<17;i++){
      const a=curve.getPoint(i/18),b=curve.getPoint((i+.72)/18);
      g.add(line([a.toArray(),b.toArray()],.013,mat,5));
    }
  } else if(kind==='obligation'){
    g.add(line(points,.027,mat));
    g.add(line(points.map(([x,y,z])=>[x,y+.07,z]),.006,mat));
  } else if(kind==='boundary'){
    g.add(line(points,.012,mat));
    for(const p of points)g.add(glyphAt(p,color,'square'));
  } else {
    g.add(line(points,.035,mat));
    for(let i=0;i<4;i++){
      const p=points[Math.floor(i*(points.length-1)/3)];g.add(glyphAt(p,color,'diamond'));
    }
  }
  g.add(glyphAt(points[0],color,kind==='authority'?'square':'ring'));
  g.add(glyphAt(points.at(-1),color,kind==='obligation'?'square':'ring'));
  g.userData.relation=true;return g;
}

function setupStage(container,onModeChange){
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(34,1,.05,150);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.84;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='civilist-webgl';
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';container.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#e9f6ff','#8eaaa9',.88));
  const key=new THREE.DirectionalLight('#fff4e8',1.75);key.position.set(-5,10,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
  key.shadow.bias=-.0002;key.shadow.normalBias=.022;scene.add(key);
  const fill=new THREE.DirectionalLight('#83b9ec',.60);fill.position.set(5,4,-3);scene.add(fill);
  const rim=new THREE.PointLight('#f38c6b',.35,19);rim.position.set(4,6,4);scene.add(rim);
  const floor=solid(30,.02,30,makeMat('#f8fbfd',.97),0,-.015,0);floor.receiveShadow=true;floor.castShadow=false;scene.add(floor);
  const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.24}));
  shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=.005;shadowFloor.receiveShadow=true;shadowFloor.visible=false;scene.add(shadowFloor);
  const resize=()=>{const r=container.getBoundingClientRect();if(r.width<2||r.height<2)return;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.7,2400/r.width));renderer.setSize(r.width,r.height,false)};
  const ro=new ResizeObserver(resize);ro.observe(container);resize();
  const lost=e=>{e.preventDefault();onModeChange?.('fallback')};
  renderer.domElement.addEventListener('webglcontextlost',lost);
  return {scene,camera,renderer,key,fill,rim,floor,shadowFloor,resize,dispose(){ro.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}};
}

function cameraRoute(view,caseIndex,step,reading){
  if(view==='home')return [
    [[.15,4.72,9.6],[0,1.7,0]], [[-1.12,5.10,8.85],[-1.5,1.82,0]],
    [[1.10,4.35,8.75],[.9,1.68,0]], [[1.65,5.44,9.6],[1.0,1.48,0]],
    [[.15,4.72,9.6],[0,1.7,0]]
  ];
  const i=caseIndex,s=step,focus=reading?1:0;
  if(view==='final')return [
    [[.2,5.0,15],[0,2.25,0]], [[-1.4,4.5,13.8],[-2,2.1,0]],
    [[1.4,3.7,13.4],[2,2.1,0]], [[.2,5.2,15],[0,2.25,0]],[[.2,5.0,15],[0,2.25,0]]
  ];
  if(i===0){
    const near=[0,1,2,3,4,5,6].map((_,k)=>[k===0?2.65:k===4?3.45:k===2?1.7:2.9,4.5+(k%2)*.30,k===0?12.2:10.8]);
    const x=near[s][0];
    return [
      [[x+focus*1.4,near[s][1],near[s][2]+focus*1.7],[x-2.0,2.5,.1]],
      [[x-.7+focus*1.4,3.55,9.7+focus*1.7],[x-1.9,2.1,.3]],
      [[x+.62+focus*1.4,4.95,10.1+focus*1.7],[x-1.6,3.1,-.1]],
      [[x+1.0+focus*1.4,4.05,11.1+focus*1.7],[x-1.8,2.5,.2]],
      [[x+focus*1.4,near[s][1],near[s][2]+focus*1.7],[x-2.0,2.5,.1]]
    ];
  }
  if(i===1){
    const x=[0,-2.0,2.0,0,1.0,0][s];
    return [
      [[x+focus*1.7,3.9,12.9+focus*1.6],[x,1.65,0]],
      [[x-.75+focus*1.7,3.16,10.8+focus*1.6],[x-.3,1.7,.3]],
      [[x+.65+focus*1.7,4.1,10.6+focus*1.6],[x,2.1,0]],
      [[x+1.25+focus*1.7,3.55,11.9+focus*1.6],[x+.25,1.6,.2]],
      [[x+focus*1.7,3.9,12.9+focus*1.6],[x,1.65,0]]
    ];
  }
  const x=[0,-2.1,-.1,.8,1.4,-1.6,1.0,2.2,.2][s];
  return [
    [[x+focus*1.65,3.55,12.1+focus*1.8],[x,2.05,.1]],
    [[x-.9+focus*1.65,2.7,10.2+focus*1.8],[x-.35,1.5,.45]],
    [[x+.8+focus*1.65,4.2,10.5+focus*1.8],[x+.1,2.7,-.15]],
    [[x+1.1+focus*1.65,3.2,11.3+focus*1.8],[x,1.95,.2]],
    [[x+focus*1.65,3.55,12.1+focus*1.8],[x,2.05,.1]]
  ];
}

function createFallback(container,{onSelectBook,onDocument}){
  if(!document.getElementById('civilist-fallback-style')){
    const s=document.createElement('style');s.id='civilist-fallback-style';s.textContent=`
      .cv-fallback{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:#143a59;font-family:Onest,Arial,sans-serif}
      .cv-fallback *{box-sizing:border-box}.cv-fallback button{font:inherit}
      .cv-fallback-photo{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2}
      .cv-fallback-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--cv-focus,50%) center;animation:cv-pan var(--cv-duration,31s) ease-in-out infinite alternate}
      .cv-fallback-photo.route-b img{animation-name:cv-pan-b}.cv-fallback-photo.route-c img{animation-name:cv-pan-c}.cv-fallback-photo.route-d img{animation-name:cv-pan-d}
      .cv-fallback-photo.home img{object-fit:contain;object-position:55% 50%;animation:cv-home-roving 36s ease-in-out infinite alternate}
      @keyframes cv-home-roving{0%{transform:translateX(-.4%) scale(.985)}35%{transform:translateX(.7%) scale(.995)}68%{transform:translateX(-.6%) scale(.99)}100%{transform:translateX(.3%) scale(.985)}}
      .cv-fallback-photo.home img{pointer-events:auto;cursor:pointer}
      .cv-fallback-photo .cv-photo-link{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;filter:drop-shadow(0 3px 2px #ffffffba);clip-path:inset(0 0 0 51%)}
      .cv-fallback-photo.cv-outgoing{pointer-events:none;z-index:1;animation:cv-photo-exit .85s ease-out both}
      .cv-fallback-photo.cv-outgoing img{pointer-events:none}
      .cv-fallback-photo:not(.cv-outgoing){animation:cv-photo-enter .85s ease-out both}
      .cv-fallback-photo:not(.cv-outgoing) img{animation-duration:var(--cv-duration,31s)}
      .cv-detail,.cv-evidence-note,.cv-fallback-document{z-index:3}
      @keyframes cv-photo-enter{0%{opacity:.45}100%{opacity:1}}
      @keyframes cv-photo-exit{0%{opacity:1}100%{opacity:0}}
      .case-view[data-placement=right] .cv-photo-link{clip-path:inset(0 51% 0 0)}
      .case-view[data-placement=bottom] .cv-photo-link{clip-path:inset(46% 0 0 0)}
      .case-view[data-placement=right] .cv-detail{right:auto;left:5%}
      .case-view[data-placement=right] .cv-evidence-note{right:auto;left:6%}
      .case-view[data-placement=right] .cv-fallback-document{right:auto;left:7%}
      .cv-fallback.is-reading .cv-fallback-photo img{transform:translateX(var(--cv-read-shift,-22%)) scale(1.1);animation-name:cv-reading-pan}
      .cv-fallback.is-reading .cv-fallback-photo.home img{animation-name:cv-pan-b}
      .cv-fallback.is-reading .cv-fallback-document{left:14%;right:auto;bottom:13%;width:min(23vw,330px);height:min(32vw,420px);transform:rotate(-3deg)}
      .cv-detail{position:absolute;right:6%;top:15%;width:min(20vw,290px);height:min(18vw,240px);min-width:170px;min-height:130px;box-shadow:14px 17px 25px #163b5260;border:8px solid #fff;outline:1px solid #ffffffb8;pointer-events:none;animation:cv-detail-route var(--cv-detail-duration,43s) ease-in-out infinite alternate}
      .cv-detail-photo{width:100%;height:100%;background-image:var(--cv-image);background-size:var(--cv-zoom,240%) auto;background-position:var(--cv-detail-x,60%) var(--cv-detail-y,60%)}
      .cv-detail small{position:absolute;left:-8px;bottom:-29px;background:#fff;padding:5px 9px;color:#184668;font:500 10px PlexMono,monospace;white-space:nowrap}
      .cv-evidence-note{position:absolute;right:7%;bottom:7%;max-width:min(27vw,390px);background:#fffef9f0;border-top:5px solid var(--cv-accent,#005aa5);padding:15px 20px;box-shadow:12px 19px 28px #173b4f29;color:#18374a;animation:cv-note-route var(--cv-detail-duration,43s) ease-in-out infinite alternate}
      .cv-evidence-note.has-document{display:none}
      .cv-evidence-note span{display:block;font:500 10px PlexMono,monospace;color:var(--cv-accent,#005aa5);letter-spacing:.12em;margin-bottom:9px}
      .cv-evidence-note b{font:600 clamp(18px,1.5vw,27px)/1.1 Literata,Georgia,serif;letter-spacing:-.025em}
      .cv-fallback.is-reading .cv-detail{right:auto;left:2%;top:8%;width:min(19vw,260px);height:min(15vw,200px)}
      .cv-fallback.is-reading .cv-evidence-note{display:none}
      @keyframes cv-detail-route{0%,7%{transform:translate(10px,17px) rotate(2deg);opacity:.76}24%,42%{transform:translate(0,0) rotate(-1deg);opacity:1}57%,72%{transform:translate(-9px,5px) rotate(-2deg);opacity:.93}100%{transform:translate(5px,-5px) rotate(1deg);opacity:.82}}
      @keyframes cv-note-route{0%,10%{transform:translateY(10px);opacity:.84}28%,54%{transform:translateY(0);opacity:1}76%{transform:translateY(-5px);opacity:.95}100%{transform:translateY(3px);opacity:.9}}
      @keyframes cv-reading-pan{0%{transform:translateX(var(--cv-read-shift,-22%)) scale(1.09)}45%{transform:translateX(calc(var(--cv-read-shift,-22%) - 2%)) translateY(-1.5%) scale(1.14)}100%{transform:translateX(calc(var(--cv-read-shift,-22%) + 1.5%)) translateY(1%) scale(1.1)}}
      .cv-fallback-home{position:absolute;inset:5% 5% 4% 17%;display:flex;align-items:center;justify-content:center;gap:min(3vw,55px);perspective:1100px}
      .cv-fallback-book{position:relative;pointer-events:auto;border:0;text-align:left;width:min(19vw,290px);height:min(34vw,440px);min-height:240px;padding:0;color:#fff;cursor:pointer;box-shadow:22px 24px 36px #17415b32,6px 7px 0 #dfd8c7;transform:rotateY(-15deg) rotateZ(-4deg);transition:transform .45s,box-shadow .45s;animation:cv-book-1 24s ease-in-out infinite alternate}
      .cv-fallback-book:nth-child(2){transform:translateY(-1vw) rotateY(10deg) rotateZ(3deg)}
      .cv-fallback-book:nth-child(2){animation-name:cv-book-2;animation-duration:29s}.cv-fallback-book:nth-child(3){transform:rotateY(-18deg) rotateZ(-2deg);animation-name:cv-book-3;animation-duration:33s}
      .cv-fallback-book:hover,.cv-fallback-book:focus{animation:none;transform:translateY(-22px) rotateY(2deg);box-shadow:26px 35px 50px #17415b36,6px 7px 0 #dfd8c7;outline:2px solid #005aa5}
      .cv-fallback-book:before{content:'';position:absolute;left:-21px;top:0;bottom:0;width:22px;background:linear-gradient(90deg,#253c5c88,transparent),var(--cv-color);transform:skewY(-17deg);transform-origin:right}
      .cv-fallback-book:after{content:'';position:absolute;right:-11px;top:8px;bottom:-8px;width:11px;background:repeating-linear-gradient(90deg,#e8dcc0 0 1px,#f8edd7 1px 2px);transform:skewY(33deg)}
      .cv-fallback-cover{height:100%;padding:13% 9%;display:flex;flex-direction:column;justify-content:space-between;background:var(--cv-color);border:2px solid #f8ecd34b;outline:1px solid #ffffff70;outline-offset:-15px}
      .cv-fallback-cover small{font-size:clamp(9px,.85vw,14px);letter-spacing:.17em;font-weight:700}.cv-fallback-cover b{font-family:Literata,Georgia,serif;font-size:clamp(19px,2.05vw,37px);line-height:1.13;font-weight:500}.cv-fallback-cover i{font-family:Literata,Georgia,serif;font-size:clamp(86px,10vw,175px);font-weight:400;font-style:italic;line-height:1;opacity:.3}
      .cv-fallback-visual{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;overflow:hidden}.cv-fallback-visual svg{width:72%;height:98%;filter:drop-shadow(22px 28px 25px #1d4b6c22);transform-origin:center;animation:cv-pan var(--cv-duration,31s) ease-in-out infinite alternate}
      .cv-fallback-visual.route-b svg{animation-name:cv-pan-b}.cv-fallback-visual.route-c svg{animation-name:cv-pan-c}.cv-fallback-visual.route-d svg{animation-name:cv-pan-d}
      .cv-fallback-visual .cv-relation{stroke-dasharray:16 9;animation:cv-flow 9s linear infinite}.cv-fallback-visual .cv-relation-solid{animation:cv-relight 7s ease-in-out infinite alternate}
      .cv-fallback-visual.is-still svg{animation:none}.cv-fallback-document{position:absolute;right:8%;bottom:8%;padding:20px 26px;border:1px solid #9aaab1;color:#163853;background:#fffdf6;box-shadow:0 2px 0 #dfd8c9,10px 18px 26px #143c5861;transform:rotate(-4deg);pointer-events:auto;cursor:pointer;text-align:left;width:min(19vw,275px);height:min(26vw,345px);font-size:clamp(11px,1vw,15px);font-weight:750;line-height:1.2;display:flex;flex-direction:column;gap:15px}
      .cv-fallback-document:before{content:'';display:block;width:100%;height:5px;background:#005aa5;box-shadow:0 4px 0 #c8d7d5}
      .cv-fallback-document span{color:#315e76;font-size:11px;letter-spacing:.12em}.cv-fallback-document:after{content:'';display:block;height:45%;background:repeating-linear-gradient(#718994 0 1px,transparent 1px 22px);opacity:.8}
      @keyframes cv-pan{0%{transform:translateX(1.5%) scale(1.01)}25%{transform:translateX(-2.5%) scale(1.07)}60%{transform:translateX(-.5%) translateY(1.5%) scale(1.04)}100%{transform:translateX(2%) translateY(-1%) scale(1.09)}}
      @keyframes cv-pan-b{0%{transform:translateX(-1%) scale(1.02)}30%{transform:translateX(2.5%) translateY(-2%) scale(1.12)}65%{transform:translateX(-2%) translateY(1%) scale(1.07)}100%{transform:translateX(1%) scale(1.02)}}
      @keyframes cv-pan-c{0%{transform:translateX(1.7%) translateY(1%) scale(1.07)}40%{transform:translateX(-1.8%) translateY(-1.5%) scale(1.11)}72%{transform:translateX(2%) scale(1.04)}100%{transform:translateX(-1.5%) translateY(.6%) scale(1.08)}}
      @keyframes cv-pan-d{0%{transform:translateX(-2%) scale(1.1)}34%{transform:translateX(1.5%) translateY(1%) scale(1.04)}78%{transform:translateX(-1%) translateY(-1.4%) scale(1.13)}100%{transform:translateX(2%) scale(1.06)}}
      @keyframes cv-book-1{0%{transform:rotateY(-15deg) rotateZ(-4deg)}50%{transform:translateY(-9px) rotateY(-4deg) rotateZ(-1deg)}100%{transform:translateY(4px) rotateY(-17deg) rotateZ(-5deg)}}
      @keyframes cv-book-2{0%{transform:translateY(-1vw) rotateY(10deg) rotateZ(3deg)}55%{transform:translateY(5px) rotateY(-8deg) rotateZ(1deg)}100%{transform:translateY(-11px) rotateY(14deg) rotateZ(4deg)}}
      @keyframes cv-book-3{0%{transform:rotateY(-18deg) rotateZ(-2deg)}50%{transform:translateY(-12px) rotateY(7deg) rotateZ(2deg)}100%{transform:translateY(4px) rotateY(-14deg) rotateZ(-3deg)}}
      @keyframes cv-flow{to{stroke-dashoffset:-250}}@keyframes cv-relight{to{opacity:.45}}
      .cv-fallback.is-still *{animation-play-state:paused!important}
      @media(max-width:800px){.cv-fallback-home{inset:18% 3% 12%;gap:12px}.cv-fallback-book{width:29vw;height:51vw;min-height:0}.cv-fallback-cover{padding:12% 8%}.cv-fallback-cover b{font-size:clamp(12px,3vw,20px)}.cv-fallback-cover i{font-size:15vw}.cv-fallback-visual svg{width:100%;height:82%;opacity:.63}.cv-fallback-document{right:4%;bottom:13%;width:34vw;height:36vw;min-height:130px;padding:11px}.cv-fallback.is-reading .cv-fallback-document{left:3%;bottom:14%;width:35vw;height:40vw;min-height:120px;padding:12px}}
    `;document.head.append(s);
  }
  const el=document.createElement('div');el.className='cv-fallback';container.append(el);
  const windowSvg=(x,y)=>`<g transform="translate(${x} ${y})"><rect x="0" y="0" width="113" height="180" fill="#e9dcc7"/><rect x="13" y="13" width="87" height="151" fill="#315868"/><path d="M56 13V164 M13 76H100" stroke="#bdc3b7" stroke-width="7"/><path d="M22 21l22 130" stroke="#87b8c8" stroke-width="4" opacity=".45"/><rect y="168" x="-9" width="131" height="13" fill="#d5c9b6"/></g>`;
  const building=`<svg viewBox="0 0 1000 680" aria-hidden="true"><defs><pattern id="cvBrick" width="68" height="39" patternUnits="userSpaceOnUse"><rect width="68" height="39" fill="#d6baa7"/><rect x="2" y="2" width="62" height="34" fill="#b46c5b"/><path d="M0 38H68" stroke="#ecdfd1" stroke-width="2"/></pattern></defs><path d="M55 82h890v547H55z" fill="url(#cvBrick)"/><path d="M20 74h925v29H20zM35 361h910v22H35zM22 619h928v28H22z" fill="#ded6c9"/>${[145,365,600,805].map(x=>windowSvg(x,133)).join('')}${[145,365,805].map(x=>windowSvg(x,409)).join('')}<rect x="572" y="413" width="166" height="204" fill="#2c5053"/><path d="M655 413v204" stroke="#c8ad7e" stroke-width="7"/><rect x="730" y="406" width="155" height="38" fill="#263e51"/><text x="747" y="432" fill="#e9d7ae" font-size="19">КОМИТЕТ</text></svg>`;
  const desk=(x,color)=>`<g transform="translate(${x} 0)"><rect x="10" y="301" width="390" height="25" fill="${color}"/><path d="M34 324v210M373 324v210" stroke="#536d78" stroke-width="14"/><rect x="87" y="112" width="255" height="166" rx="9" fill="#253e4b"/><rect x="101" y="126" width="227" height="135" fill="#476b77"/><path d="M199 278v23" stroke="#748c91" stroke-width="14"/><path d="M157 303h104" stroke="#748c91" stroke-width="9"/><path d="M108 334h176l25 34H130z" fill="#d1d9d2"/><path d="M119 345h177" stroke="#7a9195" stroke-width="2"/></g>`;
  const office=`<svg viewBox="0 0 1000 680" aria-hidden="true"><path d="M0 0h1000v680H0z" fill="#e8f3f4"/><path d="M0 500h1000v180H0z" fill="#f5f7f4"/><path d="M500 60v521" stroke="#819ea8" stroke-width="11"/><path d="M508 70h12v430h-12z" fill="#b9d4db" opacity=".5"/>${desk(18,'#2c76a9')}${desk(580,'#e87551')}<path d="M50 595h360M585 595h360" stroke="#56717f" stroke-width="5"/></svg>`;
  const registry=`<svg viewBox="0 0 1000 680" aria-hidden="true"><path d="M0 0h1000v680H0z" fill="#e5f1f1"/><rect x="90" y="85" width="815" height="392" fill="#b9d8df" opacity=".48"/><path d="M96 86v392M500 86v392M902 86v392M92 83h815" stroke="#638a94" stroke-width="12"/><path d="M62 419h876v150H62z" fill="#e8ece9"/><path d="M40 411h920v29H40z" fill="#c09164"/><path d="M79 560h835v40H79z" fill="#d7dedc"/><rect x="735" y="128" width="140" height="267" fill="#364f5b"/>${[0,1,2,3,4].map(i=>`<path d="M747 ${145+i*44}h116v34H747z" fill="#54707b"/><path d="M790 ${164+i*44}h30" stroke="#e3c593" stroke-width="4"/>`).join('')}<text x="290" y="59" fill="#0b687a" font-size="32" font-family="Arial">ГОСУДАРСТВЕННАЯ РЕГИСТРАЦИЯ</text></svg>`;
  const labels=[['ДОГОВОР','ЕГРН','ЕГРЮЛ','ПОЛНОМОЧИЕ'],['КОНТРАКТ А','ДОГОВОР Б','ИМУЩЕСТВО'],['ДОГОВОР И ЗАЯВЛЕНИЕ','ХРОНОЛОГИЯ','РЕГИСТРАЦИОННОЕ ДЕЛО','РЕШЕНИЕ СУДА','АРЕНДА','ПРОГНОЗ','ВОЗРАЖЕНИЕ']];
  const poly=(x,y,p)=>{
    let inside=false;for(let a=0,b=p.length-1;a<p.length;b=a++){
      const [ax,ay]=p[a],[bx,by]=p[b];if(((ay>y)!==(by>y))&&(x<(bx-ax)*(y-ay)/(by-ay)+ax))inside=!inside;
    }return inside;
  };
  function picturedBook(e,img){
    const r=img.getBoundingClientRect(),scale=Math.min(r.width/1672,r.height/939),w=1672*scale,h=939*scale;
    const x=(e.clientX-r.left-(r.width-w)*.55)/w,y=(e.clientY-r.top-(r.height-h)*.5)/h;
    if(poly(x,y,[[.43,.61],[.55,.56],[.91,.73],[.89,.93],[.51,.98],[.42,.82]]))return 2;
    if(poly(x,y,[[.57,.06],[.91,0],[1,.72],[.65,.78],[.58,.58]]))return 1;
    if(poly(x,y,[[.35,.16],[.53,0],[.59,.02],[.59,.75],[.38,.84],[.34,.7]]))return 0;
    return -1;
  }
  const caseImages=[caseIImage,caseIIImage,caseIIIImage];
  const focalPoints=[[56,63,73,82,61,72,55],[34,73,54,49,70,52],[56,65,75,72,69,57,72,80,67]];
  const accents=[
    [
      ['НЕЖИЛОЕ ЗДАНИЕ','ОБЪЕКТ СПОРА',55,47],['ПОДПИСЬ ПРЕДСЕДАТЕЛЯ','ДОГОВОР',74,82],
      ['МУНИЦИПАЛЬНОЕ ОБРАЗОВАНИЕ','ЕГРН',68,43],['КОМИТЕТ КАК ЮРЛИЦО','ЕГРЮЛ',85,23],
      ['ДЕЙСТВУЕТ ОТ ИМЕНИ ГОРОДА','ПОЛОЖЕНИЕ',55,55],['СОБСТВЕННИК / ПОДПИСАНТ','СОПОСТАВЛЕНИЕ',61,78],
      ['ОБЯЗАННОСТЬ ПЕРЕДАТЬ ЗДАНИЕ','ПРАВОВОЙ ВЫВОД',57,52]
    ],[
      ['ДВЕ ПРИНЯТЫЕ ПОСТАВКИ','СОПОСТАВЛЕНИЕ',52,51],['ФКУ · КОНТРАКТ А','КАЗЕННОЕ УЧРЕЖДЕНИЕ',24,72],
      ['ФБУ · ДОГОВОР Б','БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ',74,43],['ДВА ТРЕБОВАНИЯ','ПОСТАВЩИКИ',45,75],
      ['ЛИМИТЫ И ДОСТУПНОЕ ИМУЩЕСТВО','ИМУЩЕСТВЕННОЕ ДОСЬЕ',76,59],['РАЗНЫЕ ПРЕДЕЛЫ ОТВЕТСТВЕННОСТИ','ПРАВОВОЙ ВЫВОД',51,48]
    ],[
      ['ЧАСТНАЯ СДЕЛКА','ДОГОВОР',71,69],['ЗАЯВЛЕНИЕ ЧЕРЕЗ МФЦ','РЕГИСТРАЦИЯ',38,37],
      ['АКТ О СНЯТИИ ЗАПРЕТА','ХРОНОЛОГИЯ',48,54],['ПРИОСТАНОВЛЕНИЕ → ОТКАЗ','РЕШЕНИЕ ОРГАНА',72,63],
      ['НЕЗАКОННОСТЬ УСТАНОВЛЕНА','УЧЕБНЫЙ СУДЕБНЫЙ АКТ',71,69],['480 000 РУБ.','АРЕНДА',54,73],
      ['ВЫРУЧКА НЕ РАВНА ПРИБЫЛИ','ПРОГНОЗ',69,72],['ИСТОЧНИК ОБЯЗАТЕЛЬСТВА','ВОЗРАЖЕНИЕ',77,65],
      ['КАЗНА И ДОКАЗАННЫЕ УБЫТКИ','ПРАВОВОЙ ВЫВОД',49,54]
    ]
  ];
  const links=(i,step)=>{
    const draw=(d,color,kind='solid')=>`<g fill="none" stroke="${color}" stroke-width="8" class="${kind==='dash'?'cv-relation':'cv-relation-solid'}"><path d="${d}" ${kind==='dash'?'stroke-dasharray="16 9"':''} stroke-linecap="round"/><circle cx="${i===0?270:i===1?275:215}" cy="${i===0?360:i===1?310:410}" r="14" fill="#f8fbfd"/></g>`;
    if(i===0)return `${step>=2?draw('M270 360C380 300 500 315 655 395','#0089bb'):''}${step>=4?draw('M733 410C785 360 837 380 880 460','#de7b42','dash'):''}${step>=6?draw('M270 515C440 590 610 535 760 525','#079b91'):''}`;
    if(i===1)return `${step>=1?draw('M275 310C320 260 365 260 410 305','#0077b5'):''}${step>=2?draw('M650 305C700 265 760 265 815 330','#ed6240'):''}${step>=4?draw('M500 180V520','#7f65a0','dash'):''}`;
    return `${step>=1?draw('M215 410C360 385 410 435 520 430','#d66b45'):''}${step>=2?draw('M520 430C555 330 590 265 670 220','#078f97','dash'):''}${step>=8?draw('M670 220C760 245 785 340 850 430','#a45083'):''}`;
  };
  return {
    show(view,i=0,step=0){
      const outgoing=el.querySelector('.cv-fallback-photo')?.cloneNode(true);
      outgoing?.querySelector('svg')?.remove();
      el.classList.remove('is-reading');
      if(view==='home')el.innerHTML=`<div class="cv-fallback-photo home"><img src="${homeImage}" alt="" draggable="false" aria-hidden="true"></div>`;
      else if(view==='case'){
        const doc=documentIndex[i][step],route=['a','b','c','d'][(step+i)%4];
        const linksSvg=links(i,step);
        const [note,kind,px,py]=accents[i][step];const duration=38+(step*5+i*7)%19;
        el.innerHTML=`<div class="cv-fallback-photo route-${route}" style="--cv-duration:${duration}s;--cv-focus:${focalPoints[i][step]}%;--cv-read-shift:${i===1?'-8%':'-29%'}"><img src="${caseImages[i]}" alt="" draggable="false"><svg class="cv-photo-link" viewBox="0 0 1000 680" preserveAspectRatio="none">${linksSvg}</svg></div>${i===2&&step===0?'':`<div class="cv-detail" style="--cv-image:url('${caseImages[i]}');--cv-detail-x:${px}%;--cv-detail-y:${py}%;--cv-detail-duration:${duration}s"><div class="cv-detail-photo"></div><small>${String(step+1).padStart(2,'0')} / ПРЕДМЕТНЫЙ ФРАГМЕНТ</small></div>`}<div class="cv-evidence-note ${doc>=0?'has-document':''}" style="--cv-accent:${colors[i].accent};--cv-detail-duration:${duration}s"><span>${kind}</span><b>${note}</b></div>${doc>=0?`<button type="button" class="cv-fallback-document" data-document><span>УЧЕБНАЯ МОДЕЛЬ / ЛИСТ ${step+1}</span>${labels[i][doc]}<span>ОТКРЫТЬ ДОКУМЕНТ ↗</span></button>`:''}`;
      }else el.innerHTML=`<div class="cv-fallback-photo home"><img src="${homeImage}" alt="" draggable="false"></div>`;
      const image=el.querySelector('.cv-fallback-photo.home img');
      if(view==='home'&&image){image.addEventListener('click',e=>{const n=picturedBook(e,image);if(n>=0)onSelectBook(n)});image.addEventListener('pointermove',e=>{image.style.cursor=picturedBook(e,image)<0?'default':'pointer'})}
      el.querySelector('[data-document]')?.addEventListener('click',onDocument);
      if(outgoing){outgoing.classList.add('cv-outgoing');el.append(outgoing);setTimeout(()=>outgoing.remove(),870)}
    },
    setMotion(m){el.classList.toggle('is-still',!m)},
    setReading(open){el.classList.toggle('is-reading',!!open)},
    destroy(){el.remove()}
  };
}

export function createScene(container,{onSelectBook=()=>{},onDocument=()=>{},onModeChange=()=>{}}={}){
  let view='home',caseIndex=0,step=0,motion=true,reading=false;
  let stage,fallback=null,fallen=false,mode='webgl';
  const switchMode=nextMode=>{mode=nextMode;onModeChange(nextMode);if(nextMode==='fallback'){fallen=true;fallback??=createFallback(container,{onSelectBook,onDocument});fallback.show(view,caseIndex,step);fallback.setMotion(motion);fallback.setReading(reading);stage?.renderer.domElement.style.setProperty('display','none')}};
  try{stage=setupStage(container,switchMode)}catch(error){switchMode('fallback');return {show:(...args)=>fallback.show(...args),setMotion:m=>fallback.setMotion(m),setReading:open=>fallback.setReading(open),destroy:()=>fallback.destroy()}}
  switchMode('webgl');
  const {scene,camera,renderer,key,rim}=stage;
  const sets=[new THREE.Group(),new THREE.Group(),new THREE.Group(),new THREE.Group(),new THREE.Group()];
  sets.forEach(s=>{scene.add(s);s.visible=false});
  const books=[0,1,2].map(volume);
  const homeAngles=[[ -.12,.31,-.07],[-.10,-.28,.045],[-.16,.24,-.055]];
  books.forEach((b,i)=>{b.position.set((i-1)*2.76,0,i===1?.34:i===2?-.18:.06);b.rotation.set(...homeAngles[i]);sets[0].add(b)});
  const scenes=[facade(),officeScene(),registryScene()];scenes.forEach((g,i)=>sets[i+1].add(g));
  // Physical document folios sit within the room, but actual legal text remains crisp HTML.
  const folios=documentSpecs.map((caseDocs,i)=>caseDocs.map(([title,color],j)=>{
    const f=folio(title,color,j);sets[i+1].add(f);f.visible=false;return f;
  }));
  const ties=[
    [
      relation([[-3.05,3.12,.72],[-2.4,3.72,1.14],[-.12,3.48,.72]],'#0985bb','ownership'),
      relation([[1.78,2.24,.41],[2.17,3.06,.72],[2.94,2.89,1.1]],'#df7540','authority'),
      relation([[-1.3,1.95,.65],[.4,1.5,1.18],[2.2,1.32,1.2]],'#0d998f','obligation')
    ],[
      relation([[-3.18,1.52,1.18],[-2.1,2.56,1.21],[-.67,2.14,1.2]],'#006fba','obligation'),
      relation([[1.18,1.5,1.22],[2.1,2.56,1.21],[3.53,2.14,1.2]],'#e85f3c','obligation'),
      relation([[.2,.42,1.06],[1.93,.38,1.12],[3.56,.42,1.05]],'#7d5e9e','boundary')
    ],[
      relation([[-3.15,1.6,1.8],[-2.35,2.14,1.8],[-1.3,1.76,1.7]],'#ca6846','obligation'),
      relation([[-.85,1.5,1.63],[-.15,2.35,1.1],[.35,3.26,.13]],'#078e95','authority'),
      relation([[.22,3.26,.13],[1.42,3.16,.24],[2.56,2.12,.96]],'#aa537b','compensation')
    ]
  ];
  ties.forEach((a,i)=>a.forEach(t=>{t.visible=false;sets[i+1].add(t)}));
  // The final scene is one complete physical composition, not flattened screenshots.
  const fin=sets[4];const smallBooks=[0,1,2].map(volume);smallBooks.forEach((b,i)=>{
    b.scale.setScalar(.72);b.position.set((i-1)*3.2,.01,0);b.rotation.set(-.10,(i-1)*-.19,(i-1)*-.025);fin.add(b)
  });
  const finalTies=[relation([[-3.1,3.04,.2],[-1.6,4.25,.2],[0,3.02,.3]],'#0875b8','ownership'),relation([[.0,3.15,.2],[1.5,4.02,.2],[3.2,3.2,.2]],'#ea694b','authority')];finalTies.forEach(t=>fin.add(t));
  let alive=true,raf=0,phase=0,last=performance.now(),dirty=true;
  let currentEye=new THREE.Vector3(.15,4.72,9.6),currentTarget=new THREE.Vector3(0,1.7,0),route=cameraRoute('home',0,0,false);
  let desiredEye=currentEye.clone(),desiredTarget=currentTarget.clone();
  let inspect=null,drag=null,dragBook=null,freezeUntil=0;
  function changeVisibility(){
    sets.forEach((g,i)=>g.visible=(view==='home'?i===0:view==='final'?i===4:i===caseIndex+1));
    stage.floor.visible=view==='home'||view==='final';
    stage.shadowFloor.visible=view==='case';
    folios.forEach((group,i)=>group.forEach((f,j)=>{
      const index=documentIndex[i][step];f.visible=view==='case'&&i===caseIndex&&j===index;
      if(f.visible){
        const x=i===0?2.92:i===1?(step===1?-3.30:step===2?3.18:2.95):(step%2?-3.08:2.93);
        f.position.set(x,2.11,i===1?1.04:1.16);f.rotation.set(-.08,(x>0?-.17:.17),x>0?-.045:.06);
      }
    }));
    ties.forEach((group,i)=>group.forEach((t,j)=>{
      t.visible=view==='case'&&i===caseIndex&&(
        i===0?step>=[2,4,6][j]:i===1?step>=[1,2,4][j]:step>=[1,2,8][j]
      );
    }));
  }
  function cameraAt(t){
    const segment=Number.isFinite(t)?((t/11.4)%4+4)%4:0,k=Math.min(route.length-2,Math.floor(segment)),u=ease(segment-k);
    const a=route[k]??route[0],b=route[k+1]??a;
    const eye=new THREE.Vector3(...a[0]).lerp(new THREE.Vector3(...b[0]),u);
    const target=new THREE.Vector3(...a[1]).lerp(new THREE.Vector3(...b[1]),u);
    return {eye,target};
  }
  function draw(now){
    if(!alive||fallen)return;
    const delta=Math.min(.08,(now-last)/1000||0);last=now;
    if(motion&&!drag&&now>freezeUntil)phase+=delta;
    if(motion&&!drag&&now>freezeUntil){
      const pose=cameraAt(phase+(view==='case'?step*.38+caseIndex*.71:0));
      desiredEye.copy(pose.eye);desiredTarget.copy(pose.target);
    }
    // Motion stops at the current pose; step changes blend from that pose.
    currentEye.lerp(desiredEye,motion?Math.min(1,delta*2.2):1);
    currentTarget.lerp(desiredTarget,motion?Math.min(1,delta*2.2):1);
    if(inspect){
      const o=inspect.book;
      o.rotation.y=THREE.MathUtils.lerp(o.rotation.y,inspect.yaw,Math.min(1,delta*7));
      o.rotation.x=THREE.MathUtils.lerp(o.rotation.x,inspect.pitch,Math.min(1,delta*7));
    }
    if(motion&&!drag&&view==='home'){
      books.forEach((b,i)=>{if(inspect?.book!==b){b.rotation.y+=(i%2?1:-1)*delta*.003;b.position.y=Math.sin(phase*.33+i*1.1)*.018}});
    }
    if(motion&&!drag&&view==='case'){
      const f=folios[caseIndex][documentIndex[caseIndex][step]];
      if(f){f.rotation.y+=(Math.sin(phase*.5+step)*.0007);f.position.y=2.11+Math.sin(phase*.79+step)*.016}
      ties[caseIndex].forEach((t,j)=>{if(t.visible)t.traverse(o=>{if(o.isMesh&&o.material?.transparent)o.material.opacity=.74+.15*Math.sin(phase*.65+j)})});
      const beat=phase*.145,subjects=scenes[caseIndex].userData.subjects;
      if(subjects?.cart)subjects.cart.position.x=-2.59+Math.sin(beat)*.035;
      if(subjects?.casework){
        subjects.casework.rotation.y=.19+Math.sin(beat*.74)*.025;
        subjects.casework.userData.lid.rotation.x=-.30+Math.sin(beat*.67)*.025;
      }
      if(subjects?.file)subjects.file.rotation.y=-.13+Math.sin(beat*.9)*.035;
    }
    rim.position.x=4+Math.sin(phase*.13)*1.7;key.position.x=-5+Math.sin(phase*.11)*1.0;
    if(!document.hidden&&(motion||drag||dirty)){
      camera.position.copy(currentEye);camera.lookAt(currentTarget);renderer.render(scene,camera);dirty=false;
    }
    raf=requestAnimationFrame(draw);
  }
  const pickBook=e=>{
    const box=container.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
    const ray=new THREE.Raycaster();ray.setFromCamera(p,camera);
    const hit=ray.intersectObjects(books,true)[0];if(!hit)return -1;
    let o=hit.object;while(o&&!books.includes(o))o=o.parent;return books.indexOf(o);
  };
  const down=e=>{
    if(view==='home'){
      const i=pickBook(e);if(i<0)return;dragBook=i;inspect={book:books[i],yaw:books[i].rotation.y,pitch:books[i].rotation.x};
    }
    drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,eye:currentEye.clone(),target:currentTarget.clone(),moved:false};
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const move=e=>{
    if(!drag){if(view==='home')renderer.domElement.style.cursor=pickBook(e)<0?'':'grab';return}
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>5)drag.moved=true;
    if(view==='home'&&inspect){inspect.yaw+=dx*.009;inspect.pitch=clamp(inspect.pitch+dy*.008,-.5,.4)}
    else if(view==='case'){
      const dir=currentEye.clone().sub(currentTarget),sph=new THREE.Spherical().setFromVector3(dir);
      sph.theta=clamp(sph.theta-dx*.004,-.55,.55);sph.phi=clamp(sph.phi+dy*.004,.75,1.55);
      currentEye.copy(currentTarget).add(new THREE.Vector3().setFromSpherical(sph));desiredEye.copy(currentEye);
    }
  };
  const up=e=>{
    if(!drag)return;const clicked=!drag.moved;
    drag=null;freezeUntil=performance.now()+1800;
    try{renderer.domElement.releasePointerCapture(e.pointerId)}catch{}
    if(view==='home'&&clicked&&dragBook>=0)onSelectBook(dragBook);
    else if(view==='case'&&clicked&&documentIndex[caseIndex][step]>=0)onDocument();
    dragBook=null;
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);
  renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  changeVisibility();raf=requestAnimationFrame(draw);
  return {
    show(nextView='home',nextCase=0,nextStep=0){
      view=nextView;caseIndex=clamp(nextCase,0,2);step=clamp(nextStep,0,[6,5,8][caseIndex]);
      reading=false;route=cameraRoute(view,caseIndex,step,false);changeVisibility();dirty=true;
      fallback?.show(view,caseIndex,step);
      const p=cameraAt(phase+(view==='case'?step*.38+caseIndex*.71:0));desiredEye.copy(p.eye);desiredTarget.copy(p.target);
    },
    setMotion(enabled){motion=!!enabled;dirty=true;fallback?.setMotion(motion);if(!motion){desiredEye.copy(currentEye);desiredTarget.copy(currentTarget)}},
    setReading(open){reading=!!open;dirty=true;fallback?.setReading(reading);route=cameraRoute(view,caseIndex,step,reading);
      const p=cameraAt(phase+(view==='case'?step*.38+caseIndex*.71:0));desiredEye.copy(p.eye);desiredTarget.copy(p.target);
    },
    get mode(){return mode},
    destroy(){alive=false;cancelAnimationFrame(raf);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);
      const geos=new Set(),mats=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)});
      mats.forEach(m=>{if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose()});geos.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());fallback?.destroy();stage.dispose();
    }
  };
}
