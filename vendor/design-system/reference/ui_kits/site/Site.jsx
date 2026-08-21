const { Button, Tag, Card, Callout, Footnote, Imprint, VerdictChip, CompletenessBar, ClaimBadge, ReportCard, CiteBlock, MethodLock, AssuranceMeter } = window.__C;

function SiteHeader({onNav}){
  const { Mark } = window.__K;
  return <header style={{position:'sticky',top:0,zIndex:9,background:'var(--surface-page)',borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-6) var(--gutter-lg)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-8)'}}>
      <a href="#" onClick={e=>{e.preventDefault();onNav&&onNav('home');}} style={{display:'flex',alignItems:'center',gap:'var(--space-5)',textDecoration:'none'}}>
        <Mark size={22}/><span style={{fontFamily:'var(--font-display)',fontSize:'var(--text-xl)',color:'var(--text-primary)',letterSpacing:'var(--tracking-snug)'}}>Colophon</span>
      </a>
      <nav style={{display:'flex',alignItems:'center',gap:'var(--space-8)',font:'var(--type-ui)',fontSize:'var(--text-sm)'}}>
        {[['Report','reports'],['How it works','how'],['Docs','docs'],['Contact','home']].map(([l,k])=>
          <a key={l} href="#" onClick={e=>{e.preventDefault();onNav&&onNav(k);}} style={{color:'var(--text-secondary)',textDecoration:'none'}}>{l}</a>)}
        <Button size="sm" variant="primary">Bring a claim</Button>
      </nav>
    </div>
  </header>;
}

function Hero({onNav}){
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-14) var(--gutter-lg) var(--space-13)',display:'grid',gridTemplateColumns:'1.15fr .85fr',gap:'var(--space-12)',alignItems:'center'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Benchmark publishing for agent configurations</span>
        <h1 style={{font:'var(--type-hero)',fontSize:'var(--text-6xl)',letterSpacing:'var(--tracking-tight)',margin:0,maxWidth:'13ch'}}>Publish benchmark claims people can check.</h1>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',maxWidth:'46ch',margin:0}}>Lock the method, account for every expected result, and publish the evidence so the claim can survive outside the person who made it.</p>
        <div style={{display:'flex',gap:'var(--space-5)',alignItems:'center'}}>
          <Button variant="primary" size="lg" onClick={()=>onNav&&onNav('reports')}>Read a published report</Button>
          <Button variant="secondary" size="lg">Bring a claim</Button>
        </div>
        <div style={{display:'flex',gap:'var(--space-5)',alignItems:'center',flexWrap:'wrap',font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-muted)'}}>
          <span>Every claim ships as a badge that resolves to the full report:</span><ClaimBadge value="71.1% · 500 tasks" status="observed"/>
        </div>
      </div>
      <div style={{border:'var(--border-hair) solid var(--rule)',background:'var(--surface-card)',padding:'var(--space-8)',display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <MethodLock state="locked" digest="sha256:9f3c1d7a…a71b" timestamp="2026-08-02T14:20:11Z" compact/>
        <CompletenessBar size="lg" total={1500} label="1,500 expected executions" segments={[{verdict:'met',count:958},{verdict:'unmet',count:362},{verdict:'conflicted',count:88},{verdict:'incomplete',count:92}]}/>
        <AssuranceMeter value="majority" readOnly caption="Three evaluator identities. Splits retained, not resolved."/>
      </div>
    </div>
  </section>;
}

function Pillars(){
  const items=[
    ['Fix the method first','The task set, the entrants, the evaluation policy and the budget are sealed with a digest before the official run. The report carries that digest and the time it was sealed.'],
    ['Choose the assurance','Deterministic tests, one evaluator, an evaluator separated from the solver, majority, or unanimous. The report states which, in the same words you chose it with.'],
    ['Account for everything','Scores are denominated by expected executions. Cancellations, timeouts and unreturned deliveries stay in the denominator and stay on the page.'],
    ['Publish something checkable','A reader can open the method, read the evidence, clone the benchmark, rerun it, or challenge the result. Colophon does not decide who is right.']];
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'var(--space-9)'}}>
      {items.map(([t,b],i)=><div key={t} style={{display:'flex',flexDirection:'column',gap:'var(--space-5)',borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-6)'}}>
        <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-faint)'}}>{String(i+1).padStart(2,'0')}</span>
        <h3 style={{font:'var(--type-section)',fontSize:'var(--text-lg)',margin:0}}>{t}</h3>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)',margin:0}}>{b}</p>
      </div>)}
    </div>
  </section>;
}

function ServiceSection(){
  return <section style={{background:'var(--surface-inset)',borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-12)',alignItems:'center'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Bring the stack that runs the work</span>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',color:'var(--text-primary)',margin:0,maxWidth:'20ch'}}>Run your harness against work people recognize.</h2>
        <p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:0,maxWidth:'50ch'}}>Bring the harness or agent setup you want to test. Use a known benchmark suite, or a task set built around the claim. Colophon locks the comparison, accounts for every expected result, and publishes the evidence.</p>
      </div>
      <div style={{borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-7)',display:'grid',gap:'var(--space-7)'}}>
        <div><strong style={{font:'var(--type-section)',fontSize:'var(--text-lg)'}}>Known benchmark work</strong><p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:'var(--space-3) 0 0'}}>Keep the suite and harness that define the comparison. Colophon records the approved setup and the outcome of every expected run.</p></div>
        <div><strong style={{font:'var(--type-section)',fontSize:'var(--text-lg)'}}>A task set shaped around the claim</strong><p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:'var(--space-3) 0 0'}}>When an existing suite does not match the question, define the relevant work first and lock it before execution.</p></div>
      </div>
    </div>
  </section>;
}

function ReportIndex({onOpen}){
  const rows=[
    ['hb-2026-08','Three harness loadouts on the same 500 tasks','SWE-bench Verified','2026-08-04','conflicted','71.1%'],
    ['pl-2026-07','Does the retrieval plugin help on long repos?','internal-suite-4','2026-07-28','observed','54.2%'],
    ['sk-2026-07','Four skill bundles, one refactor suite','refactor-200','2026-07-19','incomplete','48.9%'],
    ['mx-2026-06','Model swap under a fixed harness','SWE-bench Verified','2026-06-30','observed','63.8%']];
  const S={observed:'met',conflicted:'conflicted',incomplete:'incomplete'};
  return <section>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)',display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'var(--space-8)',borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-6)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-2xl)',margin:0}}>Recently published</h2>
        <a href="#" style={{font:'var(--type-ui)',fontSize:'var(--text-sm)'}}>All reports</a>
      </div>
      <div style={{border:'var(--border-hair) solid var(--rule)',background:'var(--surface-card)'}}>
        {rows.map((r,i)=><a key={r[0]} href="#" onClick={e=>{e.preventDefault();onOpen&&onOpen();}} style={{display:'grid',gridTemplateColumns:'110px 1fr 190px 100px 150px 70px',gap:'var(--space-7)',alignItems:'center',padding:'var(--space-6) var(--space-8)',borderTop:i?'var(--border-hair) solid var(--rule)':'none',textDecoration:'none',color:'inherit'}}>
          <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-muted)'}}>{r[0]}</span>
          <span style={{font:'var(--type-body)',fontSize:'var(--text-base)'}}>{r[1]}</span>
          <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-secondary)'}}>{r[2]}</span>
          <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-faint)'}}>{r[3]}</span>
          <VerdictChip size="sm" verdict={S[r[4]]}>{r[4]==='observed'?'Observed':r[4]==='conflicted'?'Conflicted':'Incomplete'}</VerdictChip>
          <span style={{font:'var(--type-data)',textAlign:'right'}}>{r[5]}</span>
        </a>)}
      </div>
      <Footnote marker="†">Colophon does not rank published reports against each other. A report is evidence about one question at one date.</Footnote>
    </div>
  </section>;
}

function SiteFooter(){
  return <footer style={{borderTop:'var(--border-hair) solid var(--rule)',background:'var(--surface-inset)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-11) var(--gutter-lg) var(--space-9)',display:'grid',gridTemplateColumns:'1.4fr repeat(3,1fr)',gap:'var(--space-10)'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-5)'}}>
        <span style={{fontFamily:'var(--font-display)',fontSize:'var(--text-lg)'}}>Colophon</span>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-sm)',color:'var(--text-secondary)',margin:0,maxWidth:'34ch'}}>Benchmark publishing for agent configurations. Colophon records how a result was produced. It does not certify that a result is correct.</p>
      </div>
      {[['Product',['Bring a claim','How it works','Execution paths']],['Reports',['Published report','Check the bundle','Claim JSON schema']],['Readers',['Docs','Verification','Limits']]].map(([h,ls])=>
        <div key={h} style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>{h}</span>
          {ls.map(l=><a key={l} href="#" style={{font:'var(--type-ui)',fontSize:'var(--text-sm)',textDecoration:'none',color:'var(--text-secondary)'}}>{l}</a>)}
        </div>)}
    </div>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'0 var(--gutter-lg) var(--space-9)'}}>
      <div style={{borderTop:'var(--border-hair) solid var(--rule)',paddingTop:'var(--space-6)',display:'flex',justifyContent:'space-between',gap:'var(--space-8)',font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-faint)'}}>
        <span>© 2026 Colophon</span><span>Built on Jinn.</span>
      </div>
    </div>
  </footer>;
}
Object.assign(window.__K,{SiteHeader,Hero,Pillars,ServiceSection,ReportIndex,SiteFooter});
