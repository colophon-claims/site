import React from 'react';
export function CiteBlock({tabs=[],active,onSelect,value,style}){
  const [local,setLocal]=React.useState(tabs[0]&&tabs[0].id);
  const [copied,setCopied]=React.useState(false);
  const cur=active||local;
  const item=tabs.find(t=>t.id===cur)||tabs[0];
  const body=value!=null?value:item&&item.value;
  return <div style={{border:'var(--border-hair) solid var(--rule)',borderRadius:'var(--radius-sm)',background:'var(--surface-inset)',overflow:'hidden',...style}}>
    <div role="tablist" aria-label="Citation format" style={{display:'flex',alignItems:'center',gap:'var(--space-2)',padding:'var(--space-3) var(--space-4)',borderBottom:'var(--border-hair) solid var(--rule)',background:'var(--surface-card)'}}>
      {tabs.map(t=><button key={t.id} id={`cite-tab-${t.id}`} role="tab" aria-selected={t.id===cur} aria-controls={`cite-panel-${t.id}`} type="button" onClick={()=>{setLocal(t.id);onSelect&&onSelect(t.id);}} style={{minHeight:36,border:0,background:t.id===cur?'var(--surface-inset)':'transparent',color:t.id===cur?'var(--text-primary)':'var(--text-muted)',font:'var(--type-data)',fontSize:'var(--text-xs)',padding:'4px 9px',borderRadius:'var(--radius-xs)',cursor:'pointer'}}>{t.label}</button>)}
      <button type="button" aria-live="polite" onClick={async()=>{if(navigator.clipboard){await navigator.clipboard.writeText(String(body));setCopied(true);window.setTimeout(()=>setCopied(false),1600);}}} style={{minHeight:36,marginLeft:'auto',border:'var(--border-hair) solid var(--rule-strong)',background:'var(--surface-card)',color:'var(--text-secondary)',font:'var(--type-data)',fontSize:'var(--text-xs)',padding:'4px 10px',borderRadius:'var(--radius-xs)',cursor:'pointer'}}>{copied?'Copied':'Copy'}</button>
    </div>
    <pre id={item&&`cite-panel-${item.id}`} role="tabpanel" aria-labelledby={item&&`cite-tab-${item.id}`} style={{margin:0,padding:'var(--space-6) var(--space-6)',font:'var(--type-code)',color:'var(--text-secondary)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{body}</pre>
  </div>;
}
