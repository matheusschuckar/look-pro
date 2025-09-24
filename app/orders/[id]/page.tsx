"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
};

type RouteParams = { id: string };

export default function OrderDetailPage() {
  const { id } = useParams<RouteParams>();
  const recordId =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

  const [order, setOrder] = useState<AirtableRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const apiKey =
    process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ||
    process.env.NEXT_PUBLIC_AIRTABLE_TOKEN ||
    "";
  const baseId =
    process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID ||
    process.env.AIRTABLE_BASE_ID ||
    "";
  const tableName =
    process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME ||
    process.env.AIRTABLE_TABLE_NAME ||
    "Orders";

  async function fetchOrder() {
    try {
      if (!apiKey || !baseId || !tableName) {
        throw new Error("Variáveis do Airtable ausentes. Verifique .env.local");
      }
      if (!recordId) throw new Error("ID do pedido inválido.");

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
        tableName
      )}/${recordId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Airtable ${res.status}: ${text}`);
      }
      const data = (await res.json()) as AirtableRecord;
      setOrder(data);
      setErr(null);
    } catch (e: any) {
      setErr(e.message ?? "Erro ao carregar pedido");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchOrder();
      setLoading(false);
    })();
    // só quando o id mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const f = order?.fields || {};
  const status = f["Status"] ?? "—";
  const isPaid = String(status).trim().toLowerCase() === "pago";

  const total = typeof f["Total"] === "number" ? f["Total"] : null;
  const delivery =
    typeof f["Delivery Fee"] === "number" ? f["Delivery Fee"] : null;
  const itemPrice =
    typeof f["Item Price"] === "number" ? f["Item Price"] : null;
  const created =
    f["Created At"] || order?.createdTime
      ? new Date(
          f["Created At"] || (order?.createdTime as string)
        ).toLocaleString("pt-BR")
      : "—";
  const pixCode = f["PIX Code"] as string | undefined;

  const itemsFromNotes: string[] =
    typeof f["Notes"] === "string"
      ? f["Notes"]
          .split("\n")
          .filter((line: string) => line.trim().startsWith("•"))
      : [];

  return (
    <main className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <Link href="/orders" className="text-sm underline">
          Voltar
        </Link>
      </div>

      {loading && <p>Carregando…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && order && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>ID</span>
                <span className="font-mono">#{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Criado</span>
                <span>{created}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-semibold">{status}</span>
              </div>
              <div className="flex justify-between">
                <span>Itens</span>
                <span>R$ {itemPrice?.toFixed(2) ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>R$ {delivery?.toFixed(2) ?? "—"}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>R$ {total?.toFixed(2) ?? "—"}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                setReloading(true);
                await fetchOrder();
                setReloading(false);
              }}
              className="mt-3 rounded-lg border px-3 py-2 text-sm"
              disabled={reloading}
            >
              {reloading ? "Atualizando…" : "Atualizar status"}
            </button>
          </div>

          <div className="rounded-xl border p-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">Itens</h2>

            {Array.isArray(f["Product Name"]) ||
            typeof f["Product Name"] === "string" ? (
              <ul className="list-disc ml-5 text-sm space-y-1">
                {String(f["Product Name"])
                  .split("|")
                  .map((n) => n.trim())
                  .filter(Boolean)
                  .map((name, idx) => {
                    const sizes = String(f["Size"] || "")
                      .split(",")
                      .map((s) => s.trim());
                    const stores = String(f["Store Name"] || "")
                      .split(",")
                      .map((s) => s.trim());
                    return (
                      <li key={idx}>
                        {name}
                        {stores[idx] ? ` — ${stores[idx]}` : ""}
                        {sizes[idx] ? ` — Size ${sizes[idx]}` : ""}
                      </li>
                    );
                  })}
              </ul>
            ) : itemsFromNotes.length > 0 ? (
              <ul className="list-disc ml-5 text-sm space-y-1">
                {itemsFromNotes.map((line, i) => (
                  <li key={i}>{line.replace(/^•\s*/, "")}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">Sem itens cadastrados.</p>
            )}
          </div>

          {pixCode && !isPaid && (
            <div className="rounded-xl border p-4 bg-white">
              <h2 className="text-lg font-semibold mb-2">Pagamento PIX</h2>
              <p className="text-xs text-gray-700 mb-3">
                Use o QR abaixo ou copie o código para pagar.
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
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pixCode);
                      alert("Código PIX copiado!");
                    } catch {
                      alert(
                        "Não foi possível copiar. Selecione e copie manualmente."
                      );
                    }
                  }}
                  className="mt-2 rounded-lg bg-black text-white px-3 py-2 text-sm font-semibold"
                >
                  Copiar código
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
