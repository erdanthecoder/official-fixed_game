// ================= Teacher Control Panel =================
import { State, addStars, resetEffects, show, hide, emit, save } from "./core.js";
import { SFX } from "./audio.js";
import { fireworks, starRain, cheerNPCs } from "./world.js";
import { t } from "./i18n.js";

function panel(){ return document.getElementById("modalPanel"); }

export function showAnnouncement(msg){
  const a=document.getElementById("announcement");
  a.textContent="📣 "+msg; a.classList.remove("hidden");
  SFX.chime();
  clearTimeout(a._t); a._t=setTimeout(()=>a.classList.add("hidden"), 6000);
}

// give a house point to a student by name (updates their saved profile)
function givePoint(name){
  if(!name) return false;
  const key="li_save_"+name.toLowerCase();
  let d={stars:0,points:0};
  try { const raw=localStorage.getItem(key); if(raw) d=JSON.parse(raw); } catch {}
  d.points=(d.points||0)+1;
  try { localStorage.setItem(key, JSON.stringify(d)); } catch {}
  if(State.name.toLowerCase()===name.toLowerCase()){ State.points=d.points; save(); emit("point"); }
  return true;
}

export function openTeacherPanel(onDone){
  show("modal"); const p=panel(); p.innerHTML="";
  const flash=(msg)=>{ const f=p.querySelector(".flash-msg"); if(f) f.textContent=msg; };

  const wrap=document.createElement("div");
  wrap.innerHTML=`<h2 class="center">${t("tPanelTitle")}</h2>
    <p class="section-title">${t("tAdminAbuse")}</p>`;

  const tools=document.createElement("div"); tools.className="teacher-tools";
  const buttons=[
    ["tGiant", ()=>{ State.playerScale=2.4; emit("effects"); cheerNPCs(); }],
    ["tTiny",  ()=>{ State.playerScale=0.45; emit("effects"); cheerNPCs(); }],
    ["tSuperJump", ()=>{ State.jumpBoost=2.2; emit("effects"); }],
    ["tSpeed", ()=>{ State.speedBoost=2.0; emit("effects"); }],
    ["tGravity", ()=>{ State.gravityScale=0.35; emit("effects"); }],
    ["tRainbow", ()=>{ State.skyMode="rainbow"; emit("effects"); }],
    ["tDisco", ()=>{ State.skyMode="disco"; SFX.win(); cheerNPCs(); }],
    ["tFireworks", ()=>{ fireworks(); addStars(2); flash(t("tGaveStars")); }],
    ["tStarRain", ()=>{ starRain(); addStars(5); flash(t("tGaveStars")); }],
    ["tReset", ()=>{ resetEffects(); flash(""); }],
  ];
  buttons.forEach(([key,fn])=>{ const b=document.createElement("button"); b.textContent=t(key); b.onclick=()=>{ SFX.click(); fn(); }; tools.append(b); });
  wrap.append(tools);
  wrap.insertAdjacentHTML("beforeend", `<div class="flash-msg"></div>`);

  // announcement
  wrap.insertAdjacentHTML("beforeend", `<p class="section-title">${t("tAnnounce")}</p>`);
  const annInput=document.createElement("input"); annInput.className="text-input"; annInput.placeholder=t("tType");
  const annBtn=document.createElement("button"); annBtn.className="big-btn"; annBtn.textContent=t("tSendAnnounce");
  annBtn.onclick=()=>{ const v=annInput.value.trim(); if(v){ showAnnouncement(v); flash(t("announceSent")); annInput.value=""; } };
  wrap.append(annInput, annBtn);

  // give house points
  wrap.insertAdjacentHTML("beforeend", `<p class="section-title">${t("tGivePoints")}</p>`);
  const nameInput=document.createElement("input"); nameInput.className="text-input"; nameInput.placeholder=t("tStudentName");
  const giveBtn=document.createElement("button"); giveBtn.className="big-btn"; giveBtn.textContent=t("tGive1");
  giveBtn.onclick=()=>{ const v=nameInput.value.trim(); if(v && givePoint(v)){ SFX.star(); flash(t("tPointsGiven")); nameInput.value=""; } };
  wrap.append(nameInput, giveBtn);
  wrap.insertAdjacentHTML("beforeend", `<p class="hint center">${t("tNote")}</p>`);

  const back=document.createElement("button"); back.className="big-btn ghost"; back.textContent=t("backToWorld");
  back.onclick=()=>{ hide("modal"); p.innerHTML=""; if(onDone) onDone(); };
  wrap.append(back);
  p.append(wrap);
}
