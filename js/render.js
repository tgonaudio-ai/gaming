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
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang);
    if (ghost) ctx.globalAlpha = 0.3;
    const ally = s.state === 'ally', w = Math.sin(s.wig) * 14;
    const body = ally ? '#4a8f9e' : (s.hunter ? '#2c2a40' : '#434a5c'), fin = ally ? '#9ee7e0' : '#b03a6e';
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(62, 0);
    ctx.bezierCurveTo(40, -26, -20, -24, -52, w * 0.4 - 4);
    ctx.lineTo(-86, w - 22); ctx.lineTo(-74, w); ctx.lineTo(-86, w + 22); ctx.lineTo(-52, w * 0.4 + 4);
    ctx.bezierCurveTo(-20, 24, 40, 26, 62, 0); ctx.fill();
    ctx.fillStyle = fin;
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(-18, -34); ctx.lineTo(-24, -4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(-18, 34); ctx.lineTo(-24, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(44, -10, 3, 0, TAU); ctx.arc(44, 10, 3, 0, TAU); ctx.fill();
    ctx.restore();
    if (ghost) return;
    ctx.save(); ctx.translate(s.x, s.y); ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif';
    if (s.state === 'chase') { ctx.fillStyle = '#ff5a7a'; ctx.fillText('!', 0, -50); }
    else if (s.state === 'investigate' || s.state === 'lured') { ctx.fillStyle = '#ffd36a'; ctx.fillText('?', 0, -50); }
    if (s.calm > 0 && s.state !== 'ally') { ctx.strokeStyle = 'rgba(160,255,240,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + TAU * s.calm); ctx.stroke(); }
    ctx.restore();
  }

  function drawPlayer(p) {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.lantern) glow(ctx, 0, 0, 90, '255,235,170', 0.35);
    if (p.invuln > 0 && Math.floor(g.time * 14) % 2) ctx.globalAlpha = 0.4;
    if (p.diving) ctx.globalAlpha = 0.45;
    ctx.rotate(p.ang);
    const sw = Math.sin(p.walk * 2) * 5, k = p.diving ? 0.85 : 1;
    ctx.scale(k, k);
    ctx.strokeStyle = '#ff8a5c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-22, sw, -34, -sw * 1.4); ctx.stroke();
    ctx.fillStyle = '#e7f6ff'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath(); ctx.ellipse(-2, -15 + sw * 0.5, 7, 4, 0.4, 0, TAU); ctx.ellipse(-2, 15 - sw * 0.5, 7, 4, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd9b3'; ctx.beginPath(); ctx.arc(7, 0, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.arc(5, 0, 9, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    ctx.restore();
  }

  function drawBottle(b, t) {
    if (b.veil > 0.95) return;
    ctx.save(); ctx.translate(b.x, b.y); ctx.globalAlpha = 1 - b.veil;
    glow(ctx, 0, 0, 110 + Math.sin(t * 3) * 12, '255,225,140', 0.55);
    ctx.rotate(Math.sin(t * 2) * 0.25);
    ctx.fillStyle = '#fff7df'; ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-9, -8, 18, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6fb7ff'; ctx.fillRect(-6, -14, 12, 7); ctx.fillStyle = '#ffd36a'; ctx.fillRect(-4, -18, 8, 5);
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
      glow(ctx, i.x, i.y, i.r * 1.5, '170,255,235', 0.25);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(i.x, i.y, i.r + 10 + Math.sin(t * 1.5) * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d49b'; ctx.beginPath(); ctx.arc(i.x, i.y, i.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d3bc80'; ctx.beginPath(); ctx.arc(i.x - i.r * 0.2, i.y - i.r * 0.15, i.r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3f9a5a'; for (let k = 0; k < 5; k++) { const a = k * 1.26 + i.x; ctx.beginPath(); ctx.ellipse(i.x + Math.cos(a) * 16, i.y + Math.sin(a) * 16, 22, 7, a, 0, TAU); ctx.fill(); }
    }
    for (const w of lv.weeds) {
      ctx.fillStyle = 'rgba(40,150,90,.55)'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(100,220,140,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let k = 0; k < 14; k++) { const a = k * 0.45 + w.ph, r = w.r * (0.2 + (k % 4) * 0.2), bx = w.x + Math.cos(a) * r, by = w.y + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(t * 1.5 + k) * 12, by - 18, bx + Math.sin(t * 1.5 + k) * 18, by - 38); ctx.stroke(); }
    }
    for (const r of lv.rocks.concat(lv.movingRocks)) {
      ctx.fillStyle = '#2f3b4a'; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#44566b'; ctx.beginPath(); ctx.arc(r.x - r.r * 0.2, r.y - r.r * 0.2, r.r * 0.7, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(r.x - r.r * 0.35, r.y - r.r * 0.35, r.r * 0.25, 0, TAU); ctx.fill();
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
      ctx.fillStyle = '#7ea4b8'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#a9d0e0'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 0.65, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 0.35, 0, TAU); ctx.stroke();
    }
    for (const m of g.mem) if (!m.got) { glow(ctx, m.x, m.y, 40, '170,220,255', 0.6); ctx.fillStyle = 'rgba(210,240,255,.9)'; ctx.beginPath(); ctx.arc(m.x, m.y + Math.sin(t * 2 + m.x) * 4, 9, 0, TAU); ctx.fill(); }
    if (g.lure) { const L = g.lure, e = L.fly, x = G.lerp(L.sx, L.x, e), y = G.lerp(L.sy, L.y, e) - Math.sin(e * Math.PI) * 50; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); if (e >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(L.x, L.y, 20 + (t * 60) % 60, 0, TAU); ctx.stroke(); } }
    if (g.ghost) drawShark(Object.assign({ wig: t * 3, state: 'patrol' }, g.ghost), true);
    drawBottle(g.bottle, t);
    for (const s of g.sharks) drawShark(s);
    drawPlayer(g.p);
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
