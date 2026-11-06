const {game,E,ctxOf}=require('./ana_game.js');
E.setPowerMode('hand');
const IDS=Object.keys(E.HEROES), N=+process.argv[2]||1000, NR=+process.argv[3]||4000;
const st={}; for(const k of IDS) st[k]={off:0,pl:0,bw:0,bn:0,gpn:0,gpw:0,din:0,dw:0};
function run(dp,de,n){ for(let k=0;k<n;k++){ const M={weak:0,plays:0,events:0,battles:0,cards:{},off:{},pl:{}};
  const g=game('hand',dp,de,3,{p:'ai',e:'ai'},M);
  for(const [id,v] of Object.entries(M.cards)){ st[id].bw+=v.w; st[id].bn+=v.n; }
  for(const [id,v] of Object.entries(M.off)) st[id].off+=v; for(const [id,v] of Object.entries(M.pl)) st[id].pl+=v;
  for(const s of ['p','e']) for(const id of M.gp[s]){ st[id].gpn++; if(g.win===s) st[id].gpw++; else if(g.win==='d') st[id].gpw+=.5; }
  for(const s of ['p','e']) for(const id of E.DECKS.find(d=>d.id===(s==='p'?dp:de)).heroes){ st[id].din++; if(g.win===s) st[id].dw++; else if(g.win==='d') st[id].dw+=.5; }
}}
// 1) preset decks, all pairings incl mirrors
const pre={}; const ids=['heroes','strike','tactical'];
for(let i=0;i<3;i++) for(let j=i;j<3;j++) run(ids[i],ids[j],N);
for(const k of IDS){ pre[k]={...st[k]}; Object.keys(st[k]).forEach(x=>st[k][x]=0); }
// 2) random legal custom decks (20 heroes, Power <=105, >=4 per role)
const lp=h=>E.HEROES[h].deckPower??E.HEROES[h].power;
function randDeck(){ for(;;){ const d=E.shuffle([...IDS]).slice(0,20); if(d.reduce((n,h)=>n+lp(h),0)>105) continue; const r={tank:0,damage:0,support:0}; d.forEach(h=>r[E.HEROES[h].role]++); if(Math.min(r.tank,r.damage,r.support)<4) continue; return d; } }
E.DECKS.push({id:'r1',heroes:[]},{id:'r2',heroes:[]});
for(let k=0;k<NR;k++){ E.DECKS[3].heroes=randDeck(); E.DECKS[4].heroes=randDeck(); run('r1','r2',1); }
const rnd=st;
// 3) one-on-one battles: vacuum (nothing set up) and best set-up
function side(id,extra){ return {id,bonus:0,silenced:false,ctx:Object.assign({behind:false,steps:0,reserveFull:false,reserveId:null,reserveIds:[],reservePower:null,bobPower:null,pile:0,pileRoles:{},wonLast:false,lostLast:false,played:[],foePlayed:[],turret:0,next:[],hackedNext:false,curse:[],discards:0,foeReservePower:null,foeReserve:[],foeTop:IDS[Math.random()*IDS.length|0],fromReserve:false,heldRounds:0},extra)}; }
const PRESETS={
  reserve:{fromReserve:true,heldRounds:5},
  partners:{played:['dva_baby','dmon_baby','reinhardt','soldier','mercy']},
  behind:{behind:true,steps:-2},
  discard:{pile:8,pileRoles:{support:5,tank:2,damage:1},discards:4},
  bob:{reserveFull:true,reserveId:'bob',reserveIds:['bob'],reservePower:6,bobPower:6},
};
PRESETS.all=Object.assign({},...Object.values(PRESETS));
function duel(id,mine,reps=40){ let w=0,n=0; for(const o of IDS) for(let r=0;r<reps;r++){ const res=E.resolve({p:side(id,mine),e:side(o,{})}); n++; if(res.winner==='p') w++; else if(!res.winner||res.winner==='d'||res.winner==='tie') w+=.5; } return w/n*100; }
const out=[];
for(const k of IDS){ const H=E.HEROES[k], v=duel(k,{}); let best=v,bestP='none';
  for(const [pn,p] of Object.entries(PRESETS)){ const s=duel(k,p); if(s>best+1){best=s;bestP=pn;} }
  const P=pre[k], R=rnd[k], inPre=E.DECKS.slice(0,3).find(d=>d.heroes.includes(k));
  out.push({id:k,name:H.name,role:H.role,power:H.power,ability:H.text,deck:inPre?inPre.name:'-',
    pick:P.off?P.pl/P.off*100:null, battleWR:P.bn?P.bw/P.bn*100:null, gameWRplayed:P.gpn?P.gpw/P.gpn*100:null,
    randPick:R.off?R.pl/R.off*100:null, randBattleWR:R.bn?R.bw/R.bn*100:null, randDeckWR:R.din?R.dw/R.din*100:null, randDecks:R.din,
    vacuum:v, synergy:best, synergyFrom:bestP});
}
require('fs').writeFileSync('/tmp/claude-0/sim/analysis.json',JSON.stringify(out,null,1));
for(const o of out) console.log([o.id,o.power,o.pick?.toFixed(0),o.battleWR?.toFixed(0),o.gameWRplayed?.toFixed(0),o.randPick?.toFixed(0),o.randBattleWR?.toFixed(0),o.randDeckWR?.toFixed(0),o.vacuum.toFixed(0),o.synergy.toFixed(0),o.synergyFrom].join('\t'));
