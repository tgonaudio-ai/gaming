'use strict';
// Sprite sheets (frame sequences) and still images from assets/. Anchors/scales were measured from the source frames.
G.sprites = (() => {
  const DEF = {
    kid: ['KID_WALK', 118, 197, 0.17],
    boat: ['MOVE', 392, 225, 0.3],
    kick: ['KICK', 382, 198, 0.3],
    sharkMove: ['SHARK/MOVE', 307, 244, 0.45],
    sharkAtk: ['SHARK/ATTACK', 306, 220, 0.45],
    sharkDown: ['SHARK/TAKE DAWN', 326, 230, 0.45],
    dolMove: ['DOLPHIN/MOVE', 399, 230, 0.38],
    dolJump: ['DOLPHIN/JUMP', 399, 228, 0.38],
    dolRide: ['DOLPHIN/MOVE_KID', 385, 230, 0.38],
    dolRideJump: ['DOLPHIN/JUMP_KID', 360, 225, 0.38],
    dolSave: ['DOLPHIN/SAVING', 400, 225, 0.4]
  };
  const IMG = {
    i1: 'ISLAND/island_topdown_1.webp', i2: 'ISLAND/island_topdown_2.webp', i3: 'ISLAND/island_topdown_3.webp',
    large: 'ISLAND/island_topdown_large.webp', loot: 'ISLAND/loot_island.webp', bottle: 'props/bottle.webp', boatProp: 'props/boat.webp'
  };
  const sets = {}, imgs = {}, url = p => 'assets/' + encodeURI(p);
  const load = u => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url(u); });
  const S = {
    ready: false,
    async load(onProgress) {
      const jobs = []; let done = 0;
      const track = p => p.then(v => { onProgress && onProgress(++done / jobs.length); return v; });
      for (const k in DEF) {
        const [dir, ax, ay, s] = DEF[k];
        sets[k] = { frames: [], ax, ay, s };
        G.manifest[dir].forEach((f, i) => jobs.push(track(load(dir + '/' + f).then(img => { sets[k].frames[i] = img; }))));
      }
      for (const k in IMG) jobs.push(track(load(IMG[k]).then(img => { imgs[k] = img; })));
      await Promise.all(jobs); S.ready = true;
    },
    n: name => sets[name].frames.length,
    img: k => imgs[k],
    // frame index for a looping animation at `fps`
    loop: (name, t, fps) => Math.floor(t * fps) % sets[name].frames.length,
    // frame index for progress p in [0,1]
    at: (name, p) => Math.min(sets[name].frames.length - 1, Math.max(0, Math.floor(p * sets[name].frames.length))),
    draw(c, name, f, x, y, rot = 0, k = 1, alpha = 1) {
      const st = sets[name], im = st && st.frames[f];
      if (!im) return;
      c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alpha;
      c.drawImage(im, -st.ax * st.s * k, -st.ay * st.s * k, im.width * st.s * k, im.height * st.s * k);
      c.restore();
    },
    drawImg(c, key, x, y, w, rot = 0, alpha = 1) {
      const im = imgs[key]; if (!im) return;
      const h = w * im.height / im.width;
      c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alpha; c.drawImage(im, -w / 2, -h / 2, w, h); c.restore();
    }
  };
  return S;
})();
