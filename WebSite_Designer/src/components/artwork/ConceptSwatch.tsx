import type { ArtworkItem } from "@/data/artworks";
import { getConceptNumber } from "@/lib/review-utils";

export function ConceptSwatch({ item }: { item: ArtworkItem }) {
  const conceptNumber = getConceptNumber(item.id);
  const prefix = item.id.startsWith("MU-") ? "MU" : "FS";

  return (
    <div className="flex h-[4.6rem] w-[4.6rem] flex-col items-center justify-center rounded-full border border-white/20 bg-fed-navy/90 text-white shadow-[0_10px_24px_rgba(15,34,53,0.34)] backdrop-blur-sm">
      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
        {prefix}
      </span>
      <span className="font-serif text-3xl leading-none text-white">
        {String(Number(conceptNumber))}
      </span>
    </div>
  );
}
