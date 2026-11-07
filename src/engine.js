/* ===== Payload Push: rules engine (no DOM) =====
   Every hero is one data entry. To add a hero, add a line to HEROES
   (and an emblem in art.js). Ability behaviour comes from `fx`.
   Synergy conditions (`when`) let heroes reward what sits in your Reserve
   or what you've already played, so saving a card is a real decision. */

const ROLES = {
  tank:    { label: 'Tank' },
  damage:  { label: 'Damage' },
  support: { label: 'Support' },
};
const MAX_ROUNDS = 15;

const H = (id, name, role, power, c1, c2, abName, abText, fx) =>
  [id, { id, name, role, power, colors: [c1, c2], ability: { name: abName, text: abText }, fx }];
const boost = (amount, when) => ({ type: 'boost', amount, when });
const weaken = (amount, when, bypass) => ({ type: 'weaken', amount, when, bypass });
const NONE = null; // a plain hero with no ability (Baptiste likes these)

const HEROES = Object.fromEntries([
  // ---- Tanks
  H('reinhardt', 'Reinhardt', 'tank', 7, '#c3ccd4', '#3f4c59', 'Barrier Field', 'If he loses while you’re winning, the robot stays.', { type: 'noPushOnLoss', when: { ahead: true } }),
  H('winston', 'Winston', 'tank', 7, '#9fb6dc', '#2f4068', 'Jump Pack', 'From Reserve: immune to enemy abilities.', { type: 'immune', when: { fromReserve: true } }),
  H('dva_baby', 'Baby D.Va', 'tank', 1, '#ffb3dc', '#a03478', 'Call Mech', 'Draw D.Va Mech.', { type: 'callMech', id: 'dva' }),
  H('dva', 'D.Va Mech', 'tank', 5, '#ff8cc6', '#5d1a49', 'Mech Up', 'Double Power if Baby D.Va was played.', { type: 'double', when: { played: 'dva_baby' } }),
  H('orisa', 'Orisa', 'tank', 8, '#a9d47a', '#2d5320', 'No ability', 'No tricks, just Power.', NONE),
  H('doomfist', 'Doomfist', 'tank', 7, '#d9b25c', '#38260c', 'Rocket Punch', 'After battle: swap Reserves.', { type: 'swapReserves' }),
  H('roadhog', 'Roadhog', 'tank', 10, '#b4a274', '#36301e', 'Chain Hook', 'Discard a random enemy Reserve card. He loses half its Power.', { type: 'hook', half: true }),
  H('zarya', 'Zarya', 'tank', 5, '#ff8ad8', '#5a1f55', 'Particle Barrier', 'Debuffs on her become buffs.', { type: 'convert' }),
  H('junkerqueen', 'Junker Queen', 'tank', 6, '#e2b46f', '#5a2a16', 'Rampage', 'Both sides discard a random Reserve card.', { type: 'discardReserves' }),
  H('wreckingball', 'Wrecking Ball', 'tank', 8, '#e9a24b', '#4a2c10', 'Grappling Claw', '−1 per step the robot is from the middle.', { type: 'distDecay', per: 1 }),
  H('sigma', 'Sigma', 'tank', 6, '#a7b0d6', '#26284c', 'Gravitic Flux', 'After battle: robot 1 step to the middle.', { type: 'pull' }),
  H('ramattra', 'Ramattra', 'tank', 3, '#9b7fe0', '#2a1c4f', 'Nemesis Form', '+1 per Support in your discard.', { type: 'pileBoost', role: 'support' }),
  H('mauga', 'Mauga', 'tank', 6, '#ff7a45', '#5b1d0f', 'Overrun', 'Win: push 2. Lose: enemy pushes 2.', { type: 'gamble' }),
  H('domina', 'Domina', 'tank', 5, '#7ad9e6', '#173f5c', 'Barrier Array', 'Swap Power with the enemy.', { type: 'swap' }),
  H('dmon_baby', 'Baby D.Mon', 'tank', 2, '#9fd0ff', '#2a4f9e', 'Ready Up', 'Powers up D.Mon Mech.', NONE),
  H('dmon', 'D.Mon Mech', 'tank', 10, '#7fb2ff', '#1c2f6b', 'Limit Break', '−4 unless Baby D.Mon was played.', { type: 'penalty', amount: 4, when: { played: 'dmon_baby' } }),
  H('hazard', 'Hazard', 'tank', 9, '#c58cf0', '#2e1640', 'Spike Guard', '−1 per Damage hero the enemy has played.', { type: 'decay', role: 'damage', per: 1 }), // Syauqie 2026-11-07: enemy side only, no cap
  // ---- Damage
  H('soldier', 'Soldier: 76', 'damage', 7, '#5383cc', '#14203b', 'No ability', 'No tricks, just Power.', NONE),
  H('cassidy', 'Cassidy', 'damage', 7, '#d27c45', '#4a2011', 'Deadeye', 'Discard enemy’s top card. Damage: +2, else −2.', { type: 'mill', amount: 2 }),
  H('genji', 'Genji', 'damage', 6, '#9af585', '#1a5832', 'Deflect', 'Debuffs on him hit the enemy.', { type: 'deflect' }),
  H('hanzo', 'Hanzo', 'damage', 6, '#7fb4ff', '#1b3260', 'Sonic Arrow', 'Hack an enemy Support. From Reserve: any hero.', { type: 'hack', when: { vsRole: 'support', orFromReserve: true } }),
  H('tracer', 'Tracer', 'damage', 4, '#ffb34f', '#bf3d0b', 'Recall', 'If she loses: back to hand. She and your hand +2.', { type: 'recall', amount: 2, hand: 2 }),
  H('widowmaker', 'Widowmaker', 'damage', 3, '#b08ad8', '#2a1840', 'Headshot', 'From Reserve: enemy −4. Unblockable.', weaken(4, { fromReserve: true }, true)),
  H('reaper', 'Reaper', 'damage', 6, '#7a2e40', '#100709', 'Death Blossom', 'Enemy Tank −2.', weaken(2, { vsRole: 'tank' })),
  H('pharah', 'Pharah', 'damage', 6, '#5698e6', '#123063', 'Barrage', 'Played a Tank, Damage and Support: enemy −4.', weaken(4, { allRoles: true })),
  H('junkrat', 'Junkrat', 'damage', 5, '#f6d462', '#86500f', 'RIP-Tire', 'Power is random, 1 to 10.', { type: 'random', min: 1, max: 10 }),
  H('sojourn', 'Sojourn', 'damage', 0, '#ff7d70', '#4b141c', 'Railgun', '+2 Power per round in Reserve, up to 10.', { type: 'charge', per: 2, cap: 10 }),
  H('ashe', 'Ashe', 'damage', 4, '#d9d3dd', '#352a3c', 'The Viper', 'Discard a card from your hand (you pick).', { type: 'asheDiscard' }),
  H('bob', 'B.O.B.', 'damage', 6, '#b9a58a', '#2b2a33', 'Get Him, B.O.B.!', 'If he is discarded, your hero in play gains his Power.', { type: 'bob' }),
  H('mei', 'Mei', 'damage', 7, '#a6e4ff', '#27638f', 'Cryo-Freeze', 'No Power changes in this battle. Buffs from hand stay.', { type: 'freeze', bypass: true }),
  H('symmetra', 'Symmetra', 'damage', 6, '#86e8ff', '#1f4f86', 'Teleporter', 'Win and loss swap. Ties stay.', { type: 'reverse' }),
  H('echo', 'Echo', 'damage', 6, '#a9f3ff', '#245f8f', 'Duplicate', 'Copies the enemy’s ability.', { type: 'copy' }),
  H('bastion', 'Bastion', 'damage', 1, '#9db58a', '#2d3d26', 'Artillery', 'Win this battle, win the game.', { type: 'winGame' }),
  H('torbjorn', 'Torbjörn', 'damage', 6, '#e08a5a', '#4a2414', 'Deploy Turret', 'Next enemy hero −2 (−3 from Reserve). Unblockable.', { type: 'turret', amount: 2, reserveAmount: 3, bypass: true }),
  H('venture', 'Venture', 'damage', 5, '#d6b77c', '#4b3a1d', 'Drill Dash', 'Enemy −2. If they win, next enemy −2.', { type: 'curse', now: 2, amount: 2, onWin: true }),
  H('freja', 'Freja', 'damage', 5, '#7fd0c8', '#1c4a48', 'Take Aim', '+3 if you’re losing.', boost(3, { behind: true })),
  H('vendetta', 'Vendetta', 'damage', 8, '#e25a5a', '#3d0f16', 'Wrath', 'Debuffs on her hit double.', { type: 'fragile', fragile: true }),
  H('emre', 'Emre', 'damage', 3, '#8fb0c9', '#1f3344', 'Siphon Blaster', 'Steals 2 Power.', { type: 'steal', amount: 2 }),
  H('anran', 'Anran', 'damage', 6, '#ff8a4a', '#6b1a0e', 'Fan the Flames', 'Discard a random enemy hand card. Its Power hits their deck as random −1s.', { type: 'discardHand' }),
  H('sierra', 'Sierra', 'damage', 6, '#6fd6a8', '#173f33', 'Tracker Shot', 'Wins all ties.', { type: 'winTies' }),
  H('shion', 'Shion', 'damage', 5, '#ff6fa8', '#3f0f2c', 'Satsuriku Spree', '+3 vs Damage heroes.', boost(3, { vsRole: 'damage' })),
  // ---- Support
  H('mercy', 'Mercy', 'support', 6, '#ffe9a3', '#d38a24', 'Resurrect', 'After battle: best discarded hero to empty Reserve.', { type: 'resurrect' }),
  H('sombra', 'Sombra', 'support', 4, '#b885ff', '#27104e', 'Hack', 'Hack the enemy now and next battle. Unblockable.', { type: 'hack', bypass: true, lingering: true }),
  H('brigitte', 'Brigitte', 'support', 6, '#f2b552', '#782d15', 'Catnapper', 'If she loses: your next win pushes 2.', { type: 'next', give: 'bigPush', until: 'win', onLose: true }), // Syauqie 2026-11-07: only when she loses the battle
  H('ana', 'Ana', 'support', 2, '#76a4ce', '#182b47', 'Biotic Grenade', 'Next 2 enemies −2 and can’t gain Power.', { type: 'curse', amount: 2, antiheal: true, turns: 2 }),
  H('lucio', 'Lúcio', 'support', 5, '#9be35f', '#245a1c', 'Speed Boost', 'Your next 3 Tanks +2.', { type: 'next', give: 'boost', amount: 2, turns: 3, role: 'tank' }),
  H('illari', 'Illari', 'support', 2, '#ffcf5c', '#7a3d0c', 'Healing Pylon', 'Your next 3 heroes +2.', { type: 'next', give: 'boost', amount: 2, turns: 3 }),
  H('zenyatta', 'Zenyatta', 'support', 3, '#f5d877', '#85631a', 'Discord Orb', 'After battle: every hero in the enemy deck −1.', { type: 'weakenDeck', all: true, amount: 1 }),
  H('moira', 'Moira', 'support', 6, '#c86bff', '#3a0d40', 'Biotic Grasp', 'After battle: drain 3 from enemy Reserve to yours.', { type: 'drainReserve', amount: 3 }),
  H('baptiste', 'Baptiste', 'support', 5, '#63d9ab', '#1b4d3c', 'Amplification Matrix', 'After battle: hack 2 of your cards for good, then no-ability heroes +3.', { type: 'buffDeck', plain: true, amount: 3, silence: 2 }),
  H('kiriko', 'Kiriko', 'support', 6, '#ff8f8f', '#5c1a26', 'Protection Suzu', 'Next 2 heroes: no debuffs or hacks. Clears debuffs in hand.', { type: 'next', give: 'suzu', amount: 0, turns: 2, cleanseHand: true }),
  H('lifeweaver', 'Lifeweaver', 'support', 6, '#ffc2e0', '#6a3a5c', 'Life Grip', 'Until you win, losing by 1 or less is a draw.', { type: 'next', give: 'closeCall', amount: 1, until: 'win' }),
  H('juno', 'Juno', 'support', 5, '#ff9ee8', '#3b1f6e', 'Orbital Ray', 'After battle: your deck +1.', { type: 'buffDeck', amount: 1, deckOnly: true }),
  H('mizuki', 'Mizuki', 'support', 3, '#c7a0ff', '#2e1d58', 'Katashiro Return', 'He and next hero +1 per robot step on your side.', { type: 'next', give: 'boost', amount: 1, perBehind: true, self: true }),
  H('jetpackcat', 'Jetpack Cat', 'support', 3, '#ffd36b', '#7a4a10', 'Rally', 'After battle: pick 1 of 3 deck cards. To Reserve, +3.', { type: 'tutor', count: 3, amount: 3 }),
  H('doctrine', 'Doctrine', 'support', 6, '#c0303f', '#1a0a12', 'Deliverance', 'After battle: enemy hand −1, your hand +1.', { type: 'handSwing', amount: 1 }),
  H('wuyang', 'Wuyang', 'support', 4, '#7fd8ff', '#14466b', 'Xuanwu Staff', 'After battle: your hand +1 per card you discarded with abilities. Can’t be discarded.', { type: 'handPerDiscard' }),
]);
// Sojourn starts at 0 in Hand of 3 but 4 in Classic, and counts as 4 toward a custom deck's Power limit.
Object.assign(HEROES.sojourn, { modePower: { hand: 0, classic: 4 }, deckPower: 4 });
function setPowerMode(mode) { for (const h of Object.values(HEROES)) if (h.modePower) h.power = h.modePower[mode] ?? h.modePower.hand; }
const chargeAmount = (fx, held, base) => Math.max(0, Math.min(fx.per * (held || 0), fx.cap != null ? fx.cap - base : fx.max));

const DECKS = [
  { id: 'heroes', name: 'Heroes', tag: 'Balanced', desc: 'Straightforward heroes, classic duos and the MEKA pilots. The best deck to learn with.',
    heroes: ['soldier', 'ana', 'reinhardt', 'brigitte', 'torbjorn', 'mercy', 'pharah', 'tracer', 'winston', 'dva_baby', 'dva', 'dmon_baby', 'dmon', 'cassidy', 'lucio', 'orisa', 'illari', 'shion', 'jetpackcat'] },
  { id: 'strike', name: 'Strike Force', tag: 'Aggressive', desc: 'Big Power and risky plays. Hit hard, push fast, live dangerously.',
    heroes: ['reaper', 'doomfist', 'freja', 'juno', 'wuyang', 'junkrat', 'roadhog', 'sojourn', 'ashe', 'bob', 'genji', 'junkerqueen', 'wreckingball', 'zarya', 'moira', 'anran', 'sierra', 'domina', 'emre'] },
  { id: 'tactical', name: 'Tactical', tag: 'Disruptive', desc: 'Hacks, swaps and debuffs that ruin enemy plans.',
    heroes: ['sombra', 'mei', 'symmetra', 'zenyatta', 'mauga', 'sigma', 'venture', 'echo', 'baptiste', 'widowmaker', 'hazard', 'lifeweaver', 'hanzo', 'kiriko', 'bastion', 'ramattra', 'vendetta', 'mizuki', 'doctrine'] },
];

function shuffle(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

let _uid = 0;
/* Small seeded random generator, so two players' games stay in step online. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* Player-built decks are added here by the UI. */
const EXTRA_DECKS = [];
/* Mystery Hero: no deck pick. Each side gets its own shuffled pile of every hero, so one side never draws the same hero twice. */
const MYSTERY_DECK = { id: 'mystery', name: 'Mystery', get heroes() { return Object.keys(HEROES); } };
const MYSTERY_ROUNDS = 20;
function findDeck(id) { return id === 'mystery' ? MYSTERY_DECK : DECKS.find(x => x.id === id) || EXTRA_DECKS.find(x => x.id === id); }
function makeDeck(deckId, rng) {
  const d = findDeck(deckId);
  return shuffle(d.heroes.map(id => ({ uid: 'c' + (++_uid), id, bonus: 0 })), rng);
}

/* ctx = { fromReserve, behind, steps (+ = Payload on enemy side), reserveFull, reserveId, wonLast, lostLast,
           played: [ids], foePlayed: [ids], hackedNext, turret (debuff waiting for this side), next: [buffs waiting for this side],
           reservePower, foeReservePower } */
const roleOf = id => HEROES[id].role;
function condMet(when, ctx, foeHero) {
  if (!when) return true;
  if (when.orFromReserve && ctx.fromReserve) return true;
  const played = ctx.played || [];
  if (when.vsRole && (!foeHero || foeHero.role !== when.vsRole)) return false;
  if (when.fromReserve && !ctx.fromReserve) return false;
  if (when.behind && !ctx.behind) return false;
  if (when.middle && (ctx.steps || 0) !== 0) return false;
  if (when.ahead && !((ctx.steps || 0) > 0)) return false;
  if (when.reserveFull && !ctx.reserveFull) return false;
  if (when.wonLast && !ctx.wonLast) return false;
  if (when.lostLast && !ctx.lostLast) return false;
  const res = ctx.reserveIds || (ctx.reserveId ? [ctx.reserveId] : []);
  if (when.reserveHas && !res.includes(when.reserveHas)) return false;
  if (when.reserveNoAbility && !res.some(id => !HEROES[id].fx)) return false;
  if (when.played && !played.includes(when.played)) return false;
  if (when.playedAny && !when.playedAny.some(id => played.includes(id))) return false;
  if (when.allRoles && !['tank', 'damage', 'support'].every(r => played.some(id => roleOf(id) === r))) return false;
  if (when.noRolePlayed && played.some(id => roleOf(id) === when.noRolePlayed)) return false;
  return true;
}
/* Conditions that depend only on your own side, so the UI can show "ready" before the reveal. */
const SELF_CONDS = ['fromReserve', 'behind', 'middle', 'ahead', 'reserveFull', 'wonLast', 'lostLast', 'reserveHas', 'reserveNoAbility', 'played', 'playedAny', 'allRoles', 'noRolePlayed'];
function isSelfCond(when) { return !!when && Object.keys(when).every(k => SELF_CONDS.includes(k)); }

function scaleAmount(fx, ctx) {
  if (fx.by === 'playedRole') return fx.per * (ctx.played || []).filter(id => roleOf(id) === fx.role).length;
  const steps = fx.by === 'ahead' ? Math.max(0, ctx.steps || 0) : Math.max(0, -(ctx.steps || 0));
  return fx.per * steps;
}
function decayAmount(fx, ctx) {
  const n = [...(ctx.foePlayed || []), ...(fx.both ? ctx.played || [] : [])].filter(id => roleOf(id) === fx.role).length * (fx.per || 1);
  return fx.max ? Math.min(n, fx.max) : n;
}

function condLabel(when) {
  if (!when) return '';
  if (when.vsRole) return 'vs ' + ROLES[when.vsRole].label;
  if (when.fromReserve) return 'from Reserve';
  if (when.behind) return 'robot on your side';
  if (when.middle) return 'robot in the middle';
  if (when.ahead) return 'you’re winning';
  if (when.reserveFull) return 'Reserve holds a card';
  if (when.wonLast) return 'won last battle';
  if (when.lostLast) return 'lost last battle';
  if (when.reserveHas) return HEROES[when.reserveHas].name + ' in Reserve';
  if (when.reserveNoAbility) return 'plain hero in Reserve';
  if (when.played) return HEROES[when.played].name + ' played';
  if (when.playedAny) return 'Talon ally played';
  if (when.allRoles) return 'all 3 roles played';
  if (when.noRolePlayed) return 'first ' + ROLES[when.noRolePlayed].label;
  return '';
}

/* How strong a "next hero" buff is when it's handed out. */
// Wuyang can't be discarded by any ability.
// Ashe's pick when nobody chooses (AI, sims): B.O.B. first, else the weakest card.
const ashePick = cards => cards.find(c => c.id === 'bob') || (cards.length ? cards.reduce((a, b) => (b.power < a.power ? b : a)) : null);
const UNDISCARDABLE = id => id === 'wuyang';
function nextAmount(fx, c) {
  if (fx.perBehind) return Math.max(1, -(c.steps || 0));
  if (fx.perDiscard) return fx.perDiscard === true ? c.discards || 0 : Math.min(fx.perDiscard, c.discards || 0);
  if (fx.reserveAmount && c.fromReserve) return fx.reserveAmount;
  return fx.amount;
}

/* resolve({p:{id, bonus, ctx}, e:{id, bonus, ctx}}) -> outcome with an ordered event list.
   Order: Duplicate -> Shield Bash -> Hacks -> Freeze -> Turret -> RIP-Tire -> Teleporter -> Power changes -> compare -> push.
   `after` lists what happens once the battle is over (discards, swaps, permanent buffs, turrets). */
function resolve(input, rng = Math.random) {
  const other = s => (s === 'p' ? 'e' : 'p');
  const S = {};
  for (const s of ['p', 'e']) {
    const hero = HEROES[input[s].id];
    const power = hero.power + (input[s].bonus || 0);
    S[s] = { side: s, hero, ctx: input[s].ctx || {}, fx: hero.fx && !input[s].silenced ? { ...hero.fx } : null, abName: hero.ability.name, power, start: power, hacked: false, bonus: input[s].bonus || 0 };
  }
  const events = [];
  const after = [];
  const snap = () => ({ p: S.p.power, e: S.e.power });
  const ev = (side, kind, text, extra = {}) => events.push({ side, kind, title: S[side].hero.name + ' · ' + S[side].abName, text, powers: snap(), ...extra });
  const has = (s, type) => !!(S[s].fx && S[s].fx.type === type);
  const immune = s => has(s, 'immune') && condMet(S[s].fx.when, S[s].ctx);
  // Buffs waiting for this side; a role-limited one (Lúcio) only helps that role.
  const nextFor = s => (S[s].ctx.next || []).filter(n => !n.role || n.role === S[s].hero.role);
  for (const s of ['p', 'e']) { const k = nextFor(s).find(n => n.give === 'suzu'); if (k) S[s].suzu = k.by + ' · ' + k.name; }
  const shielded = s => immune(s) || !!S[s].suzu;

  // 1. Duplicate
  for (const s of ['p', 'e']) {
    const me = S[s], foe = S[other(s)];
    if (has(s, 'copy')) {
      const src = foe.hero.fx;
      if (!src || src.type === 'copy') { me.fx = null; ev(s, 'copy', 'Nothing to copy.'); }
      else { me.fx = { ...src }; ev(s, 'copy', 'Copies ' + foe.hero.ability.name + '!'); me.abName = 'Duplicate: ' + foe.hero.ability.name; }
    }
  }
  // 2. Shield Bash stops "can't be blocked" abilities
  for (const s of ['p', 'e']) {
    const foe = S[other(s)];
    if (has(s, 'antiBypass') && foe.fx && foe.fx.bypass) { ev(s, 'barrier', 'Blocks ' + foe.abName + '.', { target: s }); foe.fx = null; foe.hacked = true; }
  }
  // 3. Hacks (simultaneous)
  const hacks = ['p', 'e'].filter(s => has(s, 'hack') && condMet(S[s].fx.when, S[s].ctx, S[other(s)].hero) && S[other(s)].fx);
  const hits = { p: 0, e: 0 };
  for (const s of hacks) {
    const t = other(s);
    if (immune(t)) ev(t, 'barrier', 'Jumps clear of ' + S[s].abName + '.', { target: t });
    else if (S[t].suzu) events.push({ side: t, kind: 'barrier', title: S[t].suzu, text: 'Keeps ' + S[t].hero.name + '’s ability safe.', powers: snap(), target: t });
    else ev(s, 'hack', S[t].hero.name + '’s ability is disabled.', { target: t });
  }
  for (const s of hacks) { const t = other(s); if (!shielded(t)) { S[t].fx = null; S[t].hacked = true; hits[t]++; } }
  for (const t of ['p', 'e']) {
    if (S[t].ctx.hackedNext && S[t].fx && !shielded(t)) {
      events.push({ side: other(t), kind: 'hack', title: 'Sombra · Hack', text: S[t].hero.name + '’s ability is still hacked.', powers: snap(), target: t });
      S[t].fx = null; S[t].hacked = true;
    }
  }
  // 4. Cryo-Freeze: nothing below this point can change Power
  const freezer = ['p', 'e'].find(s => has(s, 'freeze'));
  const frozen = !!freezer;
  if (frozen) ev(freezer, 'freeze', 'Both heroes are frozen. No Power changes!');

  const anti = s => has(other(s), 'antiboost');
  const gain = (s, amt, text, kind = 'boost', title) => {
    if (amt <= 0 || frozen) return false;
    if (S[s].antiheal) { events.push({ side: other(s), kind: 'antiboost', title: S[s].antiheal, text: 'Blocks ' + S[s].hero.name + '’s bonus.', powers: snap(), target: s }); return false; }
    if (anti(s)) { ev(other(s), 'antiboost', 'Blocks ' + S[s].hero.name + '’s bonus.', { target: s }); return false; }
    if (has(s, 'overclock')) { const o = S[s].fx.amount || 1; amt += o; text += ' Overclock +' + o + '!'; }
    S[s].power += amt;
    if (title) events.push({ side: s, kind, title, text, powers: snap(), target: s, delta: amt });
    else ev(s, kind, text, { target: s, delta: amt });
    return true;
  };
  /* t loses amt. src = side whose ability it is (or null for a turret). */
  const lower = (t, amt, text, kind, src, bypass, title) => {
    if (frozen || amt <= 0) return false;
    const foe = S[t];
    const say = (side, k, x, extra) => title ? events.push({ side, kind: k, title, text: x, powers: snap(), ...extra }) : ev(side, k, x, extra);
    if (immune(t)) { ev(t, 'barrier', 'Can’t be touched.', { target: t }); return false; }
    if (foe.suzu) { events.push({ side: t, kind: 'barrier', title: foe.suzu, text: 'Shields ' + foe.hero.name + '.', powers: snap(), target: t }); return false; }
    if (!bypass && foe.protected) { events.push({ side: t, kind: 'barrier', title: foe.protected, text: 'Shields ' + foe.hero.name + '.', powers: snap(), target: t }); return false; }
    if (!bypass) {
      if (has(t, 'barrier')) { ev(t, 'barrier', 'Blocks ' + (src ? S[src].abName : 'it') + '.', { target: t }); return false; }
      if (has(t, 'deflect') && src) {
        S[src].power = Math.max(0, S[src].power - amt);
        ev(t, 'deflect', 'Sends it back! ' + S[src].hero.name + ' −' + amt + ' Power.', { target: src, delta: -amt });
        return false;
      }
      if (has(t, 'convert')) {
        foe.power += amt; ev(t, 'convert', 'Absorbs the hit: +' + amt + ' Power!', { target: t, delta: amt }); hits[t]++; return false;
      }
      if (has(t, 'reduce')) {
        const cut = Math.min(amt, foe.fx.amount); amt -= cut;
        if (!amt) { ev(t, 'barrier', 'Grabs it out of the air.', { target: t }); return false; }
        ev(t, 'barrier', 'Softens the hit by ' + cut + '.', { target: t });
      }
    }
    if (foe.fx && foe.fx.fragile) amt *= 2;
    foe.power = Math.max(0, foe.power - amt); say(src || other(t), kind, text.replace('#', amt), { target: t, delta: -amt }); hits[t]++; return true;
  };

  // 5. Debuffs the enemy left for this hero (first, so Biotic Grenade stops buffs), then your Supports' buffs, then Turrets
  for (const t of ['p', 'e']) {
    for (const c of S[t].ctx.curse || []) {
      const title = c.by + ' · ' + c.name;
      if (c.antiheal && !frozen && !immune(t)) S[t].antiheal = title;
      lower(t, c.amount, S[t].hero.name + ' −# Power.', 'weaken', null, false, title);
    }
  }
  for (const s of ['p', 'e']) {
    for (const n of nextFor(s)) {
      const title = n.by + ' · ' + n.name;
      if (n.give === 'boost') gain(s, n.amount, S[s].hero.name + ' +' + n.amount + ' Power.', 'boost', title);
      else if (n.give === 'protect') { S[s].protected = title; events.push({ side: s, kind: 'barrier', title, text: S[s].hero.name + ' is shielded this battle.', powers: snap(), target: s }); }
      else if (n.give === 'bigPush') S[s].nextPush = title;
      else if (n.give === 'cleanse') S[s].cleanse = title;
      else if (n.give === 'suzu' && n.amount) gain(s, n.amount, S[s].hero.name + ' +' + n.amount + ' Power.', 'boost', title);
      else if (n.give === 'closeCall') S[s].nextClose = { title, margin: n.amount };
    }
  }
  for (const t of ['p', 'e']) {
    const n = S[t].ctx.turret || 0;
    if (n) lower(t, n, S[t].hero.name + ' −# Power.', 'weaken', null, true, 'Turret');
  }
  // 6. RIP-Tire
  for (const s of ['p', 'e']) {
    const me = S[s];
    if (has(s, 'random') && !frozen) {
      me.power = me.fx.min + Math.floor(rng() * (me.fx.max - me.fx.min + 1)) + me.bonus;
      ev(s, 'random', 'Rolls ' + me.power + ' Power!', { target: s, roll: true });
    }
  }
  // 7. Teleporter
  const swappers = ['p', 'e'].filter(s => has(s, 'swap'));
  if (frozen) { /* frozen */ }
  else if (swappers.length === 1) {
    const s = swappers[0], t = other(s), foe = S[t];
    if (has(t, 'barrier') || immune(t)) ev(t, 'barrier', 'Blocks the Teleporter.', { target: t });
    else { const x = S[s].power; S[s].power = foe.power; foe.power = x; hits[t]++; ev(s, 'swap', 'Swaps Power with ' + foe.hero.name + '.', { target: t }); }
  } else if (swappers.length === 2) {
    events.push({ side: 'p', kind: 'swap', title: 'Teleporter', text: 'Both teleporters cancel out.', powers: snap() });
  }
  // 7b. Discards happen before Power is counted
  const lostNow = { p: [], e: [] };
  const discardNow = (s, owner, card, verb) => {
    lostNow[owner].push(card);
    after.push({ kind: 'discard', side: s, of: owner, uid: card.uid, by: S[s].hero.name, order: 1 });
    ev(s, 'discard', verb + ' ' + HEROES[card.id].name + (HEROES[card.id].name.endsWith('.') ? '' : '.'), { target: owner });
    // B.O.B.: discarded during play, his Power joins his owner's hero
    if (card.id === 'bob') gain(owner, card.power, 'B.O.B. is discarded and joins the fight! +' + card.power + ' Power.', 'boost', 'B.O.B. · Get Him, B.O.B.!');
  };
  const pool = (list, side) => (list || []).filter(c => !UNDISCARDABLE(c.id) && !lostNow[side].some(x => x.uid === c.uid));
  for (const s of ['p', 'e']) {
    const me = S[s], t = other(s), fx = me.fx;
    if (!fx) continue;
    if (fx.type === 'asheDiscard') {
      const mine = pool(me.ctx.myHand, s), pick = mine.find(c => c.uid === me.ctx.discardPick) || ashePick(mine);
      if (pick) discardNow(s, s, pick, 'Discards your');
    } else if (fx.type === 'discardHand') {
      const theirs = pool(me.ctx.foeHand, t);
      if (theirs.length) {
        const pick = theirs[Math.floor(rng() * theirs.length)];
        discardNow(s, t, pick, 'Discards the enemy’s');
        if (pick.power > 0) after.push({ kind: 'weakenDeck', side: s, of: t, count: pick.power, amount: 1, scatter: true, by: S[s].hero.name, order: 2 });
      }
    } else if (fx.type === 'discardFoe') {
      const theirs = pool(me.ctx.foeReserve, t);
      if (theirs.length) discardNow(s, t, fx.best ? theirs.reduce((a, b) => (b.power > a.power ? b : a)) : theirs[Math.floor(rng() * theirs.length)], 'Discards the enemy’s');
    } else if (fx.type === 'discardReserves') {
      const mine = pool(me.ctx.myReserve, s), theirs = pool(me.ctx.foeReserve, t);
      if (mine.length) discardNow(s, s, mine[Math.floor(rng() * mine.length)], 'Discards your');
      if (theirs.length) discardNow(s, t, theirs[Math.floor(rng() * theirs.length)], 'Discards the enemy’s');
    } else if (fx.type === 'hook') {
      const theirs = pool(me.ctx.foeReserve, t);
      if (theirs.length) {
        const pick = theirs[Math.floor(rng() * theirs.length)];
        discardNow(s, t, pick, 'Hooks and discards the enemy’s');
        const a = Math.min(me.power, fx.half ? Math.ceil(pick.power / 2) : pick.power);
        if (a > 0 && !frozen) { me.power -= a; ev(s, 'hook', '−' + a + ' Power from the hook.', { target: s, delta: -a }); }
      }
    }
  }
  // 8. Power changes
  for (const s of ['p', 'e']) {
    const me = S[s], t = other(s), foe = S[t], fx = me.fx;
    if (!fx || frozen) continue;
    if (fx.type === 'charge') {
      const n = chargeAmount(fx, me.ctx.heldRounds, me.hero.power);
      if (n) gain(s, n, '+' + n + ' Power (charged for ' + me.ctx.heldRounds + ' round' + (me.ctx.heldRounds > 1 ? 's' : '') + ').');
    } else if (fx.type === 'boost') {
      if (condMet(fx.when, me.ctx, foe.hero)) gain(s, fx.amount, '+' + fx.amount + ' Power (' + condLabel(fx.when) + ').');
    } else if (fx.type === 'risky') {
      gain(s, fx.amount, '+' + fx.amount + ' Power. High risk!');
    } else if (fx.type === 'scale') {
      const a = scaleAmount(fx, me.ctx);
      if (a > 0) gain(s, a, '+' + a + ' Power' + (fx.by === 'playedRole' ? ' from ' + ROLES[fx.role].label + ' heroes played.' : ' from the robot’s position.'));
    } else if (fx.type === 'double') {
      if (condMet(fx.when, me.ctx)) gain(s, me.power, 'Power doubles (' + condLabel(fx.when) + ')!');
    } else if (fx.type === 'penalty') {
      if (!condMet(fx.when, me.ctx)) { const a = Math.min(me.power, fx.amount); me.power -= a; ev(s, 'decay', '−' + a + ' Power (' + condLabel(fx.when).replace('played', 'not played') + ').', { target: s, delta: -a }); }
    } else if (fx.type === 'next' && fx.self) {
      const a = nextAmount(fx, me.ctx);
      gain(s, a, '+' + a + ' Power from the robot’s position.');
    } else if (fx.type === 'pileBoost') {
      const now = lostNow[s].filter(c => !fx.role || HEROES[c.id].role === fx.role).length;
      const a = (fx.role ? me.ctx.pileRoles?.[fx.role] || 0 : Math.min(fx.max, me.ctx.pile || 0)) + now;
      gain(s, a, '+' + a + ' Power from ' + (fx.role ? ROLES[fx.role].label + ' heroes in ' : '') + 'your discard pile.');
    } else if (fx.type === 'mill') {
      const top = me.ctx.foeTop;
      if (top === 'bob') gain(t, HEROES.bob.power, 'B.O.B. is discarded and joins the fight! +' + HEROES.bob.power + ' Power.', 'boost', 'B.O.B. · Get Him, B.O.B.!');
      if (top && HEROES[top].role === 'damage') gain(s, fx.amount, 'Hits ' + HEROES[top].name + ' on top of the enemy deck: +' + fx.amount + ' Power.');
      else if (top) { const a = Math.min(me.power, fx.amount); me.power -= a; ev(s, 'decay', 'Hits ' + HEROES[top].name + ', not a Damage hero: −' + a + ' Power.', { target: s, delta: -a }); }
    } else if (fx.type === 'distDecay') {
      const a = Math.min(me.power, Math.abs(me.ctx.steps || 0) * (fx.per || 1));
      if (a > 0) { me.power -= a; ev(s, 'decay', '−' + a + ' Power: the robot is ' + Math.abs(me.ctx.steps) + ' step' + (Math.abs(me.ctx.steps) > 1 ? 's' : '') + ' from the middle.', { target: s, delta: -a }); }
    } else if (fx.type === 'decay') {
      const a = Math.min(me.power, decayAmount(fx, me.ctx));
      if (a > 0) { me.power -= a; ev(s, 'decay', '−' + a + ' Power from ' + (fx.both ? '' : 'enemy ') + ROLES[fx.role].label + ' heroes played.', { target: s, delta: -a }); }
    } else if (fx.type === 'curse') {
      if (fx.now) lower(t, fx.now, foe.hero.name + ' −# Power.', 'weaken', s, !!fx.bypass);
    } else if (fx.type === 'copyPower') {
      const v = me.ctx.foeReservePower;
      if (v != null && v > me.power) { const a = v - me.power; me.power = v; ev(s, 'boost', 'Copies ' + v + ' Power from the enemy’s Reserve card.', { target: s, delta: a }); }
    } else if (fx.type === 'weaken') {
      if (condMet(fx.when, me.ctx, foe.hero)) lower(t, fx.amount, foe.hero.name + ' −# Power.', 'weaken', s, fx.bypass);
    } else if (fx.type === 'steal') {
      if (lower(t, fx.amount, 'Drains # Power from ' + foe.hero.name + '.', 'steal', s)) gain(s, fx.amount, '+' + fx.amount + ' Power.');
    }
  }
  // Ramattra grows when hit; Kiriko undoes losses
  for (const s of ['p', 'e']) {
    if (has(s, 'onHit') && hits[s] && !frozen) gain(s, S[s].fx.amount, '+' + S[s].fx.amount + ' Power from being hit!');
    if (S[s].cleanse && S[s].power < S[s].start) { const a = S[s].start - S[s].power; S[s].power = S[s].start; events.push({ side: s, kind: 'barrier', title: S[s].cleanse, text: 'Cleanses ' + a + ' lost Power.', powers: snap(), target: s, delta: a }); }
  }
  // 9. Compare
  let winner = null;
  const d = S.p.power - S.e.power;
  if (d > 0) winner = 'p'; else if (d < 0) winner = 'e';
  if (d) {
    // Teleporter: the result flips (two of them cancel out). A tie stays a tie.
    const rev = ['p', 'e'].filter(s => has(s, 'reverse'));
    if (rev.length === 1) { winner = other(winner); ev(rev[0], 'swap', 'Reversed! The lower Power wins.', { target: rev[0] }); }
  }
  else {
    const t = ['p', 'e'].filter(s => has(s, 'winTies'));
    if (t.length === 1) { winner = t[0]; ev(winner, 'winTies', 'Wins the tie!', { target: winner }); }
  }
  if (winner) {
    const loser = S[other(winner)], gap = Math.abs(S.p.power - S.e.power);
    if (has(loser.side, 'closeCall') && gap <= loser.fx.margin) {
      ev(loser.side, 'closeCall', 'Pulled to safety! The battle is a draw.', { target: loser.side });
      winner = null;
    } else if (loser.nextClose && gap <= loser.nextClose.margin) {
      events.push({ side: loser.side, kind: 'closeCall', title: loser.nextClose.title, text: 'Pulls ' + loser.hero.name + ' to safety! The battle is a draw.', powers: snap(), target: loser.side });
      winner = null;
    }
  }
  // 10. Push
  let push = 0;
  const recall = { p: false, e: false };
  if (winner) {
    const w = winner, l = other(winner);
    push = 1;
    if (has(w, 'bigPush')) { push = S[w].fx.amount; ev(w, 'bigPush', 'Pushes the robot ' + push + '!', { target: w }); }
    if (S[w].nextPush) { push = Math.max(push, 2); events.push({ side: w, kind: 'bigPush', title: S[w].nextPush, text: 'Carries the robot 2!', powers: snap(), target: w }); }
    if (has(w, 'gamble')) { push = 2; ev(w, 'bigPush', 'Overrun! Pushes the robot 2.', { target: w }); }
    if (has(l, 'risky')) { push = 2; ev(l, 'risky', 'Shot down! Enemy pushes 2.', { target: l }); }
    if (has(l, 'gamble')) { push = 2; ev(l, 'risky', 'Overrun backfires! Enemy pushes 2.', { target: l }); }
    if (has(l, 'noPushOnLoss') && condMet(S[l].fx.when, S[l].ctx)) { push = 0; ev(l, 'noPush', 'The robot doesn’t move.', { target: l }); }
    if (has(l, 'recall')) { recall[l] = S[l].fx.amount || 1; if (S[l].fx.hand) after.push({ kind: 'buffHand', side: l, amount: S[l].fx.hand, by: S[l].hero.name, order: 5 }); }
    if (has(w, 'winGame')) { push = 99; ev(w, 'bigPush', 'Artillery! Wins the game!', { target: w }); }
  }
  const pull = ['p', 'e'].some(s => has(s, 'pull'));
  // 11. After the battle
  for (const s of ['p', 'e']) {
    const fx = S[s].fx, t = other(s);
    if (!fx) continue;
    if (fx.spend && S[s].ctx.reserveFull) after.push({ kind: 'discard', side: s, of: s, by: S[s].hero.name, order: 1 });
    if (fx.type === 'mill' && S[s].ctx.foeTop) after.push({ kind: 'mill', side: s, of: t, by: S[s].hero.name, order: 2 });
    if (fx.type === 'weakenDeck') after.push({ kind: 'weakenDeck', side: s, of: t, count: fx.count, all: !!fx.all, amount: fx.amount, by: S[s].hero.name, order: 5 });
    if (fx.type === 'callMech') after.push({ kind: 'callMech', side: s, id: fx.id, by: S[s].hero.name, order: 4 });
    if (fx.type === 'tutor') after.push({ kind: 'tutor', side: s, count: fx.count, amount: fx.amount, by: S[s].hero.name, order: 7 });
    if (fx.type === 'handPerDiscard') { const n = S[s].ctx.myDiscards || 0; if (n) after.push({ kind: 'buffHand', side: s, amount: n, by: S[s].hero.name, order: 5 }); }
    if (fx.type === 'swapReserves') after.push({ kind: 'swapReserves', side: s, by: S[s].hero.name, order: 3 });
    if (fx.type === 'resurrect') after.push({ kind: 'resurrect', side: s, by: S[s].hero.name, order: 4 });
    if (fx.type === 'buffReserve') after.push({ kind: 'buffReserve', side: s, amount: fx.amount, by: S[s].hero.name, order: 5 });
    if (fx.type === 'buffDeck') after.push({ kind: 'buffDeck', side: s, role: fx.role || null, plain: !!fx.plain, ids: fx.ids || null, deckOnly: !!fx.deckOnly, amount: fx.amount, silence: fx.silence || 0, by: S[s].hero.name, order: 5 });
    if (fx.type === 'drainReserve') after.push({ kind: 'drain', side: s, amount: fx.amount, by: S[s].hero.name, order: 5 });
    if (fx.type === 'next') {
      if (fx.cleanseHand) after.push({ kind: 'cleanseHand', side: s, by: S[s].hero.name, order: 5 });
      if ((!fx.when || condMet(fx.when, S[s].ctx)) && (!fx.onLose || (winner && winner !== s))) after.push({ kind: 'next', side: s, give: fx.give, amount: nextAmount(fx, S[s].ctx), turns: fx.turns || 1, until: fx.until || null, role: fx.role || null, name: S[s].abName, by: S[s].hero.name, order: 6 });
    }
    if (fx.type === 'hack' && fx.handHack && S[s].ctx.fromReserve) after.push({ kind: 'hackHand', side: s, of: t, by: S[s].hero.name, order: 6 });
    if (fx.type === 'hack' && fx.lingering) after.push({ kind: 'hackNext', side: s, of: t, by: S[s].hero.name, order: 6 });
    if (fx.type === 'curse' && (!fx.onWin || winner === s)) after.push({ kind: 'curse', side: s, of: t, amount: fx.amount, antiheal: !!fx.antiheal, turns: fx.turns || 1, name: S[s].abName, by: S[s].hero.name, order: 6 });
    if (fx.type === 'handSwing') after.push({ kind: 'handSwing', side: s, of: t, amount: fx.amount, by: S[s].hero.name, order: 5 });
    if (fx.type === 'turret') after.push({ kind: 'turret', side: s, of: t, amount: fx.reserveAmount && S[s].ctx.fromReserve ? fx.reserveAmount : fx.amount, by: S[s].hero.name, order: 6 });
  }
  after.sort((a, b) => a.order - b.order);
  return { events, powers: snap(), winner, push, recall, pull, after, hacked: { p: S.p.hacked, e: S.e.hacked } };
}

/* Reserve helpers. Classic mode: one Reserve card (side.reserve).
   Hand mode: side.hand holds your cards. A card counts as Reserve once it has stayed in your
   hand for a round (c.held); "your Reserve card" means the strongest of those. */
const cardPower = c => HEROES[c.id].power + (c.bonus || 0);
const heldCards = S => (S.hand ? S.hand.filter(c => c.held) : S.reserve ? [S.reserve] : []);
const mainReserve = S => { const h = heldCards(S); return h.length ? h.reduce((a, b) => (cardPower(b) > cardPower(a) ? b : a)) : null; };
function takeCard(S, c) { if (S.hand) S.hand.splice(S.hand.indexOf(c), 1); else S.reserve = null; }
function putCard(S, c) { if (S.hand) { c.held = true; S.hand.push(c); } else S.reserve = c; }
/* What a side knows about the enemy's Reserve. */
const foeView = Fo => { const h = heldCards(Fo), m = mainReserve(Fo); return { foeReservePower: m ? cardPower(m) : null, foeReserve: h.map(c => ({ uid: c.uid, id: c.id, power: cardPower(c) })), foeHand: (Fo.hand || h).map(c => ({ uid: c.uid, id: c.id, power: cardPower(c) })), foeTop: Fo.deck && Fo.deck.length ? Fo.deck[Fo.deck.length - 1].id : null }; };
const HAND_SIZE = 3;
function canHold(S) { return S.hand ? S.hand.length < HAND_SIZE : !S.reserve; }
function reserveView(S) {
  const h = heldCards(S), m = mainReserve(S), bob = h.find(c => c.id === 'bob');
  const view = c => ({ uid: c.uid, id: c.id, power: cardPower(c) });
  return { myReserve: h.map(view), myHand: (S.hand || heldCards(S)).map(view), myDiscards: S.myDiscards || 0, reserveFull: h.length > 0, reserveId: m ? m.id : null, reserveIds: h.map(c => c.id), reservePower: m ? cardPower(m) : null, bobPower: bob ? cardPower(bob) : null, pile: (S.discard || []).length, pileRoles: (S.discard || []).reduce((o, c) => (o[HEROES[c.id].role] = (o[HEROES[c.id].role] || 0) + 1, o), {}) };
}

/* Apply a battle's `after` list to the two sides' card state.
   sides = { p: {deck, discard, reserve | hand, turret, next}, e: {...} }. `played` = the cards that fought.
   Returns short messages for the UI. Cards are {uid, id, bonus}. */
function applyAfter(r, sides, played, rng = Math.random, mine = 'p') {
  const msgs = [];
  // Buffs and debuffs that were waiting for this battle tick down; ones with turns left stay.
  for (const x of ['p', 'e']) {
    const P = sides[x], role = played && played[x] ? HEROES[played[x].id].role : null;
    P.next = (P.next || []).filter(n => {
      if (n.role && n.role !== role) return true;
      if (n.until === 'win') return r.winner !== x;
      n.turns = (n.turns || 1) - 1; return n.turns > 0;
    });
    P.curse = (P.curse || []).filter(c => { c.turns = (c.turns || 1) - 1; return c.turns > 0; });
    P.turret = 0; P.hackedNext = false; P.choice = null;
  }
  const whose = s => (s === mine ? 'your' : 'the enemy’s');
  for (const a of r.after) {
    const me = sides[a.side];
    if (a.kind === 'discard') {
      const S = sides[a.of];
      const h = (a.uid && S.hand ? S.hand : heldCards(S)).filter(x => a.quiet || !UNDISCARDABLE(x.id));
      const c = a.quiet ? h.find(x => x.id === 'bob') : a.uid ? h.find(x => x.uid === a.uid) : a.random ? h[Math.floor(rng() * h.length)] : h.length ? h.reduce((x, y) => (cardPower(y) > cardPower(x) ? y : x)) : null;
      if (!c) continue;
      takeCard(S, c); if (!a.quiet) c.burned = true; S.discard.push(c);
      if (!a.quiet) { sides.p.discards = (sides.p.discards || 0) + 1; sides.e.discards = (sides.e.discards || 0) + 1; me.myDiscards = (me.myDiscards || 0) + 1; }
      msgs.push({ side: a.side, of: a.of, text: a.quiet ? 'B.O.B. heads back to the discard pile.' : a.by + ' discards ' + (a.random || a.uid ? HEROES[c.id].name + ' from ' + whose(a.of) + (S.hand && !c.held ? ' hand.' : ' Reserve.') : whose(a.of) + ' Reserve card (' + HEROES[c.id].name + ').') });
    } else if (a.kind === 'swapReserves') {
      const P = sides.p, E = sides.e, x = mainReserve(P), y = mainReserve(E);
      if (x || y) {
        if (x) takeCard(P, x);
        if (y) takeCard(E, y);
        if (x) putCard(E, x);
        if (y) putCard(P, y);
        msgs.push({ side: a.side, of: 'both', text: a.by + ' swaps the Reserve cards!' });
      }
    } else if (a.kind === 'resurrect') {
      if (canHold(me)) {
        const pool = me.discard.filter(c => c.id !== 'mercy' && !(played && played[a.side] === c));
        if (pool.length) {
          const best = pool.reduce((x, y) => (cardPower(y) > cardPower(x) ? y : x));
          me.discard.splice(me.discard.indexOf(best), 1); best.burned = false; putCard(me, best);
          msgs.push({ side: a.side, of: a.side, text: a.by + ' brings back ' + HEROES[best.id].name + ' to ' + (me.hand ? 'the hand.' : 'the Reserve.') });
        }
      }
    } else if (a.kind === 'buffReserve') {
      const c = mainReserve(me);
      if (c) { addBonus(c, a.amount, a.by); msgs.push({ side: a.side, of: a.side, text: a.by + ' gives ' + HEROES[c.id].name + ' +' + a.amount + ' Power for good.' }); }
    } else if (a.kind === 'buffDeck') {
      let n = 0;
      if (a.silence) {
        const pool = [...me.deck, ...heldCards(me)].filter(c => HEROES[c.id].fx && !c.silenced), hit = [];
        while (hit.length < a.silence && pool.length) hit.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        for (const c of hit) { c.silenced = true; (c.mods || (c.mods = [])).push({ by: a.by, amount: 0, silence: true }); }
        if (hit.length) msgs.push({ side: a.side, of: a.side, text: a.by + ' hacks ' + hit.map(c => HEROES[c.id].name).join(' and ') + ' for the rest of the game.' });
      }
      const fits = c => (!a.role || HEROES[c.id].role === a.role) && (!a.plain || !HEROES[c.id].fx || c.silenced) && (!a.ids || a.ids.includes(c.id));
      for (const c of [...me.deck, ...(a.deckOnly ? [] : me.hand || heldCards(me))]) if (fits(c)) { addBonus(c, a.amount, a.by); n++; }
      const kind = a.role ? ROLES[a.role].label + ' ' : a.plain ? 'no-ability ' : a.ids ? 'Talon ' : '';
      if (n) msgs.push({ side: a.side, of: a.side, text: a.by + ' gives ' + n + ' ' + kind + 'hero' + (n > 1 ? 'es' : '') + ' +' + a.amount + ' Power.' });
    } else if (a.kind === 'drain') {
      const foe = sides[a.side === 'p' ? 'e' : 'p'], f = mainReserve(foe), m = mainReserve(me);
      if (f) {
        addBonus(f, -Math.min(a.amount, cardPower(f)), a.by);
        if (m) addBonus(m, a.amount, a.by);
        msgs.push({ side: a.side, of: 'both', text: a.by + ' drains ' + a.amount + ' Power from ' + HEROES[f.id].name + (m ? ' into ' + HEROES[m.id].name : '') + '.' });
      }
    } else if (a.kind === 'next') {
      if (a.give === 'boost' && !a.amount) continue;
      me.next.push({ give: a.give, amount: a.amount, turns: a.turns, until: a.until, role: a.role, name: a.name, by: a.by });
      const what = a.give === 'boost' ? '+' + a.amount + ' Power' : a.give === 'protect' ? 'a shield' : a.give === 'bigPush' ? 'a 2-step push' : a.give === 'cleanse' ? 'a cleanse' : a.give === 'suzu' ? (a.amount ? '+' + a.amount + ' Power and ' : '') + 'full protection' : 'a safety grip';
      const who = a.until === 'win' ? 'heroes get ' + what + ' until one of them wins' : 'next ' + (a.turns > 1 ? a.turns + ' ' : '') + (a.role ? ROLES[a.role].label + (a.turns > 1 ? 's' : '') : a.turns > 1 ? 'heroes' : 'hero') + ' get' + (a.turns > 1 ? '' : 's') + ' ' + what;
      msgs.push({ side: a.side, of: a.side, text: a.by + ': ' + whose(a.side) + ' ' + who + '.' });
    } else if (a.kind === 'callMech') {
      const c = me.deck.find(x => x.id === a.id);
      if (c) {
        const room = canHold(me);
        me.deck.splice(me.deck.indexOf(c), 1);
        if (room) putCard(me, c); else me.deck.push(c);
        msgs.push({ side: a.side, of: a.side, text: a.by + ' calls ' + HEROES[a.id].name + (room ? (me.hand ? ' into ' + whose(a.side) + ' hand.' : ' into ' + whose(a.side) + ' Reserve.') : ' to the top of the deck.') });
      }
    } else if (a.kind === 'tutor') {
      if (canHold(me) && me.deck.length) {
        const pool = me.deck.slice(), picks = [];
        while (picks.length < a.count && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        me.choice = { uids: picks.map(c => c.uid), amount: a.amount, by: a.by };
      }
    } else if (a.kind === 'mill') {
      const foe = sides[a.of], c = foe.deck.length && !UNDISCARDABLE(foe.deck[foe.deck.length - 1].id) ? foe.deck.pop() : null;
      if (c) { c.burned = true; foe.discard.push(c); sides.p.discards = (sides.p.discards || 0) + 1; sides.e.discards = (sides.e.discards || 0) + 1; me.myDiscards = (me.myDiscards || 0) + 1;
        msgs.push({ side: a.side, of: a.of, text: a.by + ' discards ' + HEROES[c.id].name + ' from the top of ' + whose(a.of) + ' deck.' }); }
    } else if (a.kind === 'weakenDeck') {
      const F = sides[a.of], pool = F.deck.slice(); let n = 0;
      if (a.scatter) {
        let left = a.count;
        while (left > 0) { const live = F.deck.filter(c => cardPower(c) > 0); if (!live.length) break; addBonus(live[Math.floor(rng() * live.length)], -1, a.by); left--; n++; }
        if (n) msgs.push({ side: a.side, of: a.of, text: a.by + ': −' + n + ' Power spread at random across ' + whose(a.of) + ' deck.' });
        continue;
      }
      if (a.all) { for (const c of pool) if (cardPower(c) > 0) { addBonus(c, -Math.min(a.amount, cardPower(c)), a.by); n++; } if (n) msgs.push({ side: a.side, of: a.of, text: a.by + ': ' + n + ' hero' + (n > 1 ? 'es' : '') + ' in ' + whose(a.of) + ' deck get' + (n > 1 ? '' : 's') + ' −' + a.amount + ' Power.' }); continue; }
      while (n < a.count && pool.length) { const c = pool.splice(Math.floor(rng() * pool.length), 1)[0]; addBonus(c, -Math.min(a.amount, cardPower(c)), a.by); n++; }
      if (n) msgs.push({ side: a.side, of: a.of, text: a.by + ': ' + n + ' hero' + (n > 1 ? 'es' : '') + ' in ' + whose(a.of) + ' deck get' + (n > 1 ? '' : 's') + ' −' + a.amount + ' Power.' });
    } else if (a.kind === 'handSwing') {
      const F = sides[a.of], foe = (F.hand || heldCards(F)).filter(c => cardPower(c) > 0), mine = me.hand || heldCards(me);
      for (const c of foe) addBonus(c, -Math.min(a.amount, cardPower(c)), a.by);
      for (const c of mine) addBonus(c, a.amount, a.by);
      if (foe.length || mine.length) msgs.push({ side: a.side, of: 'both', text: a.by + ': ' + whose(a.of) + ' hand −' + a.amount + ', ' + whose(a.side) + ' hand +' + a.amount + '.' });
    } else if (a.kind === 'buffHand') {
      const skip = played && played[a.side], mine = (me.hand || heldCards(me)).filter(c => c !== skip);
      for (const c of mine) addBonus(c, a.amount, a.by);
      if (mine.length) msgs.push({ side: a.side, of: a.side, text: a.by + ' gives ' + whose(a.side) + ' hand +' + a.amount + '.' });
    } else if (a.kind === 'cleanseHand') {
      let n = 0;
      for (const c of me.hand || heldCards(me)) if ((c.bonus || 0) < 0) { addBonus(c, -c.bonus, a.by); n++; }
      if (n) msgs.push({ side: a.side, of: a.side, text: a.by + ' clears debuffs from ' + n + ' card' + (n > 1 ? 's' : '') + ' in ' + whose(a.side) + ' hand.' });
    } else if (a.kind === 'hackHand') {
      const cards = sides[a.of].hand || heldCards(sides[a.of]);
      cards.forEach(c => { c.hacked = true; });
      if (cards.length) msgs.push({ side: a.side, of: a.of, text: a.by + ' hacks ' + whose(a.of) + ' hand: those heroes lose their ability the next time they’re played.' });
    } else if (a.kind === 'hackNext') {
      sides[a.of].hackedNext = true;
      msgs.push({ side: a.side, of: a.of, text: a.by + ' keeps hacking: ' + whose(a.of) + ' next hero loses its ability too.' });
    } else if (a.kind === 'curse') {
      sides[a.of].curse.push({ amount: a.amount, antiheal: a.antiheal, turns: a.turns, name: a.name, by: a.by });
      msgs.push({ side: a.side, of: a.of, text: a.by + ': ' + whose(a.of) + ' next ' + (a.turns > 1 ? a.turns + ' heroes get' : 'hero gets') + ' −' + a.amount + (a.antiheal ? ' and can’t gain Power.' : '.') });
    } else if (a.kind === 'turret') {
      sides[a.of].turret = (sides[a.of].turret || 0) + a.amount;
      msgs.push({ side: a.side, of: a.of, text: a.by + ' leaves a Turret: ' + whose(a.of) + ' next hero gets −' + a.amount + '.' });
    }
  }
  return msgs;
}

/* Brigitte's pick: move the chosen deck card into the Reserve with its bonus. */
/* Change a card's lasting Power and remember who did it, so inspecting the card can list it. */
function addBonus(c, amount, by) {
  if (!amount) return;
  c.bonus = (c.bonus || 0) + amount;
  const mods = c.mods || (c.mods = []), m = mods.find(x => x.by === by);
  if (m) m.amount += amount; else mods.push({ by, amount });
}
function takeChoice(S, uid) {
  const ch = S.choice; S.choice = null;
  if (!ch) return null;
  const c = S.deck.find(x => x.uid === uid) || S.deck.find(x => ch.uids.includes(x.uid));
  if (!c) return null;
  S.deck.splice(S.deck.indexOf(c), 1);
  addBonus(c, ch.amount, ch.by);
  putCard(S, c);
  return c;
}
/* The AI (and the simulator) takes the strongest offered card. */
function aiChoice(S) {
  const cs = S.choice ? S.deck.filter(x => S.choice.uids.includes(x.uid)) : [];
  return cs.length ? cs.reduce((a, b) => (cardPower(b) > cardPower(a) ? b : a)).uid : null;
}

/* How much Power a card is likely to have, from its owner's point of view. */
function estimate(card, ctx) {
  const h = HEROES[card.id], fx = (!card.silenced && !card.hacked && h.fx) || {};
  let v = h.power + (card.bonus || 0) - (ctx.turret || 0) - (ctx.curse || []).reduce((n, c) => n + c.amount, 0);
  switch (fx.type) {
    case 'boost': v += isSelfCond(fx.when) ? (condMet(fx.when, ctx) ? fx.amount : 0) : fx.amount * 0.35; break;
    case 'weaken': v += isSelfCond(fx.when) ? (condMet(fx.when, ctx) ? fx.amount : 0) : fx.when ? fx.amount * 0.35 : fx.amount; break;
    case 'scale': v += scaleAmount(fx, ctx); break;
    case 'double': v += condMet(fx.when, ctx) ? h.power + (card.bonus || 0) : 0; break;
    case 'decay': v -= decayAmount(fx, ctx) + 1.5; break;
    case 'distDecay': v -= Math.abs(ctx.steps || 0) * (fx.per || 1); break;
    case 'asheDiscard': if ((ctx.myHand || []).some(c => c.id === 'bob')) v += (ctx.myHand.find(c => c.id === 'bob').power); break;
    case 'hook': { const pool = ctx.foeReserve || []; if (pool.length) v -= pool.reduce((n, c) => n + (fx.half ? Math.floor(c.power / 2) : c.power), 0) / pool.length - 1.5; break; }
    case 'curse': v += (fx.now || 0) + fx.amount * 0.4; break;
    case 'copyPower': v = Math.max(v, ctx.foeReservePower || 0); break;
    case 'steal': v += fx.amount * 2; break;
    case 'random': v = 5.5 + (card.bonus || 0); break;
    case 'swap': v = 5.5; break;
    case 'reverse': v = 5.5; break;
    case 'penalty': v -= condMet(fx.when, ctx) ? 0 : fx.amount; break;
    case 'winGame': v += 2; break;
    case 'handSwing': v += 1; break;
    case 'tutor': case 'callMech': case 'discardFoe': case 'discardHand': case 'weakenDeck': v += 1; break;
    case 'pileBoost': v += fx.role ? ctx.pileRoles?.[fx.role] || 0 : Math.min(fx.max, ctx.pile || 0); break;
    case 'mill': v += ctx.foeTop ? (HEROES[ctx.foeTop].role === 'damage' ? fx.amount : -fx.amount) * 0.5 : 0; break;
    case 'fragile': v -= 0.3; break;
    case 'hack': v += fx.when ? 0.5 : 1.2; break;
    case 'charge': v += chargeAmount(fx, ctx.heldRounds, h.power); break;
    case 'copy': v += 1.2; break;
    case 'bigPush': case 'gamble': v += 0.8; break;
    case 'risky': v += fx.amount - 0.8 - (fx.fragile ? (ctx.curse || []).reduce((n, c) => n + c.amount, 0) + (ctx.turret || 0) : 0); break;
    case 'recall': v += 1.5; break;
    case 'buffReserve': case 'buffDeck': case 'resurrect': case 'next': case 'drainReserve': v += 1; break;
    case 'bob': v -= 1; break;
    default: v += 0.8;
  }
  return v;
}

/* Simple AI: never sees the player's card. st = { drawn, reserve, deckIds, ctx } */
function aiChoose(st) {
  const { drawn, reserve, ctx } = st;
  const fx = HEROES[drawn.id].fx || {};
  if (!reserve) {
    if (fx.when && fx.when.fromReserve) return 'reserve';
    // Save a partner that another deck-mate wants in Reserve.
    const wanted = (drawn.id === 'bob' && (st.deckIds || []).includes('ashe')) || (st.deckIds || []).some(id => { const f = HEROES[id].fx; return f && f.when && (f.when.reserveHas === drawn.id || (f.when.reserveNoAbility && !HEROES[drawn.id].fx)); });
    if (wanted && Math.random() < 0.6) return 'reserve';
    if (HEROES[drawn.id].power + (drawn.bonus || 0) <= 3 && Math.random() < 0.3) return 'reserve';
    return 'play';
  }
  const vr = estimate(reserve, { ...ctx, fromReserve: true, heldRounds: reserve.heldRounds || 0, reserveFull: false, reserveId: null });
  const vd = estimate(drawn, { ...ctx, fromReserve: false, reserveFull: true, reserveId: reserve.id });
  return vr > vd + 0.3 ? 'playReserve' : 'play';
}

/* Hand mode AI: play the card that looks strongest; keep B.O.B. waiting for Ashe.
   st = { hand, ctxFor(card) } -> index into hand. */
function aiChooseHand(st) {
  let best = 0, bv = -Infinity;
  st.hand.forEach((c, i) => { const v = estimate(c, st.ctxFor(c)) + Math.random() * 0.6; if (v > bv) { bv = v; best = i; } });
  return best;
}

if (typeof module !== 'undefined') module.exports = { setPowerMode, chargeAmount, addBonus, takeChoice, aiChoice, seededRng, foeView, aiChooseHand, reserveView, heldCards, mainReserve, canHold, cardPower, HAND_SIZE, HEROES, DECKS, ROLES, MAX_ROUNDS, resolve, applyAfter, aiChoose, makeDeck, shuffle, estimate, condMet, isSelfCond, scaleAmount, decayAmount };
