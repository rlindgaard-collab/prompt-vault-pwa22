import { useEffect, useMemo, useState } from "react";
import { Clipboard, ExternalLink, Search, RefreshCcw, Check, ChevronDown, ChevronRight } from "lucide-react";

export default function App(){
  const [data, setData] = useState([]);
  const [tabs, setTabs] = useState([]); // keep given order
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("pv570_tab") || "");
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem("pv570_section") || "");
  const [category, setCategory] = useState(() => localStorage.getItem("pv570_cat") || "");
  const [q, setQ] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [openSections, setOpenSections] = useState({});

  useEffect(()=>localStorage.setItem("pv570_tab", activeTab),[activeTab]);
  useEffect(()=>localStorage.setItem("pv570_section", activeSection),[activeSection]);
  useEffect(()=>localStorage.setItem("pv570_cat", category),[category]);

  async function loadJson(){
    try{
      const res = await fetch("/prompts.json", { cache:"no-store" });
      const json = await res.json();
      setData(json);

      // derive tabs in first-seen order
      const seen = new Set();
      const order = [];
      for(const r of json){
        if(!seen.has(r.fane)){
          seen.add(r.fane);
          order.push(r.fane);
        }
      }
      setTabs(order);
      if(!activeTab && order.length){ setActiveTab(order[0]); }
    }catch(e){ console.error(e); alert("Kunne ikke læse prompts.json"); }
  }
  useEffect(()=>{ loadJson(); },[]);

  // Build section -> categories in first-seen order
  const tree = useMemo(()=>{
    const map = new Map(); // sec => Map(cat => count)
    for(const r of data){
      if(r.fane !== activeTab) continue;
      const sec = r.section || "(Uden underkapitel)";
      const cat = r.kategori || "(Uden kategori)";
      if(!map.has(sec)) map.set(sec, new Map());
      const catMap = map.get(sec);
      catMap.set(cat, (catMap.get(cat)||0) + 1);
    }
    // Keep insertion order
    return Array.from(map.entries()).map(([sec, catMap])=>[sec, Array.from(catMap.entries())]);
  }, [data, activeTab]);

  // Visible list preserving data order
  const visible = useMemo(()=>{
    const out = [];
    for(const r of data){
      if(r.fane !== activeTab) continue;
      const sec = r.section || "(Uden underkapitel)";
      const cat = r.kategori || "(Uden kategori)";
      if(activeSection && sec !== activeSection) continue;
      if(category && cat !== category) continue;
      if(q && !r.prompt.toLowerCase().includes(q.toLowerCase())) continue;
      out.push(r);
    }
    return out;
  }, [data, activeTab, activeSection, category, q]);

  function toggleSection(sec){ setOpenSections(s=>({...s, [sec]: !s[sec]})); }
  function copyPrompt(txt, idx){
    navigator.clipboard?.writeText(txt).then(()=>{
      setCopiedIdx(idx);
      setTimeout(()=> setCopiedIdx(null), 1200);
    }).catch(()=>{});
  }
  function openChatGPT(){ window.open("https://chat.openai.com/", "_blank"); }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto p-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Prompt Vault v5.7.0</h1>
            <p className="text-xs text-slate-500">Rækkefølge = præcis som i dine CSV'er</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openChatGPT} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white"><ExternalLink className="w-4 h-4"/>Åbn ChatGPT</button>
            <button onClick={loadJson} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100"><RefreshCcw className="w-4 h-4"/>Genindlæs</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 pb-2 flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={()=>{setActiveTab(t); setActiveSection(""); setCategory("");}} className={"px-3 py-1.5 rounded-full border " + (activeTab===t ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300")}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <aside className="sm:col-span-5 lg:col-span-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Søg i prompts…" className="w-full pl-9 rounded-xl border border-slate-300 px-3 py-2"/>
            </div>
            <div className="max-h-[65vh] overflow-auto pr-1">
              <button onClick={()=>{setActiveSection(""); setCategory("");}} className={"w-full text-left px-3 py-2 rounded-lg mb-1 " + (activeSection==="" ? "bg-slate-900 text-white" : "hover:bg-white border border-slate-200")}>
                Alle underkapitler
              </button>
              {tree.map(([sec, cats]) => (
                <div key={sec} className="mb-1">
                  <button onClick={()=>toggleSection(sec)} className={"w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between " + (activeSection===sec ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-100")}>
                    <span className="truncate">{sec}</span>
                    {openSections[sec] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                  </button>
                  {(openSections[sec]) && (
                    <div className="pl-3 mt-1">
                      {cats.map(([cat, n], i) => (
                        <button key={sec+"::"+i+"::"+cat} onClick={()=>{setActiveSection(sec); setCategory(cat);}} className={"w-full text-left px-3 py-1.5 rounded-lg mb-1 border " + (category===cat && activeSection===sec ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-100")}>
                          <span className="truncate inline-block max-w-[80%]">{cat}</span>
                          <span className="float-right text-xs opacity-70">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="sm:col-span-7 lg:col-span-8">
          {!!activeSection && <h2 className="text-lg font-semibold mb-1">{activeSection}</h2>}
          {!!category && <h3 className="text-base font-medium mb-3 text-slate-700">{category}</h3>}
          <ul className="space-y-3">
            {visible.map((r, idx) => (
              <li key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <pre className="whitespace-pre-wrap text-[15px] leading-relaxed">{r.prompt}</pre>
                <div className="mt-2">
                  <button onClick={()=>copyPrompt(r.prompt, idx)} className={"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border " + (copiedIdx===idx? "bg-green-600 border-green-600 text-white" : "border-slate-300 bg-white")}>
                    {copiedIdx===idx ? <Check className="w-4 h-4"/> : <Clipboard className="w-4 h-4"/>}
                    {copiedIdx===idx ? "Kopieret!" : "Kopiér"}
                  </button>
                </div>
              </li>
            ))}
            {visible.length===0 && <li className="text-slate-500">Ingen prompts matcher.</li>}
          </ul>
        </main>
      </div>
    </div>
  );
}
