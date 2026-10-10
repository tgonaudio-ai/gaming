/* === AUDIO.JS: Web Audio API Procedural Sound Engine === */
"use strict";

/* ---------- audio ---------- */
/* ---------- PROCEDURAL AUDIO ENGINE ---------- */
let AC=null, masterGain=null, oceanGain=null, muted=false;
let nextHeartbeat = 0;
let nextSeagull = 5.0;

function initAudio(){
  if(AC){
    if(AC.state==="suspended") AC.resume().catch(()=>{});
    return;
  }
  try{
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = muted ? 0 : 0.65;
    masterGain.connect(AC.destination);

    // 1. Continuous Ocean Swell Generator (Pink noise + dual rhythmic swell LFO)
    const bufLen = Math.max(1, Math.floor(AC.sampleRate * 4));
    const noiseBuf = AC.createBuffer(1, bufLen, AC.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }

    const oceanSrc = AC.createBufferSource();
    oceanSrc.buffer = noiseBuf;
    oceanSrc.loop = true;

    const oceanFilter = AC.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.value = 340;

    oceanGain = AC.createGain();
    oceanGain.gain.value = 0.24;

    // Rhythmic ocean swell LFO (~7.2s breath cycle)
    const swellLFO = AC.createOscillator();
    const swellGain = AC.createGain();
    swellLFO.frequency.value = 0.14;
    swellGain.gain.value = 220;
    swellLFO.connect(swellGain).connect(oceanFilter.frequency);

    oceanSrc.connect(oceanFilter).connect(oceanGain).connect(masterGain);
    oceanSrc.start();
    swellLFO.start();

    // 2. Coastal Ocean Breeze / Wind Atmosphere Generator (Continuous bandpass filtered noise)
    const windSrc = AC.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;

    const windFilter = AC.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 380;
    windFilter.Q.value = 2.4;

    const windGain = AC.createGain();
    windGain.gain.value = 0.09;

    // Gentle wind gusts LFO (~9.5s slow modulation)
    const windLFO = AC.createOscillator();
    const windLFOGain = AC.createGain();
    windLFO.frequency.value = 0.105;
    windLFOGain.gain.value = 160;
    windLFO.connect(windLFOGain).connect(windFilter.frequency);

    windSrc.connect(windFilter).connect(windGain).connect(masterGain);
    windSrc.start();
    windLFO.start();

    // 3. Deep Sea Sub-bass Hum (Gives vast, cinematic ocean presence)
    const subDrone = AC.createOscillator();
    const subGain = AC.createGain();
    subDrone.type = "sine";
    subDrone.frequency.value = 54;
    subGain.gain.value = 0.045;
    subDrone.connect(subGain).connect(masterGain);
    subDrone.start();

    window._audioAtmosphere = { oceanGain, windGain, subGain };
  }catch(e){
    console.warn("Audio initialization error", e);
    AC = null; masterGain = null;
  }
}

// Procedural Seagull Cry (صوت طائر النورس في الأفق)
function playSeagull(){
  if(!AC || !masterGain || muted || S.mode !== "play") return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const gain = AC.createGain();
    const vib = AC.createOscillator();
    const vibGain = AC.createGain();

    vib.frequency.value = 7;
    vibGain.gain.value = 80;
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    osc.type = "sine";
    const baseF = 1750 + Math.random() * 450;
    osc.frequency.setValueAtTime(baseF, t);
    osc.frequency.exponentialRampToValueAtTime(baseF * 1.4, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(baseF * 0.88, t + 0.45);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain).connect(masterGain);
    vib.start(t); osc.start(t);
    vib.stop(t + 0.5); osc.stop(t + 0.5);
  }catch(e){}
}

// Procedural Shark Tension Pulse / Heartbeat (نبضات خطر القرش المتسارعة - Jaws Style)
function playHeartbeat(vol, isSecond){
  if(!AC || !masterGain || muted || S.mode !== "play") return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const gain = AC.createGain();
    osc.type = "triangle";

    const f0 = isSecond ? 68 : 55;
    const f1 = isSecond ? 48 : 38;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.14);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(Math.min(0.5, vol), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }catch(e){}
}

// Procedural Water Splash / Rowing Stroke (صوت التجديف بالماء)
function sPaddle(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const len = Math.floor(AC.sampleRate * 0.14);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));

    const src = AC.createBufferSource();
    src.buffer = buf;
    const filter = AC.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 650 + Math.random() * 200;
    filter.Q.value = 2.2;

    const gn = AC.createGain();
    gn.gain.setValueAtTime(0.09, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    src.connect(filter).connect(gn).connect(masterGain);
    src.start(t);
  }catch(e){}
}

// Procedural Shark Bite Crunch & Physical Impact (عضّة القرش مع صوت التهشيم)
function sHit(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    // Heavy sub punch
    const sub = AC.createOscillator();
    const subG = AC.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    subG.gain.setValueAtTime(0.55, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    sub.connect(subG).connect(masterGain);
    sub.start(t); sub.stop(t + 0.38);

    // Crunch noise
    const len = Math.floor(AC.sampleRate * 0.22);
    const b = AC.createBuffer(1, len, AC.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0; i<len; i++) d[i] = (Math.random()*2 - 1) * Math.exp(-i / (len * 0.3));
    const noise = AC.createBufferSource();
    noise.buffer = b;
    const filt = AC.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 850;
    const nG = AC.createGain();
    nG.gain.setValueAtTime(0.38, t);
    nG.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.connect(filt).connect(nG).connect(masterGain);
    noise.start(t);
  }catch(e){}
}

// Procedural Kick / Attack Swing Whoosh (صوت تلويحة الركلة السريعة)
// Procedural Dolphin Whistle & Chirp (صوت الدلفين المبهج مع نبرة ترددية)
function sDolphinChirp(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const mod = AC.createOscillator();
    const modGain = AC.createGain();
    const gain = AC.createGain();

    osc.type = "sine";
    mod.type = "sine";

    mod.frequency.setValueAtTime(32, t);
    modGain.gain.setValueAtTime(140, t);
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(2100, t + 0.26);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain).connect(masterGain);
    mod.start(t); osc.start(t);
    mod.stop(t + 0.3); osc.stop(t + 0.3);
  }catch(e){}
}

// Procedural Dolphin Jump Whoosh (صوت قفزة الدلفين الخاطفة في الهواء)
function sDolphinJump(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const flt = AC.createBiquadFilter();
    const gn = AC.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.55);

    flt.type = "bandpass";
    flt.frequency.setValueAtTime(450, t);
    flt.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    flt.frequency.exponentialRampToValueAtTime(300, t + 0.55);
    flt.Q.setValueAtTime(3.0, t);

    gn.gain.setValueAtTime(0.28, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(flt).connect(gn).connect(masterGain);
    osc.start(t); osc.stop(t + 0.56);
  }catch(e){}
}

// Procedural Dolphin Water Landing Splash (صوت هبوط الدلفين في الماء)
function sDolphinSplash(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const len = Math.floor(AC.sampleRate * 0.35);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<len; i++) d[i] = (Math.random()*2 - 1) * Math.exp(-i / (len * 0.28));

    const src = AC.createBufferSource();
    src.buffer = buf;
    const flt = AC.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(950, t);
    flt.frequency.exponentialRampToValueAtTime(220, t + 0.32);

    const gn = AC.createGain();
    gn.gain.setValueAtTime(0.42, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

    src.connect(flt).connect(gn).connect(masterGain);
    src.start(t);
  }catch(e){}
}

// Procedural Boat Break / Splinter Crash (صوت تحطم وتكسر القارب الخشبي)
// Procedural Wood Loot Sound (صوت التقاط الخشب والموارد)
function sWoodLoot(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const g = AC.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.12);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }catch(e){}
}

// Procedural Boat Build Crafting Fanfare (صوت صناعة واكتمال القارب)
function sCraftBoat(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const chords = [392.00, 523.25, 659.25, 783.99, 1046.50];
    chords.forEach((freq, idx) => {
      const osc = AC.createOscillator();
      const g = AC.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      g.gain.setValueAtTime(0, t + idx * 0.09);
      g.gain.linearRampToValueAtTime(0.24, t + idx * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.35);
      osc.connect(g).connect(masterGain);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.38);
    });
  }catch(e){}
}

// Procedural Stage Start Adventure Fanfare (لحن انطلاق المرحلة والمغامرة)
function sStageStartFanfare(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const chords = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major triumph arpeggio
    chords.forEach((freq, idx) => {
      const osc = AC.createOscillator();
      const g = AC.createGain();
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      g.gain.setValueAtTime(0, t + idx * 0.08);
      g.gain.linearRampToValueAtTime(0.24, t + idx * 0.08 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.55);
      osc.connect(g).connect(masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.6);
    });
  }catch(e){}
}

// Procedural Shark Defeat Score Chime (صوت نغمي احتفالي لهزيمة القرش بالدلفين)
function sScore(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = AC.createOscillator();
      const g = AC.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      g.gain.setValueAtTime(0, t + idx * 0.07);
      g.gain.linearRampToValueAtTime(0.22, t + idx * 0.07 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.28);
      osc.connect(g).connect(masterGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.3);
    });
  }catch(e){}
}

function sSharkWarn(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const g = AC.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.35);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.42);
  }catch(e){}
}

function sBoatBreak(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const sub = AC.createOscillator();
    const subG = AC.createGain();
    sub.type = "triangle";
    sub.frequency.setValueAtTime(90, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 0.6);
    subG.gain.setValueAtTime(0.6, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    sub.connect(subG).connect(masterGain);
    sub.start(t); sub.stop(t + 0.62);

    for(let j=0; j<3; j++){
      const delay = j * 0.08;
      const len = Math.floor(AC.sampleRate * 0.2);
      const b = AC.createBuffer(1, len, AC.sampleRate);
      const d = b.getChannelData(0);
      for(let i=0; i<len; i++) d[i] = (Math.random()*2 - 1) * Math.exp(-i / (len * 0.2));
      const s = AC.createBufferSource();
      s.buffer = b;
      const flt = AC.createBiquadFilter();
      flt.type = "bandpass";
      flt.frequency.setValueAtTime(800 + j*300, t + delay);
      flt.Q.setValueAtTime(2.5, t + delay);
      const g = AC.createGain();
      g.gain.setValueAtTime(0.35, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
      s.connect(flt).connect(g).connect(masterGain);
      s.start(t + delay);
    }
  }catch(e){}
}

function sKickSwing(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const gn = AC.createGain();
    const flt = AC.createBiquadFilter();

    flt.type = "bandpass";
    flt.frequency.setValueAtTime(820, t);
    flt.frequency.exponentialRampToValueAtTime(240, t + 0.16);
    flt.Q.setValueAtTime(2.6, t);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);

    gn.gain.setValueAtTime(0.35, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(flt).connect(gn).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }catch(e){}
}

// Procedural Shark Kick Hit Impact (صوت ضرب ولكم القرش مع صدى الارتداد)
function sKickHit(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    // Heavy punch sub drop
    const osc = AC.createOscillator();
    const gn = AC.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);

    gn.gain.setValueAtTime(0.70, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gn).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.23);

    // Punch crack / smack
    const noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.08), AC.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for(let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (AC.sampleRate * 0.015));
    const src = AC.createBufferSource();
    src.buffer = noiseBuf;

    const nFlt = AC.createBiquadFilter();
    nFlt.type = "highpass";
    nFlt.frequency.setValueAtTime(1100, t);

    const nGn = AC.createGain();
    nGn.gain.setValueAtTime(0.48, t);
    nGn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    src.connect(nFlt).connect(nGn).connect(masterGain);
    src.start(t);
  }catch(e){}
}

// Procedural Sparkling Treasure Chime (رنين جمع الكنز اللامع)
function sCollect(){
  if(!AC || !masterGain || muted) return;
  const notes = [659.25, 830.61, 987.77, 1318.51];
  notes.forEach((freq, idx) => {
    try{
      const t = AC.currentTime + idx * 0.055;
      const osc = AC.createOscillator();
      const gn = AC.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(0.24, t + 0.015);
      gn.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gn).connect(masterGain);
      osc.start(t); osc.stop(t + 0.3);
    }catch(e){}
  });
}

// Procedural Island Bump (ارتطام خفيف بالصخرة أو الشاطئ)
function sBump(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const gn = AC.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
    gn.gain.setValueAtTime(0.25, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gn).connect(masterGain);
    osc.start(t); osc.stop(t + 0.18);
  }catch(e){}
}

function sSplash(){
  sPaddle();
}

// Procedural Turbo / Dash Sound (صوت الاندفاع السريع النفاث)
let turboPlaying = false;
let turboSrc = null, turboGain = null;

function startTurboSound(){
  if(!AC || muted || turboPlaying) return;
  try{
    turboPlaying = true;
    const t = AC.currentTime;
    const len = Math.floor(AC.sampleRate * 1.5);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<len; i++) d[i] = Math.random() * 2 - 1;
    turboSrc = AC.createBufferSource();
    turboSrc.buffer = buf;
    turboSrc.loop = true;

    const filter = AC.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.exponentialRampToValueAtTime(1150, t + 0.35);
    filter.Q.value = 1.8;

    turboGain = AC.createGain();
    turboGain.gain.setValueAtTime(0.01, t);
    turboGain.gain.linearRampToValueAtTime(0.24, t + 0.12);

    turboSrc.connect(filter).connect(turboGain).connect(masterGain);
    turboSrc.start(t);
  }catch(e){}
}

function stopTurboSound(){
  if(!turboPlaying || !turboGain || !AC) return;
  try{
    const t = AC.currentTime;
    turboGain.gain.setValueAtTime(turboGain.gain.value, t);
    turboGain.gain.linearRampToValueAtTime(0.001, t + 0.14);
    const oldSrc = turboSrc;
    turboSrc = null;
    turboPlaying = false;
    setTimeout(() => {
      if(oldSrc){ try{oldSrc.stop();}catch(_){} }
    }, 160);
  }catch(e){
    turboPlaying = false;
    turboSrc = null;
  }
}

// Procedural Milestone (إنجاز مسافة جديدة)
function sMile(){
  if(!AC || !masterGain || muted) return;
  [587.33, 880].forEach((freq, i) => {
    try{
      const t = AC.currentTime + i * 0.1;
      const osc = AC.createOscillator();
      const gn = AC.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gn.gain.setValueAtTime(0.2, t);
      gn.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gn).connect(masterGain);
      osc.start(t); osc.stop(t + 0.28);
    }catch(e){}
  });
}

// Procedural Victory Fanfare (نغمة انتصار الكنز الكبرى)
function sWin(){
  if(!AC || !masterGain || muted) return;
  const fanNotes = [
    {f: 523.25, d: 0.18, t: 0.00},
    {f: 659.25, d: 0.18, t: 0.14},
    {f: 783.99, d: 0.22, t: 0.28},
    {f: 1046.50, d: 0.45, t: 0.44},
    {f: 1318.51, d: 0.65, t: 0.62}
  ];
  fanNotes.forEach(n => {
    try{
      const t = AC.currentTime + n.t;
      const osc = AC.createOscillator();
      const gn = AC.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, t);
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.001, t + n.d);
      osc.connect(gn).connect(masterGain);
      osc.start(t); osc.stop(t + n.d + 0.05);
    }catch(e){}
  });
}

// Procedural Game Over (لحن درامي مع غرق)
function sOver(){
  if(!AC || !masterGain || muted) return;
  const overNotes = [392.00, 349.23, 311.13, 261.63];
  overNotes.forEach((f, i) => {
    try{
      const t = AC.currentTime + i * 0.18;
      const osc = AC.createOscillator();
      const gn = AC.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(0.2, t);
      gn.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gn).connect(masterGain);
      osc.start(t); osc.stop(t + 0.38);
    }catch(e){}
  });
}

// Procedural Distant Father Call & Shore Beacon (نداء دافئ وخافت من الشاطئ البعيد)
function sFatherCall(){
  if(!AC || !masterGain || muted) return;
  try{
    const t = AC.currentTime;
    const osc = AC.createOscillator();
    const gn = AC.createGain();
    const filter = AC.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(550, t);
    osc.type = "sine";
    osc.frequency.setValueAtTime(261.63, t); // C4
    osc.frequency.exponentialRampToValueAtTime(329.63, t + 0.6); // E4
    osc.frequency.exponentialRampToValueAtTime(261.63, t + 1.6); // C4
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(0.065, t + 0.5);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    osc.connect(filter).connect(gn).connect(masterGain);
    osc.start(t);
    osc.stop(t + 2.3);
  }catch(e){}
}

// Dynamic Audio Engine Update (runs every frame)
function updateAudioEngine(dt){
  if(!AC || muted || S.mode !== "play") return;

  // 1. Ambient Seagulls
  nextSeagull -= dt;
  if(nextSeagull <= 0){
    playSeagull();
    nextSeagull = 12 + Math.random() * 16;
  }

  // 2. Wooden Hull Creaks (active when on boat)
  if(player && !player.onLand && !player.onDolphin){
    nextWoodCreak -= dt;
    if(nextWoodCreak <= 0){
      playWoodCreak();
      nextWoodCreak = 5.0 + Math.random() * 7.5;
    }

    // 3. Water lapping against boat hull
    const boatSpd = Math.hypot(player.vx, player.vy);
    nextWaterLap -= dt;
    if(nextWaterLap <= 0){
      playWaterLap();
      nextWaterLap = (boatSpd > 0.08 ? 1.6 : 3.2) + Math.random() * 1.4;
    }
  }

  // 4. Nearest Shark Tension Pulse (Jaws Style)
  let nearestSharkDist = 999;
  let nearestShark = null;
  if(typeof enemies !== "undefined" && Array.isArray(enemies)){
    for(const e of enemies){
      if(e.state === "takedown" || e.state === "flee" || e.state === "miss") continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if(d < nearestSharkDist){
        nearestSharkDist = d;
        nearestShark = e;
      }
    }
  }

  if(nearestShark && nearestSharkDist < 1.15){
    nextHeartbeat -= dt;
    if(nextHeartbeat <= 0){
      const intensity = clamp(1.0 - (nearestSharkDist / 1.15), 0.15, 1.0);
      playHeartbeat(0.22 + intensity * 0.3, false);
      setTimeout(() => {
        playHeartbeat(0.18 + intensity * 0.25, true);
      }, 160);

      nextHeartbeat = 0.36 + nearestSharkDist * 0.95;
    }
  } else {
    nextHeartbeat = 0.2;
  }
}



// Procedural Wooden Boat Hull Creak (حفيف صرير خشب القارب مع الأمواج)
let nextWoodCreak = 3.0;
function playWoodCreak(){
  if(!AC || !masterGain || muted || S.mode !== "play") return;
  try{
    const t = AC.currentTime;
    const dur = 0.45 + Math.random() * 0.35;
    const osc = AC.createOscillator();
    const oscGain = AC.createGain();
    const filter = AC.createBiquadFilter();

    osc.type = "sawtooth";
    const baseF = 180 + Math.random() * 90;
    osc.frequency.setValueAtTime(baseF, t);
    osc.frequency.exponentialRampToValueAtTime(baseF * 0.75, t + dur);

    // FM modulation for authentic wood friction flutter
    const mod = AC.createOscillator();
    const modGain = AC.createGain();
    mod.frequency.value = 28 + Math.random() * 15;
    modGain.gain.value = 45;
    mod.connect(modGain).connect(osc.frequency);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(420 + Math.random() * 150, t);
    filter.Q.value = 4.5;

    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.045, t + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.0005, t + dur);

    osc.connect(filter).connect(oscGain).connect(masterGain);
    mod.start(t); osc.start(t);
    mod.stop(t + dur + 0.05); osc.stop(t + dur + 0.05);
  }catch(e){}
}

// Procedural Water Lapping against Hull (صوت تلاطم الأمواج الخفيفة بجدار القارب)
let nextWaterLap = 1.8;
function playWaterLap(){
  if(!AC || !masterGain || muted || S.mode !== "play") return;
  try{
    const t = AC.currentTime;
    const len = Math.floor(AC.sampleRate * 0.22);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for(let i = 0; i < len; i++){
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    }

    const src = AC.createBufferSource();
    src.buffer = buf;

    const filter = AC.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(850 + Math.random() * 400, t);
    filter.frequency.exponentialRampToValueAtTime(450, t + 0.20);
    filter.Q.value = 2.0;

    const gn = AC.createGain();
    gn.gain.setValueAtTime(0.055, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.20);

    src.connect(filter).connect(gn).connect(masterGain);
    src.start(t);
  }catch(e){}
}
