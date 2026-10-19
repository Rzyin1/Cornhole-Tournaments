import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {openDB} from "idb";
import {LayoutDashboard,Trophy,PlusCircle,BarChart3,Settings,Download,Upload,Trash2,RotateCcw,Save,ChevronLeft} from "lucide-react";
import {LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from "recharts";
import {Data,Tournament,Game,Bag,Stage,Round,emptyData,uid,gameStats,summarize,computedScore,fmt,placementPercent} from "./model";
import "./style.css";
const dbp=openDB("cornhole-tournaments",1,{upgrade(db){db.createObjectStore("app")}});
const load=async():Promise<Data>=>await(await dbp).get("app","data")||emptyData();
const persist=async(d:Data)=>{await(await dbp).put("app",d,"data")};
const formats=["Singles","Doubles BYOP","Blind Draw Doubles","Switcholio","Crew Cup / Four-Person Teams","Custom"];
const stageNames=["Round Robin","Pool Play","Winners Bracket","Losers Bracket","Finals","Custom"];
const reviewEmpty=()=>({overall:"",strengths:"",weaknesses:"",lessons:"",goals:""});
const noteEmpty=()=>({conditions:"",good:"",bad:"",general:""});
const blankTournament=():Tournament=>({id:uid(),name:"",start:new Date().toISOString().slice(0,10),city:"",region:"",format:"Singles",field:0,unit:"players",scoreMagic:false,status:"Draft",stages:[{id:uid(),name:"Round Robin",order:1}],games:[],placement:{unit:"players"},review:reviewEmpty()});
const blankGame=(t:Tournament):Game=>({id:uid(),stageId:t.stages[0]?.id||"",order:1+Math.max(0,...t.games.filter(g=>g.stageId===t.stages[0]?.id).map(g=>g.order)),players:["You","","",""],scoreFor:0,scoreAgainst:0,winner:"us",target:21,rounds:[],finalized:false,notes:noteEmpty()});
const number=(v:string)=>Number.isFinite(+v)?+v:0;
function App(){
 const [data,setData]=useState<Data>(emptyData()),[ready,setReady]=useState(false),[page,setPage]=useState("Dashboard"),[selected,setSelected]=useState<string|null>(null),[editingGame,setEditingGame]=useState<string|null>(null),[mode,setMode]=useState<"quick"|"table">("quick"),[view,setView]=useState<"cards"|"table">("cards"),[search,setSearch]=useState(""),[filters,setFilters]=useState({season:"",format:"",stage:"",bags:"",scoreMagic:"",teammate:"",board:"",location:"",tournament:""}),[comparison,setComparison]=useState({a:"Singles",b:"Doubles BYOP"});
 useEffect(()=>{load().then(d=>{setData(d);setReady(true)}).catch(()=>setReady(true))},[]);
 useEffect(()=>{if(ready)persist(data).catch(e=>console.error("Save failed",e))},[data,ready]);
 const change=(fn:(d:Data)=>Data)=>setData(old=>fn(structuredClone(old)));
 const t=data.tournaments.find(t=>t.id===selected);
 const updateT=(patch:Partial<Tournament>)=>change(d=>{const x=d.tournaments.find(x=>x.id===selected);if(x)Object.assign(x,patch);return d});
 const updateG=(id:string,fn:(g:Game)=>void)=>change(d=>{const x=d.tournaments.find(x=>x.id===selected)?.games.find(g=>g.id===id);if(x)fn(x);return d});
 const filtered=useMemo(()=>data.tournaments.filter(t=>(!filters.season||t.start.startsWith(filters.season))&&(!filters.format||t.format===filters.format)&&(!filters.scoreMagic||String(t.scoreMagic)===filters.scoreMagic)&&(!filters.location||[t.city,t.region].join(", ").toLowerCase().includes(filters.location.toLowerCase()))&&(!filters.tournament||t.id===filters.tournament)),[data,filters]);
 const games=filtered.flatMap(t=>t.games.filter(g=>(!filters.stage||t.stages.find(s=>s.id===g.stageId)?.name===filters.stage)&&(!filters.bags||g.bagsId===filters.bags)&&(!filters.teammate||g.players[1]===filters.teammate)&&(!filters.board||g.board===filters.board)));
 const stats=summarize(games);
 const years=[...new Set(data.tournaments.map(t=>t.start.slice(0,4)))].sort().reverse();
 const names=[...new Set(data.names.filter(Boolean))].sort();
 const setF=(key:keyof typeof filters,v:string)=>setFilters(p=>({...p,[key]:v}));
 const addTournament=()=>{const x=blankTournament();change(d=>{d.tournaments.push(x);return d});setSelected(x.id);setPage("Tournaments")};
 const delTournament=(id:string)=>{if(!confirm("Move this tournament and its games to the Recycle Bin?"))return;change(d=>{const i=d.tournaments.findIndex(x=>x.id===id);if(i>=0)d.trash.push(...d.tournaments.splice(i,1));return d});setSelected(null)};
 const exportBackup=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cornhole-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url)};
 const importBackup=async(file:File)=>{try{const d=JSON.parse(await file.text());if(d.version!==1||!Array.isArray(d.tournaments)||!Array.isArray(d.bags)||!Array.isArray(d.names)||!Array.isArray(d.trash)||!Array.isArray(d.deletedGames))throw Error("Invalid or unsupported backup");if(!confirm("Replace ALL current data with this backup? Export your existing data first."))return;setData(d);setSelected(null);alert("Backup restored.")}catch(e){alert("Restore failed: "+String(e))}};
 const metric=(label:string,value:string)=> <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
 const input=(label:string,value:string|number,fn:(s:string)=>void,type="text")=><label>{label}<input type={type} value={value} onChange={e=>fn(e.target.value)}/></label>;
 const select=(label:string,value:string,opts:{value:string;label:string}[],fn:(s:string)=>void)=><label>{label}<select value={value} onChange={e=>fn(e.target.value)}>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
 const opts=(arr:string[],empty="All")=>[{value:"",label:empty},...arr.map(v=>({value:v,label:v}))];
 const nav=[["Dashboard",LayoutDashboard],["Tournaments",Trophy],["New Tournament",PlusCircle],["Statistics",BarChart3],["Settings",Settings]] as const;
 const filterBar=<div className="panel"><div className="flex between"><h3>Career Filters</h3><button className="subtle" onClick={()=>setFilters({season:"",format:"",stage:"",bags:"",scoreMagic:"",teammate:"",board:"",location:"",tournament:""})}>Clear All</button></div><div className="fields">
 {select("Season",filters.season,opts(years),v=>setF("season",v))}
 {select("Format",filters.format,opts(formats),v=>setF("format",v))}
 {select("Tournament",filters.tournament,[{value:"",label:"All"},...data.tournaments.map(t=>({value:t.id,label:t.name||"Untitled"}))],v=>setF("tournament",v))}
 {select("Stage",filters.stage,opts(stageNames),v=>setF("stage",v))}
 {select("Bags",filters.bags,[{value:"",label:"All"},...data.bags.map(b=>({value:b.id,label:b.brand+" "+b.model}))],v=>setF("bags",v))}
 {select("ScoreMagic",filters.scoreMagic,[{value:"",label:"All"},{value:"true",label:"Used"},{value:"false",label:"Not used"}],v=>setF("scoreMagic",v))}
 {select("Teammate",filters.teammate,opts(names),v=>setF("teammate",v))}
 {input("Board Number",filters.board,v=>setF("board",v))}
 {input("Location",filters.location,v=>setF("location",v))}
 </div></div>;
 const cards=<div className="metrics">{metric("Career PPR",fmt(stats.ppr))}{metric("Opponent PPR",fmt(stats.oppPpr))}{metric("DPR",fmt(stats.dpr))}{metric("Game Win Rate",stats.winRate===null?"—":fmt(stats.winRate,1)+"%")}{metric("Games",String(stats.games))}{metric("Valid Rounds",String(stats.rounds))}</div>;
 const trend=games.filter(g=>g.finalized&&gameStats(g).n).map((g,i)=>({game:i+1,ppr:gameStats(g).ppr})); 
 const chart=<div className="panel"><h3>PPR Performance Trend</h3><div style={{height:230}}>{trend.length?<ResponsiveContainer><LineChart data={trend}><CartesianGrid stroke="#263a31"/><XAxis dataKey="game" stroke="#8ca79b"/><YAxis domain={[0,12]} stroke="#8ca79b"/><Tooltip/><Line dataKey="ppr" stroke="#45db8c" strokeWidth={2}/></LineChart></ResponsiveContainer>:<p className="muted">Add finalized games with round data to see your performance trend.</p>}</div></div>;
 const tournamentList=(list:Tournament[])=> <div className={view==="cards"?"tilegrid":"panel"}>{view==="cards"?list.map(x=><button className="tile" key={x.id} onClick={()=>{setSelected(x.id);setPage("Tournaments")}}><div className="flex between"><b>{x.name||"Untitled Tournament"}</b><span className="pill">{x.status}</span></div><p className="muted">{x.start} · {x.format} · {x.city}, {x.region}</p><div className="flex between"><span>Placement: {x.placement.rank?"T".repeat(0)+x.placement.rank+" / "+(x.placement.field||x.field):"—"}</span><span>{x.games.filter(g=>g.finalized).length} games</span></div></button>):<table><thead><tr>{["Date","Tournament","Format","Placement","Games"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{list.map(x=><tr key={x.id} onClick={()=>{setSelected(x.id);setPage("Tournaments")}}><td>{x.start}</td><td>{x.name}</td><td>{x.format}</td><td>{x.placement.rank||"—"}</td><td>{x.games.filter(g=>g.finalized).length}</td></tr>)}</tbody></table>}</div>;
 const gameEditor=(g:Game)=><div className="panel"><div className="flex between"><h3>Edit Game · {g.finalized?"Finalized":"Draft"}</h3><button className="subtle" onClick={()=>setEditingGame(null)}>Back to Tournament</button></div>
 <div className="fields">
 {select("Stage",g.stageId,t!.stages.map(s=>({value:s.id,label:s.name})),v=>updateG(g.id,x=>x.stageId=v))}
 {input("Game Date",g.date||"",v=>updateG(g.id,x=>x.date=v),"date")}
 {input("Board Number",g.board||"",v=>updateG(g.id,x=>x.board=v))}
 {select("Bags Used",g.bagsId||"",[{value:"",label:"Not recorded"},...data.bags.map(b=>({value:b.id,label:b.brand+" "+b.model}))],v=>updateG(g.id,x=>x.bagsId=v))}
 {input("Official Score — You/Your Team",g.scoreFor,v=>updateG(g.id,x=>x.scoreFor=number(v)),"number")}
 {input("Official Score — Opponent",g.scoreAgainst,v=>updateG(g.id,x=>x.scoreAgainst=number(v)),"number")}
 {select("Official Winner",g.winner,[{value:"us",label:"You / Your Team"},{value:"them",label:"Opponents"}],v=>updateG(g.id,x=>x.winner=v as Game["winner"]))}
 {input("Winning Target",g.target,v=>updateG(g.id,x=>x.target=number(v)),"number")}
 </div><h3>Players</h3><p className="muted">First player is you. In doubles: You, Teammate, Opponent 1, Opponent 2.</p>
 <div className="fields">{Array.from({length:t!.format==="Singles"?2:4},(_,i)=>input(["You","Teammate","Opponent 1","Opponent 2"][i],g.players[i]||"",v=>updateG(g.id,x=>{x.players[i]=v;if(v&&!data.names.includes(v))setData(d=>({...d,names:[...new Set([...d.names,v])]}))})))}</div>
 <datalist id="knownNames">{names.map(n=><option key={n} value={n}/>)}</datalist>
 {t!.format!=="Singles"&&select("Your Direct Opponent",g.directOpponent||"",[{value:"",label:"Select opponent"},...g.players.slice(2).filter(Boolean).map(n=>({value:n,label:n}))],v=>updateG(g.id,x=>x.directOpponent=v))}
 <h3>Round-by-Round Statistics</h3><p className="muted">{t!.scoreMagic?"ScoreMagic tournament: round data required unless marked unavailable.":"Optional for this tournament."}</p>
 <div className="flex"><button className={mode==="quick"?"active":""} onClick={()=>setMode("quick")}>Quick Entry</button><button className={mode==="table"?"active":""} onClick={()=>setMode("table")}>Full Round Table</button><button onClick={()=>updateG(g.id,x=>x.rounds.push({id:uid(),players:{}}))}>+ Add Round</button></div>
 <label className="check"><input type="checkbox" checked={!!g.roundUnavailable} onChange={e=>updateG(g.id,x=>x.roundUnavailable=e.target.checked)}/> Round data unavailable (results-only override)</label>
 {g.rounds.length>0&&<div className="rounds">{(mode==="quick"?g.rounds.slice(-1):g.rounds).map((r,i)=><div className="round" key={r.id}><div className="flex between"><b>Round {mode==="quick"?g.rounds.length:i+1}</b><button className="danger subtle" onClick={()=>updateG(g.id,x=>x.rounds=x.rounds.filter(y=>y.id!==r.id))}>Remove</button></div><div className="roundgrid">{g.players.slice(0,t!.format==="Singles"?2:4).filter(Boolean).map(p=><div className="roundplayer" key={p}><b>{p}</b>{(["in","on"] as const).map(k=><label key={k}>{k.toUpperCase()}<input type="number" min="0" max="4" value={r.players[p]?.[k]??""} onChange={e=>updateG(g.id,x=>{const rr=x.rounds.find(y=>y.id===r.id)!;rr.players[p]??={in:0,on:0};rr.players[p][k]=number(e.target.value)})}/></label>)}</div>)}</div></div>)}</div>}
 {(()=>{const s=computedScore(g);return s&&<p>Calculated score: <b>{s.a} – {s.b}</b> · Official: <b>{g.scoreFor} – {g.scoreAgainst}</b> {s.a!==g.scoreFor||s.b!==g.scoreAgainst?<span className="warning">Score discrepancy</span>:<span className="green">Scores match</span>}</p>})()}
 <h3>Game Notes</h3><div className="fields">{([["conditions","Board Conditions"],["good","What Went Well"],["bad","What Went Wrong"],["general","General Observations"]] as const).map(([key,label])=><label key={key}>{label}<textarea value={g.notes[key]} onChange={e=>updateG(g.id,x=>x.notes[key]=e.target.value)}/></label>)}</div>
 <div className="flex"><button className="primary" onClick={()=>{if(!g.players[0]||!g.players[1]){alert("Enter player names first.");return}if(t!.scoreMagic&&!g.roundUnavailable&&!g.rounds.length){alert("Enter round data or select Round Data Unavailable.");return}updateG(g.id,x=>x.finalized=true);setEditingGame(null)}}><Save size={16}/> Save Game</button><button onClick={()=>{updateG(g.id,x=>x.finalized=false);alert("Returned to draft.")}}>Return to Draft</button><button className="danger" onClick={()=>{if(!confirm("Move this game to Recycle Bin?"))return;change(d=>{const tx=d.tournaments.find(x=>x.id===selected)!;const i=tx.games.findIndex(x=>x.id===g.id);d.deletedGames.push({tournamentId:tx.id,game:tx.games.splice(i,1)[0]});return d});setEditingGame(null)}}>Delete Game</button></div>
 </div>;
