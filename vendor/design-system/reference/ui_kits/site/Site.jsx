const { Button, Tag, Card, Callout, Footnote, Imprint, VerdictChip, CompletenessBar, ClaimBadge, ReportCard, CiteBlock, MethodLock, AssuranceMeter } = window.__C;

function SiteHeader({onNav}){
  const { Mark } = window.__K;
  return <header style={{position:'sticky',top:0,zIndex:9,background:'var(--surface-page)',borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-6) var(--gutter-lg)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-8)'}}>
      <a href="#" onClick={e=>{e.preventDefault();onNav&&onNav('home');}} style={{display:'flex',alignItems:'center',gap:'var(--space-5)',textDecoration:'none'}}>
        <Mark size={22}/><span style={{fontFamily:'var(--font-display)',fontSize:'var(--text-xl)',color:'var(--text-primary)',letterSpacing:'var(--tracking-snug)'}}>Colophon</span>
      </a>
      <nav style={{display:'flex',alignItems:'center',gap:'var(--space-8)',font:'var(--type-ui)',fontSize:'var(--text-sm)'}}>
        {[['Report','reports'],['What you get','outcomes'],['Docs','docs']].map(([l,k])=>
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
        <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Benchmark publishing for agent performance</span>
        <h1 style={{font:'var(--type-hero)',fontSize:'var(--text-6xl)',letterSpacing:'var(--tracking-tight)',margin:0,maxWidth:'13ch'}}>Publish benchmark claims people can check.</h1>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',maxWidth:'46ch',margin:0}}>Lock the method, account for every expected result, and publish the evidence so the claim can survive outside the person who made it.</p>
        <div style={{display:'flex',gap:'var(--space-5)',alignItems:'center'}}>
          <Button variant="primary" size="lg">Bring a claim</Button>
          <Button variant="secondary" size="lg" onClick={()=>onNav&&onNav('reports')}>Read a published report</Button>
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

function BuyerMoments(){
  const items=[
    ['You are about to make a performance claim','Publish the basis before customers, contributors, or competitors ask how you know.'],
    ['You are choosing between agent setups','Make the decision on a comparison approved before execution, not on the most convenient run.'],
    ['Someone else needs to inspect the result','Give them the method, every planned outcome, the limits, and the exact evidence behind the answer.']];
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)',display:'grid',gridTemplateColumns:'.8fr 1.2fr',gap:'var(--space-12)',alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-6)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0,maxWidth:'17ch'}}>When the claim has to hold up.</h2>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',margin:0,maxWidth:'35ch'}}>You do not need another unsupported score. You need an answer that can travel.</p>
      </div>
      <div style={{borderTop:'var(--border-heavy) solid var(--rule-heavy)'}}>
        {items.map(([t,b])=><div key={t} style={{display:'grid',gridTemplateColumns:'.8fr 1.2fr',gap:'var(--space-8)',padding:'var(--space-7) 0',borderBottom:'var(--border-hair) solid var(--rule)'}}>
          <h3 style={{font:'var(--type-section)',fontSize:'var(--text-lg)',margin:0}}>{t}</h3>
          <p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)',margin:0}}>{b}</p>
        </div>)}
      </div>
    </div>
  </section>;
}

function Deliverables(){
  const items=[
    ['The comparison, fixed first','Approve the tasks, setups, grading, and limits. Colophon seals that method before execution.'],
    ['Every planned result, accounted for','Passes, failures, timeouts, and ungradable cells remain visible. Nothing disappears because it is inconvenient.'],
    ['A report that travels','Get a permanent URL, a readable result, the evidence bundle, and one-command verification.']];
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)'}}>
      <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:'0 0 var(--space-9)',maxWidth:'18ch'}}>What you get.</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'var(--space-9)'}}>
        {items.map(([t,b],i)=><div key={t} style={{display:'flex',flexDirection:'column',gap:'var(--space-5)',borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-6)'}}>
          <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-faint)'}}>{String(i+1).padStart(2,'0')}</span>
          <h3 style={{font:'var(--type-section)',fontSize:'var(--text-lg)',margin:0}}>{t}</h3>
          <p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)',margin:0}}>{b}</p>
        </div>)}
      </div>
    </div>
  </section>;
}

function SuiteSection(){
  return <section style={{background:'var(--surface-inset)',borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-13) var(--gutter-lg)',display:'grid',gridTemplateColumns:'1fr .82fr',gap:'var(--space-12)',alignItems:'end',borderTop:'var(--border-slab) solid var(--rule-accent)'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-4xl)',color:'var(--text-primary)',margin:0,maxWidth:'22ch'}}>Turn a benchmark run into a claim others can verify.</h2>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',margin:0,maxWidth:'56ch'}}>Run on <strong style={{color:'var(--text-primary)'}}>APEX-Agents</strong>, <strong style={{color:'var(--text-primary)'}}>SWE-bench Verified</strong>, <strong style={{color:'var(--text-primary)'}}>Terminal-Bench 3.0</strong>, or another established suite. Or use a benchmark built for your claim.</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-6)',alignItems:'flex-start'}}>
        <p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:0}}>We lock the method, account for every result, and publish the evidence.</p>
        <Button variant="primary" size="lg">Bring us your claim</Button>
      </div>
    </div>
  </section>;
}

function VerificationSection(){
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-12) var(--gutter-lg)',display:'grid',gridTemplateColumns:'.9fr 1.1fr',gap:'var(--space-12)',alignItems:'center'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-6)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0,maxWidth:'18ch'}}>The evidence travels with the claim.</h2>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',margin:0,maxWidth:'42ch'}}>Every report links the exact bundle. A reader can verify its manifest, evidence, signatures, matrix, report, and claim consistency in one command.</p>
      </div>
      <pre style={{margin:0,padding:'var(--space-8)',background:'var(--surface-card)',border:'var(--border-hair) solid var(--rule-strong)',font:'var(--type-code)',overflowX:'auto'}}><code>npx @colophon-claims/verify@0.1 ./bundle</code></pre>
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
        <p style={{font:'var(--type-body)',fontSize:'var(--text-sm)',color:'var(--text-secondary)',margin:0,maxWidth:'34ch'}}>Benchmark publishing for performance claims. Colophon records how a result was produced. It does not certify that a result is correct.</p>
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
Object.assign(window.__K,{SiteHeader,Hero,BuyerMoments,Deliverables,SuiteSection,VerificationSection,ReportIndex,SiteFooter});
