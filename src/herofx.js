/* ---------- Hero special effects (Syauqie, 2026-11-07; list in the "Hero Special Effects" doc) ----------
   Every hero has one effect, either IN HAND (a small loop on the card while you hold it) or IN PLAY (a burst when
   the card hits the table, and the cards around it react like real cards: they jump, get knocked back, get pulled).
   Purely visual: nothing here changes the game, and it uses Math.random so online games stay in step.
   Cards discarded by an ability crumble to dust (HFX.snap). Settings › Hero effects turns it all off. */
const HFX = (() => {
  const on = () => settings.heroFx !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HAND = new Set(['dva_baby', 'orisa', 'junkerqueen', 'sigma', 'ramattra', 'domina', 'dmon_baby',
    'soldier', 'cassidy', 'hanzo', 'widowmaker', 'sojourn', 'ashe', 'symmetra', 'echo', 'freja', 'anran', 'sierra',
    'mercy', 'brigitte', 'illari', 'zenyatta', 'moira', 'juno', 'mizuki', 'doctrine']);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const D = ms => T(ms);
  let layer = null;
  const L = () => { if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'hfx'; document.body.appendChild(layer); } return layer; };
  const mid = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top }; };
  const live = e => e && e.isConnected;

  // A piece of effect on the overlay, centred on (x, y), removed after `life` ms.
  function put(cls, x, y, life, css = {}, html = '') {
    const d = document.createElement('div'); d.className = 'hx ' + cls; if (html) d.innerHTML = html;
    Object.assign(d.style, { left: x + 'px', top: y + 'px' }, css); L().appendChild(d);
    setTimeout(() => d.remove(), D(life) + 60); return d;
  }
  const go = (el, kf, dur, o = {}) => live(el) && el.animate(kf, { duration: D(dur), delay: D(o.delay || 0), easing: o.ease || 'ease-out', fill: o.fill || 'none', composite: o.add ? 'add' : 'replace' });

  /* ---- the table: cards move like physical cards (added on top of whatever transform they already have) ---- */
  function hop(els, h = 16, delay = 0) {
    els.filter(live).forEach((e, k) => { const r = rnd(-6, 6);
      go(e, [{ transform: 'none' }, { transform: `translateY(${-h}px) rotate(${r}deg)`, offset: .28 }, { transform: `translateY(0) rotate(${-r / 3}deg)`, offset: .55 },
        { transform: `translateY(${-h / 4}px)`, offset: .75 }, { transform: 'none' }], 680, { delay: delay + k * 35, add: true }); });
  }
  function shake(els, a = 4, dur = 400, delay = 0) {
    els.filter(live).forEach(e => go(e, [...Array(7)].map((_, i) => ({ transform: i === 6 || !i ? 'none' : `translate(${rnd(-a, a)}px, ${rnd(-a, a)}px) rotate(${rnd(-a / 3, a / 3)}deg)` })), dur, { delay, add: true, ease: 'linear' }));
  }
  function rock(els, deg = 5, n = 3, delay = 0) {
    els.filter(live).forEach((e, k) => go(e, [{ transform: 'none' }, ...[...Array(n * 2)].map((_, i) => ({ transform: `rotate(${(i % 2 ? -1 : 1) * deg * (1 - i / (n * 2))}deg)` })), { transform: 'none' }], 260 * n, { delay: delay + k * 40, add: true, ease: 'ease-in-out' }));
  }
  const dir = (from, e) => { const a = mid(from), b = mid(e); const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
  // knocked away from `from` (negative d = pulled toward it), landing a little crooked before straightening
  function knock(els, from, d = 24, delay = 0, dur = 720) {
    els.filter(live).forEach((e, k) => { const [x, y] = dir(from, e), r = rnd(4, 10) * (Math.random() < .5 ? -1 : 1) * Math.sign(d);
      go(e, [{ transform: 'none' }, { transform: `translate(${x * d}px, ${y * d}px) rotate(${r}deg)`, offset: .22 }, { transform: `translate(${x * d * .35}px, ${y * d * .35}px) rotate(${r * .6}deg)`, offset: .6 }, { transform: 'none' }], dur, { delay: delay + k * 30, add: true }); });
  }
  function lift(els, h = 20, dur = 900, delay = 0) {
    els.filter(live).forEach((e, k) => go(e, [{ transform: 'none' }, { transform: `translateY(${-h}px) rotate(${rnd(-4, 4)}deg)`, offset: .3 }, { transform: `translateY(${-h}px)`, offset: .65 }, { transform: 'translateY(3px)', offset: .85 }, { transform: 'none' }], dur, { delay: delay + k * 40, add: true }));
  }
  // the played card itself drops onto the table from height h
  function slam(el, h = 60, dur = 480, delay = 0) {
    go(el, [{ transform: `translateY(${-h}px) scale(1.18)`, opacity: .4 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: .6, easing: 'ease-out' }, { transform: 'translateY(1px) scale(.97, 1.02)', offset: .75 }, { transform: 'none' }], dur, { delay, add: true, ease: 'cubic-bezier(.55,0,.9,.4)' });
  }
  function tint(el, filter, dur = 900, delay = 0) { go(el, [{ filter: 'none' }, { filter, offset: .15 }, { filter, offset: .8 }, { filter: 'none' }], dur, { delay }); }

  /* ---- what you see on top ---- */
  function ring(el, color, size = 2.2, dur = 600, delay = 0, cls = '') {
    if (!live(el)) return; const m = mid(el), d = put('ring ' + cls, m.x, m.y, dur + delay, { width: m.w + 'px', height: m.w + 'px', borderColor: color, opacity: 0 });
    go(d, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${size})`, opacity: 0 }], dur, { delay, fill: 'forwards' });
  }
  function flash(el, color, dur = 500, delay = 0) {
    if (!live(el)) return; const m = mid(el), d = put('flash', m.x, m.y, dur + delay, { width: m.w + 'px', height: m.h + 'px', background: `radial-gradient(circle, ${color}, transparent 70%)`, opacity: 0 });
    go(d, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }], dur, { delay, fill: 'forwards' });
  }
  function beam(a, b, color, w = 4, dur = 500, delay = 0, cls = '') {
    if (!live(a) || !live(b)) return; const p = mid(a), q = mid(b), len = Math.hypot(q.x - p.x, q.y - p.y), ang = Math.atan2(q.y - p.y, q.x - p.x);
    const d = put('beam ' + cls, p.x, p.y, dur + delay, { width: len + 'px', height: w + 'px', background: color, color, transform: `rotate(${ang}rad) scaleX(0)`, opacity: 0 });
    go(d, [{ transform: `rotate(${ang}rad) scaleX(0)`, opacity: 1 }, { transform: `rotate(${ang}rad) scaleX(1)`, opacity: 1, offset: .35 }, { transform: `rotate(${ang}rad) scaleX(1)`, opacity: 0 }], dur, { delay, fill: 'forwards' });
  }
  // particles flying out of a card. shape = a class in herofx.css (dot, spark, petal, snow, note, paper, rock, smoke…)
  function burst(el, n, color, o = {}) {
    if (!live(el)) return; const m = mid(el), dist = (o.dist || 1) * m.w, dur = o.dur || 700;
    for (let i = 0; i < n; i++) {
      const a = o.up ? rnd(-Math.PI * .9, -Math.PI * .1) : rnd(0, Math.PI * 2), r = rnd(.35, 1) * dist, s = rnd(.6, 1.3) * (o.size || 8);
      const x0 = m.x + (o.spread ? rnd(-.4, .4) * m.w : 0), y0 = m.y + (o.y || 0) * m.h;
      const d = put('pt ' + (o.shape || 'dot'), x0, y0, dur + (o.delay || 0) + 120, { width: s + 'px', height: s + 'px', background: o.shape === 'note' || o.shape === 'snow' ? 'none' : color, color, opacity: 0 }, o.html || '');
      go(d, [{ transform: `translate(-50%,-50%) rotate(0) scale(.4)`, opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r + (o.fall || 0)}px)) rotate(${rnd(-400, 400)}deg) scale(1)`, opacity: 0 }], dur * rnd(.75, 1.1), { delay: (o.delay || 0) + (o.stagger ? i * o.stagger : 0), fill: 'forwards' });
    }
  }
  // things raining down onto a card from above
  function rain(el, n, color, o = {}) {
    if (!live(el)) return; const m = mid(el), dur = o.dur || 420;
    for (let i = 0; i < n; i++) {
      const x = m.x + rnd(-.45, .45) * m.w, y = m.y + rnd(-.3, .3) * m.h, s = o.size || 6, delay = (o.delay || 0) + i * (o.gap || 70);
      const d = put('pt ' + (o.shape || 'streak'), x, y, dur + delay + 60, { width: s + 'px', height: s * 4 + 'px', background: color, opacity: 0 });
      go(d, [{ transform: `translate(-50%, ${-m.h * 1.4}px) rotate(${o.tilt || 12}deg)`, opacity: 1 }, { transform: `translate(-50%,-50%) rotate(${o.tilt || 12}deg)`, opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], dur, { delay, fill: 'forwards', ease: 'ease-in' });
    }
  }
  // a shape drawn over a card (an SVG or a class from herofx.css)
  function glyph(el, cls, html = '', dur = 800, delay = 0, size = .8, kf) {
    if (!live(el)) return; const m = mid(el), w = m.w * size, d = put('glyph ' + cls, m.x, m.y, dur + delay, { width: w + 'px', height: w + 'px', opacity: 0 }, html);
    go(d, kf || [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.05)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .7 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 0 }], dur, { delay, fill: 'forwards' });
    return d;
  }
  // a small thing travelling from a to b
  function travel(a, b, cls, dur = 450, delay = 0, size = 18, css = {}, html = '') {
    if (!live(a) || !live(b)) return; const p = mid(a), q = mid(b), d = put(cls, p.x, p.y, dur + delay, { width: size + 'px', height: size + 'px', opacity: 0, ...css }, html);
    go(d, [{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${q.x - p.x}px), calc(-50% + ${q.y - p.y}px)) rotate(720deg)`, opacity: 1 }], dur, { delay, fill: 'forwards', ease: 'ease-in' });
  }
  const at = (ms, f) => setTimeout(f, D(ms));
  const SVG = {
    skull: '<svg viewBox="0 0 40 40"><path fill="#e33" d="M20 4C11 4 5 10 5 18c0 5 3 8 5 10v6h20v-6c2-2 5-5 5-10 0-8-6-14-15-14z"/><circle cx="14" cy="19" r="4" fill="#200"/><circle cx="26" cy="19" r="4" fill="#200"/><path fill="#200" d="M18 26h4l-2-4z"/></svg>',
    torii: '<svg viewBox="0 0 40 40"><path fill="#e8413c" d="M3 8h34l-2 4H5zM7 15h26v3H7zM10 12h4v26h-4zM26 12h4v26h-4z"/></svg>',
    reticle: '<svg viewBox="0 0 40 40" fill="none" stroke="#ff3b3b" stroke-width="2.5"><circle cx="20" cy="20" r="13"/><path d="M20 2v10M20 28v10M2 20h10M28 20h10"/></svg>',
    turret: '<svg viewBox="0 0 40 40"><path fill="#ff9a3c" d="M8 32h24l-4-8H12z"/><rect x="13" y="14" width="14" height="10" rx="3" fill="#c9733a"/><rect x="25" y="17" width="12" height="4" fill="#ffcf8a"/></svg>',
    drone: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="8" fill="#5be0a8"/><circle cx="20" cy="20" r="3" fill="#fff"/><path stroke="#5be0a8" stroke-width="3" d="M6 12l8 4M34 12l-8 4M6 28l8-4M34 28l-8-4"/></svg>',
    tire: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#2b2b2b"/><circle cx="20" cy="20" r="8" fill="#ffb02e"/><path stroke="#555" stroke-width="3" d="M20 3v8M20 29v8M3 20h8M29 20h8"/></svg>',
    fox: '<svg viewBox="0 0 40 40"><path fill="#7ad7ff" d="M4 26c6-1 10-6 14-6l4-8 3 7c5 0 9 3 11 7-6-1-9 2-16 2S9 28 4 26z"/></svg>',
  };

  /* ---- In play: one recipe per hero. Each returns how long it runs (ms, before speed). ---- */
  const C = id => (HEROES[id] && HEROES[id].colors[0]) || '#fff';
  const PLAY = {
    reinhardt(el, x) { slam(el, 40); at(220, () => { beam(el, x.foe || el, '#ffb347', 7, 600, 0, 'crack'); ring(el, '#ffb347', 2.4, 650); }); at(300, () => knock(x.foes, el, 20)); at(300, () => hop(x.allies, 8)); return 1000; },
    winston(el, x) { slam(el, 200, 560); at(330, () => { burst(el, 14, '#c9b79c', { shape: 'smoke', dist: .8, y: .4, size: 14 }); ring(el, '#d6c6a8', 2, 500); hop(x.all, 12); });
      at(650, () => x.foe && beam(el, x.foe, '#7fd8ff', 3, 450, 0, 'zap')); return 1150; },
    dva(el, x) { slam(el, 90, 520); burst(el, 16, '#ff9a3c', { shape: 'spark', up: false, y: .45, dist: .7, delay: 150 }); at(320, () => { flash(el, 'rgba(255,120,200,.7)', 500); shake(x.all, 3, 450); }); return 950; },
    doomfist(el, x) {
      const m = mid(el), s = put('shadow', m.x, m.y + m.h * .3, 650, { width: m.w * 1.3 + 'px', height: m.w * .45 + 'px', opacity: 0 });
      go(s, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: .7 }], 450, { fill: 'forwards' });
      go(el, [{ opacity: 0 }, { opacity: 0 }], 400); slam(el, 260, 380, 400);
      at(700, () => { ring(el, '#ffb02e', 2.8, 700); ring(el, '#5a3a1a', 1.8, 500); burst(el, 22, '#b9905b', { shape: 'rock', dist: 1.1, y: .4, size: 9 }); hop(x.all, 26); shake([document.body], 3, 300); });
      return 1500;
    },
    roadhog(el, x) { // the chain flies out at the enemy's cards; the card he hooks is pulled out face up when it's discarded (hook below)
      const src = x.hand; if (!live(src)) { ring(el, '#9ca36a', 1.6); return 600; }
      beam(el, src, '#a7a7a7', 4, 700, 0, 'chain'); at(250, () => shake([src], 3, 300)); return 800;
    },
    zarya(el, x) { glyph(el, 'grav', '', 1100, 0, 1.3); at(150, () => knock(x.foes, el, -34, 0, 1100)); at(150, () => lift(x.foes, 14, 1100)); return 1250; },
    wreckingball(el, x) { go(el, [{ transform: 'translateX(-220px) rotate(-540deg) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], 600, { add: true, ease: 'cubic-bezier(.2,.8,.3,1)' });
      at(420, () => { rock(x.all, 7, 3); ring(el, '#f2b544', 1.8, 450); }); return 1200; },
    mauga(el, x) { const g = glyph(el, 'cage', '', 1300, 0, 2.4, [{ transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .8 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }]);
      at(250, () => { shake(x.all.concat(el), 2.5, 800); (x.foe ? [x.foe] : x.foes).forEach(f => burst(f, 12, '#ffb02e', { shape: 'spark', dist: .5, size: 5, stagger: 50 })); }); return 1300; },
    dmon(el, x) { slam(el, 50); at(200, () => hop(x.all, 10)); at(520, () => { go(el, [{ transform: 'none' }, { transform: 'translateY(-10px)' }, { transform: 'none' }], 260, { add: true }); hop(x.all, 10); }); return 1250; },
    hazard(el, x) { const t = x.foes.length ? x.foes : [el];
      t.forEach((f, k) => { const m = mid(f); for (let i = 0; i < 4; i++) { const d = put('spike', m.x + (i - 1.5) * m.w * .22, m.y + m.h * .45, 900, { width: m.w * .16 + 'px', height: m.h * .5 + 'px' }); go(d, [{ transform: 'translate(-50%,0) scaleY(0)' }, { transform: 'translate(-50%,-100%) scaleY(1)', offset: .3 }, { transform: 'translate(-50%,-100%) scaleY(1)', offset: .7 }, { transform: 'translate(-50%,0) scaleY(0)' }], 900, { delay: k * 80 + i * 40, fill: 'forwards' }); } });
      at(120, () => lift(x.foes, 26, 800)); return 1100; },

    genji(el, x) { const f = x.foe || el, m = mid(f);
      const d = put('slash', m.x, m.y, 600, { width: m.w * 1.6 + 'px', height: '5px', background: '#7dff6b', color: '#7dff6b', opacity: 0 });
      go(d, [{ transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 1, offset: .4 }, { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: 0 }], 600, { fill: 'forwards' });
      burst(f, 12, '#7dff6b', { shape: 'spark', dist: .6, size: 5 });
      if (f !== el) go(f, [{ transform: 'none', clipPath: 'none' }, { transform: 'translate(5px,-5px) skewX(-6deg)', offset: .3 }, { transform: 'translate(-2px,2px)', offset: .6 }, { transform: 'none' }], 650, { add: true, delay: 150 });
      return 900; },
    tracer(el, x) { const m = mid(el); for (let i = 3; i > 0; i--) { const g = put('ghost', m.x - i * 26, m.y, 500, { width: m.w + 'px', height: m.h + 'px', opacity: 0 }); go(g, [{ opacity: .5 - i * .1 }, { opacity: 0 }], 450, { delay: (3 - i) * 70, fill: 'forwards' }); }
      go(el, [{ transform: 'translateX(-80px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 260, { add: true }); at(200, () => { flash(el, 'rgba(90,200,255,.6)', 400); rock(x.all, 4, 2); }); return 900; },
    reaper(el, x) { burst(el, 22, '#2a0a12', { shape: 'petal', dist: 1.2, size: 12 }); burst(el, 10, '#b3122e', { shape: 'petal', dist: 1, size: 9, delay: 100 }); at(80, () => shake(x.all, 4, 600)); return 900; },
    pharah(el, x) { const t = x.foes.length ? x.foes : [el]; t.forEach((f, k) => { rain(f, 5, '#ffcf5a', { delay: k * 120, gap: 90, tilt: 18 }); for (let i = 0; i < 5; i++) at(k * 120 + i * 90 + 380, () => { ring(f, '#ff8a2a', .7, 300); go(f, [{ transform: 'none' }, { transform: `translate(${rnd(-4, 4)}px, 4px)` }, { transform: 'none' }], 160, { add: true }); }); }); return 1300; },
    junkrat(el, x) { const f = x.foe || x.foes[0] || el; travel(el, f, 'hx tirep', 520, 0, mid(el).w * .4, {}, SVG.tire);
      at(520, () => { ring(f, '#ff7a1a', 2.6, 600); flash(f, 'rgba(255,170,40,.9)', 500); burst(f, 20, '#5b5048', { shape: 'smoke', dist: 1.1, size: 18 }); knock(x.all, f, 34, 0, 1100); shake([document.body], 2, 250); });
      return 1500; },
    bob(el, x) { const f = x.foe || x.foes[0]; if (f) { const [dx, dy] = dir(el, f); go(el, [{ transform: 'none' }, { transform: `translate(${dx * 40}px, ${dy * 40}px)`, offset: .35 }, { transform: 'none' }], 520, { add: true }); at(180, () => { knock([f], el, 30); burst(f, 12, '#b9a58a', { shape: 'smoke', dist: .7, size: 12 }); }); } return 900; },
    mei(el, x) { burst(el, 24, '#e8f7ff', { shape: 'snow', dist: 1.4, size: 12, dur: 1100, html: '❄' }); x.foes.forEach(f => tint(f, 'saturate(.3) brightness(1.25) hue-rotate(170deg)', 1300, 100)); at(1250, () => shake(x.foes, 2, 260)); return 1500; },
    bastion(el, x) { const t = x.all.length ? x.all : [el]; for (let i = 0; i < 3; i++) at(i * 320, () => { const f = t[Math.floor(Math.random() * t.length)]; rain(f, 1, '#ffd36b', { size: 7 }); at(400, () => { ring(f, '#ff9a3c', 1.4, 420); burst(f, 8, '#776', { shape: 'smoke', dist: .5, size: 12 }); hop(x.all, 9); }); }); return 1500; },
    torbjorn(el, x) { const m = mid(el); const g = put('glyph', m.x + m.w * .38, m.y - m.h * .35, 1400, { width: m.w * .4 + 'px', height: m.w * .4 + 'px' }, SVG.turret); go(g, [{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1)' }], 900, { fill: 'forwards', ease: 'steps(3)' });
      for (let i = 0; i < 3; i++) at(i * 300, () => { shake(x.all.concat(el), 2, 140); burst(el, 6, '#ffcf6a', { shape: 'spark', dist: .35, size: 4, y: -.35 }); }); return 1200; },
    venture(el, x) { const t = x.foes.length ? x.foes : [el]; t.forEach(f => { burst(f, 16, '#8a6b45', { shape: 'rock', up: true, dist: 1, y: .45, size: 9 }); go(f, [{ transform: 'none' }, { transform: `translateY(-46px) rotate(${rnd(-12, 12)}deg)`, offset: .35 }, { transform: 'translateY(0)', offset: .7 }, { transform: 'translateY(-6px)', offset: .85 }, { transform: 'none' }], 820, { add: true, delay: 100 }); }); return 1000; },
    vendetta(el, x) { flash(el, 'rgba(255,40,60,.7)', 500); const f = x.foe || x.foes[0]; if (f) { at(300, () => { knock([f], el, 14, 0, 300); flash(f, 'rgba(255,60,60,.6)', 300); }); at(560, () => { knock([f], el, 18, 0, 380); flash(f, 'rgba(255,60,60,.7)', 300); }); } return 1000; },
    emre(el, x) { const f = x.foe || x.foes[0]; if (!f) { flash(el, 'rgba(120,220,255,.6)'); return 500; } beam(f, el, 'rgba(110,220,255,.9)', 5, 900, 0, 'zap'); travel(f, el, 'hx orb', 700, 150, 16);
      go(f, [{ transform: 'none' }, { transform: 'scale(.9)', offset: .5 }, { transform: 'none' }], 900, { add: true }); at(850, () => flash(el, 'rgba(120,220,255,.6)', 400)); return 1200; },
    shion(el, x) { const f = x.foe || x.foes[0] || el, m = mid(f);
      for (let i = 0; i < 5; i++) at(i * 90, () => { const a = rnd(-70, 70), d = put('slash', m.x + rnd(-.2, .2) * m.w, m.y + rnd(-.2, .2) * m.h, 300, { width: m.w * 1.2 + 'px', height: '3px', background: '#ff3b55', color: '#ff3b55' }); go(d, [{ transform: `translate(-50%,-50%) rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `translate(-50%,-50%) rotate(${a}deg) scaleX(1)`, opacity: 0 }], 280, { fill: 'forwards' }); if (f !== el) shake([f], 3, 90); });
      return 800; },

    sombra(el, x) { (x.foe ? [x.foe] : x.foes).forEach(f => { f.classList.remove('fx-hack'); void f.offsetWidth; f.classList.add('fx-hack'); setTimeout(() => f.classList.remove('fx-hack'), 900);
      go(f, [...Array(8)].map((_, i) => ({ transform: i === 7 || !i ? 'none' : `translate(${rnd(-8, 8)}px, ${rnd(-3, 3)}px)`, filter: i % 2 ? 'hue-rotate(80deg) saturate(2)' : 'none' })), 700, { add: true, ease: 'steps(1)' }); }); return 850; },
    ana(el, x) { const a = x.allies[0] || el; if (a !== el) beam(el, a, '#9fd3ff', 2, 300, 0, 'dart'); at(260, () => { flash(a, 'rgba(90,170,255,.8)', 600); go(a, [{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.06)', offset: .3 }, { transform: 'translateY(-10px) scale(1.04)', offset: .7 }, { transform: 'none' }], 800, { add: true }); }); return 1100; },
    lucio(el, x) { for (let i = 0; i < 3; i++) at(i * 260, () => { ring(el, '#9be35f', 2.2, 600); hop(x.allies.concat(el), 8); burst(el, 3, '#c8ff8a', { shape: 'note', dist: .9, up: true, size: 16, html: '♪' }); }); return 1200; },
    baptiste(el, x) { const m = mid(el); travel({ getBoundingClientRect: () => ({ left: m.l, top: m.t - 140, width: m.w, height: m.h }), isConnected: true }, el, 'hx glyph', 380, 0, m.w * .35, {}, SVG.drone);
      at(380, () => { const d = glyph(el, 'dome', '', 1200, 0, 2.6); lift(x.allies.concat(el), 8, 1100); }); return 1500; },
    kiriko(el, x) { // she teleports onto the board: a torii gate, then she appears and a fox spirit runs past
      if (!el.dataset.tp) go(el, [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 0, transform: 'scale(.85)', offset: .4 }, { opacity: 1, transform: 'none' }], 650, { add: true });
      glyph(el, 'torii', SVG.torii, 900, 0, .9); burst(el, 10, '#fff4d6', { shape: 'paper', dist: 1, size: 10, delay: 200 });
      at(350, () => { const m = mid(el), f = put('glyph', m.x - m.w * 1.5, m.y + m.h * .2, 700, { width: m.w * .6 + 'px', height: m.w * .6 + 'px' }, SVG.fox); go(f, [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { transform: `translate(calc(-50% + ${m.w * 1.5}px),-50%)`, opacity: 1, offset: .5 }, { transform: `translate(calc(-50% + ${m.w * 3}px),-50%)`, opacity: 0 }], 700, { fill: 'forwards', ease: 'linear' }); lift(x.allies, 10, 700); });
      delete el.dataset.tp; return 1100; },
    lifeweaver(el, x) { const a = x.allies[0]; if (a) { beam(el, a, '#7fdc7a', 4, 700, 0, 'vine'); at(250, () => knock([a], el, -26, 0, 800)); at(600, () => burst(a, 12, '#ffb3d1', { shape: 'petal', dist: .8, size: 9 })); } else burst(el, 14, '#ffb3d1', { shape: 'petal', dist: .9, size: 9 }); return 1100; },
    jetpackcat(el, x) { go(el, [{ transform: 'translate(-90px,-140px) rotate(-14deg)', opacity: .3 }, { transform: 'none', opacity: 1 }], 520, { add: true, ease: 'cubic-bezier(.2,.9,.3,1)' });
      at(480, () => { burst(el, 14, '#cfc4b0', { shape: 'smoke', dist: .8, y: .4, size: 14 }); rock(x.all, 4, 2); }); return 1000; },
    wuyang(el, x) { glyph(el, 'swirl', '', 1000, 0, 1.6); at(150, () => rock(x.all.concat(el), 5, 3)); return 1100; },
  };

  /* ---- In hand: a small loop drawn on the card. CSS in herofx.css (.hl-<id>). ---- */
  const LOOP = {
    dva_baby: '<i class="bunny"><svg viewBox="0 0 20 20"><path fill="#ff7ac6" d="M6 1h3v7H6zM11 1h3v7h-3zM4 8h12v9H4z"/><path fill="#fff" d="M7 11h2v2H7zM11 11h2v2h-2z"/></svg></i>',
    orisa: '<i class="spin"></i>',
    junkerqueen: '<i class="knife"><svg viewBox="0 0 20 20"><path fill="#dfe6ee" d="M10 1l3 11h-6z"/><path fill="#7a3b22" d="M8 12h4v7H8z"/></svg></i>',
    sigma: '<i class="mote"></i><i class="mote b"></i>',
    ramattra: '<i class="nan"></i><i class="nan b"></i><i class="nan c"></i>',
    domina: '<i class="panel"></i><i class="panel r"></i>',
    dmon_baby: '<i class="ready">READY</i>',
    soldier: '<i class="visor">' + SVG.reticle + '</i>',
    cassidy: '<i class="cyl"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#8a7a66"/><g fill="#2a2018"><circle cx="10" cy="4.5" r="2"/><circle cx="10" cy="15.5" r="2"/><circle cx="5.2" cy="7.2" r="2"/><circle cx="14.8" cy="7.2" r="2"/><circle cx="5.2" cy="12.8" r="2"/><circle cx="14.8" cy="12.8" r="2"/></g></svg></i><i class="weed"></i>',
    hanzo: '<svg class="dragon" viewBox="0 0 100 140" preserveAspectRatio="none"><rect x="3" y="3" width="94" height="134" rx="8" fill="none" stroke="#5fd0ff" stroke-width="3" pathLength="100"/></svg>',
    widowmaker: '<i class="glint"></i>',
    sojourn: '<i class="rail"><b></b></i>',
    ashe: '<i class="cock"></i>',
    symmetra: '<i class="tur"></i><i class="tur b"></i><i class="tur c"></i>',
    echo: '<i class="scan"></i>',
    freja: '<i class="gust"></i><i class="gust b"></i><i class="gust c"></i>',
    anran: '<i class="flame"></i>',
    sierra: '<i class="track"></i>',
    mercy: '<i class="halo"></i>',
    brigitte: '<i class="flail"><b></b></i>',
    illari: '<i class="sun"></i>',
    zenyatta: '<i class="orbs"><b></b><b></b><b></b><b></b><b></b><b></b></i>',
    moira: '<i class="wisp"></i><i class="wisp b"></i><i class="wisp c"></i>',
    juno: '<i class="orbit"><b></b></i><i class="orbit b"><b></b></i>',
    mizuki: '<i class="doll"><svg viewBox="0 0 20 30"><path fill="#fff" stroke="#c9c2b3" d="M10 2a3 3 0 110 6 3 3 0 010-6zM4 9h12l-2 6 3 13H3l3-13z"/><path stroke="#e33" stroke-width="1.5" d="M5 18h10"/></svg></i>',
    doctrine: '<i class="book"><b></b></i>',
  };
  // Give every face-up card in your hand its loop (cards elsewhere hide it through CSS).
  function decorate(root = document) {
    root.querySelectorAll('#p-hand .card, #p-reserve .card, #p-hand3 .card').forEach(c => {
      const id = c.dataset.hero; if (!HAND.has(id) || c.querySelector('.hl')) return;
      const host = c.querySelector('.face.front'); if (!host) return; const d = document.createElement('div');
      d.className = 'hl hl-' + id; d.innerHTML = LOOP[id] || ''; host.appendChild(d); c.classList.add('hl-card', 'hlc-' + id);
    });
  }
  new MutationObserver(() => decorate()).observe(document.body, { childList: true, subtree: true });

  /* ---- Discarded by an ability: the card crumbles to dust and blows away (a "snap"). ---- */
  let masks = null;
  function snapMasks(n = 7, w = 50, h = 70) {
    if (masks) return masks;
    const cv = [...Array(n)].map(() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }), cx = cv.map(c => c.getContext('2d'));
    const img = cx.map(x => x.createImageData(w, h));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // pieces on the left blow away first
      const k = Math.min(n - 1, Math.max(0, Math.floor((x / w * .7 + Math.random() * .5) * n * .85))), p = (y * w + x) * 4;
      img[k].data[p + 3] = 255;
    }
    cx.forEach((x, i) => x.putImageData(img[i], 0, 0));
    return (masks = cv.map(c => c.toDataURL()));
  }
  async function snap(el) {
    if (!live(el)) return;
    const r = el.getBoundingClientRect(), ms = snapMasks(), pieces = [];
    try { Sfx.ability && Sfx.ability('weaken'); } catch (e) {}
    ms.forEach((m, i) => {
      const c = el.cloneNode(true); c.classList.remove('reveal-card', 'flying'); c.classList.add('hx-dust');
      Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, transform: 'none', zIndex: 9000, pointerEvents: 'none' });
      c.style.webkitMaskImage = c.style.maskImage = `url(${m})`; c.style.webkitMaskSize = c.style.maskSize = '100% 100%';
      document.body.appendChild(c); pieces.push(c);
      const a = rnd(-.9, -.3), d = rnd(60, 130);
      c.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: `translate(${Math.cos(a) * d + 30}px, ${Math.sin(a) * d}px) rotate(${rnd(-25, 25)}deg)`, opacity: 0, filter: 'blur(3px)' }],
        { duration: D(1100), delay: D(i * 110), easing: 'ease-in', fill: 'forwards' });
    });
    el.style.visibility = 'hidden';
    const m = { getBoundingClientRect: () => r, isConnected: true };
    burst(m, 26, '#8d7e6a', { shape: 'dust', dist: 1.2, size: 4, dur: 1300, spread: true, stagger: 25, up: true });
    await new Promise(res => setTimeout(res, D(110 * ms.length + 1100)));
    pieces.forEach(p => p.remove()); el.remove();
  }

  /* ---- Hooks the game calls ---- */
  // Push: both battle cards were just revealed. Plays each in-play effect; waits until they settle.
  async function reveal(list) {
    if (!on()) return;
    let longest = 0, k = 0;
    for (const [el, id, s] of list) {
      if (HAND.has(id) || !PLAY[id] || !live(el)) continue;
      const o = s === 'p' ? 'e' : 'p', foe = $('#' + o + '-slot .card');
      const foes = [foe, ...$$(`#${o}-reserve .card, #${o}-hand .card`)].filter(Boolean);
      const allies = $$(s === 'p' ? '#p-reserve .card, #p-hand .card, #p-hand3 .card' : '#e-reserve .card, #e-hand .card');
      const ctx = { foe, foes, allies, all: foes.concat(allies), hand: $(`#${o}-hand .card`) || $(`#${o}-reserve .card`) || $('#' + o + '-pile') };
      const delay = k++ * 350;
      await new Promise(r => setTimeout(r, D(delay ? 350 : 0)));
      try { longest = Math.max(longest, PLAY[id](el, ctx) - (delay ? 350 : 0)); } catch (e) { console.warn('hero fx', id, e); }
    }
    if (longest) await new Promise(r => setTimeout(r, D(Math.min(longest, 1600))));
  }
  // Kiriko: from your hand to the table she teleports instead of sliding.
  async function move(el, dest, o) {
    if (!on() || el.dataset.hero !== 'kiriko' || el.classList.contains('down')) return fly(el, dest, o);
    burst(el, 10, '#fff4d6', { shape: 'paper', dist: .8, size: 10 });
    await (go(el, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.8)' }], 260, { fill: 'forwards' }) || {}).finished;
    el.style.opacity = '0'; el.getAnimations().forEach(a => a.cancel());
    await fly(el, dest, { ...o, dur: 40 });
    el.dataset.tp = '1'; glyph(el, 'torii', SVG.torii, 700, 0, .9);
    await (go(el, [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], 320) || {}).finished;
    el.style.opacity = '';
  }
  // Roadhog hooked a card (Syauqie: show the card first): the chain pulls the real card, face up, from where it sat
  // to the middle of the screen. `card` is the big card already in the arena, `from` where the hooked card was, `by` Roadhog's slot.
  function hook(card, from, by) {
    if (!on() || !live(card) || !live(from)) return;
    const a = mid(from), b = mid(card);
    if (live(by)) beam(by, from, '#a7a7a7', 4, 500, 0, 'chain');
    card.animate([{ translate: `${a.x - b.x}px ${a.y - b.y}px`, scale: '.45' }, { translate: `${a.x - b.x}px ${a.y - b.y}px`, scale: '.45', offset: .3 }, { translate: '0 0', scale: '1' }], { duration: D(700), easing: 'cubic-bezier(.3,1.3,.5,1)' });
  }
  return { on, reveal, move, snap, hook, decorate, HAND, PLAY };
})();
