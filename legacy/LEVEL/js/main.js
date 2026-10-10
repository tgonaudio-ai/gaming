/* === MAIN.JS: Game Loop Orchestration, Physics Step & Animation Frame === */
"use strict";

function updateCrates(dt){
  islands = islands.filter(o => o.x > cam.x - 2);

  for(let i=crates.length-1;i>=0;i--){
    const cr=crates[i];
    if(cr.x<cam.x-1.5){crates.splice(i,1);continue;}

    if(Math.hypot(player.x-cr.x,player.y-cr.y)<.06){
      crates.splice(i,1);
      score+=10;
      if(typeof stamina !== "undefined"){
        stamina = Math.min(1.0, stamina + 0.35);
      }
      sCollect();
      burst(cr.x,cr.y,"#00f2fe",10,1.2);
      ring(cr.x,cr.y,"rgba(0,242,254,.9)");
      floatTxt(cr.x,cr.y-.05,"+١٠ ⭐ طاقة ⚡","#00f2fe");
      updateHUD(true);
    }
  }
}

function updateCameraAndMilestones(dt){
  const curCfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
  const prog=(player.x-PX0)/Math.max(.001,(WIN.x-PX0));
  if(curCfg.miles && mileIdx<curCfg.miles.length && prog>=curCfg.miles[mileIdx].p){
    toast(curCfg.miles[mileIdx].msg);sMile();mileIdx++;
  }

    if(!winShown && Math.hypot(player.x-WIN.x,player.y-WIN.y)<WIN.r+.05){
    // Kept empty. Victory logic handled inside updateBottleQuest() for final_voyage
  }

  const vw=aspect();
  cam.x+=(player.x-vw*.42/zoom-cam.x)*Math.min(1,dt*3);
  cam.y+=(player.y-.5/zoom-cam.y)*Math.min(1,dt*3);

  updateHUD();

}

function update(dt){
  gt += dt;

  /* Cinematic Rescue Sequence when boat breaks */
  if(player && player.isRescuing){
    updateRescueSequence(dt);
    updateAudioEngine(dt);
    return;
  }

  // Update Player (Movement, Boost, Kid on land, Kick attack)
  if(player) updatePlayer(dt);

  // Update Solo Dolphin
  updateSoloDolphin(dt);

  // Procedural Island & Crate Generation
  genAhead();

  // Crates pickup & cleanup
  if(player) updateCrates(dt);

  // Loot Island system
  if(player && lootIsland) updateLootIsland(dt);

  // Bottle Quest system (compass, mirage, ambush, final recovery)
  if(player && typeof updateBottleQuest === "function") updateBottleQuest(dt);

  // Sharks AI and collisions
  if(player) updateSharks(dt);

  // Particles & bubbles simulation
  updateParticles(dt);

  // Milestones, Win condition & Camera tracking
  if(player) updateCameraAndMilestones(dt);

  // Audio heartbeat & ambient updates
  updateAudioEngine(dt);
}

/* ---------- main loop ---------- */
let lastFrame=performance.now();
const t0=performance.now()/1000;

function frame(nowMs){
  const dt=Math.min(.05,Math.max(0,(nowMs-lastFrame)/1000));
  lastFrame=nowMs;

  const effectiveDt = (typeof window.timeScale !== "undefined") ? dt * window.timeScale : dt;
  if((S.mode==="play" || S.mode==="win") && effectiveDt > 0.00001) update(effectiveDt);

  if(S.mode==="start" && player){
    cam.y+=(0-cam.y)*Math.min(1,dt*3);
    player.ang=0;
  }

  render(nowMs/1000-t0);
  requestAnimationFrame(frame);
}

/* initial state is now safe because HUD + renderer were initialized first */
startLevel(1);
S.mode = "start";
show("ovStart");
requestAnimationFrame(frame);


window.addEventListener("load", () => {
  resizeCheck();
});
