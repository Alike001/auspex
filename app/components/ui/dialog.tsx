"use client";

import { useEffect } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/** Minimal controlled modal — overlay + centered panel, closes on Escape or
 *  backdrop click. No Radix dependency, in keeping with the rest of the UI. */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border-strong bg-surface p-5 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
