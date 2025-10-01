"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
};

export default function AppDrawer({ open, onClose, onLogout }: Props) {
  // bloqueia scroll quando aberto (segurança extra caso usado fora da Home)
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev || "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-72 shadow-xl flex flex-col bg-[#141414] text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
          <span className="font-semibold">Menu</span>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Fechar"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 text-sm">
          <ul className="space-y-3">
            <li>
              <Link href="/profile" onClick={onClose}>
                Perfil
              </Link>
            </li>
            <li>
              <Link href="/orders" onClick={onClose}>
                Pedidos
              </Link>
            </li>
            <li>
              <a
                href="https://wa.me/5511966111233"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                Suporte
              </a>
            </li>
          </ul>
        </nav>

        <div className="border-t p-4 border-white/10">
          <button
            onClick={async () => {
              await onLogout();
              onClose();
            }}
            className="w-full text-left text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
