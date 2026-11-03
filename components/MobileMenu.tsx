"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Disclosure menu for phones and small tablets; closes on navigation, outside tap and Escape. */
export function MobileMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname, search]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className="relative md:hidden">
      <summary className="btn btn-sm list-none [&::-webkit-details-marker]:hidden" aria-label={label}>☰ {label}</summary>
      <div
        className="absolute right-0 mt-2 flex w-60 flex-col gap-1 rounded-xl border border-line bg-surface p-2 shadow-lg"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button") && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
