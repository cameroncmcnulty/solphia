"use client";

import { useState, type MouseEvent } from "react";
import { copyText } from "@/lib/copyText";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [ok, setOk] = useState(false);

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!copyText(text)) return;
    setOk(true);
    window.setTimeout(() => setOk(false), 1600);
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {ok ? copiedLabel : label}
    </button>
  );
}
