import type { ReactNode } from "react";

export type TagTone = "soft" | "gold" | "blue" | "inverse" | "outline-light";

const toneClasses: Record<TagTone, string> = {
  soft: "border-fed-blue/12 bg-fed-sky/45 text-fed-navy",
  gold: "border-fed-gold/30 bg-fed-cream text-fed-navy",
  blue: "border-fed-blue/20 bg-fed-blue text-white",
  inverse: "border-white/20 bg-white/12 text-white",
  "outline-light": "border-white/25 bg-white/6 text-white/90"
};

export function Tag({ children, tone }: { children: ReactNode; tone: TagTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
