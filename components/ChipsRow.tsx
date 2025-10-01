"use client";

type ChipsRowProps = {
  anyActiveFilter: boolean;
  chipCategory: string;
  setChipCategory: (v: string) => void;

  selectedCategories: Set<string>;
  selectedGenders: Set<"male" | "female">;
  selectedSizes: Set<"PP" | "P" | "M" | "G" | "GG">;

  allCategories: string[];

  clearFilters: () => void;
  openFilter: () => void;

  onBumpCategory: (c: string, w: number) => void;
  onToggleGender: (g: "female" | "male") => void; // 👈 novo
};

export default function ChipsRow({
  anyActiveFilter,
  chipCategory,
  setChipCategory,
  selectedCategories,
  selectedGenders,
  selectedSizes,
  allCategories,
  clearFilters,
  openFilter,
  onBumpCategory,
  onToggleGender,
}: ChipsRowProps) {
  return anyActiveFilter ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {[...selectedCategories].map((c) => (
        <span
          key={`c-${c}`}
          className="px-3 h-9 rounded-full border text-sm capitalize bg-[#141414] text-white border-[#141414]"
        >
          {c}
        </span>
      ))}

      {selectedCategories.size === 0 && chipCategory !== "Tudo" && (
        <span className="px-3 h-9 rounded-full border text-sm capitalize bg-[#141414] text-white border-[#141414]">
          {chipCategory}
        </span>
      )}

      {[...selectedGenders].map((g) => (
        <span
          key={`g-${g}`}
          className="px-3 h-9 rounded-full border text-sm bg-[#141414] text-white border-[#141414]"
        >
          {g === "female" ? "Feminino" : "Masculino"}
        </span>
      ))}

      {[...selectedSizes].map((s) => (
        <span
          key={`s-${s}`}
          className="px-3 h-9 rounded-full border text-sm bg-[#141414] text-white border-[#141414]"
        >
          {s}
        </span>
      ))}

      <button
        type="button"
        onClick={clearFilters}
        className="px-3 h-9 rounded-full border text-sm bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
      >
        Limpar tudo
      </button>
    </div>
  ) : (
    <div className="mt-3 flex items-center justify-between">
      <div className="overflow-x-auto no-scrollbar -ml-1 pr-2">
        <div className="flex gap-2 pl-1">
          {/* Tudo */}
          {(() => {
            const c = "Tudo";
            const active = chipCategory === c;
            return (
              <button
                key="cat-Tudo"
                onClick={() => {
                  setChipCategory(c);
                  onBumpCategory(c, 0.8);
                }}
                className={`px-3 h-9 rounded-full border text-sm whitespace-nowrap transition ${
                  active
                    ? "text-white bg-[#141414] border-[#141414]"
                    : "surface border-warm text-gray-800 hover:opacity-95"
                }`}
              >
                {c}
              </button>
            );
          })()}

          {/* Gênero */}
          {[
            { id: "female" as const, label: "Feminino" },
            { id: "male" as const, label: "Masculino" },
          ].map((g) => {
            const active = selectedGenders.has(g.id);
            return (
              <button
                key={`gender-${g.id}`}
                onClick={() => onToggleGender(g.id)} // 👈 agora é clicável
                aria-pressed={active}
                className={`px-3 h-9 rounded-full border text-sm whitespace-nowrap transition ${
                  active
                    ? "text-white bg-[#141414] border-[#141414]"
                    : "surface border-warm text-gray-800 hover:opacity-95"
                }`}
              >
                {g.label}
              </button>
            );
          })}

          {/* Demais categorias */}
          {allCategories.map((c) => {
            const active = chipCategory === c;
            return (
              <button
                key={`cat-${c}`}
                onClick={() => {
                  setChipCategory(c);
                  onBumpCategory(c, 0.8);
                }}
                className={`px-3 h-9 rounded-full border text-sm whitespace-nowrap transition ${
                  active
                    ? "text-white bg-[#141414] border-[#141414]"
                    : "surface border-warm text-gray-800 hover:opacity-95"
                }`}
              >
                {c[0].toUpperCase() + c.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={openFilter}
        className="ml-2 inline-flex items-center gap-1 h-9 px-3 rounded-full border text-sm border-[#141414] text-[#141414] hover:bg-[#141414]/10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 6h18M7 12h10M10 18h4" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Filter
      </button>
    </div>
  );
}
