import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {openDB} from "idb";
import {LayoutDashboard,Trophy,PlusCircle,BarChart3,Settings,NotebookPen,Download,Upload,Trash2,RotateCcw,Save,ChevronLeft} from "lucide-react";
import {LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from "recharts";
import {Data,Tournament,Game,Bag,Stage,Round,emptyData,uid,gameStats,summarize,computedScore,fmt,placementPercent} from "./model";
import "./style.css";
import PracticeJournal from "./PracticeJournal";
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
 const [data,setData]=useState<Data>(emptyData()),[ready,setReady]=useState(false),[page,setPage]=useState("Dashboard"),[selected,setSelected]=useState<string|null>(null),[editingGame,setEditingGame]=useState<string|null>(null),[mode,setMode]=useState<"quick"|"table">("quick"),[view,setView]=useState<"cards"|"table">("cards"),[search,setSearch]=useState(""),[filters,setFilters]=useState({season:"",format:"",stage:"",bags:"",scoreMagic:"",teammate:"",board:"",location:"",tournament:""}),[comparison,setComparison]=useState({a:"Singles",b:"Doubles BYOP"}),[trendMode,setTrendMode]=useState<"tournaments"|"months"|"years">("tournaments");
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
 const exportBackup=async()=>{try{
  const db=await dbp;
  const practice=await db.get("app","practice");
  const practiceRounds=await db.get("app","practiceRounds");
  const allTournaments=data.tournaments.map(t=>{
   const tournamentStats=summarize(t.games);
   return {...t,tournamentPpr:tournamentStats.ppr,tournamentStats,
    games:t.games.map(g=>({...g,calculatedStats:gameStats(g),calculatedCancellationScore:computedScore(g)})),
    placementPercentiles:{
     overall:placementPercent(t.placement.rank,t.placement.field),
     division:placementPercent(t.placement.divisionRank,t.placement.divisionField),
     bracket:placementPercent(t.placement.bracketRank,t.placement.bracketField)
    }};
  });
  const practiceRoundStats=(practiceRounds||[]).map((s:{id:string;date:string;drill:string;bags:string;notes:string;rounds:{in:number;on:number;off:number}[]})=>{
   const rounds=s.rounds||[],n=rounds.length,ins=rounds.reduce((a,r)=>a+r.in,0),ons=rounds.reduce((a,r)=>a+r.on,0),offs=rounds.reduce((a,r)=>a+r.off,0);
   return {...s,calculatedStats:{rounds:n,ins,ons,offs,ppr:n?(ins*3+ons)/n:null,fourBaggers:rounds.filter(r=>r.in===4).length,inPercent:n?ins/(4*n)*100:null,onPercent:n?ons/(4*n)*100:null,offPercent:n?offs/(4*n)*100:null}};
  });
  const backup={...data,tournaments:allTournaments,practice,practiceRounds:practiceRoundStats,
   calculatedStats:{career:summarize(data.tournaments.flatMap(t=>t.games)),tournamentCount:data.tournaments.length},
   exportMetadata:{schema:"cornhole-complete-backup",schemaVersion:2,exportedAt:new Date().toISOString(),statistics:"Calculated from saved raw records; PPR uses finalized games with valid paired rounds. Null means unavailable."}};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="cornhole-complete-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){alert("Backup export failed: "+String(e))}
 };
 const importBackup=async(file:File)=>{try{const d=JSON.parse(await file.text());if(d.version!==1||!Array.isArray(d.tournaments)||!Array.isArray(d.bags)||!Array.isArray(d.names)||!Array.isArray(d.trash)||!Array.isArray(d.deletedGames))throw Error("Invalid or unsupported backup");if(!confirm("Replace ALL current data with this backup? Export your existing data first."))return;if(d.practice&&Array.isArray(d.practice.drills)&&Array.isArray(d.practice.entries))await(await dbp).put("app",d.practice,"practice");if(Array.isArray(d.practiceRounds))await(await dbp).put("app",d.practiceRounds,"practiceRounds");setData(d);setSelected(null);alert("Backup restored. Reload the page to refresh the Practice Journal.")}catch(e){alert("Restore failed: "+String(e))}};
 const metric=(label:string,value:string)=> <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
 const input=(label:string,value:string|number,fn:(s:string)=>void,type="text")=><label>{label}<input type={type} value={value} onChange={e=>fn(e.target.value)}/></label>;
 const select=(label:string,value:string,opts:{value:string;label:string}[],fn:(s:string)=>void)=><label>{label}<select value={value} onChange={e=>fn(e.target.value)}>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
 const opts=(arr:string[],empty="All")=>[{value:"",label:empty},...arr.map(v=>({value:v,label:v}))];
 const nav=[["Dashboard",LayoutDashboard],["Tournaments",Trophy],["Practice",NotebookPen],["New Tournament",PlusCircle],["Statistics",BarChart3],["Settings",Settings]] as const;
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
 const tournamentTrend=filtered.map(t=>{const selectedGames=t.games.filter(g=>games.includes(g));const s=summarize(selectedGames);return {id:t.id,date:t.start,label:t.name||"Untitled Tournament",ppr:s.ppr,rounds:s.rounds,raw:s.ppr===null?0:s.ppr*s.rounds}}).filter(x=>x.rounds>0).sort((a,b)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label));
 const groupedTrend=(()=>{if(trendMode==="tournaments")return tournamentTrend.map(x=>({label:x.label,date:x.date,ppr:x.ppr,rounds:x.rounds}));
 const groups=new Map<string,{raw:number;rounds:number}>();
 for(const t of filtered){for(const g of t.games){if(!games.includes(g)||!g.finalized)continue;const s=gameStats(g);if(!s.n)continue;const date=g.date||t.start;const key=trendMode==="months"?date.slice(0,7):date.slice(0,4);if(!/^\d{4}(?:-\d{2})?$/.test(key))continue;const prev=groups.get(key)||{raw:0,rounds:0};prev.raw+=s.raw;prev.rounds+=s.n;groups.set(key,prev)}}
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>({label:key,date:key,ppr:v.raw/v.rounds,rounds:v.rounds}));
 })();
 const chart=<div className="panel"><div className="flex between"><h3>PPR Performance Trend</h3><div className="flex"><label>View by<select value={trendMode} onChange={e=>setTrendMode(e.target.value as typeof trendMode)}><option value="tournaments">Tournaments</option><option value="months">Months</option><option value="years">Years</option></select></label></div></div><div style={{height:260}}>{groupedTrend.length?<ResponsiveContainer><LineChart data={groupedTrend} margin={{top:10,right:20,bottom:35,left:0}}><CartesianGrid stroke="#263a31"/><XAxis dataKey="label" stroke="#8ca79b" interval="preserveStartEnd" angle={trendMode==="tournaments"?-25:0} textAnchor={trendMode==="tournaments"?"end":"middle"} height={65} tickFormatter={v=>trendMode==="tournaments"&&String(v).length>18?String(v).slice(0,16)+"…":String(v)}/><YAxis domain={[0,12]} stroke="#8ca79b"/><Tooltip formatter={v=>[fmt(Number(v)),"PPR"]} labelFormatter={(_,payload)=>{const p=payload?.[0]?.payload;return p?p.label+" · "+p.rounds+" valid rounds":""}}/><Line type="monotone" dataKey="ppr" stroke="#45db8c" strokeWidth={2} dot={{r:4}} connectNulls={false}/></LineChart></ResponsiveContainer>:<p className="muted">No finalized games with valid paired rounds in this selection.</p>}</div><p className="muted">PPR is weighted by valid paired rounds. Monthly and yearly views use game dates when available, otherwise tournament start dates.</p></div>;
 const tournamentList=(list:Tournament[])=> <div className={view==="cards"?"tilegrid":"panel"}>{view==="cards"?list.map(x=><button className="tile" key={x.id} onClick={()=>{setSelected(x.id);setPage("Tournaments")}}><div className="flex between"><b>{x.name||"Untitled Tournament"}</b><span className="pill">{x.status}</span></div><p className="muted">{x.start} · {x.format} · {x.city}, {x.region}</p><div className="flex between"><span>Placement: {x.placement.rank?"T".repeat(0)+x.placement.rank+" / "+(x.placement.field||x.field):"—"}</span><span>PPR: {fmt(summarize(x.games).ppr)} · {x.games.filter(g=>g.finalized).length} games</span></div></button>):<table><thead><tr>{["Date","Tournament","Format","Placement","Tournament PPR","Games"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{list.map(x=><tr key={x.id} onClick={()=>{setSelected(x.id);setPage("Tournaments")}}><td>{x.start}</td><td>{x.name}</td><td>{x.format}</td><td>{x.placement.rank||"—"}</td><td>{fmt(summarize(x.games).ppr)}</td><td>{x.games.filter(g=>g.finalized).length}</td></tr>)}</tbody></table>}</div>;
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

 return <div className="shell"><aside><div className="brand"><Trophy color="#45db8c"/> CORNHOLE <span>TOURNAMENTS</span></div><nav>{nav.map(([name,Icon])=><button key={name} className={page===name?"active":""} onClick={()=>{if(name==="New Tournament"){addTournament()}else{setPage(name);setSelected(null);setEditingGame(null)}}}><Icon size={19}/>{name}</button>)}</nav><p className="sidefoot">Personal performance tracker · Local data</p></aside><main><header><div><small>PERSONAL CORNHOLE TRACKER</small><h1>{t&&page==="Tournaments"?t.name||"New Tournament":page}</h1></div><button className="primary" onClick={addTournament}><PlusCircle size={17}/> New Tournament</button></header>
 {!ready?<p>Loading records…</p>:<>
 {page==="Dashboard"&&<>{filterBar}{cards}<div className="twocol"><div className="panel"><h3>Recent Performance</h3><p>{stats.games} finalized games · {stats.rounds} paired rounds</p><p>Record: {stats.wins}–{stats.losses}</p><p>Last 5: {games.filter(g=>g.finalized).slice(-5).filter(g=>g.winner==="us").length} wins</p></div><div className="panel"><h3>Recent Tournaments</h3>{[...filtered].sort((a,b)=>b.start.localeCompare(a.start)).slice(0,5).map(x=><button className="linkrow" key={x.id} onClick={()=>{setPage("Tournaments");setSelected(x.id)}}>{x.name||"Untitled"} <span>{x.start}</span></button>)}{!filtered.length&&<p className="muted">No tournaments recorded yet.</p>}</div></div>{chart}</>}
 {page==="Tournaments"&&!t&&<><div className="flex between"><input placeholder="Search tournaments…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="flex"><button className={view==="cards"?"active":""} onClick={()=>setView("cards")}>Cards</button><button className={view==="table"?"active":""} onClick={()=>setView("table")}>Table</button></div></div>{tournamentList([...data.tournaments].filter(x=>[x.name,x.city,x.region,x.format].join(" ").toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.start.localeCompare(a.start)))}</>}
 {page==="Tournaments"&&t&&<><div className="flex between"><button className="subtle" onClick={()=>{setSelected(null);setEditingGame(null)}}><ChevronLeft size={16}/> All Tournaments</button><div className="flex"><span className="pill">{t.status}</span><button onClick={()=>updateT({status:t.status==="Draft"?"Complete":"Draft"})}>Mark {t.status==="Draft"?"Complete":"Draft"}</button><button className="danger" onClick={()=>delTournament(t.id)}>Delete Tournament</button></div></div>
 {editingGame?gameEditor(t.games.find(g=>g.id===editingGame)!):<>
 <section className="panel"><h2>Tournament Overview</h2><div className="fields">
 {input("Tournament Name",t.name,v=>updateT({name:v}))}
 {input("Start Date",t.start,v=>updateT({start:v}),"date")}
 {input("End Date",t.end||"",v=>updateT({end:v}),"date")}
 {input("City",t.city,v=>updateT({city:v}))}
 {input("State / Province",t.region,v=>updateT({region:v}))}
 {select("Format",t.format,formats.map(v=>({value:v,label:v})),v=>updateT({format:v,unit:v==="Singles"?"players":"teams"}))}
 {input("Field Size",t.field,v=>updateT({field:number(v)}),"number")}
 {select("Competition Unit",t.unit,[{value:"players",label:"Players"},{value:"teams",label:"Teams"}],v=>updateT({unit:v as Tournament["unit"]}))}
 {select("ScoreMagic",String(t.scoreMagic),[{value:"true",label:"Yes"},{value:"false",label:"No"}],v=>updateT({scoreMagic:v==="true"}))}
 </div></section>
 <section className="panel"><h2>Placement Results</h2><div className="fields">
 {([["rank","Overall Rank"],["field","Overall Field Size"],["divisionRank","Division Rank"],["divisionField","Division Field Size"],["bracketRank","Bracket Rank"],["bracketField","Bracket Field Size"]] as const).map(([k,l])=>input(l,t.placement[k]||"",v=>updateT({placement:{...t.placement,[k]:v?number(v):undefined}}),"number"))}
 {input("Division / Tier",t.placement.division||"",v=>updateT({placement:{...t.placement,division:v}}))}
 {input("Bracket Name",t.placement.bracket||"",v=>updateT({placement:{...t.placement,bracket:v}}))}
 </div><p className="muted">Placement percentile (higher = better): {fmt(placementPercent(t.placement.rank,t.placement.field||t.field),1)}%</p></section>
 <section className="panel"><h2>Tournament Statistics</h2><div className="metrics">{(()=>{const s=summarize(t.games);return <>{metric("PPR",fmt(s.ppr))}{metric("DPR",fmt(s.dpr))}{metric("Record",s.wins+"–"+s.losses)}{metric("Valid Rounds",String(s.rounds))}</>})()}</div></section>
 <section className="panel"><div className="flex between"><h2>Tournament Stages</h2><button onClick={()=>updateT({stages:[...t.stages,{id:uid(),name:"Round Robin",order:t.stages.length+1}]})}>+ Add Stage</button></div>{t.stages.map(s=><div className="flex stage" key={s.id}><select value={s.name} onChange={e=>updateT({stages:t.stages.map(x=>x.id===s.id?{...x,name:e.target.value}:x)})}>{stageNames.map(n=><option key={n}>{n}</option>)}</select><button className="danger subtle" onClick={()=>{if(t.games.some(g=>g.stageId===s.id)){alert("Move or delete games from this stage first.");return}updateT({stages:t.stages.filter(x=>x.id!==s.id)})}}>Remove</button></div>)}</section>
 <section className="panel"><div className="flex between"><h2>Game History</h2><div className="flex"><button className={view==="cards"?"active":""} onClick={()=>setView("cards")}>Cards</button><button className={view==="table"?"active":""} onClick={()=>setView("table")}>Table</button><button className="primary" onClick={()=>{const g=blankGame(t);updateT({games:[...t.games,g]});setEditingGame(g.id)}}>+ Add Game</button></div></div>
 {t.stages.map(s=><div key={s.id}><h3>{s.name}</h3>{t.games.filter(g=>g.stageId===s.id).sort((a,b)=>a.order-b.order).map(g=><button className="linkrow" key={g.id} onClick={()=>setEditingGame(g.id)}>Game {g.order} · {g.players.filter(Boolean).join(" / ")} <span>{g.scoreFor}–{g.scoreAgainst} · {g.finalized?"Final":"Draft"} · PPR {fmt(gameStats(g).ppr)}</span></button>)}</div>)}
 </section>
 <section className="panel"><h2>Tournament Performance Review</h2><div className="fields">{([["overall","Overall Performance"],["strengths","Strengths"],["weaknesses","Weaknesses"],["lessons","Lessons Learned"],["goals","Goals for Next Tournament"]] as const).map(([key,label])=><label key={key}>{label}<textarea value={t.review[key]} onChange={e=>updateT({review:{...t.review,[key]:e.target.value}})}/></label>)}</div></section>
 </>}</>}
 {page==="Statistics"&&<>{filterBar}<div className="jump">{["Scoring","Bag Accuracy","Games & Rounds","Tournament Placements","Performance Trends","Comparisons"].map((x,i)=><a href={"#stat"+i} key={x}>{x}</a>)}</div>
 <section id="stat0" className="panel"><h2>Scoring</h2><div className="metrics">{metric("PPR",fmt(stats.ppr))}{metric("Opp PPR",fmt(stats.oppPpr))}{metric("DPR",fmt(stats.dpr))}{metric("Avg Points / Bag",fmt(stats.avgBag))}{metric("Points For",String(stats.pointsFor))}{metric("Points Against",String(stats.pointsAgainst))}{metric("Point Differential",String(stats.pointsFor-stats.pointsAgainst))}</div></section>
 <section id="stat1" className="panel"><h2>Bag Accuracy</h2><div className="metrics">{[["In",stats.ins],["On",stats.ons],["Off",stats.offs]].map(([k,v])=>metric(String(k),v+" · "+(stats.rounds?fmt(Number(v)/stats.rounds/4*100,1)+"%":"—")))}{metric("4-Baggers",String(stats.baggers))}{metric("4-Bagger Rate",stats.rounds?fmt(stats.baggers/stats.rounds*100,1)+"%":"—")}</div></section>
 <section id="stat2" className="panel"><h2>Games & Rounds</h2><div className="metrics">{metric("Games",String(stats.games))}{metric("Wins",String(stats.wins))}{metric("Losses",String(stats.losses))}{metric("Win Rate",stats.winRate===null?"—":fmt(stats.winRate,1)+"%")}{metric("Valid Rounds",String(stats.rounds))}{metric("Round Wins",String(stats.roundWins))}{metric("Round Losses",String(stats.roundLosses))}{metric("Round Ties",String(stats.roundTies))}{metric("Close Games Won",stats.closeWins+" / "+stats.closeGames)}</div></section>
 <section id="stat3" className="panel"><h2>Tournament Placements</h2>{(()=>{const p=filtered.map(t=>({rank:t.placement.rank,field:t.placement.field||t.field})).filter(x=>x.rank&&x.field) as {rank:number;field:number}[];const avg=(f:(x:{rank:number;field:number})=>number)=>p.length?fmt(p.reduce((a,x)=>a+f(x),0)/p.length,1):"—";return <div className="metrics">{metric("Tournaments",String(filtered.length))}{metric("Wins",String(p.filter(x=>x.rank===1).length))}{metric("Podiums",String(p.filter(x=>x.rank<=3).length))}{metric("Top 5",String(p.filter(x=>x.rank<=5).length))}{metric("Top 10",String(p.filter(x=>x.rank<=10).length))}{metric("Top 10%",String(p.filter(x=>x.rank/x.field<=0.1).length))}{metric("Average Field",avg(x=>x.field))}{metric("Average Finish",avg(x=>x.rank))}{metric("Average Placement Percentile",avg(x=>placementPercent(x.rank,x.field)||0)+"%")}</div>})()}</section>
 <section id="stat4">{chart}</section>
 <section id="stat5" className="panel"><h2>Side-by-Side Comparisons</h2><div className="fields">{select("Group A Format",comparison.a,formats.map(v=>({value:v,label:v})),v=>setComparison(p=>({...p,a:v})))}{select("Group B Format",comparison.b,formats.map(v=>({value:v,label:v})),v=>setComparison(p=>({...p,b:v})))}</div>{(()=>{const a=summarize(games.filter(g=>filtered.some(t=>t.format===comparison.a&&t.games.some(x=>x.id===g.id)))),b=summarize(games.filter(g=>filtered.some(t=>t.format===comparison.b&&t.games.some(x=>x.id===g.id))));return <table><thead><tr><th>Metric</th><th>Group A</th><th>Group B</th></tr></thead><tbody>{[["Games",String(a.games),String(b.games)],["Valid Rounds",String(a.rounds),String(b.rounds)],["PPR",fmt(a.ppr),fmt(b.ppr)],["Opp PPR",fmt(a.oppPpr),fmt(b.oppPpr)],["DPR",fmt(a.dpr),fmt(b.dpr)],["Win Rate",fmt(a.winRate)+"%",fmt(b.winRate)+"%"]].map(([label,x,y])=><tr key={label}><td>{label}</td><td>{x}</td><td>{y}</td></tr>)}</tbody></table>})()}</section>
 </>}
 {page==="Practice"&&<PracticeJournal/>}
 {page==="Settings"&&<><section className="panel"><h2>Saved Bag Collection</h2>{data.bags.map(b=><div className="flex stage" key={b.id}><b>{b.brand} {b.model}</b><button className="danger subtle" onClick={()=>change(d=>{d.bags=d.bags.filter(x=>x.id!==b.id);return d})}>Remove</button></div>)}<form className="flex" onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const brand=String(fd.get("brand")||"").trim(),model=String(fd.get("model")||"").trim();if(brand&&model){change(d=>{d.bags.push({id:uid(),brand,model});return d});e.currentTarget.reset()}}}><input name="brand" required placeholder="Brand"/><input name="model" required placeholder="Model"/><button className="primary">Add Bag</button></form></section>
 <section className="panel"><h2>Backup & Restore</h2><p className="muted">Your data is saved only in this browser. Export backups regularly and before clearing browser data.</p><div className="flex"><button className="primary" onClick={exportBackup}><Download size={17}/> Export JSON Backup</button><label className="filebutton"><Upload size={17}/> Import Backup<input type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value=""}}/></label></div></section>
 <section className="panel"><h2>Recycle Bin</h2>{data.trash.map(x=><div className="flex between stage" key={x.id}><span><Trash2 size={15}/> {x.name||"Untitled"}</span><div className="flex"><button onClick={()=>change(d=>{const i=d.trash.findIndex(t=>t.id===x.id);d.tournaments.push(...d.trash.splice(i,1));return d})}><RotateCcw size={15}/> Restore</button><button className="danger" onClick={()=>{if(confirm("Permanently delete tournament?"))change(d=>{d.trash=d.trash.filter(t=>t.id!==x.id);return d})}}>Delete Forever</button></div></div>)}
 {data.deletedGames.map(x=><div className="flex between stage" key={x.game.id}><span>Game {x.game.order}</span><div className="flex"><button onClick={()=>change(d=>{const t=d.tournaments.find(t=>t.id===x.tournamentId);if(!t){alert("Restore its tournament first.");return d}t.games.push(x.game);d.deletedGames=d.deletedGames.filter(y=>y.game.id!==x.game.id);return d})}>Restore</button><button className="danger" onClick={()=>{if(confirm("Permanently delete game?"))change(d=>{d.deletedGames=d.deletedGames.filter(y=>y.game.id!==x.game.id);return d})}}>Delete Forever</button></div></div>)}
 {!data.trash.length&&!data.deletedGames.length&&<p className="muted">Recycle Bin is empty.</p>}</section></>}
 </>}</main></div>
}
createRoot(document.getElementById("root")!).render(<App/>);
