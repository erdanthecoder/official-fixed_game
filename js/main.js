// ================= Bootstrap & wiring =================
import { State, loadUser, on, show, hide, toast } from "./core.js";
import { t, setLang, getLang, applyStaticI18n } from "./i18n.js";
import { unlockAudio, startMusic, setMuted, SFX } from "./audio.js";
import { initWorld, setPaused, teleport, getNearby, triggerInteract, relabelPortals, setInput, requestJump, ISLANDS } from "./world.js";
import { openGame } from "./games.js";
import { openTeacherPanel } from "./teacher.js";

const $ = id => document.getElementById(id);
const TEACHER_CODE = "teach123";
let chosenRole = "student", worldReady = false;

// ---------- boot ----------
window.addEventListener("load", () => {
  const savedLang = localStorage.getItem("li_lang") || "en";
  setLang(savedLang);
  setTimeout(() => { hide("loading"); show("languageMenu"); }, 600);
  wireMenus();
});

function wireMenus(){
  // language selection
  document.querySelectorAll("#languageMenu [data-lang]").forEach(b=>{
    b.onclick=()=>{ unlockAudio(); SFX.click(); setLang(b.dataset.lang); applyStaticI18n(); hide("languageMenu"); show("roleMenu"); };
  });
  $("backToLang").onclick=()=>{ SFX.click(); hide("roleMenu"); show("languageMenu"); };

  // role selection
  $("roleStudent").onclick=()=>{ SFX.click(); chosenRole="student"; $("teacherCode").classList.add("hidden");
    $("roleStudent").style.outline="3px solid #fff"; $("roleTeacher").style.outline="none"; };
  $("roleTeacher").onclick=()=>{ SFX.click(); chosenRole="teacher"; $("teacherCode").classList.remove("hidden");
    $("roleTeacher").style.outline="3px solid #fff"; $("roleStudent").style.outline="none"; };

  $("startGame").onclick=startGame;
}

function startGame(){
  unlockAudio();
  const name=($("playerName").value.trim())||(getLang()==="ru"?"Игрок":"Player");
  if(chosenRole==="teacher"){
    const code=$("teacherPass").value.trim();
    if(code!==TEACHER_CODE){ alert(t("wrongCode")); return; }
  }
  loadUser(name, chosenRole);
  hide("roleMenu");
  show("hud"); refreshHud();
  if(State.role==="teacher") $("teacherBtn").classList.remove("hidden");

  if(!worldReady){
    initWorld({ canvas:$("game"), onInteract:enterGame, onNearby:onNearby });
    worldReady=true;
    setupHudButtons();
    setupTouch();
    setupHudEvents();
  }
  relabelPortals();
  setPaused(false);
  startMusic();
  toast(t("welcome"), 4500);
  if("ontouchstart" in window) $("touch-controls").classList.remove("hidden");
}

// ---------- HUD ----------
function refreshHud(){
  $("hudName").textContent=State.name;
  $("hudStars").textContent=State.stars;
  $("hudPoints").textContent=State.points;
  $("playerPill").firstChild.textContent = State.role==="teacher" ? "🍎 " : "🎒 ";
}
function setupHudEvents(){
  on("stars", n=>{ refreshHud(); if(n>0) SFX.star(); });
  on("point", ()=>{ refreshHud(); toast("🏆 +1 "+t("points")); SFX.win(); });
}

let currentPrompt=null;
function onNearby(id){
  const el=$("interact-prompt");
  currentPrompt=id;
  if(id){ const def=ISLANDS.find(i=>i.id===id); el.textContent=`${def.emoji} ${t(def.key)} — ${("ontouchstart" in window)?t("tapToPlay"):t("pressToPlay")}`; el.classList.remove("hidden"); }
  else el.classList.add("hidden");
}

function enterGame(id){
  if(id==="teacher"){
    if(State.role!=="teacher"){ toast(getLang()==="ru"?"Только для учителей!":"Teachers only!"); return; }
    setPaused(true); $("interact-prompt").classList.add("hidden");
    openTeacherPanel(()=>setPaused(false));
    return;
  }
  setPaused(true); $("interact-prompt").classList.add("hidden");
  SFX.portal();
  openGame(id, ()=>{ setPaused(false); refreshHud(); });
}

function setupHudButtons(){
  $("mapBtn").onclick=openMap;
  $("menuBtn").onclick=openPauseMenu;
  $("teacherBtn").onclick=()=>{ setPaused(true); openTeacherPanel(()=>setPaused(false)); };
  $("closeMap").onclick=()=>{ SFX.click(); hide("mapOverlay"); setPaused(false); };
  addEventListener("keydown", e=>{ if(e.code==="KeyM" && worldReady && !isModalOpen()){ openMap(); } if(e.code==="Escape"){ hide("mapOverlay"); } });
}
function isModalOpen(){ return !$("modal").classList.contains("hidden") || !$("mapOverlay").classList.contains("hidden"); }

function openMap(){
  SFX.click(); setPaused(true);
  const list=$("mapList"); list.innerHTML="";
  ISLANDS.forEach(def=>{
    const c=document.createElement("div"); c.className="map-card";
    c.innerHTML=`<span class="emoji">${def.emoji}</span>${t(def.key)}`;
    c.onclick=()=>{ SFX.portal(); teleport(def.id); hide("mapOverlay"); setPaused(false); toast(t(def.key)); };
    list.append(c);
  });
  show("mapOverlay");
}

function openPauseMenu(){
  SFX.click(); setPaused(true);
  const p=$("modalPanel"); p.innerHTML=""; show("modal");
  const box=document.createElement("div"); box.className="center";
  box.innerHTML=`<h2>☰</h2>`;
  const mk=(label,fn,cls="big-btn")=>{ const b=document.createElement("button"); b.className=cls; b.textContent=label; b.onclick=fn; return b; };
  box.append(
    mk(t("resumeGame"), ()=>{ hide("modal"); setPaused(false); }),
    mk(t("howToPlay"), showHelp),
    mk(State.muted?t("unmuteAudio"):t("muteAudio"), function(){ State.muted=!State.muted; setMuted(State.muted); this.textContent=State.muted?t("unmuteAudio"):t("muteAudio"); }),
    mk(t("switchUser"), ()=>location.reload(), "big-btn ghost")
  );
  p.append(box);
}
function showHelp(){
  const p=$("modalPanel"); p.innerHTML=""; show("modal");
  const box=document.createElement("div");
  box.innerHTML=`<h2 class="center">${t("controls")}</h2><pre style="white-space:pre-wrap;font-family:inherit;font-size:17px;line-height:1.6">${t("controlsBody")}</pre>`;
  const b=document.createElement("button"); b.className="big-btn"; b.textContent=t("close"); b.onclick=()=>{ hide("modal"); setPaused(false); };
  box.append(b); p.append(box);
}

// ---------- touch controls ----------
function setupTouch(){
  const js=$("joystick"), stick=$("stick"); let active=false, cx=0, cy=0;
  const set=(dx,dy)=>{ const ang=Math.atan2(dy,dx); const mag=Math.min(1,Math.hypot(dx,dy)/45);
    stick.style.left=(35+Math.cos(ang)*mag*35)+"px"; stick.style.top=(35+Math.sin(ang)*mag*35)+"px";
    setInput(Math.max(-1,Math.min(1,-dy/45)), Math.max(-1,Math.min(1,-dx/45)));
  };
  const reset=()=>{ stick.style.left="35px"; stick.style.top="35px"; setInput(0,0); };
  js.addEventListener("touchstart", e=>{ active=true; const r=js.getBoundingClientRect(); cx=r.left+60; cy=r.top+60; });
  js.addEventListener("touchmove", e=>{ if(!active) return; e.preventDefault(); const tch=e.touches[0]; set(tch.clientX-cx, tch.clientY-cy); }, {passive:false});
  js.addEventListener("touchend", ()=>{ active=false; reset(); });
  $("jumpBtn").addEventListener("touchstart", e=>{ e.preventDefault(); requestJump(); });
  $("interact-prompt").addEventListener("click", ()=>{ if(currentPrompt) triggerInteract(); });
}
