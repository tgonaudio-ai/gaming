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
    else if ((e.code === 'Space' || e.code === 'Enter') && cardAdvance) cardAdvance();
    else if (MAP[e.code]) g.press(MAP[e.code]);
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
  const toMenu = () => { ['pause', 'ending', 'choice', 'reward', 'cards', 'transition'].forEach(i => show(i, false)); $('endVideo').pause(); $('menuVideo').play().catch(() => {}); show('hud', false); show('chapterCard', false); g.status = 'menu'; refreshMenu(); show('menu'); };
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
  // Comic-panel intro (assets/story) inside the story frame.
  function runStory(panels, done) {
    let i = 0; const box = $('storyFrame'), dots = $('cardDots');
    dots.innerHTML = panels.map(() => '<i></i>').join('');
    const next = () => {
      if (i >= panels.length) { cardAdvance = null; done(); return; }
      const pn = panels[i], src = 'assets/story/' + pn.img + '.webp', im = $('cardImg');
      im.style.animation = 'none'; void im.offsetWidth; im.style.animation = ''; im.src = src;
      $('cardsBg').style.backgroundImage = `url(${src})`; $('cardTitle').textContent = pn.title; $('cardText').textContent = pn.text;
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i)); i++;
      G.audio.play('click');
    };
    cardAdvance = next; box.onclick = next; next();
  }
  function playTransition(done) {
    const v = $('trVideo'); show('transition'); v.muted = G.audio.muted; v.currentTime = 0;
    let fin = false;
    const end = () => { if (fin) return; fin = true; v.pause(); v.onended = null; show('transition', false); done(); };
    v.onended = end; $('btnTrSkip').onclick = end;
    const pr = v.play(); if (pr && pr.catch) pr.catch(end);
  }
  function startGame(level) {
    G.audio.init(); show('menu', false); $('menuVideo').pause();
    g.abilities = new Set(); g.memories = new Set(G.save.load().memories || []);
    const go = () => { show('cards', false); show('transition', false); cardAdvance = null; g.startLevel(level); };
    if (level === 0) {
      show('cards');
      const toVideo = () => { show('cards', false); cardAdvance = null; playTransition(go); };
      $('btnSkip').onclick = toVideo;
      runStory(G.story.intro, toVideo);
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
    const e = G.story.endings[kind]; endArt = e.art; show('ending'); show('endBtns', false); show('endHint'); $('endVideo').play().catch(() => {});
    $('endTitle').textContent = e.title; $('endBadge').textContent = e.badge;
    const lines = e.lines.slice();
    runCards(lines, 'ending', 'endText', () => { show('endHint', false); show('endBtns'); });
  }

  let endArt = null;
  const ecv = $('endCv'), ectx = ecv.getContext('2d');
  function drawEndArt(t) {
    if ($('ending').classList.contains('hidden')) return;
    ectx.clearRect(0, 0, ecv.width, ecv.height); const sp = G.sprites;
    if (endArt === 'jump') { sp.draw(ectx, 'dolRideJump', Math.floor(t * 30) % sp.n('dolRideJump'), ecv.width / 2, ecv.height / 2 + 10, 0, 1.3); }
    else { ectx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 1.5); sp.drawImg(ectx, 'bottle', ecv.width / 2, ecv.height / 2, 200, -0.5); ectx.globalAlpha = 1; }
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    readInput();
    g.update(dt); G.render(); G.hud.update(); drawEndArt(now / 1000);
    requestAnimationFrame(frame);
  }
  refreshMenu();
  requestAnimationFrame(frame);
  G.sprites.load(p => { $('loadFill').style.width = Math.round(p * 100) + '%'; $('loadTxt').textContent = 'جارٍ التحميل… ' + Math.round(p * 100) + '%'; }).then(() => {
    show('loading', false); show('menu'); $('menuVideo').play().catch(() => {});
  });
  window.__dbg = { G };
})();
