"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

export function CopyCommand({ value }: { value: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<number | null>(null);
  // False on the server and in the first client render, so the two match;
  // true once the script is running and the button can do what it says (the
  // same pattern as the board's sort headings, components/board-sort-table.tsx).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy() {
    try {
      try {
        if (navigator.clipboard === undefined) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(value);
      } catch {
        const field = document.createElement("textarea");
        field.value = value;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setStatus("copied");
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("failed");
    }
  }

  const label = status === "copied" ? "Copied" : status === "failed" ? "Try again" : "Copy";

  return (
    <div className="copy-command">
      <code className="copy-command__code">{value}</code>
      {mounted ? (
        <button className="copy-command__button" type="button" aria-live="polite" onClick={copy}>
          {label}
        </button>
      ) : (
        // Reserves the button's exact box (same size, same border width, an
        // invisible fill) so its arrival never moves the value or resizes
        // the control. Nothing here looks live: no role, no label, no focus stop.
        <span className="copy-command__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
