// ================= Web Audio: synthesized SFX + music (no asset files) =================
import { State } from "./core.js";

let ctx = null, master = null, musicGain = null, musicTimer = null;

function ensure(){
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
}
export function unlockAudio(){ ensure(); if (ctx.state === "suspended") ctx.resume(); }

function tone(freq, dur=0.15, type="sine", gain=0.3, dest=master){
  if (State.muted || !ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.value=freq; o.connect(g); g.connect(dest);
  const now=ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  o.start(now); o.stop(now+dur+0.02);
}

export const SFX = {
  correct(){ tone(660,0.12,"triangle",0.35); setTimeout(()=>tone(880,0.16,"triangle",0.35),110); },
  wrong(){ tone(200,0.25,"sawtooth",0.28); },
  star(){ tone(880,0.08,"triangle",0.3); setTimeout(()=>tone(1320,0.14,"triangle",0.3),80); },
  jump(){ tone(300,0.12,"square",0.18); },
  portal(){ tone(440,0.1,"sine",0.25); setTimeout(()=>tone(660,0.1,"sine",0.25),90); setTimeout(()=>tone(990,0.2,"sine",0.25),180); },
  click(){ tone(520,0.05,"square",0.15); },
  win(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.2,"triangle",0.35),i*130)); },
  lose(){ [400,300,200].forEach((f,i)=>setTimeout(()=>tone(f,0.25,"sawtooth",0.28),i*160)); },
  firework(){ tone(120,0.05,"sawtooth",0.3); setTimeout(()=>{ for(let i=0;i<6;i++) setTimeout(()=>tone(400+Math.random()*900,0.18,"triangle",0.16),i*30); },60); },
  chime(){ [784,988,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.4,"sine",0.3),i*120)); },
  flap(){ tone(500,0.07,"square",0.15); },
  hit(){ tone(160,0.18,"square",0.3); },
};

// gentle background music: looping cheerful arpeggio
const SCALE = [261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25];
export function startMusic(){
  ensure();
  if (musicTimer) return;
  let step=0;
  musicTimer = setInterval(()=>{
    if (State.muted) return;
    const n = SCALE[(step*3)%SCALE.length];
    tone(n, 0.35, "triangle", 0.5, musicGain);
    if (step%4===0) tone(n/2, 0.5, "sine", 0.4, musicGain);
    step++;
  }, 340);
}
export function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } }
export function setMuted(m){ State.muted = m; if (master) master.gain.value = m?0:0.6; }
