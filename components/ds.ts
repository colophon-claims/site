/**
 * Server-safe re-exports of the vendored design-system components
 * (vendor/design-system/reference/components). None of these call hooks, so
 * they render in server components. The canonical copy lives in the Jinn
 * mono; never edit the vendored files — adapt here or wrap.
 */
export { ReportCard } from "@/vendor/design-system/reference/components/claim/ReportCard";
export { ClaimBadge } from "@/vendor/design-system/reference/components/claim/ClaimBadge";
export { MethodLock } from "@/vendor/design-system/reference/components/claim/MethodLock";
export { CompletenessBar } from "@/vendor/design-system/reference/components/evidence/CompletenessBar";
export { VerdictChip } from "@/vendor/design-system/reference/components/evidence/VerdictChip";
export { Tag } from "@/vendor/design-system/reference/components/core/Tag";
export { SectionHead } from "@/vendor/design-system/reference/components/editorial/SectionHead";
export { Callout } from "@/vendor/design-system/reference/components/editorial/Callout";
export { Card } from "@/vendor/design-system/reference/components/editorial/Card";
export { Footnote } from "@/vendor/design-system/reference/components/editorial/Footnote";
export { Imprint } from "@/vendor/design-system/reference/components/editorial/Imprint";
