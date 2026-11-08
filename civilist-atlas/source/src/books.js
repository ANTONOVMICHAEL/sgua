import * as THREE from 'three';
import {createStage,softShadow} from './render.js';
import {book} from './objects.js';

export function mountBooks(container,onSelect,{motion=true}={}){
  const stage=createStage(container,{span:11.6,look:[0,1.45,0],eye:[2.5,4.4,13]}),{scene,camera,renderer}=stage;
  stage.setMotion(motion);
  const volumes=[0,1,2].map(i=>book(i)),positions=[[-3.18,.1,-.20],[.0,.06,.28],[3.16,.13,-.04]],angles=[[-.035,-.25,-.065],[-.025,.12,.035],[-.015,-.24,-.04]];
  volumes.forEach((b,i)=>{scene.add(b);b.position.set(...positions[i]);b.rotation.set(...angles[i]);softShadow(scene,positions[i][0]+.12,positions[i][2]-.02,2.8,1.4,.25)});
  let selected=-1,hover=-1;const ray=new THREE.Raycaster(),p=new THREE.Vector2();
  const pick=e=>{const r=container.getBoundingClientRect();p.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(p,camera);let o=ray.intersectObjects(volumes,true)[0]?.object;while(o&&!Number.isInteger(o.userData.index))o=o.parent;return o?.userData.index??-1};
  function focus(i){if(selected>=0||hover===i)return;hover=i;const initial=volumes.map(b=>[b.position.y,b.rotation.y]);stage.animate(t=>volumes.forEach((b,j)=>{b.position.y=THREE.MathUtils.lerp(initial[j][0],positions[j][1]+(i===j?.11:0),t);b.rotation.y=THREE.MathUtils.lerp(initial[j][1],angles[j][1]+(i===j?-.11:0),t)}),420)}
  function choose(i){if(i<0||selected>=0)return;selected=i;const b=volumes[i],start=b.position.clone();stage.animate(t=>{b.position.z=start.z+t*.35;b.position.y=start.y+t*.09;b.userData.coverPivot.rotation.y=-t*.38;volumes.forEach((v,j)=>{if(j!==i)v.position.z=positions[j][2]-t*.16})},750,()=>onSelect(i))}
  const move=e=>{const i=pick(e);container.style.cursor=i<0?'default':'pointer';focus(i)},leave=()=>focus(-1),click=e=>choose(pick(e));
  container.addEventListener('pointermove',move);container.addEventListener('pointerleave',leave);container.addEventListener('click',click);
  const starts=volumes.map(b=>b.position.clone());stage.animate(t=>volumes.forEach((b,i)=>{b.position.y=starts[i].y-(1-t)*.28;b.rotation.y=angles[i][1]+(1-t)*.12}),1100);
  stage.resize();return {focus,choose,setMotion:stage.setMotion,destroy(){container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);container.removeEventListener('click',click);stage.destroy()}};
}
