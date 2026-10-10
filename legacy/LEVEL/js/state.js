/* === STATE.JS: Global Game State, Score, HUD & Mode Transitions === */
"use strict";

const keys = Object.create(null);
const joy = { id: null, bx: 0, by: 0, x: 0, y: 0 };

/* ---------- UI Helper Functions ---------- */
function show(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove("hide");
}
function hide(id){
  const el = document.getElementById(id);
  if(el) el.classList.add("hide");
}

/* ---------- state ---------- */
const layerFlags=new Float32Array(8).fill(1);
const ripples=new Float32Array(24).fill(0);
for(let i=0;i<8;i++)ripples[i*3+2]=-99;

let ripIdx=0;
let lastRip=0;


let S={mode:"start"};
let player=null,cam=null;
let hearts=5,score=0,gt=0,winShown=false,shake=0;
let genIslX=0,genCrateX=0,nextEnemy=0,nextFish=0,mileIdx=0;
let islands=[],crates=[],enemies=[],parts=[],bubbles=[],wake=[];

/* ---------- BOOST / TURBO SYSTEM ---------- */
let stamina = 1.0;
let isBoosting = false;
let boostCooldown = 0;
let touchBoostActive = false;

let bottleQuest = {
  stage: "mirage", // "mirage", "vanished", "shark_ambush", "boat_break", "dolphin_rescue", "go_to_island", "island_craft", "final_voyage", "bottle_found"
  mirageX: 0,
  mirageY: 0.50,
  realBottleX: 0,
  realBottleY: 0.50,
  found: false,
  compassAngle: 0,
  distToTarget: 0,
  glimmerTimer: 0,
  ambushTimer: 0,
  mirageAlpha: 1.0,
  mirageVanishing: false
};

let soloDolphin = {
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  ang: 0,
  animFrame: 0,
  isJumping: false,
  jumpFrame: 0,
  jumpTimer: 4.0
};


function updateActionBtnUI(){
  const elBtnKick = document.getElementById("btnKick");
  const elIcon = document.getElementById("kickIconCircle");
  const elTitle = document.getElementById("kickTitle");
  const elKey = document.getElementById("kickKey");
  const elBtnDolphin = document.getElementById("btnDolphin");
  const elSailInfo = document.getElementById("sailInfo");

  const dolphinUnlocked = (typeof currentLevel !== "undefined" && currentLevel > 1) || 
    (player && (player.boatDestroyed || player.dolphinRescueUsed || player.onDolphin));

  if(elBtnDolphin){
    elBtnDolphin.style.display = dolphinUnlocked ? "" : "none";
  }
  if(elSailInfo && !dolphinUnlocked){
    elSailInfo.style.display = "none";
  }

  if(!elBtnKick) return;

  if(player && player.onLand && player.parkedBoat){
    if(elIcon) elIcon.textContent = "🛶";
    if(elTitle) elTitle.textContent = "ركوب القارب";
    if(elKey) elKey.textContent = "Space / F";
    elBtnKick.classList.remove("dolphin-mode");
  } else if(player && player.onLand){
    if(elIcon) elIcon.textContent = "🏖️";
    if(elTitle) elTitle.textContent = "استكشاف الشاطئ";
    if(elKey) elKey.textContent = "Space / F";
    elBtnKick.classList.remove("dolphin-mode");
  } else if(player && player.onDolphin){
    if(elIcon) elIcon.textContent = "🐬";
    if(elTitle) elTitle.textContent = "قفزة الدلفين";
    if(elKey) elKey.textContent = "Space / F";
    elBtnKick.classList.add("dolphin-mode");
  } else {
    if(elIcon) elIcon.textContent = "🥊";
    if(elTitle) elTitle.textContent = "ضربة القرش";
    if(elKey) elKey.textContent = "Space / F";
    elBtnKick.classList.remove("dolphin-mode");
  }
}

function triggerDolphinJump(){
  if(S.mode !== "play" || !player || !player.onDolphin || player.isJumping) return;
  player.isJumping = true;
  player.jumpFrame = 0;
  player.jumpAirHeight = 0;
  sDolphinJump();
  sDolphinChirp();
  burst(player.x, player.y, "#ffffff", 14, 1.1);
  ring(player.x, player.y, "rgba(0, 242, 254, 0.85)");

  const elBtnKick = document.getElementById("btnKick");
  if(elBtnKick){
    elBtnKick.classList.add("active");
    setTimeout(() => elBtnKick.classList.remove("active"), 200);
  }
}

function toggleDolphinRide(){
  if(S.mode !== "play" || !player) return;

  const dolphinUnlocked = (typeof currentLevel !== "undefined" && currentLevel > 1) || 
    (player.boatDestroyed || player.dolphinRescueUsed || player.onDolphin);
  if(!dolphinUnlocked){
    return; // Dolphin not met yet — only boat and bottle exist at this stage
  }

  if(player.boatDestroyed){
    toast("⚠️ القارب تحطم تماماً! الدلفين هو مركبك الآن حتى خط النهاية!");
    return;
  }
  if(player.isJumping){
    player.isJumping = false;
    player.jumpAirHeight = 0;
    player.jumpFrame = 0;
  }
  player.onDolphin = !player.onDolphin;
  if(player.onDolphin){
    sDolphinChirp();
    toast("🐬 ركبت الدلفين الصديق! اضغط Space أو زر القفز للقفز فوق القروش!");
    floatTxt(player.x, player.y - 0.1, "🐬 وضع الدلفين!", "#00f2fe");
    burst(player.x, player.y, "#00f2fe", 16, 1.2);
  } else {
    soloDolphin.x = player.x - 0.22;
    soloDolphin.y = player.y + 0.1;
    soloDolphin.vx = player.vx;
    soloDolphin.vy = player.vy;
    toast("🛶 عدت إلى القارب!");
    floatTxt(player.x, player.y - 0.1, "🛶 وضع القارب!", "#ffd166");
    burst(player.x, player.y, "#ffd166", 12, 1.0);
  }
  updateActionBtnUI();
  updateHUD(true);
}

function triggerDolphinRescue(){
  S.mode = "play";
  sBoatBreak();

  player.isRescuing = true;
  player.rescueFrame = 0;
  player.inv = 5.0;
  player.vx = 0;
  player.vy = 0;
  shake = 0.5;

  burst(player.x, player.y, "#ff6b6b", 12, 1.2);
  burst(player.x, player.y, "#ffffff", 18, 1.4);
  toast("⚠️ تحطم القارب! الدلفين الصديق قادم لإنقاذك في اللحظة الأخيرة!");
  floatTxt(player.x, player.y - 0.12, "💥 تحطم القارب!", "#ff6b6b");

  // Push back surrounding sharks to clear the stage for the rescue animation
  if(enemies && enemies.length > 0){
    for(const en of enemies){
      if(en.state === "attack"){
        en.state = "chase";
        en.anim = "move";
      }
      const edx = en.x - player.x, edy = en.y - player.y;
      const ed = Math.hypot(edx, edy) || 1;
      if(ed < 0.9){
        en.vx = (edx / ed) * 0.35;
        en.vy = (edy / ed) * 0.35;
      }
    }
  }

  // Deactivate free-roaming solo dolphin so it merges into the rescue
  if(soloDolphin) soloDolphin.active = false;
}

const ENEMY_COLS=[
  ["#8e6ff0","#5d3fd3"],
  ["#ff9f43","#d97706"],
  ["#ef476f","#b91c4a"],
  ["#12b886","#0b7a58"]
];


/* ---------- helpers/game reset ---------- */
function addRipple(wx,wy,tNow){
  // Water impact effect disabled completely per user request
}

function resetRipples(){
  for(let i=0;i<8;i++)ripples[i*3+2]=-99;
}

function initBottleQuest(){
  bottleQuest = {
    stage: "",
    chaseTimer: 0, phaseTimer: 0, searchTimer: 0, cycle: 0,
    mirageX: PX0 + 0.85, mirageY: 0.50,
    realBottleX: WIN.x - 0.70, realBottleY: 0.50,
    found: false,
    compassAngle: 0, distToTarget: 0, glimmerTimer: 0,
    ambushSpawned: false, breakTimer: 4.0,
    mirageAlpha: 1.0, mirageVanishing: false,
    lostTimer: 0, waypointAlpha: 0,
    targetX: 0, targetY: 0.50, targetIcon: "🍼", targetLabel: "القارورة",
    guidePromptVisible: (currentLevel === 1), guidePromptTimer: 0,
    flashed: false, flashTimer: 0, finalAmbush: false
  };

  let title = "بداية الرحلة 🍼";
  if(currentLevel === 1){
    bottleQuest.stage = "chase_1";
    bottleQuest.mirageX = PX0 + 0.85; // Clearly placed in front of player
    bottleQuest.mirageY = 0.50;
  } else if(currentLevel === 2){
    bottleQuest.stage = "go_to_island";
    bottleQuest.mirageAlpha = 0;
    bottleQuest.mirageVanishing = true;
    title = "الدلفين يقودك إلى الجزيرة 🐬";
  } else {
    bottleQuest.stage = "mirage_show";
    bottleQuest.mirageX = PX0 + 0.95;
    bottleQuest.mirageY = 0.50;
    title = "المطاردة الأخيرة 🍼";
  }

  const elChipCompass = document.getElementById("chipCompass");
  if(elChipCompass) elChipCompass.style.display = "inline-flex";
  const elGuide = document.getElementById("guidePrompt");
  if(elGuide){
    if(currentLevel === 1){ elGuide.style.display = "flex"; elGuide.classList.remove("fade-out"); }
    else elGuide.style.display = "none";
  }

  window.bottleQuest = bottleQuest;
  saveCheckpoint(bottleQuest.stage, title);
}

/* ---------- COMPREHENSIVE CHECKPOINT SYSTEM (Anti-frustration on death) ---------- */
function saveCheckpoint(stageKey, title){
  if(typeof bottleQuest === "undefined" || !bottleQuest) return;
  const nodesState = (typeof lootIsland !== "undefined" && lootIsland && lootIsland.lootNodes)
    ? lootIsland.lootNodes.map(n => ({ id: n.id, taken: !!n.taken }))
    : [];
  bottleQuest.checkpoint = {
    stage: stageKey,
    x: player ? player.x : PX0,
    y: player ? player.y : 0.50,
    boatDestroyed: player ? !!player.boatDestroyed : false,
    dolphinRescueUsed: player ? !!player.dolphinRescueUsed : false,
    onDolphin: player ? !!player.onDolphin : false,
    onLand: player ? !!player.onLand : false,
    onBeach: player ? !!player.onBeach : false,
    wood: player ? (player.wood || 0) : 0,
    nodesState: nodesState,
    chaseTimer: bottleQuest.chaseTimer || 0,
    cycle: bottleQuest.cycle || 0,
    title: title || ""
  };
  if(typeof toast === "function") toast("💾 نقطة حفظ: " + (title || ""));
}

function restoreFromCheckpoint(){
  if(!bottleQuest || !bottleQuest.checkpoint){ reset(); return; }
  const cp = bottleQuest.checkpoint;
  hearts = 5;
  Object.assign(player, {
    x: cp.x, y: cp.y, vx: 0, vy: 0, ang: 0, inv: 3.5,
    boatDestroyed: !!cp.boatDestroyed,
    dolphinRescueUsed: !!cp.dolphinRescueUsed,
    onDolphin: !!cp.onDolphin,
    onLand: !!cp.onLand,
    onBeach: !!cp.onBeach,
    wood: cp.wood || 0,
    isRescuing: false, rescueFrame: 0,
    isKicking: false, isJumping: false, jumpFrame: 0, jumpAirHeight: 0
  });

  // Quest state
  const bq = bottleQuest;
  bq.stage = cp.stage;
  bq.chaseTimer = cp.chaseTimer || 0;
  bq.cycle = cp.cycle || 0;
  bq.phaseTimer = 0;
  bq.found = false;
  bq.ambushSpawned = false;
  bq.finalAmbush = false;
  bq.breakTimer = 4.0;
  bq.flashTimer = 0;
  const visible = ["chase_1", "chase_2", "chase_3", "mirage_show"].includes(cp.stage);
  bq.mirageVanishing = !visible;
  bq.mirageAlpha = visible ? 1 : 0;
  bq.mirageX = cp.x + aspect() * 0.46;
  bq.mirageY = 0.5;
  const elAttack = document.getElementById("attackPrompt");
  if(elAttack) elAttack.style.display = "none";

  if(typeof lootIsland !== "undefined" && lootIsland && lootIsland.lootNodes && cp.nodesState && cp.nodesState.length){
    cp.nodesState.forEach(saved => {
      const node = lootIsland.lootNodes.find(n => n.id === saved.id);
      if(node) node.taken = saved.taken;
    });
  }

  window.timeScale = 1;

  const dolphinUnlocked = currentLevel > 1 || player.boatDestroyed || player.dolphinRescueUsed || player.onDolphin;
  if(typeof soloDolphin !== "undefined" && soloDolphin){
    soloDolphin.active = dolphinUnlocked && !player.onDolphin;
    soloDolphin.x = player.x - 0.25;
    soloDolphin.y = player.y + 0.15;
    soloDolphin.vx = 0; soloDolphin.vy = 0;
    soloDolphin.isJumping = false;
  }

  if(typeof enemies !== "undefined" && Array.isArray(enemies)) enemies.length = 0;
  nextEnemy = 3.5;

  if(typeof cam !== "undefined" && cam){
    cam.x = player.x - aspect() * 0.42;
    cam.y = player.y - 0.5;
  }
  targetZoom = 1.0;
  zoom = 1.0;

  S.mode = "play";
  hide("ovOver");
  hide("ovPause");
  if(typeof sSplash === "function") sSplash();
  burst(player.x, player.y, "#00f2fe", 24, 1.8);
  floatTxt(player.x, player.y - 0.14, "✨ عُدتَ من نقطة الحفظ!", "#00f2fe");
  toast("✨ عودة من نقطة الحفظ: " + (cp.title || ""));
  updateActionBtnUI();
  updateHUD(true);
}
window.restoreFromCheckpoint = restoreFromCheckpoint;
window.saveCheckpoint = saveCheckpoint;

function updateBottleQuest(dt){
  if(!player || S.mode !== "play" || !bottleQuest) return;
  const bq = bottleQuest;
  bq.glimmerTimer += dt;
  if(player.hasMoved || currentLevel > 1) bq.chaseTimer += dt;

  const viewW = aspect() / Math.max(0.5, zoom || 1);

  // Stage 1 guidance prompt dismissal once player starts sailing forward
  if(bq.guidePromptVisible && (player.x > PX0 + 0.35 || player.vx > 0.08)){
    bq.guidePromptTimer += dt;
    if(bq.guidePromptTimer > 0.8){
      bq.guidePromptVisible = false;
      const elGuide = document.getElementById("guidePrompt");
      if(elGuide){
        elGuide.classList.add("fade-out");
        setTimeout(() => { elGuide.style.display = "none"; }, 450);
      }
    }
  }

  // --- Bottle natural slow water drift ---
  const driftBottleSlow = (speed = 0.028) => {
    // Drifts slowly in the sea current with gentle wave bobbing
    bq.mirageX += dt * speed;
    const waveBob = 0.50 + Math.sin(bq.glimmerTimer * 1.6 + bq.mirageX * 2.5) * 0.035;
    bq.mirageY += (waveBob - bq.mirageY) * Math.min(1, dt * 2.0);
  };

  // Vanish sequence with magical splash and 2-second message
  const vanishBottle = (msg) => {
    bq.mirageVanishing = true;
    if(typeof sSplash === "function") sSplash();
    if(typeof burst === "function"){
      burst(bq.mirageX, bq.mirageY, "#ffffff", 24, 1.5);
      burst(bq.mirageX, bq.mirageY, "#7ae0ff", 18, 1.3);
    }
    if(typeof ring === "function") ring(bq.mirageX, bq.mirageY, "rgba(255,255,255,0.95)");
    
    // Text appears for 2 seconds and disappears
    const text = msg || "«اختفت القارورة! أين ذهبت؟! 🌊»";
    toast(text, 2000);
    if(typeof floatTxt === "function") floatTxt(player.x, player.y - 0.14, "«اختفت القارورة! 😮»", "#ffd166");
    
    targetZoom = 1.12;
    setTimeout(() => { targetZoom = 1.0; }, 1400);
  };

  const showReappearedBottle = (aheadDist, checkpointTitle) => {
    bq.mirageX = player.x + (aheadDist || 1.25);
    bq.mirageY = 0.50;
    bq.mirageVanishing = false;
    bq.mirageAlpha = 0;
    if(typeof sSplash === "function") sSplash();
    if(typeof ring === "function") ring(bq.mirageX, bq.mirageY, "rgba(255,255,255,0.95)");
    if(checkpointTitle) saveCheckpoint(bq.stage, checkpointTitle);
    toast("✨ ظهر بريق القارورة مجدداً في الأفق!", 2000);
  };

  const spawnAmbushShark = (x, y, ang) => {
    enemies.push({
      x, y, vx: Math.cos(ang) * 0.3, vy: Math.sin(ang) * 0.3, ang,
      hp: 3, maxHp: 3, state: "chase", anim: "move", animFrame: 0,
      say: 0, ft: 0, hitTimer: 0, stunTimer: 0, ph: Math.random() * 7,
      sp: 0.30, spin: 0, attackCooldown: 0, isAmbush: true
    });
  };

  // Distance from player to mirage bottle
  const dToBottle = Math.hypot(player.x - bq.mirageX, player.y - bq.mirageY);

  /* ================= CHAPTER 1: shore & chase ================= */
  if(currentLevel === 1){
    if(bq.stage === "chase_1"){
      driftBottleSlow(0.025);
      // When getting close to the bottle, it vanishes and text appears for 2 seconds!
      if(dToBottle < 0.22 && !bq.mirageVanishing){
        vanishBottle("«اختفت القارورة في خضم الأمواج! أين ذهبت؟! 😮»");
        bq.stage = "vanish_1";
        bq.searchTimer = 0;
        // Spawn slow tutorial shark to learn kicking safely
        setTimeout(() => {
          if(S.mode === "play" && bq.stage === "vanish_1"){
            nextEnemy = 0.5;
            toast("🦈 زعنفة تقترب! استعد للركل [🥊 / F]", 2000);
          }
        }, 1800);
      }
    } else if(bq.stage === "vanish_1"){
      // Search with compass for ~7.5 seconds
      bq.searchTimer += dt;
      if(bq.mirageAlpha <= 0.01){
        bq.mirageX = player.x + viewW * 0.65;
      }
      if(bq.searchTimer >= 7.5){
        bq.stage = "chase_2";
        showReappearedBottle(1.20, "ظهور القارورة من جديد 🍼");
      }
    } else if(bq.stage === "chase_2"){
      driftBottleSlow(0.030);
      // When getting close the second time, the shark ambush triggers!
      if(dToBottle < 0.24 && !bq.mirageVanishing){
        vanishBottle("«تلاشت في القاع وسط زعانف مرعبة! 😱»");
        bq.stage = "shark_ambush";
        bq.ambushSpawned = false;
        bq.breakTimer = 4.0;
      }
    } else if(bq.stage === "shark_ambush"){
      if(!bq.ambushSpawned){
        bq.ambushSpawned = true;
        if(typeof sSharkWarn === "function") sSharkWarn();
        toast("⚠️ ثلاثة قروش تحاصر القارب! اركل [🥊 / F]!", 2000);
        if(typeof floatTxt === "function") floatTxt(player.x, player.y - 0.12, "🦈 كمين!", "#ff4444");
        const elAttack = document.getElementById("attackPrompt");
        if(elAttack){ elAttack.style.display = "flex"; elAttack.classList.remove("fade-out"); }
        for(let i = 0; i < 3; i++){
          spawnAmbushShark(player.x + viewW * 0.45 + i * 0.12, player.y + (i - 1) * 0.24, Math.PI);
        }
      }
      if(player.isKicking){
        const elAttack = document.getElementById("attackPrompt");
        if(elAttack && elAttack.style.display !== "none" && !elAttack.classList.contains("fade-out")){
          elAttack.classList.add("fade-out");
          setTimeout(() => { elAttack.style.display = "none"; }, 450);
        }
      }
      bq.breakTimer -= dt;
      if(bq.breakTimer <= 0 && !player.boatDestroyed){
        shake = 0.85;
        if(typeof spawnBoatDebris === "function") spawnBoatDebris(player.x, player.y);
        if(typeof burst === "function"){
          burst(player.x, player.y, "#ffd166", 32, 2.2);
          burst(player.x, player.y, "#ff4444", 24, 1.8);
        }
        player.boatDestroyed = true;
        bq.stage = "rescue";
        bq.mirageVanishing = true;
        const elAttack = document.getElementById("attackPrompt");
        if(elAttack) elAttack.style.display = "none";
        triggerDolphinRescue();
      }
    }
  }

  /* ================= CHAPTER 2: friendship & crafting ================= */
  else if(currentLevel === 2){
    if(bq.stage === "go_to_island" && lootIsland && !bq.flashed &&
       player.x > PX0 + (lootIsland.x - PX0) * 0.45){
      bq.flashed = true;
      bq.flashTimer = 2.8;
      bq.mirageX = player.x + viewW * 0.42;
      bq.mirageY = 0.32;
      bq.mirageVanishing = false;
      bq.mirageAlpha = 0;
      if(typeof sSplash === "function") sSplash();
      toast("🍼 القارورة تلمع في الأفق! لكن الدلفين يقودك إلى الجزيرة أولاً...", 2000);
    }
    if(bq.flashTimer > 0){
      bq.flashTimer -= dt;
      bq.mirageX = Math.max(bq.mirageX, player.x + viewW * 0.3);
      if(bq.flashTimer <= 0) bq.mirageVanishing = true;
    }
  }

  /* ================= CHAPTER 3: final chase ================= */
  else if(currentLevel === 3){
    if(bq.stage === "mirage_show"){
      driftBottleSlow(0.032);
      // When approaching mirage bottle in chapter 3, it vanishes and text appears for 2s!
      if(dToBottle < 0.22 && !bq.mirageVanishing){
        vanishBottle(bq.cycle === 0 ? "«اختفت! مجرد سراب! 🌊»" : "«سراب آخر! أين القارورة الحقيقية؟! 😮»");
        bq.stage = "mirage_hide";
        bq.phaseTimer = 0;
      }
    } else if(bq.stage === "mirage_hide"){
      bq.phaseTimer += dt;
      if(bq.mirageAlpha <= 0.01){
        bq.mirageX = player.x + viewW * 0.70;
      }
      if(bq.phaseTimer >= 3.2){
        bq.phaseTimer = 0;
        bq.cycle++;
        if(bq.cycle >= 2){
          bq.stage = "final_voyage";
          bq.realBottleX = player.x + 3.2;
          bq.realBottleY = 0.50;
          bq.finalAmbush = false;
          saveCheckpoint("final_voyage", "القارورة الحقيقية! 🌟");
          toast("🌟 هذه المرة حقيقية! اتبع ضوء القارورة!", 2000);
        } else {
          bq.stage = "mirage_show";
          showReappearedBottle(1.30, null);
        }
      }
    } else if(bq.stage === "final_voyage" && !bq.found){
      if(!bq.finalAmbush && bq.realBottleX - player.x < 1.8){
        bq.finalAmbush = true;
        if(typeof sSharkWarn === "function") sSharkWarn();
        toast("⚠️ الكمين الأخير! القروش تهاجم من الجانبين!", 2000);
        spawnAmbushShark(player.x + 0.2, player.y - 0.55, Math.PI / 2);
        spawnAmbushShark(player.x + 0.2, player.y + 0.55, -Math.PI / 2);
        spawnAmbushShark(player.x + viewW * 0.5, player.y, Math.PI);
      }
      const dReal = Math.hypot(player.x - bq.realBottleX, player.y - bq.realBottleY);
      if(dReal < 0.28){
        bq.found = true;
        bq.stage = "bottle_found";
        score += 150;
        if(typeof sScore === "function") sScore();
        if(typeof burst === "function"){
          burst(bq.realBottleX, bq.realBottleY, "#ffd166", 45, 2.6);
          burst(bq.realBottleX, bq.realBottleY, "#00f2fe", 38, 2.3);
        }
        if(typeof ring === "function") ring(bq.realBottleX, bq.realBottleY, "rgba(255, 209, 102, 0.98)");
        if(typeof floatTxt === "function") floatTxt(player.x, player.y - 0.16, "🎉 وجدت القارورة! 🍼✨", "#00f2fe");
        updateHUD(true);
        doBottleVictory();
        return;
      }
    }
  }

  // Mirage fade in / out
  if(bq.mirageVanishing) bq.mirageAlpha = Math.max(0, bq.mirageAlpha - dt * 2.2);
  else bq.mirageAlpha = Math.min(1, bq.mirageAlpha + dt * 2.2);

  // --- compass target ---
  let tx = bq.mirageX, ty = bq.mirageY, targetIcon = "🍼", targetLabel = "القارورة";
  if(currentLevel === 2 && lootIsland){
    if(bq.stage === "go_to_island"){
      tx = lootIsland.x; ty = lootIsland.y; targetIcon = "🏝️"; targetLabel = "جزيرة الأخشاب";
    } else if(player.wood < player.maxWood){
      const node = lootIsland.lootNodes.find(n => !n.taken);
      if(node){ tx = node.x; ty = node.y; } else { tx = lootIsland.workbench.x; ty = lootIsland.workbench.y; }
      targetIcon = "🪵"; targetLabel = "خشب";
    } else {
      tx = lootIsland.workbench.x; ty = lootIsland.workbench.y; targetIcon = "🔨"; targetLabel = "طاولة النجارة";
    }
  } else if(currentLevel === 3 && (bq.stage === "final_voyage" || bq.stage === "bottle_found")){
    tx = bq.realBottleX; ty = bq.realBottleY; targetLabel = "القارورة الحقيقية";
  } else if(bq.stage === "vanish_1" || bq.stage === "mirage_hide"){
    targetLabel = "البحث عن القارورة";
  }
  bq.targetX = tx; bq.targetY = ty;
  bq.targetIcon = targetIcon; bq.targetLabel = targetLabel;

  const dx = tx - player.x, dy = ty - player.y;
  bq.distToTarget = Math.hypot(dx, dy);
  bq.compassAngle = Math.atan2(dy, dx);

  // Guide arc appears only when player idles or heads the wrong way
  const pSpd = Math.hypot(player.vx, player.vy);
  let da = bq.compassAngle - player.ang;
  while(da > Math.PI) da -= 2 * Math.PI;
  while(da < -Math.PI) da += 2 * Math.PI;
  const onCourse = pSpd > 0.07 && Math.cos(da) > 0.35;
  if(onCourse) bq.lostTimer = Math.max(0, bq.lostTimer - dt * 2.4);
  else bq.lostTimer += dt;
  if(bq.lostTimer > 1.6 && bq.stage !== "bottle_found") bq.waypointAlpha = Math.min(1, bq.waypointAlpha + dt * 2.6);
  else bq.waypointAlpha = Math.max(0, bq.waypointAlpha - dt * 2.8);

  if(window.BoatHUD){
    BoatHUD.setDestinationDistance(Math.max(0, Math.round(bq.distToTarget * 25)));
    BoatHUD.setRouteAngle(Math.round(bq.compassAngle * 180 / Math.PI));
  }
}

function doBottleVictory(){
  if(winShown) return;
  winShown = true;
  S.mode = "win";
  sWin();

  let prevBest = 0; try { prevBest = parseInt(localStorage.getItem("boat_kid_high") || "0", 10); } catch(e){}
  const bestScore = Math.max(score, prevBest);
  try { localStorage.setItem("boat_kid_high", bestScore); } catch(e){}
  const bestTxt = bestScore > score ? ` (أفضل رقم: ${fmt(bestScore)})` : " 🏆 رقم قياسي جديد!";

  const elBottleScore = document.getElementById("bottleWinScore");
  if(elBottleScore){
    elBottleScore.textContent = "⭐ النقاط: " + fmt(score) + bestTxt + " • ❤️ القلوب: " + fmt(hearts);
  }

  show("ovBottleWin");
  updateHUD(true);
}

function startLevel(lvlNumber = 1){
  currentLevel = clamp(lvlNumber || 1, 1, TOTAL_LEVELS);
  const cfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];

  PX0 = pxStart();
  WIN = {x: PX0 + cfg.winDist, y: .5, r: .22, hitCd: 0};

  player = {
    x: PX0, y: .5, vx: 0, vy: 0, ang: 0, inv: 1.5, animFrame: 0,
    isKicking: false,
    kickFrame: 0,
    kickCooldown: 0,
    kickSide: 1,
    hitEnemies: [],
    // Dolphin properties:
    onDolphin: false,
    dolphinAnimFrame: 0,
    isJumping: false,
    jumpFrame: 0,
    jumpAirHeight: 0,
    boatDestroyed: false,
    dolphinRescueUsed: false,
    isRescuing: false,
    rescueFrame: 0,
    onLand: false,
    onBeach: false,
    parkedBoat: null,
    walkFrame: 0,
    wood: 0,
    maxWood: 5
  };
  if(currentLevel === 2){
    // Chapter 2 opens riding the dolphin that saved you
    player.boatDestroyed = true;
    player.dolphinRescueUsed = true;
    player.onDolphin = true;
  } else if(currentLevel === 3){
    // Chapter 3: new boat + dolphin companion
    player.dolphinRescueUsed = true;
  }

  // Loot Island & Bottle Quest initialization for this level
  initLootIsland();
  initBottleQuest();
  for(const k in keys) delete keys[k];
  if(typeof joyEnd === "function") joyEnd();
  soloDolphin.active = (currentLevel === 3);
  soloDolphin.x = PX0 - 0.28;
  soloDolphin.y = 0.62;
  soloDolphin.vx = 0;
  soloDolphin.vy = 0;
  soloDolphin.ang = 0;
  soloDolphin.animFrame = 0;
  soloDolphin.isJumping = false;
  soloDolphin.jumpFrame = 0;
  soloDolphin.jumpTimer = 3.0 + Math.random() * 3.0;
  updateActionBtnUI();
  cam = {x: player.x - aspect() * .42, y: 0};

  winShown = false;
  shake = 0;
  islands = [];
  crates = [];
  enemies = [];
  parts = [];
  bubbles = [];
  wake = [];
  genIslX = PX0 + 1.3;
  genCrateX = PX0 + .9;
  nextEnemy = 3.5;
  nextFish = 5;
  mileIdx = 0;

  resetRipples();
  if(player) { player.hasMoved = false; player.moveTutTimer = 0; }
  stamina = 1.0;
  isBoosting = false;
  boostCooldown = 0;
  touchBoostActive = false;
  stopTurboSound();

  const lblLvl = document.getElementById("lblLvl");
  if(lblLvl) lblLvl.textContent = `${fmt(currentLevel)} / ${fmt(TOTAL_LEVELS)}`;

  hide("ovBottleWin");
  hide("ovLevelWin");
  hide("ovWin");
  hide("ovPause");
  hide("ovOver");
  hide("ovStart");

  S.mode = "play";
  sSplash();
  updateHUD(true);
  toast(cfg.title);
  if(currentLevel === 2 && window.TutorialEngine){
    setTimeout(() => { if(S.mode === "play" && window.TutorialEngine) window.TutorialEngine.trigger("dolphin_ride"); }, 900);
  }
}

function reset(){
  hearts = 5;
  startLevel(currentLevel);
}

function updateHUD(force=false){
  if(!player) return;

  const prog=clamp((player.x-PX0)/Math.max(.001,(WIN.x-PX0)),0,1);
  const key=hearts+"|"+score+"|"+Math.round(prog*200)+"|"+currentLevel;

  // We can still optionally skip for optimization if needed, but for smooth HUD we might want it every frame.
  // Actually, we'll force it every frame if window.BoatHUD exists because position changes continuously.

  const elHearts = document.getElementById("hearts");
  if(elHearts) elHearts.textContent="❤️".repeat(Math.max(0,hearts))+"🖤".repeat(Math.max(0,5-hearts));
  
  const elScore = document.getElementById("score");
  if(elScore) elScore.textContent=fmt(score);
  
  const elDepth = document.getElementById("depth");
  if(elDepth) elDepth.textContent=fmt(Math.max(0,(player.x-PX0)*25));

  const elWoodCount = document.getElementById("woodCount");
  if(elWoodCount) elWoodCount.textContent = (player && player.wood !== undefined) ? player.wood : 0;
  
  const lblLvl = document.getElementById("lblLvl");
  if(lblLvl) lblLvl.textContent = `${fmt(currentLevel)} / ${fmt(TOTAL_LEVELS)}`;

  if (window.BoatHUD) {
    BoatHUD.setSpeed(Math.hypot(player.vx, player.vy) * 20);
    BoatHUD.setSail(player.onDolphin ? true : false);
    
    const destX = (typeof bottleQuest !== 'undefined' && bottleQuest && bottleQuest.targetX) ? bottleQuest.targetX : WIN.x;
    const destY = (typeof bottleQuest !== 'undefined' && bottleQuest && bottleQuest.targetY) ? bottleQuest.targetY : WIN.y;

    // Minimap - map player from PX0..WIN.x to 10..90%
    BoatHUD.setMiniMapPosition(10 + prog * 80, 50 + (player.y - 0.5) * 50);
    BoatHUD.setMiniMapTarget(90, 50 + (destY - 0.5) * 50);

    // Direction (convert radians to degrees)
    BoatHUD.setHeading(player.ang * 180 / Math.PI);

    let routeAngle = Math.atan2(destY - player.y, destX - player.x) * 180 / Math.PI;
    BoatHUD.setRouteAngle(routeAngle);

    // Calculate distance
    let dist = Math.hypot(destX - player.x, destY - player.y) * 25;
    if(BoatHUD.setDestinationDistance) BoatHUD.setDestinationDistance(dist);

    if (typeof cam !== 'undefined' && innerHeight) {
       let px = (player.x - cam.x) * innerHeight * zoom;
       let py = (player.y - cam.y) * innerHeight * zoom;
       BoatHUD.setBoatPosition((px / innerWidth) * 100, (py / innerHeight) * 100);

       let sx = (destX - cam.x) * innerHeight * zoom;
       let sy = (destY - cam.y) * innerHeight * zoom;
       let sxPct = clamp((sx / innerWidth) * 100, 5, 95);
       let syPct = clamp((sy / innerHeight) * 100, 15, 85);
       BoatHUD.setTarget(sxPct, syPct);
    }
  }
}

  let toastTimer=null;
function toast(msg, durationMs = 2000){
  if(!elToast) return;
  elToast.textContent = msg;
  elToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove("show"), durationMs);
}


function hitPlayer(e){
  if(S.mode !== "play") return;
  if(typeof bottleQuest !== "undefined" && bottleQuest && bottleQuest.stage === "shark_ambush"){
    // A5: During scripted ambush, shark hit triggers boat destruction (not heart loss)
    // but we must still give invincibility and defuse the shark to prevent re-hits
    player.inv = 2.5;
    shake = 0.4;
    sHit();
    e.state = "chase";
    e.anim = "move";
    // Push shark away so it doesn't immediately re-collide
    const edx = e.x - player.x, edy = e.y - player.y, ed = Math.hypot(edx, edy) || 1;
    e.vx = (edx / ed) * 0.3;
    e.vy = (edy / ed) * 0.3;
    e.stunTimer = 0.6;

    bottleQuest.breakTimer = -1; // Force immediate break in updateBottleQuest
    const elAttack = document.getElementById("attackPrompt");
    if(elAttack) elAttack.style.display = "none";
    return;
  }

  hearts--;
  player.inv=2;
  shake=.4;
  sHit();
  joyEnd();

  e.state="takedown";
  e.anim="takedown";
  e.animFrame=0;
  e.ft=0;
  e.say=1.6;

  const dx=e.x-player.x,dy=e.y-player.y,L=Math.hypot(dx,dy)||1;
  e.fdx=dx/L;e.fdy=dy/L;

  burst(player.x,player.y,"#ff6b6b",10,1.2);
  burst(e.x,e.y,"#ffffff",14,1.1);
  floatTxt(player.x,player.y-.08,"🦈 عضّة قرش! 💔","#ff6b6b");

  updateHUD(true);

  if(hearts<=0){
    S.mode="dying";sOver();
    setTimeout(()=>{
      if(S.mode==="dying"){
        S.mode="over";
        let prevBest = 0; try { prevBest = parseInt(localStorage.getItem("boat_kid_high") || "0", 10); } catch(e){}
        const bestScore = Math.max(score, prevBest);
        try { localStorage.setItem("boat_kid_high", bestScore); } catch(e){}
        const bestTxt = bestScore > score ? ` (أفضل رقم: ${fmt(bestScore)})` : " 🏆 رقم قياسي جديد!";
        document.getElementById("overScore").textContent="⭐ جمعت "+fmt(score)+" نقطة" + bestTxt;
        show("ovOver");
      }
    },700);
  }
}

function doWin(){
  if(winShown)return;
  if(typeof bottleQuest !== "undefined" && bottleQuest && bottleQuest.stage === "final_voyage" && !bottleQuest.found){
    bottleQuest.found = true;
    doBottleVictory();
    return;
  }
  winShown=true;
  score+=100;
  S.mode="win";
  sWin();

  burst(WIN.x,WIN.y,"#ffd166",30,2);
  burst(WIN.x,WIN.y,"#7ae0ff",20,1.6);

  let prevBest = 0; try { prevBest = parseInt(localStorage.getItem("boat_kid_high") || "0", 10); } catch(e){}
  const bestScore = Math.max(score, prevBest);
  try { localStorage.setItem("boat_kid_high", bestScore); } catch(e){}
  const bestTxt = bestScore > score ? ` (أفضل رقم: ${fmt(bestScore)})` : " 🏆 رقم قياسي جديد!";

  if(currentLevel < TOTAL_LEVELS){
    // Intermediate level victory (Level 1 or 2)
    hearts = Math.min(5, hearts + 2);
    const curCfg = LEVEL_CONFIGS[currentLevel - 1];
    const winEmoji = document.getElementById("lvlWinEmoji");
    const winTitle = document.getElementById("lvlWinTitle");
    const winScore = document.getElementById("lvlWinScore");
    const winNextDesc = document.getElementById("lvlWinNextDesc");

    if(winEmoji) winEmoji.textContent = currentLevel === 1 ? "🌴" : "🌊";
    if(winTitle) winTitle.textContent = `أكملت المرحلة ${fmt(currentLevel)} بنجاح! 🎉`;
    if(winScore) winScore.textContent = `⭐ مجموع نقاطك: ${fmt(score)} (+١٠٠ مكافأة!) • ❤️ القلوب: ${fmt(hearts)}`;
    if(winNextDesc && curCfg) {
      winNextDesc.textContent = curCfg.nextPreview || `استعد للمرحلة ${fmt(currentLevel + 1)}!`;
    }

    show("ovLevelWin");
  } else {
    // Grand victory (Level 3 complete)
    const st=1+(hearts>=3?1:0)+(score>=260?1:0);
    document.getElementById("starsRow").innerHTML=[1,2,3]
      .map(i=>`<span class="${i<=st?"":"dim"}">⭐</span>`).join("");

    document.getElementById("winScore").textContent=
      "⭐ النقاط: "+fmt(score)+bestTxt+" • ❤️ القلوب: "+fmt(hearts);

    show("ovWin");
  }
  updateHUD(true);
}


