"use client";

import Link from "next/link";
import type { Profile } from "@/lib/data/types";

type Props = {
  loading: boolean;
  profile: Profile | null;
  onOpenMenu: () => void;
};

export default function HeaderBar({ loading, profile, onOpenMenu }: Props) {
  return (
    <div className="-mx-5 px-5 relative z-0 mb-7">
      <div className="relative z-10 pt-6 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] leading-8 font-bold tracking-tight text-black">
            Look
          </h1>
          <p className="mt-1 text-[13px] text-black">Ready to wear in minutes</p>
        </div>

        {!loading && !profile ? (
          <Link
            href="/auth"
            className="mt-1 inline-flex items-center rounded-full border px-4 h-9 text-sm font-medium transition bg-transparent text-[#141414] border-[#141414] hover:bg-[#141414]/10"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={onOpenMenu}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-transparent text-[#141414] border-[#141414] hover:bg-[#141414]/10 active:scale-[0.98] transition"
            aria-label="Abrir menu"
            title="Menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-black"
            >
              <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
