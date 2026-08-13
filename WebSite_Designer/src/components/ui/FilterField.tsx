import type { ReactNode } from "react";

export function FilterField({ label, field }: { label: string; field: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-fed-navy">
      <span>{label}</span>
      {field}
    </label>
  );
}
