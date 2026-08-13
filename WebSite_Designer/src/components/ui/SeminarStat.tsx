export function SeminarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">{label}</p>
      <p className="mt-3 font-serif text-2xl leading-none text-white">{value}</p>
    </div>
  );
}
