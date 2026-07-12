import { useState, useEffect } from "react";

const CLUBS = [
  { id:"highera",    name:"High Era",   color:"#7ec850", accent:"#4a9a20", baseUrl:"https://high-era-app.vercel.app" },
  { id:"weedmaster", name:"Weedmaster", color:"#70c8c8", accent:"#209a9a", baseUrl:"https://weedmaster-app.vercel.app" },
];
const COSECHAS = ["C1","C2","C3","C4","C5"];
const KEYS = { shop:"shopping-list", log:"feed-log", traz:"trazabilidad" };

function safeParse(value, fallback) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch { return fallback; }
}

async function fetchKey(baseUrl, key) {
  try {
    const r = await fetch(`${baseUrl}/api/storage?key=${encodeURIComponent(key)}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data.value ?? null;
  } catch { return null; }
}

async function setKey(baseUrl, key, value) {
  try {
    await fetch(`${baseUrl}/api/storage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: JSON.stringify(value) }),
    });
  } catch {}
}

const S = {
  page: { minHeight:"100vh", background:"#0a0f1a", color:"#c8d8e8", fontFamily:"system-ui,sans-serif" },
  header: { background:"#101828", borderBottom:"1px solid #1a3a5a", padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" },
  body: { maxWidth:"700px", margin:"0 auto", padding:"16px 14px" },
  col: { display:"flex", flexDirection:"column", gap:"14px" },
  row: { display:"flex", gap:"10px" },
  input: { background:"#101828", border:"1px solid #1a3a5a", borderRadius:"8px", padding:"9px 11px", color:"#c8d8e8", fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box" },
  tabBtn: (on) => ({ padding:"7px 10px", borderRadius:"7px", border:"none", cursor:"pointer", fontWeight:600, fontSize:"12px", background: on?"#1a5a8a":"#1a2a3a", color:on?"#fff":"#6a8aaa" }),
  card: (color) => ({ background:"#101828", border:`1px solid ${color}33`, borderRadius:"11px", padding:"14px" }),
};

export default function App() {
  const [tab, setTab] = useState("shop");
  const [data, setData] = useState({ highera:{shop:[],log:[],traz:{}}, weedmaster:{shop:[],log:[],traz:{}} });
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [expanded, setExpanded] = useState({});

  const emptyTraz = () => { const o={}; COSECHAS.forEach(c=>{o[c]={veg:{count:null,history:[]},flora:{count:null,history:[]}}}); return o; };

  const loadAll = async () => {
    setLoading(true);
    const result = { highera:{shop:[],log:[],traz:emptyTraz()}, weedmaster:{shop:[],log:[],traz:emptyTraz()} };
    for (const club of CLUBS) {
      const shopVal = await fetchKey(club.baseUrl, `${club.id}-${KEYS.shop}`);
      if (shopVal) result[club.id].shop = safeParse(shopVal, []);
      const logVal = await fetchKey(club.baseUrl, `${club.id}-${KEYS.log}`);
      if (logVal) result[club.id].log = safeParse(logVal, []);
      const trazVal = await fetchKey(club.baseUrl, `${club.id}-${KEYS.traz}`);
      if (trazVal) { const p = safeParse(trazVal, null); if (p) result[club.id].traz = p; }
    }
    setData(result);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const toggleDone = async (clubId, itemId) => {
    const club = CLUBS.find(c=>c.id===clubId);
    const updated = data[clubId].shop.map(i=>i.id===itemId?{...i,done:!i.done}:i);
    setData(d=>({...d,[clubId]:{...d[clubId],shop:updated}}));
    await setKey(club.baseUrl, `${clubId}-${KEYS.shop}`, updated);
  };

  const clearDone = async (clubId) => {
    const club = CLUBS.find(c=>c.id===clubId);
    const updated = data[clubId].shop.filter(i=>!i.done);
    setData(d=>({...d,[clubId]:{...d[clubId],shop:updated}}));
    await setKey(club.baseUrl, `${clubId}-${KEYS.shop}`, updated);
  };

  const allPending = CLUBS.flatMap(c=>data[c.id].shop.filter(i=>!i.done));
  const allLogs = CLUBS.flatMap(c=>data[c.id].log.map(e=>({...e,clubId:c.id,clubName:c.name,color:CLUBS.find(x=>x.id===c.id).color})))
    .filter(e=>filterDate?e.date===filterDate:true)
    .sort((a,b)=>(b.ts||"").localeCompare(a.ts||""));

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
          <span style={{fontSize:"20px"}}>📊</span>
          <div>
            <div style={{fontWeight:700,fontSize:"15px",color:"#70a8e8"}}>Panel Admin</div>
            <div style={{fontSize:"10px",color:"#4a6a8a"}}>High Era + Weedmaster</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {[["shop","🛒 Compras"],["log","📋 Registros"],["traz","🌱 Trazabilidad"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setTab(v);loadAll();}} style={S.tabBtn(tab===v)}>
              {l}{v==="shop"&&allPending.length>0?` (${allPending.length})`:""}
            </button>
          ))}
          <button onClick={loadAll} style={{...S.tabBtn(false),fontSize:"14px"}}>🔄</button>
        </div>
      </div>

      <div style={S.body}>
        {loading && <div style={{textAlign:"center",color:"#4a6a8a",padding:"40px"}}>Cargando...</div>}

        {!loading && tab==="shop" && (
          <div style={S.col}>
            <div style={S.row}>
              {CLUBS.map(c=>{
                const pend=data[c.id].shop.filter(i=>!i.done).length;
                return (
                  <div key={c.id} style={{flex:1,background:"#101828",border:`1px solid ${c.accent}44`,borderRadius:"11px",padding:"13px"}}>
                    <div style={{fontWeight:700,fontSize:"13px",color:c.color}}>{c.name}</div>
                    <div style={{fontSize:"24px",fontWeight:800,color:pend>0?"#f0c050":"#3a5a3a",marginTop:"4px"}}>{pend}</div>
                    <div style={{fontSize:"11px",color:"#4a6a8a"}}>pendiente{pend!==1?"s":""}</div>
                  </div>
                );
              })}
            </div>
            {CLUBS.map(c=>{
              const pending=data[c.id].shop.filter(i=>!i.done);
              const done=data[c.id].shop.filter(i=>i.done);
              return (
                <div key={c.id}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                    <div style={{width:"9px",height:"9px",borderRadius:"50%",background:c.color}}/>
                    <div style={{fontWeight:700,fontSize:"14px",color:c.color}}>{c.name}</div>
                    {done.length>0&&<button onClick={()=>clearDone(c.id)} style={{marginLeft:"auto",fontSize:"12px",color:"#c87070",background:"transparent",border:"none",cursor:"pointer",fontWeight:600}}>Limpiar</button>}
                  </div>
                  {pending.length===0&&done.length===0&&<div style={{fontSize:"13px",color:"#3a5a3a",padding:"6px 0"}}>Sin pendientes ✓</div>}
                  {pending.map(item=>(
                    <div key={item.id} style={{background:"#1a1508",border:"1px solid #3a3010",borderRadius:"9px",padding:"11px 13px",display:"flex",alignItems:"center",gap:"9px",marginBottom:"7px"}}>
                      <button onClick={()=>toggleDone(c.id,item.id)} style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid #c8930a",background:"transparent",cursor:"pointer",flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,color:"#f0c050"}}>{item.product}</div>
                        <div style={{fontSize:"11px",color:"#7a6a3a"}}>{item.author} · {(item.ts||"").slice(0,10)}</div>
                      </div>
                    </div>
                  ))}
                  {done.map(item=>(
                    <div key={item.id} style={{background:"#0f150f",border:"1px solid #1a2a1a",borderRadius:"9px",padding:"9px 13px",display:"flex",alignItems:"center",gap:"9px",marginBottom:"6px",opacity:0.5}}>
                      <button onClick={()=>toggleDone(c.id,item.id)} style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid #4a9a20",background:"#4a9a20",cursor:"pointer",flexShrink:0,fontSize:"11px",color:"#fff"}}>✓</button>
                      <div style={{textDecoration:"line-through",fontSize:"13px",color:"#4a6a4a"}}>{item.product}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab==="log" && (
          <div style={S.col}>
            <div style={S.row}>
              <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{...S.input,flex:1}}/>
              {filterDate&&<button onClick={()=>setFilterDate("")} style={{padding:"9px 14px",borderRadius:"8px",border:"none",background:"#2a1a1a",color:"#c87070",cursor:"pointer",fontWeight:600}}>✕</button>}
              <span style={{fontSize:"12px",color:"#4a6a8a",alignSelf:"center",whiteSpace:"nowrap"}}>{allLogs.length} reg.</span>
            </div>
            {allLogs.length===0
              ? <div style={{textAlign:"center",color:"#2a4a6a",padding:"30px"}}>📭 Sin registros</div>
              : allLogs.map(entry=>(
                <div key={`${entry.clubId}-${entry.id}`} style={S.card(entry.color)}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px"}}>
                    <span style={{fontSize:"11px",background:`${entry.color}22`,color:entry.color,padding:"2px 8px",borderRadius:"20px",fontWeight:600}}>{entry.clubName}</span>
                    <span style={{fontWeight:700,color:"#c8d8e8"}}>🏠 {Array.isArray(entry.salas)?entry.salas.join(", "):entry.sala}</span>
                  </div>
                  <div style={{fontSize:"12px",color:"#3a5a7a",marginBottom:"5px"}}>{entry.date} · {entry.author}</div>
                  {entry.stage&&<span style={{fontSize:"11px",background:"#1a2a3a",color:"#5a8aaa",padding:"2px 8px",borderRadius:"20px",display:"inline-block",marginBottom:"7px"}}>{entry.stage}</span>}
                  {entry.nutrients?.length>0&&<div style={{marginBottom:"7px"}}><div style={{fontSize:"11px",color:"#3a5a7a",marginBottom:"4px"}}>NUTRIENTES</div><div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>{entry.nutrients.map((n,i)=><span key={i} style={{background:"#1a2a3a",border:"1px solid #2a4a6a",color:"#8ab8e8",padding:"2px 9px",borderRadius:"20px",fontSize:"12px"}}>{n.name}{n.dose?` · ${n.dose}`:""}</span>)}</div></div>}
                  {(entry.ph||entry.ec||entry.temp)&&<div style={{display:"flex",gap:"12px",marginBottom:"7px",flexWrap:"wrap"}}>{entry.ph&&<span style={{fontSize:"12px",color:"#6a8aaa"}}>💧 pH {entry.ph}</span>}{entry.ec&&<span style={{fontSize:"12px",color:"#6a8aaa"}}>⚡ {entry.ec} mS/cm</span>}{entry.temp&&<span style={{fontSize:"12px",color:"#6a8aaa"}}>🌡️ {entry.temp}°C</span>}</div>}
                  {entry.treatments?.length>0&&<div style={{marginBottom:"7px"}}><div style={{fontSize:"11px",color:"#7a4ab8",marginBottom:"4px"}}>TRATAMIENTOS</div><div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>{entry.treatments.map((t,i)=><span key={i} style={{background:"#2a1e3a",border:"1px solid #5a3a9a",color:"#b07ee8",padding:"2px 9px",borderRadius:"20px",fontSize:"12px"}}>{t.name}{t.dose?` · ${t.dose}`:""}</span>)}</div></div>}
                  {entry.notes&&<div style={{fontSize:"13px",color:"#4a6a8a",borderTop:"1px solid #1a2a3a",paddingTop:"7px",marginTop:"7px"}}>{entry.notes}</div>}
                </div>
              ))
            }
          </div>
        )}

        {!loading && tab==="traz" && (
          <div style={S.col}>
            {CLUBS.map(club=>{
              const traz=data[club.id].traz||emptyTraz();
              return (
                <div key={club.id}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                    <div style={{width:"9px",height:"9px",borderRadius:"50%",background:club.color}}/>
                    <div style={{fontWeight:700,fontSize:"15px",color:club.color}}>{club.name}</div>
                  </div>
                  <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"12px"}}>
                    {COSECHAS.map(c=>{
                      const veg=traz[c]?.veg?.count;
                      const flora=traz[c]?.flora?.count;
                      return (
                        <div key={c} style={{flex:1,minWidth:"70px",background:"#0f1828",border:`1px solid ${club.color}33`,borderRadius:"9px",padding:"9px 10px",textAlign:"center"}}>
                          <div style={{fontWeight:700,fontSize:"13px",color:club.color}}>{c}</div>
                          <div style={{fontSize:"11px",color:"#5a9a4a",marginTop:"3px"}}>🌱 {veg??"-"}</div>
                          <div style={{fontSize:"11px",color:"#c87a3a"}}>🌸 {flora??"-"}</div>
                        </div>
                      );
                    })}
                  </div>
                  {COSECHAS.map(c=>{
                    const key=`${club.id}-${c}`;
                    const isOpen=expanded[key];
                    const veg=traz[c]?.veg;
                    const flora=traz[c]?.flora;
                    return (
                      <div key={c} style={{background:"#0f1828",border:`1px solid ${club.color}22`,borderRadius:"9px",overflow:"hidden",marginBottom:"7px"}}>
                        <button onClick={()=>setExpanded(e=>({...e,[key]:!e[key]}))} style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:"11px 13px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                            <span style={{fontWeight:700,fontSize:"14px",color:club.color}}>{c}</span>
                            <span style={{fontSize:"12px",color:"#5a9a4a"}}>🌱 {veg?.count??"-"}</span>
                            <span style={{fontSize:"12px",color:"#c87a3a"}}>🌸 {flora?.count??"-"}</span>
                          </div>
                          <span style={{color:"#3a5a7a",fontSize:"12px"}}>{isOpen?"▲":"▼"}</span>
                        </button>
                        {isOpen&&(
                          <div style={{borderTop:`1px solid ${club.color}22`,padding:"11px 13px",display:"flex",flexDirection:"column",gap:"12px"}}>
                            {[["veg","🌱 Vegetativo","#5a9a4a"],["flora","🌸 Floración","#c87a3a"]].map(([et,label,col])=>{
                              const d=traz[c]?.[et];
                              return (
                                <div key={et}>
                                  <div style={{fontSize:"12px",color:col,fontWeight:600,marginBottom:"6px"}}>{label} — {d?.count??"-"} plantas</div>
                                  {d?.history?.length>0
                                    ? d.history.map(h=>(
                                      <div key={h.id} style={{background:"#0a1420",borderRadius:"7px",padding:"7px 10px",marginBottom:"5px",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"4px"}}>
                                        <div>
                                          <span style={{fontWeight:700,color:"#c8e8f0"}}>{h.count} plantas</span>
                                          {h.diff!==null&&<span style={{fontSize:"12px",marginLeft:"7px",color:h.diff>0?"#7ec850":h.diff<0?"#c87070":"#6a8aaa"}}>{h.diff>0?`+${h.diff}`:h.diff===0?"=":h.diff}</span>}
                                          {h.motivo&&<div style={{fontSize:"12px",color:"#5a7a8a",marginTop:"2px"}}>{h.motivo}</div>}
                                        </div>
                                        <div style={{fontSize:"11px",color:"#3a5a7a",textAlign:"right"}}>{h.date}<br/>{h.author}</div>
                                      </div>
                                    ))
                                    : <div style={{fontSize:"12px",color:"#2a4a6a"}}>Sin movimientos</div>
                                  }
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
