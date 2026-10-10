'use strict';
// Six chapters. Each grants the ability the next one needs. Rocks/weeds are scattered procedurally around key points.
(() => {
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const L = [];
  const W = 'nour', V = 'whisper';

  L.push({
    name: 'الشاطئ', sub: 'الفصل صفر · البداية', size: [1800, 1200], bg: ['#2f8fb5', '#1d6a94'], dark: 0, start: [160, 600],
    islands: [{ x: 160, y: 600, r: 170, img: 'loot', drawW: 680 }],
    bottle: [[520, 600], [900, 400], [1250, 780]], exit: { x: 1640, y: 600, r: 70 },
    obj: { puzzle: null, exit: 'اتبع اللمعة حتى الأفق' },
    reward: 'dash', scatter: { rocks: 8, weeds: 0, jelly: 0, seed: 11 },
    ghostShark: { path: [[1000, 150], [1700, 250], [1000, 150]], speed: 70 },
    memories: [{ x: 700, y: 900, text: 'ذكرى: ضحكة أمّي حين كانت تملأ القارورة.' }],
    intro: [[W, 'قاربي القديم! سأتبع اللمعة…'], [V, 'اتبع اللمعة… تحرّك بـ WASD أو الأسهم.']],
    cues: [
      { x: 900, y: 400, r: 160, line: [V, 'هل ترى ذلك الظلّ في البعيد؟ ابتعد عنه ولا تتعجّل.'] },
      { x: 1250, y: 780, r: 150, line: [W, 'مجدافٌ قديم على الصخر… سأتعلّم ضربته القوية.'] }
    ]
  });

  L.push({
    name: 'الشعاب الهامسة', sub: 'الفصل الأول', size: [2600, 1600], bg: ['#1f9aa8', '#126e86'], dark: 0, start: [160, 800],
    islands: [{ x: 160, y: 800, r: 120 }, { x: 1150, y: 1330, r: 120 }, { x: 2250, y: 330, r: 120 }],
    bottle: [[560, 760], [1000, 560], [1500, 830], [2400, 800]], exit: { x: 2400, y: 800, r: 70 },
    puzzle: { type: 'push', label: 'سُدّ المجريين بالصدفتين', shells: [[1000, 820], [1040, 960]], plates: [[1330, 450], [1330, 1170]] },
    gates: [{ x: 1980, y: 560, w: 44, h: 480, kind: 'puzzle' }],
    currents: [{ x: 1580, y: 380, w: 280, h: 840, fx: -270, fy: 0 }],
    sharks: [{ path: [[1000, 300], [1900, 300], [1900, 1300], [1000, 1300]], speed: 80, chase: 175 }],
    obj: { puzzle: 'سُدّ المجريين بالصدفتين', exit: 'اعبر التيار بالاندفاع (Space)' },
    reward: 'lantern', scatter: { rocks: 16, weeds: 4, jelly: 0, seed: 21 },
    memories: [{ x: 700, y: 300, text: 'ذكرى: «ما دامت القارورة معك سيعرف البحر طريقك».' }, { x: 2100, y: 1350, text: 'ذكرى: أبي يعلّمني الإبحار.' }],
    intro: [[V, 'أعيدي النور… أعيدي النور…'], [W, 'من هناك؟ صدفتان تسدّان مجرًى؟ لعلّ هذا يُهدّئ الماء.']],
    cues: [
      { x: 600, y: 760, r: 220, line: [W, 'دلفينٌ يرافقني من بعيد… من يكون؟'] },
      { x: 1000, y: 820, r: 200, line: [V, 'ادفع الصدفتين بجسدك نحو الدوائر المضيئة.'] },
      { x: 1500, y: 830, r: 160, line: [W, 'التيار قوي! الاندفاع (Space) قد يُعينني.'] }
    ]
  });

  L.push({
    name: 'جزر الهمس', sub: 'الفصل الثاني', size: [2800, 1800], bg: ['#17537a', '#0b2f4f'], dark: 0.8, start: [160, 900],
    islands: [{ x: 160, y: 900, r: 120 }, { x: 1150, y: 900, r: 100 }, { x: 1950, y: 1300, r: 100 }, { x: 2600, y: 900, r: 100 }],
    bottle: [[500, 850], [900, 600], [1350, 1150], [1850, 700], [2600, 900]], exit: { x: 2600, y: 900, r: 70 },
    puzzle: { type: 'runes', label: 'أنِر الرموز الثلاثة بالفانوس', runes: [[900, 480], [1400, 1330], [1950, 560]] },
    gates: [{ x: 2300, y: 700, w: 44, h: 400, kind: 'puzzle' }],
    sharks: [{ path: [[700, 300], [2000, 300], [2000, 1500], [700, 1500]], speed: 85, chase: 185 }],
    obj: { puzzle: 'أنِر الرموز الثلاثة (F)', exit: 'اعبر البوابة المضيئة' },
    reward: 'whistle', scatter: { rocks: 20, weeds: 4, jelly: 0, seed: 31 },
    movingRocks: 3,
    memories: [{ x: 1500, y: 300, text: 'ذكرى: قطرة نور القمر لا تنتهي إن أُعطيت.' }, { x: 500, y: 1500, text: 'ذكرى: غنّت لي أمي عند المنارة.' }],
    intro: [[V, 'المياه هنا عميقة… الفانوس يريك الطريق، لكنه يراه القرشُ أيضًا.'], [W, 'اضغط F لإشعاله وإطفائه.']],
    cues: [{ x: 1150, y: 900, r: 150, line: [V, 'ما أخذه البحر ليس سرقة… هو نداء استغاثة.'] }]
  });

  L.push({
    name: 'متاهة الأعشاب', sub: 'الفصل الثالث', size: [3000, 1800], bg: ['#1c7a6b', '#0e4a50'], dark: 0.35, start: [160, 900],
    islands: [{ x: 160, y: 900, r: 120 }, { x: 1250, y: 330, r: 100 }, { x: 1800, y: 1450, r: 100 }, { x: 2800, y: 900, r: 110 }],
    bottle: [[520, 900], [1000, 650], [1500, 1000], [2150, 700], [2800, 900]], exit: { x: 2800, y: 900, r: 70 },
    puzzle: { type: 'bells', label: 'رنّ الأجراس بالترتيب', bells: [[1000, 560], [1350, 1250], [1750, 450], [2000, 1150]], seq: [2, 0, 3, 1] },
    gates: [{ x: 2500, y: 700, w: 44, h: 400, kind: 'puzzle' }],
    sharks: [
      { path: [[900, 200], [2200, 200], [2200, 700], [900, 700]], speed: 95, chase: 205 },
      { path: [[900, 1500], [2300, 1500], [2300, 1000], [900, 1000]], speed: 95, chase: 205 }
    ],
    obj: { puzzle: 'رنّ الأجراس الأربعة بالترتيب المسموع', exit: 'اعبر بوابة المدّ' },
    reward: 'dive', scatter: { rocks: 10, weeds: 14, jelly: 5, seed: 41 },
    memories: [{ x: 1300, y: 900, text: 'ذكرى: «لا تخَف من الكبير، اخَف من الجاهل بقلبه».' }, { x: 2300, y: 1550, text: 'ذكرى: رسمٌ قديم — القرش حارسُ المرجان.' }],
    intro: [[V, 'الأجراس تحفظ لحن المدّ. أصغِ جيدًا.'], [W, 'القرش أسرع هنا. سأرمي صدفة (Q) لأُلهيه.']],
    cues: [{ x: 1500, y: 1000, r: 200, line: [W, 'رسمٌ على الصخر: القرش كان حارسًا… لا وحشًا.'] }]
  });

  L.push({
    name: 'خندق العاصفة', sub: 'الفصل الرابع', size: [3200, 1800], bg: ['#171f55', '#080b2a'], dark: 0.55, start: [160, 900],
    islands: [{ x: 160, y: 900, r: 110 }, { x: 900, y: 330, r: 90 }, { x: 1750, y: 1450, r: 90 }, { x: 2600, y: 330, r: 90 }, { x: 3050, y: 900, r: 110 }],
    bottle: [[520, 900], [1000, 700], [1750, 900], [2400, 900], [3050, 900]], exit: { x: 3050, y: 900, r: 70 },
    puzzle: null,
    gates: [
      { x: 1350, y: 560, w: 44, h: 680, kind: 'timed', period: 8, open: 3.5, phase: 0 },
      { x: 2150, y: 560, w: 44, h: 680, kind: 'timed', period: 8, open: 3.5, phase: 4 }
    ],
    vortices: [{ x: 800, y: 1200, r: 240, pull: 220 }, { x: 1750, y: 600, r: 260, pull: 240 }, { x: 2550, y: 1250, r: 260, pull: 240 }],
    currents: [{ x: 500, y: 300, w: 700, h: 200, fx: 190, fy: 0 }, { x: 1500, y: 1250, w: 600, h: 300, fx: -200, fy: 0 }],
    sharks: [{ path: [[900, 500], [1900, 1200], [2700, 500], [1900, 300]], speed: 100, chase: 225, hunter: true }],
    obj: { puzzle: null, exit: 'اعبر بوّابتي المدّ — واركب الدلفين (Shift) في الدوامات' },
    reward: 'harmony', scatter: { rocks: 14, weeds: 3, jelly: 0, seed: 51 },
    memories: [{ x: 1000, y: 1500, text: 'ذكرى: المنارة كانت تنادي السفن كلّ مساء.' }, { x: 2900, y: 400, text: 'ذكرى: القارورة ليست ملكي… هي استعارة.' }],
    intro: [[V, 'هنا تُختبر شجاعتك. صديقك الدلفين يحميك من الدوامات ومن عين الحارس.'], [W, 'أمسك Shift ليحملني الدلفين، وأنتبه لنَفَسه.']],
    cues: [{ x: 1750, y: 900, r: 220, line: [V, 'القرش يتألم. القلب يتألم. أنت وحدك تسمع.'] }]
  });

  L.push({
    name: 'قلب المنارة', sub: 'الفصل الخامس · الخاتمة', size: [2200, 1600], bg: ['#0c3a5a', '#051b33'], dark: 0.5, start: [160, 800],
    islands: [{ x: 160, y: 800, r: 110 }],
    bottle: [[520, 800], [800, 500], [1050, 1000], [1600, 800]], exit: null,
    puzzle: { type: 'runes', label: 'أنِر العدسات الثلاث', runes: [[700, 350], [800, 1250], [1050, 800]], lenses: true },
    gates: [{ x: 1250, y: 560, w: 44, h: 480, kind: 'puzzle' }],
    sharks: [{ path: [[1600, 450], [1950, 800], [1600, 1150], [1350, 800]], speed: 90, chase: 215, guardian: true }],
    altar: { x: 1700, y: 800, r: 80 },
    obj: { puzzle: 'أنِر العدسات الثلاث (F)', exit: 'هدّئ الحارس (E) ثم ضع القارورة في المذبح' },
    reward: null, scatter: { rocks: 8, weeds: 0, jelly: 0, seed: 61 },
    memories: [{ x: 600, y: 1450, text: 'ذكرى: النور لا يُحبس. يُهدى.' }],
    intro: [[V, 'هذا قلب البحر. عدسات المنارة تنتظر ضوءك.'], [W, 'ثم الحارس… سأحاول أن أسمعه.']],
    cues: [{ x: 1450, y: 800, r: 220, line: [V, 'اثبت قربه واستمع بقلبك (E).'] }]
  });

  // Safe islands get art; the exit becomes an island too.
  L.forEach(lv => {
    if (lv.exit && !lv.islands.some(i => Math.hypot(i.x - lv.exit.x, i.y - lv.exit.y) < 60)) lv.islands.push({ x: lv.exit.x, y: lv.exit.y, r: 115 });
    let k = 0;
    lv.islands.forEach(i => { if (!i.img) i.img = lv.exit && Math.hypot(i.x - lv.exit.x, i.y - lv.exit.y) < 60 ? 'large' : ['i1', 'i2', 'i3'][k++ % 3]; });
  });

  // Procedural scatter around key points so that critical routes stay clear.
  L.forEach(lv => {
    const r = rng(lv.scatter.seed), [w, h] = lv.size, keep = [{ x: lv.start[0], y: lv.start[1], r: 200 }];
    lv.bottle.forEach(b => keep.push({ x: b[0], y: b[1], r: 130 }));
    lv.islands.forEach(i => keep.push({ x: i.x, y: i.y, r: i.r + 90 }));
    if (lv.exit) keep.push({ x: lv.exit.x, y: lv.exit.y, r: 150 });
    if (lv.altar) keep.push({ x: lv.altar.x, y: lv.altar.y, r: 220 });
    if (lv.puzzle) {
      (lv.puzzle.shells || []).concat(lv.puzzle.plates || [], lv.puzzle.runes || [], lv.puzzle.bells || []).forEach(p => keep.push({ x: p[0], y: p[1], r: 150 }));
    }
    (lv.gates || []).forEach(g => keep.push({ x: g.x + g.w / 2, y: g.y + g.h / 2, r: g.h / 2 + 120 }));
    (lv.vortices || []).forEach(v => keep.push({ x: v.x, y: v.y, r: v.r }));
    (lv.memories || []).forEach(m => keep.push({ x: m.x, y: m.y, r: 90 }));
    // shark routes stay readable: keep clear around path vertices
    (lv.sharks || []).forEach(s => s.path.forEach(p => keep.push({ x: p[0], y: p[1], r: 110 })));
    const place = (n, rMin, rMax, margin) => {
      const out = []; let tries = 0;
      while (out.length < n && tries++ < 800) {
        const o = { x: 100 + r() * (w - 200), y: 100 + r() * (h - 200), r: rMin + r() * (rMax - rMin) };
        if (keep.every(k => Math.hypot(k.x - o.x, k.y - o.y) > k.r + o.r + margin) && out.every(q => Math.hypot(q.x - o.x, q.y - o.y) > q.r + o.r + 60)) out.push(o);
      }
      return out;
    };
    lv.rocks = place(lv.scatter.rocks, 35, 75, 20);
    lv.weeds = place(lv.scatter.weeds, 90, 170, 10).map(o => Object.assign(o, { ph: r() * 6 }));
    lv.jelly = place(lv.scatter.jelly, 120, 220, 0).map(o => Object.assign(o, { ph: r() * 6, sp: 0.5 + r() * 0.6 }));
    lv.deco = Array.from({ length: 70 }, () => ({ x: r() * w, y: r() * h, s: 2 + r() * 5, ph: r() * 6 }));
    lv.movingRocks = lv.movingRocks ? place(lv.movingRocks, 45, 60, 20).map(o => Object.assign(o, { ox: o.x, oy: o.y, ph: r() * 6 })) : [];
  });
  G.levels = L;
})();
