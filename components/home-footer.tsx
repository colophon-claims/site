import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="site-footer home-footer">
      <div className="home-footer__inner">
        <div className="home-footer__brand">
          <span className="site-footer-name">Colophon</span>
          <p>A public record of how a benchmark number was produced and what it does not prove.</p>
        </div>
        <nav className="home-footer__nav" aria-label="Footer">
          <Link href="/reports/">Reports</Link>
          <Link href="/docs/">Docs</Link>
          <a href="/#contact">Bring a benchmark</a>
        </nav>
        <div className="home-footer__line">
          <span>Checking stays free.</span>
          <span>© 2026 Colophon</span>
        </div>
      </div>
    </footer>
  );
}
