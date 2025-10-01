"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";

export type Product = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string[] | string | null;
  price_tag: number;
  eta_text_runtime?: string | null;
  eta_text?: string | null;
  category?: string | null;
  gender?: "male" | "female" | null;
  sizes?: string | string[] | null;
  categories?: string[] | null;
};

// helpers locais (temporários; depois movemos pra lib/product.ts)
function firstImage(x: string[] | string | null | undefined) {
  return Array.isArray(x) ? x[0] ?? "" : x ?? "";
}
function categoriesOf(p: Product): string[] {
  const one = (p.category || "").trim().toLowerCase();
  const many = (p.categories || []).map((c) => (c || "").trim().toLowerCase());
  const all = (one ? [one] : []).concat(many);
  return Array.from(new Set(all.filter(Boolean)));
}
function formatBRLAlpha(v: number) {
  const cents = Math.round(v * 100) % 100;
  if (cents === 0) return `BRL ${Math.round(v).toLocaleString("pt-BR")}`;
  return `BRL ${v.toFixed(2).replace(".", ",")}`;
}

export default function ProductCard({
  p,
  onTap,
}: {
  p: Product;
  onTap?: (p: Product) => void;
}) {
  const router = useRouter();
  const href = `/product/${p.id}`;

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      onClick={() => onTap?.(p)}
      className="rounded-2xl surface shadow-soft overflow-hidden hover:shadow-soft transition border border-warm"
    >
      <div className="relative h-44">
        <span className="absolute left-2 bottom-2 rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow border bg-[#141414] border-[#141414]">
          {formatBRLAlpha(p.price_tag)}
        </span>
        <img
          src={firstImage(p.photo_url)}
          alt={p.name}
          className="w-full h-44 object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/fallback.jpg";
          }}
        />
      </div>

      <div className="p-3">
        {(() => {
          const mainCat = categoriesOf(p)[0];
          return mainCat ? (
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
              {mainCat}
            </p>
          ) : null;
        })()}

        <p className="text-sm font-semibold leading-tight line-clamp-2">
          {p.name}
        </p>
        <p className="text-xs text-gray-500">{p.store_name}</p>
        <p className="text-xs text-gray-400">
          {p.eta_text_runtime ?? p.eta_text ?? "até 1h"}
        </p>
      </div>
    </Link>
  );
}
