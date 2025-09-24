"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getBag,
  updateQty,
  removeFromBag,
  bagTotals,
  BagItem,
  clearBag,
} from "@/lib/bag";
import { createOrder } from "@/lib/airtableClient";
import BottomNav from "@/components/BottomNav";
const DELIVERY_FEE = 20; // frete por loja

// ========= Helpers PIX (EMV "copia e cola") =========

// CRC16-CCITT (0xFFFF)
function crc16(str: string) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// TLV (ID + len + value)
function tlv(id: string, value: string) {
  const v = value ?? "";
  const len = v.length.toString().padStart(2, "0");
  return `${id}${len}${v}`;
}

/** Gera payload EMV PIX estático com valor. */
function buildPix({
  key,
  merchant,
  city,
  amount,
  txid = "LOOKMVP",
}: {
  key: string;
  merchant: string;
  city: string;
  amount: number;
  txid?: string;
}) {
  const id00 = tlv("00", "01"); // Payload Format
  const id01 = tlv("01", "11"); // Static
  const gui = tlv("00", "br.gov.bcb.pix");
  const k = tlv("01", key.trim());
  const id26 = tlv("26", gui + k); // Merchant Account Info - PIX
  const id52 = tlv("52", "0000");
  const id53 = tlv("53", "986"); // BRL
  const id54 = tlv("54", amount.toFixed(2));
  const id58 = tlv("58", "BR");
  const id59 = tlv("59", merchant.substring(0, 25));
  const id60 = tlv("60", city.substring(0, 15));
  const id62 = tlv("62", tlv("05", txid.substring(0, 25)));
  const partial =
    id00 +
    id01 +
    id26 +
    id52 +
    id53 +
    id54 +
    id58 +
    id59 +
    id60 +
    id62 +
    "6304";
  const crc = crc16(partial);
  return partial + crc;
}

// =====================================================

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  cep: string | null;
  city: string | null;
};

function BagPageInner() {
  const [items, setItems] = useState<BagItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();

  // PIX mostrado após criar pedido
  const [pixCode, setPixCode] = useState<string | null>(null);

  // carrega itens da sacola
  useEffect(() => {
    setItems(getBag());
  }, []);

  // carrega usuário + perfil
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u?.user;
        if (!user) return;
        const { data: p, error } = await supabase
          .from("user_profiles")
          .select("id,name,whatsapp,street,number,complement,cep,city")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        setProfile({
          id: user.id,
          email: user.email || null,
          name: (p as any)?.name ?? null,
          whatsapp: (p as any)?.whatsapp ?? null,
          street: (p as any)?.street ?? null,
          number: (p as any)?.number ?? null,
          complement: (p as any)?.complement ?? null,
          cep: (p as any)?.cep ?? null,
          city: (p as any)?.city ?? null,
        });
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar perfil");
      }
    })();
  }, []);

  // Auto-checkout: se voltou do auth com checkout=1, dispara o pagamento
  useEffect(() => {
    const wantsCheckout = search?.get("checkout") === "1";
    if (!wantsCheckout) return;
    if (creating || pixCode) return;
    if (items.length === 0) return;
    // espera o profile carregar para ter email
    if (!profile?.email) return;
    handleCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, profile?.email, items.length, creating, pixCode]);

  function handleQty(i: number, q: number) {
    setItems(updateQty(i, Math.max(1, q)));
  }

  function handleRemove(i: number) {
    setItems(removeFromBag(i));
  }

  const { subtotal } = bagTotals(items);

  // lojas distintas no carrinho
  const uniqueStores = useMemo(
    () => Array.from(new Set(items.map((it) => it.store_name))),
    [items]
  );

  const delivery = items.length > 0 ? DELIVERY_FEE * uniqueStores.length : 0;
  const total = items.length > 0 ? subtotal + delivery : 0;

  async function handleCheckout() {
  try {
    setErr(null);
    setOkMsg(null);

    if (items.length === 0) {
      setErr("Sua sacola está vazia.");
      return;
    }

    // 1) Checa sessão SEM rodeios
    const { data: u } = await supabase.auth.getUser();
    const sessionUser = u?.user ?? null;

    if (!sessionUser) {
      // sem login → vai pro auth e volta pro PIX automaticamente
      router.replace(`/auth?next=${encodeURIComponent("/bag?checkout=1#pix")}`);
      return;
    }

    // 2) Garante e-mail (usa o do user ou do perfil como fallback)
    const email = sessionUser.email || profile?.email || null;
    if (!email) {
      // logado mas faltando dados → vai pro profile e volta pro PIX
      router.replace(`/profile?next=${encodeURIComponent("/bag?checkout=1#pix")}`);
      return;
    }

    // 3) PIX config
    const key = (process.env.NEXT_PUBLIC_PIX_KEY || "").replace(/\D/g, "");
    const merchant = (process.env.NEXT_PUBLIC_PIX_MERCHANT || "LOOK PAGAMENTOS").toUpperCase();
    const city = (process.env.NEXT_PUBLIC_PIX_CITY || "SAO PAULO").toUpperCase();
    if (!key) {
      setErr("Chave PIX não configurada.");
      return;
    }

    const { subtotal } = bagTotals(items);
    const uniqueStores = Array.from(new Set(items.map((it) => it.store_name)));
    const delivery = items.length > 0 ? DELIVERY_FEE * uniqueStores.length : 0;
    const total = items.length > 0 ? subtotal + delivery : 0;

    const txid = `LOOK${Date.now()}`.slice(0, 25);
    const payload = buildPix({ key, merchant, city, amount: total, txid });

    // resumo dos itens para Notes
    const itemsSummary = items
      .map(
        (it) =>
          `• ${it.name} (${it.size}) — ${it.store_name} — x${it.qty} — R$ ${(
            it.unit_price * it.qty
          ).toFixed(2)}`
      )
      .join("\n");

    setCreating(true);

    await createOrder({
      Status: "Aguardando Pagamento",

      Name: profile?.name || "",
      "User Email": email,
      "User WhatsApp": profile?.whatsapp || "",
      Street: profile?.street || "",
      Number: profile?.number || "",
      Complement: profile?.complement || "",
      CEP: profile?.cep || "",
      City: profile?.city || "São Paulo",

      "Item Price": Number(subtotal.toFixed(2)),
      "Delivery Fee": Number(delivery.toFixed(2)),
      Total: Number(total.toFixed(2)),

      "Product ID": items.map((it) => String(it.product_id)).join(", "),
      "Product Name": items.map((it) => it.name).join(" | "),
      "Store Name": items.map((it) => it.store_name).join(", "),
      Size: items.map((it) => it.size).join(", "),

      Notes: `Items:\n${itemsSummary}\n\nLojas distintas: ${uniqueStores.length}\nTXID: ${txid}`,
      "PIX Code": payload,
    });

    setPixCode(payload);
    setOkMsg("Pedido criado! Pague via PIX para prosseguir.");

    // rola até a seção do PIX
    setTimeout(() => {
      if (typeof window !== "undefined") {
        const el = document.querySelector("#pix-section");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  } catch (e: any) {
    setErr(e.message ?? "Erro ao criar pedido");
  } finally {
    setCreating(false);
  }
}

  async function copyPix() {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setOkMsg("Código PIX copiado!");
    } catch {
      setErr("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  function finishAfterPaid() {
    clearBag();
    setItems([]);
    setOkMsg("Pagamento confirmado manualmente. Obrigado!");
  }

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Bag</h1>
      <p className="text-sm text-gray-700 mb-4">Revise seus itens</p>

      {items.length === 0 && !pixCode ? (
        <div className="rounded-xl border p-4 bg-white">
          <p className="text-sm">Sua sacola está vazia.</p>
          <Link
            href="/"
            className="inline-block mt-3 rounded-lg border px-3 py-2 text-sm"
          >
            Voltar para explorar
          </Link>
        </div>
      ) : (
        <>
          {!pixCode && (
            <>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="rounded-xl border p-2 bg-white flex gap-3"
                  >
                    <img
                      src={it.photo_url}
                      alt={it.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black leading-tight">
                        {it.name}
                      </p>
                      <p className="text-xs text-gray-600">{it.store_name}</p>
                      <p className="text-xs text-gray-600">Size: {it.size}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <label className="text-xs text-gray-600">Qtd</label>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) =>
                            setItems(updateQty(i, Number(e.target.value)))
                          }
                          className="w-16 rounded-md border px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => setItems(removeFromBag(i))}
                          className="ml-auto text-xs text-red-600 underline"
                        >
                          remover
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      R$ {(it.unit_price * it.qty).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border p-4 bg-white mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>
                    Delivery{" "}
                    {uniqueStores.length > 0 && (
                      <span className="text-gray-500">
                        ({uniqueStores.length}{" "}
                        {uniqueStores.length === 1 ? "loja" : "lojas"} × R${" "}
                        {DELIVERY_FEE.toFixed(2)})
                      </span>
                    )}
                  </span>
                  <span>R$ {delivery.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm font-semibold mt-1">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>

                <div className="mt-4 flex flex-col space-y-3">
                  <Link
                    href="/"
                    className="w-full rounded-lg border px-3 py-2 text-sm text-center"
                  >
                    Continuar comprando
                  </Link>
                  <button
                    onClick={handleCheckout}
                    disabled={creating}
                    className="w-full rounded-lg bg-black text-white py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {creating ? "Gerando PIX…" : "Continuar para pagamento"}
                  </button>
                  {err && <p className="text-xs text-red-600">{err}</p>}
                  {okMsg && <p className="text-xs text-green-700">{okMsg}</p>}
                </div>
              </div>
            </>
          )}

          {pixCode && (
            <div
              id="pix-section"
              className="rounded-xl border p-4 bg-white mt-4"
            >
              <h2 className="text-lg font-semibold mb-1">Pagamento PIX</h2>
              <p className="text-xs text-gray-700 mb-3">
                Escaneie o QR ou toque em “Copiar código” para pagar. Valor:{" "}
                <b>R$ {total.toFixed(2)}</b>
              </p>

              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    pixCode
                  )}`}
                  alt="QR Code PIX"
                  className="rounded-lg"
                />
              </div>

              <div className="mt-3">
                <label className="text-xs text-gray-600">
                  Copia e cola PIX
                </label>
                <textarea
                  className="w-full rounded-md border p-2 text-xs"
                  rows={4}
                  readOnly
                  value={pixCode}
                />
                <div className="mt-2 flex flex-col space-y-2">
                  <button
                    onClick={copyPix}
                    className="rounded-lg bg-black text-white px-3 py-2 text-sm font-semibold"
                  >
                    Copiar código
                  </button>
                  <Link
                    href="/orders"
                    className="rounded-lg border px-3 py-2 text-sm text-center"
                  >
                    Acesse seus pedidos
                  </Link>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 mt-3">
                Recebedor:{" "}
                {(
                  process.env.NEXT_PUBLIC_PIX_MERCHANT || "LOOK PAGAMENTOS"
                ).toUpperCase()}{" "}
                — Chave: {process.env.NEXT_PUBLIC_PIX_KEY || "(não definida)"}
              </p>
              {okMsg && <p className="text-xs text-green-700 mt-2">{okMsg}</p>}
              {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
            </div>
          )}
        </>
      )}

      <BottomNav />
    </main>
  );
}
export default function BagPage() {
  return (
    <Suspense fallback={<main className="p-4 max-w-md mx-auto">Carregando…</main>}>
      <BagPageInner />
    </Suspense>
  );
}
