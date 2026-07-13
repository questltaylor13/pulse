"use client";

// Wave 4 Rate & Rank — copies a public rankings URL. Uses navigator.share
// when available (mobile), clipboard otherwise.

import { useState } from "react";

interface Props {
  url: string;
  title: string;
  disabled?: boolean;
  disabledHint?: string;
}

export default function CopyLinkButton({
  url,
  title,
  disabled,
  disabledHint,
}: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const absolute =
      typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard?.writeText(absolute).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (disabled) {
    return (
      <span className="text-xs text-mute" title={disabledHint}>
        Private
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="rounded-full bg-mute-hush px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mute-divider"
    >
      {copied ? "Copied!" : "Share ↗"}
    </button>
  );
}
