"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

type Item = {
  href: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
};

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const items: Item[] = [
    {
      href: "/",
      label: "Explore",
      icon: (active) => (
        <svg
          aria-hidden="true"
          className={`h-6 w-6 ${active ? "text-black" : "text-stone-600"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M12 3l3.5 7.5L23 12l-7.5 1.5L12 21l-3.5-7.5L1 12l7.5-1.5L12 3z"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/bag",
      label: "Bag",
      icon: (active) => (
        <svg
          aria-hidden="true"
          className={`h-6 w-6 ${active ? "text-black" : "text-stone-600"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M6 7h12l-1 13H7L6 7z"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 7a3 3 0 116 0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/saved",
      label: "Saved",
      icon: (active) => (
        <svg
          aria-hidden="true"
          className={`h-6 w-6 ${active ? "text-black" : "text-stone-600"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M12 21s-7-4.5-7-10a4.5 4.5 0 119-1.5A4.5 4.5 0 1120 11c0 5.5-8 10-8 10z"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/stores",
      label: "Stores",
      icon: (active) => (
        <svg
          aria-hidden="true"
          className={`h-6 w-6 ${active ? "text-black" : "text-stone-600"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M3 9l1.5-4.5h15L21 9M4 9h16v10H4V9z"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 14h6" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    // z-30 para ficar ATRÁS do menu lateral (que deve usar z-40/50)
    <nav className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4">
        <div
          className="
            flex h-[var(--bottom-nav-h)] items-center justify-between
            rounded-2xl border border-[var(--border-warm)]
            shadow-soft px-4
            bg-[var(--surface)]
            backdrop-blur
          "
        >
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex w-1/4 flex-col items-center justify-center py-1"
              >
                {it.icon(active)}
                <span
                  className={`mt-0.5 text-[11px] ${
                    active ? "text-black font-medium" : "text-stone-700"
                  }`}
                >
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
