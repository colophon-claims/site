const { Button, Footnote } = window.__C;

function SiteHeader(){
  const { Mark } = window.__K;
  return <header style={{position:'sticky',top:0,zIndex:9,background:'var(--surface-page)',borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-6) var(--gutter-lg)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-8)'}}>
      <a href="index.html" style={{display:'flex',alignItems:'center',gap:'var(--space-5)',textDecoration:'none'}}>
        <Mark size={22}/><span style={{fontFamily:'var(--font-display)',fontSize:'var(--text-xl)',color:'var(--text-primary)',letterSpacing:'var(--tracking-snug)'}}>Colophon</span>
      </a>
      <nav style={{display:'flex',alignItems:'center',gap:'var(--space-8)',font:'var(--type-ui)',fontSize:'var(--text-sm)'}}>
        <a href="reports.html" style={{color:'var(--text-secondary)',textDecoration:'none'}}>Reports</a>
        <a href="guide.html" style={{color:'var(--text-secondary)',textDecoration:'none'}}>Docs</a>
        <Button size="sm" variant="primary">Bring a claim</Button>
      </nav>
    </div>
  </header>;
}

function Hero(){
  return <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
    <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-14) var(--gutter-lg) var(--space-13)',display:'grid',gridTemplateColumns:'minmax(0,1.08fr) minmax(26rem,.92fr)',gridTemplateAreas:'"copy proof" "actions proof"',columnGap:'var(--space-13)',rowGap:'var(--space-9)',alignItems:'start'}}>
      <div style={{gridArea:'copy',display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Benchmark publishing for agent performance</span>
        <h1 style={{font:'var(--type-hero)',fontSize:'var(--text-6xl)',letterSpacing:'var(--tracking-tight)',margin:0,maxWidth:'13ch'}}>Publish benchmark claims people can check.</h1>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',maxWidth:'46ch',margin:0}}>Lock the method, account for every expected result, and publish the evidence so the claim can survive outside the person who made it.</p>
      </div>
      <div style={{gridArea:'actions',display:'flex',gap:'var(--space-5)',alignItems:'center',flexWrap:'wrap'}}>
        <Button variant="primary" size="lg">Bring a claim</Button>
        <Button variant="secondary" size="lg" onClick={()=>window.location.href='reports.html'}>Browse reports</Button>
      </div>
      <div style={{gridArea:'proof',paddingTop:'var(--space-8)',display:'flex',flexDirection:'column',gap:'var(--space-6)'}}>
        <article style={{background:'var(--surface-card)',border:'var(--border-hair) solid var(--rule-strong)',borderTop:'var(--border-slab) solid var(--rule-accent)'}}>
          <div style={{padding:'var(--space-8)',display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
            <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Latest report</span>
            <h2 style={{font:'var(--type-title)',fontSize:'var(--text-2xl)',letterSpacing:'var(--tracking-tight)',margin:0}}>Do you need a Skill, or is CLAUDE.md enough?</h2>
            <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-secondary)'}}>SkillsBench v1.1 · claude-haiku-4-5-20251001</span>
          </div>
          <div style={{borderTop:'var(--border-hair) solid var(--rule)',padding:'var(--space-7) var(--space-8)',display:'grid',gridTemplateColumns:'.72fr 1.28fr',gap:'var(--space-8)'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
              <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Paired A−B</span>
              <strong style={{font:'var(--type-data)',fontSize:'var(--text-3xl)',fontWeight:500}}>−0.047</strong>
            </div>
            <dl style={{margin:0,display:'flex',flexDirection:'column',gap:'var(--space-4)',font:'var(--type-data)',fontSize:'var(--text-xs)'}}>
              <div style={{display:'grid',gridTemplateColumns:'5.5rem 1fr',gap:'var(--space-4)'}}><dt style={{color:'var(--text-muted)'}}>95% CI</dt><dd style={{margin:0}}>−0.223 to 0.129</dd></div>
              <div style={{display:'grid',gridTemplateColumns:'5.5rem 1fr',gap:'var(--space-4)'}}><dt style={{color:'var(--text-muted)'}}>Analysis</dt><dd style={{margin:0}}>14/41 tasks</dd></div>
              <div style={{display:'grid',gridTemplateColumns:'5.5rem 1fr',gap:'var(--space-4)'}}><dt style={{color:'var(--text-muted)'}}>Accounting</dt><dd style={{margin:0}}>492/492 cells</dd></div>
            </dl>
          </div>
        </article>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-sm)',color:'var(--text-muted)',margin:0}}>No winner emerged. The method, failed checks, and limits still travel with the answer.</p>
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
        {items.map(([t,b])=><div key={t} style={{display:'flex',flexDirection:'column',gap:'var(--space-5)',borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-6)'}}>
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
      <div style={{display:'flex',alignItems:'flex-start'}}>
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
  return <main>
    <section style={{borderBottom:'var(--border-hair) solid var(--rule)'}}>
      <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-13) var(--gutter-lg) var(--space-11)',display:'flex',flexDirection:'column',gap:'var(--space-6)'}}>
        <h1 style={{font:'var(--type-hero)',fontSize:'var(--text-5xl)',letterSpacing:'var(--tracking-tight)',margin:0}}>Reports</h1>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',maxWidth:'52ch',margin:0}}>Published benchmark claims, with their methods, limits, and evidence attached.</p>
      </div>
    </section>
    <section>
      <div style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-11) var(--gutter-lg) var(--space-13)',display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <a href="#" onClick={e=>{e.preventDefault();onOpen&&onOpen();}} style={{display:'grid',gridTemplateColumns:'minmax(0,1.25fr) minmax(18rem,.75fr)',gap:'var(--space-10)',alignItems:'start',padding:'var(--space-8) 0',borderTop:'var(--border-heavy) solid var(--rule-heavy)',borderBottom:'var(--border-hair) solid var(--rule)',textDecoration:'none',color:'inherit'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'var(--space-5)'}}>
            <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Published report</span>
            <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',letterSpacing:'var(--tracking-tight)',margin:0}}>Do you need a Skill, or is CLAUDE.md enough?</h2>
            <p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)',maxWidth:'62ch',margin:0}}>The same instruction bytes were loaded as a native Skill or root CLAUDE.md, with a no-instructions arm. The point estimate slightly favored CLAUDE.md, but the interval includes zero.</p>
          </div>
          <dl style={{margin:0,display:'grid',gridTemplateColumns:'auto 1fr',gap:'var(--space-4) var(--space-7)',font:'var(--type-data)',fontSize:'var(--text-xs)'}}>
            <dt style={{color:'var(--text-muted)'}}>Benchmark</dt><dd style={{margin:0}}>SkillsBench v1.1</dd>
            <dt style={{color:'var(--text-muted)'}}>Model</dt><dd style={{margin:0}}>claude-haiku-4-5-20251001</dd>
            <dt style={{color:'var(--text-muted)'}}>Published</dt><dd style={{margin:0}}>August 18, 2026</dd>
            <dt style={{color:'var(--text-muted)'}}>Accounting</dt><dd style={{margin:0}}>492/492 cells</dd>
          </dl>
        </a>
      <Footnote marker="†">Colophon does not rank published reports against each other. A report is evidence about one question at one date.</Footnote>
      </div>
    </section>
  </main>;
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
