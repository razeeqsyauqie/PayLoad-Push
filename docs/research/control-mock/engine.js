// Control mode, simultaneous turns. Players: 0 = you (bottom, back row 4), 1 = enemy (top, back row 0).
const N=5, PT=12, TURNS=5;
const HEROES=[
 ['Reinhardt','T',7,'Shield: can\'t be flipped.'],
 ['Winston','T',5,'Jump: leaps onto the Point if it is empty and 2 or fewer tiles away (not on turn 1).'],
 ['D.Va','T',6,'Boosters: moves 1 toward the Point.'],
 ['Orisa','T',6,'Fortify: +2 Power while next to an ally.'],
 ['Zarya','T',5,'Bubble: adjacent allies can\'t be flipped this turn.'],
 ['Genji','D',4,'Dash: moves 1 diagonally toward the Point.'],
 ['Tracer','D',3,'Blink: moves up to 2 toward the Point.'],
 ['Hanzo','D',4,'Storm Arrow: attacks the first enemy in each straight line.'],
 ['Soldier 76','D',5,'No ability.'],
 ['Reaper','D',6,'No ability.'],
 ['Sombra','D',3,'Hack: adjacent enemies −2 Power.'],
 ['Ana','S',3,'Sleep: the strongest adjacent enemy −3 Power.'],
 ['Mercy','S',2,'Resurrect: flips back one adjacent ally the enemy owns.'],
 ['Lúcio','S',2,'Speed Boost: adjacent allies +1 Power.'],
 ['Kiriko','S',3,'Swift Step: teleports next to the Point (any empty tile).'],
].map(([name,role,power,text],id)=>({id,name,role,power,text}));

const rc=i=>[Math.floor(i/N),i%N], idx=(r,c)=>r*N+c, inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
const adj=i=>{const[r,c]=rc(i);return[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>inb(r+a,c+b)).map(([a,b])=>idx(r+a,c+b));};
const dist=i=>{const[r,c]=rc(i);return Math.abs(r-2)+Math.abs(c-2);};

function newMatch(){return{round:1,wins:[0,0],draws:0,hands:[HEROES.map(h=>h.id),HEROES.map(h=>h.id)],log:[]};}
function newRound(m){m.board=Array(25).fill(null);m.turn=1;}
// board cell: {owner, id, mod}
function power(b,i){const t=b[i],h=HEROES[t.id];let p=h.power+t.mod;
 for(const j of adj(i)){const u=b[j];if(!u)continue;
  if(u.owner===t.owner&&u.id===13)p+=1;
  if(u.owner!==t.owner&&u.id===10)p-=2;}
 if(t.id===3&&adj(i).some(j=>b[j]&&b[j].owner===t.owner))p+=2;
 return Math.max(0,p);}
function legal(m,pl){const back=pl===0?4:0;const out=[];
 for(let i=0;i<25;i++){if(m.board[i])continue;const[r]=rc(i);
  if(r===back||adj(i).some(j=>m.board[j]&&m.board[j].owner===pl))out.push(i);}
 return out;}
function stepToward(b,i,diag){const[r,c]=rc(i);let best=null,bd=dist(i);
 const dirs=diag?[[1,1],[1,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
 for(const[a,d]of dirs){if(!inb(r+a,c+d))continue;const j=idx(r+a,c+d);if(b[j])continue;
  const dd=dist(j);if(dd<bd){bd=dd;best=j;}}return best;}

// plays: [{card,tile},{card,tile}] ; returns events
function resolve(m,plays){const b=m.board,ev=[];const arrived=[];
 for(let p=0;p<2;p++)m.hands[p]=m.hands[p].filter(x=>x!==plays[p].card);
 if(plays[0].tile===plays[1].tile){const a=HEROES[plays[0].card].power,c=HEROES[plays[1].card].power;
  ev.push(`Clash! ${HEROES[plays[0].card].name} (${a}) vs ${HEROES[plays[1].card].name} (${c}).`);
  if(a===c){ev.push('Tie, both are knocked out.');}
  else{const w=a>c?0:1;b[plays[w].tile]={owner:w,id:plays[w].card,mod:0};arrived.push(plays[w].tile);
   ev.push(`${HEROES[plays[w].card].name} wins the tile.`);}}
 else for(let p=0;p<2;p++){b[plays[p].tile]={owner:p,id:plays[p].card,mod:0};arrived.push(plays[p].tile);}
 // movement abilities (higher Power moves first)
 if(Math.random()<0.5)arrived.reverse();arrived.sort((x,y)=>HEROES[b[y].id].power-HEROES[b[x].id].power);
 for(let k=0;k<arrived.length;k++){let i=arrived[k];const t=b[i];let to=null;
  if(t.id===1&&!b[PT]&&m.turn>1&&dist(i)<=2)to=PT;
  if(t.id===2)to=stepToward(b,i,false);
  if(t.id===5)to=stepToward(b,i,true);
  if(t.id===6){to=stepToward(b,i,false);if(to!=null){b[to]=t;b[i]=null;const t2=stepToward(b,to,false);b[to]=null;b[i]=t;if(t2!=null)to=t2;}}
  if(t.id===14){const opts=adj(PT).concat(PT).filter(j=>!b[j]).sort((x,y)=>dist(x)-dist(y));if(opts.length&&dist(i)>1)to=opts.find(j=>j!==PT)??null;}
  if(to!=null&&to!==i){b[to]=t;b[i]=null;arrived[k]=to;ev.push(`${HEROES[t.id].name} moves.`);}}
 // on-arrival effects
 for(const i of arrived){const t=b[i];
  if(t.id===11){const en=adj(i).filter(j=>b[j]&&b[j].owner!==t.owner).sort((x,y)=>power(b,y)-power(b,x));if(en[0]!=null){b[en[0]].mod-=3;ev.push(`Ana sleeps ${HEROES[b[en[0]].id].name} (−3).`);}}
  if(t.id===12){const al=adj(i).find(j=>b[j]&&b[j].owner!==t.owner&&b[j].orig===t.owner);if(al!=null){b[al].owner=t.owner;ev.push(`Mercy brings back ${HEROES[b[al].id].name}.`);}}}
 // attacks: computed together, then applied
 const flips=new Set(),bubbled=new Set();
 for(const i of arrived)if(b[i].id===4)adj(i).forEach(j=>{if(b[j]&&b[j].owner===b[i].owner)bubbled.add(j);});
 for(const i of arrived){const t=b[i];let targets=adj(i);
  if(t.id===7){targets=[];const[r,c]=rc(i);for(const[a,d]of[[1,0],[-1,0],[0,1],[0,-1]]){let rr=r+a,cc=c+d;while(inb(rr,cc)){const j=idx(rr,cc);if(b[j]){if(b[j].owner!==t.owner)targets.push(j);break;}rr+=a;cc+=d;}}}
  const atk=power(b,i)+(HEROES[t.id].role==='D'?2:0);
  for(const j of targets){const u=b[j];if(!u||u.owner===t.owner||u.id===0||bubbled.has(j))continue;
   const def=power(b,j)+(HEROES[u.id].role==='T'?2:0);if(atk>def)flips.add(j);}}
 for(const j of flips){const u=b[j];if(u.orig==null)u.orig=u.owner;u.owner=1-u.owner;ev.push(`${HEROES[u.id].name} is flipped.`);}
 m.turn++;return ev;}

function roundWinner(m){const b=m.board;if(b[PT])return b[PT].owner;
 const n=[0,1].map(p=>b.filter(t=>t&&t.owner===p).length);return n[0]===n[1]?-1:(n[0]>n[1]?0:1);}

// Bot: tries each (card, tile) against a few guessed enemy plays, values the board and card economy.
function evalBoard(b,pl){let s=0;for(let i=0;i<25;i++){const t=b[i];if(!t)continue;const v=(i===PT?8:1)+(4-dist(i))*0.4;s+=t.owner===pl?v:-v;}return s;}
function clone(m){return{...m,board:m.board.map(t=>t&&{...t}),hands:m.hands.map(h=>h.slice()),log:[]};}
function botPlay(m,pl,rng=Math.random){const hand=m.hands[pl],tiles=legal(m,pl),foe=1-pl;
 const fTiles=legal(m,foe),fHand=m.hands[foe];const samples=[];
 for(let k=0;k<6;k++)samples.push({card:fHand[Math.floor(rng()*fHand.length)],tile:fTiles[Math.floor(rng()*fTiles.length)]});
 const cardsLeft=hand.length,turnsLeft=(3-m.round)*TURNS+(TURNS-m.turn+1);
 let best=null,bs=-1e9;
 for(const card of hand)for(const tile of tiles){let tot=0;
  for(const s of samples){const c=clone(m);const plays=[];plays[pl]={card,tile};plays[foe]=s;resolve(c,plays);tot+=evalBoard(c.board,pl);}
  // spending a strong card early costs a bit, scaled by how much of the match is left
  const sc=tot/samples.length-HEROES[card].power*0.25*(turnsLeft-1)/turnsLeft*(m.turn===TURNS?0:1)+rng()*0.3;
  if(sc>bs){bs=sc;best={card,tile};}}
 return best;}

if(typeof module!=='undefined')module.exports={HEROES,newMatch,newRound,legal,resolve,roundWinner,botPlay,PT,TURNS};
