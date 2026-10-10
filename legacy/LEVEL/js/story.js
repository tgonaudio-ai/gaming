/* === STORY.JS: Cinematic Manga Cutscene Engine ("Manga Prologue") === */
"use strict";

const MANGA_PANELS = [
  
  {
    id: 2,
    img: "story images/02_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "ابتسامة والدي 👨‍👦",
    textAr: "كنت جالساً بجوار والدي الحبيب... كان يوماً رائعاً، وما زلت أذكر ابتسامته وفرحته بي وأنا أشرب حليبي المفضل.",
    textEn: "I was with my father. It was a good day... I remember his smile.",
    fx: null,
    sound: "chuckle",
    motion: "kb-pan-right"
  },
  {
    id: 3,
    img: "story images/04_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "لحظة عابرة 🍼",
    textAr: "وضعت زجاجة الحليب الخاصة بي قرب حافة الماء... للحظة واحدة فقط دون أن أنتبه لغدر الأمواج.",
    textEn: "I put my bottle near the water... just for a moment.",
    fx: null,
    sound: "water",
    motion: "kb-zoom-in"
  },
  {
    id: 4,
    img: "story images/05_Kid_of_the_Sea.png",
    speaker: "🌊 البحر الغادر",
    title: "الموجة الغادرة! 🌊💥",
    textAr: "...وفجأة، سحبتها موجة عاتية نحو الأعماق! طششش!",
    textEn: "...And then the sea took it away. SPLASH!",
    fx: "SPLASH!",
    shake: true,
    sound: "splash",
    motion: "kb-dramatic"
  },
  {
    id: 5,
    img: "story images/06_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "زجاجتي الثمينة! 🏃‍♂️",
    textAr: "صرختُ بلهفة: «زجاجتي! مهلاً! عودي إليّ!»... وانطلقتُ أزحف نحو الأمواج بينما والدي يحاول اللحاق بي في ذعر!",
    textEn: "MY BOTTLE! HEY! COME BACK!",
    fx: "WAIT!",
    speedlines: true,
    sound: "panic",
    motion: "kb-pan-left"
  },
  {
    id: 6,
    img: "story images/07_Kid_of_the_Sea.png",
    speaker: "📖 الراوي",
    title: "تائهة بين الأمواج 🌊🍼",
    textAr: "أخذت الزجاجة تبتعد مع تيار المحيط... أبعد فأبعد، حتى كادت تختفي تماماً خلف الأفق المائي.",
    textEn: "It drifted away... farther and farther...",
    fx: null,
    sound: "wind",
    motion: "kb-zoom-out"
  },
  {
    id: 7,
    img: "story images/08_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "نداء الشجاعة في الأعماق ✨",
    textAr: "لم أستطع تركها تضيع في ظلمات البحر... شيء ما ناداني في أعماقي وهمس لي: لن أستسلم، سأتبعها مهما كلف الأمر!",
    textEn: "I couldn't let it go. Something inside me... told me to follow.",
    fx: null,
    noir: true,
    sound: "heartbeat",
    motion: "kb-zoom-in"
  },
  {
    id: 8,
    img: "story images/09_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "قارب الأمل 🛶",
    textAr: "وعلى رمال الشاطئ القريبة... وجدت قارباً خشبياً صغيراً قديماً... لكنه كان ما زال يطفو ويصلح للإبحار!",
    textEn: "On the shore... I found a small boat. Old... but still floating.",
    fx: null,
    sound: "footsteps",
    motion: "kb-pan-right"
  },
  {
    id: 9,
    img: "story images/10_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "الصعود دون تردد ⚓",
    textAr: "تسلقتُ إلى داخل القارب دون أي تردد أو خوف... ممسكاً بالمجاديف بعزم وإصرار لا يتزعزع.",
    textEn: "I climbed in... without thinking.",
    fx: null,
    sound: "creak",
    motion: "kb-zoom-in"
  },
  {
    id: 10,
    img: "story images/11_Kid_of_the_Sea.png",
    speaker: "👦 فتى البحر",
    title: "انطلاق المغامرة الكبرى 🚣‍♂️",
    textAr: "كانت الزجاجة ما زالت هناك تلوح أمامي بين الأمواج تحت أشعة الشمس... وهكذا بدأت رحلتي الكبرى في قلب المحيط!",
    textEn: "The bottle was still there... ahead of me. And so... my journey began.",
    fx: null,
    sound: "rowing",
    motion: "kb-pan-left"
  },
  {
    id: 11,
    img: "story images/12_Kid_of_the_Sea.png",
    speaker: "👦 أسطورة فتى البحر",
    title: "إلى ما وراء الأفق! 🌅🐬",
    textAr: "لم أكن أعلم حينها... أن هذه الزجاجة ستقودني إلى ما وراء الشواطئ... لمواجهة القروش ومصادقة الدلافين واكتشاف جزر لم أتخيلها أبداً!",
    textEn: "I didn't know then... that this bottle would take me far beyond the shore... to places I never imagined. TO BE CONTINUED...",
    fx: "GO!",
    sound: "victory",
    motion: "kb-zoom-out"
  }
];

let mangaCurrentIdx = 0;
let mangaTypingTimer = null;
let mangaIsTyping = false;
let mangaCurrentFullText = "";
let mangaAutoAdvanceTimer = null;
let mangaAutoPlay = false;

/* ---------- CINEMATIC PROCEDURAL BGM ENGINE (Web Audio API) ---------- */
let mangaBgmGain = null;
let mangaBgmInterval = null;

function startMangaCinematicBGM() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._mangaACtx) window._mangaACtx = new AudioCtx();
    const ctx = window._mangaACtx;
    if (ctx.state === "suspended") ctx.resume();

    if (mangaBgmGain) return; // Already active

    mangaBgmGain = ctx.createGain();
    mangaBgmGain.gain.setValueAtTime(0.001, ctx.currentTime);
    mangaBgmGain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 2.0);
    mangaBgmGain.connect(ctx.destination);

    // Warm atmospheric lowpass filter
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 680;
    padFilter.connect(mangaBgmGain);

    // Emotional cinematic chord progression: Fmaj7 -> Csus2 -> Dm7 -> Bbadd9
    const chords = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [130.81, 196.00, 261.63, 293.66], // Csus2
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [116.54, 174.61, 233.08, 293.66]  // Bbadd9
    ];

    let chordIdx = 0;
    function playChord() {
      if (!mangaBgmGain) return;
      const t = ctx.currentTime;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.065, t + 0.9);
        g.gain.exponentialRampToValueAtTime(0.001, t + 4.9);
        osc.connect(g);
        g.connect(padFilter);
        osc.start(t);
        osc.stop(t + 5.0);
      });

      // Shimmering harp / music box acoustic arpeggios
      const arpHarmonies = [349.23, 440.00, 523.25, 587.33, 659.25, 698.46, 880.00];
      for (let k = 0; k < 3; k++) {
        const hTime = t + 0.35 + k * 0.42;
        const hFreq = arpHarmonies[Math.floor(Math.random() * arpHarmonies.length)];
        const hOsc = ctx.createOscillator();
        const hGain = ctx.createGain();
        hOsc.type = "sine";
        hOsc.frequency.setValueAtTime(hFreq, hTime);
        hGain.gain.setValueAtTime(0.001, hTime);
        hGain.gain.linearRampToValueAtTime(0.045, hTime + 0.04);
        hGain.gain.exponentialRampToValueAtTime(0.0001, hTime + 1.2);
        hOsc.connect(hGain);
        hGain.connect(mangaBgmGain);
        hOsc.start(hTime);
        hOsc.stop(hTime + 1.25);
      }
    }

    playChord();
    mangaBgmInterval = setInterval(playChord, 3800);
  } catch (e) {}
}

function stopMangaCinematicBGM() {
  try {
    if (mangaBgmInterval) {
      clearInterval(mangaBgmInterval);
      mangaBgmInterval = null;
    }
    if (mangaBgmGain && window._mangaACtx) {
      const ctx = window._mangaACtx;
      mangaBgmGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      setTimeout(() => {
        if (mangaBgmGain) {
          mangaBgmGain.disconnect();
          mangaBgmGain = null;
        }
      }, 750);
    }
  } catch (e) {}
}

/* ---------- AUDIO SYNTHESIZER (Web Audio API) ---------- */
function playMangaSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._mangaACtx) window._mangaACtx = new AudioCtx();
    const ctx = window._mangaACtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;

    if (type === "splash") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.38);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.39);
    } else if (type === "heartbeat") {
      [80, 72].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.16);
        gain.gain.setValueAtTime(0.35, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.16 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.15);
      });
    } else if (type === "victory") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.52);
      });
    } else {
      // Soft page turn / gentle whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }
  } catch (e) {}
}

/* Subtle typewriter tick */
function playMangaTick() {
  try {
    if (!window._mangaACtx) return;
    const ctx = window._mangaACtx;
    if (ctx.state !== "running") return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {}
}

/* ---------- DISPLAY & TYPEWRITER TEXT ENGINE ---------- */
function renderMangaPanel(idx, animate = true) {
  if (idx < 0) idx = 0;
  if (idx >= MANGA_PANELS.length) idx = MANGA_PANELS.length - 1;
  mangaCurrentIdx = idx;

  const panel = MANGA_PANELS[idx];
  const elImg = document.getElementById("storyPanelImg");
  const elPanelWrap = document.getElementById("mangaPanelWrap");
  const elSpeaker = document.getElementById("mangaSpeakerTag");
  const elTextAr = document.getElementById("storyCaptionTextAr");
  const elTextEn = document.getElementById("storyCaptionTextEn");
  const elStepTxt = document.getElementById("mangaStepTxt");
  const elProgressFill = document.getElementById("mangaProgressFill");
  const elSpeedlines = document.getElementById("mangaSpeedlines");
  const elFxBadge = document.getElementById("mangaFxBadge");
  const elNarrativeBox = document.getElementById("mangaNarrativeBox");
  const elPrompt = document.getElementById("mangaPrompt");

  if (!elImg) return;

  // Clear timers
  if (mangaTypingTimer) {
    clearInterval(mangaTypingTimer);
    mangaTypingTimer = null;
  }
  if (mangaAutoAdvanceTimer) {
    clearTimeout(mangaAutoAdvanceTimer);
    mangaAutoAdvanceTimer = null;
  }
  mangaIsTyping = false;

  // Visual effects
  if (elSpeedlines) {
    if (panel.speedlines) elSpeedlines.classList.add("active");
    else elSpeedlines.classList.remove("active");
  }

  if (elFxBadge) {
    if (panel.fx) {
      elFxBadge.textContent = panel.fx;
      elFxBadge.classList.add("show");
    } else {
      elFxBadge.classList.remove("show");
    }
  }

  if (elPanelWrap) {
    elPanelWrap.classList.remove("shake");
    if (panel.shake) {
      setTimeout(() => elPanelWrap.classList.add("shake"), 80);
    }
  }

  // Slide & Fade Image with Motion Comic Camera
  if (animate) {
    elImg.classList.add("fade-out");
    setTimeout(() => {
      elImg.src = panel.img;
      elImg.alt = panel.title;
      elImg.classList.remove("fade-out");
      // Reset Ken Burns motion classes to re-trigger smooth camera movement
      elImg.classList.remove("kb-zoom-in", "kb-zoom-out", "kb-pan-right", "kb-pan-left", "kb-dramatic");
      void elImg.offsetWidth; // Trigger DOM reflow
      if (panel.motion) elImg.classList.add(panel.motion);
      elImg.classList.add("fade-in");
      setTimeout(() => elImg.classList.remove("fade-in"), 350);
    }, 120);
  } else {
    elImg.src = panel.img;
    elImg.alt = panel.title;
    elImg.classList.remove("kb-zoom-in", "kb-zoom-out", "kb-pan-right", "kb-pan-left", "kb-dramatic");
    void elImg.offsetWidth;
    if (panel.motion) elImg.classList.add(panel.motion);
  }

  // Update HUD
  if (elSpeaker) elSpeaker.innerHTML = `${panel.speaker} &nbsp;•&nbsp; <span class="story-highlight">${panel.title}</span>`;
  if (elStepTxt) elStepTxt.textContent = `${idx + 1} / ${MANGA_PANELS.length}`;
  if (elProgressFill) {
    const pct = ((idx + 1) / MANGA_PANELS.length) * 100;
    elProgressFill.style.width = pct + "%";
  }

  // Narrative box slide animation
  if (elNarrativeBox) {
    elNarrativeBox.classList.remove("slide-in");
    void elNarrativeBox.offsetWidth; // trigger reflow
    elNarrativeBox.classList.add("slide-in");
  }

  // Final panel prompt change
  if (elPrompt) {
    if (idx === MANGA_PANELS.length - 1) {
      elPrompt.innerHTML = `<span>⛵ انقر لبدء الإبحار في المغامرة!</span> <span style="font-size:16px">▶</span>`;
      elPrompt.classList.add("finish");
    } else {
      elPrompt.innerHTML = `<span class="story-prompt-text">انقر في أي مكان للمتابعة</span> <span class="story-prompt-icon">▼</span>`;
      elPrompt.classList.remove("finish");
    }
  }

  // Start animated kinetic typewriter text
  mangaCurrentFullText = panel.textAr;
  if (elTextAr) elTextAr.innerHTML = `<span class="typing-cursor"></span>`;
  if (elTextEn) elTextEn.textContent = panel.textEn;

  let charIdx = 0;
  mangaIsTyping = true;
  mangaTypingTimer = setInterval(() => {
    charIdx++;
    if (charIdx <= mangaCurrentFullText.length) {
      if (elTextAr) {
        elTextAr.innerHTML = mangaCurrentFullText.substring(0, charIdx) + `<span class="typing-cursor"></span>`;
      }
      if (charIdx % 3 === 0) playMangaTick();
    } else {
      finishMangaTyping();
    }
  }, 26);

  playMangaSound(panel.sound);
}

function finishMangaTyping() {
  if (mangaTypingTimer) {
    clearInterval(mangaTypingTimer);
    mangaTypingTimer = null;
  }
  mangaIsTyping = false;
  const elTextAr = document.getElementById("storyCaptionTextAr");
  if (elTextAr) {
    elTextAr.innerHTML = mangaCurrentFullText;
  }

  // AAA Auto-Play Countdown
  if (mangaAutoPlay) {
    if (mangaAutoAdvanceTimer) clearTimeout(mangaAutoAdvanceTimer);
    const delay = Math.max(2400, mangaCurrentFullText.length * 60);
    mangaAutoAdvanceTimer = setTimeout(() => {
      if (mangaCurrentIdx < MANGA_PANELS.length - 1) {
        renderMangaPanel(mangaCurrentIdx + 1, true);
      } else {
        startFromManga();
      }
    }, delay);
  }
}

function onMangaScreenClick(e) {
  // If clicked on controls (auto or skip), let their listeners handle it
  if (e && e.target && e.target.closest && (
    e.target.closest(".manga-skip-btn") || e.target.closest(".manga-auto-btn") ||
    e.target.closest(".story-skip-btn") || e.target.closest(".story-auto-btn") ||
    e.target.closest("#btnStorySkip") || e.target.closest("#btnStoryAuto") ||
    e.target.closest("#btnStorySpeaker") || e.target.closest("#btnStoryNext")
  )) {
    return;
  }

  if (mangaIsTyping) {
    // 1st click while typing -> immediately reveals full text
    finishMangaTyping();
  } else {
    // 2nd click -> moves to next manga panel
    if (mangaCurrentIdx < MANGA_PANELS.length - 1) {
      renderMangaPanel(mangaCurrentIdx + 1, true);
    } else {
      // Final panel clicked -> launch game directly!
      startFromManga();
    }
  }
}

function prevMangaPanel() {
  if (mangaCurrentIdx > 0) {
    renderMangaPanel(mangaCurrentIdx - 1, true);
  }
}

/* ---------- AAA STAGE INTRO BANNER ---------- */
function showStageTitleBanner(lvl = 1) {
  const elBanner = document.getElementById("stageBanner");
  if (!elBanner) return;
  const cfg = (typeof LEVEL_CONFIGS !== "undefined" && LEVEL_CONFIGS[lvl - 1]) || null;
  const elTag = document.getElementById("stageBannerTag");
  const elTitle = document.getElementById("stageBannerTitle");
  const elSub = document.getElementById("stageBannerSub");

  if (elTag) elTag.textContent = lvl === 1 ? "المرحلة الأولى" : (lvl === 2 ? "المرحلة الثانية" : "المرحلة الثالثة");
  if (elTitle && cfg) elTitle.textContent = cfg.title;
  if (elSub && cfg) elSub.textContent = cfg.subTitle || "ابحث عن بريق القارورة التائهة في عرض البحر";

  elBanner.style.display = "flex";
  elBanner.classList.remove("stage-banner");
  void elBanner.offsetWidth; // re-trigger animation
  elBanner.classList.add("stage-banner");

  if (typeof sStageStartFanfare === "function") sStageStartFanfare();

  setTimeout(() => {
    elBanner.style.display = "none";
  }, 4200);
}

/* ---------- LAUNCH GAME FROM MANGA CUTSCENE (AAA Transition) ---------- */
function startFromManga() {
  const ovStory = document.getElementById("ovStory");
  if (!ovStory || ovStory.classList.contains("hide")) return;

  // Prevent double-trigger
  if (ovStory.dataset.closing === "1") return;
  ovStory.dataset.closing = "1";

  // Stop Manga BGM
  stopMangaCinematicBGM();

  // Trigger White Flash / Iris Bloom Transition
  const elFlash = document.getElementById("cinematicFlash");
  if (elFlash) {
    elFlash.classList.add("active");
  }

  // Cinematic fade-out of Manga overlay
  ovStory.style.transition = "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
  ovStory.style.opacity = "0";

  setTimeout(() => {
    ovStory.classList.add("hide");
    ovStory.style.opacity = "";
    ovStory.style.transition = "";
    ovStory.dataset.closing = "";

    const ovStart = document.getElementById("ovStart");
    if (ovStart) ovStart.classList.add("hide");

    // Fade out screen flash
    if (elFlash) {
      elFlash.classList.remove("active");
    }

    // Initialize audio if not yet done
    if (typeof initAudio === "function") initAudio();

    // Launch actual gameplay
    if (typeof startLevel === "function") {
      currentLevel = 1;
      hearts = 5;
      score = 0;
      startLevel(1);

      // Camera starts zoomed into the beach then smoothly eases out to wide view
      targetZoom = 1.35;
      setTimeout(() => { targetZoom = 1.0; }, 1400);

      // Display AAA Stage Title Card Banner
      showStageTitleBanner(1);
    }
  }, 480);
}

/* ---------- OPEN / CLOSE ENGINE ---------- */
function openMangaIntro(startIdx = 0) {
  const ovStory = document.getElementById("ovStory");
  if (!ovStory) return;

  ovStory.classList.remove("hide");
  renderMangaPanel(startIdx, false);
  startMangaCinematicBGM();

  if (typeof S !== "undefined" && S.mode === "play") {
    S.mode = "pause";
  }
}

/* ---------- INIT SYSTEM ---------- */
function initMangaIntroUI() {
  // Preload images
  MANGA_PANELS.forEach(p => {
    const im = new Image();
    im.src = p.img;
  });
  const sf = new Image();
  sf.src = "story_frame.png";

  const ovStory = document.getElementById("ovStory");
  if (ovStory) {
    ovStory.addEventListener("click", onMangaScreenClick);
  }

  // Auto-play button toggle
  const btnAuto = document.getElementById("btnStoryAuto");
  if (btnAuto) {
    btnAuto.addEventListener("click", (e) => {
      e.stopPropagation();
      mangaAutoPlay = !mangaAutoPlay;
      if (mangaAutoPlay) {
        btnAuto.classList.add("active");
        btnAuto.textContent = "⏸️ إيقاف التلقائي";
        if (!mangaIsTyping) {
          finishMangaTyping();
        }
      } else {
        btnAuto.classList.remove("active");
        btnAuto.textContent = "▶ تشغيل تلقائي";
        if (mangaAutoAdvanceTimer) {
          clearTimeout(mangaAutoAdvanceTimer);
          mangaAutoAdvanceTimer = null;
        }
      }
    });
  }

  const btnSkip = document.getElementById("btnStorySkip");
  if (btnSkip) {
    btnSkip.addEventListener("click", (e) => {
      e.stopPropagation();
      startFromManga();
    });
  }

  const btnNext = document.getElementById("btnStoryNext");
  if (btnNext) {
    btnNext.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mangaIsTyping) {
        finishMangaTyping();
      } else {
        if (mangaCurrentIdx < MANGA_PANELS.length - 1) {
          renderMangaPanel(mangaCurrentIdx + 1, true);
        } else {
          startFromManga();
        }
      }
    });
  }

  const btnSpeaker = document.getElementById("btnStorySpeaker");
  if (btnSpeaker) {
    btnSpeaker.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = MANGA_PANELS[mangaCurrentIdx];
      if (panel && panel.sound) {
        playMangaSound(panel.sound);
      }
    });
  }

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    const ovStory = document.getElementById("ovStory");
    if (!ovStory || ovStory.classList.contains("hide")) return;

    if (e.key === "ArrowLeft" || e.key === "Space" || e.key === "Enter") {
      e.preventDefault();
      onMangaScreenClick(e);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      prevMangaPanel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      startFromManga();
    }
  });

  // Skip-to-game button (bypass cutscene)
  const btnSkipToGame = document.getElementById("btnSkipToGame");
  if (btnSkipToGame) {
    btnSkipToGame.addEventListener("click", () => {
      window._mangaSeenThisSession = true;
      hide("ovStart");
      if (typeof initAudio === "function") initAudio();
      currentLevel = 1;
      hearts = 5;
      score = 0;
      startLevel(1);
      showStageTitleBanner(1);
    });
  }
}

// Global aliases for backwards compatibility
window.openStoryIntro = openMangaIntro;
window.startFromStory = startFromManga;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMangaIntroUI);
} else {
  initMangaIntroUI();
}
