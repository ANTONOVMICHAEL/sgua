import * as THREE from 'three';

// Same scene graph in both paths. The software path projects real mesh triangles;
// it is an accessible contingency, never evidence of successful GPU validation.
class PaperRenderer {
  constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d');this.pixelRatio=1;this.info={render:{calls:0,triangles:0},memory:{}};this.mode='software';}
  setPixelRatio(n){this.pixelRatio=1.25}
  setSize(w,h){this.pixelRatio=Math.min(1.25,1800/w,1400/h);this.w=w;this.h=h;this.domElement.width=Math.round(w*this.pixelRatio);this.domElement.height=Math.round(h*this.pixelRatio)}
  render(scene,camera){
    const ctx=this.ctx,w=this.w,h=this.h;ctx.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);ctx.clearRect(0,0,w,h);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),triangles=[];
    const light=new THREE.Vector3(-.45,.8,.9).normalize();
    scene.traverseVisible(o=>{
      if(!o.isMesh||o.material?.isShadowMaterial)return;
      const geo=o.geometry,pos=geo.attributes.position,uv=geo.attributes.uv,idx=geo.index;
      if(!pos)return;
      const projected=[],worlds=[];
      for(let j=0;j<pos.count;j++){const p=new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(o.matrixWorld);worlds.push(p);const q=p.clone().applyMatrix4(vp);projected.push([(q.x*.5+.5)*w,(-q.y*.5+.5)*h,q.z])}
      const count=idx?idx.count:pos.count;
      for(let j=0;j<count;j+=3){
        let material=o.material;
        if(Array.isArray(material)){const group=geo.groups.find(g=>j>=g.start&&j<g.start+g.count);material=material[group?.materialIndex||0]}
        if(!material||material.opacity===0)continue;
        const ids=[0,1,2].map(k=>idx?idx.getX(j+k):j+k),p=ids.map(k=>projected[k]);
        if(p.some(v=>v[2]<-1||v[2]>1))continue;
        const area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
        if(Math.abs(area)<.02||(material.side!==THREE.DoubleSide&&area>0))continue;
        const normal=new THREE.Vector3().subVectors(worlds[ids[1]],worlds[ids[0]]).cross(new THREE.Vector3().subVectors(worlds[ids[2]],worlds[ids[0]])).normalize();
        const shade=material.isMeshBasicMaterial?1:.60+.40*Math.max(0,normal.dot(light));
        const color=material.color?.clone()||new THREE.Color('white');color.multiplyScalar(shade);color.convertLinearToSRGB();
        triangles.push({p,z:(p[0][2]+p[1][2]+p[2][2])/3,m:material,color:'#'+color.getHexString(THREE.LinearSRGBColorSpace),shade,uv:uv?ids.map(k=>[uv.getX(k),uv.getY(k)]):null});
      }
    });
    triangles.sort((a,b)=>{const ta=a.m.depthWrite===false,tb=b.m.depthWrite===false;return ta!==tb?(ta?-1:1):ta?b.z-a.z:a.z-b.z});
    const W=this.domElement.width,H=this.domElement.height,r=this.pixelRatio;
    const frame=ctx.createImageData(W,H),out=frame.data,depth=new Float32Array(W*H);depth.fill(2);
    this.textureCache??=new WeakMap();
    for(const t of triangles){
      const {m}=t,p=t.p.map(v=>[v[0]*r,v[1]*r,v[2]]),tex=m.map?.image;
      let data=null;
      if(tex?.width){data=this.textureCache.get(tex);if(!data){const cc=document.createElement('canvas');cc.width=tex.width;cc.height=tex.height;const cx=cc.getContext('2d',{willReadFrequently:true});cx.drawImage(tex,0,0);data={pixels:cx.getImageData(0,0,cc.width,cc.height).data,w:cc.width,h:cc.height};this.textureCache.set(tex,data)}}
      const minX=Math.max(0,Math.floor(Math.min(p[0][0],p[1][0],p[2][0]))),maxX=Math.min(W-1,Math.ceil(Math.max(p[0][0],p[1][0],p[2][0]))),minY=Math.max(0,Math.floor(Math.min(p[0][1],p[1][1],p[2][1]))),maxY=Math.min(H-1,Math.ceil(Math.max(p[0][1],p[1][1],p[2][1])));
      const den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);if(Math.abs(den)<.0001)continue;
      const hex=parseInt(t.color.slice(1),16),red=hex>>16,green=(hex>>8)&255,blue=hex&255,shade=m.isMeshBasicMaterial?1:.74+.26*t.shade,opacity=m.opacity??1;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const a=((p[1][1]-p[2][1])*(x+.5-p[2][0])+(p[2][0]-p[1][0])*(y+.5-p[2][1]))/den;
        const b=((p[2][1]-p[0][1])*(x+.5-p[2][0])+(p[0][0]-p[2][0])*(y+.5-p[2][1]))/den,c=1-a-b;
        if(a<-.00001||b<-.00001||c<-.00001)continue;
        const z=a*p[0][2]+b*p[1][2]+c*p[2][2],offset=y*W+x;if(z>depth[offset]+.0000001)continue;
        let rr=red,gg=green,bb=blue,alpha=opacity;
        if(data&&t.uv){const u=a*t.uv[0][0]+b*t.uv[1][0]+c*t.uv[2][0],v=a*t.uv[0][1]+b*t.uv[1][1]+c*t.uv[2][1];const tx=Math.min(data.w-1,Math.max(0,Math.floor(u*(data.w-1)))),ty=Math.min(data.h-1,Math.max(0,Math.floor((1-v)*(data.h-1)))),ti=(ty*data.w+tx)*4;rr=data.pixels[ti]*shade;gg=data.pixels[ti+1]*shade;bb=data.pixels[ti+2]*shade;alpha*=data.pixels[ti+3]/255}
        if(alpha<.001)continue;
        const oi=offset*4,oldAlpha=out[oi+3]/255,newAlpha=alpha+oldAlpha*(1-alpha),back=oldAlpha*(1-alpha);
        out[oi]=(rr*alpha+out[oi]*back)/newAlpha;out[oi+1]=(gg*alpha+out[oi+1]*back)/newAlpha;out[oi+2]=(bb*alpha+out[oi+2]*back)/newAlpha;out[oi+3]=newAlpha*255;if(m.depthWrite!==false)depth[offset]=z;
      }
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(frame,0,0);this.info.render.triangles=triangles.length;this.info.render.calls=1;
  }

  dispose(){this.domElement.width=this.domElement.height=1}
}

export function createStage(container,{span=10.5,look=[0,1.3,0],eye=[3,4,11]}={}){
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-span/2,span/2,3,-3,.1,100);camera.position.set(...eye);camera.lookAt(...look);
  let renderer;const canvas=document.createElement('canvas');
  try{const context=canvas.getContext('webgl2',{alpha:true,antialias:true});if(context)renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true})}catch{}
  if(!renderer)renderer=new PaperRenderer();else{
    renderer.mode='webgl';renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.domElement.setAttribute('aria-hidden','true');container.append(renderer.domElement);container.dataset.renderer=renderer.mode;
  scene.add(new THREE.HemisphereLight('#fffdf5','#a3aaa1',2.2));
  const key=new THREE.DirectionalLight('#fff3dc',3.5);key.position.set(-5,9,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:40});key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight('#dce6ec',1.1);fill.position.set(6,4,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.ShadowMaterial({opacity:.13}));floor.rotation.x=-Math.PI/2;floor.position.y=-.018;floor.receiveShadow=true;scene.add(floor);
  let alive=true,raf=0,animation=null;const reduced=matchMedia('(prefers-reduced-motion: reduce)');let motion=true;
  const draw=()=>{if(alive)renderer.render(scene,camera)};
  function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);const half=span/2;camera.left=-half;camera.right=half;camera.top=half*h/w;camera.bottom=-half*h/w;camera.updateProjectionMatrix();draw()}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const lost=e=>{e.preventDefault();if(!alive)return;const old=renderer;renderer=new PaperRenderer();old.domElement.replaceWith(renderer.domElement);old.dispose();container.dataset.renderer='software';if(!container.querySelector('.render-note')){const note=document.createElement('span');note.className='render-note';note.textContent='Резервная графика · WebGL недоступен';container.append(note)}resize()};if(renderer.mode==='webgl')renderer.domElement.addEventListener('webglcontextlost',lost);
  function animate(update,duration=1000,done){if(raf)cancelAnimationFrame(raf);const start=performance.now(),d=motion&&!reduced.matches?duration:0;animation={update,done};
    function tick(now){if(!alive)return;const p=d?Math.min(1,(now-start)/d):1;const t=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;update(t);draw();if(p<1)raf=requestAnimationFrame(tick);else{raf=0;animation=null;done?.()}}
    raf=requestAnimationFrame(tick);
  }
  function setMotion(v){motion=v;if(!motion&&animation){cancelAnimationFrame(raf);raf=0;const a=animation;animation=null;a.update(1);draw();a.done?.()}}
  const change=()=>{if(reduced.matches&&animation){cancelAnimationFrame(raf);const a=animation;animation=null;raf=0;a.update(1);draw();a.done?.()}};reduced.addEventListener('change',change);
  return {scene,camera,get renderer(){return renderer},draw,resize,animate,setMotion,get motion(){return motion&&!reduced.matches},destroy(){alive=false;if(raf)cancelAnimationFrame(raf);observer.disconnect();reduced.removeEventListener('change',change);const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m)});materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose()});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove()}};
}

export function softShadow(parent,x,z,sx=2,sz=1,opacity=.24){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,62);g.addColorStop(0,`rgba(34,39,32,${opacity})`);g.addColorStop(.4,`rgba(34,39,32,${opacity*.5})`);g.addColorStop(1,'rgba(34,39,32,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));p.rotation.x=-Math.PI/2;p.position.set(x,.005,z);parent.add(p);return p;
}
