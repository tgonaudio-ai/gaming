/* === DOLPHIN.JS: Solo Dolphin AI, Ridden Dolphin, Rescue Sequence & Drawing === */
"use strict";

function updateSoloDolphin(dt){
  if(!soloDolphin || !soloDolphin.active || (player && player.onDolphin)) return;

  let targetX, targetY;
  if(player && player.onLand && lootIsland && !player.onBeach){
    // When kid is on Loot Island, dolphin stays in water off the island beach
    const pAng = Math.sin(gt * 0.7) * 0.55;
    targetX = lootIsland.x - lootIsland.w * 0.58 + Math.cos(pAng) * 0.06;
    targetY = lootIsland.y + Math.sin(pAng) * (lootIsland.h * 0.35);
  } else if(player && player.onLand && player.onBeach){
    // When kid is on mainland beach, dolphin stays in water near the shore waiting peacefully
    const shX = shoreAt(player.y);
    targetX = shX + 0.14 + Math.sin(gt * 1.2) * 0.04;
    targetY = player.y + Math.cos(gt * 0.8) * 0.08;
  } else {
    targetX = player.x - Math.cos(player.ang) * 0.12 + Math.cos(player.ang + Math.PI/2) * 0.24;
    targetY = player.y - Math.sin(player.ang) * 0.12 + Math.sin(player.ang + Math.PI/2) * 0.24;
  }

  const dx = targetX - soloDolphin.x;
  const dy = targetY - soloDolphin.y;
  const dist = Math.hypot(dx, dy);

  const targetAng = Math.atan2(dy, dx);
  let da = targetAng - soloDolphin.ang;
  while(da > Math.PI) da -= 2 * Math.PI;
  while(da < -Math.PI) da += 2 * Math.PI;
  soloDolphin.ang += da * Math.min(1, dt * 5);

  const speed = Math.min(0.44, 0.08 + dist * 1.8);
  soloDolphin.vx = Math.cos(soloDolphin.ang) * speed;
  soloDolphin.vy = Math.sin(soloDolphin.ang) * speed;
  soloDolphin.x += soloDolphin.vx * dt;
  soloDolphin.y += soloDolphin.vy * dt;

  // Keep dolphin strictly in the water outside island boundaries
  if(lootIsland){
    const rx = lootIsland.w * 0.50 + 0.05;
    const ry = lootIsland.h * 0.50 + 0.05;
    const lnx = (soloDolphin.x - lootIsland.x) / rx;
    const lny = (soloDolphin.y - lootIsland.y) / ry;
    const ld = Math.hypot(lnx, lny);
    if(ld < 1.0 && ld > 0.0001){
      soloDolphin.x = lootIsland.x + (lnx / ld) * rx;
      soloDolphin.y = lootIsland.y + (lny / ld) * ry;
    }
  }

  // Keep dolphin strictly in the water outside mainland beach
  const shX_dolph = shoreAt(soloDolphin.y);
  if(soloDolphin.x < shX_dolph + 0.08){
    soloDolphin.x = shX_dolph + 0.08;
    if(soloDolphin.vx < 0) soloDolphin.vx = 0;
  }

  // Repel solo dolphin from active sharks to prevent clipping
  if(typeof enemies !== "undefined" && enemies && enemies.length > 0){
    for(const e of enemies){
      if(!e || e.state === "dead" || e.state === "stunned") continue;
      const edx = soloDolphin.x - e.x, edy = soloDolphin.y - e.y;
      const edist = Math.hypot(edx, edy);
      if(edist < 0.26 && edist > 0.001){
        const rep = (0.26 - edist) * 2.2;
        soloDolphin.x += (edx / edist) * rep * dt * 4;
        soloDolphin.y += (edy / edist) * rep * dt * 4;
      }
    }
  }

  if(soloDolphin.isJumping){
    soloDolphin.jumpFrame += dt * 55;
    if(soloDolphin.jumpFrame >= 62){
      soloDolphin.isJumping = false;
      sDolphinSplash();
      burst(soloDolphin.x, soloDolphin.y, "#ffffff", 10, 1.0);
      ring(soloDolphin.x, soloDolphin.y, "rgba(0,242,254,0.7)");
    }
  } else {
    soloDolphin.animFrame = (soloDolphin.animFrame + dt * 26) % 27;
    soloDolphin.jumpTimer -= dt;
    if(soloDolphin.jumpTimer <= 0 && dist < 0.45){
      soloDolphin.isJumping = true;
      soloDolphin.jumpFrame = 0;
      sDolphinChirp();
      soloDolphin.jumpTimer = 7.0 + Math.random() * 6.0;
    }
  }
}



function updateRescueSequence(dt){
    player.vx *= (1 - dt * 3.0);
    player.vy *= (1 - dt * 3.0);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.inv = 5.0;

    const prevRescue = player.rescueFrame;
    player.rescueFrame += dt * 18; // ~1.65 seconds for 30 frames

    // Sound and particle cues at dramatic stages
    if(prevRescue < 10 && player.rescueFrame >= 10){
      sDolphinSplash();
      ring(player.x, player.y, "rgba(255,255,255,0.85)");
      burst(player.x, player.y, "#ffffff", 14, 1.0);
    }
    if(prevRescue < 18 && player.rescueFrame >= 18){
      sDolphinChirp();
      floatTxt(player.x, player.y - 0.12, "🐬 وصل الدلفين لإنقاذ الصبي!", "#00f2fe");
    }

    if(player.rescueFrame >= DOLPHIN_SAVING_FILES.length){
      // Rescue completes: mount dolphin with full health
      player.isRescuing = false;
      player.boatDestroyed = true;
      player.dolphinRescueUsed = true;
      player.onDolphin = true;
      player.dolphinAnimFrame = 0;
      player.isJumping = false;
      player.jumpFrame = 0;
      player.jumpAirHeight = 0;
      hearts = 5;
      player.inv = 3.0;

      spawnBoatDebris(player.x, player.y);
      sScore();
      sDolphinChirp();
      burst(player.x, player.y, "#00f2fe", 24, 1.5);
      ring(player.x, player.y, "rgba(0, 242, 254, 0.9)");

      toast("🐬 أنقذك الدلفين الصديق وحملك على ظهره! اقفز واهجم بحرية!");
      floatTxt(player.x, player.y - 0.14, "🐬 إنقاذ بطولي! قلوب كاملة ❤️❤️❤️❤️❤️", "#00f2fe");

      updateActionBtnUI();
      updateHUD(true);

      if(currentLevel === 1 && typeof bottleQuest !== "undefined" && bottleQuest && bottleQuest.stage === "rescue"){
        // Chapter 1 ends: the dolphin carries the boy away
        bottleQuest.stage = "level_1_done";
        setTimeout(() => { if(S.mode === "play") doWin(); }, 2200);
      } else if(window.TutorialEngine){
        setTimeout(() => {
          if(window.TutorialEngine) window.TutorialEngine.trigger("dolphin_ride");
        }, 400);
      }
    }

    // Still update particles and HUD during rescue
    updateHUD();

}


function drawSoloDolphin(){
  if(!soloDolphin || !soloDolphin.active || (player && player.onDolphin)) return;

  const bob = soloDolphin.isJumping ? 0 : Math.sin(gt * 3.5 + 1.2) * 0.005;
  const drawW = 0.36;
  const drawH = 0.36 * (450 / 800);

  ctx.save();
  ctx.translate(soloDolphin.x, soloDolphin.y + bob);
  ctx.rotate(soloDolphin.ang + Math.PI/2);

  if(soloDolphin.isJumping && dolphinJumpFrames.length > 0){
    const idx = Math.min(dolphinJumpFrames.length - 1, Math.floor(soloDolphin.jumpFrame || 0));
    const img = dolphinJumpFrames[idx];
    const jumpProg = (soloDolphin.jumpFrame || 0) / 62;
    const airH = Math.sin(Math.min(1, Math.max(0, jumpProg)) * Math.PI) * 0.18;

    ctx.save();
    ctx.fillStyle = "rgba(0, 20, 40, " + (0.3 * (1 - airH)) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 0, drawW * 0.28, drawH * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if(img && img.complete && img.naturalWidth){
      ctx.save();
      const s = 1.0 + airH * 1.1;
      ctx.scale(s, s);
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
      ctx.restore();
    }
  } else if(dolphinMoveFrames.length > 0){
    const idx = Math.floor(soloDolphin.animFrame || 0) % dolphinMoveFrames.length;
    const img = dolphinMoveFrames[idx];
    if(img && img.complete && img.naturalWidth){
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    }
  }

  ctx.restore();
}

function drawRiddenDolphin(){
  const bob = player.isJumping ? 0 : Math.sin(gt * 3.5) * 0.005;
  const drawW = 0.52;
  const drawH = 0.52 * (450 / 800);

  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.rotate(player.ang + Math.PI/2);

  if(player.isJumping && dolphinJumpKidFrames.length > 0){
    const idx = Math.min(dolphinJumpKidFrames.length - 1, Math.floor(player.jumpFrame || 0));
    const img = dolphinJumpKidFrames[idx];
    const airH = player.jumpAirHeight || 0;
    const shadowScale = Math.max(0.1, 1.0 - airH * 2.0);

    ctx.save();
    ctx.fillStyle = "rgba(0, 20, 40, " + (0.32 * shadowScale) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 0, (drawW * 0.3) * shadowScale, (drawH * 0.65) * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if(img && img.complete && img.naturalWidth){
      ctx.save();
      const s = 1.0 + airH * 1.25;
      ctx.scale(s, s);
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
      ctx.restore();
    }
  } else if(dolphinMoveKidFrames.length > 0){
    const idx = Math.floor(player.dolphinAnimFrame || 0) % dolphinMoveKidFrames.length;
    const img = dolphinMoveKidFrames[idx];
    if(img && img.complete && img.naturalWidth){
      ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    }
  }

  ctx.restore();
}

function drawRescueAnimation(){
  if(!player || dolphinSavingFrames.length === 0) return;
  const idx = Math.min(dolphinSavingFrames.length - 1, Math.floor(player.rescueFrame || 0));
  const img = dolphinSavingFrames[idx];

  const bob = Math.sin(gt * 2.5) * 0.003;
  const drawW = 0.52;
  const drawH = 0.52 * (450 / 800);

  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.rotate(player.ang + Math.PI / 2);



  if(img && img.complete && img.naturalWidth){
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();
}


