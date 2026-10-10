/* === INPUT.JS: Keyboard, Virtual Joystick, Action Buttons & Resize Events === */
"use strict";

function resizeCheck(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  const w=Math.max(1,Math.floor(innerWidth*dpr));
  const h=Math.max(1,Math.floor(innerHeight*dpr));

  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  if(gcv.width!==w||gcv.height!==h){gcv.width=w;gcv.height=h;}

  PX0=pxStart();
  const cfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
  WIN.x=PX0+cfg.winDist;
  if(player && S.mode!=="play" && S.mode!=="pause" && S.mode!=="win" && S.mode!=="dying" && S.mode!=="over"){
    player.x=PX0;
  }
}


/* ---------- ACTION BUTTON LISTENERS (🥊 KICK, ⚡ BOOST, 🐬 DOLPHIN) ---------- */
const elBtnKick = document.getElementById("btnKick");
if(elBtnKick){
  elBtnKick.addEventListener("pointerdown", e => {
    e.preventDefault();
    triggerKick();
  });
}

const elBtnDolphin = document.getElementById("btnDolphin");
if(elBtnDolphin){
  elBtnDolphin.addEventListener("pointerdown", e => {
    e.preventDefault();
    if(player && player.onDolphin){
      if(typeof triggerDolphinJump === "function") triggerDolphinJump();
      else toggleDolphinRide();
    } else {
      toggleDolphinRide();
    }
  });
}

const elBtnBoost = document.getElementById("btnBoost");
if(elBtnBoost){
  elBtnBoost.addEventListener("pointerdown", e => {
    e.preventDefault();
    if(player && player.onDolphin && typeof triggerDolphinJump === "function"){
      triggerDolphinJump();
    } else {
      touchBoostActive = true;
    }
  });
  const stopBoost = (e) => {
    e && e.preventDefault && e.preventDefault();
    touchBoostActive = false;
  };
  elBtnBoost.addEventListener("pointerup", stopBoost);
  elBtnBoost.addEventListener("pointercancel", stopBoost);
  elBtnBoost.addEventListener("pointerleave", stopBoost);
}

/* ---------- BOOST / TURBO SYSTEM ---------- */
stamina = 1.0;
isBoosting = false;
boostCooldown = 0;
touchBoostActive = false;


function joyEnd(){
  joy.id=null; joy.x=0; joy.y=0;
}

function pointerBlocked(target){
  return !!target.closest("button,#p,.ov,.card");
}

window.addEventListener("pointerdown",e=>{
  if(S.mode!=="play")return;

  if(e.pointerType==="touch"){
    // Old virtual joystick removed, handled by BoatHUD now
    return;
  }

  if(e.pointerType==="mouse"){
    const now=performance.now()/1000;
    if(now-lastRip>.08){
      lastRip=now;
      addRipple(
        e.clientX/Math.max(1,innerHeight)+cam.x,
        (1-e.clientY/Math.max(1,innerHeight))+cam.y,
        now-t0
      );
    }
  }
});

window.addEventListener("pointermove",e=>{
  if(S.mode==="play" && e.pointerType==="mouse"){
    const now=performance.now()/1000;
    if(now-lastRip>.13){
      lastRip=now;
      addRipple(
        e.clientX/Math.max(1,innerHeight)+cam.x,
        (1-e.clientY/Math.max(1,innerHeight))+cam.y,
        now-t0
      );
    }
  }
});

window.addEventListener("pointerup",e=>{if(e.pointerId===joy.id)joyEnd()});
window.addEventListener("pointercancel",e=>{if(e.pointerId===joy.id)joyEnd()});

/* ---------- WHEEL ZOOM SCROLLING ---------- */
window.addEventListener("wheel", e => {
  if (pointerBlocked(e.target)) return;
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
  targetZoom = clamp(targetZoom * zoomFactor, 0.45, 2.5);
}, { passive: false });



/* ---------- UI buttons ---------- */
function startGame(){
  initAudio();
  currentLevel = 1;
  hearts = 5;
  score = 0;

  // AAA flow: Play → Cinematic Manga → then Gameplay
  // On first play, show the manga cutscene which calls startFromManga() on completion
  if(!window._mangaSeenThisSession){
    window._mangaSeenThisSession = true;
    hide("ovStart");
    openMangaIntro(0);
  } else {
    // Subsequent replays skip the cutscene
    startLevel(1);
  }
}

const setClick = (id, fn) => {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
};

setClick("btnStart", startGame);
setClick("btnNextLevel", () => {
  hide("ovLevelWin");
  startLevel(currentLevel + 1);
});
setClick("btnRetry", () => {
  if (typeof restoreFromCheckpoint === "function") {
    restoreFromCheckpoint();
  } else {
    hide("ovOver");
    hearts = 5;
    startLevel(currentLevel);
  }
});
setClick("btnRestart", () => {
  if (typeof restoreFromCheckpoint === "function") {
    restoreFromCheckpoint();
  } else {
    hide("ovOver");
    hearts = 5;
    startLevel(currentLevel);
  }
});
setClick("btnReplay1", () => {
  hide("ovWin");
  currentLevel = 1;
  hearts = 5;
  score = 0;
  startLevel(1);
});
setClick("btnBottleReplay", () => {
  hide("ovBottleWin");
  currentLevel = 1;
  hearts = 5;
  score = 0;
  startLevel(1);
});
setClick("btnResume", () => {
  hide("ovPause");
  S.mode = "play";
});
setClick("btnResumeTutorial", () => {
  hide("ovSharkTutorial");
  S.mode = "play";
});
setClick("btnPause", () => {
  if (S.mode === "play") { S.mode = "pause"; show("ovPause"); }
  else if (S.mode === "pause") { hide("ovPause"); S.mode = "play"; }
});
setClick("btnSound", e => {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : .55;
  e.currentTarget.textContent = muted ? "🔇" : "🔊";
});
setClick("gear", () => {
  const p = document.getElementById("p");
  if (p) p.classList.toggle("hide");
});

document.querySelectorAll("#p input").forEach(cb=>{
  cb.addEventListener("change",()=>layerFlags[+cb.dataset.i]=cb.checked?1:0);
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden && S.mode==="play"){
    S.mode="pause";show("ovPause");
  }
});



window.addEventListener("resize", resizeCheck, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(resizeCheck, 100), { passive: true });


window.addEventListener('boathud:move', e => {
  if(S.mode!=='play') return;
  joy.x = e.detail.x;
  joy.y = e.detail.y;
});

window.addEventListener('boathud:action', e => {
  if(S.mode!=='play') return;
  if(e.detail.action === 'kick' && typeof triggerKick === 'function') triggerKick();
  if(e.detail.action === 'dolphin' && typeof toggleDolphinRide === 'function') toggleDolphinRide();
  if(e.detail.action === 'boostStart'){
    if(player && player.onDolphin && typeof triggerDolphinJump === 'function'){
      triggerDolphinJump();
    } else {
      touchBoostActive = true;
    }
  }
  if(e.detail.action === 'boostEnd') touchBoostActive = false;
});
