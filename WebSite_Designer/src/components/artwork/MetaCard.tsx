export function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-fed-blue/10 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">{label}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
}
