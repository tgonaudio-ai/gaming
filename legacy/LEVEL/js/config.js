/* === CONFIG.JS: DOM References, Asset Arrays, Preloader, Zoom & Level Configs === */
"use strict";

/* ============================================================
   ALL-IN-ONE REBUILD
   - Fixes initialization-order crash.
   - Graceful fallback when WebGL is unavailable.
   - Correct DPR/canvas clearing.
   - Responsive camera/aspect after resize.
   - Pointer/touch joystick and mouse ripple support.
============================================================ */

const cv = document.getElementById("c");
const gcv = document.getElementById("g");
const ctx = gcv.getContext("2d", { alpha:true, desynchronized:true });
const statusEl = document.getElementById("glStatus");

let gl = null;
try {
  gl = cv.getContext("webgl", {
    alpha:false,
    antialias:false,
    depth:false,
    stencil:false,
    premultipliedAlpha:false,
    preserveDrawingBuffer:false,
    powerPreference:"high-performance"
  });
} catch (e) {
  gl = null;
}

const elHearts = document.getElementById("hearts");
const elScore  = document.getElementById("score");
const elDepth  = document.getElementById("depth");
const elFill   = document.getElementById("progFill");
const elBoat   = document.getElementById("progBoat");
const elToast  = document.getElementById("toast");

const joyBase = document.getElementById("joyBase");
const joyKnob = document.getElementById("joyKnob");


/* ---------- BOAT MOVE ANIMATION FRAMES ---------- */
const BOAT_FRAME_FILES = [
  "0001.webp","0003.webp","0005.webp","0007.webp","0009.webp",
  "0011.webp","0013.webp","0015.webp","0017.webp","0019.webp",
  "0021.webp","0024.webp","0026.webp","0028.webp","0030.webp",
  "0032.webp","0034.webp","0036.webp","0038.webp","0040.webp",
  "0042.webp","0044.webp","0046.webp","0048.webp"
];
const boatFrames = [];
let boatFramesLoaded = 0;

/* ---------- BOAT KICK ANIMATION FRAMES ---------- */
const BOAT_KICK_FILES = [
  "0001.webp","0003.webp","0005.webp","0007.webp","0009.webp",
  "0011.webp","0013.webp","0015.webp","0017.webp","0019.webp",
  "0021.webp","0023.webp","0025.webp","0027.webp","0028.webp",
  "0030.webp","0032.webp","0034.webp","0036.webp","0038.webp",
  "0040.webp","0042.webp","0044.webp","0046.webp","0048.webp","0050.webp"
];
const boatKickFrames = [];
let boatKickFramesLoaded = 0;

/* ---------- SHARK ANIMATION FRAMES (MOVE, ATTACK, TAKE DAWN) ---------- */
const SHARK_MOVE_FILES = Array.from({length: 24}, (_, i) => "MOVE" + String(370 + i).padStart(4, "0") + ".webp");
const SHARK_ATTACK_FILES = Array.from({length: 25}, (_, i) => "ATTACK" + String(558 + i).padStart(4, "0") + ".webp");
const SHARK_TAKEDOWN_FILES = Array.from({length: 44}, (_, i) => "ATTACK" + String(213 + i).padStart(4, "0") + ".webp");

/* ---------- DOLPHIN ASSET FRAMES (MOVE, JUMP, MOVE + KID, JUMP + KID) ---------- */
const DOLPHIN_MOVE_FILES = Array.from({length: 27}, (_, i) => String(i + 1).padStart(4, "0") + ".webp");
const DOLPHIN_JUMP_FILES = Array.from({length: 62}, (_, i) => String(i + 1).padStart(4, "0") + ".webp");
const DOLPHIN_MOVE_KID_FILES = Array.from({length: 50}, (_, i) => String(i + 1).padStart(4, "0") + ".webp");
const DOLPHIN_JUMP_KID_FILES = Array.from({length: 113}, (_, i) => String(i + 1).padStart(4, "0") + ".webp");
const DOLPHIN_SAVING_FILES = Array.from({length: 30}, (_, i) => String(i + 1).padStart(4, "0") + ".webp");
const KID_WALK_FILES = Array.from({length: 22}, (_, i) => String(i).padStart(4, "0") + ".webp");

const dolphinMoveFrames = [];
const dolphinJumpFrames = [];
const dolphinMoveKidFrames = [];
const dolphinJumpKidFrames = [];
const dolphinSavingFrames = [];
const kidWalkFrames = [];
const lootIslandImg = new Image();
let lootIslandLoaded = false;
let dolphinFramesLoaded = 0;

const emptyBoatImg = new Image();
let emptyBoatLoaded = false;

const sharkMoveFrames = [];
const sharkAttackFrames = [];
const sharkTakedownFrames = [];
let sharkFramesLoaded = 0;

/* ---------- 2D CUT ISLAND ASSETS ---------- */
const ISLAND_TOPDOWN_FILES = [
  "island_topdown_1.webp",
  "island_topdown_2.webp",
  "island_topdown_3.webp"
];
const islandImgs = [];
let islandImgsLoaded = 0;

/* ---------- ASSET PRELOADER TRACKER ---------- */
const totalAssetsToLoad = BOAT_FRAME_FILES.length + BOAT_KICK_FILES.length + SHARK_MOVE_FILES.length + SHARK_ATTACK_FILES.length + SHARK_TAKEDOWN_FILES.length + ISLAND_TOPDOWN_FILES.length + 1 + DOLPHIN_MOVE_FILES.length + DOLPHIN_JUMP_FILES.length + DOLPHIN_MOVE_KID_FILES.length + DOLPHIN_JUMP_KID_FILES.length + DOLPHIN_SAVING_FILES.length + KID_WALK_FILES.length + 1 + 1 + 1;
let loadedAssetsCount = 0;

function onAssetLoaded() {
  loadedAssetsCount++;
  const pct = Math.min(100, Math.floor((loadedAssetsCount / totalAssetsToLoad) * 100));
  const fill = document.getElementById("loadFill");
  const txt = document.getElementById("loadTxt");
  const btn = document.getElementById("btnStart");
  if (fill) fill.style.width = pct + "%";
  if (txt) txt.textContent = pct + "%";
  if (loadedAssetsCount >= totalAssetsToLoad && btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
    const box = document.getElementById("loadBox");
    if (box) box.style.display = "none";
  }
}


for (const fn of BOAT_FRAME_FILES) {
  const img = new Image();
  img.onload = () => { boatFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../MOVE/" + fn;
  boatFrames.push(img);
}

for (const fn of BOAT_KICK_FILES) {
  const img = new Image();
  img.onload = () => { boatKickFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../KICK/" + fn + "?v=6";
  boatKickFrames.push(img);
}

for (const fn of SHARK_MOVE_FILES) {
  const img = new Image();
  img.onload = () => { sharkFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../SHARK/MOVE/" + fn;
  sharkMoveFrames.push(img);
}
for (const fn of SHARK_ATTACK_FILES) {
  const img = new Image();
  img.onload = () => { sharkFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../SHARK/ATTACK/" + fn;
  sharkAttackFrames.push(img);
}
for (const fn of SHARK_TAKEDOWN_FILES) {
  const img = new Image();
  img.onload = () => { sharkFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../SHARK/TAKE DAWN/" + fn;
  sharkTakedownFrames.push(img);
}

for (const fn of DOLPHIN_MOVE_FILES) {
  const img = new Image();
  img.onload = () => { dolphinFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../DOLPHIN/MOVE/" + fn;
  dolphinMoveFrames.push(img);
}
for (const fn of DOLPHIN_JUMP_FILES) {
  const img = new Image();
  img.onload = () => { dolphinFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../DOLPHIN/JUMP/" + fn;
  dolphinJumpFrames.push(img);
}
for (const fn of DOLPHIN_MOVE_KID_FILES) {
  const img = new Image();
  img.onload = () => { dolphinFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../DOLPHIN/MOVE_KID/" + fn;
  dolphinMoveKidFrames.push(img);
}
for (const fn of DOLPHIN_JUMP_KID_FILES) {
  const img = new Image();
  img.onload = () => { dolphinFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../DOLPHIN/JUMP_KID/" + fn;
  dolphinJumpKidFrames.push(img);
}

for (const fn of DOLPHIN_SAVING_FILES) {
  const img = new Image();
  img.onload = () => { dolphinFramesLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../DOLPHIN/SAVING/" + fn;
  dolphinSavingFrames.push(img);
}

for (const fn of KID_WALK_FILES) {
  const img = new Image();
  img.onload = () => { onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../KID_WALK/" + fn;
  kidWalkFrames.push(img);
}

lootIslandImg.onload = () => { lootIslandLoaded = true; onAssetLoaded(); };
lootIslandImg.onerror = () => { onAssetLoaded(); };
lootIslandImg.src = "../ISLAND/loot_island.webp";

for (const ifn of ISLAND_TOPDOWN_FILES) {
  const img = new Image();
  img.onload = () => { islandImgsLoaded++; onAssetLoaded(); };
  img.onerror = () => { onAssetLoaded(); };
  img.src = "../ISLAND/" + ifn;
  islandImgs.push(img);
}

const islandWinImg = new Image();
islandWinImg.onload = onAssetLoaded;
islandWinImg.onerror = onAssetLoaded;
islandWinImg.src = "../ISLAND/island_topdown_large.webp";

emptyBoatImg.onload = () => { emptyBoatLoaded = true; onAssetLoaded(); };
emptyBoatImg.onerror = () => { onAssetLoaded(); };
emptyBoatImg.src = "Weathered Blue Rowboat with Oars.png";

const bottleImg = new Image();
let bottleLoaded = false;
bottleImg.onload = () => { bottleLoaded = true; onAssetLoaded(); };
bottleImg.onerror = () => { onAssetLoaded(); };
bottleImg.src = "Glossy Blue-Collar Baby Bottle.png";


/* ---------- CAMERA ZOOM STATE ---------- */
let zoom = 1.0;
let targetZoom = 1.0;


/* ---------- utilities ---------- */
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const fmt = n=>Math.round(n).toLocaleString("ar-EG");

function aspect(){
  return Math.max(0.55, innerWidth / Math.max(1,innerHeight));
}

function shoreAt(y){
  const a = aspect();
  return a*.33 + .07*Math.sin(y*4+.5) + .03*Math.sin(y*10+2) + .015*Math.sin(y*27);
}

function pxStart(){
  return shoreAt(.5)+.055;
}


let currentLevel = 1;
const TOTAL_LEVELS = 3;

const LEVEL_CONFIGS = [
  {
    level: 1,
    title: "الفصل ١: الشاطئ والمطاردة 🍼",
    subTitle: "سقوط القارورة وبداية الرحلة في مياه البحر الهادئة",
    winDist: 18,
    maxEnemies: 2,
    sharkSpeedMin: 0.12,
    sharkSpeedMax: 0.16,
    seaTheme: {
      waterDeep: [0.02, 0.22, 0.36],
      waterShallow: [0.06, 0.68, 0.60],
      skyReflection: [0.72, 0.92, 1.0]
    },
    miles: [
      {p: .05, msg: "الفصل ١: انطلقت وراء القارورة! 🍼"},
      {p: .40, msg: "أرى بريق القارورة بين الأمواج... أسرع! ✨"},
      {p: .80, msg: "حركة مريبة في الأعماق... احذر القروش! 🦈"}
    ],
    nextPreview: "الفصل القادم: الصداقة والصناعة — حين تفقد القارب وتكسب رفيقاً! 🐬"
  },
  {
    level: 2,
    title: "الفصل ٢: الصداقة والصناعة 🐬",
    subTitle: "ظهور الدلفين المنقذ وبناء قارب النجاة على الجزيرة",
    winDist: 25,
    maxEnemies: 3,
    sharkSpeedMin: 0.16,
    sharkSpeedMax: 0.22,
    seaTheme: {
      waterDeep: [0.01, 0.08, 0.22],
      waterShallow: [0.03, 0.36, 0.62],
      skyReflection: [0.45, 0.75, 0.98]
    },
    miles: [
      {p: .05, msg: "الفصل ٢: رفقة الدلفين نحو الجزيرة! 🐬"},
      {p: .40, msg: "اجمع الأخشاب على الجزيرة لإعادة بناء القارب 🪵"},
      {p: .80, msg: "قارب جديد وصداقة لا تنكسر... عودة إلى البحر! ⛵"}
    ],
    nextPreview: "الفصل القادم: المطاردة الأخيرة ونور الشاطئ — استعادة القارورة والعودة إلى الأب! 🌅"
  },
  {
    level: 3,
    title: "الفصل ٣: المطاردة الأخيرة ونور الشاطئ 🌅",
    subTitle: "المواجهة الكبرى، استعادة القارورة، ونور الأب في الأفق",
    winDist: 32,
    maxEnemies: 4,
    sharkSpeedMin: 0.22,
    sharkSpeedMax: 0.28,
    seaTheme: {
      waterDeep: [0.09, 0.04, 0.18],
      waterShallow: [0.38, 0.20, 0.42],
      skyReflection: [1.0, 0.68, 0.42]
    },
    miles: [
      {p: .05, msg: "الفصل ٣: المطاردة الأخيرة في عرض المحيط! 🌊"},
      {p: .45, msg: "القروش تحيط بالمسار... اضرب بالركل واطلب عون الدلفين! 🥊🐬"},
      {p: .85, msg: "القارورة الحقيقية هناك! ونور الأب يناديك من الشاطئ البعيد! 🏮✨"}
    ],
    nextPreview: ""
  }
];

let PX0 = pxStart();
let WIN = {x: PX0 + LEVEL_CONFIGS[0].winDist, y: .5, r: .22};


let dpr = 1;
