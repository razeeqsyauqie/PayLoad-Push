/* ---------- Online play with a friend ----------
   Two browsers connect directly over WebRTC (PeerJS). The free PeerJS service only introduces
   them, so the game needs no server of its own.
   Room: the leader (host) owns the room state (mode) and starts the match once both players
   are ready. Each player sends their own deck, ready flag and where they are (room or game).
   Match: both run the same game in lockstep. The leader picks a random seed, every shuffle and
   random ability uses it, and each round the players only send which card they picked.
   After a match both go back to the room to play again or leave. */
const NET_VERSION = 'pp2-' + Object.keys(HEROES).length + '-' + Object.values(HEROES).reduce((n, h) => n + h.power, 0);
const ROOM_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_PREFIX = 'payloadpush-v1-';
const PEER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function loadPeer() {
  if (window.Peer) return;
  try { await loadScript('peerjs.min.js'); } catch (e) { /* not bundled here */ }
  if (!window.Peer) await loadScript(PEER_CDN);
}
function peerOptions() {
  // ?peerhost=host:port points at your own PeerJS server (used for local testing).
  const q = new URLSearchParams(location.search).get('peerhost');
  if (!q) return { debug: 0 };
  const [host, port] = q.split(':');
  return { host, port: +port || 9000, path: '/', secure: location.protocol === 'https:', debug: 0 };
}
const roomCode = () => Array.from({ length: 5 }, () => ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]).join('');

// Modes a room can pick. Only modes that can run in lockstep are open online.
const ROOM_MODES = [
  { id: 'push', name: 'Standard', art: 'reinhardt', text: 'Win battles to push the robot. Hand of 3.' },
];
const ONLINE_DECK_KEY = 'pp-online-deck';
const blankMe = () => ({ deck: null, ready: false, where: 'room' });

const Net = {
  playing: false, peer: null, conn: null, role: null, code: null,
  room: { mode: 'push' }, me: blankMe(), them: null,
  picks: {}, waiters: {},

  status(t) { $('#online-status').textContent = t; },
  inRoom() { return !!this.code && !$('#online-room').hidden; },
  reset() {
    if (this.conn) try { this.conn.close(); } catch (e) { /* closed */ }
    if (this.peer) try { this.peer.destroy(); } catch (e) { /* gone */ }
    Object.assign(this, { playing: false, peer: null, conn: null, role: null, code: null, room: { mode: 'push' }, me: blankMe(), them: null, picks: {}, waiters: {} });
    $('#online-start').hidden = false; $('#online-room').hidden = true;
    $('#btn-host').disabled = false; $('#btn-join').disabled = false;
    $('#online-lead').textContent = 'Make a room and send your friend the code, or join their room.';
    this.status('');
  },

  async host() {
    this.reset(); this.role = 'host';
    $('#btn-host').disabled = true; $('#btn-join').disabled = true;
    this.status('Making a room…');
    try { await loadPeer(); } catch (e) { return this.offline(); }
    const open = () => {
      this.code = roomCode();
      const peer = new Peer(ROOM_PREFIX + this.code, peerOptions());
      this.peer = peer;
      peer.on('open', () => { this.enterRoom(); });
      // one friend at a time; a new friend can join after the last one left
      peer.on('connection', c => { if (this.conn) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 200); }); return; } this.wire(c); });
      peer.on('error', err => {
        if (err.type === 'unavailable-id') { peer.destroy(); open(); return; }
        this.peerError(err);
      });
    };
    open();
  },

  async join(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { this.status('Room codes have 5 letters and numbers.'); return; }
    this.reset(); this.role = 'guest'; this.code = code;
    $('#btn-host').disabled = true; $('#btn-join').disabled = true;
    this.status('Joining room ' + code + '…');
    try { await loadPeer(); } catch (e) { return this.offline(); }
    const peer = new Peer(peerOptions());
    this.peer = peer;
    peer.on('open', () => this.wire(peer.connect(ROOM_PREFIX + code, { reliable: true, serialization: 'json' })));
    peer.on('error', err => this.peerError(err));
  },

  offline() { this.reset(); this.status('Online play couldn’t load. Check your internet connection and try again.'); },
  peerError(err) {
    const t = err && err.type;
    const msg = t === 'peer-unavailable' ? 'No room with that code. Check it and try again.'
      : t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' ? 'Can’t reach the online service right now.'
        : t === 'browser-incompatible' ? 'This browser can’t play online.' : 'Something went wrong connecting.';
    if (this.inGame()) { this.fail('Connection lost. ' + msg); return; }
    // the leader keeps their room if only the link to the friend broke
    if (this.role === 'host' && this.peer && !this.peer.destroyed && t === 'peer-unavailable') return;
    this.reset(); this.status(msg);
  },

  wire(c) {
    this.conn = c;
    c.on('open', () => { this.send({ t: 'hello', v: NET_VERSION }); });
    c.on('data', m => { if (this.conn === c) this.onData(m); });
    c.on('close', () => { if (this.conn === c) this.lost(); });
    c.on('error', () => { if (this.conn === c) this.lost(); });
  },
  send(m) { if (this.conn && this.conn.open) this.conn.send(m); },
  sendMe() { this.send({ t: 'me', deck: this.me.deck, ready: this.me.ready, where: this.me.where }); },
  sendRoom() { if (this.role === 'host') this.send({ t: 'room', mode: this.room.mode }); },

  /* Show the room: the code, both players, the mode and the deck list. */
  enterRoom() {
    $('#online-start').hidden = true; $('#online-room').hidden = false;
    $('#room-code').textContent = this.code;
    $('#online-lead').textContent = this.role === 'host' ? 'You lead this room: pick the mode, then both choose a deck and press Ready.' : 'The leader picks the mode. Choose your deck and press Ready.';
    if (!this.me.deck) {
      // start with the deck used last time, if it is still playable
      let last = null; try { last = localStorage.getItem(ONLINE_DECK_KEY); } catch (e) { /* storage blocked */ }
      const d = last && findDeck(last);
      if (d && !(d.tag === 'Custom' && deckProblem(d.heroes))) this.me.deck = { id: d.id, name: d.name, heroes: d.heroes.slice() };
    }
    this.render();
  },

  onData(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      if (m.v !== NET_VERSION) { this.send({ t: 'bye' }); this.reset(); this.status('You and your friend have different versions of the game. Both reload the page, then try again.'); return; }
      this.them = { deck: null, ready: false, where: 'room' };
      if (this.role === 'guest') this.enterRoom();
      Sfx.init(); Sfx.place();
      this.sendRoom(); this.sendMe(); this.render();
    } else if (m.t === 'full') {
      this.reset(); this.status('That room already has two players.');
    } else if (m.t === 'room' && this.role === 'guest') {
      const changed = m.mode !== this.room.mode;
      this.room.mode = ROOM_MODES.some(x => x.id === m.mode) ? m.mode : 'push';
      if (changed) { this.me.ready = false; this.sendMe(); if (this.inRoom()) toastAny('The leader picked ' + ROOM_MODES.find(x => x.id === this.room.mode).name); }
      this.render();
    } else if (m.t === 'me') {
      if (!this.them) return;
      const d = m.deck && typeof m.deck === 'object' ? { name: String(m.deck.name || 'Deck').slice(0, 24), heroes: (Array.isArray(m.deck.heroes) ? m.deck.heroes : []).filter(h => HEROES[h]).slice(0, 30) } : null;
      const wasReady = this.them.ready;
      this.them = { deck: d, ready: !!m.ready && !!d, where: m.where === 'game' ? 'game' : 'room' };
      if (this.them.ready && !wasReady && this.inRoom()) Sfx.place();
      this.render(); this.maybeStart();
    } else if (m.t === 'start' && this.role === 'guest') {
      this.begin(m);
    } else if (m.t === 'pick') {
      this.picks[m.round] = m.uid;
      if (this.waiters[m.round]) { this.waiters[m.round](m.uid); delete this.waiters[m.round]; }
    } else if (m.t === 'quit') {
      if (this.them) this.them.where = 'room';
      if (this.inGame()) this.fail('Your friend left the match.');
      this.render();
    } else if (m.t === 'bye') {
      this.lost(true);
    }
  },

  /* ---- Room screen ---- */
  render() {
    if (!this.code) return;
    const host = this.role === 'host';
    const slot = (who, p, lead) => {
      const st = !p ? 'Waiting to join…' : p.where === 'game' ? 'Still on the results screen' : p.ready ? 'Ready' : p.deck ? 'Not ready' : 'Choosing a deck';
      return `<div class="pslot${p && p.ready ? ' is-ready' : ''}${!p ? ' empty' : ''}"><div class="pname">${who}${lead ? ' <span class="pill">Leader</span>' : ''}</div>`
        + `<div class="pdeck">${p && p.deck ? escapeHtml(p.deck.name) : '&nbsp;'}</div><div class="pstate">${p && p.ready ? '✓ ' : ''}${st}</div></div>`;
    };
    $('#room-players').innerHTML = slot('You', this.me, host) + slot('Friend', this.them, !host);
    // modes: the leader picks, the friend sees the choice
    const modes = $('#room-modes'); modes.innerHTML = '';
    for (const m of ROOM_MODES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'room-mode' + (m.cls ? ' ' + m.cls : '') + (m.id === this.room.mode ? ' on' : '');
      b.disabled = !!m.soon || !host;
      b.setAttribute('aria-pressed', m.id === this.room.mode ? 'true' : 'false');
      b.innerHTML = `<span class="rm-art"></span><span class="rm-txt"><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.soon || m.text)}</small></span>`;
      const pt = typeof PORTRAITS !== 'undefined' && PORTRAITS[m.art];
      if (pt) { const im = document.createElement('img'); im.alt = ''; im.src = pt.src; b.firstElementChild.appendChild(im); }
      if (!m.soon && host) b.onclick = () => this.pickMode(m.id);
      modes.appendChild(b);
    }
    $('#room-mode-note').textContent = host ? '· you choose' : '· the leader chooses';
    // decks: starters, your own decks, and a way to build one
    const list = $('#online-deck-list'); list.innerHTML = '';
    for (const d of [...DECKS, ...EXTRA_DECKS]) {
      const why = d.tag === 'Custom' && deckProblem(d.heroes);
      const b = document.createElement('button');
      const on = this.me.deck && this.me.deck.id === d.id;
      b.type = 'button'; b.className = 'btn ghost odeck' + (on ? ' on' : '');
      b.disabled = !!why;
      b.innerHTML = `<span>${escapeHtml(d.name)}${d.tag === 'Custom' ? ' <em>Custom</em>' : ''}</span><small>${why ? escapeHtml(why) : on ? '✓ Chosen' : d.heroes.length + ' cards'}</small>`;
      b.onclick = () => this.pickDeck(d);
      list.appendChild(b);
    }
    const nb = document.createElement('button');
    nb.type = 'button'; nb.className = 'btn ghost odeck build';
    nb.innerHTML = '<span>+ Build a deck</span><small>Make your own</small>';
    nb.onclick = () => { Sfx.init(); Sfx.click(); this.setReady(false); openBuilder(null, 'online'); };
    list.appendChild(nb);
    // ready
    const rb = $('#btn-ready');
    rb.disabled = !this.me.deck || !this.them;
    rb.textContent = this.me.ready ? 'Not ready' : 'Ready';
    rb.classList.toggle('ghost', this.me.ready);
    this.status(!this.them ? (host ? 'Send the code to your friend. Waiting for them to join…' : 'Connecting…')
      : !this.me.deck ? 'Choose your deck.'
        : !this.me.ready ? 'Press Ready when you are set.'
          : this.them.where === 'game' ? 'Waiting for your friend to come back to the room…'
            : !this.them.ready ? 'Waiting for your friend to be ready…' : 'Starting…');
  },
  pickMode(id) {
    if (this.role !== 'host' || id === this.room.mode) return;
    Sfx.init(); Sfx.click();
    this.room.mode = id; this.me.ready = false;
    this.sendRoom(); this.sendMe(); this.render();
  },
  pickDeck(d) {
    Sfx.init(); Sfx.click();
    this.me.deck = { id: d.id, name: d.name, heroes: d.heroes.slice() };
    this.me.ready = false;
    try { localStorage.setItem(ONLINE_DECK_KEY, d.id); } catch (e) { /* storage blocked */ }
    this.sendMe(); this.render();
  },
  setReady(v) {
    if (v && (!this.me.deck || !this.them)) return;
    if (this.me.ready === v) return;
    this.me.ready = v;
    this.sendMe(); this.render(); this.maybeStart();
  },
  /* Called when the deck builder saves a deck it was opened for from the room. */
  deckBuilt(id) {
    const d = id && findDeck(id);
    if (d && !(d.tag === 'Custom' && deckProblem(d.heroes))) this.pickDeck(d); else this.render();
  },

  /* The leader starts a match once both are ready in the room. */
  maybeStart() {
    if (this.role !== 'host' || this.playing || !this.them) return;
    if (!this.me.ready || !this.them.ready || this.them.where !== 'room' || this.me.where !== 'room') return;
    if (!this.me.deck || !this.them.deck || this.room.mode !== 'push') return;
    const strip = d => ({ name: d.name, heroes: d.heroes });
    const msg = { t: 'start', mode: this.room.mode, seed: Math.floor(Math.random() * 4294967296) >>> 0, decks: { A: strip(this.me.deck), B: strip(this.them.deck) }, goal: settings.length };
    this.send(msg);
    this.them.ready = false; this.them.where = 'game';
    this.begin(msg);
  },
  begin(m) {
    this.picks = {}; this.waiters = {}; this.playing = true;
    this.me.ready = false; this.me.where = 'game';
    if (this.them) { this.them.ready = false; this.them.where = 'game'; }
    newGame(null, { flip: this.role === 'guest', seed: m.seed >>> 0, decks: m.decks, goal: m.goal });
  },
  inGame() { return !!(G && G.online && !$('#scr-game').hidden); },

  pick(round) {
    if (round in this.picks) return Promise.resolve(this.picks[round]);
    return new Promise(res => { this.waiters[round] = res; });
  },

  /* After a match (or quitting one), go back to the room together. */
  backToRoom() {
    this.playing = false;
    this.me.where = 'room'; this.me.ready = false;
    quitGame('online');
    if (!this.code || !this.peer) { this.reset(); return; }
    this.sendMe(); this.render();
  },
  quitMatch() {
    this.send({ t: 'quit' });
    this.backToRoom();
  },
  leave() { this.send({ t: 'bye' }); const c = this.conn; this.conn = null; setTimeout(() => { if (c) try { c.close(); } catch (e) { /* closed */ } this.reset(); }, 150); },

  lost(left) {
    if (!this.conn && !left) return;
    const c = this.conn; this.conn = null;
    if (c) try { c.close(); } catch (e) { /* closed */ }
    const why = left ? 'Your friend left the room.' : 'Connection to your friend was lost.';
    if (this.role === 'host' && this.peer && !this.peer.destroyed) {
      // keep the room open so a friend can join again with the same code
      this.them = null; this.me.ready = false;
      if (this.inGame()) this.fail(why);
      else { this.render(); if (this.inRoom()) toastAny(why); }
      return;
    }
    if (this.inGame()) { this.fail(left ? 'The leader closed the room.' : why, true); return; }
    this.reset(); this.status(left ? 'The leader closed the room.' : why);
  },

  /* Stop the current online game and explain why. */
  fail(text, closed) {
    gameId++;
    if (G) G.over = true;
    this.playing = false;
    const end = $('#endscreen');
    end.innerHTML = `<div class="end draw"><h2>Match over</h2><p>${escapeHtml(text)}</p><div class="row">${closed ? '' : '<button class="btn" id="end-room">Back to room</button>'}<button class="btn ghost" id="end-menu">${closed ? 'Main menu' : 'Leave room'}</button></div></div>`;
    end.hidden = false;
    if (!closed) $('#end-room').onclick = () => { Sfx.click(); this.backToRoom(); };
    $('#end-menu').onclick = () => { Sfx.click(); this.leave(); quitGame('menu'); };
  },
};

$('#btn-host').onclick = () => { Sfx.init(); Sfx.click(); Net.host(); };
$('#btn-join').onclick = () => { Sfx.init(); Sfx.click(); Net.join($('#join-code').value); };
$('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#btn-ready').onclick = () => { Sfx.init(); Sfx.click(); Net.setReady(!Net.me.ready); };
$('#btn-leave-room').onclick = () => { Sfx.click(); Net.leave(); show('menu'); };
$('#online-back').onclick = () => { Sfx.click(); Net.leave(); show('menu'); };
$('#btn-share').onclick = async () => {
  const url = location.href.split(/[?#]/)[0] + '?room=' + Net.code;
  const text = 'Play Payload Push with me! Room code: ' + Net.code;
  try {
    if (navigator.share) await navigator.share({ title: 'Payload Push', text, url });
    else { await navigator.clipboard.writeText(text + ' ' + url); toastAny('Invite copied'); }
  } catch (e) { /* share cancelled */ }
};
// A shared invite link (?room=CODE) opens straight into the room.
(() => {
  const code = new URLSearchParams(location.search).get('room');
  if (code) { show('online'); $('#join-code').value = code.toUpperCase(); Net.join(code); }
})();
