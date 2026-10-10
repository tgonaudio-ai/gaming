'use strict';
// Procedural audio: no asset files. Three moods: calm, watch, chase.
G.audio = (() => {
  let ctx, master, amb, beatT = 0, muted = false, mood = 0;
  const init = () => {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      amb = ctx.createGain(); amb.gain.value = 0.35; src.connect(f); f.connect(amb); amb.connect(master); src.start();
      [110, 164.8].forEach((fr, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = fr; g.gain.value = 0.03;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + i * 0.05; lg.gain.value = 0.02;
        lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); lfo.start();
      });
    } catch (e) { ctx = null; }
  };
  const tone = (f, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) => {
    if (!ctx) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const sfx = {
    chime: () => [880, 1318, 1760].forEach((f, i) => tone(f, 0.9, 'sine', 0.12, 0, i * 0.09)),
    dash: () => tone(300, 0.25, 'triangle', 0.12, -200),
    splash: () => tone(180, 0.2, 'sawtooth', 0.04, -100),
    hit: () => { tone(120, 0.4, 'square', 0.15, -80); tone(70, 0.5, 'sine', 0.25); },
    whistle: () => tone(1500, 0.5, 'sine', 0.12, -700),
    bell: (i = 0) => tone([523, 659, 784, 988][i % 4], 1.1, 'sine', 0.18),
    bad: () => tone(160, 0.3, 'sawtooth', 0.1, -60),
    unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, 'triangle', 0.14, 0, i * 0.12)),
    pickup: () => tone(1200, 0.25, 'sine', 0.12, 400),
    harmony: () => [262, 330, 392].forEach(f => tone(f, 2.2, 'sine', 0.1)),
    click: () => tone(700, 0.08, 'square', 0.05)
  };
  return {
    init, sfx, play(n, a) { if (ctx && sfx[n]) sfx[n](a); },
    setMute(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    get muted() { return muted; },
    // mood 0 calm, 1 watched, 2 chased: filter opens and a heartbeat starts
    update(dt, m) {
      if (!ctx) return;
      mood = G.lerp(mood, m, Math.min(1, dt * 2));
      if (m >= 2) { beatT -= dt; if (beatT <= 0) { beatT = 0.55; tone(60, 0.18, 'sine', 0.3); tone(55, 0.2, 'sine', 0.2, 0, 0.14); } }
      amb.gain.value = 0.35 - mood * 0.1;
    }
  };
})();
