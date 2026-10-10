/* === SHARK.JS: Shark AI (Chase, Attack, Miss, Flee, Takedown) & Drawing === */
"use strict";

function spawnEnemy(){
  const vw=aspect();
  const cfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
  const sp = rand(cfg.sharkSpeedMin, cfg.sharkSpeedMax);
  const maxHp = currentLevel === 1 ? 2 : (currentLevel === 2 ? 3 : 4);

  enemies.push({
    x:cam.x+vw+.4,
    y:cam.y+rand(.08,.92),
    vx:-0.05,vy:0,ang:Math.PI,
    ph:rand(0,7),say:0,
    sp:sp,
    hp:maxHp,
    maxHp:maxHp,
    hitTimer:0,
    stunTimer:0,
    state:"chase",
    anim:"move",
    spin:0,ft:0,
    animFrame:Math.random()*SHARK_MOVE_FILES.length
  });
}



function updateSharks(dt){
  const curCfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
  const maxE = currentLevel === 2 ? Math.min(2, curCfg.maxEnemies) : curCfg.maxEnemies;
  const depM = (player.x - PX0) * 18;
  nextEnemy -= dt;

  // In Level 1, keep sea peaceful during bottle quest mirage, rescue & island crafting
  const bqStage = (typeof bottleQuest !== "undefined" && bottleQuest) ? bottleQuest.stage : "";
  let isPeacefulStage = false;
  if(currentLevel === 1){
    if(["chase_1", "vanish_1", "shark_ambush", "rescue", "level_1_done"].includes(bqStage)) isPeacefulStage = true;
    if(bqStage === "chase_2" && enemies.length >= 1) isPeacefulStage = true; // single tutorial shark
  } else if(currentLevel === 2){
    if(["island_craft", "level_2_done"].includes(bqStage)) isPeacefulStage = true;
  } else if(currentLevel === 3){
    if(bqStage === "final_voyage" || bqStage === "bottle_found") isPeacefulStage = true; // only the final ambush
  }

  if(!isPeacefulStage && nextEnemy<=0 && enemies.length<maxE && depM>16){
    spawnEnemy();
    const baseCd = currentLevel === 1 ? 5.5 : (currentLevel === 2 ? 3.6 : 2.6);
    nextEnemy=clamp(baseCd - depM/400, 2.2, 5.5)*rand(.9,1.2);
  }

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];

    // Separation: push away from other sharks to eliminate overlaps
    for(let j=0;j<enemies.length;j++){
      if(i===j)continue;
      const o=enemies[j];
      const sx=e.x-o.x, sy=e.y-o.y;
      const sl=Math.hypot(sx,sy);
      const minSep=0.50;
      if(sl<minSep && sl>0.0001){
        const rep=(minSep-sl)/minSep*0.65;
        e.vx+=(sx/sl)*rep;
        e.vy+=(sy/sl)*rep;
      }
    }

    // Island collision avoidance: sharks cannot enter islands or Loot Island
    if(lootIsland){
      const rx = lootIsland.w * 0.50 + 0.05;
      const ry = lootIsland.h * 0.50 + 0.05;
      const lnx = (e.x - lootIsland.x) / rx;
      const lny = (e.y - lootIsland.y) / ry;
      const ld = Math.hypot(lnx, lny);
      if(ld < 1.0 && ld > 0.0001){
        e.x = lootIsland.x + (lnx / ld) * rx;
        e.y = lootIsland.y + (lny / ld) * ry;
        const normX = lnx / ld, normY = lny / ld;
        const dot = e.vx * normX + e.vy * normY;
        if(dot < 0){
          e.vx -= dot * 1.6 * normX;
          e.vy -= dot * 1.6 * normY;
        }
        e.ang = Math.atan2(e.vy, e.vx);
      }
    }

    const allIslands = islands.concat([WIN]);
    for(const isl of allIslands){
      const ix=e.x-isl.x, iy=e.y-isl.y;
      const id=Math.hypot(ix,iy);
      const minIsl=isl.r*1.5 + 0.05;
      if(id<minIsl && id>0.0001){
        e.x = isl.x + (ix / id) * minIsl;
        e.y = isl.y + (iy / id) * minIsl;
        const dot = e.vx * (ix / id) + e.vy * (iy / id);
        if(dot < 0){
          e.vx -= dot * 1.6 * (ix / id);
          e.vy -= dot * 1.6 * (iy / id);
        }
      }
    }

    // Beach shore avoidance: sharks stay out of shallow beach sand
    const shX=shoreAt(e.y);
    if(e.x < shX + 0.18){
      e.vx += (shX + 0.18 - e.x) * 1.6;
      if(e.x < shX + 0.09) e.x = shX + 0.09;
    }

    if(e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt);
    if(e.hitTimer > 0) e.hitTimer = Math.max(0, e.hitTimer - dt);

    if(e.stunTimer > 0 && e.state !== "takedown" && e.state !== "flee"){
      // Stunned flinch from player kick: drifts back with knockback velocity
      e.vx *= 0.93;
      e.vy *= 0.93;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.anim = "move";
      e.animFrame = (e.animFrame + dt * 6) % SHARK_MOVE_FILES.length;
      if(e.x < cam.x - 1.6){ enemies.splice(i, 1); continue; }
      continue;
    }

    if(e.state==="chase"){
      let tx, ty, L;
      if(player.onLand && lootIsland && !player.onBeach){
        // Player is safe on island: shark cannot enter, patrols in deep water around lootIsland
        const pAng = e.ph + gt * 0.45;
        const pX = lootIsland.x + Math.cos(pAng) * (lootIsland.w * 0.58);
        const pY = lootIsland.y + Math.sin(pAng) * (lootIsland.h * 0.58);
        tx = pX - e.x;
        ty = pY - e.y;
        L = Math.hypot(tx, ty) || 1;
      } else if(player.onLand && player.onBeach){
        // Player is safe on mainland beach: sharks patrol in deep water outside the surf
        const shX = shoreAt(e.y);
        const pX = shX + 0.38 + Math.cos(e.ph + gt * 0.8) * 0.1;
        const pY = player.y + Math.sin(e.ph + gt * 0.6) * 0.25;
        tx = pX - e.x;
        ty = pY - e.y;
        L = Math.hypot(tx, ty) || 1;
      } else {
        const flankAngle=e.ph+gt*0.6;
        const offX=Math.cos(flankAngle)*0.07;
        const offY=Math.sin(flankAngle)*0.09;
        tx=(player.x+offX)-e.x;
        ty=(player.y+offY)-e.y;
        L=Math.hypot(player.x-e.x, player.y-e.y)||1;
      }

      e.vx+=((tx/L)*e.sp-e.vx)*Math.min(1,dt*1.6);
      e.vy+=((ty/L)*e.sp+Math.sin(gt*2+e.ph)*.025-e.vy)*Math.min(1,dt*1.6);
      e.x+=e.vx*dt;e.y+=e.vy*dt;

      e.anim="move";
      e.animFrame = (e.animFrame + dt * 14) % SHARK_MOVE_FILES.length;

      const ta=Math.atan2(ty, tx);
      let da=ta-e.ang;
      while(da>Math.PI)da-=2*Math.PI;
      while(da<-Math.PI)da+=2*Math.PI;
      e.ang+=da*Math.min(1,dt*5.5);

      if(e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      // Only one shark attacks at a time and NEVER when player is on land
      const anyOtherAttacking = enemies.some((other,idx)=>idx!==i && (other.state==="attack" || other.state==="windup"));
      if(!player.onLand && L < 0.36 && player.inv <= 0 && !anyOtherAttacking && (!e.attackCooldown || e.attackCooldown <= 0)){
        e.state="windup";
        e.windupTimer = 0.50; // Telegraphed windup warning (half a second)
        e.anim = "move";
        if(typeof sSharkWarn === "function") sSharkWarn();
        burst(e.x, e.y, "#ff3333", 6, 0.7);
        floatTxt(e.x, e.y - 0.12, "⚠️ ترصد وهجوم!", "#ff4444");
        if(window.TutorialEngine){
          window.TutorialEngine.trigger("shark_combat");
        }
      }
      if(e.x<cam.x-1.6){enemies.splice(i,1);continue;}

    }else if(e.state==="windup"){
      if(player.onLand){
        e.state = "chase";
        e.anim = "move";
        continue;
      }
      // Shark turns towards player and winds up, coiling to strike
      const tx = player.x - e.x, ty = player.y - e.y, L = Math.hypot(tx, ty) || 1;
      const ta = Math.atan2(ty, tx);
      let da = ta - e.ang;
      while(da > Math.PI) da -= 2 * Math.PI;
      while(da < -Math.PI) da += 2 * Math.PI;
      e.ang += da * Math.min(1, dt * 7.5);

      e.vx *= 0.88;
      e.vy *= 0.88;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      e.anim = "move";
      e.animFrame = (e.animFrame + dt * 18) % SHARK_MOVE_FILES.length;

      e.windupTimer = (e.windupTimer || 0.5) - dt;

      // If player strikes during the windup window, counter-hit immediately!
      if(player.isKicking && L < 0.28){
        executeKickHit(e, e.x - player.x, e.y - player.y, L);
        continue;
      }

      if(e.windupTimer <= 0){
        e.state = "attack";
        e.anim = "attack";
        e.animFrame = 0;
        sSplash();
        burst(e.x, e.y, "#ffffff", 10, 0.9);
      }
      if(e.x < cam.x - 1.6){ enemies.splice(i, 1); continue; }

    }else if(e.state==="attack"){
      if(player.onLand){
        e.state = "chase";
        e.anim = "move";
        continue;
      }
      const tx=player.x-e.x,ty=player.y-e.y,L=Math.hypot(tx,ty)||1;
      const attackSp = e.sp * 1.55;

      e.vx+=((tx/L)*attackSp-e.vx)*Math.min(1,dt*3.2);
      e.vy+=((ty/L)*attackSp-e.vy)*Math.min(1,dt*3.2);
      e.x+=e.vx*dt;e.y+=e.vy*dt;

      e.anim="attack";
      e.animFrame += dt * 22;

      const ta=Math.atan2(player.y-e.y,player.x-e.x);
      let da=ta-e.ang;
      while(da>Math.PI)da-=2*Math.PI;
      while(da<-Math.PI)da+=2*Math.PI;
      e.ang+=da*Math.min(1,dt*6);

      if(L<.08 && player.inv<=0 && (!e.stunTimer || e.stunTimer<=0)){
        if(player.onDolphin && player.isJumping){
          e.state = "miss";
          e.say = 1.0;
          if(!e.jumpAwarded){
            e.jumpAwarded = true;
            score += 50;
            sDolphinChirp();
            burst(e.x, e.y, "#00f2fe", 12, 1.2);
            floatTxt(player.x, player.y - 0.12, "🐬 قفزة فوق القرش! +50", "#00f2fe");
            updateHUD(true);
          }
        } else if(player.isKicking){
          executeKickHit(e, e.x - player.x, e.y - player.y, L);
        } else {
          hitPlayer(e);
        }
      }

      if(e.animFrame >= SHARK_ATTACK_FILES.length){
        e.animFrame = 0;
        e.state="chase";
        e.anim="move";
        e.attackCooldown = 1.5;
      }
      if(e.x<cam.x-1.6){enemies.splice(i,1);continue;}

    }else if(e.state==="miss"){
      // Shark lunged but missed because dolphin jumped over it!
      e.missTimer = (e.missTimer || 0.8) - dt;
      e.anim = "move";
      e.animFrame = (e.animFrame + dt * 14) % SHARK_MOVE_FILES.length;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= (1 - dt * 2.0);
      e.vy *= (1 - dt * 2.0);
      if(e.missTimer <= 0){
        e.state = "chase";
        e.jumpAwarded = false;
        e.missTimer = 0.8;
      }
      if(e.x < cam.x - 1.6){ enemies.splice(i, 1); continue; }

    }else if(e.state==="flee"){
      // Shark swimming away after surviving landing shockwave
      e.ft -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.anim = "move";
      e.animFrame = (e.animFrame + dt * 16) % SHARK_MOVE_FILES.length;
      e.ang = Math.atan2(e.vy, e.vx);
      if(e.ft <= 0){
        e.state = "chase";
      }
      if(e.x < cam.x - 1.6){ enemies.splice(i, 1); continue; }

    }else if(e.state==="takedown"){
      // Defeated shark sinking downward
      e.ft = (e.ft || 0) + dt;
      e.x += (e.fdx || 0) * .14 * dt;
      e.y += ((e.fdy || 0) * .14 + .045) * dt;
      e.anim = "takedown";
      e.animFrame = Math.min(SHARK_TAKEDOWN_FILES.length - 1, e.animFrame + dt * 18);
      e.say = Math.max(0, e.say - dt);

      if(e.ft > 2.5 || e.animFrame >= SHARK_TAKEDOWN_FILES.length - 1){
        enemies.splice(i, 1);
        continue;
      }
    }
  }

  nextFish-=dt;
  if(nextFish<=0){
    nextFish=rand(5,9);
    const vw=aspect();
    const fx=cam.x+rand(.2,vw-.2),fy=cam.y+rand(.15,.85);
    if(fx-shoreAt(fy)>.05){
      parts.push({type:"fish",x:fx,y:fy,dx:(Math.random()<.5?.14:-.14),t:0,life:1.15});
    }
  }


}

function drawEnemyShip(e){
  const bob=Math.sin(gt*2.5+e.ph)*.004;
  ctx.save();
  ctx.translate(e.x, e.y+bob);
  // Rotate smoothly in full 360 degrees to face player directly:
  ctx.rotate(e.ang);
  if(Math.cos(e.ang) < 0){
    ctx.scale(1, -1);
  }

  // Telegraphed windup warning shadow / fin ripple
  if(e.state === "windup"){
    ctx.save();
    const pulseR = 0.16 + Math.sin(gt * 24) * 0.02;
    ctx.fillStyle = "rgba(239, 71, 111, 0.32)";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 0.005;
    ctx.setLineDash([0.012, 0.008]);
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Underwater effect when swimming/chasing, normal surface look when attacking
  if(e.anim === "attack"){
    // Surfacing & leaping out of water: normal crisp look
    ctx.globalAlpha = 1.0;
  } else if(e.anim === "takedown"){
    // Stunned and sinking into deep water
    const fade = Math.max(0, 0.75 - (e.ft / 2.5) * 0.75);
    ctx.globalAlpha = fade;
  } else {
    // Under water swimming effect: submerged depth tint and refraction
    ctx.globalAlpha = 0.72;
  }

  

  let frames = sharkMoveFrames;
  let fileCount = SHARK_MOVE_FILES.length;
  if(e.anim === "attack"){
    frames = sharkAttackFrames;
    fileCount = SHARK_ATTACK_FILES.length;
  } else if(e.anim === "takedown"){
    frames = sharkTakedownFrames;
    fileCount = SHARK_TAKEDOWN_FILES.length;
  }

  const sidx = Math.floor(e.animFrame || 0) % fileCount;
  const simg = frames[sidx];

  if(simg && simg.complete && simg.naturalWidth){
    const sW = 0.38;
    const sH = 0.38 * (simg.naturalHeight / simg.naturalWidth);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(simg, -sW/2, -sH/2, sW, sH);

    // If underwater, add subtle ocean caustics wash over shark body
    if(e.anim !== "attack"){
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(10, 80, 120, 0.28)";
      ctx.fillRect(-sW/2, -sH/2, sW, sH);
      ctx.restore();
    }
  }else{
    /* Fallback shark fin shape if frames are loading */
    ctx.fillStyle="#1b3d52";
    ctx.beginPath();
    ctx.moveTo(0.04, 0);
    ctx.lineTo(-0.03, -0.025);
    ctx.lineTo(-0.03, 0.025);
    ctx.closePath();
    ctx.fill();
  }

  
  ctx.restore();

  // Small Health Bar for Shark
  if(e.state !== "takedown" && e.state !== "flee" && e.hp > 0 && e.maxHp > 0){
    drawSharkHealthBar(e);
  }
}

function drawSharkHealthBar(e){
  const bw = 0.076;
  const bh = 0.010;
  const bob = Math.sin(gt * 2.5 + e.ph) * 0.004;

  ctx.save();
  ctx.translate(e.x, e.y + bob - 0.076);

  // Background container
  ctx.fillStyle = "rgba(4, 18, 30, 0.85)";
  rr(-bw/2 - 0.002, -bh/2 - 0.002, bw + 0.004, bh + 0.004, 0.005);
  ctx.fill();
  ctx.strokeStyle = e.hitTimer > 0 ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 0.0018;
  ctx.stroke();

  // Health Fill
  const pct = clamp(e.hp / e.maxHp, 0, 1);
  const fillW = Math.max(0, bw * pct);
  if(fillW > 0){
    let col = "#2ecc71"; // Fresh green
    if(pct <= 0.35) col = "#ef476f"; // Critical red
    else if(pct <= 0.65) col = "#ffd166"; // Warning yellow/orange
    if(e.hitTimer > 0) col = "#ffffff"; // Flash white on hit

    ctx.fillStyle = col;
    rr(-bw/2, -bh/2, fillW, bh, 0.0035);
    ctx.fill();
  }

  // Segment pips/dividers
  if(e.maxHp > 1){
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 0.0016;
    for(let k = 1; k < e.maxHp; k++){
      const pipX = -bw/2 + (bw / e.maxHp) * k;
      ctx.beginPath();
      ctx.moveTo(pipX, -bh/2);
      ctx.lineTo(pipX, bh/2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

