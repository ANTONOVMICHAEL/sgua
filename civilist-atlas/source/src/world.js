import * as THREE from 'three';
import {createStage,softShadow} from './render.js';
import {building,office,documentObject,block,material,palette,rod} from './objects.js';

const objectNames={municipality:['contract','register','company','authority'],institutions:['contractA','contractB','assets','claim'],registration:['contract','application','register','suspension','refusal','court','rent','forecast','objection']};
const titles={contract:'ДОГОВОР',register:'РЕЕСТР ПРАВА',company:'ЕГРЮЛ',authority:'ПОЛНОМОЧИЕ',contractA:'КОНТРАКТ А',contractB:'ДОГОВОР Б',assets:'ИМУЩЕСТВО',claim:'ТРЕБОВАНИЕ',application:'ЗАЯВЛЕНИЕ',suspension:'ПРИОСТАНОВЛЕНИЕ',refusal:'ОТКАЗ',court:'РЕШЕНИЕ СУДА',rent:'АРЕНДА',forecast:'ПРОГНОЗ',objection:'ВОЗРАЖЕНИЕ'};
const appearances={municipality:[[],['contract'],['register'],['register','company'],['authority'],['contract','register','authority'],['authority']],institutions:[[],['contractA'],['contractB'],['claim'],['assets'],[]],registration:[[],['contract','application'],['register'],['suspension','refusal'],['court'],['rent'],['forecast'],['objection'],['court']]};

export function mountWorld(container,id,onDocument,{motion=true}={}){
  const isII=id==='institutions';const stage=createStage(container,{span:isII?7.4:6.7,look:[0,1.05,0],eye:isII?[4,4.7,12]:[4.7,5.1,12]});stage.setMotion(motion);
  const {scene,camera,renderer}=stage,root=new THREE.Group(),objects={};scene.add(root);
  const surface=material('#e7e3d6',.94),edge=material('#c9ccbf',.78),ink=material(palette.blue,.7),bronze=material(palette.brass,.45,.4);
  if(isII){
    const a=office(0),b=office(1);a.position.set(-1.65,0,0);b.position.set(1.65,0,0);a.scale.setScalar(.91);b.scale.setScalar(.91);root.add(a,b);objects.a=a;objects.b=b;softShadow(scene,-1.65,0,3.6,2.7,.25);softShadow(scene,1.65,0,3.6,2.7,.25);
  }else{
    const architectural=building();architectural.position.set(-.55,0,-.10);architectural.scale.setScalar(id==='registration'?.83:.94);root.add(architectural);objects.building=architectural;
    const base=block(root,4.8,.065,3.3,surface,-.10,-.025,0,.02);softShadow(scene,0,.1,6,4,.20);
    // A cadastral specimen base with a ruled boundary, not an abstract orbit.
    rod(root,[[-2.25,.014,-1.40],[2.18,.014,-1.40],[2.18,.014,1.4],[-2.25,.014,1.4],[-2.25,.014,-1.40]],edge,.005);
    for(let j=0;j<8;j++)block(root,.11,.002,.008,edge,-1.95+j*.54,.015,1.48,.001);
    if(id==='registration'){
      const archive=block(root,.12,1.65,1.3,ink,1.61,.87,-.45,.022);archive.rotation.z=-.11;
      block(root,.12,1.65,1.3,edge,1.81,.87,-.45,.022).rotation.z=-.11;
      for(let k=0;k<3;k++)block(root,.23,.18,.045,bronze,1.68,.48+k*.4,.23,.006);
    }
  }
  for(const [i,name] of objectNames[id].entries()){
    const o=documentObject(titles[name],name==='refusal'?'refusal':'normal');objects[name]=o;root.add(o);o.visible=false;o.userData.name=name;
  }
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let current=0;
  function target(name,index){const list=appearances[id][index],i=list.indexOf(name),visible=i>=0;return {visible,x:isII?(name==='contractA'?-1.50:name==='contractB'?1.64:0):(list.length>1?.8+i*.72:1.35),y:1.14+(i>0?.15:0),z:1.12+(i>0?.22:0),rx:-.15,ry:-.19,rz:i>0?.13:-.08,s:isII?.76:.94}}
  const labelLayer=document.createElement('div');labelLayer.className='object-labels';container.append(labelLayer);
  function annotations(){
    const last=appearances[id].length-1;let items;
    if(isII)items=[['А','Казенное учреждение',[-1.7,1.95,0]],['Б','Бюджетное учреждение',[1.65,1.95,0]]];
    else items=[['01',id==='registration'?'Здание в Саратове':'Муниципальное здание',[-.6,2.4,0]]];
    if(id==='municipality'&&current===last)items.push(['02','Комитет действует от имени Города Н',[1.5,2.75,1.1]]);
    else if(id==='registration'&&current===last)items.push(['02','Решение об отказе признано незаконным',[1.6,2.7,1.1]]);
    else if(appearances[id][current].length)items.push(['02',titles[appearances[id][current][0]],[isII?0:1.6,2.7,1.1]]);
    labelLayer.innerHTML=items.map(([n,text,point])=>{const p=new THREE.Vector3(...point).applyMatrix4(root.matrixWorld).project(camera);return `<div class="object-label" style="left:${Math.min(80,Math.max(9,(p.x*.5+.5)*100))}%;top:${Math.min(78,Math.max(9,(-p.y*.5+.5)*100))}%"><span>${n}</span><b>${text}</b></div>`}).join('');
  }
  function setStep(index,animated=true,replay=false){
    current=index;const docs=objectNames[id];if(replay){docs.forEach(name=>{if(objects[name].visible)objects[name].position.y-=.30})}const rootFrom=root.rotation.y,from=docs.map(name=>{const o=objects[name];return {p:o.position.clone(),r:o.rotation.clone(),s:o.scale.x}}),cameraStart=camera.position.clone();
    const end=isII?new THREE.Vector3(index===1?2.8:index===2?5:4,4.7,12):new THREE.Vector3(4.7+(index%3-1)*.35,5.1-(index%2)*.22,12);
    docs.forEach(name=>{if(target(name,index).visible)objects[name].visible=true});
    const run=t=>{docs.forEach((name,i)=>{const o=objects[name],v=target(name,index),initial=from[i];o.position.set(THREE.MathUtils.lerp(initial.p.x,v.x,t),THREE.MathUtils.lerp(initial.p.y,v.y+(v.visible?0:-.55),t),THREE.MathUtils.lerp(initial.p.z,v.z,t));o.rotation.set(THREE.MathUtils.lerp(initial.r.x,v.rx,t),THREE.MathUtils.lerp(initial.r.y,v.ry,t),THREE.MathUtils.lerp(initial.r.z,v.rz,t));o.scale.setScalar(THREE.MathUtils.lerp(initial.s,v.visible?v.s:.001,t));o.visible=t===1?v.visible:o.visible});camera.position.copy(cameraStart).lerp(end,t);camera.lookAt(0,1.05,0);root.rotation.y=THREE.MathUtils.lerp(rootFrom,index%2?-.03:.025,t);annotations()};
    stage.animate(run,animated?850:0);
  }
  function hit(e){const r=container.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(objectNames[id].map(n=>objects[n]).filter(o=>o.visible),true).length>0}
  const click=e=>{if(hit(e))onDocument?.()},move=e=>{container.style.cursor=hit(e)?'pointer':'default'};container.addEventListener('click',click);container.addEventListener('pointermove',move);
  const observer=new ResizeObserver(annotations);observer.observe(container);setStep(0);stage.resize();
  return {setStep,setMotion:stage.setMotion,destroy(){observer.disconnect();labelLayer.remove();container.removeEventListener('click',click);container.removeEventListener('pointermove',move);stage.destroy()}};
}

export function mountFinalWorld(container,{motion=true}={}){
  const stage=createStage(container,{span:14.4,look:[0,.8,0],eye:[2.4,6.8,15]});stage.setMotion(motion);const root=new THREE.Group();stage.scene.add(root);
  const a=building();a.position.set(-4.7,0,0);a.scale.setScalar(.68);root.add(a);softShadow(stage.scene,-4.7,0,3.7,2.4,.24);
  for(let i=0;i<2;i++){const officeModel=office(i);officeModel.scale.setScalar(.49);officeModel.position.set(i? .78:-.78,0,0);root.add(officeModel);softShadow(stage.scene,i?.78:-.78,0,2.1,1.6,.22)}
  const b=building();b.position.set(4.4,0,0);b.scale.setScalar(.58);root.add(b);const d=documentObject('РЕШЕНИЕ СУДА');d.position.set(5.5,.82,.8);d.scale.setScalar(.65);d.rotation.y=-.2;root.add(d);softShadow(stage.scene,4.7,0,3.5,2.3,.24);
  stage.animate(t=>{root.position.y=(1-t)*-.15;root.rotation.y=(1-t)*.06},900);stage.resize();return {setMotion:stage.setMotion,destroy:stage.destroy};
}
