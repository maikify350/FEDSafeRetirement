import { Tag } from "@/components/ui/Tag";

export function TagGroup({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag key={`${label}-${tag}`} tone="soft">
            {tag}
          </Tag>
        ))}
      </div>
    </div>
  );
}
