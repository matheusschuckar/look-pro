"use client";

import { useCallback } from "react";
import {
  bumpGender,
  bumpSize,
  bumpCategory,
} from "@/lib/prefs";

type Gender = "female" | "male";
type Size = "PP" | "P" | "M" | "G" | "GG";

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function FiltersModal({
  open,
  onClose,
  activeTab,
  setActiveTab,
  allCategories,
  selectedGenders,
  setSelectedGenders,
  selectedSizes,
  setSelectedSizes,
  selectedCategories,
  setSelectedCategories,
  clearAll,
  onApply,
}: {
  open: boolean;
  onClose: () => void;

  activeTab: "genero" | "tamanho" | "categorias";
  setActiveTab: (t: "genero" | "tamanho" | "categorias") => void;

  allCategories: string[];

  selectedGenders: Set<Gender>;
  setSelectedGenders: (fn: (prev: Set<Gender>) => Set<Gender>) => void;

  selectedSizes: Set<Size>;
  setSelectedSizes: (fn: (prev: Set<Size>) => Set<Size>) => void;

  selectedCategories: Set<string>;
  setSelectedCategories: (fn: (prev: Set<string>) => Set<string>) => void;

  clearAll: () => void;
  onApply: () => void;
}) {
  if (!open) return null;

  const onBackdrop = useCallback(() => onClose(), [onClose]);

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30" onClick={onBackdrop} />
      <div className="absolute inset-x-0 top-0 bottom-0 bg-white rounded-t-3xl shadow-xl flex flex-col">
        {/* header */}
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between px-5 h-14">
            <button
              className="h-9 w-9 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="text-sm font-semibold tracking-wide">FILTROS</div>
            <button className="text-sm text-gray-600 hover:underline" onClick={clearAll}>
              Limpar
            </button>
          </div>

          {/* tabs */}
          <div className="px-5">
            <div className="flex gap-6 text-sm" role="tablist" aria-label="Filtros">
              {[
                { id: "genero", label: "Gênero" },
                { id: "tamanho", label: "Tamanho" },
                { id: "categorias", label: "Categorias" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  role="tab"
                  aria-selected={activeTab === (t.id as any)}
                  className={`pb-3 -mb-px ${
                    activeTab === (t.id as any)
                      ? "text-[#141414] border-b-2 border-[#141414]"
                      : "text-gray-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4">
          {activeTab === "genero" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">Selecione</div>
              <div className="flex gap-2">
                {[
                  { id: "female" as Gender, label: "Feminino" },
                  { id: "male" as Gender, label: "Masculino" },
                ].map((g) => {
                  const active = selectedGenders.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() =>
                        setSelectedGenders((prev) => {
                          const wasActive = prev.has(g.id);
                          const next = toggleInSet(prev, g.id);
                          if (!wasActive) bumpGender(g.id, 1.0);
                          return next;
                        })
                      }
                      className={`h-10 px-4 rounded-full border text-sm ${
                        active ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-gray-800 border-gray-200"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
              {selectedGenders.size > 0 && (
                <button className="text-xs text-gray-600 underline" onClick={() => setSelectedGenders(() => new Set())}>
                  limpar seleção
                </button>
              )}
            </div>
          )}

          {activeTab === "tamanho" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">Selecione um ou mais tamanhos</div>
              <div className="flex flex-wrap gap-2">
                {(["PP", "P", "M", "G", "GG"] as const).map((s) => {
                  const active = selectedSizes.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSizes((set) => toggleInSet(set, s));
                        bumpSize(s, 0.5);
                      }}
                      className={`h-10 px-4 rounded-full border text-sm ${
                        active ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-gray-800 border-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {selectedSizes.size > 0 && (
                <button className="text-xs text-gray-600 underline" onClick={() => setSelectedSizes(() => new Set())}>
                  limpar seleção
                </button>
              )}
            </div>
          )}

          {activeTab === "categorias" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">Marque quantas quiser</div>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((c) => {
                  const key = c.toLowerCase();
                  const active = selectedCategories.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategories((set) => toggleInSet(set, key))}
                      className={`h-10 px-4 rounded-full border text-sm capitalize ${
                        active ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-gray-800 border-gray-200"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {selectedCategories.size > 0 && (
                <button
                  className="text-xs text-gray-600 underline"
                  onClick={() => setSelectedCategories(() => new Set())}
                >
                  limpar seleção
                </button>
              )}
            </div>
          )}
          <div className="h-24" />
        </div>

        {/* footer */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-3">
          <button onClick={onApply} className="w-full h-11 rounded-xl text-white text-sm font-medium bg-[#141414]">
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}
