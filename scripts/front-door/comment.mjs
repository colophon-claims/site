#!/usr/bin/env node
/**
 * Renders a check result as the comment posted on the submission issue.
 *
 *   node scripts/front-door/comment.mjs <result.json> [<pull-request-url>]
 *
 * A refusal shows the checker's own output, not a paraphrase of it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = "https://colophon.claims";

function fence(label, captured) {
  if (captured === undefined || captured.text.trim() === "") return [];
  const body = captured.text.replace(/```/g, "`​``");
  return [
    `**${label}**${captured.truncated ? " (cut at 60,000 characters)" : ""}`,
    "",
    "```text",
    body.trimEnd(),
    "```",
    "",
  ];
}

export function renderComment(result, pullRequest) {
  const link = pullRequest || "a pull request";
  const lines = [];
  if (result.outcome === "pass") {
    lines.push(
      `**Checked.** ${result.checks} of ${result.checks} checks passed with \`${result.checker.command}\`, run cold on the fetched bundle.`,
      "",
      `The listing is ${link}. It adds only this claim's files, and the claim is listed when it merges, at ${SITE}/reports/${result.slug}/. The bundle is served at ${SITE}/reports/${result.slug}/bundle/; anyone can download it and run the same command on their copy.`,
      "",
    );
    for (const note of result.notes ?? []) lines.push(`Note: ${note}`, "");
    lines.push(...fence("What the checker printed", result.checker.stdout));
  } else {
    lines.push(`**Not listed** (\`${result.code}\`). ${result.message}`, "");
    if (result.checker !== undefined) {
      lines.push(`The checker line the bundle sealed: \`${result.checker.command}\`, exit code ${result.checker.exitCode}.`, "");
      lines.push(...fence("Standard output", result.checker.stdout));
      lines.push(...fence("Standard error", result.checker.stderr));
    }
    lines.push(...fence("What the site's ingest said", result.ingest));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = JSON.parse(readFileSync(process.argv[2], "utf8"));
  process.stdout.write(renderComment(result, process.argv[3]));
}
