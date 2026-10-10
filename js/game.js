'use strict';
// Core simulation: player, sharks, puzzles, progression. Rendering lives in render.js, DOM HUD in hud.js.
(() => {
  const { clamp, lerp, dist, rand, angDiff, segHitsCircle, inRect } = G;
  const PR = 16, SWIM = 190, DASH_SPD = 480, DASH_T = 0.28, DASH_CD = 1.1;

  const g = G.game = {
    status: 'menu', li: 0, time: 0, abilities: new Set(), memories: new Set(), parts: [], say: null, shake: 0, flash: 0, threat: 0, fade: 0
  };

  const abilitiesFor = li => { const s = new Set(); for (let i = 0; i < li; i++) if (G.levels[i].reward) s.add(G.levels[i].reward); return s; };

  g.startLevel = function (li) {
    const lv = G.levels[li];
    Object.assign(g, {
      li, lv, status: 'play', time: 0, bottleIdx: 0, bottleFly: null, carry: false, solved: !lv.puzzle, bellIdx: 0, demo: null, demoCool: 4,
      noise: 0, lure: null, cues: new Set(), parts: [], shake: 0, flash: 0, fade: 1, threat: 0, chasing: null, completed: false, weedSlow: false
    });
    g.abilities = abilitiesFor(li);
    const p = lv.start;
    g.p = { x: p[0], y: p[1], vx: 0, vy: 0, ang: 0, courage: 100, breath: 100, dashCd: 0, dashT: 0, dashDir: [1, 0], invuln: 0, slow: 0, lantern: false, diving: false, noDive: 0, whistleCd: 0, safe: true, walk: 0, calmHold: 0 };
    g.checkpoint = { x: p[0], y: p[1] };
    const pz = lv.puzzle || {};
    g.shells = (pz.shells || []).map(s => ({ x: s[0], y: s[1], vx: 0, vy: 0, r: 28, placed: null }));
    g.plates = (pz.plates || []).map(s => ({ x: s[0], y: s[1], r: 40, on: false }));
    g.runes = (pz.runes || []).map(s => ({ x: s[0], y: s[1], prog: 0, lit: false }));
    g.bells = (pz.bells || []).map((s, i) => ({ x: s[0], y: s[1], id: i, glow: 0, bad: 0, cool: 0, armed: true }));
    g.gates = (lv.gates || []).map(s => Object.assign({ open: 0 }, s));
    g.mem = lv.memories.map((m, i) => Object.assign({ id: li + ':' + i, got: g.memories.has(li + ':' + i) }, m));
    g.sharks = (lv.sharks || []).map(s => ({
      x: s.path[0][0], y: s.path[0][1], ang: 0, state: 'patrol', pi: 1, speed: s.speed, chase: s.chase, hunter: !!s.hunter, guardian: !!s.guardian, path: s.path,
      timer: 0, lost: 0, stun: 0, calm: 0, tx: 0, ty: 0, wig: Math.random() * 6
    }));
    g.ghost = lv.ghostShark ? { x: lv.ghostShark.path[0][0], y: lv.ghostShark.path[0][1], ang: 0, pi: 1, path: lv.ghostShark.path, speed: lv.ghostShark.speed } : null;
    g.bottle = { x: lv.bottle[0][0], y: lv.bottle[0][1], ready: true, veil: 0 };
    g.cam = { x: p[0], y: p[1], zoom: 1 };
    g.token = (g.token || 0) + 1;
    const tok = g.token;
    G.ui.onLevelStart && G.ui.onLevelStart(lv, li);
    lv.intro.forEach((l, i) => setTimeout(() => { if (g.token === tok && g.status === 'play') g.speak(l[0], l[1]); }, 2200 + i * 5200));
  };

  g.speak = (who, text, dur = 5) => { g.say = { who, text, t: dur, id: (g.say ? g.say.id : 0) + 1 }; G.ui.onSpeak && G.ui.onSpeak(g.say); };
  g.toast = (text, kind) => G.ui.onToast && G.ui.onToast(text, kind);
  g.emit = (x, y, n, o = {}) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = rand(o.s0 || 10, o.s1 || 60);
      g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0), life: 0, max: rand(0.6, 1.4) * (o.life || 1), r: rand(o.r0 || 2, o.r1 || 5), col: o.col || '255,255,255' });
    }
  };
  g.has = a => g.abilities.has(a);

  // ---- actions -----------------------------------------------------------------------------------------------
  g.press = function (a) {
    if (g.status !== 'play') return;
    const p = g.p, m = G.move, l = Math.hypot(m.x, m.y);
    const dir = l > 0.1 ? [m.x / l, m.y / l] : [Math.cos(p.ang), Math.sin(p.ang)];
    if (a === 'dash' && g.has('dash') && p.dashCd <= 0 && !p.diving) {
      p.dashDir = dir; p.dashT = DASH_T; p.dashCd = DASH_CD; g.noise = Math.min(100, g.noise + 55);
      G.audio.play('dash'); g.emit(p.x, p.y, 10, { s0: 20, s1: 90 });
    } else if (a === 'lantern' && g.has('lantern')) { p.lantern = !p.lantern; G.audio.play('click'); }
    else if (a === 'whistle' && g.has('whistle') && p.whistleCd <= 0) {
      g.lure = { x: clamp(p.x + dir[0] * 420, 40, g.lv.size[0] - 40), y: clamp(p.y + dir[1] * 420, 40, g.lv.size[1] - 40), sx: p.x, sy: p.y, fly: 0, t: 6 };
      p.whistleCd = 4.5; G.audio.play('whistle');
    } else if (a === 'listen' && g.bells.length && !g.solved) g.demo = { i: 0, t: 0 };
    else if (a === 'interact') g.interact();
  };

  g.interact = function () {
    const lv = g.lv;
    if (lv.altar && g.carry && dist(g.p, lv.altar) < lv.altar.r + 70) {
      if (g.sharks.every(s => s.state === 'ally')) { g.status = 'choice'; G.ui.onChoice && G.ui.onChoice(); }
      else g.toast('الحارس لم يهدأ بعد — اثبت قربه (E)', 'warn');
    }
  };

  // ---- helpers -----------------------------------------------------------------------------------------------
  const rocks = () => g.lv.rocks.concat(g.lv.movingRocks);
  const gateClosed = gt => gt.kind === 'puzzle' ? !g.solved : !(((g.time + gt.phase) % gt.period) < gt.open);
  g.gateClosed = gateClosed;
  const pushOutRect = (o, r, gt) => {
    const nx = clamp(o.x, gt.x, gt.x + gt.w), ny = clamp(o.y, gt.y, gt.y + gt.h);
    let dx = o.x - nx, dy = o.y - ny, d = Math.hypot(dx, dy);
    if (d >= r) return;
    if (d < 0.001) { dx = o.x < gt.x + gt.w / 2 ? -1 : 1; dy = 0; d = 1; }
    o.x += dx / d * (r - d); o.y += dy / d * (r - d);
  };
  const inSafe = o => g.lv.islands.find(i => dist(o, i) < i.r);
  const pushOutCircle = (o, c, rad) => { const d = dist(o, c); if (d < c.r + rad) { const a = Math.atan2(o.y - c.y, o.x - c.x); o.x = c.x + Math.cos(a) * (c.r + rad); o.y = c.y + Math.sin(a) * (c.r + rad); return true; } return false; };

  g.hurt = function (dmg, from, kb = 420) {
    const p = g.p;
    if (p.invuln > 0 || g.status !== 'play') return false;
    p.courage -= dmg; p.invuln = 1.4; g.shake = 14; g.flash = 1; G.audio.play('hit');
    const a = Math.atan2(p.y - from.y, p.x - from.x); p.vx = Math.cos(a) * kb; p.vy = Math.sin(a) * kb; p.dashT = 0;
    g.emit(p.x, p.y, 14, { col: '255,90,120', s1: 140 });
    if (p.courage <= 0) g.respawn();
    return true;
  };
  g.respawn = function () {
    const p = g.p; p.x = g.checkpoint.x; p.y = g.checkpoint.y; p.vx = p.vy = 0; p.courage = 100; p.breath = 100; p.invuln = 2; g.fade = 1;
    g.sharks.forEach(s => { if (s.state !== 'ally') { s.state = 'patrol'; s.lost = 0; s.stun = 0; } });
    g.speak('whisper', 'خُذ نَفَسًا يا نور… الجزيرة آمنة.', 4);
  };

  // ---- update ------------------------------------------------------------------------------------------------
  g.update = function (dt) {
    if (g.status === 'menu' || g.status === 'paused' || !g.p) return;
    g.fade = Math.max(0, g.fade - dt * 1.5);
    if (g.say) { g.say.t -= dt; if (g.say.t <= 0) { g.say = null; G.ui.onSpeakEnd && G.ui.onSpeakEnd(); } }
    g.parts = g.parts.filter(q => { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; return q.life < q.max; });
    g.shake = Math.max(0, g.shake - dt * 30); g.flash = Math.max(0, g.flash - dt * 2.5);
    if (g.status !== 'play') { updCamera(dt); return; }
    g.time += dt; g.noise = Math.max(0, g.noise - 20 * dt);
    g.lv.movingRocks.forEach(r => { r.x = r.ox + Math.sin(g.time * 0.6 + r.ph) * 130; });
    updPlayer(dt);
    updSharks(dt);
    updPuzzle(dt);
    updBottle(dt);
    updWorld();
    updCamera(dt);
    G.audio.update(dt, g.threat > 0.6 ? 2 : g.threat > 0.15 ? 1 : 0);
  };

  function updPlayer(dt) {
    const p = g.p, m = G.move, lv = g.lv, [W, H] = lv.size;
    p.invuln = Math.max(0, p.invuln - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.whistleCd = Math.max(0, p.whistleCd - dt); p.slow = Math.max(0, p.slow - dt); p.noDive = Math.max(0, p.noDive - dt);
    const wantDive = g.has('dive') && G.hold.dive && p.noDive <= 0 && p.breath > 0;
    if (wantDive) {
      if (!p.diving) g.emit(p.x, p.y, 8, { s1: 50, up: 20 });
      p.diving = true; p.breath = Math.max(0, p.breath - 20 * dt);
      if (p.breath <= 0) { p.diving = false; p.noDive = 1.5; g.toast('نفسي نفد!', 'warn'); }
    } else { p.diving = false; p.breath = Math.min(100, p.breath + 32 * dt); }
    const isl = inSafe(p);
    p.safe = !!isl;
    if (isl) { p.courage = Math.min(100, p.courage + 14 * dt); g.checkpoint = { x: isl.x, y: isl.y }; }
    const holding = g.has('harmony') && G.hold.harmony;
    let mul = 1;
    if (holding) mul *= 0.5;
    if (p.slow > 0) mul *= 0.5;
    if (p.diving) mul *= 0.85;
    if (g.weedSlow) mul *= 0.55;
    const l = Math.hypot(m.x, m.y), len = Math.min(1, l);
    const tx = l > 0.05 ? m.x / l * len * SWIM * mul : 0, ty = l > 0.05 ? m.y / l * len * SWIM * mul : 0;
    if (p.dashT > 0) { p.dashT -= dt; p.vx = p.dashDir[0] * DASH_SPD; p.vy = p.dashDir[1] * DASH_SPD; }
    else { const k = Math.min(1, dt * 4.2); p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (l > 0.05 && p.dashT <= 0) p.ang += angDiff(p.ang, Math.atan2(m.y, m.x)) * Math.min(1, dt * 10);
    const sp = Math.hypot(p.vx, p.vy); p.walk += sp * dt * 0.03;
    if (sp > 60 && Math.random() < dt * 8) g.emit(p.x - Math.cos(p.ang) * 14, p.y - Math.sin(p.ang) * 14, 1, { s0: 4, s1: 12, r0: 1.5, r1: 3.5, life: 0.8 });
    g.weedSlow = false;
    if (!p.diving) {
      for (const w of lv.weeds) if (dist(p, w) < w.r * 0.85) g.weedSlow = true;
      for (const c of lv.currents || []) if (inRect(p, c)) { p.x += c.fx * dt; p.y += c.fy * dt; }
      for (const v of lv.vortices || []) {
        const d = dist(p, v);
        if (d < v.r) {
          const f = 1 - d / v.r, a = Math.atan2(v.y - p.y, v.x - p.x);
          p.x += (Math.cos(a) * v.pull + Math.cos(a + 1.57) * v.pull * 0.8) * f * dt;
          p.y += (Math.sin(a) * v.pull + Math.sin(a + 1.57) * v.pull * 0.8) * f * dt;
          if (d < 40 && p.invuln <= 0) { g.hurt(20, v, 0); if (g.p.courage > 0) g.respawn(); }
        }
      }
      for (const j of lv.jelly) {
        const jx = j.x + Math.cos(g.time * j.sp + j.ph) * j.r * 0.5, jy = j.y + Math.sin(g.time * j.sp * 1.3 + j.ph) * j.r * 0.4;
        if (Math.hypot(p.x - jx, p.y - jy) < 34 && p.invuln <= 0) { p.slow = 2; g.hurt(6, { x: jx, y: jy }, 220); }
      }
    }
    for (const r of rocks()) pushOutCircle(p, r, PR);
    for (const gt of g.gates) if (gateClosed(gt)) pushOutRect(p, PR, gt);
    p.x = clamp(p.x, PR, W - PR); p.y = clamp(p.y, PR, H - PR);
    if (!p.diving) for (const s of g.shells) {
      if (s.placed) continue;
      const d = dist(p, s);
      if (d < s.r + PR) { const a = Math.atan2(s.y - p.y, s.x - p.x); s.vx += Math.cos(a) * 2000 * dt; s.vy += Math.sin(a) * 2000 * dt; const o = s.r + PR - d; s.x += Math.cos(a) * o; s.y += Math.sin(a) * o; }
    }
    p.calmHold = holding ? p.calmHold + dt : 0;
  }

  function sharkSees(s, vision) {
    const p = g.p;
    if (p.safe) return false;
    const d = dist(s, p);
    if (p.diving) return d < 70;
    if (d < 100) return true;
    if (d > vision) return false;
    return !rocks().some(r => segHitsCircle(s, p, r));
  }

  function updSharks(dt) {
    const p = g.p, lv = g.lv;
    let threat = 0, chasing = null;
    if (g.lure) { g.lure.fly = Math.min(1, g.lure.fly + dt * 2.2); g.lure.t -= dt; if (g.lure.t <= 0) g.lure = null; }
    if (g.ghost) {
      const gh = g.ghost, t = gh.path[gh.pi], a = Math.atan2(t[1] - gh.y, t[0] - gh.x);
      gh.ang += angDiff(gh.ang, a) * Math.min(1, dt * 2); gh.x += Math.cos(gh.ang) * gh.speed * dt; gh.y += Math.sin(gh.ang) * gh.speed * dt;
      if (Math.hypot(t[0] - gh.x, t[1] - gh.y) < 40) gh.pi = (gh.pi + 1) % gh.path.length;
    }
    const harmonyHeld = g.has('harmony') && G.hold.harmony;
    for (const s of g.sharks) {
      s.wig += dt * (s.state === 'chase' ? 9 : 4);
      s.stun = Math.max(0, s.stun - dt);
      let speed = s.speed, tgt = null;
      const vision = 260 + (p.lantern ? 190 : 0) + g.noise * 2.2;
      if (s.state === 'ally') {
        const a = g.time * 0.5 + 1; tgt = { x: p.x + Math.cos(a) * 170, y: p.y + Math.sin(a) * 170 }; speed = 90;
      } else {
        const sees = s.stun <= 0 && sharkSees(s, vision);
        const lured = g.lure && g.lure.fly >= 1 && dist(s, g.lure) < 800 && dist(s, p) > 110;
        const calming = harmonyHeld && dist(s, p) < 340 && !p.safe;
        if (calming) {
          s.calm += dt / 2.2;
          if (s.calm >= 1) { s.state = 'ally'; G.audio.play('harmony'); g.speak('whisper', 'لقد سمعك… الحارس يهدأ.', 4); g.emit(s.x, s.y, 30, { col: '200,255,255', s1: 120 }); continue; }
        } else s.calm = Math.max(0, s.calm - dt * 0.5);
        if (s.stun > 0) { speed = s.speed * 0.5; tgt = { x: s.x + Math.cos(s.ang + 0.8) * 100, y: s.y + Math.sin(s.ang + 0.8) * 100 }; }
        else if (lured && s.state !== 'chase') { s.state = 'lured'; tgt = g.lure; speed = dist(s, g.lure) < 50 ? 0 : s.speed * 1.5; }
        else if (sees) { if (s.state !== 'chase') { s.state = 'chase'; G.audio.play('bad'); } s.lost = 0; s.tx = p.x; s.ty = p.y; tgt = p; speed = s.chase; }
        else if (s.state === 'chase') { s.lost += dt; tgt = { x: s.tx, y: s.ty }; speed = s.chase * 0.9; if (s.lost > (s.hunter ? 5 : 2.5)) { s.state = 'investigate'; s.timer = 2; } }
        else if (s.state === 'investigate') { tgt = { x: s.tx, y: s.ty }; speed = s.speed * 1.3; if (dist(s, tgt) < 40) { s.timer -= dt; speed = 0; if (s.timer <= 0) s.state = 'patrol'; } }
        else {
          if (s.state === 'lured') s.state = 'patrol';
          const t = s.path[s.pi]; tgt = { x: t[0], y: t[1] };
          if (dist(s, tgt) < 40) s.pi = (s.pi + 1) % s.path.length;
          if (g.noise > 40 && dist(s, p) < 520 && !p.safe && !p.diving) { s.state = 'investigate'; s.tx = p.x; s.ty = p.y; s.timer = 1.5; }
        }
        if (calming) speed *= 0.3;
      }
      if (tgt) {
        const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        s.ang += angDiff(s.ang, a) * Math.min(1, dt * (s.state === 'chase' ? 3.5 : 2.2));
        s.x += Math.cos(s.ang) * speed * dt; s.y += Math.sin(s.ang) * speed * dt;
      }
      for (const i of lv.islands) pushOutCircle(s, i, 20);
      for (const r of rocks()) pushOutCircle(s, r, 24);
      s.x = clamp(s.x, 30, lv.size[0] - 30); s.y = clamp(s.y, 30, lv.size[1] - 30);
      if (s.state !== 'ally' && s.stun <= 0 && !p.safe) {
        const hx = s.x + Math.cos(s.ang) * 50, hy = s.y + Math.sin(s.ang) * 50;
        if (Math.hypot(p.x - hx, p.y - hy) < 34 || dist(p, s) < 36) {
          if (g.hurt(s.hunter ? 30 : 25, s)) { s.stun = 1.8; s.state = 'investigate'; s.tx = p.x; s.ty = p.y; s.timer = 1; }
        }
      }
      if (s.state === 'chase') { if (!chasing || dist(s, p) < dist(chasing, p)) chasing = s; threat = 1; }
      else if (s.state === 'investigate' || s.state === 'lured') threat = Math.max(threat, 0.45);
      else if (s.state !== 'ally' && dist(s, p) < vision * 1.6 && !p.safe) threat = Math.max(threat, 0.2 + 0.2 * (1 - dist(s, p) / (vision * 1.6)));
    }
    g.threat = lerp(g.threat, threat, Math.min(1, dt * 3));
    g.chasing = chasing;
  }

  function updPuzzle(dt) {
    const pz = g.lv.puzzle, p = g.p;
    if (!pz) return;
    if (pz.type === 'push') {
      for (const s of g.shells) {
        if (s.placed) { s.x = lerp(s.x, s.placed.x, Math.min(1, dt * 8)); s.y = lerp(s.y, s.placed.y, Math.min(1, dt * 8)); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= Math.pow(0.04, dt); s.vy *= Math.pow(0.04, dt);
        for (const c of g.lv.currents || []) if (inRect(s, c)) { s.x += c.fx * dt; s.y += c.fy * dt; }
        for (const r of rocks()) if (pushOutCircle(s, r, s.r)) { s.vx *= -0.3; s.vy *= -0.3; }
        for (const i of g.lv.islands) pushOutCircle(s, i, s.r);
        s.x = clamp(s.x, s.r, g.lv.size[0] - s.r); s.y = clamp(s.y, s.r, g.lv.size[1] - s.r);
        for (const pl of g.plates) if (!pl.on && dist(s, pl) < 34) { pl.on = true; s.placed = pl; G.audio.play('pickup'); g.emit(pl.x, pl.y, 14, { col: '255,230,150' }); g.toast('المجرى مسدود ✓'); }
      }
      if (!g.solved && g.plates.every(pl => pl.on)) solve();
    } else if (pz.type === 'runes') {
      for (const r of g.runes) {
        if (r.lit) continue;
        if (p.lantern && dist(p, r) < 210) { r.prog += dt / 1.3; if (Math.random() < dt * 20) g.emit(r.x, r.y, 1, { col: '255,230,150', s1: 30 }); }
        else r.prog = Math.max(0, r.prog - dt * 0.4);
        if (r.prog >= 1) { r.lit = true; const n = g.runes.filter(q => q.lit).length; G.audio.play('bell', n - 1); g.emit(r.x, r.y, 24, { col: '255,230,150', s1: 110 }); g.toast(`${n}/${g.runes.length} ${pz.lenses ? 'عدسات' : 'رموز'} مضاءة`); }
      }
      if (!g.solved && g.runes.every(r => r.lit)) solve();
    } else if (pz.type === 'bells') {
      let cx = 0, cy = 0;
      g.bells.forEach(b => { cx += b.x / g.bells.length; cy += b.y / g.bells.length; b.glow = Math.max(0, b.glow - dt * 1.5); b.bad = Math.max(0, b.bad - dt * 2); b.cool -= dt; });
      if (g.solved) return;
      g.demoCool -= dt;
      if (!g.demo && g.demoCool <= 0 && dist(p, { x: cx, y: cy }) < 750) { g.demo = { i: 0, t: 0 }; g.demoCool = 14; }
      if (g.demo) {
        g.demo.t -= dt;
        if (g.demo.t <= 0) { if (g.demo.i >= pz.seq.length) g.demo = null; else { const b = g.bells[pz.seq[g.demo.i++]]; b.glow = 1; G.audio.play('bell', b.id); g.demo.t = 0.9; } }
      } else for (const b of g.bells) {
        if (dist(p, b) > 80) b.armed = true;
        if (!b.armed || b.cool > 0 || dist(p, b) >= 46) continue;
        b.armed = false; b.cool = 0.8; b.glow = 1; G.audio.play('bell', b.id);
        if (pz.seq[g.bellIdx] === b.id) { g.bellIdx++; if (g.bellIdx >= pz.seq.length) solve(); }
        else { g.bellIdx = 0; b.bad = 1; G.audio.play('bad'); g.toast('ليس بهذا الترتيب — أصغِ مجددًا (R)', 'warn'); g.demo = { i: 0, t: 1.2 }; }
      }
    }
  }
  function solve() {
    g.solved = true; G.audio.play('unlock'); g.shake = 6; g.toast('انفتح الطريق!', 'good');
    g.speak('whisper', 'البوابة تفتّحت… تابع اللمعة.', 4);
  }

  function updBottle(dt) {
    const lv = g.lv, b = g.bottle, p = g.p, last = lv.bottle.length - 1;
    for (const gt of g.gates) gt.open = lerp(gt.open, gateClosed(gt) ? 0 : 1, Math.min(1, dt * 6));
    if (g.carry) { b.x = lerp(b.x, p.x - Math.cos(p.ang) * 24, Math.min(1, dt * 12)); b.y = lerp(b.y, p.y - Math.sin(p.ang) * 24 - 6, Math.min(1, dt * 12)); return; }
    b.veil = lerp(b.veil, g.bottleIdx >= last && !g.solved ? 1 : 0, Math.min(1, dt * 4));
    if (g.bottleFly) {
      const f = g.bottleFly; f.t += dt / 0.9; const e = f.t < 1 ? f.t * f.t * (3 - 2 * f.t) : 1;
      b.x = lerp(f.x0, f.x1, e); b.y = lerp(f.y0, f.y1, e) - Math.sin(e * Math.PI) * 60;
      if (Math.random() < dt * 40) g.emit(b.x, b.y, 1, { col: '255,225,140', s0: 5, s1: 20, life: 1.2 });
      if (f.t >= 1) { g.bottleFly = null; b.ready = true; }
      return;
    }
    const wp = lv.bottle[g.bottleIdx];
    b.x = wp[0] + Math.cos(g.time * 2) * 3; b.y = wp[1] + Math.sin(g.time * 2.4) * 5;
    if (b.veil > 0.5 || !b.ready) return;
    if (dist(p, b) < 54) {
      G.audio.play('chime'); g.emit(b.x, b.y, 22, { col: '255,225,140', s1: 120 }); g.shake = 3;
      if (g.bottleIdx >= last) {
        if (lv.altar) { g.carry = true; g.speak('nour', 'سأحملها إلى المذبح… بحذر.', 4); g.toast('القارورة معك — اذهب إلى المذبح'); }
        else completeLevel();
        return;
      }
      const nx = lv.bottle[g.bottleIdx + 1];
      g.bottleFly = { t: 0, x0: b.x, y0: b.y, x1: nx[0], y1: nx[1] }; g.bottleIdx++; b.ready = false;
    }
  }

  function updWorld() {
    const p = g.p;
    for (const m of g.mem) if (!m.got && dist(p, m) < 50) { m.got = true; g.memories.add(m.id); G.audio.play('pickup'); g.emit(m.x, m.y, 14, { col: '170,220,255' }); g.speak('nour', m.text, 6); persist(); }
    g.lv.cues.forEach((c, i) => { if (!g.cues.has(i) && dist(p, c) < c.r) { g.cues.add(i); g.speak(c.line[0], c.line[1], 5); } });
  }

  function updCamera(dt) {
    const c = g.cam, p = g.p, lv = g.lv, vw = G.view.w, vh = G.view.h;
    const base = clamp(Math.min(vw, vh) / 760, 0.55, 1.5), tz = base * (1 - 0.14 * g.threat);
    c.zoom = lerp(c.zoom, tz, Math.min(1, dt * 2));
    const hw = vw / c.zoom / 2, hh = vh / c.zoom / 2;
    c.x = lerp(c.x, p.x + p.vx * 0.35, Math.min(1, dt * 4)); c.y = lerp(c.y, p.y + p.vy * 0.35, Math.min(1, dt * 4));
    c.x = lv.size[0] <= hw * 2 ? lv.size[0] / 2 : clamp(c.x, hw, lv.size[0] - hw);
    c.y = lv.size[1] <= hh * 2 ? lv.size[1] / 2 : clamp(c.y, hh, lv.size[1] - hh);
  }

  // ---- progression -------------------------------------------------------------------------------------------
  function persist(level) {
    const s = G.save.load();
    G.save.write(Object.assign(s, { level: Math.max(s.level || 0, level || 0), memories: [...g.memories] }));
  }
  function completeLevel() {
    if (g.completed) return;
    g.completed = true; g.status = 'reward'; persist(g.li + 1);
    G.audio.play('unlock');
    G.ui.onReward && G.ui.onReward(g.lv.reward, g.li);
  }
  g.nextLevel = () => { if (g.li + 1 < G.levels.length) g.startLevel(g.li + 1); };
  g.finish = function (choice) {
    g.status = 'ending';
    if (choice === 'give') persist(G.levels.length - 1), G.save.write(Object.assign(G.save.load(), { done: true }));
    G.ui.onEnding && G.ui.onEnding(choice);
  };
})();
