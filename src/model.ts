export type Bag={id:string;brand:string;model:string};
export type PlayerRound={in:number;on:number};
export type Round={id:string;players:Record<string,PlayerRound>};
export type Game={id:string;stageId:string;order:number;date?:string;board?:string;bagsId?:string;players:string[];directOpponent?:string;scoreFor:number;scoreAgainst:number;winner:"us"|"them";target:number;rounds:Round[];roundUnavailable?:boolean;finalized:boolean;notes:{conditions:string;good:string;bad:string;general:string}};
export type Stage={id:string;name:string;order:number};
export type Placement={rank?:number;field?:number;unit?:"players"|"teams";division?:string;divisionRank?:number;divisionField?:number;bracket?:string;bracketRank?:number;bracketField?:number};
export type Tournament={id:string;name:string;start:string;end?:string;city:string;region:string;format:string;field:number;unit:"players"|"teams";scoreMagic:boolean;status:"Draft"|"Complete";stages:Stage[];games:Game[];placement:Placement;review:{overall:string;strengths:string;weaknesses:string;lessons:string;goals:string}};
export type Data={version:1;tournaments:Tournament[];bags:Bag[];names:string[];trash:Tournament[];deletedGames:{tournamentId:string;game:Game}[]};
export const emptyData=():Data=>({version:1,tournaments:[],bags:[],names:[],trash:[],deletedGames:[]});
export const uid=()=>crypto.randomUUID();
export const points=(r:PlayerRound)=>r.in*3+r.on;
export const valid=(r:PlayerRound|undefined)=>!!r&&Number.isInteger(r.in)&&Number.isInteger(r.on)&&r.in>=0&&r.on>=0&&r.in+r.on<=4;
export function gameStats(g:Game){
 const mine=g.players[0],opp=g.directOpponent||g.players[2]||g.players[1];
 const pairs=g.rounds.filter(r=>valid(r.players[mine])&&valid(r.players[opp]));
 const me=pairs.map(r=>points(r.players[mine])),them=pairs.map(r=>points(r.players[opp]));
 const n=pairs.length, sum=(a:number[])=>a.reduce((x,y)=>x+y,0);
 const ins=sum(pairs.map(r=>r.players[mine].in)),ons=sum(pairs.map(r=>r.players[mine].on));
 const baggers=pairs.filter(r=>r.players[mine].in===4).length;
 const ppr=n?sum(me)/n:null,oppPpr=n?sum(them)/n:null;
 const mean=ppr??0;
 return {n,ppr,oppPpr,dpr:n?mean-(oppPpr??0):null,ins,ons,offs:4*n-ins-ons,baggers,wins:me.filter((v,i)=>v>them[i]).length,losses:me.filter((v,i)=>v<them[i]).length,ties:me.filter((v,i)=>v===them[i]).length,consistency:n?Math.sqrt(sum(me.map(v=>(v-mean)**2))/n):null,raw:sum(me)};
}
export const fmt=(n:number|null|undefined,d=2)=>n==null?"—":n.toFixed(d);
export function summarize(games:Game[]){
 const gs=games.filter(g=>g.finalized),ss=gs.map(gameStats),sum=(f:(s:ReturnType<typeof gameStats>)=>number)=>ss.reduce((a,s)=>a+f(s),0);
 const rounds=sum(s=>s.n),raw=sum(s=>s.raw),oppRaw=sum(s=>(s.oppPpr??0)*s.n);
 const wins=gs.filter(g=>g.winner==="us").length;
 return {games:gs.length,wins,losses:gs.length-wins,winRate:gs.length?wins/gs.length*100:null,rounds,ppr:rounds?raw/rounds:null,oppPpr:rounds?oppRaw/rounds:null,dpr:rounds?(raw-oppRaw)/rounds:null,ins:sum(s=>s.ins),ons:sum(s=>s.ons),offs:sum(s=>s.offs),baggers:sum(s=>s.baggers),roundWins:sum(s=>s.wins),roundLosses:sum(s=>s.losses),roundTies:sum(s=>s.ties),pointsFor:gs.reduce((a,g)=>a+g.scoreFor,0),pointsAgainst:gs.reduce((a,g)=>a+g.scoreAgainst,0),closeWins:gs.filter(g=>Math.abs(g.scoreFor-g.scoreAgainst)<=3&&g.winner==="us").length,closeGames:gs.filter(g=>Math.abs(g.scoreFor-g.scoreAgainst)<=3).length,avgBag:rounds?raw/(rounds*4):null};
}
export function computedScore(g:Game){
 if(!g.rounds.length)return null;
 const names=g.players;if(names.length<2)return null;
 let a=0,b=0;
 for(const r of g.rounds){
  const my=names.length>=4?[names[0],names[1]]:[names[0]];
  const other=names.length>=4?[names[2],names[3]]:[names[1]];
  if([...my,...other].some(p=>!valid(r.players[p])))return null;
  const first=my.reduce((v,p)=>v+points(r.players[p]),0);
  const second=other.reduce((v,p)=>v+points(r.players[p]),0);
  a+=Math.max(0,first-second);b+=Math.max(0,second-first);
 }
 return {a,b};
}
export function placementPercent(rank?:number,field?:number){return rank&&field&&field>0?Math.max(0,100*(field-rank+1)/field):null}
