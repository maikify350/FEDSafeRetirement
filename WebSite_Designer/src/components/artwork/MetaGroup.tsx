import { Tag } from "@/components/ui/Tag";

export function MetaGroup({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="rounded-[1.35rem] border border-fed-blue/10 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag key={`${label}-${tag}`} tone="soft">
            {tag}
          </Tag>
        ))}
      </div>
    </div>
  );
}
