// ================= Core game state, stars & house points =================
import { t } from "./i18n.js";

const STARS_PER_POINT = 30;

export const State = {
  name: "Player",
  role: "student",          // "student" | "teacher"
  stars: 0,
  points: 0,
  muted: false,
  paused: false,
  // live tuning knobs that teacher "admin abuse" can change
  playerScale: 1,
  jumpBoost: 1,
  speedBoost: 1,
  gravityScale: 1,
  skyMode: "day",           // "day" | "rainbow" | "disco"
};

const KEY = () => "li_save_" + State.name.toLowerCase();

export function loadUser(name, role){
  State.name = name || "Player";
  State.role = role || "student";
  try {
    const raw = localStorage.getItem(KEY());
    if (raw){ const d = JSON.parse(raw); State.stars = d.stars||0; State.points = d.points||0; }
    else { State.stars = 0; State.points = 0; }
  } catch { State.stars = 0; State.points = 0; }
}
export function save(){
  try { localStorage.setItem(KEY(), JSON.stringify({stars:State.stars, points:State.points})); } catch {}
}

// event bus so HUD can react
const listeners = {};
export function on(evt, fn){ (listeners[evt] = listeners[evt]||[]).push(fn); }
export function emit(evt, data){ (listeners[evt]||[]).forEach(fn=>fn(data)); }

export function addStars(n){
  State.stars += n;
  // auto-convert 30 stars -> 1 house point
  while (State.stars >= STARS_PER_POINT){ State.stars -= STARS_PER_POINT; State.points += 1; emit("point"); }
  save(); emit("stars", n);
  return n;
}
export function addPoints(n){ State.points += n; save(); emit("point"); }

// resets any teacher effect back to normal
export function resetEffects(){
  State.playerScale = 1; State.jumpBoost = 1; State.speedBoost = 1;
  State.gravityScale = 1; State.skyMode = "day";
  emit("effects");
}

// ---- small DOM helpers ----
export function el(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; }
export function show(id){ document.getElementById(id).classList.remove("hidden"); }
export function hide(id){ document.getElementById(id).classList.add("hidden"); }
export function toast(msg, ms=1800){
  const b=document.getElementById("hint-banner");
  b.textContent=msg; b.classList.remove("hidden");
  clearTimeout(b._t); b._t=setTimeout(()=>b.classList.add("hidden"), ms);
}
export function rand(a,b){ return a + Math.random()*(b-a); }
export function randi(a,b){ return Math.floor(rand(a,b+1)); }
export function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
export function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export { STARS_PER_POINT };
