import test from 'node:test';
import assert from 'node:assert/strict';
import {validCode,move,isFree,ROOM} from '../navigation.mjs';

test('only the exact six-digit entrance code unlocks',()=>{
  assert.equal(validCode('175837'),true);
  for(const value of ['', '000000', '17583', '1758370', ' 175837', '175837\n']) assert.equal(validCode(value),false);
});
test('first person forward direction follows heading, with equal diagonal speed',()=>{
  assert.deepEqual(move({x:0,z:0},0,1,0,1,[]),{x:0,z:-1});
  const east=move({x:0,z:0},0,1,-Math.PI/2,1,[]);
  assert.ok(Math.abs(east.x-1)<1e-9);
  const diagonal=move({x:0,z:0},1,1,0,1,[]);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9);
});
test('thin obstacles cannot be tunnelled through and camera slides along them',()=>{
  const wall=[{minX:.5,maxX:.55,minZ:-3,maxZ:3}];
  const p=move({x:0,z:0},1,1,0,2,wall);
  assert.ok(p.x<.39); assert.ok(p.z<-1); assert.equal(isFree(p.x,p.z,wall),true);
});
test('room limits contain the visitor in all directions',()=>{
  for(const [x,z,yaw] of [[8,0,-Math.PI/2],[-8,0,Math.PI/2],[0,5,Math.PI],[0,-5,0]]){
    const p=move({x,z},0,1,yaw,20,[]);
    assert.ok(p.x>=ROOM.minX && p.x<=ROOM.maxX && p.z>=ROOM.minZ && p.z<=ROOM.maxZ);
  }
});
