"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { listOrders } from "@/lib/airtableClient";

// ------------ Tipos ------------
type Order = {
  id: string;
  fields: {
    Status?: string;
    Total?: number;
    Created?: string; // ISO
    Notes?: string;

    // fontes possíveis dos itens/imagens
    Items?: string | any[] | null; // normalmente JSON string
    items?: string | any[] | null;
    products?: string | any[] | null;
    photo_url?: string | string[] | null; // fallback
  };
};

type OrderItem = {
  name?: string | null;
  store_name?: string | null;
  qty?: number | null;
  photo_url?: string | string[] | null;
};

// ------------ Utils UI ------------
function formatBRL(v?: number) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
  } catch {
    return `R$ ${(v ?? 0).toFixed(2)}`;
  }
}
function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// badge
const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  novo: { bg: "bg-neutral-900", text: "text-white", ring: "ring-neutral-900/10" },
  recebido: { bg: "bg-neutral-800", text: "text-white", ring: "ring-neutral-800/10" },
  "em separação": { bg: "bg-amber-900", text: "text-amber-50", ring: "ring-amber-900/10" },
  "saiu para entrega": { bg: "bg-indigo-900", text: "text-indigo-50", ring: "ring-indigo-900/10" },
  entregue: { bg: "bg-emerald-900", text: "text-emerald-50", ring: "ring-emerald-900/10" },
  cancelado: { bg: "bg-red-900", text: "text-red-50", ring: "ring-red-900/10" },
};
function StatusBadge({ status }: { status?: string }) {
  const key = (status || "").toLowerCase();
  const style = STATUS_STYLES[key] || { bg: "bg-neutral-200", text: "text-neutral-800", ring: "ring-neutral-200" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 h-7 text-xs font-medium ${style.bg} ${style.text} ring-1 ${style.ring}`}>
      {status || "—"}
    </span>
  );
}

// ------------ Parse dos itens / thumb ------------
function safeParseJSON<T = any>(v: unknown): T | null {
  if (typeof v === "string") {
    try { return JSON.parse(v) as T; } catch { return null; }
  }
  if (Array.isArray(v) || (v && typeof v === "object")) return v as T;
  return null;
}

function extractItems(o: Order): OrderItem[] {
  const f = o.fields || {};
  const sources = [f.Items, f.items, f.products];
  for (const src of sources) {
    const parsed = safeParseJSON<any[]>(src);
    if (Array.isArray(parsed) && parsed.length) {
      // normaliza cada item
      return parsed.map((it) => ({
        name: it?.name ?? it?.Name ?? null,
        store_name: it?.store_name ?? it?.brand ?? it?.Store ?? null,
        qty: Number(it?.qty ?? it?.quantity ?? 1) || 1,
        photo_url: it?.photo_url ?? it?.image ?? it?.Images ?? null,
      }));
    }
  }
  return [];
}

function pickThumbFromItemPhoto(ph: any): string | null {
  if (!ph) return null;
  if (Array.isArray(ph)) {
    const first = ph[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first?.url) return String(first.url);
  } else if (typeof ph === "string" && ph.startsWith("http")) {
    return ph;
  }
  return null;
}

function pickThumb(o: Order): string | null {
  // 1) tenta pelos itens
  const items = extractItems(o);
  for (const it of items) {
    const url = pickThumbFromItemPhoto(it.photo_url);
    if (url) return url;
  }
  // 2) fallback em photo_url direto na ordem (string/array)
  const direct = pickThumbFromItemPhoto(o.fields.photo_url);
  if (direct) return direct;
  return null;
}

function titleFromOrder(o: Order): string {
  const items = extractItems(o);
  if (items.length > 0) {
    const first = items[0];
    const base = [
      first.name ? String(first.name) : "Item",
      first.store_name ? `— ${first.store_name}` : "",
      first.qty && first.qty > 1 ? ` ×${first.qty}` : "",
    ]
      .join(" ")
      .trim();
    if (items.length > 1) return `${base} +${items.length - 1}`;
    return base;
  }
  // fallback curto (evita Notes enorme)
  return "Pedido";
}

// ------------ Página ------------
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u?.user;
        if (!user?.email) {
          setErr("Você precisa estar logado para ver seus pedidos.");
          return;
        }
        setEmail(user.email);
        const data = await listOrders(user.email);
        setOrders(data);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar pedidos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="canvas text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-24">
      {/* Header */}
      <div className="pt-6 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] leading-7 font-bold tracking-tight">Meus pedidos</h1>
          <p className="text-[12px] text-neutral-600">
            {email ? email : "—"} • {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Início
        </Link>
      </div>

      {/* Estados */}
      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          <div className="text-sm font-semibold">Não foi possível carregar seus pedidos</div>
          <p className="text-xs mt-1">{err}</p>
          <div className="mt-3">
            <Link href="/" className="text-sm underline">Voltar para a home</Link>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm overflow-hidden">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-neutral-200 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-40 bg-neutral-200 rounded animate-pulse" />
                  <div className="mt-2 h-3 w-28 bg-neutral-200 rounded animate-pulse" />
                  <div className="mt-3 h-6 w-20 bg-neutral-200 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !err && orders.length === 0 && (
        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
            <span className="text-neutral-500">🧾</span>
          </div>
          <h2 className="mt-3 text-base font-semibold">Você ainda não tem pedidos</h2>
          <p className="mt-1 text-sm text-neutral-600">Explore as novidades e faça seu primeiro pedido em minutos.</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 h-10 text-sm font-semibold text-white"
            >
              Ver produtos
            </Link>
          </div>
        </div>
      )}

      {/* Lista de pedidos */}
      {!loading && !err && orders.length > 0 && (
        <div className="mt-4 space-y-3">
          {orders.map((o) => {
            const created = formatDate(o.fields.Created);
            const total = formatBRL(o.fields.Total);
            const status = o.fields.Status || "—";
            const thumb = pickThumb(o);
            const title = titleFromOrder(o);

            return (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition"
              >
                <div className="flex gap-3">
                  {/* thumb fixa 64x64 */}
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt="Produto do pedido"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-400">👜</div>
                    )}
                  </div>

                  {/* info (não “vaza”) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-5 line-clamp-2">
                          {title}
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-600">{created}</div>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="mt-2 text-sm text-neutral-700">
                      Total <span className="font-semibold">{total}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
