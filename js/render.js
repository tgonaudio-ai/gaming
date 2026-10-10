'use strict';
// Canvas renderer (world space). All art is procedural.
(() => {
  const g = G.game, TAU = Math.PI * 2;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
  G.view = { w: innerWidth, h: innerHeight, dpr: 1 };

  G.resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    G.view = { w, h, dpr };
    cv.width = dark.width = Math.round(w * dpr); cv.height = dark.height = Math.round(h * dpr);
  };
  addEventListener('resize', G.resize); G.resize();

  const glow = (c, x, y, r, col, a = 1) => {
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };

  function drawBackground(lv, cam, t, vw, vh) {
    const gr = ctx.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, lv.bg[0]); gr.addColorStop(1, lv.bg[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    const step = 110, z = cam.zoom, x0 = cam.x - vw / z / 2, y0 = cam.y - vh / z / 2;
    ctx.save(); ctx.scale(z, z); ctx.translate(-x0, -y0);
    for (let y = Math.floor(y0 / step) * step; y < y0 + vh / z + step; y += step) {
      ctx.beginPath();
      for (let x = x0 - 20; x < x0 + vw / z + 40; x += 40) { const yy = y + Math.sin(x * 0.01 + t * 0.8 + y * 0.02) * 10; x === x0 - 20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShark(s, ghost) {
    const sp = G.sprites, p = g.p, ally = s.state === 'ally';
    let set = 'sharkMove', f = sp.loop('sharkMove', g.time + s.off, s.state === 'chase' ? 20 : 12);
    if (!ghost && !ally && s.calm > 0) { set = 'sharkDown'; f = sp.at(set, Math.min(1, s.calm) * 0.55); }
    else if (!ghost && s.state === 'chase' && G.dist(s, p) < 210) { set = 'sharkAtk'; f = sp.loop(set, g.time + s.off, 26); }
    if (ally) glow(ctx, s.x, s.y, 120, '126,232,216', 0.35);
    sp.draw(ctx, set, f, s.x, s.y, s.ang, 1, ghost ? 0.3 : 1);
    if (ghost) return;
    ctx.save(); ctx.translate(s.x, s.y); ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif';
    if (s.state === 'chase') { ctx.fillStyle = '#ff5a7a'; ctx.fillText('!', 0, -60); }
    else if (s.state === 'investigate' || s.state === 'lured') { ctx.fillStyle = '#ffd36a'; ctx.fillText('?', 0, -60); }
    if (s.calm > 0 && !ally) { ctx.strokeStyle = 'rgba(160,255,240,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 80, -Math.PI / 2, -Math.PI / 2 + TAU * s.calm); ctx.stroke(); }
    ctx.restore();
  }

  function drawPlayer(p) {
    const sp = G.sprites, speed = Math.hypot(p.vx, p.vy), rot = p.ang + Math.PI / 2;
    ctx.save();
    if (p.invuln > 0 && g.status === 'play' && Math.floor(g.time * 14) % 2) ctx.globalAlpha = 0.45;
    if (p.lantern) glow(ctx, p.x, p.y, 90, '255,235,170', 0.35);
    if (p.diving) {
      ctx.globalAlpha *= 0.92;
      sp.draw(ctx, 'dolRide', sp.loop('dolRide', g.time, 30), p.x, p.y, rot);
    } else if (p.safe) {
      sp.draw(ctx, 'kid', speed > 25 ? Math.floor(p.walk * 3) % sp.n('kid') : 0, p.x, p.y, rot);
    } else if (p.dashT > 0) {
      sp.draw(ctx, 'kick', sp.at('kick', 1 - p.dashT / g.DASH_T), p.x, p.y, rot);
    } else {
      sp.draw(ctx, 'boat', sp.loop('boat', g.time, speed > 25 ? 6 + speed / 12 : 4), p.x, p.y, rot);
    }
    ctx.restore();
  }

  function drawDolphin(d) {
    const sp = G.sprites;
    if (d.jump > 0) sp.draw(ctx, 'dolJump', sp.at('dolJump', 1 - d.jump / (62 / 30)), d.x, d.y, d.ang + Math.PI / 2);
    else sp.draw(ctx, 'dolMove', sp.loop('dolMove', g.time + d.off, 14), d.x, d.y, d.ang + Math.PI / 2);
  }

  function drawBottle(b, t) {
    if (b.veil > 0.95) return;
    ctx.save(); ctx.globalAlpha = 1 - b.veil;
    glow(ctx, b.x, b.y, 110 + Math.sin(t * 3) * 12, '255,225,140', 0.55);
    G.sprites.drawImg(ctx, 'bottle', b.x, b.y, 92, Math.sin(t * 2) * 0.25);
    ctx.restore();
  }

  G.render = function () {
    const { w: vw, h: vh, dpr } = G.view, lv = g.lv;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!lv || !g.p) { ctx.fillStyle = '#0a2a44'; ctx.fillRect(0, 0, vw, vh); return; }
    const cam = g.cam, t = g.time, z = cam.zoom;
    drawBackground(lv, cam, t, vw, vh);
    ctx.save();
    const sx = g.shake ? (Math.random() - 0.5) * g.shake : 0, sy = g.shake ? (Math.random() - 0.5) * g.shake : 0;
    ctx.translate(vw / 2 + sx, vh / 2 + sy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    const [W, H] = lv.size;
    // world edge
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, W, H);
    for (const d of lv.deco) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(d.x + Math.sin(t + d.ph) * 8, d.y + Math.cos(t * 0.7 + d.ph) * 8, d.s, 0, TAU); ctx.fill(); }
    // currents
    for (const c of lv.currents || []) {
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
      ctx.fillStyle = 'rgba(160,220,255,.07)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(200,240,255,.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const dir = Math.sign(c.fx) || 1;
      for (let y = c.y + 30; y < c.y + c.h; y += 60) for (let x = c.x - 60; x < c.x + c.w + 60; x += 90) {
        const xx = x + ((t * 90 * dir) % 90 + 90) % 90; ctx.beginPath(); ctx.moveTo(xx - 12 * dir, y - 10); ctx.lineTo(xx, y); ctx.lineTo(xx - 12 * dir, y + 10); ctx.stroke();
      }
      ctx.restore();
    }
    for (const v of lv.vortices || []) {
      ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(t * 1.4); ctx.strokeStyle = 'rgba(190,200,255,.4)'; ctx.lineWidth = 5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = 20 + a * (v.r / 10) + k * 0; const ang = a + k * TAU / 3; a ? ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r) : ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); } ctx.stroke(); }
      ctx.restore();
      glow(ctx, v.x, v.y, 80, '20,10,60', 0.6);
    }
    // islands
    for (const i of lv.islands) {
      glow(ctx, i.x, i.y, i.r * 1.6, '170,255,235', 0.22);
      G.sprites.drawImg(ctx, i.img, i.x, i.y, i.drawW || i.r * 2.35);
    }
    if (g.boat && g.p.safe) G.sprites.drawImg(ctx, 'boatProp', g.boat.x, g.boat.y, 156, g.boat.ang + Math.PI / 2);
    for (const w of lv.weeds) {
      ctx.fillStyle = 'rgba(40,150,90,.55)'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(100,220,140,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let k = 0; k < 14; k++) { const a = k * 0.45 + w.ph, r = w.r * (0.2 + (k % 4) * 0.2), bx = w.x + Math.cos(a) * r, by = w.y + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(t * 1.5 + k) * 12, by - 18, bx + Math.sin(t * 1.5 + k) * 18, by - 38); ctx.stroke(); }
    }
    for (const r of lv.rocks.concat(lv.movingRocks)) {
      const sh = r.sh || (r.sh = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * TAU, j = 0.86 + (((Math.sin(r.x * 12.9 + r.y * 7.7 + k * 3.1) * 43758.5) % 1) + 1) % 1 * 0.24; return [Math.cos(a) * j, Math.sin(a) * j]; }));
      ctx.save(); ctx.translate(r.x, r.y); ctx.scale(r.r, r.r);
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(0, 0, 1.2 + Math.sin(t * 1.5 + r.x) * 0.03, 0, TAU); ctx.fill();
      const gr = ctx.createRadialGradient(-0.35, -0.35, 0.1, 0, 0, 1.1); gr.addColorStop(0, '#8a97a3'); gr.addColorStop(1, '#2b3642');
      ctx.fillStyle = gr; ctx.beginPath(); sh.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(-0.3, -0.35, 0.3, 0.16, -0.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // puzzle pieces
    for (const pl of g.plates) { ctx.strokeStyle = pl.on ? 'rgba(255,230,150,.9)' : 'rgba(255,230,150,.5)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); if (!pl.on) glow(ctx, pl.x, pl.y, 70, '255,230,150', 0.2 + 0.1 * Math.sin(t * 3)); }
    for (const s of g.shells) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.fillStyle = s.placed ? '#ffe6a8' : '#f4c9b5'; ctx.strokeStyle = '#c98a6b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, s.r, Math.PI, 0); ctx.lineTo(s.r * 0.6, s.r * 0.5); ctx.lineTo(-s.r * 0.6, s.r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, s.r * 0.5); ctx.lineTo(k * s.r * 0.4, -s.r * 0.8); ctx.stroke(); }
      ctx.restore();
    }
    const lenses = lv.puzzle && lv.puzzle.lenses;
    for (const r of g.runes) {
      const a = r.lit ? 1 : 0.35 + r.prog * 0.5;
      if (r.lit) glow(ctx, r.x, r.y, 140, '255,225,140', 0.45);
      ctx.save(); ctx.translate(r.x, r.y); ctx.strokeStyle = `rgba(255,225,140,${a})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, lenses ? 34 : 26, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.stroke();
      if (r.prog > 0 && !r.lit) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + TAU * r.prog); ctx.stroke(); }
      ctx.restore();
    }
    for (const b of g.bells) {
      const k = b.glow; glow(ctx, b.x, b.y, 90, b.bad > 0 ? '255,90,120' : '255,225,140', 0.15 + k * 0.6);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.sin(t * 3 + b.id) * 0.08 * (1 + k * 3)); ctx.fillStyle = k > 0.2 ? '#fff3c4' : '#d9b78f'; ctx.strokeStyle = '#8a6b4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 28, Math.PI, 0); ctx.lineTo(34, 18); ctx.lineTo(-34, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6b4a'; ctx.beginPath(); ctx.arc(0, 22, 6, 0, TAU); ctx.fill(); ctx.restore();
    }
    for (const gt of g.gates) {
      const closed = g.gateClosed(gt), cx = gt.x + gt.w / 2;
      ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * (1 - gt.open);
      const gr = ctx.createLinearGradient(gt.x, 0, gt.x + gt.w, 0); const col = gt.kind === 'timed' ? '150,160,255' : '255,225,140';
      gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},.9)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.fillRect(gt.x - 14, gt.y, gt.w + 28, gt.h);
      ctx.fillStyle = `rgba(${col},.9)`; for (let y = gt.y; y < gt.y + gt.h; y += 34) { ctx.beginPath(); ctx.arc(cx + Math.sin(t * 3 + y) * 4, y + 12, 5, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (gt.kind === 'timed') { const ph = (g.time + gt.phase) % gt.period, f = closed ? (ph - gt.open) / (gt.period - gt.open) : 1 - ph / gt.open; ctx.fillStyle = closed ? 'rgba(255,120,150,.9)' : 'rgba(150,255,200,.9)'; ctx.fillRect(gt.x - 8, gt.y - 20, 60 * f, 8); }
    }
    if (lv.altar) {
      const a = lv.altar; glow(ctx, a.x, a.y, 200, '170,230,255', 0.3 + 0.1 * Math.sin(t * 2));
      G.sprites.drawImg(ctx, 'large', a.x, a.y, 340); ctx.fillStyle = 'rgba(126,164,184,.85)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 0.8, 0, TAU); ctx.fill(); ctx.fillStyle = '#a9d0e0'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 0.65, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 0.35, 0, TAU); ctx.stroke();
    }
    for (const m of g.mem) if (!m.got) { glow(ctx, m.x, m.y, 40, '170,220,255', 0.6); ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.beginPath(); ctx.arc(m.x, m.y + Math.sin(t * 2 + m.x) * 4, 9, 0, TAU); ctx.fill(); }
    if (g.lure) { const L = g.lure, e = L.fly, x = G.lerp(L.sx, L.x, e), y = G.lerp(L.sy, L.y, e) - Math.sin(e * Math.PI) * 50; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); if (e >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(L.x, L.y, 20 + (t * 60) % 60, 0, TAU); ctx.stroke(); } }
    if (g.ghost) drawShark(Object.assign({ wig: t * 3, off: 0, calm: 0, state: 'patrol' }, g.ghost), true);
    drawBottle(g.bottle, t);
    if (g.dolphin && !g.p.diving && g.status !== 'rescue') drawDolphin(g.dolphin);
    for (const s of g.sharks) drawShark(s);
    if (g.status === 'rescue' && !g.rescue.moved) G.sprites.draw(ctx, 'dolSave', G.sprites.at('dolSave', Math.min(0.999, g.rescue.t / 1.5)), g.rescue.x, g.rescue.y, 0, 1.1);
    else drawPlayer(g.p);
    // guidance arrow
    const tg = G.hudTarget && G.hudTarget();
    if (tg) {
      const a = Math.atan2(tg.y - g.p.y, tg.x - g.p.x), d = Math.hypot(tg.x - g.p.x, tg.y - g.p.y);
      if (d > 160) { ctx.save(); ctx.translate(g.p.x + Math.cos(a) * 62, g.p.y + Math.sin(a) * 62); ctx.rotate(a); ctx.fillStyle = 'rgba(255,225,140,.85)'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3, 0); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore(); }
    }
    for (const q of g.parts) { const k = 1 - q.life / q.max; ctx.fillStyle = `rgba(${q.col},${0.7 * k})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.5 + k), 0, TAU); ctx.fill(); }
    ctx.restore();

    // darkness with light holes
    if (lv.dark > 0) {
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, vw, vh);
      dctx.fillStyle = `rgba(2,8,20,${lv.dark})`; dctx.fillRect(0, 0, vw, vh); dctx.globalCompositeOperation = 'destination-out';
      const toS = (x, y) => [(x - cam.x) * z + vw / 2, (y - cam.y) * z + vh / 2];
      const hole = (x, y, r) => { const [a, b] = toS(x, y), rr = r * z, gr = dctx.createRadialGradient(a, b, rr * 0.2, a, b, rr); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = gr; dctx.beginPath(); dctx.arc(a, b, rr, 0, TAU); dctx.fill(); };
      hole(g.p.x, g.p.y, g.p.lantern ? 340 : 150);
      if (!g.bottle.veil || g.bottle.veil < 0.5) hole(g.bottle.x, g.bottle.y, 170);
      g.runes.forEach(r => r.lit && hole(r.x, r.y, 150));
      lv.islands.forEach(i => hole(i.x, i.y, i.r + 60));
      g.sharks.forEach(s => s.state === 'ally' && hole(s.x, s.y, 140));
      if (lv.altar) hole(lv.altar.x, lv.altar.y, 220);
      ctx.drawImage(dark, 0, 0, vw, vh);
    }
    if (g.fade > 0) { ctx.fillStyle = `rgba(0,10,25,${g.fade})`; ctx.fillRect(0, 0, vw, vh); }
  };
})();
