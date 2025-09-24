"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

/**
 * Esconda a BottomNav só onde NÃO deve aparecer.
 * Use prefixos: qualquer rota que comece com esses caminhos será ocultada.
 */
const HIDE_ROUTES = [
  "/auth",
  "/profile",
  "/product/",
  "/orders/", // detalhe de pedido; lista de pedidos (/orders) continua com a barra
];

export default function BottomNavGate() {
  const pathname = usePathname() ?? "/";

  const hide = HIDE_ROUTES.some((base) =>
    pathname === base || pathname.startsWith(base)
  );

  if (hide) return null;
  return <BottomNav />;
}
