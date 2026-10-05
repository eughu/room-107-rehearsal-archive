import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { EYE_HEIGHT, START, isFree, move, validCode, footprint } from './navigation.mjs';

const $=s=>document.querySelector(s);
const shell=$('#walkthrough'), host=$('#room'), gate=$('#entry-gate'), hud=$('.walk-hud');
const input=$('#door-code'), feedback=$('#lock-feedback'), unlock=$('#unlock');
const status=$('#load-status'), joystick=$('#joystick'), knob=$('#joystick-knob');
shell.dataset.engine='three';
let renderer, scene, camera, ready=false, unlocked=false, yaw=START.yaw, pitch=0;
let model, environmentTarget, obstacles=[], start={...START}, keys=new Set(), stick={x:0,y:0};
let dragging=null, stickPointer=null, lastTime=0, lastTelemetry=0, messageTimer;
const coarse=matchMedia('(pointer:coarse)').matches;
const resetInput=()=>{ keys.clear(); stick={x:0,y:0}; dragging=null; stickPointer=null; knob.style.transform=''; };
const announce=message=>{ clearTimeout(messageTimer); $('#walk-status').textContent=message; messageTimer=setTimeout(()=>$('#walk-status').textContent='',5000); };

function setCameraStart() {
  resetInput(); yaw=START.yaw; pitch=START.pitch;
  camera.position.set(start.x,EYE_HEIGHT,start.z); camera.rotation.set(pitch,yaw,0,'YXZ');
}

function fail(error) {
  console.error('Room 107 viewer:',error);
  ready=false; unlock.disabled=true; unlock.textContent='空间暂时未能打开';
  status.textContent='载入失败，请检查网络后重试；也可以下载原始模型。';
  $('#retry-load').hidden=false;
}
$('#retry-load').addEventListener('click',()=>location.reload());

function initialize() {
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.5:2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);
  const canvas=renderer.domElement;
  canvas.tabIndex=-1;
  canvas.setAttribute('aria-label','室内漫游：拖动环顾，WASD 或方向键行走，Shift 慢走');
  canvas.setAttribute('aria-describedby','walk-help');
  scene=new THREE.Scene(); scene.background=new THREE.Color('#50483e');
  camera=new THREE.PerspectiveCamera(65,1,0.045,70);
  const pmrem=new THREE.PMREMGenerator(renderer), roomEnv=new RoomEnvironment();
  environmentTarget=pmrem.fromScene(roomEnv,0.04);
  scene.environment=environmentTarget.texture; scene.environmentIntensity=0.55;
  roomEnv.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff5e0,0x8f8174,2.5));
  const daylight=new THREE.DirectionalLight(0xfff8e9,1.8);
  daylight.position.set(7,5,1); scene.add(daylight);
  const fill=new THREE.DirectionalLight(0xe3ecff,0.75);
  fill.position.set(-5,3,-3); scene.add(fill);
  new ResizeObserver(()=>{
    const {width,height}=host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect=width/height; camera.fov=camera.aspect<0.8?80:65; camera.updateProjectionMatrix();
    if (ready) renderer.render(scene,camera);
  }).observe(host);
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault(); relock(); fail(new Error('WebGL context lost'));
  });
  canvas.addEventListener('pointerdown',event=>{
    if (!unlocked || event.button!==0) return;
    canvas.focus({preventScroll:true});
    dragging={id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if (!unlocked || dragging?.id!==event.pointerId) return;
    yaw-=(event.clientX-dragging.x)*0.003;
    pitch=THREE.MathUtils.clamp(pitch-(event.clientY-dragging.y)*0.003,-1.3,1.3);
    dragging.x=event.clientX; dragging.y=event.clientY;
  });
  const stopLook=event=>{ if(dragging?.id===event.pointerId) dragging=null; };
  canvas.addEventListener('pointerup',stopLook); canvas.addEventListener('pointercancel',stopLook); canvas.addEventListener('lostpointercapture',stopLook);
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  renderer.setAnimationLoop(frame);
  loadModel();
}

function loadModel() {
  new GLTFLoader().load('rehearsal-room.glb',gltf=>{
    try {
      model=gltf.scene; scene.add(model); model.updateMatrixWorld(true);
      // Use actual world-space furniture bounds, not an assumed regular seat grid.
      const names=/椅|凳|琴体|柜|鼓|乐器箱|提琴|谱板|谱架/;
      model.traverse(object=>{
        if (!object.isMesh || !names.test(object.name)) return;
        const box=new THREE.Box3().setFromObject(object);
        if (box.min.y>1.65 || box.max.y<0.23 || box.max.x-box.min.x<0.08 || box.max.z-box.min.z<0.08) return;
        object.geometry.computeBoundingBox();
        const local=object.geometry.boundingBox, corners=[];
        for(const x of [local.min.x,local.max.x])for(const y of [local.min.y,local.max.y])for(const z of [local.min.z,local.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld));
        obstacles.push({minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z,polygon:footprint(corners)});
      });
      // The archive's camera marks a clear aisle. Validate before placing the visitor.
      if (!isFree(start.x,start.z,obstacles)) {
        let found=false;
        for(let x=-7.6;x<-4&&!found;x+=0.3) for(let z=-4.6;z<4.7;z+=0.3) {
          if(isFree(x,z,obstacles)){ start={...START,x,z};found=true;break; }
        }
        if(!found) throw new Error('No clear entrance position found');
      }
      setCameraStart(); ready=true; unlock.disabled=false; unlock.textContent='解锁 · 回到排练室';
      status.textContent='空间已就绪'; shell.dataset.ready='true';
      shell.dataset.obstacles=String(obstacles.length);
      renderer.render(scene,camera);
    } catch(error) { fail(error); }
  },event=>{
    status.textContent=event.total?`正在载入空间 · ${Math.round(event.loaded/event.total*100)}%`:'正在载入空间…';
  },fail);
}

function unlockRoom(event) {
  event.preventDefault();
  if(!ready) return;
  if(!validCode(input.value)) {
    input.value=''; input.setAttribute('aria-invalid','true');
    feedback.classList.add('error'); feedback.textContent='密码不对，再想想那串熟悉的数字。';
    input.focus({preventScroll:true}); return;
  }
  unlocked=true; input.value=''; input.removeAttribute('aria-invalid'); feedback.classList.remove('error');
  gate.hidden=true; hud.hidden=false; shell.dataset.state='walking';
  setCameraStart(); renderer.domElement.tabIndex=0; renderer.domElement.focus({preventScroll:true});
  shell.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  if(coarse) $('#walk-help').textContent='左下摇杆行走 · 在画面上拖动环顾四周';
  announce('咔哒。欢迎回来，排练就要开始了。');
}

function relock() {
  unlocked=false; resetInput(); gate.hidden=false; hud.hidden=true; shell.dataset.state='locked';
  if(renderer) renderer.domElement.tabIndex=-1;
  input.value=''; input.removeAttribute('aria-invalid'); feedback.classList.remove('error');
  feedback.textContent='只有熟悉这里的人，才知道这串数字。';
  clearTimeout(messageTimer); $('#walk-status').textContent='';
}
$('#lock-form').addEventListener('submit',unlockRoom);
input.addEventListener('input',()=>{ input.value=input.value.replace(/\D/g,'').slice(0,6); input.removeAttribute('aria-invalid'); feedback.classList.remove('error'); });
document.querySelectorAll('[data-digit]').forEach(button=>button.addEventListener('click',()=>{
  input.value=(input.value+button.dataset.digit).slice(0,6); input.removeAttribute('aria-invalid'); feedback.classList.remove('error');
}));
$('#clear-code').addEventListener('click',()=>{ input.value=''; });
$('#delete-code').addEventListener('click',()=>{ input.value=input.value.slice(0,-1); });
$('#home').addEventListener('click',()=>{ if(unlocked){setCameraStart();renderer.domElement.focus({preventScroll:true});announce('回到室内起点。');} });
$('#relock').addEventListener('click',()=>{ relock(); $('#unlock').focus({preventScroll:true}); });
$('#fullscreen').addEventListener('click',async()=>{
  try {
    if(document.fullscreenElement) await document.exitFullscreen();
    else if(shell.requestFullscreen) await shell.requestFullscreen();
    else shell.classList.toggle('expanded');
  } catch { shell.classList.toggle('expanded'); }
  $('#fullscreen').textContent=(document.fullscreenElement || shell.classList.contains('expanded'))?'↙ 退出全屏':'⛶ 全屏';
});
document.addEventListener('fullscreenchange',()=>{ resetInput(); $('#fullscreen').textContent=document.fullscreenElement?'↙ 退出全屏':'⛶ 全屏'; });

const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight']);
const keyCode=event=>movementKeys.has(event.code)?event.code:({w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',shift:'ShiftLeft'}[event.key?.toLowerCase()]||event.key);
window.addEventListener('keydown',event=>{
  const code=keyCode(event);
  if(code==='Escape'){ resetInput(); shell.classList.remove('expanded'); $('#fullscreen').textContent='⛶ 全屏'; }
  if(!unlocked || !shell.contains(document.activeElement) || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
  if(movementKeys.has(code)){
    event.preventDefault(); keys.add(code);
    // Very quick key taps can begin and end between rendered frames.
    if(!event.repeat){
      const step={KeyW:[0,1],ArrowUp:[0,1],KeyS:[0,-1],ArrowDown:[0,-1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]}[code];
      if(step){const p=move(camera.position,...step,yaw,0.04,obstacles);camera.position.x=p.x;camera.position.z=p.z;}
    }
  }
});
window.addEventListener('keyup',event=>keys.delete(keyCode(event)));
window.addEventListener('blur',resetInput);
document.addEventListener('visibilitychange',resetInput);
document.addEventListener('focusin',event=>{ if(!shell.contains(event.target)) resetInput(); });

function updateStick(event) {
  const r=joystick.getBoundingClientRect(), dx=event.clientX-r.left-r.width/2, dy=event.clientY-r.top-r.height/2;
  const length=Math.hypot(dx,dy), scale=length>42?42/length:1;
  stick={x:dx*scale/42,y:dy*scale/42}; knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
}
joystick.addEventListener('pointerdown',event=>{
  if(!unlocked || event.target.closest('button')) return;
  event.preventDefault(); stickPointer=event.pointerId; joystick.setPointerCapture(event.pointerId); updateStick(event);
});
joystick.addEventListener('pointermove',event=>{ if(event.pointerId===stickPointer) updateStick(event); });
const stopStick=event=>{ if(event.pointerId===stickPointer){stickPointer=null;stick={x:0,y:0};knob.style.transform='';} };
joystick.addEventListener('pointerup',stopStick); joystick.addEventListener('pointercancel',stopStick); joystick.addEventListener('lostpointercapture',stopStick);
const directions={forward:[0,1],back:[0,-1],left:[-1,0],right:[1,0]};
document.querySelectorAll('[data-move]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    if(!unlocked)return; event.preventDefault();
    const [x,y]=directions[button.dataset.move]; stick={x,y:-y}; button.setPointerCapture(event.pointerId);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name,()=>{stick={x:0,y:0};});
  button.addEventListener('click',event=>{
    if(unlocked && event.detail===0){ const [x,y]=directions[button.dataset.move];const next=move(camera.position,x,y,yaw,0.3,obstacles);camera.position.x=next.x;camera.position.z=next.z; }
  });
});

function frame(time) {
  const dt=Math.min((time-lastTime)/1000,0.05); lastTime=time;
  if(!ready || !unlocked || document.hidden) return;
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
  const strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;
  const slow=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const next=move(camera.position,strafe,forward,yaw,dt*(slow?0.65:1.65),obstacles);
  camera.position.set(next.x,EYE_HEIGHT,next.z); camera.rotation.set(pitch,yaw,0,'YXZ');
  renderer.render(scene,camera);
  if(time-lastTelemetry>250){
    shell.dataset.position=`${next.x.toFixed(3)},${EYE_HEIGHT},${next.z.toFixed(3)}`;
    shell.dataset.heading=`${yaw.toFixed(3)},${pitch.toFixed(3)}`; lastTelemetry=time;
  }
}
try { initialize(); } catch(error) { fail(error); }
