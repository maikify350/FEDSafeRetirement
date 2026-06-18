export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-fed-blue/10 bg-white/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">{label}</p>
      <p className="mt-3 font-serif text-4xl leading-none text-fed-navy">{value}</p>
    </div>
  );
}
