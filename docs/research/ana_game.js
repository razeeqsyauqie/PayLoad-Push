const E=require('/mnt/project-files/ow-card-game/src/engine.js');
const pw=E.cardPower;
function draw(P){ if(!P.deck.length){ if(!P.discard.length) return null; P.deck=E.shuffle(P.discard); P.discard=[]; } const c=P.deck.pop(); c.held=false; c.heldRounds=0; c.hacked=false; return c; }
function ctxOf(S,s,pos,extra){ const P=S[s],F=S[s==='p'?'e':'p']; const steps=s==='p'?pos:-pos; const fm=E.mainReserve(F);
  return {behind:steps<0,steps,...E.reserveView(P),wonLast:P.won,lostLast:P.lost,played:P.played,foePlayed:F.played,turret:P.turret||0,next:P.next||[],hackedNext:!!P.hackedNext,curse:P.curse||[],discards:P.discards||0,...E.foeView(F),...extra}; }
function game(mode,dp,de,goal,pol,M){
  const mk=d=>{const o={deck:E.makeDeck(d),discard:[],won:false,lost:false,played:[],turret:0,next:[],deckIds:E.DECKS.find(x=>x.id===d).heroes}; if(mode==='hand') o.hand=[]; else o.reserve=null; return o;};
  const S={p:mk(dp),e:mk(de)}; M.gp={p:new Set(),e:new Set()}; let pos=0,rounds=0,minP=0,maxP=0,leadCh=0,lastLead=0;
  while(Math.abs(pos)<goal && rounds<E.MAX_ROUNDS){
    rounds++; const played={},fr={};
    for(const s of ['p','e']){ const P=S[s];
      let card, fromReserve=false;
      if(mode==='hand'){
        while(P.hand.length<E.HAND_SIZE){ const c=draw(P); if(!c) break; P.hand.push(c); }
        let i;
        if(pol[s]==='random') i=Math.floor(Math.random()*P.hand.length);
        else i=E.aiChooseHand({hand:P.hand, ctxFor:c=>{ const others={hand:P.hand.filter(x=>x!==c)}; return ctxOf({...S,[s]:{...P,hand:others.hand}},s,pos,{fromReserve:!!c.held,heldRounds:c.heldRounds||0}); }});
        for(const c of P.hand) M.off[c.id]=(M.off[c.id]||0)+1; card=P.hand.splice(i,1)[0]; fromReserve=!!card.held; M.pl[card.id]=(M.pl[card.id]||0)+1; (M.gp[s]||(M.gp[s]=new Set())).add(card.id);
      } else {
        const drawn=draw(P);
        let c = pol[s]==='random' ? (P.reserve? (Math.random()<.5?'play':'playReserve') : (Math.random()<.3?'reserve':'play')) : E.aiChoose({drawn,reserve:P.reserve,deckIds:P.deckIds,ctx:ctxOf(S,s,pos)});
        if(c==='play') card=drawn; else if(c==='reserve'){ P.reserve=drawn; card=draw(P);} else { card=P.reserve; P.reserve=null; fromReserve=true; P.deck.unshift(drawn);}
      }
      played[s]=card; fr[s]=fromReserve; if(pw(card)<=3 && E.HEROES[card.id].fx) M.weak++; M.plays++; }
    const inp={}; for(const s of ['p','e']) inp[s]={id:played[s].id,bonus:played[s].bonus,silenced:!!played[s].silenced||!!played[s].hacked,ctx:ctxOf(S,s,pos,{fromReserve:fr[s],heldRounds:played[s].heldRounds||0})}; for(const s of ['p','e']) played[s].hacked=false;
    const r=E.resolve(inp); if(M.cards) for(const s of ['p','e']){ const k=played[s].id; const c=M.cards[k]||(M.cards[k]={n:0,w:0}); c.n++; if(r.winner===s)c.w++; }
    M.events+=r.events.length; M.battles++;
    if(r.winner==='p') pos+=r.push; else if(r.winner==='e') pos-=r.push; pos=Math.max(-goal,Math.min(goal,pos)); if(r.pull&&Math.abs(pos)<goal&&pos) pos-=Math.sign(pos);
    minP=Math.min(minP,pos); maxP=Math.max(maxP,pos); const ld=Math.sign(pos); if(ld && lastLead && ld!==lastLead) leadCh++; if(ld) lastLead=ld;
    for(const s of ['p','e']){ const P=S[s]; P.won=r.winner===s; P.lost=r.winner===(s==='p'?'e':'p'); P.played.push(played[s].id);
      if(r.recall[s] && E.canHold(P)){ played[s].bonus+=r.recall[s]; if(P.hand){ played[s].held=true; P.hand.push(played[s]); } else P.reserve=played[s]; } else P.discard.push(played[s]); }
    E.applyAfter(r,S,played); for(const s of ['p','e']) if(S[s].choice) E.takeChoice(S[s],E.aiChoice(S[s]));
    if(mode==='hand') for(const s of ['p','e']) S[s].hand.forEach(c=>{c.held=true;c.heldRounds=(c.heldRounds||0)+1;});
  }
  const win=pos>0?'p':pos<0?'e':'d';
  return {win,rounds,timeout:Math.abs(pos)<goal,comeback:(win==='p'&&minP<0)||(win==='e'&&maxP>0),leadCh};
}

module.exports={game,E,ctxOf};
