import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.min.js';
import {isFree,START,footprint} from '../navigation.mjs';

test('actual GLB has a clear spawn and connected passage to the windows',()=>{
  const buffer=fs.readFileSync(new URL('../rehearsal-room.glb',import.meta.url));
  const g=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
  const objects=g.nodes.map(n=>{
    const o=new T.Object3D();
    if(n.matrix)o.applyMatrix4(new T.Matrix4().fromArray(n.matrix));
    else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}
    return o;
  });
  g.nodes.forEach((n,i)=>n.children?.forEach(c=>objects[i].add(objects[c])));
  const root=new T.Group();g.scenes[g.scene??0].nodes.forEach(i=>root.add(objects[i]));root.updateMatrixWorld(true);
  const obstacles=[];
  g.nodes.forEach((n,i)=>{
    if(n.mesh===undefined||!/椅|凳|琴体|柜|鼓|乐器箱|提琴|谱板|谱架/.test(n.name))return;
    const local=new T.Box3();
    for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];local.union(new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)));}
    const box=local.clone().applyMatrix4(objects[i].matrixWorld);
    if(box.min.y>1.65||box.max.y<.23||box.max.x-box.min.x<.08||box.max.z-box.min.z<.08)return;
    const corners=[];
    for(const x of [local.min.x,local.max.x])for(const y of [local.min.y,local.max.y])for(const z of [local.min.z,local.max.z])corners.push(new T.Vector3(x,y,z).applyMatrix4(objects[i].matrixWorld));
    obstacles.push({polygon:footprint(corners)});
  });
  assert.ok(obstacles.length>40,'Furniture collision geometry is present');
  assert.ok(isFree(START.x,START.z,obstacles),'Start position is clear of furniture');
  const step=.1,seen=new Set(['0,0']),queue=[[0,0]];
  let reachedWindows=false;
  for(let q=0;q<queue.length&&!reachedWindows;q++){
    const [i,j]=queue[q];
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ni=i+di,nj=j+dj,key=ni+','+nj,x=START.x+ni*step,z=START.z+nj*step;
      if(seen.has(key)||!isFree(x,z,obstacles))continue;
      seen.add(key);queue.push([ni,nj]);if(x>7){reachedWindows=true;break;}
    }
  }
  assert.ok(reachedWindows,`Window-side passage must be reachable; visited ${queue.length} positions`);
});
