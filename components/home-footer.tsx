import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="site-footer home-footer">
      <div className="home-footer__inner">
        <div className="home-footer__brand">
          <span className="site-footer-name">Colophon</span>
          <p>Colophon gives benchmark claims a public record people can inspect for themselves.</p>
        </div>
        <nav className="home-footer__nav" aria-label="Footer">
          <Link href="/reports/">Reports</Link>
          <Link href="/docs/">Docs</Link>
          <a href="mailto:ritsu@colophon.claims">ritsu@colophon.claims</a>
        </nav>
        <div className="home-footer__line">
          <span>Checking stays free.</span>
          <span>© 2026 Colophon</span>
        </div>
      </div>
    </footer>
  );
}
