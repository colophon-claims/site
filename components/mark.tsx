/** The Colophon mark. Adapted from the vendored ui_kit's Mark
 * (vendor/design-system/reference/ui_kits/site/kit-icons.jsx); same geometry
 * as vendor/design-system/reference/assets/mark.svg. */
export function Mark({ size = 24, color = "var(--vermilion-500)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill={color} aria-hidden="true">
      <rect x="12.5" y="1.5" width="7" height="7" transform="rotate(45 16 5)" />
      <rect x="2.5" y="19.5" width="7" height="7" transform="rotate(45 6 23)" />
      <rect x="22.5" y="19.5" width="7" height="7" transform="rotate(45 26 23)" />
    </svg>
  );
}
