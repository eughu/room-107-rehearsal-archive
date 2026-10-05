// Metres, glTF Y-up. The source room is approximately 17.2 × 11.4 m.
export const ROOM = { minX:-8.27, maxX:8.27, minZ:-5.37, maxZ:5.37 };
export const EYE_HEIGHT = 1.65;
export const START = { x:-7.2, z:0.55, yaw:-Math.PI/2, pitch:0 };
// Small camera clearance accommodates the tightly staggered archival seating.
export const RADIUS = 0.12;

export function footprint(points) {
  const sorted=points.map(p=>({x:p.x,z:p.z})).sort((a,b)=>a.x-b.x||a.z-b.z);
  const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  lower.pop();upper.pop();return lower.concat(upper);
}

function circleHitsPolygon(x,z,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<RADIUS*RADIUS)return true;
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}

export function isFree(x, z, obstacles, bounds=ROOM) {
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return false;
  return !obstacles.some(b => {
    if(b.polygon)return circleHitsPolygon(x,z,b.polygon);
    const dx=x-Math.max(b.minX,Math.min(x,b.maxX));
    const dz=z-Math.max(b.minZ,Math.min(z,b.maxZ));
    return dx*dx+dz*dz < RADIUS*RADIUS;
  });
}

export function move(position, strafe, forward, yaw, distance, obstacles) {
  const length=Math.hypot(strafe,forward);
  if (!length) return {...position};
  const scale=distance/Math.max(1,length);
  const dx=(Math.cos(yaw)*strafe-Math.sin(yaw)*forward)*scale;
  const dz=(-Math.sin(yaw)*strafe-Math.cos(yaw)*forward)*scale;
  // Small substeps prevent tunnelling through chair legs and thin furniture.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.06));
  let {x,z}=position;
  for (let i=0;i<steps;i++) {
    if (isFree(x+dx/steps,z,obstacles)) x+=dx/steps;
    if (isFree(x,z+dz/steps,obstacles)) z+=dz/steps;
  }
  return {x,z};
}

export function validCode(value) { return /^[0-9]{6}$/.test(value) && value==='175837'; }
