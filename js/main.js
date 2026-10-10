'use strict';
// Input, screens flow and main loop.
(() => {
  const g = G.game, $ = id => document.getElementById(id), show = (id, v = true) => $(id).classList.toggle('hidden', !v);
  G.move = { x: 0, y: 0 }; G.hold = { dive: false, harmony: false };
  const K = G.keys;

  // ---- keyboard ----
  const MAP = { Space: 'dash', KeyF: 'lantern', KeyQ: 'whistle', KeyR: 'listen', KeyE: 'interact' };
  addEventListener('keydown', e => {
    G.audio.init();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    K[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    else if (e.code === 'KeyM') setMute(!G.audio.muted);
    else if (MAP[e.code]) g.press(MAP[e.code]);
    else if ((e.code === 'Space' || e.code === 'Enter') && cardAdvance) cardAdvance();
  });
  addEventListener('keyup', e => { K[e.code] = false; });
  addEventListener('blur', () => { Object.keys(K).forEach(k => K[k] = false); G.hold.dive = G.hold.harmony = false; if (g.status === 'play') togglePause(); });

  // ---- touch ----
  const stick = $('stick'), knob = $('knob');
  let sid = null;
  const stickMove = e => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    G.touchMove = { x: dx, y: dy }; knob.style.transform = `translate(${dx * 35}px,${dy * 35}px)`;
  };
  stick.addEventListener('pointerdown', e => { G.audio.init(); sid = e.pointerId; stick.setPointerCapture(sid); stickMove(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) stickMove(e); });
  const stickEnd = e => { if (e.pointerId === sid) { sid = null; G.touchMove = null; knob.style.transform = ''; } };
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
  document.querySelectorAll('.tbtns button').forEach(b => {
    const t = b.dataset.t, hold = 'hold' in b.dataset;
    b.addEventListener('pointerdown', e => { e.preventDefault(); G.audio.init(); b.classList.add('on'); if (hold) G.hold[t] = true; if (t === 'interact') { G.hold.harmony = true; g.press('interact'); } else if (!hold) g.press(t); });
    const up = () => { b.classList.remove('on'); if (hold) G.hold[t] = false; if (t === 'interact') G.hold.harmony = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  function readInput() {
    let x = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0), y = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
    if (!x && !y && G.touchMove) { x = G.touchMove.x; y = G.touchMove.y; }
    else if (x && y) { x *= 0.7071; y *= 0.7071; }
    G.move.x = x; G.move.y = y;
    G.hold.dive = !!(K.ShiftLeft || K.ShiftRight) || G.hold.dive && !!document.querySelector('.tbtns button[data-t=dive].on');
    G.hold.harmony = !!K.KeyE || (G.hold.harmony && !!document.querySelector('.tbtns button.on[data-t=harmony],.tbtns button.on[data-t=interact]'));
  }

  // ---- sound / pause ----
  function setMute(m) { G.audio.setMute(m); $('btnMute').textContent = m ? '🔇' : '🔊'; $('btnPMute').textContent = 'الصوت: ' + (m ? 'متوقف' : 'يعمل'); }
  let prevStatus = 'play';
  function togglePause() {
    if (g.status === 'paused') { g.status = prevStatus; show('pause', false); }
    else if (g.status === 'play') { prevStatus = 'play'; g.status = 'paused'; show('pause'); }
  }
  $('btnMute').onclick = () => setMute(!G.audio.muted); $('btnPMute').onclick = () => setMute(!G.audio.muted);
  $('btnPause').onclick = togglePause; $('btnResume').onclick = togglePause;
  $('btnRestart').onclick = () => { show('pause', false); g.startLevel(g.li); };
  const toMenu = () => { ['pause', 'ending', 'choice', 'reward', 'cards'].forEach(i => show(i, false)); show('hud', false); show('chapterCard', false); g.status = 'menu'; refreshMenu(); show('menu'); };
  $('btnPMenu').onclick = toMenu; $('btnEndMenu').onclick = toMenu;

  // ---- story cards ----
  let cardAdvance = null;
  function runCards(lines, boxId, textId, done) {
    let i = 0; const txt = $(textId), box = $(boxId);
    const next = () => {
      if (i >= lines.length) { cardAdvance = null; done(); return; }
      txt.textContent = lines[i++]; txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    };
    cardAdvance = next; box.onclick = next; next();
  }
  function startGame(level) {
    G.audio.init(); show('menu', false);
    g.abilities = new Set(); g.memories = new Set(G.save.load().memories || []);
    const go = () => { show('cards', false); cardAdvance = null; g.startLevel(level); };
    if (level === 0) {
      show('cards'); $('btnSkip').onclick = go;
      runCards(G.story.intro, 'cards', 'cardText', go);
    } else go();
  }
  function refreshMenu() { const s = G.save.load(); show('btnContinue', s.level > 0 && !s.done); $('btnNew').textContent = s.level > 0 ? 'رحلة جديدة' : 'ابدأ الرحلة'; }
  $('btnNew').onclick = () => { G.save.clear(); startGame(0); };
  $('btnContinue').onclick = () => startGame(Math.min(G.save.load().level, G.levels.length - 1));
  $('btnRewardNext').onclick = () => { show('reward', false); g.nextLevel(); };
  $('btnGive').onclick = () => { show('choice', false); showEnding('give'); g.finish('give'); };
  $('btnKeep').onclick = () => { show('choice', false); showEnding('keep'); g.finish('keep'); };
  $('btnAgain').onclick = () => { show('ending', false); G.save.clear(); startGame(0); };
  G.ui.onEnding = () => {};
  function showEnding(kind) {
    const e = G.story.endings[kind]; show('ending'); show('endBtns', false); show('endHint');
    $('endTitle').textContent = e.title; $('endBadge').textContent = e.badge;
    const lines = e.lines.slice();
    runCards(lines, 'ending', 'endText', () => { show('endHint', false); show('endBtns'); });
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    readInput();
    g.update(dt); G.render(); G.hud.update();
    requestAnimationFrame(frame);
  }
  refreshMenu();
  requestAnimationFrame(frame);
  window.__dbg = { G };
})();
