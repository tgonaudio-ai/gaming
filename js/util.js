'use strict';
const G = window.G = { keys: {}, ui: {} };
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
G.rand = (a, b) => a + Math.random() * (b - a);
G.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
// Does segment p->q cross circle c?
G.segHitsCircle = (p, q, c) => {
  const dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy || 1;
  const t = G.clamp(((c.x - p.x) * dx + (c.y - p.y) * dy) / l2, 0, 1);
  return Math.hypot(p.x + dx * t - c.x, p.y + dy * t - c.y) < c.r;
};
G.inRect = (p, r, pad = 0) => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;
G.save = {
  key: 'milk-bottle-save-v1',
  load() { try { return JSON.parse(localStorage.getItem(this.key)) || { level: 0, abilities: [], memories: [] }; } catch (e) { return { level: 0, abilities: [], memories: [] }; } },
  write(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
};
