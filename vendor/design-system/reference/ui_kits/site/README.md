# UI kit: Marketing site

Cold-visitor surface. The five-second read is the H1: publish a benchmark claim people can check.
The page is buyer-led: identify the claim that needs to hold up, show what the engagement produces,
then prove breadth and verification.

**Files**
- `index.html`: the buyer-led landing page
- `reports.html`: the chronological reports index
- `guide.html`: the narrative product guide for the managed service
- `Site.jsx`: header, proof-led hero, buyer moments, deliverables, suite breadth, verification, reports index, footer
- `Guide.jsx`: product-guide structure, lifecycle, report anatomy, verification, methods and limits
- `kit-icons.jsx`: Lucide wrapper + mark

**Rules this kit encodes**
- The hero proves rather than asserts: the latest published report is the second read after the
  promise, before the conversion action on narrow screens.
- The landing page links to the reports index. An individual report is never treated as the only or
  defining report.
- The public profile sets `[data-theme="dark"]`. It is the night edition of the same ink-and-paper
  system, not observability chrome.
- Harnesses and execution backends are not the landing page's organizing idea. The buyer brings a
  claim; the managed engagement can use an established suite or build the benchmark the claim needs.
- Named suite examples show both coding and non-coding breadth without becoming an integrations
  catalog. Exact protocol and availability detail belongs in Docs.
- Docs explain the managed service in reader order: why it exists, how an engagement works, what is
  published, how a report is checked, benchmark methods, and limits. Runner setup and self-serve
  benchmarking are absent until they are genuinely public.
- "Built on Jinn." appears once, in the footer's legal line, at the smallest type size on the page.
- No shields, seals, checkmarks or logo walls.
