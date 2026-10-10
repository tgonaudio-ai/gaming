/* === PLAYER.JS: Boat Movement, Turbo Boost, Kick Attack Combat & Drawing === */
"use strict";

/* ---------- KICK ATTACK SYSTEM (LEFT / RIGHT MIRROR & RELIABLE COLLISION) ---------- */
function executeKickHit(e, dx, dy, dist){
  if(!player) return;
  if(!player.hitEnemies) player.hitEnemies = [];
  if(player.hitEnemies.includes(e)) return;
  player.hitEnemies.push(e);

  sKickHit();
  shake = Math.max(shake, 0.26);

  const nL = dist || 0.1;
  const normX = dx / nL;
  const normY = dy / nL;
  const hitX = player.x + normX * 0.18;
  const hitY = player.y + normY * 0.18;

  burst(hitX, hitY, "#ffea00", 18, 1.5);
  burst(hitX, hitY, "#ffffff", 12, 1.2);
  ring(hitX, hitY, "rgba(255, 234, 0, 0.95)");

  // Knock shark away from player
  const pushForce = 0.54;
  e.vx = normX * pushForce;
  e.vy = normY * pushForce;
  e.x += normX * 0.08;
  e.y += normY * 0.08;

  // Stun and damage
  e.hp = Math.max(0, e.hp - 1);
  e.hitTimer = 0.32;
  e.stunTimer = 0.75;

  floatTxt(e.x, e.y - 0.115, "💥 ضربة! -١", "#ffea00");

  if(e.hp <= 0){
    e.state = "takedown";
    e.anim = "takedown";
    e.animFrame = 0;
    e.ft = 0;
    e.say = 1.8;
    e.stunTimer = 0;
    e.fdx = normX;
    e.fdy = normY;

    score += 25;
    burst(e.x, e.y, "#ffd166", 24, 1.8);
    burst(e.x, e.y, "#7ae0ff", 16, 1.3);
    ring(e.x, e.y, "rgba(255, 209, 102, 0.95)");
    floatTxt(e.x, e.y - 0.12, "🦈 هُزم القرش! +٢٥ ⭐", "#2ecc71");
    updateHUD(true);
  }
}

function triggerKick(){
  if(S.mode !== "play" || !player) return;
  if(player.onDolphin){
    triggerDolphinJump();
    return;
  }
  if(player.onLand && player.parkedBoat){
    const distToBoat = Math.hypot(player.x - player.parkedBoat.x, player.y - player.parkedBoat.y);
    if(distToBoat < 0.35){
      player.onLand = false;
      player.onBeach = false;
      player.x = player.parkedBoat.x;
      player.y = player.parkedBoat.y;
      player.ang = 0;
      player.vx = 0.08;
      player.vy = 0;
      player.parkedBoat = null;
      toast("عدت إلى القارب! 🛶");
      floatTxt(player.x, player.y - 0.10, "عدت إلى القارب! 🛶", "#ffd166");
      sSplash();
      burst(player.x, player.y, "#ffffff", 14, 1.0);
      updateActionBtnUI();
      updateHUD(true);
      return;
    }
  }
  if(player.isKicking || player.kickCooldown > 0) return;

  // Determine attack direction (Left or Right) based on closest / attacking enemy
  let chosenSide = 1; // 1 = right (default), -1 = left (mirrored)
  let bestEnemy = null;
  let bestPriority = Infinity;

  if(enemies && enemies.length > 0){
    for(let i = 0; i < enemies.length; i++){
      const e = enemies[i];
      if(e.state === "takedown" || e.state === "flee") continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);

      let priority = dist;
      if(e.state === "attack") priority -= 0.35; // Strongly prioritize attacking sharks!

      if(priority < bestPriority && dist < 1.0){
        bestPriority = priority;
        bestEnemy = e;
      }
    }
  }

  if(bestEnemy){
    const dx = bestEnemy.x - player.x;
    const dy = bestEnemy.y - player.y;
    const targetAngle = Math.atan2(dy, dx);
    let da = targetAngle - player.ang;
    while(da > Math.PI) da -= 2 * Math.PI;
    while(da < -Math.PI) da += 2 * Math.PI;

    // In canvas (y down): da < 0 means to the LEFT, da >= 0 means to the RIGHT
    chosenSide = (da < 0) ? -1 : 1;
  }

  player.isKicking = true;
  player.kickFrame = 0;
  player.kickCooldown = 0.36;
  player.kickSide = chosenSide;
  player.hitEnemies = [];

  sKickSwing();

  // If an enemy is in point-blank range (< 0.22), trigger immediate counter hit!
  if(bestEnemy && Math.hypot(bestEnemy.x - player.x, bestEnemy.y - player.y) < 0.22){
    const dx = bestEnemy.x - player.x, dy = bestEnemy.y - player.y;
    executeKickHit(bestEnemy, dx, dy, Math.hypot(dx, dy));
  }

  const elBtnKick = document.getElementById("btnKick");
  if(elBtnKick){
    elBtnKick.classList.add("active");
    setTimeout(() => elBtnKick.classList.remove("active"), 200);
  }
}

window.addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","ShiftLeft","ShiftRight","KeyF","KeyE","KeyJ","KeyK","KeyX","KeyR","KeyC"].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if((e.code==="Space"||e.code==="Enter") && S.mode==="start"){
    if(loadedAssetsCount >= totalAssetsToLoad) startGame();
  }
  if(window.timeScale === 0) return;
  if(e.code==="Space" && S.mode==="play" && player && player.onDolphin){
    if(!e.repeat) triggerDolphinJump();
  }
  if(["KeyF","KeyE","KeyJ","KeyK","KeyX"].includes(e.code) && S.mode==="play"){
    if(!e.repeat) triggerKick();
  }
  if(["KeyR","KeyC"].includes(e.code) && S.mode==="play"){
    if(!e.repeat) toggleDolphinRide();
  }
});

// Unlock / resume Web Audio on any user gesture
window.addEventListener("pointerdown", () => {
  if(AC && AC.state === "suspended") AC.resume();
}, {passive: true});

window.addEventListener("keyup",e=>{keys[e.code]=false;});





function updatePlayer(dt){
  let ix=0,iy=0;
  if(keys.ArrowRight||keys.KeyD)ix+=1;
  if(keys.ArrowLeft||keys.KeyA)ix-=1;
  if(keys.ArrowUp||keys.KeyW)iy-=1;
  if(keys.ArrowDown||keys.KeyS)iy+=1;

  ix+=joy.x;iy+=joy.y;

  let il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; il = 1; }

  // Tutorial tracking
  if(il > 0.05){
    player.hasMoved = true;
  } else if(!player.hasMoved && currentLevel === 1 && S.mode === "play"){
    player.moveTutTimer = (player.moveTutTimer || 0) + dt;
    if(player.moveTutTimer > 2.2 && window.TutorialEngine && !window.TutorialEngine.isCompleted("move_boat")){
      window.TutorialEngine.trigger("move_boat");
    }
  }

  // Dolphin jump tutorial when riding dolphin near enemies
  if(player.onDolphin && !player.isJumping && window.TutorialEngine && !window.TutorialEngine.isCompleted("dolphin_jump")){
    if(typeof enemies !== "undefined" && enemies.length > 0){
      const nearShark = enemies.find(e => e && e.state !== "dead" && Math.hypot(e.x - player.x, e.y - player.y) < 0.42);
      if(nearShark){
        window.TutorialEngine.trigger("dolphin_jump");
      }
    }
  }

  // Boost condition: space, shift, or touch button
  const wantsBoost = !!((!player.onDolphin && keys["Space"]) || keys["ShiftLeft"] || keys["ShiftRight"] || touchBoostActive);
  const canBoost = wantsBoost && stamina > 0.08 && boostCooldown <= 0 && (il > 0.05 || Math.hypot(player.vx, player.vy) > 0.04);

  if (canBoost) {
    if (!isBoosting) startTurboSound();
    isBoosting = true;
    stamina = Math.max(0, stamina - dt * 0.42);
    if (stamina <= 0.01) {
      isBoosting = false;
      boostCooldown = 0.8;
      stopTurboSound();
    }
  } else {
    if (isBoosting) stopTurboSound();
    isBoosting = false;
    stamina = Math.min(1.0, stamina + dt * 0.28);
    boostCooldown = Math.max(0, boostCooldown - dt);
  }

  // Update boost button UI and circular progress ring
  const elBoostBtn = document.getElementById("btnBoost");
  const elFillRing = document.getElementById("boostFillRing");
  if (elBoostBtn && elFillRing) {
    const circumference = 113.09;
    const offset = circumference * (1.0 - stamina);
    elFillRing.style.strokeDashoffset = offset;
    elFillRing.style.stroke = stamina > 0.25 ? "#00f2fe" : "#ef476f";
    if (isBoosting) {
      elBoostBtn.classList.add("active");
    } else {
      elBoostBtn.classList.remove("active");
    }
    if (stamina < 0.12 || boostCooldown > 0) {
      elBoostBtn.classList.add("depleted");
    } else {
      elBoostBtn.classList.remove("depleted");
    }
  }

  // Physical movement calibration based on player stance
  if(player.onLand){
    // Land walking & sprinting: crisp, responsive, human-scale
    const sprintMul = isBoosting ? 1.6 : 1.0;
    const MSPD = 0.18 * sprintMul;
    const accelRate = isBoosting ? 16.0 : 12.0;
    const decelRate = 14.0;
    const currentAccel = (il > 0.05) ? accelRate : decelRate;
    player.vx += (ix * MSPD - player.vx) * Math.min(1, dt * currentAccel);
    player.vy += (iy * MSPD * 0.94 - player.vy) * Math.min(1, dt * currentAccel);
  } else if(player.onDolphin){
    // Dolphin riding: swift, buoyant, undulating aquatic movement
    const speedMul = isBoosting ? 1.65 : 1.0;
    const MSPD = 0.38 * speedMul;
    const accelRate = isBoosting ? 8.5 : 6.5;
    const decelRate = 7.0;
    const currentAccel = (il > 0.05) ? accelRate : decelRate;
    player.vx += (ix * MSPD - player.vx) * Math.min(1, dt * currentAccel);
    player.vy += (iy * MSPD * 0.94 - player.vy) * Math.min(1, dt * currentAccel);
  } else {
    // REALISTIC BOAT HYDRODYNAMICS & CALIBRATED STEADY SPEED
    // 1. Steering & Angular Inertia (Rudder Dynamics)
    if(il > 0.05){
      const targetAng = Math.atan2(iy, ix);
      let da = targetAng - player.ang;
      while(da > Math.PI) da -= 2 * Math.PI;
      while(da < -Math.PI) da += 2 * Math.PI;

      // Turning responsiveness scales smoothly with speed
      const curSpd = Math.hypot(player.vx, player.vy);
      const rudderAuthority = clamp(0.70 + (curSpd / 0.16) * 0.55, 0.70, 1.25);
      const steerTorque = isBoosting ? 13.0 : 9.5;
      player.angVel = (player.angVel || 0) + da * dt * steerTorque * rudderAuthority;
    }
    // Water rotational damping
    player.angVel = (player.angVel || 0) * Math.exp(-dt * 9.5);
    player.ang += player.angVel * dt;

    // 2. Thrust Along Boat Heading (Rowing & Momentum)
    const fx = Math.cos(player.ang);
    const fy = Math.sin(player.ang);
    const forwardAlignment = il > 0.05 ? Math.max(0, (ix * fx + iy * fy) / il) : 0;
    const throttle = il * (0.35 + 0.65 * forwardAlignment);

    // Rhythmic rowing impulse synchronized with oars
    if(throttle > 0.08){
      const prevRowPhase = player.rowPhase || 0;
      player.rowPhase = prevRowPhase + dt * (isBoosting ? 6.5 : 4.5);
      // Periodic water dip on stroke
      if(Math.floor(prevRowPhase / Math.PI) !== Math.floor(player.rowPhase / Math.PI)){
        if(typeof sPaddle === "function") sPaddle();
      }
    }
    const strokePulse = throttle > 0.08 ? (1.0 + 0.12 * Math.sin(player.rowPhase || 0)) : 1.0;

    // Controlled, realistic target boat speed (~0.155 normal, ~0.25 on boost)
    const targetCruiseSpeed = isBoosting ? 0.25 : 0.155;
    const desiredSpeed = throttle * targetCruiseSpeed * strokePulse;

    // 3. Decompose velocity into forward motion and lateral drift (Keel Hydrodynamics)
    let vForward = player.vx * fx + player.vy * fy;
    let vLateral = player.vx * (-fy) + player.vy * fx;

    // Smooth forward acceleration towards desired speed (no runaway speed)
    const accelRate = isBoosting ? 4.5 : 3.0;
    vForward += (desiredSpeed - vForward) * Math.min(1, dt * accelRate);

    // Hydrodynamic glide drag when coasting
    if(throttle <= 0.05){
      const coastDrag = 1.35;
      vForward *= Math.exp(-dt * coastDrag);
    }

    // Lateral keel resistance (prevents sliding sideways like ice, giving realistic hull grip)
    const keelDrag = 8.5;
    vLateral *= Math.exp(-dt * keelDrag);

    // Reconstruct world velocities
    player.vx = vForward * fx - vLateral * fy;
    player.vy = vForward * fy + vLateral * fx;

    // Animate boat rowing frame based on distance traveled & active rowing
    if(throttle > 0.05){
      player.animFrame = ((player.animFrame || 0) + dt * (isBoosting ? 14 : 9.5)) % (BOAT_FRAME_FILES ? BOAT_FRAME_FILES.length : 24);
    }
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.y = clamp(player.y, -3, 4);

  const shX = shoreAt(player.y);

  if(player.onBeach){
    // Boy is walking freely on the mainland golden beach
    const minSandX = shX - 0.52;
    if(player.x < minSandX){
      player.x = minSandX;
      if(player.vx < 0) player.vx = 0;
    }

    // Checking if boy walks back to the parked boat or re-enters the water
    if(player.parkedBoat){
      const distToBoat = Math.hypot(player.x - player.parkedBoat.x, player.y - player.parkedBoat.y);
      if((player.vx > 0.005 || ix > 0) && (distToBoat < 0.16 || player.x >= shX - 0.05)){
        player.onLand = false;
        player.onBeach = false;
        player.x = player.parkedBoat.x;
        player.y = player.parkedBoat.y;
        player.ang = 0;
        player.vx = 0.08;
        player.vy = 0;
        player.parkedBoat = null;
        toast("عدت إلى القارب! 🛶");
        floatTxt(player.x, player.y - 0.10, "عدت إلى القارب! 🛶", "#ffd166");
        sSplash();
        burst(player.x, player.y, "#ffffff", 14, 1.0);
        updateActionBtnUI();
        updateHUD(true);
      }
    } else {
      if(player.x > shX + 0.04 && (player.vx > 0.02 || ix > 0)){
        player.onLand = false;
        player.onBeach = false;
        toast("انطلقت في مياه البحر! 🌊");
        sSplash();
        updateActionBtnUI();
        updateHUD(true);
      }
    }
  } else {
    // Player is in water (boat or dolphin)
    // When steering towards the shoreline, land smoothly on the beach!
    if(!player.onLand && (ix < -0.15 || player.vx < -0.04) && player.x < shX + 0.055){
      if(player.onDolphin){
        // Dismount dolphin onto the sand
        player.onDolphin = false;
        soloDolphin.active = true;
        soloDolphin.x = shX + 0.09;
        soloDolphin.y = player.y;
        soloDolphin.vx = 0;
        soloDolphin.vy = 0;
        player.onLand = true;
        player.onBeach = true;
        player.x = shX - 0.08;
        player.vx = -0.06;
        player.walkFrame = 0;
        toast("🏖️ نزلت على شاطئ البحر!");
        floatTxt(player.x, player.y - 0.10, "🏖️ مشي واستكشاف الشاطئ", "#ffd166");
        burst(player.x, player.y, "#dfb87e", 12, 0.8);
        updateActionBtnUI();
        updateHUD(true);
      } else {
        // Park the boat at the water's edge and kid steps onto the golden beach!
        player.parkedBoat = {
          x: shX + 0.04,
          y: player.y,
          ang: player.ang
        };
        player.onLand = true;
        player.onBeach = true;
        player.x = shX - 0.08;
        player.vx = -0.06;
        player.walkFrame = 0;
        toast("🏖️ نزلت على شاطئ البحر!");
        floatTxt(player.x, player.y - 0.10, "🏖️ مشي واستكشاف الشاطئ", "#ffd166");
        burst(player.x, player.y, "#dfb87e", 12, 0.8);
        sBump();
        updateActionBtnUI();
        updateHUD(true);
      }
    } else if(!player.onLand && player.x < shX + 0.04){
      player.x = shX + 0.04;
      if(player.vx < 0) player.vx = 0;
    }
  }

  const spd = Math.hypot(player.vx, player.vy);
  if(spd > 0.02 && (player.onLand || player.onDolphin)){
    const ta = Math.atan2(player.vy, player.vx);
    let da = ta - player.ang;
    while(da > Math.PI) da -= 2 * Math.PI;
    while(da < -Math.PI) da += 2 * Math.PI;
    const turnRate = player.onLand ? 18.0 : 12.0;
    player.ang += da * Math.min(1, dt * turnRate);
  }

  player.inv = Math.max(0, player.inv - dt);
  shake = Math.max(0, shake - dt * 2.2);

  /* Loot Island update removed — called once from main.js */

  if(player && player.onLand){
    const walkSpd = Math.hypot(player.vx, player.vy);
    if(walkSpd > 0.015){
      player.walkFrame = (player.walkFrame + dt * 18 * (walkSpd / 0.16)) % KID_WALK_FILES.length;
      if(Math.floor(player.walkFrame) % 11 === 0 && Math.random() < 0.25){
        burst(player.x, player.y + 0.01, "#dfb87e", 3, 0.4);
      }
    } else {
      player.walkFrame = 0;
    }
  }

  /* Dolphin jump and swimming logic when ridden */
  if(player.onDolphin && player.isJumping){
    player.jumpFrame += dt * 82;
    const jumpProg = player.jumpFrame / 113;
    player.jumpAirHeight = Math.sin(Math.min(1, Math.max(0, jumpProg)) * Math.PI) * 0.25;

    // Check leaping over sharks in world
    if(jumpProg > 0.15 && jumpProg < 0.85 && enemies && enemies.length > 0){
      for(const e of enemies){
        if(e.state === "takedown" || e.state === "flee") continue;
        const edx = e.x - player.x, edy = e.y - player.y;
        if(Math.hypot(edx, edy) < 0.38 && !e.jumpAwarded){
          e.jumpAwarded = true;
          score += 50;
          sDolphinChirp();
          burst(e.x, e.y, "#00f2fe", 12, 1.2);
          floatTxt(player.x, player.y - 0.12, "🐬 قفزة فوق القرش! +50", "#00f2fe");
          updateHUD(true);
        }
      }
    }

    if(player.jumpFrame >= 113){
      player.isJumping = false;
      player.jumpAirHeight = 0;
      sDolphinSplash();
      burst(player.x, player.y, "#ffffff", 20, 1.5);
      ring(player.x, player.y, "rgba(0, 242, 254, 0.9)");

      // Landing splash shockwave damages & knocks back sharks
      if(enemies && enemies.length > 0){
        for(let i = enemies.length - 1; i >= 0; i--){
          const e = enemies[i];
          if(e.state === "takedown" || e.state === "flee") continue;
          const edx = e.x - player.x, edy = e.y - player.y;
          const edist = Math.hypot(edx, edy);
          if(edist < 0.44){
            e.hp = Math.max(0, (e.hp || 1) - 1);
            floatTxt(e.x, e.y - 0.1, "💥 صدمة مائية! -1 HP", "#00f2fe");
            burst(e.x, e.y, "#ff6b6b", 10, 1.1);
            const nL = edist || 1;
            e.fdx = (edx / nL);
            e.fdy = (edy / nL);
            if(e.hp <= 0){
              e.state = "takedown";
              e.anim = "takedown";
              e.animFrame = 0;
              e.ft = 0;
              score += 30;
              sScore();
              floatTxt(e.x, e.y - 0.14, "🏆 هزم القرش! +30", "#ffd166");
            } else {
              e.state = "flee";
              e.ft = 1.6;
              e.vx = e.fdx * 0.35;
              e.vy = e.fdy * 0.35;
              e.anim = "move";
            }
            updateHUD(true);
          }
        }
      }
    }
  } else if(player.onDolphin){
    const spd = Math.hypot(player.vx, player.vy);
    player.dolphinAnimFrame = (player.dolphinAnimFrame + dt * (spd > 0.02 ? 34 : 16)) % 50;
  }

  /* Kick attack animation and hit logic */
  if(player.kickCooldown > 0) player.kickCooldown = Math.max(0, player.kickCooldown - dt);

  const elBtnKick = document.getElementById("btnKick");
  if(elBtnKick){
    if(player.kickCooldown > 0 || player.isKicking){
      elBtnKick.classList.add("cooldown");
    } else {
      elBtnKick.classList.remove("cooldown");
    }
  }

  if(player.isKicking){
    player.kickFrame += dt * 42; // 26 frames in ~0.62s

    // During windup (frames < 6), auto-orient side to any attacking shark
    if(player.kickFrame < 6 && enemies && enemies.length > 0){
      const attacker = enemies.find(e => e.state === "attack" && Math.hypot(e.x - player.x, e.y - player.y) < 0.75);
      if(attacker){
        const dx = attacker.x - player.x;
        const dy = attacker.y - player.y;
        let da = Math.atan2(dy, dx) - player.ang;
        while(da > Math.PI) da -= 2 * Math.PI;
        while(da < -Math.PI) da += 2 * Math.PI;
        player.kickSide = (da < 0) ? -1 : 1;
      }
    }

    // Active smash hit window (frames 10 to 25.5, when oar swings down and hits water)
    if(player.kickFrame >= 10 && player.kickFrame <= 25.5 && enemies && enemies.length > 0){
      for(let i = enemies.length - 1; i >= 0; i--){
        const e = enemies[i];
        if(e.state === "takedown" || e.state === "flee") continue;
        if(player.hitEnemies && player.hitEnemies.includes(e)) continue;

        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Extended reach range (0.48 world units covers the splash explosion blast)
        if(dist < 0.48){
          const hitAngle = Math.atan2(dy, dx);
          let da = hitAngle - player.ang;
          while(da > Math.PI) da -= 2 * Math.PI;
          while(da < -Math.PI) da += 2 * Math.PI;

          // Close quarters (< 0.25) hits anywhere around boat
          // Side swing hits on the active kick side (player.kickSide: 1 = right, -1 = left)
          let isHit = false;
          if(dist < 0.25){
            isHit = true;
          } else if(player.kickSide === 1 && da >= -0.35 && da <= 2.95){
            isHit = true; // Right hemisphere smash
          } else if(player.kickSide === -1 && da <= 0.35 && da >= -2.95){
            isHit = true; // Left hemisphere smash
          }

          if(isHit){
            executeKickHit(e, dx, dy, dist);
          }
        }
      }
    }

    if(player.kickFrame >= boatKickFrames.length){
      player.isKicking = false;
      player.kickFrame = 0;
      player.hitEnemies = [];
    }
  }

  /* Rowing animation frame advance */
  if(!player.isKicking && !player.onDolphin){
    if(spd > 0.015){
      const rowFps = 20 * Math.min(1.8, Math.max(0.4, spd / 0.20));
      const prevFrame = player.animFrame;
      player.animFrame = (player.animFrame + dt * rowFps) % BOAT_FRAME_FILES.length;
      if((prevFrame < 5 && player.animFrame >= 5) || (prevFrame < 17 && player.animFrame >= 17)){
        sPaddle();
      }
    } else {
      // Return smoothly to idle frame
      if(player.animFrame > 0.1){
        player.animFrame = (player.animFrame + dt * 12) % BOAT_FRAME_FILES.length;
        if(player.animFrame < 0.8) player.animFrame = 0;
      }
    }
  }

  if(spd>.06 && gt-(update._lw||0)>.16){
    update._lw=gt;
    addRipple(player.x-Math.cos(player.ang)*.05,player.y-Math.sin(player.ang)*.05,performance.now()/1000-t0);
    wake.push({x:player.x-Math.cos(player.ang)*.05,y:player.y-Math.sin(player.ang)*.05,t:0});
  }

  if(isBoosting && Math.random() < 0.85){
    const bx = player.x - Math.cos(player.ang) * 0.08 + (Math.random() - 0.5) * 0.04;
    const by = player.y - Math.sin(player.ang) * 0.08 + (Math.random() - 0.5) * 0.04;
    parts.push({
      type: "waterBubble",
      x: bx, y: by,
      r: 0.012 + Math.random() * 0.014,
      t: 0, life: 0.65
    });
    parts.push({
      x: bx, y: by,
      vx: -Math.cos(player.ang) * 0.25 + (Math.random() - 0.5) * 0.1,
      vy: -Math.sin(player.ang) * 0.25 + (Math.random() - 0.5) * 0.1,
      t: 0, life: 0.4,
      col: "#7ae0ff",
      type: "spark",
      r: 0.012 + Math.random() * 0.008
    });
  }

  for(const wk of wake)wk.t+=dt;
  wake=wake.filter(wk=>wk.t<1);
  /* genAhead removed — called once from main.js */

  const solids=islands.concat([WIN]);
  for(const o of solids){
    if("hitCd" in o && o.hitCd)o.hitCd=Math.max(0,o.hitCd-dt);

    const dx=player.x-o.x,dy=player.y-o.y,d=Math.hypot(dx,dy),mn=o.r+.035;
    if(d<mn && d>0){
      player.x=o.x+dx/d*mn;
      player.y=o.y+dy/d*mn;
      player.vx*=.3;player.vy*=.3;
      shake=Math.max(shake,.12);

      if(!("hitCd" in o) || o.hitCd<=0){
        sBump();
        if("hitCd" in o)o.hitCd=.8;
        ring(player.x,player.y,"rgba(255,255,255,.8)");
      }
    }
  }


}

function drawPlayerShip(){
  if(player.isRescuing){
    drawRescueAnimation();
    return;
  }

  if(player.onLand){
    if(player.parkedBoat){
      ctx.save();
      const pBob = Math.sin(gt * 2.2) * 0.003;
      ctx.translate(player.parkedBoat.x, player.parkedBoat.y + pBob);
      ctx.rotate((player.parkedBoat.ang || 0) + Math.PI/2);
      if(emptyBoatLoaded && emptyBoatImg.complete && emptyBoatImg.naturalWidth){
        let sx = 0, sy = 0, sw = emptyBoatImg.naturalWidth, sh = emptyBoatImg.naturalHeight;
        if(emptyBoatImg.naturalWidth === 1672 && emptyBoatImg.naturalHeight === 941){
          sx = 423; sy = 78; sw = 806; sh = 671;
        }
        // Match the exact hull scale of moving boat (hull length 0.130, width 0.156)
        const drawH = 0.130;
        const drawW = drawH * (sw / sh);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(emptyBoatImg, sx, sy, sw, sh, -drawW/2, -drawH/2, drawW, drawH);
      } else {
        const img = (boatFrames && boatFrames.length > 0) ? boatFrames[0] : null;
        if(img && img.complete && img.naturalWidth){
          const drawW = 0.36;
          const drawH = 0.36 * (img.naturalHeight / img.naturalWidth);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
        }
      }
      ctx.restore();
    }
    drawKidWalking();
    return;
  }

  if(player.inv>0 && Math.floor(gt*10)%2===0)return;

  if(player.onDolphin){
    drawRiddenDolphin();
    return;
  }

  const bob=Math.sin(gt*2.2)*.004;
  ctx.save();ctx.translate(player.x,player.y+bob);

  /* Boat heading rotation (add PI/2 so sprite facing upwards points along direction of travel) */
  ctx.rotate(player.ang + Math.PI/2);

  if(player.isKicking && boatKickFrames.length > 0){
    const kIdx = Math.min(boatKickFrames.length - 1, Math.floor(player.kickFrame || 0));
    const kImg = boatKickFrames[kIdx];
    if(kImg && kImg.complete && kImg.naturalWidth){
      const drawW = 0.36;
      const drawH = 0.36 * (kImg.naturalHeight / kImg.naturalWidth);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // The new oar smash animation naturally strikes on the LEFT side (player.kickSide === -1).
      // If target is on the RIGHT side (player.kickSide === 1), mirror horizontally!
      if(player.kickSide === 1){
        const dxCenter = (0.39 / 800) * drawW;
        ctx.translate(dxCenter, 0);
        ctx.scale(-1, 1);
        ctx.translate(-dxCenter, 0);
      }

      ctx.drawImage(kImg, -drawW/2, -drawH/2, drawW, drawH);
    }
  } else {
    const idx = Math.floor(player.animFrame || 0) % BOAT_FRAME_FILES.length;
    const img = boatFrames[idx];

    if(img && img.complete && img.naturalWidth){
      const drawW = 0.36;
      const drawH = 0.36 * (img.naturalHeight / img.naturalWidth);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    }else{
      /* Fallback stylized boat if images are still loading */
      ctx.rotate(-Math.PI/2);
      const hg=ctx.createLinearGradient(-.05,0,.065,0);
      hg.addColorStop(0,"#e8484f");hg.addColorStop(1,"#ff7b6b");
      ctx.fillStyle=hg;
      ctx.beginPath();
      ctx.moveTo(.068,0);
      ctx.quadraticCurveTo(.04,-.036,-.05,-.03);
      ctx.quadraticCurveTo(-.068,0,-.05,.03);
      ctx.quadraticCurveTo(.04,.036,.068,0);
      ctx.fill();
      ctx.strokeStyle="#b71c3a";ctx.lineWidth=.005;ctx.stroke();

      /* Child */
      ctx.fillStyle="#ffd9a0";ctx.beginPath();ctx.arc(-.005,0,.016,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ffe066";ctx.beginPath();ctx.arc(-.005,0,.019,0,Math.PI*2);ctx.fill();
    }
  }

  ctx.restore();
}


