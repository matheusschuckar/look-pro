"use client";

import Link from "next/link";

export function EditorialTallBanner({
  banner,
}: {
  banner: { href: string; image: string; alt: string };
}) {
  return (
    <Link
      href={banner.href}
      className="col-span-2 rounded-3xl overflow-hidden relative"
      aria-label={banner.alt}
    >
      <img
        src={banner.image}
        alt={banner.alt}
        className="w-full h-[560px] object-cover object-center"
        loading="lazy"
        decoding="async"
      />
    </Link>
  );
}

export function SelectionHeroBanner({
  banner,
}: {
  banner: { href: string; image: string; alt: string };
}) {
  return (
    <Link
      href={banner.href}
      className="col-span-2 rounded-3xl overflow-hidden relative aspect-square bg-white"
      aria-label={banner.alt}
    >
      <img
        src={banner.image}
        alt={banner.alt}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </Link>
  );
}

export function BannersTriplet({
  items,
}: {
  items: Array<{ href: string; image: string; alt: string }>;
}) {
  return (
    <div className="col-span-2 grid grid-cols-3 gap-3">
      {items.map((b, idx) => (
        <Link
          key={`land-${idx}`}
          href={b.href}
          className="rounded-2xl overflow-hidden relative"
          aria-label={b.alt}
        >
          <img
            src={b.image}
            alt={b.alt}
            className="w-full h-28 object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        </Link>
      ))}
    </div>
  );
}
