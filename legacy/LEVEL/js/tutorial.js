/* === TUTORIAL.JS: Extensible AAA Action-Freeze & Contextual FTUE Director === */
"use strict";

(() => {
  // Global bullet-time timescale (1.0 = normal, 0.0 = complete freeze, 0.05 = slow-mo)
  window.timeScale = 1.0;

  // Persisted seen steps in localStorage
  const STORAGE_KEY = "boat_kid_tutorial_progress";
  let seenSteps = new Set();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) seenSteps = new Set(JSON.parse(saved));
  } catch (_) {}

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seenSteps]));
    } catch (_) {}
  }

  /* ==========================================================================
     Extensible Step Definitions (Easily scalable for future levels & mechanics)
     ========================================================================== */
  const TUTORIAL_STEPS = {
    move_boat: {
      id: "move_boat",
      badge: "التحكم الأساسي • MOVEMENT",
      title: "الإبحار وتوجيه القارب",
      desc: "حرّك عصا التحكم (Virtual Joystick) أو استخدم مفاتيح WASD / الأسهم لتوجيه القارب نحو مسار القارورة المضيء.",
      icon: "⛵",
      keyHint: "WASD / الأسهم / عصا التحكم",
      btnTarget: "joystick",
      actionType: "move"
    },
    shark_combat: {
      id: "shark_combat",
      badge: "نظام القتال والمواجهة • SHARK COMBAT",
      title: "صد هجوم القرش والضربة!",
      desc: "القرش يندفع نحوك ليهاجم القارب! اضغط مفتاح (F أو E أو زر 🥊) لركل القرش وإبعاده وحماية قاربك!",
      icon: "🥊",
      keyHint: "اضغط [F] أو [🥊] لضرب القرش",
      btnTarget: "btnKick",
      actionType: "kick"
    },
    dolphin_ride: {
      id: "dolphin_ride",
      badge: "رفيق الأعماق • DOLPHIN BOND",
      title: "صديق جديد",
      desc: "الدلفين أنقذك وحملك على ظهره. هو من سيقودك إلى الجزيرة.",
      icon: "🐬",
      keyHint: "الدلفين يحملك الآن • Space للقفز",
      btnTarget: "btnDolphin",
      actionType: "none"
    },
    dolphin_jump: {
      id: "dolphin_jump",
      badge: "المهارات البهلوانية • DOLPHIN LEAP",
      title: "القفز فوق العوائق والقروش",
      desc: "أثناء ركوب الدلفين، اضغط مفتاح المسافة (Space أو زر 🐬) للقفز فوق القروش والشعاب المرجانية!",
      icon: "🌊",
      keyHint: "اضغط [Space] أو [🐬] للقفز البهلواني",
      btnTarget: "btnDolphin",
      actionType: "jump"
    },
    gather_wood: {
      id: "gather_wood",
      badge: "استكشاف الجزيرة • HARVEST",
      title: "جمع أخشاب الجزيرة",
      desc: "وصلت إلى جزيرة الموارد! تجوّل على الشاطئ واقترب من جذوع النخيل والصناديق الخشبية لجمع 5 قطع خشب لإصلاح قاربك.",
      icon: "🪵",
      keyHint: "اقترب من الأخشاب 🌴",
      btnTarget: null,
      actionType: "wood"
    },
    craft_boat: {
      id: "craft_boat",
      badge: "الصناعة والبناء • CRAFTING",
      title: "إعادة بناء القارب على طاولة النجارة",
      desc: "أحسنت! جمعت كل الخشب المطلوب (5/5). اقترب الآن من طاولة النجارة الخشبية على الجزيرة لإعادة بناء القارب والإبحار نحو القارورة!",
      icon: "🔨",
      keyHint: "اقترب من طاولة النجارة 🔨",
      btnTarget: null,
      actionType: "craft"
    }
  };

  let activeStep = null;
  let activeHighlightedBtn = null;
  let overlayEl = null;

  function createOverlayDOM() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.id = "tutorialOverlay";
    overlayEl.className = "tutorial-overlay";
    overlayEl.innerHTML = `
      <div class="tutorial-card">
        <span class="tutorial-badge" id="tutBadge">نظام اللعب</span>
        <div class="tutorial-icon-wrap">
          <div class="tutorial-icon-bg"></div>
          <span class="tutorial-icon" id="tutIcon">✨</span>
        </div>
        <h2 class="tutorial-title" id="tutTitle">العنوان الإرشادي</h2>
        <p class="tutorial-desc" id="tutDesc">وصف الحركة وكيفية تنفيذها في اللعبة.</p>
        <div class="tutorial-input-row">
          <span class="tutorial-key-pill" id="tutKey">F / مسافة</span>
          <span class="tutorial-input-hint">لتنفيذ الحركة ومتابعة اللعب</span>
        </div>
        <button class="tutorial-confirm-btn" id="tutConfirmBtn">
          <span>مواصلة الرحلة ➔</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlayEl);

    // Confirm button click: dismiss without triggering duplicate dismounts
    const btn = document.getElementById("tutConfirmBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        TutorialEngine.dismiss(false);
      });
    }

    // Intercept keyboard when tutorial is active (Only Enter or Esc dismisses)
    window.addEventListener("keydown", (e) => {
      if (!activeStep) return;
      if (e.code === "Enter" || e.code === "Escape") {
        e.preventDefault();
        TutorialEngine.dismiss(false);
        return;
      }
      if (activeStep.actionType === "kick" && ["KeyF", "KeyE", "KeyJ", "KeyK"].includes(e.code)) {
        e.preventDefault();
        TutorialEngine.dismiss(true);
        return;
      }
      if (activeStep.actionType === "dolphin" && ["KeyR", "KeyC"].includes(e.code)) {
        e.preventDefault();
        TutorialEngine.dismiss(true);
        return;
      }
      if (activeStep.actionType === "jump" && e.code === "Space") {
        e.preventDefault();
        TutorialEngine.dismiss(true);
        return;
      }
      if (activeStep.actionType === "move" && ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        TutorialEngine.dismiss(false);
      }
    });
  }

  /* ==========================================================================
     Public TutorialEngine API
     ========================================================================== */
  window.TutorialEngine = {
    // Register custom steps dynamically (Full Extensibility)
    registerStep(stepDef) {
      if (stepDef && stepDef.id) {
        TUTORIAL_STEPS[stepDef.id] = stepDef;
      }
    },

    // Trigger tutorial: only dolphin_ride uses full-screen freeze modal!
    trigger(stepId) {
      if (!stepId || seenSteps.has(stepId)) return false;
      const step = TUTORIAL_STEPS[stepId];
      if (!step) return false;

      // Mark seen immediately so it doesn't repeat
      seenSteps.add(stepId);
      saveProgress();

      // ORGANIC TEACHING: For dolphin jump, the dolphin leaps first organically!
      if (stepId === "dolphin_jump") {
        if (typeof player !== "undefined" && player && player.onDolphin && typeof triggerDolphinJump === "function") {
          triggerDolphinJump();
        } else if (typeof soloDolphin !== "undefined" && soloDolphin) {
          soloDolphin.isJumping = true;
          soloDolphin.jumpFrame = 0;
          if (typeof sDolphinChirp === "function") sDolphinChirp();
        }
        if (typeof floatTxt === "function" && typeof player !== "undefined" && player) {
          floatTxt(player.x, player.y - 0.14, "🐬 راقب قفزة الدلفين! اقفز بـ [Space / 🐬]", "#00f2fe");
        }
        const btnDolphin = document.getElementById("btnDolphin");
        if (btnDolphin) {
          btnDolphin.classList.add("tutorial-hud-highlight");
          setTimeout(() => btnDolphin.classList.remove("tutorial-hud-highlight"), 3500);
        }
        return true;
      }

      // ONLY dolphin_ride gets the full-freeze cinematic modal window
      if (stepId === "dolphin_ride") {
        createOverlayDOM();
        activeStep = step;

        // Bullet-time freeze
        window.timeScale = 0.0;

        // Fill in modal details
        document.getElementById("tutBadge").textContent = step.badge;
        document.getElementById("tutIcon").textContent = step.icon;
        document.getElementById("tutTitle").textContent = step.title;
        document.getElementById("tutDesc").textContent = step.desc;
        document.getElementById("tutKey").textContent = step.keyHint;

        if (activeHighlightedBtn) {
          activeHighlightedBtn.classList.remove("tutorial-hud-highlight");
          activeHighlightedBtn = null;
        }
        const btnDolphin = document.getElementById("btnDolphin");
        if (btnDolphin) {
          activeHighlightedBtn = btnDolphin;
          btnDolphin.classList.add("tutorial-hud-highlight");
        }

        if (typeof sDolphinChirp === "function") {
          try { sDolphinChirp(); } catch (_) {}
        }

        overlayEl.classList.add("active");
        return true;
      }

      // For all other steps (move_boat, shark_combat, gather_wood, craft_boat):
      // Quick, non-blocking floating hints near action buttons without freezing gameplay!
      if (typeof toast === "function") {
        toast(`${step.icon} ${step.title}: ${step.keyHint}`);
      }
      if (typeof floatTxt === "function" && typeof player !== "undefined" && player) {
        floatTxt(player.x, player.y - 0.12, `${step.icon} ${step.keyHint}`, "#ffd166");
      }

      // Highlight target button if present
      let targetBtnId = step.btnTarget;
      if (stepId === "shark_combat") targetBtnId = "btnKick";
      if (stepId === "move_boat") targetBtnId = "joystick";

      if (targetBtnId) {
        const btn = document.getElementById(targetBtnId);
        if (btn) {
          btn.classList.add("tutorial-hud-highlight");
          setTimeout(() => btn.classList.remove("tutorial-hud-highlight"), 3200);
        }
      }
      return true;
    },

    // Dismiss tutorial and execute action
    dismiss(triggerAction = true) {
      if (!activeStep) return;
      const step = activeStep;
      activeStep = null;

      // Mark seen & save
      seenSteps.add(step.id);
      saveProgress();

      // Remove button highlight
      if (activeHighlightedBtn) {
        activeHighlightedBtn.classList.remove("tutorial-hud-highlight");
        activeHighlightedBtn = null;
      }

      // Hide overlay
      if (overlayEl) {
        overlayEl.classList.remove("active");
      }

      // Resume game physics
      window.timeScale = 1.0;

      // Automatically execute the action if requested!
      if (triggerAction) {
        if (step.actionType === "kick" && typeof triggerKick === "function") {
          triggerKick();
        } else if (step.actionType === "dolphin" && typeof toggleDolphinRide === "function") {
          toggleDolphinRide();
        } else if (step.actionType === "jump" && typeof triggerDolphinJump === "function") {
          triggerDolphinJump();
        }
      }
    },

    isCompleted(stepId) {
      return seenSteps.has(stepId);
    },

    resetAll() {
      seenSteps.clear();
      saveProgress();
    }
  };

  // Ensure DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createOverlayDOM);
  } else {
    createOverlayDOM();
  }
})();
