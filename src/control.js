/* ===== Mayhem mode (called Control until v80; internal names still say control/c*): 5x9 board, both players reveal a hero at the same time, build the strongest board over 3 rounds ===== */
// Engine (pure, no DOM). Player 0 = you (back row is the bottom row), player 1 = enemy (top row).
// v67 (Syauqie's permanent board): heroes stay on the board for the whole match. Heroes played this round can still be
// flipped (v75: heroes from this round and last round; `flipBack`, `lockOld`). The board fills across 3 rounds. Every round ends with a score of
// all your heroes' Power (the hero on the Point counts double). Winning a round gives your next heroes +1 Power each (stacks).
// The board is CN columns by CRW rows (v70: 5x9). CPT = the Point, in the middle.
// cSetBoard(cols, rows, backW): backW = how many tiles wide each back row is (centred); the rest of a back row is not part of the board.
let CN = 5, CRW = 7, CT = 35, CPT = 17, CVOID = new Set(), CBONUS = new Map();
const CTURNS = 4, CDECK = 15;
function cSetBoard(cols, rows, backW = cols) {
  CN = cols; CRW = rows; CT = cols * rows; CPT = Math.floor(rows / 2) * cols + Math.floor(cols / 2); CVOID = new Set();
  const off = (cols - backW) / 2;
  for (const r of [0, rows - 1]) for (let c = 0; c < cols; c++) if (c < off || c >= cols - off) CVOID.add(r * cols + c);
  // Bonus tiles (like Scrabble): own a hero there for extra points. Mirrored so both sides get the same.
  const mid = Math.floor(rows / 2); CBONUS = new Map();
  for (const [r, c, n] of [[mid, 0, 3], [mid, cols - 1, 3], [2, 1, 2], [2, cols - 2, 2], [rows - 3, 1, 2], [rows - 3, cols - 2, 2]]) CBONUS.set(r * cols + c, n);
}
cSetBoard(7, 7, 5); // v71: Syauqie picked the wider board: middle 7 wide x 5 long, back rows 5 wide
// match: 'total' = the 3 round scores are added up; 'final' = only the full board at the end of round 3; 'bo3' = most rounds won.
// mom: Power each round you have won adds to the heroes you play later. underdog: bonus for a hero played while your score is lower.
// abil: hero abilities on/off (Syauqie's Power-only test, v70). lines: 3+ of your heroes in a straight line score a bonus.
const CR = { score: 'board', match: 'final', mom: 2, momFirst: true, underdog: 2, flips: true, roleFlip: 1, boostFlip: false, rescueBoost: 2, draw: 10, flank: 0, roles: true, lockOld: false, flipBack: 1, order: 'sim', altOpen: 'r1', abil: false, lines: [0, 0, 0, 3, 5, 8, 10, 13, 15, 18] };
// flipBack: how many rounds back a hero can still be flipped (v75, Syauqie: last round's heroes yes, two rounds back no).
// order: 'sim' = both reveal every turn; 'alt' = take turns. altOpen 'r1': only round 1 opens with a reveal, the bigger
// Power then goes first, and later rounds the round winner goes first. altOpen 'all': every round opens with a reveal.
// flank: +1 per other hero of yours next to a flip target (v76: Syauqie removed it). roles: where each role may be placed (v76).
const cFlippable = (t, m) => CR.lockOld ? t.rd === m.round : t.rd >= m.round - CR.flipBack;
const CH = {
  reinhardt: { power: 6, ab: 'Barrier Field', text: 'Allies behind him in his column +1.' },
  winston:   { power: 5, ab: 'Jump Pack', text: 'Move: leap to the opposite tile in his row or column.', move: true },
  dva:       { power: 6, name: 'D.Va', ab: 'Defense Matrix', text: "Enemy abilities can't lower her Power." },
  orisa:     { power: 7, ab: 'No ability', text: 'No tricks, just Power.' },
  zarya:     { power: 4, ab: 'Graviton Surge', text: '+1 for each enemy next to her.' },
  sigma:     { power: 5, ab: 'Accretion', text: 'When played: pushes an adjacent enemy 1 tile back.' },
  soldier:   { power: 6, ab: 'No ability', text: 'No tricks, just Power.' },
  cassidy:   { power: 4, ab: 'Deadeye', text: 'Enemies in his row −1.' },
  genji:     { power: 5, ab: 'Swift Strike', text: 'Move: dash 1 tile diagonally.', move: true },
  hanzo:     { power: 4, ab: 'Storm Arrows', text: 'When played: the first enemy in each direction along his row and column −1.' },
  tracer:    { power: 5, ab: 'Blink', text: 'Move: blink up to 2 tiles.', move: true },
  widowmaker:{ power: 4, ab: 'Headshot', text: 'When played: the strongest enemy in her row −2.' },
  reaper:    { power: 4, ab: 'Death Blossom', text: 'Enemies all around him (diagonals too) −1.' },
  mercy:     { power: 2, ab: 'Damage Boost', text: 'Damage allies next to her +2.' },
  sombra:    { power: 2, ab: 'Hack', text: 'Enemies next to her −2.' },
  ana:       { power: 2, ab: 'Nano Boost', text: 'When played: the strongest ally next to her +3.' },
  lucio:     { power: 2, ab: 'Speed Boost', text: 'Allies in his column +1.' },
  moira:     { power: 2, ab: 'Biotic Orb', text: 'Allies next to her +1, enemies next to her −1.' },
  baptiste:  { power: 3, ab: 'Amplification Matrix', text: 'Allies in his row +1.' },
  kiriko:    { power: 3, ab: 'Swift Step', text: 'Move: teleport next to an ally. When played: clears debuffs on allies next to her.', move: true },
};
const CIDS = Object.keys(CH);
// Starter decks: 15 heroes each (you play 12 of them in a match), balanced against each other with bot sims.
const CDECKS = [
  { id: 'frontline', name: 'Frontline', tag: 'Sturdy', desc: 'Tanks in a column with Lúcio and Reinhardt behind. Stack the lane and hold the centre.', feat: ['reinhardt', 'lucio', 'orisa'],
    heroes: ['reinhardt', 'orisa', 'sigma', 'zarya', 'winston', 'dva', 'soldier', 'cassidy', 'genji', 'widowmaker', 'lucio', 'ana', 'baptiste', 'moira', 'reaper'] },
  { id: 'flankers', name: 'Flankers', tag: 'Mobile', desc: 'Damage heroes that move, boosted by Mercy and Kiriko. Strike where combos are.', feat: ['tracer', 'genji', 'mercy'],
    heroes: ['dva', 'winston', 'zarya', 'orisa', 'reinhardt', 'tracer', 'genji', 'reaper', 'soldier', 'cassidy', 'kiriko', 'mercy', 'ana', 'baptiste', 'widowmaker'] },
  { id: 'disrupt', name: 'Disruption', tag: 'Tricky', desc: 'Hacks, headshots and Death Blossom that shrink the enemy board.', feat: ['sombra', 'reaper', 'widowmaker'],
    heroes: ['sigma', 'zarya', 'dva', 'orisa', 'reinhardt', 'widowmaker', 'tracer', 'cassidy', 'reaper', 'soldier', 'sombra', 'lucio', 'ana', 'baptiste', 'winston'] },
];
const CDEFAULT = ['reinhardt', 'winston', 'dva', 'orisa', 'zarya', 'soldier', 'genji', 'tracer', 'reaper', 'cassidy', 'mercy', 'sombra', 'ana', 'lucio', 'kiriko'];
const crole = id => HEROES[id].role;
const cname = id => CH[id].name || HEROES[id].name;
const crc = i => [Math.floor(i / CN), i % CN], cidx = (r, c) => r * CN + c, cin = (r, c) => r >= 0 && r < CRW && c >= 0 && c < CN && !CVOID.has(r * CN + c);
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const near = (i, dirs = ORTH) => { const [r, c] = crc(i); return dirs.filter(([a, b]) => cin(r + a, c + b)).map(([a, b]) => cidx(r + a, c + b)); };
const cdist = i => { const [r, c] = crc(i); return Math.abs(r - Math.floor(CRW / 2)) + Math.abs(c - Math.floor(CN / 2)); };
const mdist = (i, j) => { const [a, b] = crc(i), [c, d] = crc(j); return Math.abs(a - c) + Math.abs(b - d); };

// Power on the board: printed Power + lasting changes + every aura that reaches this tile right now.
// Pass a `log` array to also get each change as { by, d } (used by the right-click card view).
function cPower(b, i, log) {
  if (!CR.abil) { const t = b[i]; return Math.max(0, CH[t.id].power + t.mod - (t.dn || 0)); }
  const t = b[i], [r, c] = crc(i), nb = near(i);
  let up = CH[t.id].power + t.mod, down = t.dn || 0;
  const add = (by, d) => { if (d > 0) up += d; else down -= d; if (log) log.push({ by, d }); };
  for (let j = 0; j < CT; j++) {
    const u = b[j]; if (!u || j === i) continue;
    const [rj, cj] = crc(j), adj = nb.includes(j);
    if (u.owner === t.owner) {
      if (u.id === 'lucio' && cj === c) add(u.id, 1);
      if (u.id === 'baptiste' && rj === r) add(u.id, 1);
      // "behind" Reinhardt = between him and his own back row
      if (u.id === 'reinhardt' && cj === c && (t.owner === 0 ? r > rj : r < rj)) add(u.id, 1);
      if (adj && u.id === 'moira') add(u.id, 1);
      if (adj && u.id === 'mercy' && crole(t.id) === 'damage') add(u.id, 2);
    } else {
      if (u.id === 'cassidy' && rj === r) add(u.id, -1);
      if (u.id === 'reaper' && Math.abs(rj - r) <= 1 && Math.abs(cj - c) <= 1) add(u.id, -1);
      if (adj && u.id === 'moira') add(u.id, -1);
      if (adj && u.id === 'sombra') add(u.id, -2);
    }
  }
  if (t.id === 'zarya') { const n = nb.filter(j => b[j] && b[j].owner !== t.owner).length; if (n) add(t.id, n); }
  return Math.max(0, up - (t.id === 'dva' ? 0 : down));
}
function cLegal(b, pl, id, turn) {
  const back = pl === 0 ? CRW - 1 : 0, foeBack = CRW - 1 - back, out = [], mine = [], any = [];
  for (let i = 0; i < CT; i++) if (b[i]) { any.push(i); if (b[i].owner === pl) mine.push(i); }
  // No heroes of yours on the board (the first turn, or all yours got flipped): anywhere except the enemy's back row (and the Point on turn 1).
  const open = !mine.length, role = crole(id);
  // v76 (Syauqie): Tanks go next to any hero (not diagonal), Supports next to any hero (diagonal too),
  // Damage anywhere in a row or column with one of your heroes. Your back row is always open.
  const ok = i => {
    if (!CR.roles) return mine.some(j => mdist(i, j) <= 1);
    const [r, c] = crc(i);
    if (role === 'tank') return any.some(j => mdist(i, j) === 1);
    if (role === 'support') return any.some(j => { const [a, d] = crc(j); return Math.max(Math.abs(a - r), Math.abs(d - c)) === 1; });
    return mine.some(j => { const [a, d] = crc(j); return a === r || d === c; });
  };
  for (let i = 0; i < CT; i++) {
    const r = crc(i)[0];
    if (b[i] || CVOID.has(i) || r === foeBack || (turn === 1 && !b.some(Boolean) && i === CPT)) continue;
    if (open || r === back || ok(i)) out.push(i);
  }
  if (!out.length) for (let i = 0; i < CT; i++) if (!b[i] && !CVOID.has(i)) out.push(i); // board almost full: any empty tile
  return out;
}
// Where a mover on tile i may go. v76 (Syauqie): on your turn, before you place, one of your movers already on the
// board can move. Locked heroes (too old to flip) can't move.
function cMoves(b, i, m) {
  const t = b[i]; if (!CR.abil || !t || !CH[t.id].move || !cFlippable(t, m)) return [];
  const free = j => !b[j];
  if (t.id === 'winston') { const [r, c] = crc(i); return [[r, CN - 1 - c], [CRW - 1 - r, c]].filter(([a, d]) => cin(a, d) && cidx(a, d) !== i && free(cidx(a, d))).map(([a, d]) => cidx(a, d)); }
  if (t.id === 'genji') return near(i, DIAG).filter(free);
  if (t.id === 'tracer') { const one = near(i).filter(free); return [...new Set(one.concat(...one.map(j => near(j).filter(k => k !== i && free(k)))))]; }
  if (t.id === 'kiriko') { const out = new Set(); for (let j = 0; j < CT; j++) if (j !== i && b[j] && b[j].owner === t.owner) near(j).filter(k => k !== i && free(k)).forEach(k => out.add(k)); return [...out]; }
  return [];
}
// Every move a player could make this turn: [{ from, to }]
function cAllMoves(b, pl, m) { const out = []; for (let i = 0; i < CT; i++) if (b[i] && b[i].owner === pl) for (const to of cMoves(b, i, m)) out.push({ from: i, to }); return out; }
// Steps are applied to a board one at a time, so the screen can replay exactly what the engine did.
function cApply(b, s) {
  if (s.t === 'place') b[s.tile] = { id: s.id, owner: s.owner, mod: s.bonus || 0, dn: 0, orig: s.owner, rd: s.rd || 0 };
  else if (s.t === 'move') { b[s.to] = b[s.from]; b[s.from] = null; }
  else if (s.t === 'cleanse') b[s.tile].dn = 0;
  else if (s.t === 'mod') { if (s.d > 0) b[s.tile].mod += s.d; else b[s.tile].dn = (b[s.tile].dn || 0) - s.d; }
  else if (s.t === 'flip') b[s.tile].owner = s.to;
}
// The bonus a new hero gets: +1 for each round you have won, +underdog when you are behind on the board.
function cBonus(m, p) {
  const sc = [cScore(m.board, 0), cScore(m.board, 1)];
  return (CR.mom || 0) * m.wins[p] * (CR.momFirst ? (m.turn === 1 ? 1 : 0) : 1) + (CR.underdog && sc[p] < sc[1 - p] ? CR.underdog : 0);
}
// plays[p] may be null when only one player acts (taking turns). end: this play finishes the turn.
function cResolve(m, plays, rng = Math.random, end = true) {
  const b = m.board, steps = [], arrived = [], P = [0, 1].filter(p => plays[p]);
  const go = s => { cApply(b, s); steps.push(s); };
  const bonus = [cBonus(m, 0), cBonus(m, 1)];
  // Moves first (v76: before you place). Higher Power moves first, a coin flip breaks ties. A move onto a tile that is
  // taken, or that someone is placing on, fails.
  const mvs = P.map(p => plays[p].mv && { ...plays[p].mv, p }).filter(Boolean);
  if (rng() < 0.5) mvs.reverse();
  mvs.sort((x, y) => (b[y.from] ? CH[b[y.from].id].power : 0) - (b[x.from] ? CH[b[x.from].id].power : 0));
  for (const v of mvs) {
    const t = b[v.from];
    if (!t || t.owner !== v.p || P.some(p => plays[p].tile === v.to) || !cMoves(b, v.from, m).includes(v.to)) continue;
    go({ t: 'move', from: v.from, to: v.to, id: t.id });
  }
  for (const p of P) m.hands[p] = m.hands[p].filter(x => x !== plays[p].id);
  if (P.length === 2 && plays[0].tile === plays[1].tile) {
    // Both picked the same tile: higher printed Power gets it, the other hero is lost. A tie knocks both out.
    const a = CH[plays[0].id].power + bonus[0], c = CH[plays[1].id].power + bonus[1], w = a === c ? -1 : a > c ? 0 : 1;
    steps.push({ t: 'clash', tile: plays[0].tile, ids: [plays[0].id, plays[1].id], win: w });
    if (w >= 0) { go({ t: 'place', tile: plays[w].tile, id: plays[w].id, owner: w, bonus: bonus[w], rd: m.round }); arrived.push(plays[w].tile); }
  } else for (const p of P) { go({ t: 'place', tile: plays[p].tile, id: plays[p].id, owner: p, bonus: bonus[p], rd: m.round }); arrived.push(plays[p].tile); }
  // Abilities that fire once, when played
  for (let k = 0; k < arrived.length && CR.abil; k++) {
    const i = arrived[k], t = b[i]; if (!t) continue;
    const foes = near(i).filter(j => b[j] && b[j].owner !== t.owner);
    if (t.id === 'kiriko') for (const j of near(i)) if (b[j] && b[j].owner === t.owner && b[j].dn) go({ t: 'cleanse', tile: j, by: i });
    if (t.id === 'ana') { const al = near(i).filter(j => b[j] && b[j].owner === t.owner).sort((x, y) => cPower(b, y) - cPower(b, x)); if (al.length) go({ t: 'mod', tile: al[0], d: 3, by: i, why: 'nano' }); }
    if (t.id === 'widowmaker') {
      const r = crc(i)[0], row = [...Array(CN).keys()].map(c => cidx(r, c)).filter(j => b[j] && b[j].owner !== t.owner && b[j].id !== 'dva').sort((x, y) => cPower(b, y) - cPower(b, x) || (y === CPT) - (x === CPT));
      if (row.length) go({ t: 'mod', tile: row[0], d: -2, by: i, why: 'headshot' });
    }
    if (t.id === 'hanzo') {
      const [r, c] = crc(i);
      for (const [a, d] of ORTH) { let rr = r + a, cc = c + d; while (cin(rr, cc)) { const j = cidx(rr, cc); if (b[j]) { if (b[j].owner !== t.owner && b[j].id !== 'dva') go({ t: 'mod', tile: j, d: -1, by: i, why: 'arrows' }); break; } rr += a; cc += d; } }
    }
    if (t.id === 'sigma') {
      const opts = foes.filter(j => cFlippable(b[j], m)).map(j => { const [r, c] = crc(j), [r0, c0] = crc(i), rr = r + (r - r0), cc = c + (c - c0); return cin(rr, cc) && !b[cidx(rr, cc)] ? [j, cidx(rr, cc)] : null; }).filter(Boolean)
        .sort((x, y) => (y[0] === CPT) - (x[0] === CPT) || cPower(b, y[0]) - cPower(b, x[0]));
      if (opts.length) { const [from, to] = opts[0]; go({ t: 'move', from, to, id: b[from].id, push: true }); const a = arrived.indexOf(from); if (a >= 0) arrived[a] = to; }
    }
  }
  // Attacks: arriving heroes attack next to them, then all flips happen. Damage +2 when attacking, Tanks +2 when defending; 1 flip per hero.
  // roleFlip (v78 test, Syauqie: every role should feel different): 1 = only Damage flips; Tanks guard (your heroes next
  // to a Tank also get +2 when defending); Supports rescue (take back one of your own heroes next to them that the enemy
  // flipped). 2 = like 1, but Tanks flip as well.
  if (CR.flips && !(CR.noFlip1 && m.turn === 1)) {
    const rf = CR.roleFlip, guard = j => rf && near(j).some(k => b[k] && b[k].owner === b[j].owner && crole(b[k].id) === 'tank');
    const def = j => cPower(b, j) + (crole(b[j].id) === 'tank' || guard(j) ? 2 : 0), flips = [];
    const attack = (i, boost) => {
      const t = b[i], atk = cPower(b, i) + (crole(t.id) === 'damage' ? 2 : 0);
      const flank = j => CR.flank ? CR.flank * near(j).filter(k => k !== i && b[k] && b[k].owner === t.owner).length : 0;
      const tg = near(i, t.id === 'reaper' ? ORTH.concat(DIAG) : ORTH).filter(j => b[j] && b[j].owner !== t.owner && cFlippable(b[j], m) && atk + flank(j) > def(j) && !flips.some(f => f.tile === j))
        .sort((x, y) => (y === CPT) - (x === CPT) || def(y) - def(x));
      if (tg.length) flips.push({ t: 'flip', tile: tg[0], to: t.owner, by: i, boost });
    };
    for (const i of arrived) {
      const t = b[i]; if (!t) continue;
      const role = crole(t.id);
      if (rf && role === 'support') {
        // rescueBoost (v82, Syauqie): the Support boosts the flipped ally by this much; it only flips back if that beats
        // every enemy next to the ally. 0 = old rule, always rescues.
        const lifts = j => {
          if (!CR.rescueBoost) return true;
          const u = b[j], was = u.owner; u.owner = t.owner;
          const mine = cPower(b, j) + CR.rescueBoost, foe = Math.max(0, ...near(j).filter(k => b[k] && b[k].owner !== t.owner).map(k => cPower(b, k)));
          u.owner = was; return mine > foe;
        };
        const back = near(i).filter(j => b[j] && b[j].owner !== t.owner && b[j].orig === t.owner && cFlippable(b[j], m) && lifts(j)).sort((x, y) => cPower(b, y) - cPower(b, x));
        if (back.length && !flips.some(f => f.tile === back[0])) flips.push({ t: 'flip', tile: back[0], to: t.owner, by: i, rescue: true });
        continue;
      }
      if (rf && role === 'tank' && rf !== 2) continue;
      attack(i);
    }
    // boostFlip (v81 test, Syauqie): a Damage hero already on the board that an arriving Support of yours powers up
    // attacks again. 1 = at most one extra flip per Support, 2 = every powered-up Damage hero, 3 = like 1 but only Mercy and Ana.
    if (CR.boostFlip) {
      const done = new Set();
      for (const i of arrived) {
        const t = b[i]; if (!t || crole(t.id) !== 'support' || (CR.boostFlip === 3 && t.id !== 'mercy' && t.id !== 'ana')) continue;
        for (let j = 0; j < CT; j++) {
          const u = b[j]; if (!u || j === i || done.has(j) || arrived.includes(j) || u.owner !== t.owner || crole(u.id) !== 'damage') continue;
          const withS = cPower(b, j); b[i] = null; const without = cPower(b, j); b[i] = t;
          if (withS > without || (t.id === 'ana' && steps.some(s => s.why === 'nano' && s.tile === j && s.by === i))) { done.add(j); const n = flips.length; attack(j, true); if (CR.boostFlip !== 2 && flips.length > n) break; }
        }
      }
    }
    flips.forEach(go);
  }
  go({ t: 'settle' });
  if (end) m.turn++;
  return steps;
}
// Who acts now: -1 = both pick in secret and reveal together, otherwise that player plays alone.
function cWho(m) {
  if (CR.order !== 'alt') return -1;
  if (m.turn === 1 && !m.sub && (m.round === 1 || CR.altOpen === 'all' || m.first < 0)) return -1;
  const f = CR.snake && (m.turn - (m.t0 || 1)) % 2 ? 1 - m.first : m.first; // snake: A B, B A, A B, B A
  return m.sub ? 1 - f : f;
}
// Play one step of the turn order. plays[p] for whoever acts (both on a reveal).
function cPlay(m, plays, rng = Math.random) {
  const who = cWho(m);
  if (who < 0) {
    const bonus = [cBonus(m, 0), cBonus(m, 1)], pw = [0, 1].map(p => CH[plays[p].id].power + bonus[p]);
    const steps = cResolve(m, plays, rng);
    if (CR.order === 'alt') { m.first = pw[0] === pw[1] ? (rng() < 0.5 ? 0 : 1) : pw[0] > pw[1] ? 0 : 1; m.sub = 0; m.t0 = m.turn; }
    return steps;
  }
  const one = [null, null]; one[who] = plays[who];
  const steps = cResolve(m, one, rng, !!m.sub);
  m.sub = m.sub ? 0 : 1;
  return steps;
}
// Lines: every unbroken run of 3 or more of your heroes across a row or down a column. Bonus by length from CR.lines.
function cLines(b, p) {
  const out = [], own = (r, c) => cin(r, c) && b[cidx(r, c)] && b[cidx(r, c)].owner === p;
  for (const [dr, dc] of [[0, 1], [1, 0]]) for (let r = 0; r < CRW; r++) for (let c = 0; c < CN; c++) {
    if (!own(r, c) || own(r - dr, c - dc)) continue; // start of a run only
    const run = []; let rr = r, cc = c; while (own(rr, cc)) { run.push(cidx(rr, cc)); rr += dr; cc += dc; }
    if (run.length >= 3) out.push({ tiles: run, pts: CR.lines[Math.min(run.length, CR.lines.length - 1)] });
  }
  return out;
}
function cBoardScore(b, p) {
  let n = 0; for (let i = 0; i < CT; i++) if (b[i] && b[i].owner === p) n += cPower(b, i);
  if (b[CPT] && b[CPT].owner === p) n += cPower(b, CPT);
  if (CR.lines) for (const l of cLines(b, p)) n += l.pts;
  for (const [i, v] of CBONUS) if (b[i] && b[i].owner === p) n += v;
  return n;
}
const cScore = (b, p) => cBoardScore(b, p);
function cRoundWinner(b) {
  const z = [cScore(b, 0), cScore(b, 1)]; if (z[0] !== z[1]) return z[0] > z[1] ? 0 : 1;
  if (b[CPT]) return b[CPT].owner;
  const n = [0, 1].map(p => b.filter(t => t && t.owner === p).length);
  return n[0] === n[1] ? -1 : n[0] > n[1] ? 0 : 1;
}
// CR.draw (v77, Syauqie's default): start with this many random heroes from your 15, the rest join your hand at round 2. 0 = all 15 from the start.
function cNewMatch(deck0, deck1) {
  const decks = [deck0, deck1].map(d => CR.draw ? d.slice().sort(() => Math.random() - 0.5) : d.slice());
  return { round: 1, turn: 1, sub: 0, first: -1, wins: [0, 0], pts: [0, 0], hands: decks.map(d => CR.draw ? d.slice(0, CR.draw) : d), later: decks.map(d => CR.draw ? d.slice(CR.draw) : []), board: Array(CT).fill(null), results: [] };
}
// The board stays between rounds; only the turn counter resets.
function cNewRound(m) { m.turn = 1; m.sub = 0; m.t0 = 1; if (m.round === 2 && m.later) { m.hands = m.hands.map((h, p) => h.concat(m.later[p])); m.later = [[], []]; } }
// Called once when a round's last turn is done
function cEndRound(m) {
  const w = cRoundWinner(m.board), s = [cScore(m.board, 0), cScore(m.board, 1)];
  m.results.push(w); if (w >= 0) m.wins[w]++;
  if (CR.order === 'alt') m.first = w >= 0 ? w : m.first >= 0 ? 1 - m.first : -1; // round winner goes first next round
  if (CR.match === 'total') { m.pts[0] += s[0]; m.pts[1] += s[1]; } else if (CR.match === 'final') { m.pts = s; } else { m.pts = m.wins.slice(); }
  return w;
}
function cMatchWinner(m) { const [a, b] = m.pts; return a === b ? (m.wins[0] === m.wins[1] ? -1 : m.wins[0] > m.wins[1] ? 0 : 1) : a > b ? 0 : 1; }
// Bot: tries each card and tile against a few guesses of what you might play, then weighs the board against spending strong cards early.
function cEval(b, pl) {
  let s = 0; for (let i = 0; i < CT; i++) { const t = b[i]; if (!t) continue; s += (t.owner === pl ? 1 : -1) * 0.3; }
  return s + cScore(b, pl) - cScore(b, 1 - pl);
}
function cClone(m) { return { ...m, wins: m.wins.slice(), board: m.board.map(t => t && { ...t }), hands: m.hands.map(h => h.slice()) }; }
// Movers: pick the one move (or none) that most improves the board, before choosing what to place.
function cBotMove(m, pl) {
  let best = null, bs = cEval(m.board, pl) + 0.2;
  for (const mv of cAllMoves(m.board, pl, m)) { const b = m.board.map(t => t && { ...t }); cApply(b, { t: 'move', ...mv }); const v = cEval(b, pl); if (v > bs) { bs = v; best = mv; } }
  return best;
}
const cMovedBoard = (m, mv) => { if (!mv) return m.board; const b = m.board.map(t => t && { ...t }); cApply(b, { t: 'move', ...mv }); return b; };
// Taking turns: score every play, then check the best few against the opponent's strongest answer.
function cBotAlone(m, pl, rng) {
  const foe = 1 - pl, hand = m.hands[pl];
  const left = (3 - m.round) * CTURNS + (CTURNS - m.turn + 1), spare = hand.length - left;
  const keep = id => spare > 0 ? 0 : CH[id].power * 0.15 * (left - 1) / left;
  const after = (c0, p, pick) => { const c = cClone(c0), one = [null, null]; one[p] = pick; cPlay(c, one, rng); return c; };
  const mv = cBotMove(m, pl), mb = cMovedBoard(m, mv), cands = [];
  for (const id of hand) for (const tile of cLegal(mb, pl, id, m.turn)) { const c = after(m, pl, { id, tile, mv }); cands.push({ id, tile, c, v: cEval(c.board, pl) - keep(id) }); }
  cands.sort((x, y) => y.v - x.v);
  let best = null, bs = -1e9;
  for (const k of cands.slice(0, 6)) {
    let v = k.v; const c = k.c;
    if (c.turn <= CTURNS && cWho(c) === foe) {
      let worst = 1e9;
      for (const id of c.hands[foe]) for (const tile of cLegal(c.board, foe, id, c.turn)) { const r = after(c, foe, { id, tile }), e = cEval(r.board, pl); if (e < worst) worst = e; }
      if (worst < 1e9) v = worst - keep(k.id);
    }
    v += rng() * 0.3;
    if (v > bs) { bs = v; best = { id: k.id, tile: k.tile, mv }; }
  }
  return best;
}
function cBot(m, pl, rng = Math.random) {
  if (cWho(m) === pl) return cBotAlone(m, pl, rng);
  const foe = 1 - pl, hand = m.hands[pl], fh = m.hands[foe], samples = [];
  for (let k = 0; k < 6; k++) { const id = fh[Math.floor(rng() * fh.length)], L = cLegal(m.board, foe, id, m.turn); samples.push({ id, tile: L[Math.floor(rng() * L.length)] }); }
  const left = (3 - m.round) * CTURNS + (CTURNS - m.turn + 1), spare = hand.length - left; // cards you will never play
  const mv = cBotMove(m, pl), mb = cMovedBoard(m, mv);
  let best = null, bs = -1e9;
  for (const id of hand) for (const tile of cLegal(mb, pl, id, m.turn)) {
    let tot = 0;
    for (const s of samples) { const c = cClone(m), plays = []; plays[pl] = { id, tile, mv }; plays[foe] = s; cPlay(c, plays, rng); tot += cEval(c.board, pl); }
    const sc = tot / samples.length - (spare > 0 ? 0 : CH[id].power * 0.15 * (left - 1) / left) + rng() * 0.3;
    if (sc > bs) { bs = sc; best = { id, tile, mv }; }
  }
  return best;
}

/* ---------- Right-click (or long-press) a card to read it ---------- */
// On the board it also lists what is changing that hero's Power right now.
function cInspect(id, i) {
  const ov = $('#picker'), b = CG.view, t = i != null && b ? b[i] : null;
  let info = '';
  if (t) {
    const log = [], pw = cPower(b, i, log), rows = [];
    const row = (by, text, good) => rows.push(`<li class="${good ? 'buff' : 'debuff'}"><b>${escapeHtml(by)}</b><span>${text}</span></li>`);
    if (t.mod) row('Bonus when played', '+' + t.mod, true);
    if (t.dn) row('Hit when played', '−' + t.dn, false);
    for (const x of log) row(cname(x.by), (x.d > 0 ? '+' : '−') + Math.abs(x.d), x.d > 0);
    const notes = [t.owner ? 'Enemy hero' : 'Your hero', !cFlippable(t, CG.m) ? 'locked, can’t be flipped' : 'can be flipped'];
    if (t.id === 'dva' && CR.abil) notes.push('enemy abilities can’t lower her');
    for (const l of cLines(b, t.owner)) if (l.tiles.includes(i)) notes.push(`part of a line of ${l.tiles.length} (+${l.pts})`);
    if (i === CPT) notes.push('on the glowing centre tile, scores double');
    if (CBONUS.has(i)) notes.push(`on a bonus tile, +${CBONUS.get(i)}`);
    info = `<div class="mods"><p>${notes.join(' · ')}</p><p>Base Power ${CH[t.id].power} · now ${pw}</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p class="none">No buffs or debuffs.</p>'}</div>`;
  }
  ov.innerHTML = `<div class="viewer cview"><div class="cview-card"></div>${info}<div class="viewer-actions"><button class="btn ghost" data-close>Close</button></div></div>`;
  ov.querySelector('.cview-card').appendChild(sqCard(id, t ? { pw: cPower(b, i) } : {}));
  const close = () => { ov.hidden = true; ov.innerHTML = ''; };
  ov.querySelector('[data-close]').onclick = () => { Sfx.click(); close(); };
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.hidden = false;
}
function cInspectEl(el) {
  const c = el.closest('.sq'); if (!c || c.classList.contains('preview')) return false;
  const tile = c.closest('#c-board .tile'), id = c.dataset.hero; if (!id) return false;
  cInspect(id, tile ? +tile.dataset.i : null); return true;
}
const C_INSPECT = '#c-board .sq, #c-hand .sq, #c-reveal .sq, #cdeck-grid .sq, #cdeck-choose .sq';
document.addEventListener('contextmenu', e => { const c = e.target.closest(C_INSPECT); if (c && cInspectEl(c)) e.preventDefault(); });
// Touch: hold a card for half a second
let cPress = 0, cSwallow = false;
document.addEventListener('pointerdown', e => {
  const c = e.pointerType !== 'mouse' && e.target.closest(C_INSPECT); if (!c) return;
  const x = e.clientX, y = e.clientY; clearTimeout(cPress);
  cPress = setTimeout(() => { if (cInspectEl(c)) cSwallow = true; }, 500);
  const cancel = ev => { if (ev.type !== 'pointermove' || Math.hypot(ev.clientX - x, ev.clientY - y) > 10) { clearTimeout(cPress); off(); } };
  const off = () => ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.removeEventListener(t, cancel));
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, cancel));
});
document.addEventListener('click', e => { if (cSwallow) { cSwallow = false; e.stopPropagation(); e.preventDefault(); } }, true);

/* ---------- Control deck (15 of the 20 Control heroes, saved in this browser) ---------- */
function loadCDeck() {
  try { const d = JSON.parse(localStorage.getItem('pp-cdeck') || 'null'); if (Array.isArray(d) && d.length === CDECK && d.every(h => CH[h])) return d; } catch (e) { /* storage blocked */ }
  return CDEFAULT.slice();
}
let cDeck = loadCDeck();
function saveCDeck() { try { localStorage.setItem('pp-cdeck', JSON.stringify(cDeck)); } catch (e) { /* storage blocked */ } }

/* ---------- Square card ---------- */
const MOVE_ICON = '<svg viewBox="0 0 24 24"><path d="M4 11h11l-4-4 2-2 8 7-8 7-2-2 4-4H4z" fill="currentColor"/></svg>';
// Art is set through element.style (never a style attribute) so the Claude viewer's rules allow it.
function paintSq(el, id) {
  const h = HEROES[id], sk = skinOf(id), a = sk || (hasArt(id) && PORTRAITS[id]);
  el.style.setProperty('--c1', h.colors[0]); el.style.setProperty('--c2', h.colors[1]);
  const bg = el.querySelector('.bg'); if (bg && typeof CITY_BG !== 'undefined') bg.style.backgroundImage = `url("${CITY_BG}")`;
  const hero = el.querySelector('.hero'); if (!hero || !a) return;
  hero.style.backgroundImage = `url("${a.src}")`;
  hero.style.aspectRatio = a.w + ' / ' + a.h; // skins are cutouts like the base art, so they pop out the same way (v79)
}
// What each role does when it lands (role flipping, v78)
const CROLE_TXT = { damage: 'Flips a weaker enemy next to it.', tank: 'Guards: +2 defending for it and allies next to it.', support: 'Boosts a flipped ally next to it by +2. If that beats the enemies next to it, the ally flips back.' };
function sqCard(id, o = {}) {
  const h = HEROES[id], c = CH[id], el = document.createElement('div');
  const pw = o.pw ?? c.power, cls = pw > c.power ? ' up' : pw < c.power ? ' down' : '';
  el.className = 'sq' + (o.team ? ' tok ' + o.team : '') + (o.cls ? ' ' + o.cls : '');
  el.dataset.hero = id;
  // Full cards: the hero pops out above the frame like the Push cards. Board tokens keep the hero inside.
  const art = o.team || o.flipTo ? `<div class="art"><div class="bg"></div><div class="hero"></div></div>` : `<div class="art"><div class="bg"></div></div><div class="popwrap"><div class="hero"></div></div>`;
  const badges = `<div class="pw${cls}"><span>${pw}</span></div><div class="role">${ROLE_ICONS[h.role]}</div>`;
  if (o.flipTo) {
    // two faces: old team on the front, new team on the back
    el.className += ' flipper';
    el.innerHTML = `<div class="fin"><div class="fface ${o.team}">${art}${badges}</div><div class="fface back ${o.flipTo}">${art}${badges}</div></div><div class="ring"></div>`;
    el.querySelectorAll('.fface').forEach(f => paintSq(f, id));
  } else {
    const ab = CR.abil ? `<div class="ab"><b>${c.ab}</b><p>${c.text}</p></div>` : `<div class="ab"><b>${CR.roleFlip ? h.role : 'Power only'}</b><p>${CR.roleFlip ? CROLE_TXT[h.role] : 'Abilities are off in this test.'}</p></div>`;
    el.innerHTML = art + badges + (o.team ? (o.charge && CR.abil ? `<div class="move" title="Can move this turn">${MOVE_ICON}</div>` : '') : (c.move && CR.abil ? `<div class="move" title="Moves">${MOVE_ICON}</div>` : '') +
      `<div class="nm"><span>${cname(id)}</span></div>${ab}`);
    paintSq(el, id);
  }
  el.setAttribute('aria-label', `${cname(id)}, Power ${pw}. ${c.ab}: ${c.text}`);
  return el;
}

/* ---------- Game screen ---------- */
const CG = { m: null, view: null, sel: null, tile: null, mvFrom: null, mv: null, busy: false, last: '' };
const cwait = ms => new Promise(r => setTimeout(r, T(ms)));
function startControl(deckId = CG.deckId || 'mine') {
  CG.deckId = deckId;
  const mine = deckId === 'mine' ? cDeck : CDECKS.find(d => d.id === deckId).heroes;
  const bot = CDECKS[Math.floor(Math.random() * CDECKS.length)].heroes;
  CG.m = cNewMatch(mine, bot); CG.view = CG.m.board.map(t => t); CG.sel = CG.tile = null; CG.busy = false; CG.review = false;
  CG.last = 'Pick a hero, then a green tile, then Lock in. ' + (CR.order === 'alt' ? 'The first play is revealed together, then you take turns.' : 'Both players reveal at the same time.');
  $('#c-end').hidden = true;
  show('control'); cDraw();
}
// The board after the move you planned (placement tiles are checked against it)
const cPlanBoard = () => cMovedBoard(CG.m, CG.mv);
const cCanMove = i => !CG.busy && CG.m.turn <= CTURNS && CG.m.board[i] && CG.m.board[i].owner === 0 && cMoves(CG.m.board, i, CG.m).length > 0;
function cDraw() {
  const m = CG.m, b = CG.mv && !CG.busy ? cMovedBoard({ board: CG.view }, CG.mv) : CG.view, done = m.turn > CTURNS;
  $('#c-round').textContent = 'Round ' + m.round;
  $('#c-turn').textContent = done ? 'Round over' : `Turn ${m.turn} of ${CTURNS}` + (CR.order === 'alt' ? ' · ' + cWhoText(m) : '');
  $('#c-pips').innerHTML = [0, 1, 2].map(k => `<i class="${m.results[k] === 0 ? 'a' : m.results[k] === 1 ? 'e' : m.results[k] === -1 ? 'd' : ''}"></i>`).join('');
  const left = p => m.hands[p].length + (m.later ? m.later[p].length : 0);
  $('#c-foe-left').textContent = left(1) + ' cards left';
  $('#c-left').textContent = left(0);
  $('#c-msg').textContent = CG.last;
  const z = [cScore(b, 0), cScore(b, 1)];
  const mo = p => m.wins[p] && m.turn === 1 && !done ? ` <i class="mom">+${CR.mom * m.wins[p]}</i>` : '';
  const ln = [cLines(b, 0), cLines(b, 1)], lt = ln.map(x => new Set(x.flatMap(l => l.tiles))), lp = ln.map(x => x.reduce((n, l) => n + l.pts, 0));
  const lb = p => lp[p] ? ` <i class="lnb">lines +${lp[p]}</i>` : '';
  $('#c-zone').innerHTML = `<span class="za${z[0] > z[1] ? ' lead' : ''}">You <b>${z[0]}</b>${lb(0)}${mo(0)}</span><span class="zl">Board score</span><span class="ze${z[1] > z[0] ? ' lead' : ''}">${mo(1)}${lb(1)}<b>${z[1]}</b> Bot</span>`;
  const L = CG.sel && !CG.busy && !done ? cLegal(cPlanBoard(), 0, CG.sel, m.turn) : [];
  const M = CG.mvFrom != null && !CG.busy && !done ? cMoves(m.board, CG.mvFrom, m).filter(j => j !== CG.tile) : [];
  const g = $('#c-board'); g.innerHTML = '';
  g.style.setProperty('--cols', CN); g.style.setProperty('--rows', CRW);
  for (let i = 0; i < CT; i++) {
    const d = document.createElement('div'), r = crc(i)[0], t = b[i];
    d.className = 'tile' + (CVOID.has(i) ? ' void' : '') + (lt[0].has(i) ? ' line-a' : lt[1].has(i) ? ' line-e' : '') + (r === CRW - 1 ? ' spawn-a' : r === 0 ? ' spawn-e' : '') + (i === CPT ? ' point' : near(CPT).includes(i) ? ' zone' : '') + (L.includes(i) ? ' can' : '') + (M.includes(i) ? ' mvopt' : '') + (i === CG.tile ? ' chosen' : '') + (i === CG.mvFrom || CG.mv && i === CG.mv.from ? ' mvfrom' : '') + (CG.mv && i === CG.mv.to ? ' mvto' : '');
    d.dataset.i = i;
    if (CBONUS.has(i)) { d.classList.add('bonus'); d.insertAdjacentHTML('beforeend', `<span class="bnl">+${CBONUS.get(i)}</span>`); }
    if (i === CPT) d.insertAdjacentHTML('beforeend', `<span class="bnl pt">×2</span>`);
    if (t) d.appendChild(sqCard(t.id, { team: t.owner ? 'enemy' : 'ally', pw: cPower(b, i), charge: !CG.review && cCanMove(i), cls: !cFlippable(t, m) ? 'locked' : '' }));
    else if (i === CG.tile && CG.sel) d.appendChild(sqCard(CG.sel, { team: 'ally', cls: 'preview' }));
    g.appendChild(d);
  }
  const hand = $('#c-hand'); hand.innerHTML = '';
  for (const id of m.hands[0]) hand.appendChild(sqCard(id, { cls: (id === CG.sel ? 'sel' : '') + (CG.busy ? ' dim' : '') }));
  $('#c-lock').disabled = !CG.sel || CG.tile == null || CG.busy || done;
  $('#c-lock').textContent = CG.mv ? 'Lock in + move' : 'Lock in';
  $('#c-lock').hidden = done;
  // After the match: "Results" brings the end screen back while you look over the final board.
  $('#c-next').hidden = !done || (cMatchOver() && !CG.review);
  $('#c-next').textContent = cMatchOver() ? 'Results' : 'Next round';
}
const cMatchOver = () => CG.m.results.length >= 3;
function tileEl(i) { return $(`#c-board .tile[data-i="${i}"]`); }
function tokEl(i) { const t = tileEl(i); return t && t.querySelector('.sq'); }
// Plays out engine steps on screen. Returns the log lines.
async function cShow(steps) {
  const nm = cname, log = [];
  for (const s of steps) {
    if (s.t === 'clash') {
      log.push(s.win < 0 ? `Clash! ${nm(s.ids[0])} and ${nm(s.ids[1])} tie and both are knocked out.` : `Clash! ${nm(s.ids[s.win])} wins the tile over ${nm(s.ids[1 - s.win])}.`);
      CG.last = log.join(' '); cDraw(); tileEl(s.tile).classList.add('clash'); Sfx.ability && Sfx.ability('damage'); await cwait(800); continue;
    }
    if (s.t === 'move') {
      const from = tileEl(s.from).getBoundingClientRect();
      cApply(CG.view, s); cDraw();
      const el = tokEl(s.to), to = tileEl(s.to).getBoundingClientRect();
      el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`; void el.offsetWidth;
      el.classList.add('moving'); el.style.transform = '';
      if (s.push) log.push(`${nm(s.id)} is pushed back.`); else log.push(`${nm(s.id)} moves.`);
      Sfx.place(); await cwait(550); continue;
    }
    if (s.t === 'flip') {
      const was = CG.view[s.tile].owner, by = tokEl(s.by);
      if (by) { const a = tileEl(s.by).getBoundingClientRect(), z = tileEl(s.tile).getBoundingClientRect(); by.style.setProperty('--lx', Math.sign(z.left - a.left) * 18 + 'px'); by.style.setProperty('--ly', Math.sign(z.top - a.top) * 18 + 'px'); by.classList.add('lunge'); }
      await cwait(220);
      const t = tileEl(s.tile), old = t.querySelector('.sq');
      const f = sqCard(CG.view[s.tile].id, { team: was ? 'enemy' : 'ally', flipTo: s.to ? 'enemy' : 'ally', pw: cPower(CG.view, s.tile) });
      old.replaceWith(f); void f.offsetWidth; f.classList.add('flipping'); Sfx.flip();
      await cwait(750);
      cApply(CG.view, s);
      log.push(s.to === was ? '' : s.rescue ? `${nm(CG.view[s.by].id)} rescues ${nm(CG.view[s.tile].id)}.` : s.boost ? `Powered up, ${nm(CG.view[s.by].id)} flips ${nm(CG.view[s.tile].id)}.` : `${nm(CG.view[s.tile].id)} is flipped.`);
      CG.last = log.filter(Boolean).join(' '); cDraw(); continue;
    }
    cApply(CG.view, s);
    if (s.t === 'place') { if (s.bonus) log.push(`${nm(s.id)} +${s.bonus}.`); Sfx.place(); cDraw(); const el = tokEl(s.tile); if (el) { el.classList.add('drop'); if (s.bonus) el.querySelector('.pw').classList.add('pop'); } await cwait(420); }
    if (s.t === 'settle') continue;
    if (s.t === 'mod') { const who = nm(CG.view[s.tile].id); log.push(s.why === 'nano' ? `Ana nano boosts ${who} (+3).` : s.why === 'headshot' ? `Widowmaker headshots ${who} (−2).` : `Storm Arrow hits ${who} (−1).`); cDraw(); const el = tokEl(s.tile); if (el) el.querySelector('.pw').classList.add('pop'); await cwait(500); }
  }
  CG.view = CG.m.board.map(t => t && { ...t });
  return log.filter(Boolean);
}
const cWhoText = m => { const w = cWho(m); return w < 0 ? 'Reveal' : w ? 'Bot’s move' : 'Your move'; };
async function cLock() {
  const m = CG.m; if (CG.busy || !CG.sel || CG.tile == null || cWho(m) === 1) return;
  CG.busy = true; Sfx.init(); Sfx.click();
  const who = cWho(m), mine = { id: CG.sel, tile: CG.tile, mv: CG.mv };
  CG.sel = CG.tile = CG.mvFrom = CG.mv = null; cDraw();
  let log;
  if (who < 0) {
    const foe = cBot(m, 1);
    // Reveal both picks
    const rv = $('#c-reveal'); rv.innerHTML = '';
    const side = (id, who, cls) => { const w = document.createElement('div'); w.className = 'rv ' + cls; w.appendChild(sqCard(id)); w.insertAdjacentHTML('beforeend', `<span>${who}</span>`); return w; };
    rv.append(side(mine.id, 'You', 'a'), side(foe.id, 'Bot', 'e')); rv.hidden = false; Sfx.reveal();
    await cwait(1100); rv.hidden = true;
    log = await cShow(cPlay(m, [mine, foe]));
    if (CR.order === 'alt' && m.turn <= CTURNS) log.push(m.first ? 'The bot played the bigger Power, so it goes first.' : 'You played the bigger Power, so you go first.');
  } else log = await cShow(cPlay(m, [mine, null]));
  CG.last = log.join(' ') || 'No one was flipped.';
  CG.busy = false; cDraw();
  await cBotTurns();
}
// Taking turns: the bot plays on its own when it is its move.
async function cBotTurns() {
  const m = CG.m;
  while (m.turn <= CTURNS && cWho(m) === 1) {
    CG.busy = true; CG.last = 'The bot is playing…'; cDraw(); await cwait(700);
    const foe = cBot(m, 1), log = await cShow(cPlay(m, [null, foe]));
    CG.last = (`The bot plays ${cname(foe.id)}. ` + log.join(' ')).trim() + ' Your move.';
    CG.busy = false; cDraw();
  }
  if (m.turn > CTURNS) await cRoundEnd();
}
const lpOf = (b, p) => p < 0 ? 0 : cLines(b, p).reduce((n, l) => n + l.pts, 0);
async function cRoundEnd() {
  const m = CG.m, w = cEndRound(m);
  CG.last = `Round ${m.round}: ` + (w === 0 ? 'you win' : w === 1 ? 'the bot wins' : 'draw') + (w < 0 ? '.' : ` with ${cScore(m.board, w)} points against ${cScore(m.board, 1 - w)}.`) +
    (lpOf(m.board, w) ? ` Lines gave ${w ? 'the bot' : 'you'} +${lpOf(m.board, w)}.` : '') + (m.round < 3 ? (w >= 0 ? ` ${w ? 'The bot\'s' : 'Your'} first hero next round gets +${CR.mom * m.wins[w]}.` : '') + ' Heroes on the board stay for the next round.' : '');
  if (w === 0) Sfx.win(); else if (w === 1) Sfx.lose();
  cDraw();
  if (cMatchOver()) {
    await cwait(900);
    const mw = cMatchWinner(m), win = mw === 0, lose = mw === 1;
    const e = $('#c-end');
    e.innerHTML = `<div class="end ${win ? 'win' : lose ? 'lose' : ''}"><h2>${win ? 'Victory' : lose ? 'Defeat' : 'Draw'}</h2><p>Final board: You ${m.pts[0]} – ${m.pts[1]} Bot</p><div class="row"><button class="btn" id="c-again">Play again</button><button class="btn ghost" id="c-view">View board</button><button class="btn ghost" id="c-decks">Decks</button><button class="btn ghost" data-go="menu">Menu</button></div></div>`;
    e.hidden = false; if (win) Sfx.victory(); else if (lose) Sfx.defeat();
    $('#c-again').onclick = () => { Sfx.click(); startControl(); };
    $('#c-view').onclick = () => { Sfx.click(); e.hidden = true; CG.review = true; CG.last = 'Final board. Right-click (or hold) any hero to see its Power. Tap Results to go back.'; cDraw(); };
    $('#c-decks').onclick = () => { Sfx.click(); $('#c-end').hidden = true; renderCDeckChoose(); show('cdecksel'); };
  }
}
function cNextRound() { const m = CG.m; m.round++; cNewRound(m); CG.view = m.board.map(t => t && { ...t }); CG.last = `Round ${m.round}. The board stays. Last round’s heroes can still be flipped, older ones can’t.` + (cWho(m) === 0 ? ' You go first.' : cWho(m) === 1 ? ' The bot goes first.' : '') + (m.round === 2 && CR.draw ? ' Your last 5 heroes join your hand.' : '') + ` You have ${m.hands[0].length} cards in hand.`; Sfx.click(); cDraw(); cBotTurns(); }
function initControl() {
  $('#c-hand').addEventListener('click', e => {
    const c = e.target.closest('.sq'); if (!c || CG.busy || CG.m.turn > CTURNS) return;
    Sfx.init(); Sfx.click(); CG.sel = c.dataset.hero;
    if (CG.tile != null && !cLegal(cPlanBoard(), 0, CG.sel, CG.m.turn).includes(CG.tile)) CG.tile = null;
    CG.last = CR.abil ? `${cname(CG.sel)}: ${CH[CG.sel].text}` + (CH[CG.sel].move ? ' Once it is on the board, it can move on your later turns.' : '') : `${cname(CG.sel)}, Power ${CH[CG.sel].power}. Pick a green tile.`; cDraw();
  });
  $('#c-board').addEventListener('click', e => {
    const t = e.target.closest('.tile'); if (!t || CG.busy) return;
    const i = +t.dataset.i, v = CG.view[i];
    const m = CG.m;
    // 1. a move target for the hero you picked to move
    if (CG.mvFrom != null && i !== CG.tile && cMoves(m.board, CG.mvFrom, m).includes(i)) {
      Sfx.click(); CG.mv = { from: CG.mvFrom, to: i }; CG.mvFrom = null;
      if (CG.sel && CG.tile != null && !cLegal(cPlanBoard(), 0, CG.sel, m.turn).includes(CG.tile)) CG.tile = null;
      CG.last = CG.mv ? `${cname(m.board[CG.mv.from].id)} will move there first. Tap it again to cancel the move.` : 'Move cancelled.'; cDraw(); return;
    }
    // 2. tap the hero you planned to move to cancel, or one of your movers to plan its move (before you place)
    if (CG.mv && i === CG.mv.to) { Sfx.click(); CG.mv = null; if (CG.sel && CG.tile != null && !cLegal(cPlanBoard(), 0, CG.sel, m.turn).includes(CG.tile)) CG.tile = null; CG.last = 'Move cancelled.'; cDraw(); return; }
    if (cCanMove(i) && !(CG.mv && i === CG.mv.from)) {
      Sfx.click(); const on = CG.mvFrom !== i && !(CG.mv && CG.mv.from === i); CG.mvFrom = on ? i : null; CG.mv = null;
      if (CG.sel && CG.tile != null && !cLegal(cPlanBoard(), 0, CG.sel, m.turn).includes(CG.tile)) CG.tile = null;
      CG.last = on ? `Pick an orange tile for ${cname(v.id)} to move to. It moves before your new hero lands. One move per turn.` : 'Move cancelled.';
      cDraw(); return;
    }
    // 3. a tile to place your hero on
    if (CG.sel && cLegal(cPlanBoard(), 0, CG.sel, m.turn).includes(i)) { Sfx.click(); CG.tile = i; cDraw(); return; }
    if (v) { CG.last = `${cname(v.id)} (${v.owner ? 'enemy' : 'yours'}), Power ${cPower(CG.view, i)}.` + (CR.abil ? ` ${CH[v.id].ab}: ${CH[v.id].text}` : ''); cDraw(); }
  });
  $('#c-lock').onclick = cLock;
  $('#c-next').onclick = () => { if (cMatchOver()) { Sfx.click(); $('#c-end').hidden = false; return; } cNextRound(); };
  $('#c-quit').onclick = () => { Sfx.init(); Sfx.click(); renderCDeckChoose(); show('cdecksel'); };
  initCDecks();
  $('#c-abil').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Sfx.init(); Sfx.click(); settings.cAbil = b.dataset.v; saveSettings(); renderCDeckChoose(); });
  $('#c-order').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Sfx.init(); Sfx.click(); settings.cOrder = b.dataset.v; saveSettings(); renderCDeckChoose(); });
  syncAbil();
  $('#cdeck-choose').addEventListener('click', e => {
    const b = e.target.closest('[data-cdeck]'), ed = e.target.closest('[data-cedit]');
    if (ed) { Sfx.init(); Sfx.click(); decksView = 'control'; renderDecksView(); show('decks'); return; }
    if (!b) return;
    Sfx.init(); Sfx.click();
    if (b.dataset.cdeck === 'mine' && !cDeckReady()) { decksView = 'control'; renderDecksView(); show('decks'); toastAny('Finish your Mayhem deck first: it needs 15 heroes.'); return; }
    startControl(b.dataset.cdeck);
  });
}

/* ---------- Decks screen: Push / Control switch ---------- */
let decksView = 'push';
function initCDecks() {
  $('#decks-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    Sfx.init(); Sfx.click(); decksView = b.dataset.v; renderDecksView();
  });
  $('#cdeck-grid').addEventListener('click', e => {
    const c = e.target.closest('.sq'); if (!c) return;
    Sfx.init(); Sfx.click();
    const id = c.dataset.hero;
    if (cDeck.includes(id)) { if (cDeck.length <= CDECK) { cDeck = cDeck.filter(h => h !== id); } }
    else if (cDeck.length < CDECK) cDeck.push(id);
    else { toastAny(`Your Mayhem deck is full. Tap a hero in it to take them out first.`); return; }
    if (cDeck.length === CDECK) saveCDeck();
    renderCDeck();
  });
  $('#cdeck-reset').onclick = () => { Sfx.init(); Sfx.click(); cDeck = CDEFAULT.slice(); saveCDeck(); renderCDeck(); };
  renderDecksView();
}
function renderDecksView() {
  $$('#decks-mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === decksView));
  $$('#scr-decks .push-only').forEach(el => { el.hidden = decksView !== 'push'; });
  $('#cdeck').hidden = decksView !== 'control';
  if (decksView === 'control') renderCDeck();
}
function renderCDeck() {
  const n = cDeck.length;
  $('#cdeck-count').innerHTML = `Mayhem deck <b class="${n === CDECK ? 'ok' : ''}">${n} / ${CDECK}</b>`;
  $('#cdeck-note').textContent = n === CDECK ? 'Saved. Tap a hero in your deck to swap them out.' : `Pick ${CDECK - n} more. Your deck saves once it has ${CDECK} heroes.`;
  const g = $('#cdeck-grid'); g.innerHTML = '';
  const order = ['tank', 'damage', 'support'];
  for (const id of [...CIDS].sort((a, b) => order.indexOf(crole(a)) - order.indexOf(crole(b)))) g.appendChild(sqCard(id, { cls: cDeck.includes(id) ? 'in' : 'out' }));
}
/* ---------- Control deck select (like Push) ---------- */
function syncAbil() {
  CR.abil = settings.cAbil === 'on';
  $$('#c-abil button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v === 'on') === CR.abil));
  $('#c-abil-desc').textContent = CR.abil ? 'Every hero uses their own ability on top of their role. Lines of 3 or more still score a bonus.' : 'Hero abilities are off, but roles still work: Damage flips, Tanks guard, Supports boost a flipped ally by +2 to win it back. Put 3 or more of your heroes in a line for bonus points (3 = +3, 4 = +5, 5 = +8).';
  CR.order = settings.cOrder === 'alt' ? 'alt' : 'sim';
  $$('#c-order button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === CR.order));
  $('#c-order-desc').textContent = CR.order === 'alt' ? 'Test: the first play of the match is revealed together, then whoever played the bigger Power goes first and you take turns. The round winner goes first next round.' : 'Both players pick in secret every turn and reveal at the same time.';
}
function renderCDeckChoose() {
  syncAbil();
  const wrap = $('#cdeck-choose'); wrap.innerHTML = '';
  const order = ['tank', 'damage', 'support'];
  const all = [...CDECKS, { id: 'mine', name: 'My deck', tag: 'Custom', desc: 'Your own 15 heroes. Change them on the Decks screen.', heroes: cDeck }];
  for (const d of all) {
    const p = document.createElement('article'); p.className = 'deck-panel cdeck-panel';
    const list = [...d.heroes].sort((a, b) => order.indexOf(crole(a)) - order.indexOf(crole(b)) || CH[b].power - CH[a].power);
    p.innerHTML = `<div class="cfan"></div><div><span class="pill">${d.tag}</span> <span class="pill dim">${d.heroes.length} cards</span></div><h3 class="deck-name">${escapeHtml(d.name)}</h3><p class="deck-desc">${d.desc}</p>` +
      `<ul class="hero-list">${list.map(id => `<li><span class="rl">${ROLE_ICONS[crole(id)]}</span><span class="nm">${cname(id)}</span><span class="pw">${CH[id].power}</span></li>`).join('')}</ul>` +
      `<div class="cdeck-acts">${d.id === 'mine' ? '<button class="btn ghost" data-cedit="1">Edit</button>' : ''}<button class="btn" data-cdeck="${d.id}">Play ${escapeHtml(d.name)}</button></div>`;
    (d.feat || d.heroes.slice(0, 3)).forEach(id => p.querySelector('.cfan').appendChild(sqCard(id)));
    wrap.appendChild(p);
  }
}
// The match only starts with a full deck
const cDeckReady = () => cDeck.length === CDECK;
initControl();
// How to play: one tab per mode, each with an example picture
function initHowto() {
  if (typeof HOWTO_PICS !== 'undefined') { $('#how-pic-push').src = HOWTO_PICS.push; $('#how-pic-control').src = HOWTO_PICS.control; }
  $('#howto-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    Sfx.init(); Sfx.click();
    $$('#howto-mode button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#how-push').hidden = b.dataset.v !== 'push';
    $('#how-control').hidden = b.dataset.v !== 'control';
  });
}
initHowto();
