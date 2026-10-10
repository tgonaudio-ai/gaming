/* === LOOT_ISLAND.JS: Loot Island System, Wood Harvesting & Workbench Crafting === */
"use strict";

/* ---------- LOOT ISLAND & BOAT CRAFTING SYSTEM ---------- */
let lootIsland = null;

function initLootIsland(){
  // The wood island only exists in chapter 2
  if(currentLevel !== 2){
    lootIsland = null;
    const cw = document.getElementById("chipWood");
    if(cw) cw.style.display = "none";
    return;
  }
  const cfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
  const islX = PX0 + Math.min(cfg.winDist * 0.46, 7.0);
  const islY = 0.50;
  
  lootIsland = {
    x: islX,
    y: islY,
    w: 0.96, // Island world width
    h: 0.64, // Island world height (matches 1536x1024 3:2 ratio)
    r: 0.42, // Collision radius
    beaches: [
      {x: islX - 0.32, y: islY + 0.02, r: 0.14, name: "west"},
      {x: islX + 0.30, y: islY + 0.02, r: 0.14, name: "east"}
    ],
    workbench: { x: islX + 0.16, y: islY - 0.18, r: 0.09, ready: false },
    lootNodes: [
        { id: 1, x: islX - 0.23, y: islY + 0.16, type: "chest", name: "صندوق الشاطئ الأيسر", wood: 1, taken: false, respawn: 0 },
        { id: 2, x: islX - 0.24, y: islY - 0.02, type: "log",   name: "أخشاب متناثرة يساراً", wood: 1, taken: false, respawn: 0 },
        { id: 3, x: islX + 0.08, y: islY + 0.02, type: "chest", name: "صندوق مخفي في الوسط", wood: 1, taken: false, respawn: 0 },
        { id: 4, x: islX + 0.24, y: islY + 0.13, type: "chest", name: "صندوق حطام السفينة", wood: 1, taken: false, respawn: 0 },
        { id: 5, x: islX + 0.20, y: islY + 0.18, type: "log",   name: "أخشاب السفينة المحطمة", wood: 1, taken: false, respawn: 0 }
      ],
    discovered: false
  };

  const chipWood = document.getElementById("chipWood");
  if(chipWood) chipWood.style.display = "none";
}

function updateLootIsland(dt){
  if(!lootIsland || !player) return;
  if(player.onBeach) return; // Player is on mainland beach, not loot island

  // 1. Dolphin Guidance: When boat is destroyed, point player to Loot Island
  if(player.boatDestroyed && !lootIsland.discovered){
    const dToIsland = Math.hypot(lootIsland.x - player.x, lootIsland.y - player.y);
    if(dToIsland < 1.4){
      lootIsland.discovered = true;
      toast("🏝️ جزيرة الأخشاب أمامك! اقترب من الشاطئ للنزول وجمع الخشب!");
      floatTxt(lootIsland.x, lootIsland.y - 0.22, "🏝️ جزيرة صناعة القوارب!", "#ffd166");
      burst(lootIsland.x, lootIsland.y, "#ffd166", 20, 1.4);
    }
  }

  // Update wood chip display
  const chipWood = document.getElementById("chipWood");
  const elWoodCount = document.getElementById("woodCount");
  if(chipWood && (player.boatDestroyed || player.onLand || player.wood > 0)){
    chipWood.style.display = "inline-flex";
    if(elWoodCount) elWoodCount.textContent = `${player.wood}`;
  }

  // 2. Island Shore Landing / Dolphin Mounting
  const rx = lootIsland.w * 0.46; // Beach boundary semi-major axis (~0.44)
  const ry = lootIsland.h * 0.45; // Beach boundary semi-minor axis (~0.29)
  const nx = (player.x - lootIsland.x) / rx;
  const ny = (player.y - lootIsland.y) / ry;
  const elDist = Math.hypot(nx, ny);
  
  if(!player.onLand){
    // In water (riding dolphin or boat): Landing when stepping onto island beach
    if(elDist < 0.98){
      player.onLand = true;
      player.onDolphin = false;
      player.walkFrame = 0;
      player.vx = 0;
      player.vy = 0;

      // Position solo dolphin swimming happily just off the shore in water
      soloDolphin.active = true;
      soloDolphin.x = lootIsland.x - rx * 1.15;
      soloDolphin.y = player.y;
      soloDolphin.ang = 0;

      // A1: Activate island_craft stage so compass guides to wood/workbench
      if(typeof bottleQuest !== "undefined" && bottleQuest && bottleQuest.stage === "go_to_island"){
        bottleQuest.stage = "island_craft";
        if(typeof saveCheckpoint === "function") saveCheckpoint("island_craft", "جزيرة النجاة والأخشاب 🏝️");
      }

      sDolphinChirp();
      toast("🚶 نزلت على شاطئ الجزيرة! اجمع ٥ أخشاب لصناعة قارب جديد!");
      floatTxt(player.x, player.y - 0.12, "🏝️ استكشاف الجزيرة والشواطئ!", "#ffd166");
      burst(player.x, player.y, "#ffd166", 16, 1.2);

      if(window.TutorialEngine){
        setTimeout(() => {
          if(window.TutorialEngine) window.TutorialEngine.trigger("gather_wood");
        }, 500);
      }
    }
  } else {
    // Already on land: Boy can walk all over the island interior AND onto the sandy beach!
    // Beach boundary limit (allows walking along the sandy surf/beach edges)
    const maxEl = 1.02;
    if(elDist > maxEl){
      // Reached water edge
      if(player.wood >= player.maxWood || !player.boatDestroyed){
        // Remount dolphin or launch crafted boat
        player.onLand = false;
        player.onDolphin = !!player.boatDestroyed;
        soloDolphin.active = !player.boatDestroyed;
        sDolphinSplash();
        sDolphinChirp();
        toast("🐬 عدت إلى الإبحار!");
        floatTxt(player.x, player.y - 0.12, "🐬 انطلق في البحر!", "#00f2fe");
      } else {
        // Keep on beach sand & shallow surf
        player.x = lootIsland.x + (nx / elDist) * rx * maxEl;
        player.y = lootIsland.y + (ny / elDist) * ry * maxEl;
        player.vx = 0;
        player.vy = 0;
        if(Math.floor(gt * 2) % 2 === 0){
          toast("🪵 اجمع ٥ أخشاب واصنع قاربك أولاً قبل الإبحار!");
        }
      }
    }

    // 3. Loot Nodes Interaction
    for(const node of lootIsland.lootNodes){
      if(!node.taken){
        const ndist = Math.hypot(player.x - node.x, player.y - node.y);
        if(ndist < 0.085){
          node.taken = true;
          player.wood = Math.min(player.maxWood, player.wood + node.wood);
          score += 25;
          sWoodLoot();
          burst(node.x, node.y, "#ffd166", 14, 1.1);
          burst(node.x, node.y, "#7ae0ff", 8, 0.9);
          floatTxt(node.x, node.y - 0.08, `🪵 +${node.wood} خشب! (${player.wood}/5)`, "#ffd166");
          toast(`🪵 جمعت خشب من ${node.name}! (${player.wood} / 5)`);
          updateHUD(true);

          if(player.wood >= player.maxWood){
            toast("🔨 اكتمل جمع الخشب! اذهب إلى وسط الجزيرة لصناعة القارب الجديد!");
            floatTxt(lootIsland.workbench.x, lootIsland.workbench.y - 0.12, "🔨 اصنع القارب هنا!", "#00f2fe");
            burst(lootIsland.workbench.x, lootIsland.workbench.y, "#00f2fe", 20, 1.4);

            if(window.TutorialEngine){
              setTimeout(() => {
                if(window.TutorialEngine) window.TutorialEngine.trigger("craft_boat");
              }, 400);
            }
          }
        }
      }
    }

    // 4. Workbench Boat Crafting Interaction
    if(player.wood >= player.maxWood && player.boatDestroyed){
      const wbDist = Math.hypot(player.x - lootIsland.workbench.x, player.y - lootIsland.workbench.y);
      if(wbDist < 0.11){
        // Craft New Boat!
        player.boatDestroyed = false;
        player.wood = 0;
        player.onLand = false;
        player.onDolphin = false;
        player.isKicking = false;
        player.inv = 3.0;
        hearts = 5;

        // Place new boat on the east shore ready to sail
        player.x = lootIsland.x + lootIsland.w * 0.56; // outside beach ring so we don't re-land
        player.y = lootIsland.y;
        player.ang = 0;
        player.vx = 0.12;
        player.vy = 0;

        // Solo dolphin accompanies the new boat!
        soloDolphin.active = true;
        soloDolphin.x = player.x - 0.28;
        soloDolphin.y = player.y + 0.15;

        if(typeof bottleQuest !== "undefined" && bottleQuest){
          if (currentLevel === 2) {
             bottleQuest.stage = "level_2_done";
             if(typeof saveCheckpoint === "function") saveCheckpoint("island_craft", "القارب الجديد! 🛶");
             setTimeout(() => {
                 if(typeof doWin === "function") doWin();
             }, 2000);
          } else {
             bottleQuest.stage = "final_voyage";
             if(typeof saveCheckpoint === "function") saveCheckpoint("final_voyage", "قارب جديد وانطلاق نحو القارورة ⛵");
          }
        }
        sCraftBoat();
        sSplash();
        burst(player.x, player.y, "#ffd166", 30, 2.0);
        burst(player.x, player.y, "#00f2fe", 24, 1.6);
        toast("⛵ تم صناعة قاربك الجديد بنجاح! اتبع بوصلة القارورة لاستعادتها من الأعماق!");
        floatTxt(player.x, player.y - 0.14, "🍼 اتبع بوصلة القارورة الآن!", "#00f2fe");

        const chipWood = document.getElementById("chipWood");
        if(chipWood) chipWood.style.display = "none";
        updateActionBtnUI();
        updateHUD(true);
      }
    }
  }
}

function drawLootIsland(){
  if(!lootIsland) return;
  const o = lootIsland;

  ctx.save();
  ctx.translate(o.x, o.y);

  // Draw high-resolution Loot Island image

  if(lootIslandImg && lootIslandImg.complete && lootIslandImg.naturalWidth > 0){
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(lootIslandImg, -o.w / 2, -o.h / 2, o.w, o.h);
  } else {
    // Beautiful vector fallback
    ctx.fillStyle = "#e5c583";
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w * 0.45, o.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d7a46";
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w * 0.35, o.h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Loot Nodes on the Island (clean ground markers)
  for(const node of o.lootNodes){
    const nx = node.x - o.x;
    const ny = node.y - o.y;

    if(!node.taken){
      // Glowing aura around unlooted wood
      const glow = Math.sin(gt * 4 + node.id) * 0.003;
      ctx.save();
      ctx.fillStyle = "rgba(255, 209, 102, 0.45)";
      ctx.beginPath();
      ctx.arc(nx, ny, 0.026 + glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Small stump mark
      ctx.save();
      ctx.fillStyle = "rgba(80, 50, 20, 0.4)";
      ctx.beginPath();
      ctx.ellipse(nx, ny, 0.012, 0.007, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw Workbench in the center (clean ground marker)
  const wx = o.workbench.x - o.x;
  const wy = o.workbench.y - o.y;
  ctx.save();
  const wbGlow = Math.sin(gt * 3.5) * 0.004;
  ctx.fillStyle = (player && player.wood >= player.maxWood && player.boatDestroyed) ? "rgba(0, 242, 254, 0.55)" : "rgba(255, 209, 102, 0.35)";
  ctx.beginPath();
  ctx.arc(wx, wy, 0.036 + wbGlow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawKidWalking(){
  if(!player || kidWalkFrames.length === 0) return;
  const idx = Math.floor(player.walkFrame || 0) % kidWalkFrames.length;
  const img = kidWalkFrames[idx];

  const drawH = 0.065;
  const drawW = drawH * (240 / 390);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.ang + Math.PI / 2);

  // Soft realistic foot shadow directly beneath feet
  ctx.fillStyle = "rgba(40, 20, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, drawH * 0.12, drawW * 0.42, drawH * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();

  if(img && img.complete && img.naturalWidth > 0){
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();
}

