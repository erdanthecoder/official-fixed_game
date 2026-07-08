// ================= 3D World: islands, portals, player, effects =================
import * as THREE from "three";
import { State, emit, rand, pick } from "./core.js";
import { SFX } from "./audio.js";
import { t } from "./i18n.js";

export const ISLANDS = [
  { id:"hub",       key:"hub",        emoji:"🏝", pos:[0,0,0],     color:0x6ac47a, r:14, portal:false },
  { id:"math",      key:"mathIsle",   emoji:"➗", pos:[34,0,-10],  color:0x4fa3ff, r:9 },
  { id:"english",   key:"englishIsle",emoji:"🔤", pos:[24,0,26],   color:0xff9d5c, r:9 },
  { id:"russian",   key:"russianIsle",emoji:"🪆", pos:[-6,0,36],   color:0xe0607a, r:9 },
  { id:"flappy",    key:"flappyIsle", emoji:"🐤", pos:[-30,0,20],  color:0xffe14d, r:9 },
  { id:"minecraft", key:"minecraftIsle",emoji:"⛏", pos:[-38,0,-14],color:0x8bc34a, r:9 },
  { id:"dodge",     key:"dodgeIsle",  emoji:"🔴", pos:[-20,0,-36], color:0xff5d5d, r:10 },
  { id:"hide",      key:"hideIsle",   emoji:"🌲", pos:[12,0,-40],  color:0x2f9e6a, r:10 },
  { id:"quiz",      key:"quizIsle",   emoji:"❓", pos:[44,0,20],   color:0xb07cff, r:8 },
  { id:"teacher",   key:"teacherIsle",emoji:"🍎", pos:[0,0,-58],   color:0xff8c42, r:11 },
];

let renderer, scene, camera, clock, player, playerYaw=0, velY=0, onGround=true;
let portals=[], npcs=[], fxGroups=[], water;
let onInteractCb=()=>{}, onNearbyCb=()=>{};
let nearby=null, running=false, paused=true;
const input = { fwd:0, turn:0, jumpReq:false, touchFwd:0, touchTurn:0 };
const keys = {};
const GRAVITY = 26, SPAWN = new THREE.Vector3(0,1.6,10);

function makeLabel(text){
  const c=document.createElement("canvas"); c.width=512; c.height=128;
  const g=c.getContext("2d");
  g.fillStyle="rgba(8,22,46,.82)"; roundRect(g,6,6,500,116,26); g.fill();
  g.strokeStyle="rgba(255,255,255,.5)"; g.lineWidth=4; roundRect(g,6,6,500,116,26); g.stroke();
  g.fillStyle="#fff"; g.font="bold 54px Segoe UI, Arial"; g.textAlign="center"; g.textBaseline="middle";
  g.fillText(text, 256, 66);
  const tex=new THREE.CanvasTexture(c); tex.anisotropy=4;
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  spr.scale.set(10,2.5,1);
  return spr;
}
function roundRect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }

function tree(x,z){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.35,1.6,6), new THREE.MeshStandardMaterial({color:0x7a4a25}));
  trunk.position.y=0.8; trunk.castShadow=true; g.add(trunk);
  const leafMat=new THREE.MeshStandardMaterial({color:pick([0x2f9e4f,0x3ab06a,0x279055])});
  for(let i=0;i<3;i++){ const c=new THREE.Mesh(new THREE.ConeGeometry(1.4-i*0.28,1.4,7), leafMat); c.position.y=1.7+i*0.7; c.castShadow=true; g.add(c); }
  g.position.set(x,0,z); return g;
}
function rock(x,z){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.4,0.9),0), new THREE.MeshStandardMaterial({color:0x8a8f99,flatShading:true}));
  m.position.set(x,0.3,z); m.rotation.set(rand(0,3),rand(0,3),rand(0,3)); m.castShadow=true; return m;
}

function buildIsland(def){
  const g=new THREE.Group(); g.position.set(def.pos[0],def.pos[1],def.pos[2]);
  // land
  const land=new THREE.Mesh(new THREE.CylinderGeometry(def.r,def.r*0.7,3,24), new THREE.MeshStandardMaterial({color:0x6b4a2f}));
  land.position.y=-1.5; land.receiveShadow=true; g.add(land);
  const grass=new THREE.Mesh(new THREE.CylinderGeometry(def.r,def.r,0.6,24), new THREE.MeshStandardMaterial({color:def.color}));
  grass.position.y=0.3; grass.receiveShadow=true; g.add(grass);
  // decorations
  const n=Math.floor(def.r/2);
  for(let i=0;i<n;i++){ const a=rand(0,6.28), rr=rand(def.r*0.3,def.r*0.85); (Math.random()<0.6?g.add(tree(Math.cos(a)*rr,Math.sin(a)*rr)):g.add(rock(Math.cos(a)*rr,Math.sin(a)*rr))); }
  scene.add(g);

  if (def.portal!==false){
    const portal=new THREE.Group(); portal.position.set(def.pos[0],2.4,def.pos[2]+def.r*0.2);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.9,0.35,12,32),
      new THREE.MeshStandardMaterial({color:def.color, emissive:def.color, emissiveIntensity:1.1}));
    portal.add(ring);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(1.7,32),
      new THREE.MeshBasicMaterial({color:def.color, transparent:true, opacity:0.35, side:THREE.DoubleSide}));
    portal.add(disc);
    const label=makeLabel(def.emoji+" "+t(def.key)); label.position.y=3.1; portal.add(label);
    portal.userData={def, ring, label, disc};
    scene.add(portal); portals.push(portal);
  }
  return g;
}

function buildNPC(color){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,4,10), new THREE.MeshStandardMaterial({color}));
  body.position.y=0.9; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.32,12,10), new THREE.MeshStandardMaterial({color:0xffd9a8}));
  head.position.y=1.7; head.castShadow=true; g.add(head);
  g.userData={ target:new THREE.Vector3(rand(-10,10),0,rand(-10,10)), baseY:0, cheer:0 };
  g.position.set(rand(-10,10),0,rand(-10,10));
  scene.add(g); npcs.push(g); return g;
}

export function initWorld({canvas, onInteract, onNearby}){
  onInteractCb=onInteract||onInteractCb; onNearbyCb=onNearby||onNearbyCb;
  renderer=new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x87c5ff);
  scene.fog=new THREE.Fog(0x87c5ff, 60, 150);

  camera=new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 500);
  camera.position.set(0,7,22); camera.lookAt(0,1.6,0);
  clock=new THREE.Clock();

  const hemi=new THREE.HemisphereLight(0xcfe8ff, 0x556b3f, 0.9); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(30,50,20);
  sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-90; sun.shadow.camera.right=90; sun.shadow.camera.top=90; sun.shadow.camera.bottom=-90;
  sun.shadow.camera.far=200; scene.add(sun); scene.userData.sun=sun;

  // ocean
  water=new THREE.Mesh(new THREE.PlaneGeometry(600,600,1,1),
    new THREE.MeshStandardMaterial({color:0x1f77c9, transparent:true, opacity:0.9, metalness:0.2, roughness:0.4}));
  water.rotation.x=-Math.PI/2; water.position.y=-2.2; water.receiveShadow=true; scene.add(water);

  ISLANDS.forEach(buildIsland);
  ["#ff5d5d","#4fa3ff","#3ad6a0","#ffd23f","#b07cff","#ff8c42"].forEach(c=>buildNPC(new THREE.Color(c).getHex()));

  // player
  player=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.4,0.9,4,12), new THREE.MeshStandardMaterial({color:0x3ad6a0}));
  body.position.y=1.0; body.castShadow=true; player.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.38,16,12), new THREE.MeshStandardMaterial({color:0xffd9a8}));
  head.position.y=1.9; head.castShadow=true; player.add(head);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(0.42,0.4,16), new THREE.MeshStandardMaterial({color:0xffd23f}));
  cap.position.y=2.2; player.add(cap);
  player.position.copy(SPAWN); scene.add(player);

  addEventListener("resize", onResize);
  addEventListener("keydown", e=>{ keys[e.code]=true; if(e.code==="KeyE" && !paused){ e.preventDefault(); if(nearby) onInteractCb(nearby); } });
  addEventListener("keyup", e=>{ keys[e.code]=false; });
  running=true; loop();
}

function onResize(){ if(!renderer) return; renderer.setSize(innerWidth,innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }

export function setPaused(p){ paused=p; if(!p) clock.getDelta(); }
export function isPaused(){ return paused; }
export function setInput(fwd, turn){ input.touchFwd=fwd; input.touchTurn=turn; }
export function requestJump(){ input.jumpReq=true; }
export function triggerInteract(){ if(nearby) onInteractCb(nearby); }
export function getNearby(){ return nearby; }

export function teleport(id){
  const def=ISLANDS.find(i=>i.id===id); if(!def) return;
  player.position.set(def.pos[0], 1.6, def.pos[2] + def.r + 3);
  playerYaw=0; velY=0; SFX.portal(); // yaw 0 faces -z, toward the island's portal
}

function readKeys(){
  let f=0,tr=0;
  if(keys["KeyW"]||keys["ArrowUp"]) f+=1;
  if(keys["KeyS"]||keys["ArrowDown"]) f-=1;
  if(keys["KeyA"]||keys["ArrowLeft"]) tr+=1;
  if(keys["KeyD"]||keys["ArrowRight"]) tr-=1;
  if(keys["Space"]) input.jumpReq=true;
  // keyboard wins; otherwise fall back to touch joystick values
  input.fwd  = f  !== 0 ? f  : input.touchFwd;
  input.turn = tr !== 0 ? tr : input.touchTurn;
}

function updateSky(tsec){
  if(State.skyMode==="rainbow"){ const h=(tsec*0.1)%1; scene.background.setHSL(h,0.6,0.7); if(scene.fog) scene.fog.color.copy(scene.background); }
  else if(State.skyMode==="disco"){ const h=(tsec*1.5)%1; scene.background.setHSL(h,0.9,0.5); scene.userData.sun.color.setHSL((tsec*2)%1,0.8,0.6); }
  else { scene.background.setHex(0x87c5ff); if(scene.fog) scene.fog.color.setHex(0x87c5ff); scene.userData.sun.color.setHex(0xffffff); }
}

function loop(){
  if(!running) return;
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),0.05);
  const tsec=clock.elapsedTime;
  water.position.y=-2.2+Math.sin(tsec*1.2)*0.08;
  portals.forEach(p=>{ p.userData.ring.rotation.z+=dt*1.2; p.userData.disc.material.opacity=0.28+Math.sin(tsec*3)*0.12; p.userData.label.position.y=3.1+Math.sin(tsec*2)*0.15; });
  updateSky(tsec);
  updateFx(dt);

  if(!paused){
    readKeys();
    // scale from teacher effect
    const targetScale=State.playerScale;
    player.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale), 0.1);
    // turn & move
    playerYaw += input.turn * dt * 2.6;
    player.rotation.y = playerYaw;
    const mv = Math.max(-1, Math.min(1, input.fwd)) * 9 * State.speedBoost * dt;
    player.position.x -= Math.sin(playerYaw) * mv;
    player.position.z -= Math.cos(playerYaw) * mv;
    // jump & gravity
    if(input.jumpReq && onGround){ velY = 10 * State.jumpBoost; onGround=false; SFX.jump(); }
    input.jumpReq=false;
    velY -= GRAVITY * State.gravityScale * dt;
    player.position.y += velY*dt;
    const groundY = groundHeightAt(player.position.x, player.position.z);
    if(player.position.y <= groundY){ player.position.y=groundY; velY=0; onGround=true; }
    // keep from falling into deep ocean: soft clamp radius
    const dist=Math.hypot(player.position.x, player.position.z);
    // portal proximity
    let best=null, bd=4.2;
    portals.forEach(p=>{ const d=Math.hypot(player.position.x-p.position.x, player.position.z-p.position.z); if(d<bd){bd=d;best=p.userData.def.id;} });
    if(best!==nearby){ nearby=best; onNearbyCb(nearby); }
    // camera follow
    const camDist=9, camH=5.2;
    const cx=player.position.x + Math.sin(playerYaw)*camDist;
    const cz=player.position.z + Math.cos(playerYaw)*camDist;
    camera.position.lerp(new THREE.Vector3(cx, player.position.y+camH, cz), 0.12);
    camera.lookAt(player.position.x, player.position.y+1.6, player.position.z);
    // npcs wander + react
    npcs.forEach(n=>{
      const to=n.userData.target; const d=n.position.distanceTo(to);
      if(d<1){ n.userData.target.set(rand(-12,12),0,rand(-12,12)); }
      else { const dir=to.clone().sub(n.position).normalize(); n.position.addScaledVector(dir, dt*2.5); n.rotation.y=Math.atan2(dir.x,dir.z); }
      n.scale.lerp(new THREE.Vector3(State.playerScale,State.playerScale,State.playerScale),0.05);
      if(n.userData.cheer>0){ n.userData.cheer-=dt; n.position.y=Math.abs(Math.sin(tsec*12))*0.6; } else n.position.y=0;
    });
  }
  renderer.render(scene,camera);
}

// islands are flat discs at y≈0.6 within their radius; else ocean level
function groundHeightAt(x,z){
  for(const def of ISLANDS){ const d=Math.hypot(x-def.pos[0], z-def.pos[2]); if(d<def.r) return 0.6; }
  return -1.4; // can wade slightly; acts as soft water floor
}

// ---------- Teacher visual effects ----------
export function cheerNPCs(){ npcs.forEach(n=>n.userData.cheer=1.4); }

export function fireworks(){
  SFX.firework();
  for(let b=0;b<3;b++){
    const origin=new THREE.Vector3(rand(-16,16), rand(10,16), rand(-16,16));
    const count=90, geo=new THREE.BufferGeometry();
    const pos=new Float32Array(count*3), vel=[];
    const col=new THREE.Color().setHSL(Math.random(),0.9,0.6);
    for(let i=0;i<count;i++){ pos[i*3]=origin.x; pos[i*3+1]=origin.y; pos[i*3+2]=origin.z;
      const dir=new THREE.Vector3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize().multiplyScalar(rand(3,8)); vel.push(dir); }
    geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(geo, new THREE.PointsMaterial({color:col, size:0.5, transparent:true}));
    scene.add(pts); fxGroups.push({type:"fw", obj:pts, vel, life:1.6, geo});
  }
  cheerNPCs();
}

export function starRain(){
  SFX.star();
  for(let i=0;i<40;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:starTex(), transparent:true}));
    s.scale.set(1.2,1.2,1); s.position.set(rand(-24,24), rand(14,26), rand(-24,24));
    scene.add(s); fxGroups.push({type:"star", obj:s, vy:rand(4,8), life:4});
  }
  cheerNPCs();
}
let _starTex=null;
function starTex(){ if(_starTex) return _starTex;
  const c=document.createElement("canvas"); c.width=c.height=64; const g=c.getContext("2d");
  g.fillStyle="#ffd23f"; g.font="52px serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText("⭐",32,36);
  _starTex=new THREE.CanvasTexture(c); return _starTex;
}
function updateFx(dt){
  for(let i=fxGroups.length-1;i>=0;i--){ const f=fxGroups[i]; f.life-=dt;
    if(f.type==="fw"){ const p=f.geo.attributes.position; for(let j=0;j<f.vel.length;j++){ f.vel[j].y-=9*dt; p.array[j*3]+=f.vel[j].x*dt; p.array[j*3+1]+=f.vel[j].y*dt; p.array[j*3+2]+=f.vel[j].z*dt; } p.needsUpdate=true; f.obj.material.opacity=Math.max(0,f.life/1.6); }
    else if(f.type==="star"){ f.obj.position.y-=f.vy*dt; f.obj.material.rotation+=dt*2; f.obj.material.opacity=Math.max(0,f.life/4); }
    if(f.life<=0){ scene.remove(f.obj); fxGroups.splice(i,1); }
  }
}
export function relabelPortals(){ // when language changes
  portals.forEach(p=>{ const def=p.userData.def; const spr=makeLabel(def.emoji+" "+t(def.key)); spr.position.copy(p.userData.label.position); p.remove(p.userData.label); p.add(spr); p.userData.label=spr; });
}
