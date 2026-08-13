import Image from "next/image";
import type { ArtworkItem } from "@/data/artworks";
import { hasThumbnail, withBasePath } from "@/lib/review-utils";
import { Tag } from "@/components/ui/Tag";

const sectionGradients: Record<string, string> = {
  "Hero Images": "from-fed-blue via-fed-navy to-slate-900",
  "Federal Roles": "from-slate-700 via-fed-navy to-slate-950",
  "Planning / Guidance": "from-fed-blue via-sky-700 to-slate-900",
  "Concern to Clarity": "from-amber-700 via-fed-blue to-fed-navy",
  "Family / Legacy": "from-amber-600 via-fed-gold to-fed-navy",
  "Workshops / Training": "from-teal-700 via-fed-blue to-fed-navy",
  "Service & Honor": "from-fed-gold via-fed-navy to-slate-950",
  "Suno Music Concepts": "from-fed-navy via-indigo-900 to-slate-950",
  "Alternate Concepts": "from-rose-700 via-fed-blue to-fed-navy"
};

export function MediaPreview({ item, large = false }: { item: ArtworkItem; large?: boolean }) {
  if (hasThumbnail(item)) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden bg-fed-paper">
        <Image
          src={withBasePath(item.thumbnail!)}
          alt={`${item.id} ${item.title}`}
          fill
          sizes={large ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1536px) 100vw, 33vw"}
          className="object-cover"
        />
      </div>
    );
  }

  const gradient = sectionGradients[item.section] ?? "from-fed-blue via-fed-navy to-slate-950";

  return (
    <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(202,164,95,0.24),transparent_24%)]" />
      <div className="absolute -right-8 top-6 h-28 w-28 rounded-full border border-white/20 bg-white/10 blur-sm" />
      <div className="absolute bottom-6 left-6 right-6 z-10 space-y-3 text-white">
        <div className="flex flex-wrap gap-2">
          <Tag tone="inverse">{item.id}</Tag>
          <Tag tone="outline-light">
            {item.mediaType === "music"
              ? item.audioSrc
                ? "Playable soundtrack included"
                : "Audio concept"
              : "Awaiting generated image"}
          </Tag>
        </div>
        <h4 className="max-w-xl font-serif text-3xl leading-tight text-white">{item.title}</h4>
        <p className="max-w-2xl text-sm leading-6 text-white/82">
          {item.mediaType === "music"
            ? item.audioSrc
              ? `${item.trackType ?? "Instrumental Suno concept"} with attached MP3 review file`
              : item.trackType ?? "Instrumental Suno concept"
            : "Drop future generated files into public/artworks/generated/ and keep the data thumbnail path in sync."}
        </p>
      </div>
    </div>
  );
}
