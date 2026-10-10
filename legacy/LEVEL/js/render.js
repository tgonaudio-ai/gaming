/* === RENDER.JS: Scene Rendering Pipeline, Screen UI Layer & Shading === */
"use strict";

/* ---------- drawing ---------- */
function rr(x,y,w,h,r){
  r=Math.max(0,Math.min(r,Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function star(x,y,r,rot){
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const rr2=i%2?r*.45:r;
    const a=rot+i*Math.PI/5;
    const px=x+Math.cos(a)*rr2,py=y+Math.sin(a)*rr2;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

function drawPalm(x,y,s,seed){
  ctx.save();
  ctx.translate(x,y);

  const sway=Math.sin(gt*1.2+seed)*.1;
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+seed+sway;
    ctx.save();
    ctx.rotate(a);
    const grd=ctx.createLinearGradient(0,0,s,0);
    grd.addColorStop(0,"#1f7a3d");
    grd.addColorStop(1,"#67d97e");
    ctx.fillStyle=grd;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(s*.5,-s*.22,s,0);
    ctx.quadraticCurveTo(s*.5,s*.22,0,0);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle="#7a4a21";
  ctx.beginPath();ctx.arc(0,0,s*.17,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#5b3617";
  ctx.beginPath();ctx.arc(s*.08,-s*.05,s*.06,0,Math.PI*2);ctx.fill();

  ctx.restore();
}



function drawScreenLayer(){
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const Hc=innerHeight;

  /* speech bubbles */
  ctx.font='700 15px system-ui, sans-serif';
  ctx.textAlign="center";

  for(const b of bubbles){
    if(!b || typeof b.txt !== "string" || !b.txt.trim()) continue;

    const sx=(b.x-cam.x)*Hc*zoom;
    const sy=(b.y-cam.y)*Hc*zoom-34-b.t*14;
    const a=b.t<1.2?1:1-(b.t-1.2)/.3;

    ctx.save();ctx.globalAlpha=Math.max(0,a);
    const w=ctx.measureText(b.txt).width+20;

    ctx.fillStyle="rgba(255,255,255,.94)";
    rr(sx-w/2,sy-16,w,26,13);ctx.fill();

    ctx.beginPath();ctx.moveTo(sx-5,sy+10);ctx.lineTo(sx+5,sy+10);ctx.lineTo(sx,sy+18);ctx.closePath();ctx.fill();
    ctx.fillStyle="#333";ctx.fillText(b.txt,sx,sy+2);

    ctx.restore();
  }

  for(const p of parts){
    if(p.type!=="txt")continue;

    const u=p.t/p.life;
    const sx=(p.x-cam.x)*Hc*zoom;
    const sy=(p.y-cam.y)*Hc*zoom-u*40;

    ctx.save();ctx.globalAlpha=1-u;
    ctx.font='900 20px system-ui, sans-serif';ctx.textAlign="center";
    ctx.lineWidth=4;ctx.strokeStyle="rgba(0,30,40,.6)";
    ctx.strokeText(p.txt,sx,sy);
    ctx.fillStyle=p.col;ctx.fillText(p.txt,sx,sy);
    ctx.restore();
  }

  // Screen-space Loot Island icons and workbench UI
  if(lootIsland){
    for(const node of lootIsland.lootNodes){
      if(node.taken) continue;
      const sx = (node.x - cam.x) * Hc * zoom;
      const sy = (node.y - cam.y) * Hc * zoom;
      if(sx < -40 || sx > innerWidth + 40 || sy < -40 || sy > innerHeight + 40) continue;

      ctx.save();
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.type === "chest" ? "📦" : (node.type === "tree" ? "🌴" : "🪵"), sx, sy);
      ctx.restore();
    }

    const wb = lootIsland.workbench;
    const wsx = (wb.x - cam.x) * Hc * zoom;
    const wsy = (wb.y - cam.y) * Hc * zoom;
    if(wsx >= -40 && wsx <= innerWidth + 40 && wsy >= -40 && wsy <= innerHeight + 40){
      ctx.save();
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔨", wsx, wsy);

      if(player && player.wood >= player.maxWood && player.boatDestroyed){
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0b253a";
        ctx.lineWidth = 3.5;
        ctx.strokeText("اصنع القارب هنا! ⛵", wsx, wsy - 24);
        ctx.fillText("اصنع القارب هنا! ⛵", wsx, wsy - 24);
      }
      ctx.restore();
    }
  }
}


function drawFloatingBottle(bx, by, isMirage, alpha = 1.0){
  if(alpha <= 0.01) return;

  const bob = Math.sin(gt * 3.2 + bx * 4.0) * 0.010;
  const rot = Math.sin(gt * 2.0 + bx) * 0.14 - 0.20;
  const aspect = (bottleImg && bottleImg.naturalWidth) ? (bottleImg.naturalHeight / bottleImg.naturalWidth) : (952 / 1369);
  // Natural baby bottle size relative to boat and ocean scale
  const w = 0.052;
  const h = w * aspect;

  ctx.save();
  ctx.translate(bx, by + bob);
  ctx.rotate(rot);
  ctx.globalAlpha = Math.min(1.0, Math.max(0.0, alpha));

  // Soft luminous water aura beneath the bottle
  const auraR = w * 0.65 + Math.sin(gt * 4.5) * 0.008;
  const grd = ctx.createRadialGradient(0, 0, w * 0.1, 0, 0, auraR);
  grd.addColorStop(0, isMirage ? "rgba(0, 242, 254, 0.40)" : "rgba(255, 209, 102, 0.50)");
  grd.addColorStop(0.55, isMirage ? "rgba(0, 242, 254, 0.12)" : "rgba(255, 209, 102, 0.15)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // (The ellipse ring has been completely removed as requested)

  // Draw bottle image (high-resolution Glossy Baby Bottle)
  if(bottleLoaded && bottleImg && bottleImg.naturalWidth){
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bottleImg, -w * 0.5, -h * 0.5, w, h);
  } else {
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
  }

  // Delicate micro-glint on bottle rim (clean, small, natural water glimmer)
  const sparkA = Math.sin(gt * 5.0 + bx * 3.0) * 0.5 + 0.5;
  if(sparkA > 0.45){
    ctx.save();
    ctx.globalAlpha = (sparkA - 0.45) * 1.8 * alpha;
    ctx.fillStyle = "#ffffff";
    const gx = w * 0.18, gy = -h * 0.28;
    ctx.beginPath();
    ctx.arc(gx, gy, 0.0035, 0, Math.PI * 2);
    ctx.fill();
    // Tiny cross sparkle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 0.0015;
    ctx.beginPath();
    ctx.moveTo(gx - 0.006, gy); ctx.lineTo(gx + 0.006, gy);
    ctx.moveTo(gx, gy - 0.006); ctx.lineTo(gx, gy + 0.006);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBottleQuestWorld(){
  if(typeof bottleQuest === "undefined" || !bottleQuest) return;

  // Draw Mirage if in mirage stage or fading
  if(bottleQuest.mirageAlpha > 0.01 && bottleQuest.stage !== "bottle_found"){
    drawFloatingBottle(bottleQuest.mirageX, bottleQuest.mirageY, true, bottleQuest.mirageAlpha);
  }

  // Draw Real Bottle if in final voyage or found
  if(bottleQuest.stage === "final_voyage" || bottleQuest.stage === "bottle_found"){
    drawFloatingBottle(bottleQuest.realBottleX, bottleQuest.realBottleY, false, 1.0);
  }
}

function drawNauticalWaypointGuide(){
  if(typeof bottleQuest === "undefined" || !bottleQuest || !player) return;
  if(player.isRescuing || bottleQuest.waypointAlpha <= 0.01) return;
  const a = bottleQuest.waypointAlpha;
  const ang = bottleQuest.compassAngle;
  const r = 0.13;
  const pulse = 1 + Math.sin(gt * 6) * 0.06;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Arc around the boat
  ctx.beginPath();
  ctx.arc(0, 0, r, ang - 0.6, ang + 0.6);
  ctx.lineWidth = 0.006;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0, 242, 254, " + (0.75 * a) + ")";
  ctx.shadowColor = "rgba(0, 242, 254, " + (0.8 * a) + ")";
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Arrow head on the arc
  ctx.rotate(ang);
  ctx.translate(r + 0.012, 0);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.moveTo(0.026, 0);
  ctx.lineTo(-0.012, 0.018);
  ctx.lineTo(-0.004, 0);
  ctx.lineTo(-0.012, -0.018);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 242, 254, " + (0.95 * a) + ")";
  ctx.fill();

  // Target icon just beyond the arrow
  ctx.translate(0.05, 0);
  ctx.rotate(-ang);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = a;
  ctx.scale(0.0022, 0.0022);
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bottleQuest.targetIcon || "🍼", 0, 0);
  ctx.restore();
}

function render(tSh){
  resizeCheck();

  // Smooth zoom easing
  zoom += (targetZoom - zoom) * 0.14;

  if(webglOK && gl && prog){
    const w=cv.width,h=cv.height;
    gl.viewport(0,0,w,h);
    gl.useProgram(prog);
    gl.uniform2f(uR,w,h);
    gl.uniform1f(uT,tSh);
    gl.uniform1f(uA,aspect());
    gl.uniform1f(uZoom,zoom);
    gl.uniform2f(uCam,cam.x,cam.y);
    gl.uniform1fv(uF,layerFlags);
    gl.uniform3fv(uRp,ripples);

    const cfg = LEVEL_CONFIGS[currentLevel - 1] || LEVEL_CONFIGS[0];
    if(uWaterDeep && cfg.seaTheme) gl.uniform3fv(uWaterDeep, cfg.seaTheme.waterDeep);
    if(uWaterShallow && cfg.seaTheme) gl.uniform3fv(uWaterShallow, cfg.seaTheme.waterShallow);
    if(uSkyReflect && cfg.seaTheme) gl.uniform3fv(uSkyReflect, cfg.seaTheme.skyReflection);

    // Pass nearby islands to WebGL for natural beach wave wash & foam
    const islData = new Float32Array(18); // 6 * 3 (x, y, r)
    let islCount = 0;
    // Check WIN island
    if (Math.abs(WIN.x - (cam.x + aspect()*0.5/zoom)) < 2.0/zoom) {
      islData[0] = WIN.x;
      islData[1] = WIN.y;
      islData[2] = WIN.r * 1.05;
      islCount++;
    }
    // Include Loot Island in WebGL shore waves
    if (lootIsland && islCount < 6 && Math.abs(lootIsland.x - (cam.x + aspect()*0.5/zoom)) < 2.5/zoom) {
      islData[islCount * 3] = lootIsland.x;
      islData[islCount * 3 + 1] = lootIsland.y;
      islData[islCount * 3 + 2] = lootIsland.r * 1.1;
      islCount++;
    }

    // Check nearest procedural islands
    for (let i = 0; i < islands.length && islCount < 6; i++) {
      const o = islands[i];
      if (Math.abs(o.x - (cam.x + aspect()*0.5/zoom)) < 2.0/zoom) {
        islData[islCount * 3] = o.x;
        islData[islCount * 3 + 1] = o.y;
        islData[islCount * 3 + 2] = o.r * 1.05;
        islCount++;
      }
    }
    gl.uniform3fv(uIsl, islData);

    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }

  /* clear transparent overlay correctly in pixel coordinates before any 2D canvas drawing */
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,gcv.width,gcv.height);

  if(!webglOK || !gl){
    draw2DSea(tSh);
  }

  const Hc=innerHeight;
  const shX=(Math.random()-.5)*shake*.02;
  const shY=(Math.random()-.5)*shake*.02;

  ctx.setTransform(
    Hc*dpr*zoom,0,0,Hc*dpr*zoom,
    (-cam.x+shX)*Hc*dpr*zoom,
    (-cam.y+shY)*Hc*dpr*zoom
  );

  /* wake removed per user request */
  wake = [];

  drawWinIsland();
  drawLootIsland();
  for(const o of islands)drawIsland(o);
  for(const cr of crates)drawCrate(cr);
  drawBottleQuestWorld();
  drawSoloDolphin();
  for(const e of enemies)drawEnemyShip(e);
  drawPlayerShip();
  drawNauticalWaypointGuide();
  drawPartsWorld();
  drawScreenLayer();
  drawLiveMiniMap();
}

/* === LIVE AAA DYNAMIC MINI-MAP RADAR === */
function drawLiveMiniMap(){
  const canvas = document.getElementById("miniMapCanvas");
  if(!canvas || !player) return;
  const mctx = canvas.getContext("2d");
  if(!mctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = w / 2 - 2;

  mctx.clearRect(0, 0, w, h);

  // Clip to circular mini-map
  mctx.save();
  mctx.beginPath();
  mctx.arc(cx, cy, radius, 0, Math.PI * 2);
  mctx.clip();

  // 1. Water Background with deep/shallow radial gradient
  const seaGrd = mctx.createRadialGradient(cx * 0.4, cy * 0.4, 10, cx, cy, radius);
  seaGrd.addColorStop(0, "#0a567a");
  seaGrd.addColorStop(0.5, "#063048");
  seaGrd.addColorStop(1, "#031722");
  mctx.fillStyle = seaGrd;
  mctx.fillRect(0, 0, w, h);

  // Concentric range rings
  mctx.strokeStyle = "rgba(97, 239, 255, 0.15)";
  mctx.lineWidth = 1;
  mctx.beginPath();
  mctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
  mctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
  mctx.stroke();

  // Radar sweep line
  const sweepAng = gt * 1.6;
  mctx.save();
  mctx.translate(cx, cy);
  mctx.rotate(sweepAng);
  const sweepGrd = mctx.createLinearGradient(0, 0, radius, 0);
  sweepGrd.addColorStop(0, "rgba(97, 239, 255, 0.28)");
  sweepGrd.addColorStop(1, "transparent");
  mctx.fillStyle = sweepGrd;
  mctx.beginPath();
  mctx.moveTo(0, 0);
  mctx.arc(0, 0, radius, -0.28, 0);
  mctx.closePath();
  mctx.fill();
  mctx.restore();

  // World to MiniMap coordinate mapping
  const destX = (typeof bottleQuest !== 'undefined' && bottleQuest && bottleQuest.targetX) ? bottleQuest.targetX : WIN.x;
  const destY = (typeof bottleQuest !== 'undefined' && bottleQuest && bottleQuest.targetY) ? bottleQuest.targetY : WIN.y;

  // View span in world units
  const viewRangeX = 2.4; 
  const viewRangeY = 1.6;
  const focusX = player.x + 0.35;
  const focusY = 0.5;

  function toMapX(wx){
    return cx + ((wx - focusX) / viewRangeX) * radius * 1.75;
  }
  function toMapY(wy){
    return cy + ((wy - focusY) / viewRangeY) * radius * 1.75;
  }

  // 2. Draw Mainland Coastline / Beach
  mctx.fillStyle = "#cca872";
  mctx.beginPath();
  const topBeachX = toMapX(shoreAt(0.0));
  mctx.moveTo(0, 0);
  mctx.lineTo(topBeachX, 0);
  for(let y = 0; y <= 1.0; y += 0.05){
    const mx = toMapX(shoreAt(y));
    const my = toMapY(y);
    mctx.lineTo(mx, my);
  }
  mctx.lineTo(0, h);
  mctx.closePath();
  mctx.fill();

  mctx.strokeStyle = "#4de0c0";
  mctx.lineWidth = 1.5;
  mctx.stroke();

  // 3. Draw Islands
  if(islands && islands.length){
    for(const isl of islands){
      const ix = toMapX(isl.x);
      const iy = toMapY(isl.y);
      const ir = (isl.r / viewRangeX) * radius * 1.75;
      if(ix > -20 && ix < w + 20 && iy > -20 && iy < h + 20){
        mctx.fillStyle = "#8a7e52";
        mctx.beginPath();
        mctx.arc(ix, iy, Math.max(3, ir), 0, Math.PI * 2);
        mctx.fill();
        mctx.fillStyle = "#2d7a46";
        mctx.beginPath();
        mctx.arc(ix, iy, Math.max(2, ir * 0.7), 0, Math.PI * 2);
        mctx.fill();
      }
    }
  }

  // Draw Loot Island
  if(lootIsland){
    const lx = toMapX(lootIsland.x);
    const ly = toMapY(lootIsland.y);
    const lr = ((lootIsland.w * 0.5) / viewRangeX) * radius * 1.75;
    mctx.fillStyle = "#9c8e5c";
    mctx.beginPath();
    mctx.arc(lx, ly, Math.max(4, lr), 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = "#1e7a3b";
    mctx.beginPath();
    mctx.arc(lx, ly, Math.max(2.5, lr * 0.65), 0, Math.PI * 2);
    mctx.fill();
  }

  // 4. Draw Dotted Navigation Route to Target
  const px = toMapX(player.x);
  const py = toMapY(player.y);
  const tx = toMapX(destX);
  const ty = toMapY(destY);

  mctx.strokeStyle = "#61efff";
  mctx.lineWidth = 2;
  mctx.setLineDash([4, 4]);
  mctx.lineDashOffset = -gt * 12;
  mctx.beginPath();
  mctx.moveTo(px, py);
  mctx.lineTo(tx, ty);
  mctx.stroke();
  mctx.setLineDash([]);

  // 5. Draw Destination Target (Pulsing Gold)
  const pulseR = 5 + Math.sin(gt * 4) * 1.5;
  mctx.strokeStyle = "#ffd24a";
  mctx.lineWidth = 2;
  mctx.fillStyle = "rgba(255, 210, 74, 0.35)";
  mctx.beginPath();
  mctx.arc(tx, ty, pulseR, 0, Math.PI * 2);
  mctx.fill();
  mctx.stroke();

  mctx.fillStyle = "#ffd24a";
  mctx.beginPath();
  mctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
  mctx.fill();

  // 6. Draw Enemies (Sharks as Red Radar Blips)
  if(enemies && enemies.length){
    for(const e of enemies){
      if(!e || e.state === "dead") continue;
      const ex = toMapX(e.x);
      const ey = toMapY(e.y);
      if(ex > 0 && ex < w && ey > 0 && ey < h){
        mctx.fillStyle = "#ff4444";
        mctx.shadowColor = "#ff2222";
        mctx.shadowBlur = 6;
        mctx.beginPath();
        mctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        mctx.fill();
        mctx.shadowBlur = 0;
      }
    }
  }

  // 7. Draw Solo Dolphin (Cyan Radar Blip)
  if(soloDolphin && soloDolphin.active){
    const dx = toMapX(soloDolphin.x);
    const dy = toMapY(soloDolphin.y);
    mctx.fillStyle = "#00f2fe";
    mctx.shadowColor = "#00f2fe";
    mctx.shadowBlur = 5;
    mctx.beginPath();
    mctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
    mctx.fill();
    mctx.shadowBlur = 0;
  }

  // 8. Draw Player Boat (Crisp White Arrowhead with Heading)
  mctx.save();
  mctx.translate(px, py);
  mctx.rotate(player.ang);
  mctx.fillStyle = "#ffffff";
  mctx.shadowColor = "#00f2fe";
  mctx.shadowBlur = 8;
  mctx.beginPath();
  mctx.moveTo(9, 0);
  mctx.lineTo(-6, -5);
  mctx.lineTo(-3, 0);
  mctx.lineTo(-6, 5);
  mctx.closePath();
  mctx.fill();
  mctx.shadowBlur = 0;
  mctx.restore();

  mctx.restore(); // Restore clip
}


