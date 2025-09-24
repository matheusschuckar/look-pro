"use client";

import type { ReactNode } from "react";

export default function TransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  // coloque aqui sua animação se tiver; por enquanto, só repassa
  return <>{children}</>;
}
