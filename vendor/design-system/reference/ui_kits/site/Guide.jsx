const GuideButton = window.__C.Button;

const GUIDE_NAV = [
  ['overview', 'Overview'],
  ['when', 'When it matters'],
  ['process', 'How it works'],
  ['reports', 'Reports and evidence'],
  ['methods', 'Benchmark methods'],
  ['limits', 'Limits'],
];

const PROCESS = [
  ['Start with the claim', 'Name the performance question and the decision the answer needs to support.'],
  ['Choose the benchmark', 'Use an established suite when its official method fits, or define a benchmark around the claim.'],
  ['Lock the method', 'Agree the tasks, setups, repetitions, grading, exclusions, and limits before the official run.'],
  ['Run and account', 'Execute the plan and retain every expected outcome, including failures and missing results.'],
  ['Publish the evidence', 'Release a readable report, the exact supporting bundle, and the limits on the answer.'],
];

const LIMITS = [
  'A method lock disciplines the run owner. It does not prove honesty against them.',
  'Signatures identify keys. They do not prove that distinct people controlled those keys.',
  'Verification checks that the published records agree. It does not make a judgment correct.',
  'A report answers one bounded question. It is not a certification or a ranking.',
  'The model, tasks, method, failed checks, and other limits remain part of the result.',
];

function DocsGuide(){
  return <main style={{maxWidth:'var(--page-max)',margin:'0 auto',padding:'var(--space-10) var(--gutter-lg) var(--space-14)',display:'grid',gridTemplateColumns:'190px minmax(0,760px)',gap:'var(--space-13)',alignItems:'start'}}>
    <aside style={{position:'sticky',top:'var(--space-12)',display:'flex',flexDirection:'column',gap:'var(--space-5)'}}>
      <span style={{font:'var(--type-label)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-faint)'}}>Docs</span>
      <nav style={{display:'flex',flexDirection:'column',gap:'var(--space-2)'}}>
        {GUIDE_NAV.map(([id,label])=><a key={id} href={'#'+id} style={{font:'var(--type-ui)',fontSize:'var(--text-sm)',color:'var(--text-secondary)',textDecoration:'none',padding:'var(--space-3) 0'}}>{label}</a>)}
      </nav>
    </aside>
    <article style={{display:'flex',flexDirection:'column',gap:'var(--space-13)'}}>
      <section id="overview" style={{display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <h1 style={{font:'var(--type-hero)',fontSize:'var(--text-4xl)',letterSpacing:'var(--tracking-tight)',maxWidth:'18ch',margin:0}}>How Colophon turns a benchmark result into a claim others can check.</h1>
        <p style={{font:'var(--type-body)',fontSize:'var(--text-lg)',color:'var(--text-secondary)',maxWidth:'60ch',margin:0}}>Colophon locks the method before execution, accounts for every planned result, and publishes the answer with its evidence and limits attached.</p>
        <p style={{font:'var(--type-title)',fontSize:'var(--text-2xl)',lineHeight:'var(--leading-snug)',borderTop:'var(--border-slab) solid var(--rule-accent)',paddingTop:'var(--space-7)',margin:0}}>A benchmark score is easy to publish. The difficult part is keeping the question, method, missing results, and limitations attached when the number travels.</p>
      </section>

      <section id="when" style={{display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0}}>When Colophon is useful</h2>
        <p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:0}}>Use it when you are preparing a performance claim, choosing between agent setups, or expecting someone skeptical to inspect the answer.</p>
      </section>

      <section id="process" style={{display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0}}>From claim to published evidence</h2>
        <ol style={{listStyle:'none',margin:0,padding:0,borderTop:'var(--border-heavy) solid var(--rule-heavy)'}}>
          {PROCESS.map(([title,body],i)=><li key={title} style={{display:'grid',gridTemplateColumns:'3rem minmax(0,.8fr) minmax(0,1.2fr)',gap:'var(--space-7)',padding:'var(--space-7) 0',borderBottom:'var(--border-hair) solid var(--rule)'}}>
            <span style={{font:'var(--type-data)',fontSize:'var(--text-xs)',color:'var(--text-faint)'}}>{String(i+1).padStart(2,'0')}</span>
            <strong style={{font:'var(--type-section)',fontSize:'var(--text-md)'}}>{title}</strong>
            <span style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)'}}>{body}</span>
          </li>)}
        </ol>
      </section>

      <section id="reports" style={{display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0}}>The report is readable. The evidence stays attached.</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'var(--space-8)'}}>
          {[
            ['Report', 'The question, result, method, accounting, and limits in one reading surface.'],
            ['Evidence bundle', 'The exact records and artifacts behind the report, listed by digest.'],
            ['Permanent URL', 'A stable public origin that keeps the published bytes available.'],
          ].map(([title,body])=><div key={title} style={{borderTop:'var(--border-heavy) solid var(--rule-heavy)',paddingTop:'var(--space-6)',display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
            <h3 style={{font:'var(--type-section)',fontSize:'var(--text-md)',margin:0}}>{title}</h3>
            <p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)',margin:0}}>{body}</p>
          </div>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-5)',paddingTop:'var(--space-7)'}}>
          <h3 style={{font:'var(--type-section)',fontSize:'var(--text-xl)',margin:0}}>Check a report</h3>
          <p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:0}}>The public verifier checks that the downloaded bundle is complete, unchanged, correctly signed, and consistent with the published result. It does not run a benchmark.</p>
          <pre style={{margin:0,padding:'var(--space-7) var(--space-8)',background:'var(--surface-inset)',border:'var(--border-hair) solid var(--rule-strong)',font:'var(--type-code)',overflowX:'auto'}}><code>npx @colophon-claims/verify@0.1 ./bundle</code></pre>
        </div>
      </section>

      <section id="methods" style={{display:'flex',flexDirection:'column',gap:'var(--space-7)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0}}>Established methods or a benchmark built for the claim</h2>
        <p style={{font:'var(--type-body)',color:'var(--text-secondary)',margin:0}}>Colophon is currently a managed engagement. We can run an established suite according to its official method, or define a custom benchmark when no existing suite answers the question.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-9)',paddingTop:'var(--space-6)',borderTop:'var(--border-heavy) solid var(--rule-heavy)'}}>
          <div><strong style={{font:'var(--type-section)',fontSize:'var(--text-md)'}}>The runner or harness</strong><p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)'}}>Executes and grades the benchmark work.</p></div>
          <div><strong style={{font:'var(--type-section)',fontSize:'var(--text-md)'}}>Colophon</strong><p style={{font:'var(--type-body)',fontSize:'var(--text-base)',color:'var(--text-secondary)'}}>Locks the agreed method, records what happened, accounts for the full plan, and publishes the result.</p></div>
        </div>
      </section>

      <section id="limits" style={{display:'flex',flexDirection:'column',gap:'var(--space-8)'}}>
        <h2 style={{font:'var(--type-title)',fontSize:'var(--text-3xl)',margin:0}}>What a Colophon report does not prove</h2>
        <ul style={{listStyle:'none',margin:0,padding:0,borderTop:'var(--border-heavy) solid var(--rule-heavy)'}}>
          {LIMITS.map(item=><li key={item} style={{font:'var(--type-body)',color:'var(--text-secondary)',padding:'var(--space-6) 0',borderBottom:'var(--border-hair) solid var(--rule)'}}>{item}</li>)}
        </ul>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'var(--space-8)',padding:'var(--space-8)',background:'var(--surface-accent)'}}>
          <strong style={{font:'var(--type-title)',fontSize:'var(--text-xl)'}}>What claim needs to hold up?</strong>
          <GuideButton variant="primary" size="lg">Bring us your claim</GuideButton>
        </div>
      </section>
    </article>
  </main>;
}

Object.assign(window.__K,{DocsGuide});
