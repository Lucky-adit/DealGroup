"use client";

import { useEffect, useState } from "react";

export function ShareButton({ label, copiedLabel, text, path }: { label: string; copiedLabel: string; text: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "DealGroup", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled the share sheet or clipboard was blocked */
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={share}>{copied ? copiedLabel : label}</button>
      <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>
  );
}
