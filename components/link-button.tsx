import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * Anchor styled like the vendored core Button
 * (vendor/design-system/reference/components/core/Button.jsx). The vendored
 * component renders a <button>, which cannot carry an href; this adaptation
 * keeps its exact variant and size styles on an <a>.
 */
const V: Record<string, CSSProperties> = {
  primary: { background: "var(--ink-900)", color: "var(--ink-50)", borderColor: "var(--ink-900)" },
  secondary: { background: "var(--surface-card)", color: "var(--text-primary)", borderColor: "var(--rule-strong)" },
};
const S: Record<string, CSSProperties> = {
  md: { padding: "7px 14px", fontSize: "var(--text-sm)", gap: "var(--space-4)" },
  lg: { padding: "10px 20px", fontSize: "var(--text-base)", gap: "var(--space-4)" },
};

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  children,
  style,
}: {
  href?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const shared: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-ui)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    letterSpacing: "var(--tracking-snug)",
    borderStyle: "solid",
    borderWidth: "var(--border-hair)",
    borderRadius: "var(--radius-sm)",
    textDecoration: "none",
    transition: "var(--transition-ui)",
    ...V[variant],
    ...S[size],
    ...style,
  };
  if (href === undefined) return <span style={shared}>{children}</span>;
  return href.startsWith("/") ? (
    <Link href={href} style={shared}>
      {children}
    </Link>
  ) : (
    <a href={href} style={shared}>
      {children}
    </a>
  );
}
