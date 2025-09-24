"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { listOrders } from "@/lib/airtableClient";

type Order = {
  id: string;
  fields: {
    "Status"?: string;
    "Total"?: number;
    "Created"?: string;
    "Notes"?: string;
  };
};

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
          setLoading(false);
          return;
        }
        setEmail(user.email);

        const data = await listOrders(user.email);
        setOrders(data);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar pedidos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Meus Pedidos</h1>

      {loading && <p>Carregando…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && orders.length === 0 && (
        <p className="text-sm text-gray-600">Nenhum pedido encontrado.</p>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block rounded-xl border p-3 bg-white hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Pedido #{o.id.slice(-5)}
              </span>
              <span className="text-xs text-gray-600">
                {o.fields["Created"]
                  ? new Date(o.fields["Created"]).toLocaleDateString("pt-BR")
                  : ""}
              </span>
            </div>
            <div className="text-sm">
              Status: <b>{o.fields["Status"] || "—"}</b>
            </div>
            <div className="text-sm">
              Total: R$ {o.fields["Total"]?.toFixed(2) || "0,00"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}