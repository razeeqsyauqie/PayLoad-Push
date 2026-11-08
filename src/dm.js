/* ===== Deathmatch: you and 3 bots, hand of 3. Everyone reveals 1 hero; the highest final Power scores a point. First to 4 wins. =====
   Each hero duels the strongest other hero on the table (by starting Power): its ability and that rival's ability run through
   the normal battle engine, and the hero's Power after that duel is what counts. Robot abilities use their Control (score) versions:
   "ahead" and "behind" are measured against the top other score. Effects that last past the battle (Next buffs, discards) don't carry over. */
const DM_GOAL = 4, DM_TURNS = 15, DM_HAND = 3;
var DM = { live: false, token: 0, seats: [], turn: 0, pick: null };
const dmWait = ms => { const t = DM.token; return new Promise((res, rej) => setTimeout(() => (t === DM.token ? res() : rej(ABORT)), T(ms))); };
const dmBase = c => HEROES[c.id].power + (c.bonus || 0);

function dmDraw(seat) {
  if (!seat.deck.length) { seat.deck = shuffle(seat.discard); seat.discard = []; }
  const c = seat.deck.pop();
  if (c) c.held = false;
  return c;
}
function dmCtx(i, extra = {}) {
  const seat = DM.seats[i];
  const top = Math.max(...DM.seats.filter((_, j) => j !== i).map(s => s.score));
  const steps = seat.score - top;
  return { behind: steps < 0, steps, ...reserveView(seat), wonLast: seat.won, lostLast: seat.lost, played: seat.played, foePlayed: [], turret: 0, next: [], curse: [], ...extra };
}

function newDM(deckId) {
  DM.token++; gameId++;
  if (G) G.over = true;
  const others = shuffle(DECKS.map(d => d.id)).slice(0, 3);
  const seat = (name, deckId, bot) => ({ name, deckId, bot, deck: makeDeck(deckId), hand: [], discard: [], played: [], score: 0, won: false, lost: false });
  DM.seats = [seat('You', deckId, false), ...others.map((d, k) => seat('Bot ' + (k + 1), d, true))];
  DM.seats.forEach((s, k) => { if (k) s.deckName = getDeck(s.deckId).name; });
  DM.turn = 0; DM.live = true;
  setPowerMode('hand');
  $('#dm-end').hidden = true;
  show('dm');
  dmRender();
  dmRun(DM.token);
}

async function dmRun(token) {
  try {
    await dmWait(300);
    while (DM.live && token === DM.token) await dmTurn();
  } catch (e) { if (e !== ABORT) console.error(e); }
}

function dmRender() {
  const seats = DM.seats;
  $('#dm-turn').innerHTML = `Turn <b>${Math.max(DM.turn, 1)}</b> / ${DM_TURNS} · first to ${DM_GOAL}`;
  const pips = n => Array.from({ length: DM_GOAL }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  $$('.dm-seat').forEach(el => {
    const i = +el.dataset.seat, s = seats[i];
    el.querySelector('.dm-name').textContent = s.name;
    el.querySelector('.dm-deck').textContent = i ? s.deckName : getDeck(s.deckId).name;
    el.querySelector('.dm-pips').innerHTML = pips(s.score);
    el.classList.toggle('leader', s.score > 0 && s.score === Math.max(...seats.map(x => x.score)));
  });
}
function dmRenderHand() {
  const wrap = $('#dm-hand'); wrap.innerHTML = '';
  for (const c of DM.seats[0].hand) {
    const el = cardEl(c);
    if (c.held) el.insertAdjacentHTML('beforeend', '<span class="dm-held">Reserve</span>');
    el.addEventListener('click', () => { if (DM.pick) { Sfx.init(); Sfx.click(); const f = DM.pick; DM.pick = null; f(c); } });
    wrap.appendChild(el);
  }
}

async function dmTurn() {
  const seats = DM.seats;
  DM.turn++;
  for (const s of seats) { while (s.hand.length < DM_HAND) { const c = dmDraw(s); if (!c) break; s.hand.push(c); } }
  $$('.dm-slot').forEach(el => { el.innerHTML = ''; el.classList.remove('won', 'lost'); });
  $$('.dm-note').forEach(el => { el.textContent = ''; });
  $('#dm-result').className = 'dm-result';
  dmRender(); dmRenderHand(); Sfx.draw();
  $('#dm-hint').textContent = 'Tap a hero to play it.';
  const mine = await new Promise(res => { DM.pick = res; });
  $('#dm-hint').textContent = '';
  // bots choose with the normal AI
  const picks = seats.map((s, i) => i === 0 ? mine : s.hand[aiChooseHand({ hand: s.hand, ctxFor: c => dmCtx(i, { fromReserve: !!c.held }) })]);
  seats.forEach((s, i) => { s.hand = s.hand.filter(c => c !== picks[i]); });
  dmRenderHand();
  // everyone lays a card face down, then all flip
  const els = picks.map((c, i) => { const el = cardEl(c, { down: i > 0 }); $(`.dm-seat[data-seat="${i}"] .dm-slot`).appendChild(el); return el; });
  Sfx.flip(); await dmWait(500);
  els.forEach(el => el.classList.remove('down')); Sfx.reveal();
  await dmWait(600);

  // each hero duels the strongest other hero on the table
  const base = picks.map(dmBase);
  const results = picks.map((c, i) => {
    let r = -1; picks.forEach((d, j) => { if (j !== i && (r < 0 || base[j] > base[r])) r = j; });
    const inP = { id: c.id, bonus: c.bonus || 0, ctx: dmCtx(i, { fromReserve: !!c.held }) };
    const inE = { id: picks[r].id, bonus: picks[r].bonus || 0, ctx: dmCtx(r, { fromReserve: !!picks[r].held }) };
    return { rival: r, res: resolve({ p: inP, e: inE }) };
  });
  const final = results.map(x => x.res.powers.p);
  for (let i = 0; i < 4; i++) {
    const own = results[i].res.events.filter(ev => ev.side === 'p');
    const note = $(`.dm-seat[data-seat="${i}"] .dm-note`);
    note.textContent = own.length ? ctrlWords(own[own.length - 1].text) : `vs ${HEROES[picks[results[i].rival].id].name}`;
    setPower(els[i], final[i], base[i]);
    if (own.length) { fx(els[i], 'casting', 700); Sfx.ability(own[0].kind); }
    await dmWait(own.length ? 650 : 200);
  }
  await dmWait(400);

  // the single highest Power scores
  const top = Math.max(...final), tops = final.map((v, i) => v === top ? i : -1).filter(i => i >= 0);
  const res = $('#dm-result');
  let w = -1;
  if (tops.length === 1) {
    w = tops[0];
    const rr = results[w].res;
    let pts = rr.winner === 'p' ? Math.min(rr.push, DM_GOAL) : 1;
    seats[w].score += pts;
    els.forEach((el, i) => el.classList.add(i === w ? 'won' : 'lost'));
    res.innerHTML = pts ? `${w === 0 ? 'You score' : seats[w].name + ' scores'}${pts > 1 ? ' ' + pts : ''}<small>${HEROES[picks[w].id].name} · ${top} Power</small>` : `Nobody scores<small>${HEROES[picks[w].id].name} won, but the score holds</small>`;
    res.className = 'dm-result show ' + (w === 0 ? 'ally' : 'enemy');
    if (w === 0) Sfx.win(); else Sfx.lose();
  } else {
    res.innerHTML = `Tie at the top<small>${top} Power · nobody scores</small>`;
    res.className = 'dm-result show';
    Sfx.draw0();
  }
  // Sigma: the leader loses 1 point
  picks.forEach((c, i) => {
    if (HEROES[c.id].fx && HEROES[c.id].fx.type === 'pull' && !results[i].res.hacked.p) {
      const hi = Math.max(...seats.map(s => s.score)), lead = seats.filter(s => s.score === hi);
      if (hi > 0 && lead.length === 1) { lead[0].score--; toast(`${seats[i].name === 'You' ? 'Your' : seats[i].name + '’s'} Sigma: ${lead[0].name === 'You' ? 'you lose' : lead[0].name + ' loses'} 1 point`); }
    }
  });
  seats.forEach((s, i) => { s.won = i === w; s.lost = w >= 0 && i !== w; s.played.push(picks[i].id); s.discard.push(picks[i]); s.hand.forEach(c => { c.held = true; }); });
  dmRender();
  await dmWait(1500);

  const best = Math.max(...seats.map(s => s.score)), leaders = seats.filter(s => s.score === best);
  if (best >= DM_GOAL) return dmEnd(leaders[0]);
  if (DM.turn >= DM_TURNS) return dmEnd(leaders.length === 1 ? leaders[0] : null, true);
}

function dmEnd(winner, timeUp) {
  DM.live = false;
  const seats = [...DM.seats].sort((a, b) => b.score - a.score);
  const won = winner === DM.seats[0];
  const title = winner ? (won ? 'Victory' : 'Defeat') : 'Draw';
  const line = winner ? `${won ? 'You' : winner.name} reached ${winner.score} point${winner.score === 1 ? '' : 's'}${timeUp ? ` after ${DM_TURNS} turns` : ''}.` : `Turn ${DM_TURNS} is over and the top score is tied.`;
  const end = $('#dm-end');
  end.innerHTML = `<div class="end ${winner ? (won ? 'win' : 'lose') : 'draw'}"><h2>${title}</h2><p>${escapeHtml(line)}</p>
    <ol class="dm-standings">${seats.map(s => `<li${s === DM.seats[0] ? ' class="me"' : ''}><span>${escapeHtml(s.name)}</span><b>${s.score}</b></li>`).join('')}</ol>
    <div class="row"><button class="btn" id="dm-again">Play again</button><button class="btn ghost" id="dm-deck">Change deck</button><button class="btn ghost" id="dm-menu">Main menu</button></div></div>`;
  end.hidden = false;
  if (won) { Sfx.victory(); startConfetti(); } else if (winner) Sfx.defeat(); else Sfx.draw0();
  $('#dm-again').onclick = () => { Sfx.click(); stopConfetti(); newDM(DM.seats[0].deckId); };
  $('#dm-deck').onclick = () => { Sfx.click(); stopConfetti(); dmQuit('decksel'); };
  $('#dm-menu').onclick = () => { Sfx.click(); stopConfetti(); dmQuit('menu'); };
}
function dmQuit(to) {
  DM.token++; DM.live = false; DM.pick = null;
  $('#dm-end').hidden = true;
  show(to);
}
if ($('#dm-rules-btn')) {
  $('#dm-rules-btn').addEventListener('click', () => {
    Sfx.init(); Sfx.click();
    const body = $('#dm-rules .dm-rules-body'); body.innerHTML = '';
    for (const id of ['#how-dm-rules', '#how-dm-cards']) { const b = $(id); if (b) body.appendChild(b.cloneNode(true)).removeAttribute('id'); }
    $('#dm-rules').hidden = false;
  });
  $('#dm-rules-close').addEventListener('click', () => { Sfx.click(); $('#dm-rules').hidden = true; });
}
if ($('#dm-quit')) $('#dm-quit').addEventListener('click', () => { Sfx.init(); Sfx.click(); stopConfetti(); dmQuit('modes'); });
