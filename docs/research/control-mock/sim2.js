const E=require('./engine.js');
function rnd(m,pl){const h=m.hands[pl],t=E.legal(m,pl);return{card:h[Math.floor(Math.random()*h.length)],tile:t[Math.floor(Math.random()*t.length)]};}
function match(p0,p1){const m=E.newMatch();const rw=[];let clashes=0,pt=0;
 for(m.round=1;m.round<=3;m.round++){E.newRound(m);for(let t=0;t<E.TURNS;t++){const a=p0(m,0),b=p1(m,1);if(a.tile===b.tile)clashes++;E.resolve(m,[a,b]);}
  const w=E.roundWinner(m);rw.push(w);if(m.board[E.PT])pt++;if(w>=0)m.wins[w]++;}
 return{w:m.wins[0]>m.wins[1]?0:m.wins[1]>m.wins[0]?1:-1,rw,clashes,pt};}
const N=+process.argv[2]||200;
for(const [name,a,b] of [['bot v bot',E.botPlay,E.botPlay],['bot v random',E.botPlay,rnd]]){
 let w=[0,0,0],r1=[0,0,0],cl=0,pt=0;const t0=Date.now();
 for(let i=0;i<N;i++){const r=match(a,b);w[r.w+1]++;r1[r.rw[0]+1]++;cl+=r.clashes;pt+=r.pt;}
 console.log(name,'match draw/p0/p1',w,'round1',r1,'clash/match',(cl/N).toFixed(2),'pointHeld%',(pt/N/3*100).toFixed(0),Date.now()-t0,'ms');}
