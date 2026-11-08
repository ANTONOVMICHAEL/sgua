import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const palette={ink:'#273129',blue:'#344b68',oxide:'#884e40',olive:'#596550',paper:'#f3eddf',stone:'#d9d7cb',brass:'#a49264',steel:'#87908d'};
export const material=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export function add(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function block(parent,w,h,d,mat,x=0,y=0,z=0,r=.025){return add(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),mat,x,y,z)}
export function rod(parent,points,mat,r=.009){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,r,5,false),mat)}
export function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
export function noiseTexture(color='#68736b',seed=17){return canvasTexture(256,256,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);let s=seed;for(let i=0;i<22000;i++){s=(s*1664525+1013904223)>>>0;const x=s%256;s=(s*1664525+1013904223)>>>0;const y=s%256;c.fillStyle=i%2?'rgba(255,255,255,.065)':'rgba(0,0,0,.055)';c.fillRect(x,y,1,2)}for(let i=0;i<256;i+=2){c.fillStyle='rgba(0,0,0,.035)';c.fillRect(i,0,1,256);c.fillStyle='rgba(255,255,255,.035)';c.fillRect(0,i,256,1)}})}
function drawPlan(c,x,y,w,h,type=0){
  c.save();c.translate(x,y);c.strokeStyle='rgba(231,215,172,.72)';c.lineWidth=1.5;
  const line=(x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
  if(type===0){
    // Cadastral plan: load-bearing perimeter, partition, door swings and dimension lines.
    c.strokeRect(14,15,w-28,h-35);c.strokeRect(21,22,w-42,h-49);line(w*.46,22,w*.46,h-27);line(21,h*.55,w-21,h*.55);
    for(let i=0;i<5;i++){c.clearRect(36+i*(w-80)/5,13,25,12);line(36+i*(w-80)/5,18,61+i*(w-80)/5,18)}
    c.beginPath();c.arc(w*.46,h*.55,45,Math.PI,Math.PI*1.5);c.stroke();line(w*.46-45,h*.55,w*.46,h*.55);
    line(-15,-4,w+15,-4);line(-15,h+6,w+15,h+6);line(-5,-12,-5,h+15);line(w+5,-12,w+5,h+15);
    c.font='19px Manrope';c.fillStyle='rgba(231,215,172,.7)';c.fillText('ОБЪЕКТ / 01',30,h*.37);c.fillText('ПРАВО',w*.53,h*.8);
  }else if(type===1){
    const mid=w*.48;for(let k=0;k<2;k++){const xx=k*(mid+18);c.strokeRect(xx,15,mid-10,h-30);for(let i=0;i<7;i++)line(xx+12,45+i*23,xx+mid-22,45+i*23);line(xx+mid*.4,15,xx+mid*.4,h-15)}
    c.font='54px Cormorant Garamond';c.fillStyle='rgba(231,215,172,.8)';c.fillText('A',18,h-35);c.fillText('Б',mid+36,h-35);
  }else{
    c.strokeRect(8,18,w-16,h-36);for(let i=0;i<8;i++){c.globalAlpha=i===4?.9:.45;line(30,45+i*25,w-30,45+i*25)}c.globalAlpha=1;
    c.lineWidth=8;line(w*.12,h*.55,w*.84,h*.55);c.lineWidth=1.5;
    c.beginPath();c.moveTo(w*.64,18);c.bezierCurveTo(w*.43,h*.26,w*.91,h*.55,w*.54,h-18);c.stroke();
    c.font='19px Manrope';c.fillStyle='rgba(231,215,172,.8)';c.fillText('ЗАПИСЬ / ОТКАЗ',30,h-34);
  }c.restore();
}
export function coverTexture(index,width=900,height=1350){const colors=[palette.blue,palette.oxide,palette.olive];return canvasTexture(width,height,(c,w,h)=>{
  c.fillStyle=colors[index];c.fillRect(0,0,w,h);let seed=430+index;for(let i=0;i<80000;i++){seed=(seed*1664525+1013904223)>>>0;let x=Math.floor(seed/4294967296*w);seed=(seed*1664525+1013904223)>>>0;let y=Math.floor(seed/4294967296*h);c.fillStyle=i%2?'rgba(255,255,255,.055)':'rgba(0,0,0,.06)';c.fillRect(x,y,1,3)}
  const gold='#dfcfa3';c.fillStyle=gold;c.font='500 23px Manrope';c.fillText('Ц И В И Л И С Т',82,94);c.font='22px Manrope';c.fillText('ПРАВОВАЯ ЛАБОРАТОРИЯ',82,132);c.fillRect(82,167,w-164,1);
  c.font='500 150px Cormorant Garamond';c.fillText(['I','II','III'][index],78,334);
  c.font='500 69px Cormorant Garamond';const lines=[['Кто является','субъектом?'],['Кто отвечает','по обязательству?'],['Кто возмещает','вред?']][index];lines.forEach((s,i)=>c.fillText(s,80,438+i*76));
  c.font='23px Manrope';const subtitles=[['Комитет. Здание. Город.'],['Казенное и бюджетное','учреждения.'],['Частный договор.','Публичный отказ.']][index];subtitles.forEach((s,i)=>c.fillText(s,82,623+i*34));
  drawPlan(c,108,755,w-216,350,index);c.fillStyle=gold;c.fillRect(82,h-150,w-164,1);c.font='23px Manrope';c.fillText('АНТОНОВ М. А.',82,h-104);c.font='21px Manrope';c.fillText('СГЮА',82,h-60);c.textAlign='right';c.fillText('2026',w-82,h-60);
})}

export function book(index){
  const g=new THREE.Group();g.userData.index=index;
  const widths=[1.95,2.04,1.92],heights=[2.96,3.15,2.88],depths=[.39,.48,.35],w=widths[index],h=heights[index],d=depths[index];
  const cloth=material([palette.blue,palette.oxide,palette.olive][index],.92),grain=noiseTexture('#808080',index+3);grain.colorSpace=THREE.NoColorSpace;cloth.bumpMap=grain;cloth.bumpScale=.012;
  const page=material('#e6ddc6',.95),foil=material('#b3a071',.35,.72),crease=material('#1d2829',.96);
  const blockPages=block(g,w-.12,h-.13,d-.075,page,.015,h/2,0,.018);
  // Slightly convex fore-edge and individual gatherings along top and bottom.
  for(let i=0;i<23;i++){const z=-d/2+.053+i*(d-.106)/22;const lineMat=material(i%4===0?'#bcaf92':'#d7cdb5');block(g,.008,h-.17,.0018,lineMat,w/2-.044,h/2,z,.0004);block(g,w-.16,.003,.0018,lineMat,.01,h-.064,z,.0004)}
  const back=block(g,w,h,.047,cloth,0,h/2,-d/2,.018);const pivot=new THREE.Group();pivot.position.set(-w/2+.06,h/2,d/2);g.add(pivot);
  block(pivot,w,h,.047,cloth,w/2-.06,0,0,.018);
  const cover=add(pivot,new THREE.PlaneGeometry(w-.07,h-.07),new THREE.MeshStandardMaterial({map:coverTexture(index),roughness:.84}),w/2-.06,0,.032);cover.castShadow=false;
  const endpaper=add(pivot,new THREE.PlaneGeometry(w-.12,h-.12),material('#e3d8bb'),w/2-.06,0,-.025);endpaper.rotation.y=Math.PI;
  // Curved hollow spine, built as a half-cylinder with full UV surface.
  const spine=add(g,new THREE.CylinderGeometry(d*.59,d*.59,h-.02,18,1,true,0,Math.PI),cloth,-w/2+.065,h/2,0);spine.rotation.y=-Math.PI/2;
  block(g,.018,h-.12,.02,crease,-w/2+.11,h/2,d/2+.025,.004);
  const spineTex=canvasTexture(120,800,(c,w,h)=>{c.fillStyle=[palette.blue,palette.oxide,palette.olive][index];c.fillRect(0,0,w,h);c.fillStyle='#dfcfa3';c.textAlign='center';c.font='34px Cormorant Garamond';c.fillText(['I','II','III'][index],w/2,65);c.save();c.translate(70,180);c.rotate(Math.PI/2);c.font='23px Manrope';c.fillText('ЦИВИЛИСТ',170,0);c.restore();c.font='20px Manrope';c.fillText('СГЮА',w/2,745)});
  const sp=add(g,new THREE.PlaneGeometry(d*.84,h-.16),new THREE.MeshStandardMaterial({map:spineTex,roughness:.85}),-w/2-d*.48+.06,h/2,0);sp.rotation.y=-Math.PI/2;
  for(const y of [.08,h-.08]){const headband=add(g,new THREE.CylinderGeometry(d*.43,d*.43,.02,18,1,false,0,Math.PI),foil,-w/2+.065,y,0);headband.rotation.y=-Math.PI/2;for(let j=0;j<7;j++)block(g,.018,.018,.021,page,-w/2+.055+j*.017,y,d*.2,.003)}
  const ribbon=block(g,.07,.43,.008,foil,w*.30,-.09,-.03,.003);ribbon.rotation.z=-.15;
  g.userData.coverPivot=pivot;g.userData.dimensions=[w,h,d];return g;
}

export function documentObject(title='ДОГОВОР',kind='normal'){
  const g=new THREE.Group();g.userData.document=true;const paper=material('#f1ecdd',.95);block(g,1.30,1.80,.018,paper,0,0,0,.011);
  const texture=canvasTexture(520,720,(c,w,h)=>{c.fillStyle='#f3eee1';c.fillRect(0,0,w,h);c.fillStyle='#788070';c.font='13px Manrope';c.fillText('УЧЕБНАЯ МОДЕЛЬ / ЦИВИЛИСТ',38,42);c.fillStyle=kind==='refusal'?palette.oxide:palette.ink;c.font='500 28px Cormorant Garamond';c.fillText(title,38,105);c.fillRect(38,132,w-76,1);c.font='17px Manrope';c.fillText('Материалы исследования',38,176);for(let j=0;j<12;j++){c.fillStyle=j===4?'#a1a58e':'#c4c6b8';c.fillRect(38,218+j*24,(w-76)*(j%4===3?.63:1),1.5)}c.fillStyle=kind==='refusal'?palette.oxide:palette.blue;c.fillRect(38,556,5,75);c.font='20px Cormorant Garamond';c.fillText(kind==='refusal'?'Регистрационное решение':'Условный документ',58,582);c.font='13px Manrope';c.fillText('Не является официальной выпиской',38,674);});
  add(g,new THREE.PlaneGeometry(1.27,1.77),new THREE.MeshStandardMaterial({map:texture,roughness:.94}),0,0,.011);
  const metal=material('#7c877e',.24,.75);rod(g,[[-.43,.79,.035],[-.43,.96,.035],[-.32,.97,.035],[-.31,.80,.035],[-.36,.79,.035],[-.36,.91,.035]],metal,.008);
  return g;
}

export function building(){
  const g=new THREE.Group(),stone=material('#d5d1c4'),trim=material('#e7e1d2'),brick=material('#b39c87'),glass=material('#627b80',.22,.24),dark=material('#303e3d',.6,.15),metal=material('#71807b',.35,.4);
  // Architectural study with deep reveals and exposed upper floor.
  block(g,3.40,.16,2.28,stone,0,.08,0,.02);block(g,3.26,.12,2.14,trim,0,.22,0,.02);
  block(g,3.12,1.65,1.96,brick,0,1.08,0,.015);
  const facade=canvasTexture(512,300,(c,w,h)=>{c.fillStyle='#b3a08d';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=11){c.fillStyle='#d4c5af';c.fillRect(0,y,w,1);for(let x=(y/11)%2?0:12;x<w;x+=25){c.fillRect(x,y,1,11)}}});
  const facadeMat=new THREE.MeshStandardMaterial({map:facade,roughness:.9});add(g,new THREE.PlaneGeometry(3.10,1.64),facadeMat,0,1.08,.989);
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){if(row===0&&col===2)continue;const x=-1.29+col*.515,y=.72+row*.72;block(g,.40,.53,.10,dark,x,y,1.01,.012);block(g,.32,.45,.015,glass,x,y,1.069,.007);block(g,.018,.46,.02,metal,x,y,1.082,.004);block(g,.43,.045,.17,trim,x,y-.28,1.05,.005)}
  block(g,.43,.92,.11,dark,-.26,.71,1.02,.009);block(g,.34,.84,.02,glass,-.26,.71,1.085,.007);block(g,.015,.17,.032,trim,-.14,.75,1.108,.004);
  for(let i=0;i<3;i++)block(g,.82,.07, .24+i*.16,stone,-.26,.195-i*.055,1.15+i*.06,.009);
  for(const x of [-1.57,1.57]){block(g,.12,1.72,2.02,trim,x,1.08,0,.008);for(let j=0;j<4;j++){block(g,.02,.42,.45,dark,x*1.045,1.13,j*.50-.75,.004);block(g,.024,.36,.38,glass,x*1.05,1.13,j*.50-.75,.004)}}
  block(g,3.31,.12,2.13,trim,0,1.96,0,.012);block(g,3.10,.07,1.93,dark,0,2.055,0,.008);
  // Roof rails, skylight and service elements distinguish a material property.
  block(g,1.23,.12,.72,metal,.46,2.12,-.2,.01);block(g,1.12,.03,.62,glass,.46,2.195,-.2,.007);
  for(let i=0;i<5;i++)block(g,.025,.025,.68,trim,.0+i*.22,2.22,-.2,.003);
  for(const x of [-1.52,1.52])rod(g,[[x,2.01,-.96],[x,2.18,-.96],[x,2.18,.96],[x,2.01,.96]],metal,.012);
  return g;
}

export function equipment(type=0){
  const g=new THREE.Group(),body=material('#bfc7bf',.4,.25),dark=material('#263b3c',.44),light=material('#778c8a',.4),bronze=material('#9c9478',.4,.4);
  if(type===0){block(g,.58,.86,.55,body,0,.43,0,.045);block(g,.49,.35,.018,dark,0,.60,.286,.017);for(let i=0;i<7;i++)block(g,.34,.012,.009,light,0,.35-i*.034,.289,.003);add(g,new THREE.CylinderGeometry(.025,.025,.013,12),bronze,.18,.70,.306).rotation.x=Math.PI/2;for(let j=0;j<4;j++)block(g,.007,.46,.018,dark,.299,.47,-.15+j*.1,.002)}
  else{block(g,.85,.045,.58,body,0,.04,.12,.018);const screen=block(g,.85,.56,.035,dark,0,.32,-.13,.022);screen.rotation.x=-.15;const glass=block(g,.75,.45,.01,light,0,.33,-.10,.012);glass.rotation.x=-.15;for(let r=0;r<4;r++)for(let k=0;k<10;k++)block(g,.055,.003,.035,dark,-.33+k*.073,.066,.03+r*.065,.003);block(g,.21,.002,.10,light,0,.067,.34,.006)}
  return g;
}

export function office(type=0){
  const g=new THREE.Group(),floor=material(type?'#c1baa5':'#c1c8be'),wall=material('#dfdbcc'),wood=material(type?'#a29278':'#9baca2'),steel=material('#697b75',.35,.4);
  block(g,2.75,.13,2.20,floor,0,.08,0,.018);block(g,2.75,1.65,.08,wall,0,.94,-1.05,.012);block(g,.08,1.65,2.2,wall,-1.34,.94,0,.012);
  // Cutaway office, not an institutional symbol. Materials are accepted here.
  for(let k=0;k<4;k++)block(g,.012,.008,2.08,steel,-1.0+k*.65,.15,0,.002);
  block(g,1.74,.075,.76,wood,.14,.94,-.14,.024);
  for(const x of [-.58,.84])for(const z of [-.42,.12])block(g,.042,.75,.042,steel,x,.55,z,.009);
  const device=equipment(type);device.position.set(type?.12:.55,.984,-.17);device.scale.setScalar(.60);g.add(device);
  block(g,.60,.06,.55,wood,-.20,.55,.65,.03);block(g,.60,.54,.06,wood,-.20,.84,.89,.045);for(const x of [-.4,.0])for(const z of [.49,.78])block(g,.025,.40,.025,steel,x,.32,z,.006);
  for(let k=0;k<3;k++){block(g,.43,.30,.42,wood,-.95,.36+k*.33,-.65,.015);block(g,.16,.02,.025,steel,-.95,.36+k*.33,-.42,.004)}
  const notice=documentObject(type?'ДОГОВОР Б':'КОНТРАКТ А');notice.scale.setScalar(.33);notice.position.set(.63,1.20,-.98);g.add(notice);
  return g;
}
