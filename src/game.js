/* ===== Payload Push: UI + game flow ===== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Settings ---------- */
const DEFAULTS = { sound: true, volume: 70, speed: 'normal', length: 3, mode: 'hand', cardStyle: 'full', music: 'inst', menuVoice: 'kiriko', menuCards: ['reinhardt', 'tracer', 'mercy'], gameMusic: 'on', musicVol: 70, sfxVol: 80, voiceVol: 90, heroFx: 'on' };
const settings = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('pp-settings') || '{}');
    if (!saved.modeV) { saved.mode = 'hand'; saved.modeV = 2; } // Hand of 3 became the main mode
    return { ...DEFAULTS, ...saved };
  } catch (e) { return { ...DEFAULTS }; }
})();
function saveSettings() { try { localStorage.setItem('pp-settings', JSON.stringify(settings)); } catch (e) { /* storage blocked */ } }
const SPEED = { normal: 1, fast: 0.55, test: 0.25 };
const T = ms => ms * SPEED[settings.speed];

/* ---------- Sound (synthesized, no files) ---------- */
const Sfx = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        // one bus per kind of sound so each has its own volume slider
        [this.sfx, this.musicBus, this.voiceBus] = [0, 0, 0].map(() => { const g = this.ctx.createGain(); g.connect(this.master); return g; });
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.apply();
    } catch (e) { this.ctx = null; }
  },
  apply() {
    if (!this.master) return;
    this.master.gain.value = settings.sound ? (settings.volume / 100) * 0.8 : 0;
    this.sfx.gain.value = settings.sfxVol / 100; this.musicBus.gain.value = settings.musicVol / 100; this.voiceBus.gain.value = settings.voiceVol / 100;
  },
  ok() { return this.ctx && settings.sound && settings.volume > 0 && settings.sfxVol > 0; },
  tone(f, dur, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfx);
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  noise(dur, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur);
    f.Q.value = o.q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t); src.stop(t + dur + 0.05);
  },
  click() { this.tone(900, 0.05, { type: 'triangle', vol: 0.12 }); },
  draw() { this.noise(0.22, { f: 900, fto: 3500, vol: 0.18, q: 0.8 }); },
  place() { this.noise(0.08, { f: 400, vol: 0.3, filter: 'lowpass' }); this.tone(140, 0.12, { vol: 0.25, to: 80 }); },
  flip() { this.noise(0.12, { f: 2500, fto: 800, vol: 0.2 }); this.tone(520, 0.12, { type: 'triangle', vol: 0.12, to: 880 }); },
  reveal() { this.tone(110, 0.35, { vol: 0.35, to: 55 }); this.noise(0.3, { f: 300, vol: 0.25, filter: 'lowpass' }); },
  ability(kind) {
    const up = [523, 659, 784, 1047];
    if (kind === 'weaken' || kind === 'steal' || kind === 'deflect' || kind === 'decay' || kind === 'hook') { this.tone(700, 0.25, { type: 'sawtooth', vol: 0.09, to: 180 }); this.noise(0.15, { f: 1800, vol: 0.12 }); }
    else if (kind === 'hack') { for (let i = 0; i < 6; i++) this.tone(300 + Math.random() * 1200, 0.05, { type: 'square', vol: 0.06, delay: i * 0.05 }); }
    else if (kind === 'barrier' || kind === 'freeze') { this.tone(330, 0.5, { type: 'triangle', vol: 0.15 }); this.tone(495, 0.5, { type: 'triangle', vol: 0.1, delay: 0.03 }); }
    else if (kind === 'random') { for (let i = 0; i < 8; i++) this.tone(400 + i * 60, 0.04, { type: 'square', vol: 0.05, delay: i * 0.045 }); this.tone(160, 0.4, { vol: 0.3, to: 60, delay: 0.38 }); }
    else if (kind === 'swap') { this.tone(400, 0.3, { type: 'sine', vol: 0.15, to: 900 }); this.tone(900, 0.3, { type: 'sine', vol: 0.12, to: 400 }); }
    else up.forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.05 }));
  },
  win() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.14, delay: i * 0.07 })); },
  lose() { [392, 311, 262].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.12, delay: i * 0.09 })); },
  draw0() { this.tone(440, 0.25, { type: 'triangle', vol: 0.1 }); this.tone(440, 0.25, { type: 'triangle', vol: 0.08, delay: 0.12 }); },
  push() { this.noise(0.6, { f: 120, vol: 0.35, filter: 'lowpass' }); this.tone(70, 0.5, { vol: 0.3 }); this.tone(1400, 0.06, { type: 'square', vol: 0.05, delay: 0.45 }); },
  victory() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i > 3 ? 0.7 : 0.22, { type: 'triangle', vol: 0.16, delay: i * 0.12 })); this.noise(1.2, { f: 6000, vol: 0.05, delay: 0.5 }); },
  defeat() { [392, 370, 349, 262].forEach((f, i) => this.tone(f, i === 3 ? 0.9 : 0.3, { type: 'sawtooth', vol: 0.06, delay: i * 0.22 })); },
};

/* ---------- Card element ---------- */
/* Full art cards: each hero with art gets its picture, size and how far it pops out.
   Set through element.style rather than an injected <style>, which the Claude viewer's security rules block. */
const hasArt = id => typeof PORTRAITS !== 'undefined' && !!PORTRAITS[id];
/* Skins: the chosen skin's picture fills the whole card art instead of the cutout. */
function skinOf(id, pick) {
  const n = pick !== undefined ? pick : (settings.skins || {})[id];
  return n && typeof SKINS !== 'undefined' && (SKINS[id] || []).find(s => s.name === n);
}
function paintArt(el, id, pick) {
  const bg = el.querySelector('.fa .bg'), sk = skinOf(id, pick);
  if (bg && typeof CITY_BG !== 'undefined') bg.style.backgroundImage = `url("${CITY_BG}")`;
  const hero = el.querySelector('.hero'), a = sk || (hasArt(id) && PORTRAITS[id]);
  if (!hero || !a) return;
  // Tall art is 118 wide; wide art (Mauga, D.Mon Mech) may grow up to 160 wide so it doesn't look tiny.
  const r = a.h / a.w, H = Math.round(Math.min(150, Math.max(118 * r, Math.min(110, 160 * r)))), top = H < 110 ? -10 : -14;
  Object.assign(hero.style, { backgroundImage: `url("${a.src}")`, height: H + 'cqw', aspectRatio: a.w + ' / ' + a.h, top: (top + 42) + 'cqw', left: r < .9 ? '50%' : '' });
}
const CARD_OF = new WeakMap(); // card element -> the card object it shows
function cardEl(card, opts = {}) {
  const h = abilityView(HEROES[card.id]);
  const el = document.createElement('div');
  CARD_OF.set(el, card);
  const full = settings.cardStyle !== 'classic', art = full && hasArt(h.id);
  const fin = full ? (opts.finish !== undefined ? opts.finish : (settings.finishes || {})[h.id] || '') : '';
  el.className = (fin ? 'fin-' + fin + ' ' : '') + 'card' + (card.silenced ? ' silenced' : '') + (opts.down ? ' down' : '') + (h.name.length > 9 ? ' long' : '') + (full ? ' fa' + (art ? ' p-' + h.id : ' noart') : '');
  el.dataset.uid = card.uid || '';
  el.dataset.hero = h.id;
  el.style.setProperty('--c1', h.colors[0]);
  el.style.setProperty('--c2', h.colors[1]);
  const pw = h.fx && h.fx.type === 'random' ? '?' : h.power + (card.bonus || 0);
  el.innerHTML =
    `<div class="card-inner"><div class="face front">` +
    (full
      ? `<div class="art"><div class="bg"></div>${art ? '' : `<svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">${EMBLEMS[h.id] || ''}</svg>`}</div>` +
        (fin ? '<div class="finish"></div>' : '') +
        (art ? `<div class="popwrap"><div class="hero"></div></div>${fin ? '<div class="finish-fx"></div>' : ''}<svg class="medal" viewBox="0 0 100 100" aria-hidden="true">${EMBLEMS[h.id] || ''}</svg>` : '')
      : `<div class="art"><span class="glyph">${h.name[0]}</span><svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">${EMBLEMS[h.id] || ''}</svg></div>`) +
    `<div class="power${card.bonus > 0 ? ' up' : card.bonus < 0 ? ' down' : ''}"><span>${pw}</span></div>` +
    `<div class="role" title="${ROLES[h.role].label}">${ROLE_ICONS[h.role]}</div>` +
    `<div class="name"><span>${h.name}</span></div>` +
    `<div class="ability"><b>${h.ability.name}</b><p>${h.ability.text}</p></div>` +
    `<div class="ready"></div></div><div class="face back"></div></div><div class="fxlayer"></div>`;
  if (full) paintArt(el, h.id, opts.skin);
  el.setAttribute('aria-label', `${h.name}, Power ${pw}. ${h.ability.name}: ${h.ability.text}`);
  return el;
}
const basePower = c => HEROES[c.id].power + (c.bonus || 0);
function setPower(el, v, base) {
  const p = el.querySelector('.power'); const s = p.querySelector('span');
  p.classList.toggle('up', v > base); p.classList.toggle('down', v < base);
  if (String(s.textContent) === String(v)) return;
  s.textContent = v;
  p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
}

/* Menu music: plays on every screen except the game itself. Files sit next to the page (music/<song>-inst|full.mp3).
   Web Audio first (works in the Claude viewer); a plain <audio> element when fetch can't read local files. */
const Music = {
  SONGS: ['ash', 'iffy', 'cynical', 'night', 'catch', 'cherish', 'lxxk', 'magnetic', 'midnight', 'notcute', 'notme', 'smiley', 'sugar', 'ticktack'],
  idx: Math.floor(Math.random() * 14), want: false, src: null, el: null, gain: null, token: 0, mode: 'menu',
  // In a game: one battle track on loop (its own on/off setting). Everywhere else: the menu songs in turn.
  url() { return this.mode === 'game' ? 'music/battle.mp3' : 'music/' + this.SONGS[this.idx] + '-' + (settings.music === 'full' ? 'full' : 'inst') + '.mp3'; },
  off() { return this.mode === 'game' ? settings.gameMusic === 'off' : settings.music === 'off'; },
  level() { return settings.sound && !this.off() ? (settings.volume / 100) * (settings.musicVol / 100) * 0.45 : 0; },
  apply() {
    if (this.gain && Sfx.ctx) this.gain.gain.setTargetAtTime(this.level() > 0 ? 0.55 : 0, Sfx.ctx.currentTime, 0.2);
    if (this.el) this.el.volume = this.level();
    if (this.off()) this.halt(); else if (this.want && !this.src && !this.el) this.play();
  },
  start(mode = 'menu') { if (mode !== this.mode) { this.halt(); this.mode = mode; } this.want = true; if (!this.src && !this.el) this.play(); },
  stop() { this.want = false; this.halt(); },
  halt() {
    this.token++;
    const s = this.src, g = this.gain;
    if (s && g && Sfx.ctx) { g.gain.setTargetAtTime(0, Sfx.ctx.currentTime, 0.15); setTimeout(() => { try { s.stop(); } catch (e) {} }, 600); }
    if (this.el) { this.el.pause(); this.el = null; }
    this.src = null; this.gain = null;
  },
  next() { this.idx = (this.idx + 1) % this.SONGS.length; this.halt(); if (this.want) this.play(); },
  async play() {
    if (this.off() || !this.want) return;
    Sfx.init();
    const t = ++this.token, url = this.url();
    try {
      if (!Sfx.ctx || location.protocol === 'file:') throw 0; // local files can't be fetched; use <audio>
      const buf = await Sfx.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      if (t !== this.token || !this.want) return;
      const g = Sfx.ctx.createGain(); g.gain.value = 0; g.connect(Sfx.musicBus);
      g.gain.setTargetAtTime(this.off() ? 0 : 0.55, Sfx.ctx.currentTime, 0.4);
      const n = Sfx.ctx.createBufferSource(); n.buffer = buf; n.loop = this.mode === 'game'; n.connect(g);
      n.onended = () => { if (this.src === n) this.next(); };
      n.start(); this.src = n; this.gain = g;
    } catch (e) {
      if (t !== this.token || !this.want) return;
      try {
        const a = new Audio(url); a.volume = this.level(); a.loop = this.mode === 'game';
        a.onended = () => { if (this.el === a) this.next(); };
        this.el = a; await a.play();
      } catch (e2) { /* blocked until the player taps something; retried on the next tap */ if (this.el) this.el = null; }
    }
  },
};
// browsers only allow sound after a tap: start the menu music on the first one
document.addEventListener('pointerdown', () => { if (Music.want && !Music.src && !Music.el) Music.play(); }, true);
/* ---------- Mode select: each game mode is a card that tilts in 3D ---------- */
// New modes go before the Coming soon card, which always stays last.
var PLAY_MODE = 'push'; // 'control' when the Control card was picked
const MODES = [
  { id: 'standard', name: 'Push', art: 'reinhardt', text: 'Hold 3 cards. Pick your play each round and push the robot home.', tag: 'Hand of 3 · Pick a deck' },
  { id: 'control', name: 'Control', art: 'tracer', text: '3 rounds of up to 5 turns. First to win 2 rounds wins.', tag: 'Hand of 3 · Pick a deck', cls: 'ctrl', badge: 'New' },
  { id: 'deathmatch', name: 'Deathmatch', art: 'reaper', text: 'You against 3 bots. Highest Power scores. First to 4 points wins.', tag: '4 players · Pick a deck', cls: 'dm', badge: 'New' },
  { id: 'quick', name: 'Quick Play', art: 'mei', text: 'Draw 1 card a round. Play it, or save it in your one Reserve slot.', tag: '1 card · Pick a deck', cls: 'blue' },
  { id: 'mystery', name: 'Mystery Hero', art: 'zenyatta', text: 'No deck. Draw random heroes, never the same one twice. Up to 20 rounds.', tag: 'Hand of 3 · Random draws', cls: 'myst', badge: 'New', glyph: '?' },
];
let modeRAF = 0;
function renderModes() {
  const row = $('#mode-cards'); row.innerHTML = '';
  for (const m of MODES) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'mode-card' + (m.soon ? ' soon' : '') + (m.cls ? ' ' + m.cls : '');
    el.dataset.mode = m.id; el.setAttribute('aria-label', m.soon ? 'Coming soon' : m.name + ' mode');
    el.innerHTML = `<div class="mc-inner"><div class="mc-art"><img class="mc-bg" alt=""><span class="mc-glyph">${m.soon ? '?' : m.glyph || ''}</span></div><div class="mc-body"><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.text)}</p>${m.tag ? `<span class="pill">${escapeHtml(m.tag)}</span>` : ''}</div>${m.soon ? '<div class="mc-ribbon">Coming soon</div>' : ''}<div class="mc-shine"></div></div>${m.badge ? `<span class="mc-badge">${escapeHtml(m.badge)}</span>` : ''}`;
    if (typeof CITY_BG !== 'undefined') el.querySelector('.mc-bg').src = CITY_BG;
    const p = m.art && typeof PORTRAITS !== 'undefined' && PORTRAITS[m.art];
    if (p) { const im = document.createElement('img'); im.className = 'mc-hero'; im.alt = ''; im.src = p.src; el.querySelector('.mc-art').appendChild(im); }
    row.appendChild(el);
    const t = { rx: 0, ry: 0, tx: 0, ty: 0, live: false, ph: Math.random() * 6 };
    el._tilt = t;
    const aim = e => { const r = el.getBoundingClientRect(); const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)); t.ty = x * 20; t.tx = -y * 16; t.live = true; };
    el.addEventListener('pointerdown', e => { aim(e); });
    el.addEventListener('pointermove', aim);
    el.addEventListener('pointerleave', () => { t.live = false; });
    el.addEventListener('click', () => {
      Sfx.init();
      if (m.soon) { Sfx.click(); el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); return; }
      Sfx.click();
      if (m.id === 'mystery') { PLAY_MODE = 'push'; newGame('mystery'); return; }
      PLAY_MODE = m.id === 'control' || m.id === 'deathmatch' ? m.id : 'push';
      settings.mode = m.id === 'quick' ? 'classic' : 'hand'; saveSettings(); syncModeDesc();
      show('decksel');
    });
  }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = now => {
    if ($('#scr-modes').hidden) { modeRAF = 0; return; }
    for (const el of row.children) {
      const t = el._tilt, k = now / 1000 + t.ph;
      if (!t.live) { t.tx = calm ? 0 : Math.sin(k * 0.9) * 4; t.ty = calm ? 0 : Math.sin(k * 0.6) * 7; }
      t.rx += (t.tx - t.rx) * 0.15; t.ry += (t.ty - t.ry) * 0.15;
      const inner = el.firstElementChild;
      inner.style.transform = `rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      el.style.setProperty('--mx', (50 + t.ry * 2.4).toFixed(1) + '%'); el.style.setProperty('--my', (50 - t.rx * 2.8).toFixed(1) + '%');
    }
    modeRAF = requestAnimationFrame(step);
  };
  cancelAnimationFrame(modeRAF); modeRAF = requestAnimationFrame(step);
}
/* ---------- Screens ---------- */
function show(id) {
  if (id === 'modes') setTimeout(renderModes);
  $$('.screen').forEach(s => { s.hidden = s.id !== 'scr-' + id; });
  if (id === 'exit') Music.stop(); else Music.start(id === 'game' || id === 'control' || id === 'dm' ? 'game' : 'menu');
  const s = $('#scr-' + id); if (s) s.scrollTop = 0;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  Sfx.init(); Sfx.click();
  // Kiriko greets each main menu choice with one of her real lines
  if (b.closest('#scr-menu')) Voice.menu(b.dataset.go === 'modes' ? 'play' : b.dataset.go);
  show(b.dataset.go);
});

function heroRow(id) {
  const h = HEROES[id];
  const pw = h.fx && h.fx.type === 'random' ? '?' : h.power;
  return `<li><span class="rl">${ROLE_ICONS[h.role]}</span><span class="nm">${h.name}</span><span class="pw">${pw}</span></li>`;
}
/* ---------- Custom decks (saved in this browser) ---------- */
const DECK_MIN = 20, DECK_MAX = 20, DECK_POWER = 105, ROLE_MIN = 4;
// Custom deck rules: at least 4 of each role and printed Power adding up to 105 or less.
const limitPower = h => HEROES[h].deckPower ?? HEROES[h].power;
const deckPower = ids => ids.reduce((n, h) => n + limitPower(h), 0);
// The least Power still needed to finish a legal deck from these picks (so the builder never lets you paint yourself into a corner).
function powerToFinish(ids) {
  const free = Object.keys(HEROES).filter(h => !ids.includes(h)).sort((x, y) => limitPower(x) - limitPower(y)), take = [];
  for (const r of ['tank', 'damage', 'support']) {
    const need = ROLE_MIN - ids.filter(h => HEROES[h].role === r).length;
    take.push(...free.filter(h => HEROES[h].role === r).slice(0, Math.max(0, need)));
  }
  take.push(...free.filter(h => !take.includes(h)).slice(0, Math.max(0, DECK_MIN - ids.length - take.length)));
  return deckPower(take);
}
function deckProblem(ids) {
  const cnt = r => ids.filter(h => HEROES[h].role === r).length;
  const short = ['tank', 'damage', 'support'].filter(r => cnt(r) < ROLE_MIN).map(r => `${ROLE_MIN - cnt(r)} more ${ROLES[r].label}`);
  if (short.length) return 'Add ' + short.join(', ');
  if (ids.length < DECK_MIN) return `Add ${DECK_MIN - ids.length} more heroes`;
  if (deckPower(ids) > DECK_POWER) return `Power is ${deckPower(ids) - DECK_POWER} over the ${DECK_POWER} limit`;
  return '';
}
function loadCustomDecks() {
  try {
    const raw = JSON.parse(localStorage.getItem('pp-decks') || '[]');
    return Array.isArray(raw) ? raw.filter(d => d && d.id && Array.isArray(d.heroes)).map(d => ({ ...d, heroes: d.heroes.filter(h => HEROES[h]) })) : [];
  } catch (e) { return []; }
}
function saveCustomDecks() {
  try { localStorage.setItem('pp-decks', JSON.stringify(EXTRA_DECKS.map(({ id, name, heroes }) => ({ id, name, heroes })))); } catch (e) { /* storage blocked */ }
}
EXTRA_DECKS.push(...loadCustomDecks().map(d => ({ ...d, tag: 'Custom', desc: 'Your own deck.' })));
const getDeck = id => findDeck(id);
const ROLE_FILTERS = [['all', 'All'], ['tank', 'Tank'], ['damage', 'Damage'], ['support', 'Support']];
function roleFilter(el, onChange) {
  el.innerHTML = ROLE_FILTERS.map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === 'all'}">${v === 'all' ? '' : `<span class="rl">${ROLE_ICONS[v]}</span>`}${l}</button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    Sfx.init(); Sfx.click();
    el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    onChange(b.dataset.v);
  });
}
const roleOrder = ids => ['tank', 'damage', 'support'].flatMap(r => ids.filter(k => HEROES[k].role === r));

function renderDeckChoose() {
  const wrap = $('#deck-choose'); wrap.innerHTML = '';
  [...DECKS, ...EXTRA_DECKS].forEach(d => {
    const panel = document.createElement('article');
    panel.className = 'deck-panel';
    const heroes = roleOrder(d.heroes);
    panel.innerHTML = `<div class="fan"></div><div><span class="pill">${d.tag || 'Custom'}</span> <span class="pill dim">${d.heroes.length} cards</span></div><h3 class="deck-name">${escapeHtml(d.name)}</h3><p class="deck-desc">${d.desc || 'Your own deck.'}</p><ul class="hero-list">${heroes.map(heroRow).join('')}</ul><button class="btn" data-deck="${d.id}">Play ${escapeHtml(d.name)}</button>`;
    (FEATURED[d.id] || d.heroes.slice(0, 3)).forEach(id => panel.querySelector('.fan').appendChild(cardEl({ id })));
    wrap.appendChild(panel);
  });
  const add = document.createElement('article');
  add.className = 'deck-panel build-panel';
  add.innerHTML = `<button class="build-tile" data-build="1"><span class="plus">+</span><span class="deck-name">Build a deck</span><span class="deck-desc">20 heroes, at least 4 of each role, up to 105 Power.</span></button>`;
  wrap.appendChild(add);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

let browseState = { deck: 'all', role: 'all' };
let browseSort = { key: 'role', dir: 1, q: '' };
const ROLE_RANK = { tank: 0, damage: 1, support: 2 };
function sortHeroes(ids, key, dir) {
  const byName = (a, b) => HEROES[a].name.localeCompare(HEROES[b].name);
  if (key === 'name') return [...ids].sort((a, b) => dir * byName(a, b));
  const val = key === 'power' ? h => HEROES[h].power : h => ROLE_RANK[HEROES[h].role];
  // ties stay A to Z whichever way the main sort runs
  return [...ids].sort((a, b) => dir * (val(a) - val(b)) || byName(a, b));
}
function initDecksScreen() {
  roleFilter($('#browse-filter'), v => { browseState.role = v; renderBrowse(); });
  $('#browse-tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) { Sfx.init(); Sfx.click(); browseState.deck = t.dataset.id; renderBrowse(); } });
  $('#btn-build').onclick = () => { Sfx.init(); Sfx.click(); openBuilder(null); };
  $('#browse-grid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) { Sfx.init(); Sfx.click(); openViewer(c.dataset.hero, '', { voice: true }); } });
  $('#btn-edit-deck').onclick = () => { Sfx.init(); Sfx.click(); openBuilder(browseState.deck); };
  $('#browse-sort').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    Sfx.init(); Sfx.click();
    // tapping the active sort again flips it between ascending and descending
    if (b.dataset.k === browseSort.key) browseSort.dir = -browseSort.dir; else { browseSort.key = b.dataset.k; browseSort.dir = 1; }
    renderBrowse();
  });
  $('#browse-search').addEventListener('input', e => { browseSort.q = e.target.value.trim().toLowerCase(); renderBrowse(); });
  renderBrowse();
}
function renderBrowse() {
  setPowerMode(settings.mode);
  const all = [ALL_DECK, ...DECKS, ...EXTRA_DECKS];
  if (!all.find(d => d.id === browseState.deck)) browseState.deck = 'all';
  $('#browse-tabs').innerHTML = all.map(d => `<button class="tab${d.tag === 'Custom' ? ' custom' : ''}" role="tab" data-id="${d.id}" aria-selected="${d.id === browseState.deck}">${escapeHtml(d.name)}</button>`).join('');
  const d = all.find(x => x.id === browseState.deck);
  $('#browse-desc').textContent = d.id === 'all' ? 'Every hero in the game. Search, filter, sort, or build your own deck.' : (d.tag || 'Custom') + '. ' + (d.desc || '');
  $('#btn-edit-deck').hidden = d.tag !== 'Custom';
  const ids = sortHeroes(d.heroes.filter(h => (browseState.role === 'all' || HEROES[h].role === browseState.role)
    && (!browseSort.q || HEROES[h].name.toLowerCase().includes(browseSort.q))), browseSort.key, browseSort.dir);
  $('#browse-sort').querySelectorAll('button').forEach(b => {
    const on = b.dataset.k === browseSort.key;
    b.setAttribute('aria-pressed', on);
    b.querySelector('.dir').textContent = on ? (browseSort.dir > 0 ? '▲' : '▼') : '';
    b.title = on ? (browseSort.dir > 0 ? 'Ascending: tap for descending' : 'Descending: tap for ascending') : 'Sort by ' + b.dataset.k;
  });
  $('#browse-count').textContent = ids.length + (ids.length === 1 ? ' hero' : ' heroes');
  const g = $('#browse-grid'); g.innerHTML = '';
  ids.forEach(h => {
    const el = cardEl({ id: h }), n = typeof SKINS !== 'undefined' && SKINS[h] ? SKINS[h].length : 0;
    if (n && settings.cardStyle !== 'classic') { el.classList.add('has-skins'); el.insertAdjacentHTML('beforeend', `<span class="skin-tag">${n} skin${n > 1 ? 's' : ''}</span>`); }
    g.appendChild(el);
  });
}
/* Tap a hero in the hero list to hold their card up close: drag or move over it to tilt it in 3D. */
let tiltRAF = 0;
/* Voicelines: played through Web Audio (no media fetch, so the viewer's security rules can't block it). */
const Voice = {
  bufs: {}, src: null,
  stop() { try { if (this.src) this.src.stop(); } catch (e) {} this.src = null; },
  // Main menu lines from the hero picked in Settings (Menu voice)
  menu(btn) { if (settings.menuVoice && settings.menuVoice !== 'off') this.play('menu_' + settings.menuVoice + '_' + btn); else this.stop(); },
  async play(id) {
    const lines = typeof VOICES !== 'undefined' && VOICES[id];
    if (!lines || !lines.length) return null;
    const i = Math.floor(Math.random() * lines.length);
    const line = lines[i];
    Sfx.init(); this.stop();
    if (!Sfx.ctx || !settings.sound || !settings.volume || !settings.voiceVol) return line;
    try {
      const key = id + i;
      if (!this.bufs[key]) {
        const bin = atob(line.src.slice(line.src.indexOf(',') + 1)), bytes = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        this.bufs[key] = await Sfx.ctx.decodeAudioData(bytes.buffer);
      }
      const n = Sfx.ctx.createBufferSource(); n.buffer = this.bufs[key]; n.connect(Sfx.voiceBus); n.start(); this.src = n;
    } catch (e) {}
    return line;
  },
};
/* Keywords used on cards; inspecting a card explains the ones its text uses. */
const KEYWORDS = [
  ['Reserve', 'A card that has stayed in your hand for a round.'],
  ['Next', 'Waits for the next heroes you play, then wears off.'],
  ['After battle', 'Happens once the battle is over.'],
  ['Unblockable', 'Goes through shields, barriers and hacks.'],
  ['Hack', 'Cancels a hero’s ability for this battle, or longer if the card says so.'],
  ['Debuff', 'Anything that lowers a hero’s Power.'],
];
function keywordsHtml(id) {
  const t = HEROES[id].ability.text.toLowerCase();
  const hits = KEYWORDS.filter(([k]) => t.includes(k.toLowerCase().replace('after battle', 'after battle')) || (k === 'Hack' && t.includes('hacked')) || (k === 'Debuff' && t.includes('debuff')));
  return hits.length ? `<ul class="kw">${hits.map(([k, d]) => `<li><b>${k}</b> ${d}</li>`).join('')}</ul>` : '';
}
function openViewer(card, info = '', opts = {}) {
  if (typeof card === 'string') card = { id: card };
  const id = card.id, ov = $('#picker'), n = typeof SKINS !== 'undefined' && SKINS[id] ? SKINS[id].length : 0;
  ov.innerHTML = `<div class="viewer"><div class="tilt-stage"></div>${keywordsHtml(id)}${info}<div class="viewer-actions">${n && settings.cardStyle !== 'classic' ? `<button class="btn" data-skins>Skins (${n})</button>` : ''}${settings.cardStyle !== 'classic' ? '<button class="btn" data-finish>Finish</button>' : ''}<button class="btn ghost" data-close>Close</button></div><p class="viewer-hint">Drag the card to tilt it</p></div>`;
  const stage = ov.querySelector('.tilt-stage'), el = cardEl(card);
  if (card.bonus) setPower(el, basePower(card), HEROES[id].power);
  el.classList.add('tilt');
  el.querySelector('.front').insertAdjacentHTML('beforeend', '<div class="shine"></div>');
  stage.appendChild(el);
  const inner = el.querySelector('.card-inner');
  let rx = 0, ry = 0, tx = 0, ty = 0, held = false, idle = true, t0 = performance.now();
  const aim = e => { const r = el.getBoundingClientRect(); const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)); ty = x * 22; tx = -y * 18; idle = false; };
  stage.addEventListener('pointerdown', e => { held = true; stage.setPointerCapture(e.pointerId); aim(e); });
  stage.addEventListener('pointermove', e => { if (held || e.pointerType === 'mouse') aim(e); });
  const rest = () => { held = false; idle = true; t0 = performance.now(); };
  stage.addEventListener('pointerup', rest); stage.addEventListener('pointercancel', rest); stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') rest(); });
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = now => {
    if (!el.isConnected) return;
    if (idle) { const k = (now - t0) / 1000; tx = calm ? 0 : Math.sin(k * 0.9) * 6; ty = calm ? 0 : Math.sin(k * 0.6) * 10; }
    rx += (tx - rx) * 0.15; ry += (ty - ry) * 0.15;
    inner.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    el.style.setProperty('--mx', (50 + ry * 2.2).toFixed(1) + '%'); el.style.setProperty('--my', (50 - rx * 2.6).toFixed(1) + '%');
    tiltRAF = requestAnimationFrame(step);
  };
  cancelAnimationFrame(tiltRAF); tiltRAF = requestAnimationFrame(step);
  const close = () => { cancelAnimationFrame(tiltRAF); Voice.stop(); ov.hidden = true; ov.innerHTML = ''; };
  // Decks only: the hero says one of their lines (random), with the words shown under the card
  if (opts.voice) Voice.play(id).then(line => {
    if (!line || ov.hidden || !stage.isConnected) return;
    const cap = document.createElement('p'); cap.className = 'voice-line'; cap.textContent = '“' + line.text + '”';
    stage.after(cap);
  });
  ov.querySelector('[data-close]').onclick = () => { Sfx.click(); close(); };
  const sk = ov.querySelector('[data-skins]'); if (sk) sk.onclick = () => { Sfx.click(); cancelAnimationFrame(tiltRAF); openSkins(id); };
  const fb = ov.querySelector('[data-finish]'); if (fb) fb.onclick = () => { Sfx.click(); cancelAnimationFrame(tiltRAF); openFinishes(id); };
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.hidden = false;
}
/* Choose a card finish (border and effect) for a hero. */
const FINISHES = [['', 'None'], ['gold', 'Gold frame'], ['prism', 'Prismatic'], ['chrome', 'Chrome'], ['neon', 'Neon'], ['foil', 'Foil'], ['ink', 'Ink'], ['embers', 'Embers'], ['glitch', 'Glitch'], ['legend', 'Legendary']];
function openFinishes(id) {
  const ov = $('#picker'), h = HEROES[id], cur = (settings.finishes || {})[id] || '';
  ov.innerHTML = `<div class="pick"><h3>${escapeHtml(h.name)} · Finish</h3><p>Pick a border and effect for ${escapeHtml(h.name)}’s card.</p><div class="pick-row fin-opts"></div><button class="btn ghost" data-close>Close</button></div>`;
  const row = ov.querySelector('.pick-row');
  for (const [k, label] of FINISHES) {
    const wrap = document.createElement('div'); wrap.className = 'skin-opt' + (k === cur ? ' on' : '');
    const el = cardEl({ id }, { finish: k }); el.tabIndex = 0;
    const pick = () => { Sfx.click(); settings.finishes = { ...(settings.finishes || {}), [id]: k }; if (!k) delete settings.finishes[id]; saveSettings(); ov.hidden = true; ov.innerHTML = ''; renderBrowse(); renderMenuFan(); };
    el.onclick = pick; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') pick(); };
    wrap.appendChild(el); wrap.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
    row.appendChild(wrap);
  }
  ov.querySelector('[data-close]').onclick = () => { Sfx.click(); ov.hidden = true; ov.innerHTML = ''; };
  ov.onclick = e => { if (e.target === ov) { ov.hidden = true; ov.innerHTML = ''; } };
  ov.hidden = false;
}
/* Choose which skin a hero's card shows. */
function openSkins(id) {
  const ov = $('#picker'), h = HEROES[id], cur = (settings.skins || {})[id] || '';
  ov.innerHTML = `<div class="pick"><h3>${escapeHtml(h.name)} · Skins</h3><p>Choose how ${escapeHtml(h.name)} looks on your cards.</p><div class="pick-row skins-row"></div><button class="btn ghost" data-close>Close</button></div>`;
  const row = ov.querySelector('.pick-row');
  for (const name of [''].concat(SKINS[id].map(s => s.name))) {
    const wrap = document.createElement('div'); wrap.className = 'skin-opt' + (name === cur ? ' on' : '');
    const el = cardEl({ id }, { skin: name }); el.tabIndex = 0;
    const pick = () => { Sfx.click(); settings.skins = { ...(settings.skins || {}), [id]: name }; if (!name) delete settings.skins[id]; saveSettings(); ov.hidden = true; ov.innerHTML = ''; renderBrowse(); renderMenuFan(); };
    el.onclick = pick; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') pick(); };
    wrap.appendChild(el); wrap.insertAdjacentHTML('beforeend', `<span>${escapeHtml(name || 'Default')}</span>`);
    row.appendChild(wrap);
  }
  ov.querySelector('[data-close]').onclick = () => { Sfx.click(); ov.hidden = true; ov.innerHTML = ''; };
  ov.onclick = null;
  ov.hidden = false;
}

/* ---------- Deck builder ---------- */
let builder = { id: null, picks: new Set(), role: 'all' };
function initBuilder() {
  roleFilter($('#builder-filter'), v => { builder.role = v; renderBuilderGrid(); });
  $('#builder-grid').addEventListener('click', e => {
    const c = e.target.closest('.card'); if (!c) return;
    const id = c.dataset.hero;
    if (builder.picks.has(id)) { builder.picks.delete(id); Sfx.click(); }
    else if (builder.picks.size >= DECK_MAX) { toastAny(`A deck holds at most ${DECK_MAX} heroes`); return; }
    else if (deckPower([...builder.picks, id]) + powerToFinish([...builder.picks, id]) > DECK_POWER) { toastAny(`Too much Power: the deck must stay at ${DECK_POWER} or less`); return; }
    else { builder.picks.add(id); Sfx.init(); Sfx.place(); }
    c.classList.toggle('picked', builder.picks.has(id));
    syncBuilderBar();
  });
  $('#bb-save').onclick = () => {
    const name = ($('#deck-name').value || '').trim() || 'My deck';
    const heroes = [...builder.picks];
    if (builder.id) Object.assign(getDeck(builder.id), { name, heroes });
    else { builder.id = 'custom-' + Date.now().toString(36); EXTRA_DECKS.push({ id: builder.id, name, heroes, tag: 'Custom', desc: 'Your own deck.' }); }
    saveCustomDecks(); Sfx.init(); Sfx.win();
    browseState = { deck: builder.id, role: 'all' };
    renderDeckChoose(); renderBrowse();
    if (builder.back === 'online') { show('online'); Net.deckBuilt(builder.id); toastAny(`Saved “${name}”`); return; }
    show('decks');
    toastAny(`Saved “${name}”. Pick it from Play.`);
  };
  let confirmDel = false;
  $('#bb-delete').onclick = () => {
    if (!confirmDel) { confirmDel = true; $('#bb-delete').textContent = 'Tap again to delete'; setTimeout(() => { confirmDel = false; $('#bb-delete').textContent = 'Delete'; }, 2500); return; }
    confirmDel = false; $('#bb-delete').textContent = 'Delete';
    const i = EXTRA_DECKS.findIndex(d => d.id === builder.id);
    if (i >= 0) EXTRA_DECKS.splice(i, 1);
    saveCustomDecks(); browseState = { deck: 'all', role: 'all' };
    renderDeckChoose(); renderBrowse(); toastAny('Deck deleted');
    if (builder.back === 'online') { show('online'); Net.render(); return; }
    show('decks');
  };
}
// back: the screen to return to ('decks', or 'online' when building from a friend's room)
function openBuilder(id, back = 'decks') {
  const d = id && getDeck(id);
  builder = { id: d ? d.id : null, picks: new Set(d ? d.heroes : []), role: 'all', back };
  $('#scr-builder .back-link').dataset.go = back;
  $('#scr-builder .back-link').textContent = back === 'online' ? '‹ Back to room' : '‹ Back to decks';
  $('#builder-title').textContent = d ? 'Edit deck' : 'Build a deck';
  $('#deck-name').value = d ? d.name : '';
  $('#bb-delete').hidden = !d;
  $$('#builder-filter button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'all' ? 'true' : 'false'));
  renderBuilderGrid(); syncBuilderBar(); show('builder');
}
function renderBuilderGrid() {
  const g = $('#builder-grid'); g.innerHTML = '';
  ALL_DECK.heroes.filter(h => builder.role === 'all' || HEROES[h].role === builder.role).forEach(h => {
    const c = cardEl({ id: h }); c.classList.add('pickable'); c.classList.toggle('picked', builder.picks.has(h));
    c.setAttribute('role', 'button'); c.tabIndex = 0;
    g.appendChild(c);
  });
}
function syncBuilderBar() {
  const n = builder.picks.size, ids = [...builder.picks];
  const cnt = r => ids.filter(h => HEROES[h].role === r).length;
  const why = deckProblem(ids);
  $('#bb-count').textContent = `${n} / ${DECK_MAX} · Power ${deckPower(ids)} / ${DECK_POWER}`;
  $('#bb-count').classList.toggle('ok', !why);
  $('#bb-roles').textContent = (why ? why + ' to save · ' : '') + `${cnt('tank')} Tank · ${cnt('damage')} Damage · ${cnt('support')} Support`;
  $('#bb-save').disabled = !!why;
}
let toastAnyTimer;
function toastAny(msg) {
  let t = $('#toast-global');
  if (!t) { t = document.createElement('div'); t.id = 'toast-global'; t.className = 'toast global'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastAnyTimer); toastAnyTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

const ALL_DECK = { id: 'all', name: 'All heroes', tag: 'All', desc: 'Every hero in the game, by role.', heroes: ['tank', 'damage', 'support'].flatMap(r => Object.keys(HEROES).filter(k => HEROES[k].role === r)) };
const FEATURED = { heroes: ['dva', 'dmon', 'soldier'], strike: ['genji', 'vendetta', 'hanzo'], tactical: ['sombra', 'doctrine', 'widowmaker'] };
function renderMenuFan() {
  const fan = $('#menu-fan'); fan.innerHTML = '';
  const ids = (settings.menuCards || []).filter(id => HEROES[id]);
  (ids.length === 3 ? ids : DEFAULTS.menuCards).forEach(id => {
    const slot = document.createElement('div'); slot.className = 'fan-slot';
    const el = cardEl({ id }), g = document.createElement('div'); g.className = 'fan-glint';
    el.querySelector('.front').appendChild(g); slot.appendChild(el); fan.appendChild(slot);
  });
}
// The menu cards lean toward the mouse.
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const fan = $('#menu-fan'); if (!fan || $('#scr-menu').hidden) return;
  fan.style.setProperty('--mx', (e.clientX / innerWidth * 2 - 1).toFixed(3));
  fan.style.setProperty('--my', (e.clientY / innerHeight * 2 - 1).toFixed(3));
});
/* Redraw card lists after the card style changes. */
function refreshCardStyle() {
  document.body.classList.toggle('cards-full', settings.cardStyle !== 'classic');
  renderMenuFan(); renderDeckChoose(); renderBrowse();
}
function buildMenus() {
  renderMenuFan();

  $('#deck-choose').addEventListener('click', e => {
    const b = e.target.closest('[data-deck]');
    if (b) { Sfx.init(); Sfx.click(); const d = EXTRA_DECKS.find(x => x.id === b.dataset.deck), why = d && deckProblem(d.heroes); if (why) { toastAny(`Edit this deck first: ${why.toLowerCase()}`); return; } newGame(b.dataset.deck); return; }
    if (e.target.closest('[data-build]')) { Sfx.init(); Sfx.click(); openBuilder(null); }
  });
  renderDeckChoose();
  initDecksScreen();
  initBuilder();

  // settings
  const syncs = [];
  const seg = (sel, key, cast) => {
    const el = $(sel);
    const sync = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(cast(b.dataset.v)) === String(settings[key]) ? 'true' : 'false'));
    syncs.push(sync);
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      settings[key] = cast(b.dataset.v); saveSettings(); syncs.forEach(f => f()); syncModeDesc(); if (key === 'cardStyle') refreshCardStyle(); if (key === 'music') Music.halt(); if (key === 'menuVoice') Voice.menu('play'); Sfx.init(); Sfx.apply(); Music.apply(); Sfx.click(); syncSoundBtn();
    });
    sync();
  };
  seg('#set-sound', 'sound', v => v === 'on');
  seg('#set-speed', 'speed', v => v);
  seg('#set-length', 'length', v => +v);
  seg('#set-mode', 'mode', v => v);
  seg('#set-mode2', 'mode', v => v);
  seg('#set-cards', 'cardStyle', v => v);
  seg('#set-herofx', 'heroFx', v => v);
  seg('#set-music', 'music', v => v);
  seg('#set-menuvoice', 'menuVoice', v => v);
  seg('#set-gamemusic', 'gameMusic', v => v);
  syncModeDesc();
  // Menu cards: three hero dropdowns; picking a hero already shown swaps the two slots
  const mcSel = $$('#set-menucards select'), byName = Object.keys(HEROES).sort((a, b) => HEROES[a].name.localeCompare(HEROES[b].name));
  const syncMc = () => mcSel.forEach((el, i) => { el.value = settings.menuCards[i]; });
  mcSel.forEach((el, i) => {
    el.innerHTML = byName.map(id => `<option value="${id}">${escapeHtml(HEROES[id].name)}</option>`).join('');
    el.addEventListener('change', () => {
      const mc = [...settings.menuCards], j = mc.indexOf(el.value);
      if (j >= 0 && j !== i) mc[j] = mc[i];
      mc[i] = el.value; settings.menuCards = mc; saveSettings(); syncMc(); renderMenuFan(); Sfx.init(); Sfx.click();
    });
  });
  syncMc();
  for (const [sel, key] of [['#set-volume', 'volume'], ['#set-musicvol', 'musicVol'], ['#set-sfxvol', 'sfxVol'], ['#set-voicevol', 'voiceVol']]) {
    const el = $(sel); if (!el) continue;
    el.value = settings[key];
    el.addEventListener('input', () => { settings[key] = +el.value; saveSettings(); Sfx.init(); Sfx.apply(); Music.apply(); });
    el.addEventListener('change', () => key === 'voiceVol' ? Voice.play('kiriko') : Sfx.click());
  }
  // Exit: an installed app or a window the game opened can close itself; a normal browser tab can't, so say so
  $('#btn-exit').addEventListener('click', () => {
    Sfx.init(); Sfx.click(); Music.stop(); Voice.menu('exit');
    show('exit');
    setTimeout(() => { try { window.close(); } catch (e) {} }, 1600);
  });
}

const ICON_SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function syncSoundBtn() {
  $('#btn-sound').innerHTML = settings.sound ? ICON_SOUND_ON : ICON_SOUND_OFF;
  $$('#set-sound button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v === 'on') === settings.sound ? 'true' : 'false'));
}

/* ---------- Animation helpers ---------- */
let gameId = 0;
const ABORT = Symbol('abort');
function wait(ms) {
  const id = gameId;
  return new Promise((res, rej) => setTimeout(() => (id === gameId ? res() : rej(ABORT)), T(ms)));
}
function rectOf(el) { return el.getBoundingClientRect(); }
/* Move `el` into `dest`, animating from where it was (or from `fromRect`). */
async function fly(el, dest, o = {}) {
  const id = gameId;
  const r0 = o.from || rectOf(el);
  dest.appendChild(el);
  const r1 = rectOf(el);
  if (o.faceUp !== undefined) requestAnimationFrame(() => el.classList.toggle('down', !o.faceUp));
  el.classList.add('flying');
  const s = r0.width / r1.width;
  const a = el.animate(
    [{ transformOrigin: '0 0', transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${s})` },
     { transformOrigin: '0 0', transform: 'translate(0,0) scale(1)' }],
    { duration: T(o.dur || 480), easing: 'cubic-bezier(.2,.8,.2,1)' });
  try { await a.finished; } catch (e) { /* cancelled */ }
  el.classList.remove('flying');
  if (o.check !== false && id !== gameId) throw ABORT;
}
/* Animate `el` toward a rectangle and remove it. */
async function flyAway(el, toRect, o = {}) {
  const r1 = rectOf(el);
  el.classList.add('flying');
  const s = toRect.width / r1.width;
  const a = el.animate(
    [{ transformOrigin: '0 0', transform: 'none', opacity: 1 },
     { transformOrigin: '0 0', transform: `translate(${toRect.left - r1.left}px, ${toRect.top - r1.top}px) scale(${s})`, opacity: o.fade ? 0 : 1 }],
    { duration: T(o.dur || 420), easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
  try { await a.finished; } catch (e) { /* cancelled */ }
  el.remove();
}
async function fadeOut(el, dir = 1) {
  const a = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${dir * 30}px) scale(.85) rotate(${dir * 6}deg)` }],
    { duration: T(380), easing: 'ease-in', fill: 'forwards' });
  try { await a.finished; } catch (e) { /* cancelled */ }
  el.remove();
}
function floatNum(el, delta) {
  if (!delta) return;
  const f = document.createElement('div');
  f.className = 'float-num ' + (delta > 0 ? 'plus' : 'minus');
  f.textContent = (delta > 0 ? '+' : '−') + Math.abs(delta);
  el.appendChild(f);
  setTimeout(() => f.remove(), 1200);
}
function fx(el, cls, ms = 1100) {
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Game state ---------- */
let G = null;
const other = s => (s === 'p' ? 'e' : 'p');
const swapSide = s => (s === 'p' ? 'e' : s === 'e' ? 'p' : s);
const swapPair = o => (o ? { p: o.e, e: o.p } : o);
/* Turn a battle result around, so the guest sees it from their own side. */
function swapResult(r) {
  return {
    ...r,
    events: r.events.map(e => ({ ...e, side: swapSide(e.side), target: swapSide(e.target), powers: swapPair(e.powers) })),
    powers: swapPair(r.powers), winner: swapSide(r.winner), recall: swapPair(r.recall), hacked: swapPair(r.hacked),
    after: r.after.map(a => ({ ...a, side: swapSide(a.side), of: swapSide(a.of) })),
  };
}

/* online = { flip, seed, decks: { A, B }, goal } for a game against a friend (see net.js).
   The host is side A and the guest side B; each player sees themselves as 'p'. */
function newGame(deckId, online) {
  if (!online && deckId !== 'mystery' && PLAY_MODE === 'deathmatch' && typeof newDM === 'function') return newDM(deckId);
  gameId++;
  $('#endscreen').hidden = true;
  $('#picker').hidden = true;
  stopConfetti();
  const mystery = !online && deckId === 'mystery';
  const ctrl = !online && !mystery && PLAY_MODE === 'control';
  const enemyDeck = online ? null : mystery ? 'mystery' : DECKS[Math.floor(Math.random() * DECKS.length)].id;
  const side = (id, deck) => ({ deckId: id, deck, discard: [], won: false, lost: false, played: [], turret: 0, next: [] });
  if (online) {
    const rA = seededRng(online.seed), rB = seededRng(online.seed ^ 0x9e3779b9), rBattle = seededRng(online.seed ^ 0x51ed270b);
    const cards = (d, k) => d.heroes.filter(h => HEROES[h]).map((id, i) => ({ uid: k + i, id, bonus: 0 }));
    const A = side(null, shuffle(cards(online.decks.A, 'A'), rA)), B = side(null, shuffle(cards(online.decks.B, 'B'), rB));
    const mine = online.flip ? B : A, theirs = online.flip ? A : B;
    mine.deckName = online.flip ? online.decks.B.name : online.decks.A.name;
    theirs.deckName = online.flip ? online.decks.A.name : online.decks.B.name;
    G = { goal: online.goal, pos: 0, round: 0, over: false, mode: 'hand', maxRounds: MAX_ROUNDS, online, p: mine, e: theirs,
      rng: { p: online.flip ? rB : rA, e: online.flip ? rA : rB, battle: rBattle } };
  } else {
    G = {
      goal: settings.length, pos: 0, round: 0, over: false,
      mode: !mystery && !ctrl && settings.mode === 'classic' ? 'classic' : 'hand',
      maxRounds: mystery ? MYSTERY_ROUNDS : ctrl ? CTRL_ROUNDS * CTRL_TURNS : MAX_ROUNDS, mystery,
      ctrl: ctrl ? { round: 1, turn: 0, w: { p: 0, e: 0 }, rw: { p: 0, e: 0 }, log: [] } : null,
      p: side(deckId, makeDeck(deckId)),
      e: side(enemyDeck, makeDeck(enemyDeck)),
    };
  }
  for (const s of ['p', 'e']) { if (G.mode === 'hand') { G[s].hand = []; G[s].slots = [null, null, null]; } else G[s].reserve = null; }
  setPowerMode(G.mode);
  setModeLayout();
  $('#board').classList.toggle('ctrlmode', !!G.ctrl); ctrlBoard();
  // reset board
  for (const id of ['#p-slot', '#e-slot', '#p-hand', '#e-hand', '#p-reserve', '#e-reserve', '#p-hand3']) $$(id + ' .card').forEach(c => c.remove());
  $('#p-reserve').classList.remove('full', 'can-drop');
  $('#e-reserve').classList.remove('full');
  $('#board').classList.remove('over');
  $('#e-deckname').textContent = online ? 'Friend · ' + G.e.deckName : mystery ? 'Mystery Hero' : getDeck(enemyDeck).name + ' deck';
  $('#actions').innerHTML = '';
  hideBanners();
  buildTrack();
  updateCounts();
  showTurrets();
  show('game');
  run(gameId);
}

async function run(id) {
  try {
    await wait(350);
    while (!G.over && id === gameId) await (G.mode === 'hand' ? playRoundHand() : playRound());
  } catch (e) {
    if (e !== ABORT) console.error(e);
  }
}

function buildTrack() {
  const n = $('#track-nodes'); n.innerHTML = '';
  $('#cart').classList.remove('pushing', 'face-l', 'walk');
  for (let i = -G.goal; i <= G.goal; i++) {
    if (i === -G.goal || i === G.goal) continue;
    const d = document.createElement('div');
    d.className = 'node' + (i === 0 ? ' mid' : '');
    d.dataset.i = i;
    d.style.left = pct(i) + '%';
    n.appendChild(d);
  }
  updateTrack(true);
}
const pct = i => ((i + G.goal) / (2 * G.goal)) * 100;
function updateTrack(instant) {
  const cart = $('#cart'), fill = $('#track-fill');
  if (instant) { cart.style.transition = 'none'; fill.style.transition = 'none'; }
  cart.style.left = pct(G.pos) + '%';
  const a = Math.min(pct(0), pct(G.pos)), b = Math.max(pct(0), pct(G.pos));
  fill.style.left = a + '%'; fill.style.width = (b - a) + '%';
  fill.style.background = G.pos >= 0 ? 'var(--ally)' : 'var(--enemy)';
  $$('#track-nodes .node').forEach(nd => {
    const i = +nd.dataset.i;
    nd.classList.toggle('lit-a', i > 0 && i <= G.pos);
    nd.classList.toggle('lit-e', i < 0 && i >= G.pos);
  });
  if (instant) { void cart.offsetWidth; cart.style.transition = ''; fill.style.transition = ''; }
}
function updateCounts() {
  for (const s of ['p', 'e']) {
    $('#' + s + '-count').textContent = G[s].deck.length;
    $('#' + s + '-pile').classList.toggle('empty', G[s].deck.length === 0);
    renderDiscard(s);
  }
}
/* Discard piles: the top card shows face up; tap the pile to see every card in it. */
function renderDiscard(s) {
  const pile = $('#' + s + '-discard'), d = G[s].discard, top = d[d.length - 1];
  $('#' + s + '-dcount').textContent = d.length;
  pile.classList.toggle('empty', !d.length);
  const holder = pile.querySelector('.dtop');
  if (holder.dataset.uid === String(top ? top.uid : '')) return;
  holder.innerHTML = ''; holder.dataset.uid = top ? top.uid : '';
  if (top) holder.appendChild(cardEl(top));
}
function openDiscard(s) {
  const d = G[s].discard.slice().reverse(), ov = $('#picker');
  ov.innerHTML = `<div class="pick"><h3>${s === 'p' ? 'Your' : 'Enemy'} discard pile</h3><p>${d.length ? d.length + ' card' + (d.length > 1 ? 's' : '') + ', newest first. Tap a card to inspect it.' : 'No cards yet.'}</p><div class="pick-row discard-row"></div><button class="btn ghost" data-close>Close</button></div>`;
  const row = ov.querySelector('.pick-row');
  for (const c of d) { const el = cardEl(c); if (c.bonus) setPower(el, basePower(c), HEROES[c.id].power); el.oncontextmenu = el.onclick = e => { e.preventDefault(); openViewer(c, modsHtml(c, s, false)); }; row.appendChild(el); }
  ov.querySelector('[data-close]').onclick = () => { Sfx.click(); ov.hidden = true; ov.innerHTML = ''; };
  ov.onclick = e => { if (e.target === ov) { ov.hidden = true; ov.innerHTML = ''; } };
  ov.hidden = false;
}
for (const s of ['p', 'e']) $('#' + s + '-discard').addEventListener('click', () => { if (G) { Sfx.init(); Sfx.click(); openDiscard(s); } });
/* An ability discarded a card: show it big in the arena, then send it to its owner's discard pile. */
async function revealDiscard(card, s, hooked) {
  const arena = $('#arena'), el = cardEl(card);
  if (card.bonus) setPower(el, basePower(card), HEROES[card.id].power);
  el.classList.add('reveal-card');
  // whose card it is (Syauqie: show if it belongs to you or the opponent)
  el.insertAdjacentHTML('beforeend', `<div class="owner-tag ${s === 'p' ? 'mine' : 'theirs'}">${s === 'p' ? 'Your card' : G.online ? 'Friend’s card' : 'Enemy card'}</div>`);
  // Roadhog's Chain Hook: the hooked card is pulled face up out of its owner's hand to the middle (Syauqie: show the card first)
  const from = hooked && ($$('#' + s + '-hand .card, #' + s + '-reserve .card, #' + s + '-hand3 .card').find(c => c.dataset.uid === card.uid) || $('#' + s + '-hand .card') || $('#' + s + '-hand'));
  arena.appendChild(el);
  if (hooked && HFX.on()) { el.style.transform = 'translate(-50%, -50%)'; HFX.hook(el, from, $('#' + other(s) + '-slot')); await wait(700); }
  else el.animate([{ transform: 'translate(-50%, -50%) scale(.4) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1) rotate(0)', opacity: 1 }], { duration: T(320), easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
  await wait(950);
  // discarded cards crumble to dust (Syauqie: a universal effect so everyone sees it was discarded)
  if (HFX.on()) await HFX.snap(el); else await flyAway(el, rectOf($('#' + s + '-discard')), { dur: 450 });
  el.remove();
  renderDiscard(s);
}
function drawFrom(s) {
  const P = G[s];
  if (!P.deck.length) {
    // cards discarded by abilities stay out; only played cards shuffle back in
    const back = P.discard.filter(c => !c.burned);
    P.discard = P.discard.filter(c => c.burned);
    P.deck = shuffle(back, G.rng ? G.rng[s] : undefined);
    if (s === 'p') toast(P.discard.length ? 'Deck reshuffled (' + P.discard.length + ' discarded card' + (P.discard.length > 1 ? 's stay' : ' stays') + ' out)' : 'Deck reshuffled');
  }
  const c = P.deck.pop();
  if (c) c.heldRounds = 0;
  updateCounts();
  return c;
}
function setHint(html) { $('#hint').innerHTML = html; }
function hideBanners() { $('#callout').classList.remove('show', 'enemy'); $('#result').className = 'result'; $('#vs').style.opacity = 1; }

function sideCtx(s, extra = {}) {
  const Pl = G[s], steps = s === 'p' ? G.pos : -G.pos;
  const Fo = G[other(s)];
  return { behind: steps < 0, steps, ...reserveView(Pl), wonLast: Pl.won, lostLast: Pl.lost, played: Pl.played, foePlayed: Fo.played, turret: Pl.turret || 0, next: Pl.next || [], hackedNext: !!Pl.hackedNext, curse: Pl.curse || [], discards: Pl.discards || 0, ...foeView(Fo), fromReserve: false, ...extra };
}
/* Bonus a card would get from its own side's situation, or null if it depends on the enemy. */
function readyBonus(card, ctx) {
  const fx = HEROES[card.id].fx;
  if (card.id === 'ashe' && (ctx.myHand || []).some(c => c.id === 'bob')) return 'B.O.B. ready';
  if (!fx) return '';
  if (fx.type === 'scale') { const n = scaleAmount(fx, ctx); return n ? 'Synergy +' + n : ''; }
  if (fx.type === 'boost' && isSelfCond(fx.when)) return condMet(fx.when, ctx) ? 'Synergy +' + fx.amount : '';
  if (fx.type === 'double') return condMet(fx.when, ctx) ? 'Synergy ×2' : '';
  if (fx.type === 'weaken' && fx.when && isSelfCond(fx.when)) return condMet(fx.when, ctx) ? 'Ready: −' + fx.amount : '';
  if (fx.type === 'immune' && condMet(fx.when, ctx)) return 'Untouchable';
  if (fx.type === 'charge') { const n = chargeAmount(fx, ctx.heldRounds, HEROES[card.id].power); return n ? 'Charged +' + n : ''; }
  if (fx.type === 'penalty') return condMet(fx.when, ctx) ? 'Full Power' : '';
  return '';
}
function setReady(el, txt) {
  const r = el && el.querySelector('.ready');
  if (!r) return;
  r.textContent = txt || '';
  r.classList.toggle('on', !!txt);
}
/* Show which choice lights up a synergy: new card played now, or Reserve card played. */
function showSynergies() {
  const hand = $('#p-hand .card'), res = $('#p-reserve .card');
  if (hand && G.p.drawn) setReady(hand, readyBonus(G.p.drawn, sideCtx('p')));
  if (res && G.p.reserve) setReady(res, readyBonus(G.p.reserve, sideCtx('p', { fromReserve: true, heldRounds: G.p.reserve.heldRounds || 0, reserveFull: false, reserveId: null, reserveIds: [], reservePower: null, bobPower: null, myHand: [], myReserve: [] })));
}
function clearSynergies() { $$('.card .ready.on').forEach(r => { r.classList.remove('on'); r.textContent = ''; }); }

/* Ask the player: resolves 'play' | 'reserve' | 'playReserve' */
function askPlayer(handEl) {
  return new Promise(resolve => {
    const acts = $('#actions');
    const rEl = $('#p-reserve .card');
    const reserveFull = !!G.p.reserve;
    const name = HEROES[G.p.drawn.id].name;
    let done = false;
    const finish = c => {
      if (done) return; done = true;
      Sfx.init(); Sfx.click();
      acts.innerHTML = '';
      handEl.classList.remove('clickable');
      if (rEl) rEl.classList.remove('clickable');
      $('#p-reserve').classList.remove('can-drop');
      document.removeEventListener('keydown', onKey);
      clearSynergies();
      $('#p-reserve').onclick = null; handEl.onclick = null; if (rEl) rEl.onclick = null;
      resolve(c);
    };
    if (!reserveFull) {
      acts.innerHTML = `<button class="btn" id="a-play">Play</button><button class="btn ghost" id="a-res">Reserve</button>`;
      setHint(`Play <b>${name}</b> now, or save it in your Reserve and play your top deck card instead.`);
      $('#a-res').onclick = () => finish('reserve');
      $('#p-reserve').classList.add('can-drop');
      $('#p-reserve').onclick = () => finish('reserve');
    } else {
      const rName = HEROES[G.p.reserve.id].name;
      acts.innerHTML = `<button class="btn" id="a-play">Play new</button><button class="btn" id="a-pr" style="--b: var(--gold)">Play Reserve</button>`;
      setHint(`Play <b>${name}</b> or your Reserve card <b>${rName}</b>. Your Reserve is full.`);
      $('#a-pr').onclick = () => finish('playReserve');
      rEl.classList.add('clickable');
      rEl.onclick = () => finish('playReserve');
    }
    $('#a-play').onclick = () => finish('play');
    showSynergies();
    handEl.classList.add('clickable');
    handEl.onclick = () => finish('play');
    const onKey = e => {
      if (e.key === 'p' || e.key === '1') finish('play');
      else if ((e.key === 'r' || e.key === '2')) finish(reserveFull ? 'playReserve' : 'reserve');
    };
    document.addEventListener('keydown', onKey);
  });
}

async function playRound() {
  const P = G.p, E = G.e;
  G.round++;
  $('#round-no').textContent = G.round;
  $('#round-max').textContent = G.maxRounds;
  hideBanners();
  setHint('');

  // 1. DRAW
  P.drawn = drawFrom('p'); E.drawn = drawFrom('e');
  const pHand = cardEl(P.drawn, { down: true });
  const eHand = cardEl(E.drawn, { down: true });
  Sfx.draw();
  fly(eHand, $('#e-hand'), { from: rectOf($('#e-pile')), dur: 420, check: false });
  await fly(pHand, $('#p-hand'), { from: rectOf($('#p-pile')), faceUp: true, dur: 520 });
  await wait(200);

  // 2. PLAY OR RESERVE
  const choice = await askPlayer(pHand);
  if (G.over) return;
  const eChoice = aiChoose({ drawn: E.drawn, reserve: E.reserve, deckIds: findDeck(E.deckId).heroes, ctx: sideCtx('e') });

  let pCard, pEl, pFromRes = false, pBlind = false;
  if (choice === 'play') {
    pCard = P.drawn; pEl = pHand; Sfx.place();
    Voice.play(pCard.id); // Syauqie: your hero says a line when you play it
  await HFX.move(pEl, $('#p-slot'));
  } else if (choice === 'reserve') {
    P.reserve = P.drawn; Sfx.place();
    await fly(pHand, $('#p-reserve'));
    $('#p-reserve').classList.add('full');
    setHint('Saved to Reserve. Playing your top deck card…');
    pCard = drawFrom('p'); pBlind = true;
    pEl = cardEl(pCard, { down: true });
    Sfx.draw();
    await fly(pEl, $('#p-slot'), { from: rectOf($('#p-pile')) });
  } else {
    const rEl = $('#p-reserve .card');
    pCard = P.reserve; P.reserve = null; pFromRes = true; pEl = rEl;
    $('#p-reserve').classList.remove('full');
    Sfx.place();
    Voice.play(pCard.id); // Syauqie: your hero says a line when you play it
  await HFX.move(pEl, $('#p-slot'));
    P.deck.unshift(P.drawn); updateCounts();
    flyAway(pHand, rectOf($('#p-pile')), { dur: 360 });
  }
  P.drawn = null;

  // enemy acts
  setHint('Enemy is choosing…');
  await wait(450);
  let eCard, eEl, eFromRes = false;
  if (eChoice === 'play') {
    eCard = E.drawn; eEl = eHand; Sfx.place();
    await fly(eEl, $('#e-slot'));
  } else if (eChoice === 'reserve') {
    E.reserve = E.drawn;
    await fly(eHand, $('#e-reserve'), { faceUp: true });
    $('#e-reserve').classList.add('full');
    toast('Enemy saved a card to Reserve');
    Sfx.place();
    eCard = drawFrom('e');
    eEl = cardEl(eCard, { down: true });
    await fly(eEl, $('#e-slot'), { from: rectOf($('#e-pile')) });
  } else {
    const rEl = $('#e-reserve .card');
    eCard = E.reserve; E.reserve = null; eFromRes = true; eEl = rEl;
    $('#e-reserve').classList.remove('full');
    toast('Enemy plays its Reserve card');
    Sfx.place();
    await fly(eEl, $('#e-slot'));
    E.deck.unshift(E.drawn); updateCounts();
    flyAway(eHand, rectOf($('#e-pile')), { dur: 360 });
  }
  E.drawn = null;
  setHint('');

  await battle(pCard, pEl, pFromRes, pBlind, eCard, eEl, eFromRes);
  for (const s of ['p', 'e']) if (G[s].reserve) G[s].reserve.heldRounds = (G[s].reserve.heldRounds || 0) + 1;
}

/* Reveal, abilities, compare, push and clean up. Shared by both game modes. */
async function battle(pCard, pEl, pFromRes, pBlind, eCard, eEl, eFromRes) {
  const P = G.p, E = G.e;
  // 3. REVEAL
  await wait(350);
  eEl.classList.remove('down');
  if (pBlind) { pEl.classList.remove('down'); Voice.play(pCard.id); }
  Sfx.flip();
  await wait(550);
  Sfx.reveal();
  await wait(450);
  await HFX.reveal([[pEl, pCard.id, 'p'], [eEl, eCard.id, 'e']]);

  // 4. ABILITIES
  const inP = { id: pCard.id, bonus: pCard.bonus, silenced: !!pCard.silenced, ctx: sideCtx('p', { fromReserve: pFromRes, heldRounds: pCard.heldRounds || 0, discardPick: P.discardPick }) }, inE = { id: eCard.id, bonus: eCard.bonus, silenced: !!eCard.silenced, ctx: sideCtx('e', { fromReserve: eFromRes, heldRounds: eCard.heldRounds || 0, discardPick: E.discardPick }) };
  P.discardPick = E.discardPick = null;
  // Online, both players resolve the battle in the host's order with the shared seed, so results match.
  const flip = !!(G.online && G.online.flip);
  const rc = G.online ? resolve(flip ? { p: inE, e: inP } : { p: inP, e: inE }, G.rng.battle) : resolve({ p: inP, e: inE });
  const r = flip ? swapResult(rc) : rc;
  const els = { p: pEl, e: eEl };
  const base = { p: basePower(pCard), e: basePower(eCard) };
  for (const ev of r.events) await showEvent(ev, els, base);
  if (r.events.length) { $('#callout').classList.remove('show'); await wait(250); }

  // 5. COMPARE
  setPower(pEl, r.powers.p, base.p); setPower(eEl, r.powers.e, base.e);
  const res = $('#result');
  $('#vs').style.opacity = 0;
  if (r.winner) {
    els[r.winner].classList.add('won');
    els[other(r.winner)].classList.add('lost');
    if (r.winner === 'p') Sfx.win(); else Sfx.lose();
    const pushTxt = G.ctrl ? (r.push === 0 ? 'Nobody scores' : r.push >= 2 ? 'Scores ' + Math.min(r.push, CTRL_WIN) : 'Scores 1') : r.push === 0 ? 'Robot holds' : r.push > 2 ? 'Game won' : r.push === 2 ? 'Push 2' : 'Push 1';
    res.innerHTML = (r.winner === 'p' ? 'You win' : G.online ? 'Friend wins' : 'Enemy wins') + `<small>${r.powers.p} vs ${r.powers.e} · ${pushTxt}</small>`;
    res.className = 'result show ' + (r.winner === 'p' ? 'ally' : 'enemy');
  } else {
    Sfx.draw0();
    res.innerHTML = `Draw<small>${r.powers.p} vs ${r.powers.e} · ${G.ctrl ? 'No one scores' : 'Robot holds'}</small>`;
    res.className = 'result show';
  }
  await wait(1100);

  // 6. PUSH
  if (G.ctrl) {
    const C = G.ctrl;
    if (r.winner && r.push) { C.w[r.winner] += Math.min(r.push, CTRL_WIN); Sfx.push(); }
    else if (r.winner) toast('Nobody scores this turn');
    if (r.pull && C.w.p !== C.w.e) { const lead = C.w.p > C.w.e ? 'p' : 'e'; C.w[lead]--; toast('Gravitic Flux: the leader loses 1 point'); Sfx.ability('swap'); }
    ctrlBoard();
  }
  else if (r.winner && r.push) {
    G.pos += r.winner === 'p' ? r.push : -r.push;
    G.pos = Math.max(-G.goal, Math.min(G.goal, G.pos));
    Sfx.push();
    updateTrack();
    const cart = $('#cart'); cart.classList.add('pushing'); cart.classList.toggle('face-l', r.winner === 'e'); cart.classList.remove('walk'); void cart.offsetWidth; cart.classList.add('walk');
    await wait(800);
  }
  if (!G.ctrl && r.pull && G.pos && Math.abs(G.pos) < G.goal) {
    G.pos -= Math.sign(G.pos);
    toast('Gravitic Flux pulls the robot toward the middle');
    Sfx.ability('swap'); updateTrack();
    await wait(800);
  }
  P.won = r.winner === 'p'; P.lost = r.winner === 'e';
  E.won = r.winner === 'e'; E.lost = r.winner === 'p';
  res.className = 'result';

  // cleanup: discard, or Tracer recalls to Reserve
  const toDiscard = [];
  P.played.push(pCard.id); E.played.push(eCard.id);
  for (const s of ['p', 'e']) {
    const card = s === 'p' ? pCard : eCard, el = els[s], Pl = G[s];
    el.classList.remove('won', 'lost', 'hacked');
    if (r.recall[s] && canHold(Pl)) {
      addBonus(card, r.recall[s], 'Recall');
      setPower(el, basePower(card), HEROES[card.id].power);
      floatNum(el, r.recall[s]);
      toast((s === 'p' ? 'Tracer' : 'Enemy Tracer') + ' recalls to ' + (Pl.hand ? 'hand' : 'Reserve') + ': now ' + basePower(card) + ' Power');
      if (Pl.hand) {
        card.held = true; Pl.hand.push(card);
        if (s === 'p') { syncSlots(); const slot = $('#' + HAND_SLOTS[P.slots.indexOf(card)]); toDiscard.push(fly(el, slot)); }
        else toDiscard.push(flyAway(el, rectOf($('#e-hand')), { dur: 400 }).then(renderEnemyHand));
      } else {
        Pl.reserve = card;
        const slot = $('#' + s + '-reserve');
        toDiscard.push(fly(el, slot).then(() => slot.classList.add('full')));
      }
    } else {
      Pl.discard.push(card);
      toDiscard.push(fadeOut(el, s === 'p' ? 1 : -1));
    }
  }
  await Promise.all(toDiscard);
  $('#vs').style.opacity = 1;

  updateCounts();
  // after-battle abilities: discards, swaps, buffs, turrets
  const dlen = { p: G.p.discard.length, e: G.e.discard.length };
  const msgs = !G.online ? applyAfter(r, G, { p: pCard, e: eCard })
    : applyAfter(rc, flip ? { p: G.e, e: G.p } : G, flip ? { p: eCard, e: pCard } : { p: pCard, e: eCard }, G.rng.battle, flip ? 'e' : 'p').map(m => (flip ? { ...m, side: swapSide(m.side), of: swapSide(m.of) } : m));
  // cards the abilities discarded, in the order the messages describe them; the piles hold off showing them until revealed
  const fresh = { p: G.p.discard.slice(dlen.p), e: G.e.discard.slice(dlen.e) }, held = { p: G.p.discard.length, e: G.e.discard.length };
  for (const s of ['p', 'e']) G[s].discard.length = dlen[s];
  const restore = () => { for (const s of ['p', 'e']) if (G[s].discard.length < held[s]) G[s].discard.push(...fresh[s].slice(G[s].discard.length - dlen[s])); };
  for (const m of msgs) {
    if (G.mode === 'hand') { renderHand(); renderEnemyHand(); }
    else for (const s of m.of === 'both' ? ['p', 'e'] : [m.of]) renderReserve(s);
    showTurrets();
    toast(m.text);
    Sfx.ability(m.text.includes('Turret') || m.text.includes('discards') ? 'weaken' : m.text.includes('swaps') ? 'swap' : 'boost');
    const s = m.of === 'both' ? null : m.of;
    if (s && (m.text.includes(' discards ') || m.text.includes('discard pile')) && G[s].discard.length < held[s]) {
      const card = fresh[s][G[s].discard.length - dlen[s]];
      G[s].discard.push(card);
      await revealDiscard(card, s, m.text.startsWith('Roadhog'));
      await wait(250);
    } else await wait(1250);
  }
  restore(); updateCounts();

  await settleChoices();

  if (G.ctrl) await ctrlAfterTurn();
  else if (Math.abs(G.pos) >= G.goal) await endGame(G.pos > 0 ? 'win' : 'lose', false);
  else if (G.round >= G.maxRounds) await endGame(G.pos > 0 ? 'win' : G.pos < 0 ? 'lose' : 'draw', true);
  else await wait(250);
}

/* Brigitte's Rally: each side may have 3 deck cards to choose from. */
async function settleChoices() {
  const id = gameId;
  for (const s of ['p', 'e']) {
    const Pl = G[s];
    if (!Pl.choice) continue;
    let uid;
    if (s === 'p') {
      uid = await pickCard(Pl);
      if (G.online) Net.send({ t: 'pick', round: 'c' + G.round, uid });
    } else if (G.online) {
      setHint('Your friend is choosing a card…');
      uid = await Net.pick('c' + G.round);
      setHint('');
    } else uid = aiChoice(Pl);
    if (id !== gameId) return;
    const amount = Pl.choice ? Pl.choice.amount : 1, c = takeChoice(Pl, uid);
    if (!c) continue;
    if (G.mode === 'hand') { renderHand(); renderEnemyHand(); } else renderReserve(s);
    updateCounts();
    toast(s === 'p' ? 'You take ' + HEROES[c.id].name + ' (+' + amount + ' Power).' : (G.online ? 'Your friend' : 'The enemy') + ' takes a card with Rally.');
    Sfx.ability('boost');
    await wait(900);
  }
}
function pickCard(Pl) {
  return new Promise(resolve => {
    const ov = $('#picker'), cards = Pl.deck.filter(c => Pl.choice.uids.includes(c.uid));
    ov.innerHTML = `<div class="pick"><h3>${escapeHtml(Pl.choice.by)} · Rally</h3><p>Choose a card for your ${G.mode === 'hand' ? 'hand' : 'Reserve'}. It gets +${Pl.choice.amount} Power.</p><div class="pick-row"></div></div>`;
    const row = ov.querySelector('.pick-row');
    for (const c of cards) {
      const el = cardEl(c); el.tabIndex = 0;
      if (c.bonus) setPower(el, basePower(c), HEROES[c.id].power);
      el.onclick = () => { Sfx.click(); ov.hidden = true; ov.innerHTML = ''; resolve(c.uid); };
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') el.onclick(); };
      row.appendChild(el);
    }
    ov.hidden = false;
  });
}

function pickDiscard(cards) {
  return new Promise(resolve => {
    const ov = $('#picker');
    ov.innerHTML = '<div class="pick"><h3>Ashe · The Viper</h3><p>Choose a card from your hand to discard.</p><div class="pick-row"></div></div>';
    const row = ov.querySelector('.pick-row');
    for (const c of cards) {
      const el = cardEl(c); el.tabIndex = 0;
      if (c.bonus) setPower(el, basePower(c), HEROES[c.id].power);
      el.onclick = () => { Sfx.click(); ov.hidden = true; ov.innerHTML = ''; resolve(c.uid); };
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') el.onclick(); };
      row.appendChild(el);
    }
    ov.hidden = false;
  });
}

/* ---------- Standard (hand of 3) mode ---------- */
const MODE_DESC = {
  hand: 'Push: keep 3 cards in hand and play 1 each round. A card that stays in your hand for a round becomes your Reserve.',
  classic: 'Quick Play: draw 1 card each round. Play it, or save it in your single Reserve slot.',
};
MODE_DESC.control = 'Control: 3 rounds, up to 5 turns each. Win more turns to take a round (3 wins ends it early). First to win 2 rounds wins the match.';
MODE_DESC.deathmatch = 'Deathmatch: you against 3 bots, hand of 3. The highest Power each turn scores a point. First to 4 points wins.';
function syncModeDesc() { setPowerMode(settings.mode); const d = $('#mode-desc'); if (d) d.textContent = MODE_DESC[PLAY_MODE === 'control' || PLAY_MODE === 'deathmatch' ? PLAY_MODE : settings.mode] || MODE_DESC.hand; }

/* ---------- Control mode: 3 rounds of up to 5 turns. 3 turn wins end a round early; after 5 turns more turn wins takes it, equal is a draw. First to 2 rounds wins. ---------- */
const CTRL_TURNS = 5, CTRL_WIN = 3, CTRL_NEED = 2, CTRL_ROUNDS = 3; // 3 rounds at most
/* In Control the robot is gone: these heroes keep their core ability but read the turn score instead. */
const CTRL_TEXT = {
  reinhardt: 'If he loses while you’re ahead, nobody scores.',
  wreckingball: '−1 per point the score is apart.',
  sigma: 'After battle: the leader loses 1 point.',
  mauga: 'Win: score 2. Lose: enemy scores 2.',
  brigitte: 'If she loses: your next win scores 2.',
  mizuki: 'He and next hero +1 per point you’re behind.',
};
const ctrlCards = () => !!((G && G.ctrl && !G.over) || (typeof DM !== 'undefined' && DM.live));
function abilityView(h) { return ctrlCards() && CTRL_TEXT[h.id] ? { ...h, ability: { ...h.ability, text: CTRL_TEXT[h.id] } } : h; }
function ctrlWords(t) {
  return t.replace(/Pushes the robot (\d+)!/, 'Scores $1!').replace('Carries the robot 2!', 'Scores 2!').replace('Pushes the robot 2.', 'Scores 2.')
    .replace('Enemy pushes 2.', 'Enemy scores 2.').replace('Wins the game!', 'Wins the round!').replace('The robot doesn’t move.', 'Nobody scores.')
    .replace(/the robot is (\d+) steps? from the middle/, 'the score is $1 apart').replace('from the robot’s position', 'from the score');
}
function ctrlBoard() {
  const C = G && G.ctrl, box = $('#ctrl-score'), lab = $('#ctrl-label');
  if (!box || !lab) return;
  box.hidden = lab.hidden = !C;
  if (!C) return;
  G.pos = C.w.p - C.w.e; // the score lead stands in for the robot, so robot abilities read it
  const pips = (n, of, cls) => Array.from({ length: of }, (_, i) => `<i class="${i < n ? cls : ''}"></i>`).join('');
  lab.innerHTML = `Round <b>${C.round}</b> · Turn <b>${Math.min(C.turn + 1, CTRL_TURNS)}</b> / ${CTRL_TURNS}`;
  box.innerHTML = `<div class="cs-side ally"><span class="cs-name">You</span><span class="cs-turns">${pips(C.w.p, CTRL_WIN, 'on')}</span><span class="cs-rounds">${pips(C.rw.p, CTRL_NEED, 'star')}</span></div>`
    + `<div class="cs-mid"><b>${C.w.p} – ${C.w.e}</b><small>turns this round</small></div>`
    + `<div class="cs-side enemy"><span class="cs-name">Enemy</span><span class="cs-turns">${pips(C.w.e, CTRL_WIN, 'on')}</span><span class="cs-rounds">${pips(C.rw.e, CTRL_NEED, 'star')}</span></div>`;
}
async function ctrlAfterTurn() {
  const C = G.ctrl;
  C.turn++;
  const done = C.w.p >= CTRL_WIN || C.w.e >= CTRL_WIN || C.turn >= CTRL_TURNS;
  if (!done) { ctrlBoard(); await wait(250); return; }
  const who = C.w.p > C.w.e ? 'p' : C.w.e > C.w.p ? 'e' : null;
  if (who) C.rw[who]++;
  C.log.push(who || 'draw');
  ctrlBoard();
  const res = $('#result');
  res.innerHTML = `${who === 'p' ? 'Round won' : who === 'e' ? 'Round lost' : 'Round drawn'}<small>Round ${C.round} · turns ${C.w.p} to ${C.w.e}</small>`;
  res.className = 'result show' + (who === 'p' ? ' ally' : who === 'e' ? ' enemy' : '');
  if (who === 'p') Sfx.win(); else if (who === 'e') Sfx.lose(); else Sfx.draw0();
  await wait(1600);
  res.className = 'result';
  if (C.rw.p >= CTRL_NEED || C.rw.e >= CTRL_NEED) { await endGame(C.rw.p > C.rw.e ? 'win' : 'lose', false); return; }
  if (C.log.length >= CTRL_ROUNDS) { await endGame(C.rw.p > C.rw.e ? 'win' : C.rw.p < C.rw.e ? 'lose' : 'draw', true); return; }
  C.round++; C.turn = 0; C.w = { p: 0, e: 0 };
  ctrlBoard();
  toast(`Round ${C.round} starts`);
  await wait(400);
}
const HAND_SLOTS = ['p-hand', 'p-reserve', 'p-hand3'];
function setModeLayout() {
  const hand = G.mode === 'hand';
  $('#board').classList.toggle('handmode', hand);
  HAND_SLOTS.forEach(id => $('#' + id).classList.remove('in-res'));
  $('#p-reserve').classList.toggle('reserve', !hand);
  const label = id => $('#' + id).closest('.zone').querySelector('.zone-label');
  label('p-hand').textContent = hand ? 'Hand' : 'New card';
  label('p-reserve').textContent = hand ? 'Hand' : 'Reserve';
  $('#p-hand .ph').textContent = hand ? 'Hand' : 'New card';
  $('#p-reserve .ph').innerHTML = hand ? 'Hand' : 'Reserve<br>empty';
  $('#e-hand').closest('.zone').querySelector('.zone-label').textContent = 'Hand';
  delete $('#e-hand').dataset.count;
}
/* Keep each kept card in the slot it already sits in; new cards fill the gaps. */
function syncSlots() {
  const P = G.p;
  P.slots = P.slots.map(c => (c && P.hand.includes(c) ? c : null));
  for (const c of P.hand) if (!P.slots.includes(c)) P.slots[P.slots.indexOf(null)] = c;
}
function renderHand() {
  syncSlots();
  G.p.slots.forEach((c, i) => {
    const slot = $('#' + HAND_SLOTS[i]), cur = slot.querySelector('.card');
    if (cur && c && cur.dataset.uid === c.uid && +cur.dataset.bonus === (c.bonus || 0)) return;
    if (cur) cur.remove();
    if (!c) return;
    const el = cardEl(c); el.dataset.bonus = c.bonus || 0;
    if (c.bonus) setPower(el, basePower(c), HEROES[c.id].power);
    slot.appendChild(el); fx(el, 'fx-buff', 700);
  });
  G.p.slots.forEach((c, i) => $('#' + HAND_SLOTS[i]).classList.toggle('in-res', !!(c && c.held)));
}
function renderEnemyHand() {
  const slot = $('#e-hand'), n = G.e.hand.length;
  slot.querySelectorAll('.card').forEach(c => c.remove());
  if (n) { const el = cardEl(G.e.hand[0], { down: true }); slot.appendChild(el); slot.dataset.count = n; }
  else delete slot.dataset.count;
}
const TOUCH = () => matchMedia('(hover: none)').matches;
function askHand() {
  return new Promise(resolve => {
    const P = G.p, els = P.slots.map((c, i) => (c ? $('#' + HAND_SLOTS[i] + ' .card') : null));
    let done = false;
    const finish = card => {
      if (done) return; done = true;
      Sfx.init(); Sfx.click();
      els.forEach(e => { if (e) { e.classList.remove('clickable', 'peek'); e.onclick = null; } });
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', unpeek, true);
      clearSynergies(); $('#actions').innerHTML = '';
      resolve(card);
    };
    P.slots.forEach((c, i) => {
      if (!c) return;
      const others = P.hand.filter(x => x !== c);
      setReady(els[i], readyBonus(c, sideCtx('p', { fromReserve: !!c.held, heldRounds: c.heldRounds || 0, ...reserveView({ hand: others, myDiscards: P.myDiscards }) })));
      els[i].classList.add('clickable');
      // phones: the first tap shows the card up close, a second tap plays it
      els[i].onclick = () => {
        if (!TOUCH() || els[i].classList.contains('peek')) return finish(c);
        Sfx.init(); Sfx.click();
        els.forEach(e => e && e.classList.remove('peek'));
        els[i].style.setProperty('transform-origin', i === 0 ? 'left bottom' : i === els.length - 1 ? 'right bottom' : 'center bottom');
        els[i].classList.add('peek');
        setHint('Tap ' + HEROES[c.id].name + ' again to play it.');
      };
    });
    // tapping anywhere outside the lifted card puts it back
    const unpeek = e => {
      const up = els.find(x => x && x.classList.contains('peek'));
      if (!up || up.contains(e.target)) return;
      up.classList.remove('peek');
      setHint('Tap a hero to see it, then tap again to play it.');
      if (!els.some(x => x && x !== up && x.contains(e.target))) { e.stopPropagation(); e.preventDefault(); }
    };
    document.addEventListener('click', unpeek, true);
    setHint(TOUCH() ? 'Tap a hero to see it, then tap again to play it.' : 'Tap a hero to play it. Cards that stay in your hand for a round become your Reserve.');
    const onKey = e => { const i = +e.key - 1; if (i >= 0 && i < 3 && P.slots[i]) finish(P.slots[i]); };
    document.addEventListener('keydown', onKey);
  });
}
async function playRoundHand() {
  const P = G.p, E = G.e;
  G.round++;
  $('#round-no').textContent = G.round;
  $('#round-max').textContent = G.maxRounds;
  hideBanners(); setHint('');
  // 1. DRAW up to 3
  const flights = [];
  while (P.hand.length < HAND_SIZE) {
    const c = drawFrom('p'); if (!c) break;
    c.held = false; P.hand.push(c); syncSlots();
    const el = cardEl(c, { down: true }); el.dataset.bonus = c.bonus || 0;
    Sfx.draw();
    flights.push(fly(el, $('#' + HAND_SLOTS[P.slots.indexOf(c)]), { from: rectOf($('#p-pile')), faceUp: true, dur: 520 }));
    await wait(160);
  }
  while (E.hand.length < HAND_SIZE) { const c = drawFrom('e'); if (!c) break; c.held = false; E.hand.push(c); }
  renderEnemyHand();
  await Promise.all(flights);
  await wait(200);
  // 2. CHOOSE
  const pCard = await askHand();
  if (G.over) return;
  if (G.online) Net.send({ t: 'pick', round: G.round, uid: pCard.uid });
  // Ashe · The Viper: you pick which hand card she discards
  if (pCard.id === 'ashe' && !pCard.silenced) {
    const opts = P.hand.filter(c => c !== pCard && !UNDISCARDABLE(c.id));
    P.discardPick = opts.length > 1 ? await pickDiscard(opts) : opts.length ? opts[0].uid : null;
    if (G.over) return;
    if (G.online) Net.send({ t: 'pick', round: 'a' + G.round, uid: P.discardPick });
  }
  const i = G.online ? null : aiChooseHand({ hand: E.hand, ctxFor: c => sideCtx('e', { fromReserve: !!c.held, heldRounds: c.heldRounds || 0, ...reserveView({ hand: E.hand.filter(x => x !== c), myDiscards: E.myDiscards }) }) });
  const pEl = $('#' + HAND_SLOTS[P.slots.indexOf(pCard)] + ' .card');
  const pFromRes = !!pCard.held;
  P.hand.splice(P.hand.indexOf(pCard), 1); syncSlots();
  Sfx.place();
  Voice.play(pCard.id); // Syauqie: your hero says a line when you play it
  await HFX.move(pEl, $('#p-slot'));
  setHint(G.online ? 'Waiting for your friend…' : 'Enemy is choosing…');
  let eIdx = i;
  if (G.online) {
    const id = gameId, uid = await Net.pick(G.round);
    if (id !== gameId || G.over) return;
    eIdx = E.hand.findIndex(c => c.uid === uid);
    if (eIdx < 0) { Net.fail('Your games got out of step. Please start a new match.'); return; }
  } else await wait(450);
  if (G.online && E.hand[eIdx].id === 'ashe' && !E.hand[eIdx].silenced) {
    const id = gameId, uid = await Net.pick('a' + G.round);
    if (id !== gameId || G.over) return;
    E.discardPick = uid;
  }
  const eCard = E.hand.splice(eIdx, 1)[0], eFromRes = !!eCard.held;
  const eEl = cardEl(eCard, { down: true });
  renderEnemyHand();
  Sfx.place();
  await fly(eEl, $('#e-slot'), { from: rectOf($('#e-hand')) });
  setHint('');
  await battle(pCard, pEl, pFromRes, false, eCard, eEl, eFromRes);
  for (const s of ['p', 'e']) G[s].hand.forEach(c => { c.held = true; c.heldRounds = (c.heldRounds || 0) + 1; });
  if (!G.over) renderHand();
}

/* Redraw a Reserve slot from state (after swaps, discards, buffs). */
function renderReserve(s) {
  const slot = $('#' + s + '-reserve'), Pl = G[s];
  $$('#' + s + '-reserve .card').forEach(c => c.remove());
  slot.classList.toggle('full', !!Pl.reserve);
  if (!Pl.reserve) return;
  const el = cardEl(Pl.reserve);
  if (Pl.reserve.bonus) setPower(el, basePower(Pl.reserve), HEROES[Pl.reserve.id].power);
  slot.appendChild(el);
  fx(el, 'fx-buff', 700);
}
function showTurrets() {
  for (const s of ['p', 'e']) {
    const n = G[s].turret || 0, slot = $('#' + s + '-slot');
    const left = x => (x.until === 'win' ? ' till win' : x.turns > 1 ? ' ×' + x.turns : '');
    const tags = (G[s].next || []).map(x => (x.role ? ROLES[x.role].label + 's ' : '') + (x.give === 'boost' ? '+' + x.amount : x.give === 'protect' ? 'Shield' : x.give === 'bigPush' ? 'Push 2' : x.give === 'cleanse' ? 'Suzu' : x.give === 'suzu' ? '+' + x.amount + ' Suzu' : 'Grip') + left(x));
    if (n) tags.push('Turret −' + n);
    if (G[s].hackedNext) tags.push('Hacked');
    const cursed = (G[s].curse || []).length > 0;
    for (const c of G[s].curse || []) tags.push(c.by + ' −' + c.amount + (c.turns > 1 ? ' ×' + c.turns : ''));
    if (tags.length) slot.dataset.turret = tags.join(' · '); else delete slot.dataset.turret;
    slot.classList.toggle('buffed', tags.length > 0 && !n && !G[s].hackedNext && !cursed);
  }
}
const KIND_FX = { weaken: 'fx-hit', steal: 'fx-hit', deflect: 'fx-hit', hack: 'fx-hack', barrier: 'fx-shield', boost: 'fx-buff', swap: 'fx-swap', random: 'fx-buff', antiboost: 'fx-shield', winTies: 'fx-buff', closeCall: 'fx-shield', bigPush: 'fx-buff', risky: 'fx-hit', noPush: 'fx-shield', copy: 'fx-swap', freeze: 'fx-shield', convert: 'fx-buff', decay: 'fx-hit', hook: 'fx-hit' };
async function showEvent(ev, els, base) {
  const c = $('#callout');
  c.classList.remove('show');
  await wait(120);
  c.querySelector('.ct').textContent = ev.title;
  c.querySelector('.cx').textContent = G.ctrl ? ctrlWords(ev.text) : ev.text;
  c.classList.toggle('enemy', ev.side === 'e');
  c.classList.add('show');
  fx(els[ev.side], 'casting', 900);
  Sfx.ability(ev.kind);
  const target = ev.target ? els[ev.target] : els[ev.side];
  if (ev.kind === 'hack') { els[ev.target].classList.add('hacked'); }
  if (ev.title.startsWith('B.O.B.')) { const b = ev.side === 'p' ? $$('#p-hand .card, #p-reserve .card, #p-hand3 .card').find(c => c.dataset.hero === 'bob') : $('#e-reserve .card, #e-hand .card'); if (HFX.on()) await HFX.bobJump(b, ev.target ? els[ev.target] : els[ev.side]); else if (b) fx(b, 'casting', 900); }
  if (ev.title.startsWith('Wuyang')) { const wy = ev.side === 'p' ? $$('#p-hand .card, #p-reserve .card, #p-hand3 .card').find(c => c.dataset.hero === 'wuyang') : $('#e-hand, #e-reserve'); if (HFX.on()) await HFX.wuyangGive(wy, els[ev.side], HEROES.wuyang.fx.amount); else fx(els[ev.side], 'fx-buff', 900); }
  if (ev.kind === 'random') {
    // spin the number before landing
    const sp = els[ev.side].querySelector('.power span');
    for (let i = 0; i < 8; i++) { sp.textContent = 1 + Math.floor(Math.random() * 10); await wait(55); }
  }
  if (ev.kind === 'swap') { fx(els.p, 'fx-swap'); fx(els.e, 'fx-swap'); }
  else fx(target, KIND_FX[ev.kind] || 'fx-buff');
  if (ev.kind === 'weaken' || ev.kind === 'steal' || ev.kind === 'deflect' || ev.kind === 'decay' || ev.kind === 'hook') fx(target, 'hit', 500);
  if (ev.delta) floatNum(target, ev.delta);
  setPower(els.p, ev.powers.p, base.p);
  setPower(els.e, ev.powers.e, base.e);
  await wait(1350);
}

async function endGame(result, timeUp) {
  const won = result === 'win';
  G.over = true;
  $('#actions').innerHTML = '';
  setHint('');
  $('#board').classList.add('over');
  await wait(300);
  const end = $('#endscreen');
  const deck = G.online ? null : getDeck(G.p.deckId);
  const title = { win: 'Victory', lose: 'Defeat', draw: 'Draw' }[result];
  const line = G.ctrl ? (result === 'draw' ? `3 rounds played and nobody won 2. Rounds ${G.ctrl.rw.p} to ${G.ctrl.rw.e}.` : `${won ? 'You' : 'The enemy'} won ${G.ctrl.rw[won ? 'p' : 'e']} rounds to ${G.ctrl.rw[won ? 'e' : 'p']}.`) : timeUp
    ? (result === 'draw' ? `Round ${G.maxRounds} is over and the robot sits in the middle.` : `Round ${G.maxRounds} is over. The robot ended on ${won ? 'the enemy' : 'your'} side.`)
    : `${won ? 'Robot reached the enemy base' : G.online ? 'Your friend reached your base' : 'The enemy reached your base'} in ${G.round} round${G.round === 1 ? '' : 's'}.`;
  end.innerHTML = `<div class="end ${result}">
    <h2>${title}</h2>
    <p>${line}</p>
    <div class="row"><button class="btn" id="end-again">Play again</button><button class="btn ghost" id="end-deck">Change deck</button><button class="btn ghost" id="end-menu">Main menu</button></div>
  </div>`;
  if (G.online) end.querySelector('.row').innerHTML = '<button class="btn" id="end-again">Back to room</button><button class="btn ghost" id="end-menu">Leave room</button>';
  end.hidden = false;
  if (won) { Sfx.victory(); startConfetti(); } else if (result === 'lose') Sfx.defeat(); else Sfx.draw0();
  if (G.online) { Net.playing = false; $('#end-again').onclick = () => { Sfx.click(); Net.backToRoom(); }; $('#end-menu').onclick = () => { Sfx.click(); Net.leave(); quitGame('menu'); }; return; }
  $('#end-again').onclick = () => { Sfx.click(); newGame(deck.id); };
  $('#end-deck').onclick = () => { Sfx.click(); quitGame(G.mystery ? 'modes' : 'decksel'); };
  if (G.mystery) $('#end-deck').textContent = 'Change mode';
  $('#end-menu').onclick = () => { Sfx.click(); quitGame('menu'); };
}

function quitGame(to = 'menu') {
  gameId++;
  if (G) G.over = true;
  $('#endscreen').hidden = true;
  $('#picker').hidden = true;
  stopConfetti();
  show(to);
}

/* ---------- Confetti ---------- */
let confettiRAF = null;
function startConfetti() {
  const cv = $('#confetti'); cv.hidden = false;
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const cols = ['#ff9c1a', '#ffd36b', '#3cc8ff', '#f3f6fb', '#52e08a'];
  const parts = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .45,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4,
    w: 6 + Math.random() * 8, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  let t = 0;
  const step = () => {
    t++;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    }
    if (t < 260) confettiRAF = requestAnimationFrame(step); else stopConfetti();
  };
  cancelAnimationFrame(confettiRAF);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) step();
}
function stopConfetti() { cancelAnimationFrame(confettiRAF); const cv = $('#confetti'); cv.hidden = true; }

/* ---------- Inspect (right-click, long-press, or tap an enemy card) ---------- */
/* Lists what is changing a card's Power: lasting bonuses on the card, and effects waiting for that side's next hero. */
function modsHtml(card, s, waiting) {
  const h = HEROES[card.id], rows = [], Pl = G[s];
  const row = (by, text, good) => rows.push(`<li class="${good ? 'buff' : 'debuff'}"><b>${escapeHtml(by)}</b><span>${text}</span></li>`);
  let known = 0;
  for (const m of card.mods || []) if (m.silence) row(m.by, 'Hacked for the rest of the game', false);
  for (const m of card.mods || []) if (m.amount) { known += m.amount; row(m.by, (m.amount > 0 ? '+' : '−') + Math.abs(m.amount) + ' Power, permanent', m.amount > 0); }
  const rest = (card.bonus || 0) - known;
  if (rest) row('Earlier effects', (rest > 0 ? '+' : '−') + Math.abs(rest) + ' Power', rest > 0);
  if (waiting && Pl) {
    const lasts = x => x.until === 'win' ? 'until one of these heroes wins' : x.turns > 1 ? x.turns + ' heroes left' : 'next hero';
    for (const x of Pl.next || []) {
      if (x.role && x.role !== h.role) continue;
      const what = x.give === 'boost' ? '+' + x.amount + ' Power' : x.give === 'suzu' ? '+' + x.amount + ' Power, can’t be lowered' : x.give === 'protect' ? 'Power can’t be lowered' : x.give === 'bigPush' ? 'Pushes 2 if it wins' : x.give === 'closeCall' ? 'Losing by ' + x.amount + ' or less is a draw' : x.give === 'cleanse' ? 'Debuffs removed' : 'Helped';
      row(x.by, what + ' · ' + lasts(x), true);
    }
    for (const c of Pl.curse || []) row(c.by, '−' + c.amount + ' Power' + (c.antiheal ? ', can’t gain Power' : '') + ' · ' + lasts(c), false);
    if (Pl.turret) row('Turret', '−' + Pl.turret + ' Power · next hero', false);
    if (Pl.hackedNext) row('Hack', 'Ability cancelled · next hero', false);
  }
  const base = h.fx && h.fx.type === 'random' ? '1–10' : h.power;
  return `<div class="mods"><p>Base Power ${base}${card.bonus ? ' · now ' + basePower(card) : ''}</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p class="none">No buffs or debuffs.</p>'}</div>`;
}
function inspectCard(el) {
  const card = CARD_OF.get(el);
  if (!card || el.classList.contains('down') || !G || !G.p) return false;
  const s = el.closest('#e-slot, #e-reserve, #e-hand') ? 'e' : 'p', played = !!el.closest('#p-slot, #e-slot');
  openViewer(card, modsHtml(card, s, !played));
  return true;
}
let swallowClick = false, pressTimer = 0;
document.addEventListener('contextmenu', e => {
  const c = e.target.closest('#board .card');
  if (c && inspectCard(c)) e.preventDefault();
});
document.addEventListener('pointerdown', e => {
  const c = e.pointerType !== 'mouse' && e.target.closest('#board .card');
  if (!c) return;
  const x = e.clientX, y = e.clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { if (inspectCard(c)) swallowClick = true; }, 500);
  const cancel = ev => { if (ev.type !== 'pointermove' || Math.hypot(ev.clientX - x, ev.clientY - y) > 10) { clearTimeout(pressTimer); off(); } };
  const off = () => ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.removeEventListener(t, cancel));
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, cancel));
});
document.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('click', e => {
  const c = e.target.closest('#e-reserve .card:not(.down), #e-slot .card:not(.down)');
  if (c) inspectCard(c);
});
$('#inspect').addEventListener('click', () => { $('#inspect').hidden = true; });

/* ---------- Boot ---------- */
$('#btn-quit').onclick = () => { Sfx.click(); if (G && G.online) { Net.quitMatch(); return; } quitGame('menu'); };
$('#btn-sound').onclick = () => { settings.sound = !settings.sound; saveSettings(); Sfx.init(); Sfx.apply(); Music.apply(); syncSoundBtn(); Sfx.click(); };
document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
document.body.classList.toggle('cards-full', settings.cardStyle !== 'classic');
buildMenus();
syncSoundBtn();
show('menu');
