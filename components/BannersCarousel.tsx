"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Banner = {
  title: string;
  subtitle: string | string[];
  image: string;
  href: string;
};

export default function BannersCarousel({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);

  // autoplay
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setIdx((p) => (p + 1) % banners.length), 5500);
    return () => clearInterval(id);
  }, [banners.length]);

  // swipe
  const startX = useRef<number | null>(null);
  const endX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.changedTouches[0].clientX;
    endX.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    endX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (startX.current === null || endX.current === null) return;
    const delta = endX.current - startX.current;
    const thr = 40;
    if (delta > thr) setIdx((p) => (p - 1 + banners.length) % banners.length);
    else if (delta < -thr) setIdx((p) => (p + 1) % banners.length);
    startX.current = null;
    endX.current = null;
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl relative">
      <div className="relative h-60 w-full" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {banners.map((b, i) => (
          <Link
            href={b.href}
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === idx ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-label={`${b.title} — ${Array.isArray(b.subtitle) ? b.subtitle.join(" ") : b.subtitle}`}
          >
            <div className="absolute inset-0">
              <img src={b.image} alt={b.title} className="absolute inset-0 h-full w-full object-cover object-center" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-black/10 to-transparent" />
            <div className="absolute left-4 bottom-4 right-4 text-white drop-shadow">
              <div className="text-[22px] font-bold leading-6">{b.title}</div>
              <div className="text-[13px] opacity-90 font-semibold">
                {Array.isArray(b.subtitle)
                  ? b.subtitle.map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < b.subtitle.length - 1 && <br />}
                      </span>
                    ))
                  : b.subtitle}
              </div>
            </div>
          </Link>
        ))}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => setIdx((p) => (p - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm active:scale-95"
            >
              …
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => setIdx((p) => (p + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm active:scale-95"
            >
              …
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {banners.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
