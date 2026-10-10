'use strict';
// DOM HUD: vitals, objectives, ability bar with cooldown rings, minimap, subtitles, threat indicator.
(() => {
  const g = G.game, $ = id => document.getElementById(id), ui = G.ui;
  const ORDER = ['dash', 'lantern', 'whistle', 'dive', 'harmony'];
  const mini = $('mini'), mctx = mini.getContext('2d');
  let subTimer, lastCourage = 100;

  // ability slots
  const slots = {};
  ORDER.forEach(k => {
    const a = G.story.abilities[k], el = document.createElement('div');
    el.className = 'slot locked'; el.title = `${a.name} — ${a.hint}`;
    el.innerHTML = `<span>${a.icon}</span><div class="cd"></div><kbd>${a.key}</kbd>`;
    $('abilities').appendChild(el); slots[k] = el;
    el.addEventListener('pointerdown', () => { if (k === 'dash' || k === 'lantern' || k === 'whistle') g.press(k); });
  });

  ui.onLevelStart = (lv, li) => {
    $('chapName').textContent = lv.name; $('chapSub').textContent = lv.sub;
    $('ccName').textContent = lv.name; $('ccSub').textContent = lv.sub;
    const cc = $('chapterCard'); cc.classList.remove('hidden'); cc.style.animation = 'none'; void cc.offsetWidth; cc.style.animation = '';
    clearTimeout(ui.ccT); ui.ccT = setTimeout(() => cc.classList.add('hidden'), 3400);
    $('hud').classList.remove('hidden'); $('breathRow').style.display = g.has('dive') ? 'flex' : 'none';
    $('memCount').textContent = g.memories.size; $('subtitle').classList.remove('show'); $('toasts').innerHTML = '';
    Object.keys(slots).forEach(k => { slots[k].classList.toggle('locked', !g.has(k)); });
  };
  ui.onSpeak = s => {
    const el = $('subtitle'), who = s.who === 'nour' ? 'نور' : s.who === 'whisper' ? 'همسة الموج' : '';
    el.className = 'show ' + s.who; $('subWho').textContent = who; $('subText').textContent = s.text;
  };
  ui.onSpeakEnd = () => $('subtitle').classList.remove('show');
  ui.onToast = (t, kind) => { const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = t; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2700); };
  ui.onReward = (key) => {
    const a = G.story.abilities[key];
    if (!a) { g.nextLevel(); return; }
    $('rwIcon').textContent = a.icon; $('rwName').textContent = a.name; $('rwHint').textContent = a.unlock + ' ' + a.hint; $('rwKey').textContent = a.key;
    setTimeout(() => $('reward').classList.remove('hidden'), 900);
  };
  ui.onChoice = () => $('choice').classList.remove('hidden');

  // guidance target: bottle if visible, else the next puzzle element
  G.hudTarget = () => {
    if (!g.lv || g.status !== 'play') return null;
    if (g.bottle.veil < 0.5 && !g.carry) return g.bottle;
    if (g.carry) return g.lv.altar;
    const pz = g.lv.puzzle;
    if (!pz || g.solved) return null;
    if (pz.type === 'push') { const s = g.shells.find(q => !q.placed); if (s) return s; return g.plates.find(q => !q.on); }
    if (pz.type === 'runes') return g.runes.find(r => !r.lit);
    if (pz.type === 'bells') return g.bells.find(b => b.id === pz.seq[g.bellIdx]);
    return null;
  };

  function objectives() {
    const lv = g.lv, last = lv.bottle.length - 1, out = [];
    const nearGate = g.bottleIdx >= last;
    out.push([`اتبع اللمعة (${Math.min(g.bottleIdx, last)}/${last})`, nearGate || g.completed || g.carry]);
    const pz = lv.puzzle;
    if (pz) {
      let n = 0, tot = 1;
      if (pz.type === 'push') { n = g.plates.filter(p => p.on).length; tot = g.plates.length; }
      else if (pz.type === 'runes') { n = g.runes.filter(r => r.lit).length; tot = g.runes.length; }
      else if (pz.type === 'bells') { n = g.bellIdx; tot = pz.seq.length; }
      out.push([`${lv.obj.puzzle} (${g.solved ? tot : n}/${tot})`, g.solved]);
    }
    if (lv.altar) {
      out.push(['هدّئ الحارس (E)', g.sharks.every(s => s.state === 'ally')]);
      out.push(['ضع القارورة في المذبح (E)', false]);
    } else out.push([lv.obj.exit, g.completed]);
    return out;
  }
  let objKey = '';
  function drawMini() {
    const lv = g.lv, [W, H] = lv.size, w = mini.width, h = mini.height, k = Math.min(w / W, h / H), ox = (w - W * k) / 2, oy = (h - H * k) / 2;
    mctx.clearRect(0, 0, w, h); mctx.fillStyle = 'rgba(10,40,70,.8)'; mctx.fillRect(ox, oy, W * k, H * k);
    const X = x => ox + x * k, Y = y => oy + y * k, dot = (x, y, r, c) => { mctx.fillStyle = c; mctx.beginPath(); mctx.arc(X(x), Y(y), r, 0, 6.283); mctx.fill(); };
    lv.islands.forEach(i => dot(i.x, i.y, Math.max(3, i.r * k), 'rgba(232,212,155,.8)'));
    lv.rocks.forEach(r => dot(r.x, r.y, Math.max(1.5, r.r * k), 'rgba(110,130,150,.7)'));
    (lv.currents || []).forEach(c => { mctx.fillStyle = 'rgba(160,220,255,.25)'; mctx.fillRect(X(c.x), Y(c.y), c.w * k, c.h * k); });
    (lv.vortices || []).forEach(v => dot(v.x, v.y, v.r * k * 0.5, 'rgba(160,140,255,.5)'));
    g.gates.forEach(gt => { mctx.fillStyle = g.gateClosed(gt) ? '#ffd36a' : 'rgba(255,255,255,.2)'; mctx.fillRect(X(gt.x) - 1, Y(gt.y), 3, gt.h * k); });
    if (lv.altar) dot(lv.altar.x, lv.altar.y, 5, '#aee');
    const t = G.hudTarget(); if (t) { dot(t.x, t.y, 4, '#ffd36a'); }
    g.sharks.forEach(s => { if (s.state === 'chase' || G.dist(s, g.p) < 700) dot(s.x, s.y, 3.5, s.state === 'ally' ? '#7ee8d8' : '#ff5a7a'); });
    // view rectangle
    const hw = G.view.w / g.cam.zoom / 2, hh = G.view.h / g.cam.zoom / 2;
    mctx.strokeStyle = 'rgba(255,255,255,.35)'; mctx.strokeRect(X(g.cam.x - hw), Y(g.cam.y - hh), hw * 2 * k, hh * 2 * k);
    dot(g.p.x, g.p.y, 3.5, '#fff');
  }

  G.hud = {
    update() {
      if (!g.lv || !g.p || $('hud').classList.contains('hidden')) return;
      const p = g.p, cf = $('courageFill'), cp = Math.max(0, p.courage);
      cf.style.width = cp + '%'; cf.parentElement.classList.toggle('low', cp < 35);
      $('breathFill').style.width = p.breath + '%'; $('breathRow').style.display = g.has('dive') ? 'flex' : 'none';
      $('noiseTag').classList.toggle('on', g.noise > 25);
      $('memCount').textContent = g.memories.size;
      if (cp < lastCourage - 1) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }); }
      lastCourage = cp;
      // abilities
      ORDER.forEach(k => {
        const el = slots[k], has = g.has(k); el.classList.toggle('locked', !has);
        let active = (k === 'lantern' && p.lantern) || (k === 'dive' && p.diving) || (k === 'harmony' && G.hold.harmony && has), cd = 0;
        if (k === 'dash') cd = p.dashCd / 1.1; if (k === 'whistle') cd = p.whistleCd / 4.5;
        el.classList.toggle('active', !!active); el.querySelector('.cd').style.setProperty('--p', Math.min(100, cd * 100) + '%');
      });
      // threat
      $('vignette').style.opacity = g.threat > 0.5 ? 0.35 + 0.35 * Math.sin(g.time * 6) ** 2 : g.threat * 0.5;
      const ta = $('threatArrow'), s = g.chasing;
      if (s) {
        const dx = s.x - g.cam.x, dy = s.y - g.cam.y, sx = G.view.w / 2 + dx * g.cam.zoom, sy = G.view.h / 2 + dy * g.cam.zoom;
        if (sx < 0 || sx > G.view.w || sy < 0 || sy > G.view.h) {
          const a = Math.atan2(dy, dx), cx = G.clamp(G.view.w / 2 + Math.cos(a) * 9999, 30, G.view.w - 30), cy = G.clamp(G.view.h / 2 + Math.sin(a) * 9999, 30, G.view.h - 30);
          ta.style.display = 'block'; ta.style.left = cx - 14 + 'px'; ta.style.top = cy - 13 + 'px'; ta.style.transform = `rotate(${a + Math.PI / 2}rad)`;
        } else ta.style.display = 'none';
      } else ta.style.display = 'none';
      // contextual prompt
      const pr = $('prompt');
      if (g.lv.altar && g.carry && G.dist(p, g.lv.altar) < g.lv.altar.r + 70) { pr.style.display = 'block'; pr.innerHTML = '<kbd>E</kbd> ضع القارورة'; }
      else if (g.sharks.some(q => q.state !== 'ally' && q.guardian && G.dist(q, p) < 340) && g.has('harmony')) { pr.style.display = 'block'; pr.innerHTML = 'اثبت <kbd>E</kbd> للتناغم'; }
      else pr.style.display = 'none';
      const o = objectives(), key = JSON.stringify(o);
      if (key !== objKey) { objKey = key; $('objList').innerHTML = o.map(([t, d]) => `<li class="${d ? 'done' : ''}">${t}</li>`).join(''); }
      drawMini();
    }
  };
})();
