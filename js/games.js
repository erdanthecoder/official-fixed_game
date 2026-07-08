// ================= Mini-games =================
import * as THREE from "three";
import { State, addStars, show, hide, randi, rand, pick, shuffle, toast } from "./core.js";
import { SFX } from "./audio.js";
import { t, getLang } from "./i18n.js";

function panel(){ return document.getElementById("modalPanel"); }
function openModal(){ show("modal"); }
function closeModal(onClose){ hide("modal"); panel().innerHTML=""; if(onClose) onClose(); }

// generic result screen
function resultScreen(earned, onDone, replay){
  panel().innerHTML="";
  const box=document.createElement("div"); box.className="center";
  box.innerHTML=`<h2>🎉</h2><p class="q-score">${t("youEarned")} <b>${earned}</b> ⭐ ${t("starsWord")}</p>`;
  const r=document.createElement("div"); r.className="row";
  const again=document.createElement("button"); again.className="big-btn"; again.textContent=t("playAgain"); again.onclick=()=>{ SFX.click(); replay(); };
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); back.onclick=()=>{ SFX.click(); closeModal(onDone); };
  r.append(again,back); box.append(r); panel().append(box);
  if(earned>0) addStars(earned);
  SFX.win();
}

// ---------------- Quiz engine ----------------
function runQuiz({makeQuestion, count=8, titleKey, sub}, onDone, replay){
  openModal();
  let i=0, score=0;
  function next(){
    if(i>=count){ resultScreen(score, onDone, replay); return; }
    const {q, answers, correct}=makeQuestion();
    panel().innerHTML="";
    const h=document.createElement("div");
    h.innerHTML=`<h2 class="center">${t(titleKey)}</h2>${sub?`<p class="center subtitle">${sub}</p>`:""}
      <p class="q-progress">${t("question")} ${i+1} ${t("of")} ${count} · ${t("score")}: ${score}</p>
      <div class="q-question">${q}</div>`;
    const grid=document.createElement("div"); grid.className="q-answers";
    answers.forEach((a,idx)=>{
      const b=document.createElement("button"); b.textContent=a;
      b.onclick=()=>{
        [...grid.children].forEach(c=>c.disabled=true);
        if(idx===correct){ b.classList.add("correct"); score++; SFX.correct(); toast(t("correct")); }
        else { b.classList.add("wrong"); grid.children[correct].classList.add("correct"); SFX.wrong(); toast(t("wrong")+" "+answers[correct]); }
        i++; setTimeout(next, 850);
      };
      grid.append(b);
    });
    h.append(grid);
    const back=document.createElement("button"); back.className="link-btn"; back.textContent=t("backToWorld");
    back.onclick=()=>closeModal(onDone); h.append(back);
    panel().append(h);
  }
  next();
}

// ---------------- Math ----------------
function mathQuestion(mode){
  const m = mode==="mixed" ? pick(["addition","subtraction","multiplication","division"]) : mode;
  let a,b,ans,op;
  if(m==="addition"){ a=randi(2,49); b=randi(2,49); ans=a+b; op="+"; }
  else if(m==="subtraction"){ a=randi(6,60); b=randi(1,a); ans=a-b; op="−"; }
  else if(m==="multiplication"){ a=randi(2,12); b=randi(2,12); ans=a*b; op="×"; }
  else { b=randi(2,12); ans=randi(2,12); a=b*ans; op="÷"; }
  const set=new Set([ans]);
  while(set.size<4){ const d=ans+randi(-6,6); if(d>=0 && d!==ans) set.add(d); }
  const answers=shuffle([...set]).map(String);
  return { q:`${a} ${op} ${b} = ?`, answers, correct:answers.indexOf(String(ans)) };
}
export function openMath(onDone){
  openModal(); panel().innerHTML="";
  const wrap=document.createElement("div"); wrap.className="center";
  wrap.innerHTML=`<h2>${t("mathTitle")}</h2><p class="subtitle">${t("chooseMode")}</p>`;
  [["addition","addition"],["subtraction","subtraction"],["multiplication","multiplication"],["division","division"],["mixed","mixed"]]
    .forEach(([mode,key])=>{ const b=document.createElement("button"); b.className="big-btn"; b.textContent=t(key);
      b.onclick=()=>{ SFX.click(); runQuiz({makeQuestion:()=>mathQuestion(mode), titleKey:"mathTitle", count:8}, onDone, ()=>openMath(onDone)); }; wrap.append(b); });
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); back.onclick=()=>closeModal(onDone); wrap.append(back);
  panel().append(wrap);
}

// ---------------- Vocabulary (English & Russian islands) ----------------
const VOCAB=[
  ["🍎","apple","яблоко"],["🐶","dog","собака"],["🐱","cat","кошка"],["🏠","house","дом"],
  ["☀️","sun","солнце"],["📖","book","книга"],["🌳","tree","дерево"],["💧","water","вода"],
  ["🐟","fish","рыба"],["⭐","star","звезда"],["🚗","car","машина"],["⚽","ball","мяч"],
  ["🥛","milk","молоко"],["🍞","bread","хлеб"],["🌸","flower","цветок"],["🐦","bird","птица"],
  ["🥚","egg","яйцо"],["🌙","moon","луна"],["✋","hand","рука"],["👁","eye","глаз"],
  ["🐻","bear","медведь"],["🌧","rain","дождь"],["❄️","snow","снег"],["🔥","fire","огонь"],
];
function vocabQuestion(field){ // field: 1=english, 2=russian
  const row=pick(VOCAB); const correctWord=row[field];
  const set=new Set([correctWord]);
  while(set.size<4){ set.add(pick(VOCAB)[field]); }
  const answers=shuffle([...set]);
  const prompt = getLang()==="ru" ? "Какое слово означает" : "Which word means";
  return { q:`${prompt} <span style="font-size:1.4em">${row[0]}</span> ?`, answers, correct:answers.indexOf(correctWord) };
}
export function openEnglish(onDone){ runQuiz({makeQuestion:()=>vocabQuestion(1), titleKey:"englishTitle", sub:t("englishSub"), count:8}, onDone, ()=>openEnglish(onDone)); }
export function openRussian(onDone){ runQuiz({makeQuestion:()=>vocabQuestion(2), titleKey:"russianTitle", sub:t("russianSub"), count:8}, onDone, ()=>openRussian(onDone)); }
export function openQuiz(onDone){ // Quiz Tower: mix of math + vocab
  runQuiz({makeQuestion:()=> Math.random()<0.5 ? mathQuestion("mixed") : vocabQuestion(getLang()==="ru"?2:1), titleKey:"quizIsle", count:10}, onDone, ()=>openQuiz(onDone));
}

// ---------------- Flappy Bird (2D canvas) ----------------
export function openFlappy(onDone){
  openModal(); panel().innerHTML="";
  panel().insertAdjacentHTML("beforeend", `<h2 class="center">${t("flappyTitle")}</h2><p class="center subtitle">${t("flappyHelp")}</p>`);
  const W=Math.min(420, innerWidth-60), H=Math.min(520, innerHeight-220);
  const cv=document.createElement("canvas"); cv.id="mini-canvas"; cv.width=W; cv.height=H; panel().append(cv);
  const info=document.createElement("p"); info.className="q-score"; panel().append(info);
  const row=document.createElement("div"); row.className="row";
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld");
  row.append(back); panel().append(row);
  const g=cv.getContext("2d");
  let by=H/2, vy=0, pipes=[], score=0, best=0, playing=false, dead=false, raf, spawn=0, earnedTotal=0;
  function reset(){ by=H/2; vy=0; pipes=[]; score=0; dead=false; playing=false; spawn=0; }
  function flap(){ if(dead){ reset(); return; } if(!playing){ playing=true; } vy=-6.2; SFX.flap(); }
  function loop(){
    raf=requestAnimationFrame(loop);
    g.fillStyle="#7ec0ee"; g.fillRect(0,0,W,H);
    // ground
    g.fillStyle="#caa15a"; g.fillRect(0,H-24,W,24);
    if(playing && !dead){
      vy+=0.4; by+=vy; spawn--;
      if(spawn<=0){ const gap=130, top=rand(40,H-24-gap-40); pipes.push({x:W, top, gap, passed:false}); spawn=90; }
      pipes.forEach(p=>p.x-=2.6);
      pipes=pipes.filter(p=>p.x>-60);
    }
    // pipes
    g.fillStyle="#2e9e4f";
    pipes.forEach(p=>{ g.fillRect(p.x,0,52,p.top); g.fillRect(p.x,p.top+p.gap,52,H);
      if(!p.passed && p.x+52<W/2-14){ p.passed=true; score++; SFX.click(); if(score%5===0){ earnedTotal+=1; addStars(1); toast("+1 ⭐"); } }
      // collision
      if(80>p.x && 46<p.x+52){ if(by-14<p.top || by+14>p.top+p.gap) die(); }
    });
    // bird
    g.font="28px serif"; g.fillText("🐤", 66, by+10);
    if(by>H-24-8 || by<0) die();
    best=Math.max(best,score);
    g.fillStyle="#08203f"; g.font="bold 22px Segoe UI"; g.textAlign="left"; g.fillText(t("score")+": "+score, 12, 30);
    if(!playing && !dead){ g.textAlign="center"; g.fillStyle="rgba(8,32,63,.85)"; g.fillText(t("tapToStart"), W/2, H/2); }
    if(dead){ g.textAlign="center"; g.fillStyle="rgba(8,32,63,.9)"; g.font="bold 26px Segoe UI"; g.fillText("💥 "+t("score")+": "+score, W/2, H/2); g.font="18px Segoe UI"; g.fillText(t("tapToStart"), W/2, H/2+34); }
    info.textContent="⭐ "+earnedTotal+"  ·  "+t("score")+" "+score;
  }
  function die(){ if(dead) return; dead=true; playing=false; SFX.hit(); }
  cv.onpointerdown=flap;
  const keyh=(e)=>{ if(e.code==="Space"){ e.preventDefault(); flap(); } };
  addEventListener("keydown", keyh);
  back.onclick=()=>{ cancelAnimationFrame(raf); removeEventListener("keydown", keyh); closeModal(onDone); };
  reset(); loop();
}

// ---------------- Shared mini-3D helper ----------------
function createMini(){
  const W=Math.min(760, innerWidth-40), H=Math.min(460, innerHeight-200);
  const cv=document.createElement("canvas"); cv.id="mini-canvas"; cv.width=W; cv.height=H;
  const renderer=new THREE.WebGLRenderer({canvas:cv, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(W,H); renderer.shadowMap.enabled=true;
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x87c5ff);
  const camera=new THREE.PerspectiveCamera(60, W/H, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xffffff,0x555533,1.0));
  const sun=new THREE.DirectionalLight(0xffffff,0.9); sun.position.set(10,20,10); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); scene.add(sun);
  document.getElementById("modalPanel").classList.add("wide");
  let raf, handlers=[];
  function on(t,f){ addEventListener(t,f); handlers.push([t,f]); }
  function start(fn){ let last=performance.now(); (function l(now){ raf=requestAnimationFrame(l); const dt=Math.min((now-last)/1000,0.05); last=now; fn(dt); renderer.render(scene,camera); })(last); }
  function dispose(){ cancelAnimationFrame(raf); handlers.forEach(([t,f])=>removeEventListener(t,f)); renderer.dispose(); document.getElementById("modalPanel").classList.remove("wide"); }
  return { cv, renderer, scene, camera, on, start, dispose, W, H };
}

// ---------------- Block World (Minecraft-style voxel builder) ----------------
export function openBlock(onDone){
  openModal(); panel().innerHTML="";
  panel().insertAdjacentHTML("beforeend", `<h2 class="center">${t("blockTitle")}</h2><p class="center subtitle">${t("blockHelp")}</p>`);
  const m=createMini(); panel().append(m.cv);
  const pal=document.createElement("div"); pal.className="center"; pal.style.margin="6px";
  const COLORS=[0x8bc34a,0x795548,0x9e9e9e,0x2196f3,0xffc107,0xe91e63,0xffffff];
  const NAMES=["🌱","🟫","⬜","🟦","🟨","🟪","⬜"];
  let sel=0;
  COLORS.forEach((c,i)=>{ const b=document.createElement("button"); b.textContent=(i+1); b.style.cssText=`margin:3px;width:40px;height:40px;border-radius:8px;font-weight:800;border:3px solid ${i===sel?'#fff':'#0003'};background:#${c.toString(16).padStart(6,'0')}`; b.onclick=()=>{ sel=i; [...pal.children].forEach((x,j)=>x.style.borderColor=j===i?'#fff':'#0003'); }; pal.append(b); });
  panel().append(pal);
  const row=document.createElement("div"); row.className="row";
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); row.append(back); panel().append(row);

  // ground grid
  const N=12; const cubes=new Map(); // "x,y,z" -> mesh
  const geo=new THREE.BoxGeometry(1,1,1);
  const ground=new THREE.Mesh(new THREE.BoxGeometry(N,1,N), new THREE.MeshStandardMaterial({color:0x6ac47a}));
  ground.position.y=-0.5; ground.receiveShadow=true; ground.name="ground"; m.scene.add(ground);
  const grid=new THREE.GridHelper(N,N,0x224422,0x224422); grid.position.y=0.001; m.scene.add(grid);
  function key(x,y,z){ return x+","+y+","+z; }
  function place(x,y,z,ci){ if(Math.abs(x)>N/2||Math.abs(z)>N/2||y>8) return; const mesh=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:COLORS[ci]})); mesh.position.set(x,y+0.5,z); mesh.castShadow=mesh.receiveShadow=true; m.scene.add(mesh); cubes.set(key(x,y,z),mesh); placed++; if(placed===10){ addStars(3); toast("+3 ⭐"); } SFX.click(); }
  function removeAt(x,y,z){ const k=key(x,y,z); const mesh=cubes.get(k); if(mesh){ m.scene.remove(mesh); cubes.delete(k); SFX.click(); } }
  let placed=0;

  // camera orbit
  let yaw=0.7, pitch=0.9, distC=16, dragging=false, px=0,py=0;
  function updateCam(){ m.camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distC, Math.sin(pitch)*distC, Math.cos(yaw)*Math.cos(pitch)*distC); m.camera.lookAt(0,1,0); }
  const ray=new THREE.Raycaster(), mouse=new THREE.Vector2();
  function pointerToBlock(e, forRemove){
    const r=m.cv.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1;
    ray.setFromCamera(mouse, m.camera);
    const hits=ray.intersectObjects([ground, ...cubes.values()], false);
    if(!hits.length) return null; const h=hits[0];
    if(forRemove){ if(h.object.name==="ground") return null; const p=h.object.position; return {x:Math.round(p.x), y:Math.round(p.y-0.5), z:Math.round(p.z), remove:true}; }
    const nrm=h.face.normal; const p=h.object===ground? {x:Math.round(h.point.x), y:0, z:Math.round(h.point.z)} : {x:Math.round(h.object.position.x+nrm.x), y:Math.round(h.object.position.y-0.5+nrm.y), z:Math.round(h.object.position.z+nrm.z)};
    return p;
  }
  m.cv.addEventListener("pointerdown", e=>{ dragging=true; px=e.clientX; py=e.clientY; e._moved=false; });
  m.cv.addEventListener("pointermove", e=>{ if(dragging){ const dx=e.clientX-px, dy=e.clientY-py; if(Math.abs(dx)+Math.abs(dy)>3) e._moved=true; yaw-=dx*0.01; pitch=Math.max(0.2,Math.min(1.4,pitch-dy*0.01)); px=e.clientX; py=e.clientY; } });
  m.cv.addEventListener("pointerup", e=>{ dragging=false; if(!e._moved){ const b=pointerToBlock(e,false); if(b) place(b.x,b.y,b.z,sel); } });
  m.cv.addEventListener("contextmenu", e=>{ e.preventDefault(); const b=pointerToBlock(e,true); if(b&&b.remove) removeAt(b.x,b.y,b.z); });
  m.cv.addEventListener("wheel", e=>{ e.preventDefault(); distC=Math.max(8,Math.min(30,distC+Math.sign(e.deltaY))); }, {passive:false});
  m.on("keydown", e=>{ const n=parseInt(e.key); if(n>=1&&n<=COLORS.length){ sel=n-1; [...pal.children].forEach((x,j)=>x.style.borderColor=j===sel?'#fff':'#0003'); } });

  back.onclick=()=>{ m.dispose(); closeModal(onDone); };
  m.start(()=>{ updateCam(); });
}

// ---------------- Dodgeball 3D (needs 2+ players) ----------------
export function openDodge(onDone){
  openModal(); panel().innerHTML="";
  panel().insertAdjacentHTML("beforeend", `<h2 class="center">${t("dodgeTitle")}</h2><p class="center subtitle">${t("dodgeNeeds")}</p><p class="center">${t("dodgeChoose")}</p>`);
  const b1=document.createElement("button"); b1.className="big-btn"; b1.textContent=t("dodgeBots");
  const b2=document.createElement("button"); b2.className="big-btn"; b2.textContent=t("dodge2p");
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); back.onclick=()=>closeModal(onDone);
  b1.onclick=()=>{ SFX.click(); startDodge(false,onDone); };
  b2.onclick=()=>{ SFX.click(); startDodge(true,onDone); };
  panel().append(b1,b2,back);
}
function startDodge(twoPlayers, onDone){
  panel().innerHTML="";
  panel().insertAdjacentHTML("beforeend", `<h2 class="center">${t("dodgeTitle")}</h2>
    <p class="center subtitle">${t("dodgeP1keys")}${twoPlayers?" · "+t("dodgeP2keys"):""}</p>`);
  const m=createMini(); panel().append(m.cv);
  const status=document.createElement("p"); status.className="q-score center"; panel().append(status);
  const row=document.createElement("div"); row.className="row";
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); row.append(back); panel().append(row);

  // arena
  const AW=18, AL=24;
  const floor=new THREE.Mesh(new THREE.BoxGeometry(AW,0.5,AL), new THREE.MeshStandardMaterial({color:0xd9a441}));
  floor.position.y=-0.25; floor.receiveShadow=true; m.scene.add(floor);
  const line=new THREE.Mesh(new THREE.BoxGeometry(AW,0.06,0.4), new THREE.MeshStandardMaterial({color:0xffffff})); line.position.y=0.26; m.scene.add(line);
  m.camera.position.set(0,20,20); m.camera.lookAt(0,0,0);

  // players: red team z<0, blue team z>0. human(s) on red.
  const keys={}; m.on("keydown",e=>keys[e.code]=true); m.on("keyup",e=>keys[e.code]=false);
  function makePlayer(color,z,human,p2){ const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.5,1,4,10), new THREE.MeshStandardMaterial({color})); body.position.y=1; body.castShadow=true; g.add(body);
    g.position.set(rand(-AW/2+1,AW/2-1), 0, z); g.userData={color,human,p2,alive:true,team:z<0?"red":"blue",cool:0}; m.scene.add(g); return g; }
  const players=[];
  players.push(makePlayer(0x3ad6a0, -6, true, false));
  if(twoPlayers) players.push(makePlayer(0x4fa3ff, -9, true, true)); else players.push(makePlayer(0xff9d5c, -9, false, false));
  players.push(makePlayer(0xff5d5d, 6, false, false), makePlayer(0xff5d5d, 9, false, false));
  const balls=[];
  for(let i=0;i<3;i++){ const b=new THREE.Mesh(new THREE.SphereGeometry(0.4,14,12), new THREE.MeshStandardMaterial({color:0xffeb3b})); b.position.set(rand(-6,6),0.4,rand(-1.5,1.5)); b.castShadow=true; b.userData={vel:new THREE.Vector3(),held:null,active:false}; m.scene.add(b); balls.push(b); }
  let over=false;
  function throwBall(p){ if(p.userData.cool>0) return; const enemies=players.filter(q=>q.userData.alive && q.userData.team!==p.userData.team); if(!enemies.length) return;
    let ball=balls.find(b=>!b.userData.active && b.position.distanceTo(p.position)<2.2); if(!ball) return;
    const target=enemies.reduce((a,b)=>a.position.distanceTo(p.position)<b.position.distanceTo(p.position)?a:b);
    const dir=target.position.clone().sub(p.position).setY(0).normalize();
    ball.userData.vel.copy(dir.multiplyScalar(16)).setY(2); ball.userData.active=true; ball.userData.owner=p.userData.team; p.userData.cool=0.8; SFX.flap(); }
  function alive(team){ return players.filter(p=>p.userData.alive && p.userData.team===team).length; }

  back.onclick=()=>{ m.dispose(); closeModal(onDone); };
  m.start(dt=>{
    if(over){ return; }
    players.forEach(p=>{ if(!p.userData.alive) return; p.userData.cool-=dt; const sp=6*dt; const u=p.userData;
      if(u.human){ if(!u.p2){ if(keys["KeyW"])p.position.z-=sp; if(keys["KeyS"])p.position.z+=sp; if(keys["KeyA"])p.position.x-=sp; if(keys["KeyD"])p.position.x+=sp; if(keys["KeyF"])throwBall(p); }
        else { if(keys["ArrowUp"])p.position.z-=sp; if(keys["ArrowDown"])p.position.z+=sp; if(keys["ArrowLeft"])p.position.x-=sp; if(keys["ArrowRight"])p.position.x+=sp; if(keys["Enter"])throwBall(p); } }
      else { // AI: move toward a free ball on own side, else dodge, occasionally throw
        const myBall=balls.find(b=>!b.userData.active && (u.team==="red"?b.position.z<0:b.position.z>0));
        const tgt = myBall? myBall.position : new THREE.Vector3(rand(-6,6),0,u.team==="red"?-6:6);
        const d=tgt.clone().sub(p.position).setY(0); if(d.length()>0.5){ d.normalize(); p.position.addScaledVector(d, sp*0.8); }
        if(Math.random()<0.02) throwBall(p);
        // dodge incoming
        balls.forEach(b=>{ if(b.userData.active && b.userData.owner!==u.team){ const near=b.position.distanceTo(p.position); if(near<3){ p.position.x+=Math.sign(p.position.x-b.position.x||1)*sp; } } });
      }
      // clamp to own half
      p.position.x=Math.max(-AW/2+0.6,Math.min(AW/2-0.6,p.position.x));
      if(u.team==="red") p.position.z=Math.max(-AL/2+0.6,Math.min(-0.8,p.position.z)); else p.position.z=Math.max(0.8,Math.min(AL/2-0.6,p.position.z));
    });
    balls.forEach(b=>{ if(b.userData.active){ b.position.addScaledVector(b.userData.vel,dt); b.userData.vel.y-=12*dt; if(b.position.y<0.4){ b.position.y=0.4; b.userData.active=false; b.userData.vel.set(0,0,0); }
      players.forEach(p=>{ if(p.userData.alive && p.userData.team!==b.userData.owner && b.userData.active && b.position.distanceTo(new THREE.Vector3(p.position.x,1,p.position.z))<1.1){ p.userData.alive=false; p.visible=false; b.userData.active=false; b.userData.vel.set(0,0,0); SFX.hit(); } }); } });
    const red=alive("red"), blue=alive("blue");
    status.textContent=`🟢 ${t("redTeam")}: ${red}   🔴 ${t("blueTeam")}: ${blue}`;
    if(red===0||blue===0){ over=true; const winner = red>0? t("redTeam"):t("blueTeam"); status.textContent=`🏆 ${winner} ${t("dodgeWin")}`;
      if(red>0){ addStars(4); toast("+4 ⭐"); SFX.win(); } else SFX.lose(); }
  });
}

// ---------------- Hide & Seek 3D ----------------
export function openHide(onDone){
  openModal(); panel().innerHTML="";
  panel().insertAdjacentHTML("beforeend", `<h2 class="center">${t("hideTitle")}</h2><p class="center subtitle">${t("hideHelp")}</p>`);
  const m=createMini(); panel().append(m.cv);
  const status=document.createElement("p"); status.className="q-score center"; panel().append(status);
  const row=document.createElement("div"); row.className="row";
  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld"); row.append(back); panel().append(row);

  const floor=new THREE.Mesh(new THREE.CircleGeometry(28,40), new THREE.MeshStandardMaterial({color:0x3a9e5f})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; m.scene.add(floor);
  // trees / bushes as hiding spots
  const spots=[];
  for(let i=0;i<16;i++){ const a=rand(0,6.28), r=rand(6,24); const x=Math.cos(a)*r, z=Math.sin(a)*r;
    const g=new THREE.Group(); const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,2.4,7), new THREE.MeshStandardMaterial({color:0x7a4a25})); trunk.position.y=1.2; g.add(trunk);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(1.8,10,8), new THREE.MeshStandardMaterial({color:0x2f9e4f})); leaf.position.y=3.2; leaf.castShadow=true; g.add(leaf);
    g.position.set(x,0,z); m.scene.add(g); spots.push({x,z}); }
  // hidden friends
  const friends=[]; const chosen=shuffle(spots).slice(0,6);
  chosen.forEach(s=>{ const f=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.7,4,8), new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(Math.random(),0.7,0.6)})); body.position.y=0.8; f.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8), new THREE.MeshStandardMaterial({color:0xffd9a8})); head.position.y=1.6; f.add(head);
    f.position.set(s.x+rand(-1,1),0,s.z+rand(-1,1)); f.userData={found:false}; m.scene.add(f); friends.push(f); });

  // seeker (player)
  const seeker=new THREE.Group(); const sb=new THREE.Mesh(new THREE.CapsuleGeometry(0.4,0.9,4,10), new THREE.MeshStandardMaterial({color:0x3ad6a0})); sb.position.y=0.9; seeker.add(sb);
  const sh=new THREE.Mesh(new THREE.SphereGeometry(0.36,12,10), new THREE.MeshStandardMaterial({color:0xffd9a8})); sh.position.y=1.7; seeker.add(sh); m.scene.add(seeker);
  let yaw=0; const keys={}; m.on("keydown",e=>keys[e.code]=true); m.on("keyup",e=>keys[e.code]=false);
  let found=0, timeLeft=60, over=false;

  back.onclick=()=>{ m.dispose(); closeModal(onDone); };
  m.start(dt=>{
    if(!over){ timeLeft-=dt;
      let f=0,tr=0; if(keys["KeyW"]||keys["ArrowUp"])f+=1; if(keys["KeyS"]||keys["ArrowDown"])f-=1; if(keys["KeyA"]||keys["ArrowLeft"])tr+=1; if(keys["KeyD"]||keys["ArrowRight"])tr-=1;
      yaw+=tr*dt*2.4; seeker.rotation.y=yaw;
      seeker.position.x-=Math.sin(yaw)*f*7*dt; seeker.position.z-=Math.cos(yaw)*f*7*dt;
      const rr=Math.hypot(seeker.position.x,seeker.position.z); if(rr>27){ seeker.position.multiplyScalar(27/rr); }
      friends.forEach(fr=>{ if(!fr.userData.found && fr.position.distanceTo(seeker.position)<2.2){ fr.userData.found=true; found++; fr.children[0].material.color.set(0xffd23f); fr.position.y=0.2; SFX.correct(); toast("👋 "+found+"/"+friends.length); addStars(1); } });
    }
    // camera behind seeker
    const cx=seeker.position.x+Math.sin(yaw)*8, cz=seeker.position.z+Math.cos(yaw)*8;
    m.camera.position.lerp(new THREE.Vector3(cx,6,cz),0.15); m.camera.lookAt(seeker.position.x,1.2,seeker.position.z);
    status.textContent=`👀 ${t("hideFound")}: ${found}/${friends.length}   ⏱ ${t("timeLeft")}: ${Math.max(0,Math.ceil(timeLeft))}`;
    if(!over && (found===friends.length || timeLeft<=0)){ over=true;
      if(found===friends.length){ status.textContent="🎉 "+t("hideWin"); addStars(3); SFX.win(); } else { status.textContent="⏰ "+t("hideLose"); SFX.lose(); } }
  });
}

// ---------------- router ----------------
export function openGame(id, onDone){
  const map={ math:openMath, english:openEnglish, russian:openRussian, quiz:openQuiz,
    flappy:openFlappy, minecraft:openBlock, dodge:openDodge, hide:openHide };
  const fn=map[id]; if(fn) fn(onDone);
}
