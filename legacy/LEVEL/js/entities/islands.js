/* === ISLANDS.JS: Procedural Islands, Crates Generation & Rendering === */
"use strict";

/* ---------- procedural entities ---------- */
function genAhead(){
  const vw=aspect(),ahead=cam.x+vw+1.7,cy=cam.y+.5;

  while(genIslX<ahead){
    if(genIslX>WIN.x-2.7 && genIslX<WIN.x+1.8){
      genIslX=WIN.x+2;
      continue;
    }
    const candX = genIslX+rand(0,.4);
    const candY = cy+rand(-.85,.85);
    const candR = rand(.09,.16);
    const nearAny = islands.some(o=>Math.hypot(o.x-candX, o.y-candY) < o.r+candR+0.52);
    const nearWin = Math.hypot(WIN.x-candX, WIN.y-candY) < WIN.r+candR+0.65;
    const nearLoot = (typeof lootIsland !== "undefined" && lootIsland) ? Math.hypot(lootIsland.x - candX, lootIsland.y - candY) < lootIsland.r + candR + 0.65 : false;

    if(!nearAny && !nearWin && !nearLoot && Math.random()<.65 && genIslX>PX0+1){
      islands.push({
        x:candX,
        y:candY,
        r:candR,
        imgIdx:Math.floor(Math.random()*islandImgs.length),
        rot:rand(0,Math.PI*2),
        seed:Math.random()*9,
        hitCd:0
      });
    }
    genIslX+=rand(1.25,2.45);
  }

  while(genCrateX<ahead){
    if(Math.random()<.85 && crates.length<10){
      const by=cy+rand(-.65,.65);
      const onIsl=islands.some(o=>Math.hypot(o.x-genCrateX,o.y-by)<o.r+.12);
      const onWin=Math.hypot(WIN.x-genCrateX,WIN.y-by)<WIN.r+.2;
      const onLoot=(typeof lootIsland !== "undefined" && lootIsland) ? Math.hypot(lootIsland.x-genCrateX,lootIsland.y-by)<lootIsland.r+.35 : false;
      if(!onIsl&&!onWin&&!onLoot)crates.push({x:genCrateX,y:by,ph:rand(0,7),rot:rand(-.3,.3)});
    }
    genCrateX+=rand(.85,1.9);
  }
}



function drawIsland(o){
  ctx.save();
  ctx.translate(o.x,o.y);

  if(o.rot)ctx.rotate(o.rot);

  const idx = o.imgIdx !== undefined ? o.imgIdx : 0;
  const img = islandImgs[idx] || islandImgs[0];
  const size = o.r * 2.6;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -size, -size, size * 2, size * 2);
  } else {
    // Graceful vector fallback if image loading
    ctx.fillStyle="rgba(94,234,212,.25)";
    ctx.beginPath();ctx.arc(0,0,o.r*1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#dfb87e";
    ctx.beginPath();ctx.arc(0,0,o.r*.7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawWinIsland(){
  const o=WIN;
  ctx.save();
  ctx.translate(o.x,o.y);

  const size = o.r * 2.8;
  if (islandWinImg && islandWinImg.complete && islandWinImg.naturalWidth > 0) {
    ctx.drawImage(islandWinImg, -size, -size, size * 2, size * 2);
  } else {
    ctx.fillStyle="rgba(94,234,212,.3)";
    ctx.beginPath();ctx.arc(0,0,o.r*1.7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#dfb87e";
    ctx.beginPath();ctx.arc(0,0,o.r*.8,0,Math.PI*2);ctx.fill();
  }

  /* treasure chest on the island */
  ctx.save();
  ctx.translate(o.r*.15, o.r*.1);
  ctx.fillStyle="#8a5a2b";rr(-.045,-.032,.09,.062,.012);ctx.fill();
  ctx.fillStyle="#ffd166";ctx.fillRect(-.045,-.008,.09,.014);
  ctx.fillStyle="#ffea9e";ctx.beginPath();ctx.arc(0,0,.011,0,Math.PI*2);ctx.fill();
  ctx.restore();

  /* flag */
  ctx.save();
  ctx.translate(o.r*.15, o.r*.1 - .04);
  ctx.strokeStyle="#7a4a21";ctx.lineWidth=.008;
  ctx.beginPath();ctx.moveTo(0,.05);ctx.lineTo(0,-.13);ctx.stroke();
  const wv=Math.sin(gt*4)*.015;
  ctx.fillStyle="#ff5e7e";
  ctx.beginPath();
  ctx.moveTo(0,-.13);ctx.lineTo(-.09+wv,-.105);ctx.lineTo(0,-.08);
  ctx.closePath();ctx.fill();
  ctx.restore();

  const bs=(Math.sin(gt*3)+1)/2;
  ctx.save();ctx.globalAlpha=.4+.6*bs;ctx.fillStyle="#fff7c2";
  star(o.r*.15, o.r*.1 + .03, .02+bs*.012, gt*2);ctx.fill();ctx.restore();

  ctx.restore();
}

function drawCrate(cr){
  const bobY=Math.sin(gt*2+cr.ph)*.007;
  ctx.save();ctx.translate(cr.x,cr.y+bobY);

  ctx.fillStyle="rgba(0,30,40,.22)";
  ctx.beginPath();ctx.ellipse(0,.03,.045,.02,0,0,Math.PI*2);ctx.fill();

  ctx.rotate(cr.rot+Math.sin(gt*1.5+cr.ph)*.12);

  const s=.05;
  ctx.fillStyle="#a9743f";rr(-s/2,-s/2,s,s,.008);ctx.fill();
  ctx.strokeStyle="#7c5023";ctx.lineWidth=.005;rr(-s/2,-s/2,s,s,.008);ctx.stroke();

  ctx.strokeStyle="#8f6132";ctx.lineWidth=.004;
  ctx.beginPath();
  ctx.moveTo(-s/2,-s/6);ctx.lineTo(s/2,-s/6);
  ctx.moveTo(-s/2,s/6);ctx.lineTo(s/2,s/6);
  ctx.stroke();

  ctx.strokeStyle="#e8d5a3";ctx.lineWidth=.006;
  ctx.beginPath();
  ctx.moveTo(-s/2,-s/2);ctx.lineTo(s/2,s/2);
  ctx.moveTo(s/2,-s/2);ctx.lineTo(-s/2,s/2);
  ctx.stroke();

  const sp=(Math.sin(gt*4+cr.ph)+1)/2;
  if(sp>.75){
    ctx.fillStyle="rgba(255,255,255,"+((sp-.75)*3)+")";
    star(s*.42,-s*.42,.012,gt*3);ctx.fill();
  }

  ctx.restore();
}


