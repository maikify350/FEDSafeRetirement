"use client";

import type { ArtworkItem } from "@/data/artworks";
import { getConceptNumber, mediaTypeLabels } from "@/lib/review-utils";
import { Tag } from "@/components/ui/Tag";
import { primaryButtonClasses, secondaryButtonClasses } from "@/components/ui/styles";
import { MediaPreview } from "./MediaPreview";
import { AudioPlayer } from "./AudioPlayer";
import { ConceptSwatch } from "./ConceptSwatch";
import { TagGroup } from "./TagGroup";

export function ArtworkCard({
  item,
  isSelected,
  onOpen,
  onCopyPrompt,
  onToggleSelection
}: {
  item: ArtworkItem;
  isSelected: boolean;
  onOpen: () => void;
  onCopyPrompt: () => void;
  onToggleSelection: () => void;
}) {
  return (
    <article className="panel-sheen flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-white/80 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-panel">
      <div className="relative">
        <MediaPreview item={item} />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Tag tone="inverse">Concept {getConceptNumber(item.id)}</Tag>
          <Tag tone={item.mediaType === "image" ? "gold" : "blue"}>
            {mediaTypeLabels[item.mediaType]}
          </Tag>
        </div>
        <div className="absolute bottom-4 right-4">
          <ConceptSwatch item={item} />
        </div>
        {isSelected ? (
          <div className="absolute right-4 top-4 rounded-full bg-fed-navy px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Selected
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fed-blue">
          <span>{item.id}</span>
          <span className="h-1 w-1 rounded-full bg-fed-gold" />
          <span>{item.section}</span>
        </div>

        <h3 className="mt-3 font-serif text-3xl leading-tight">{item.title}</h3>
        <p className="mt-3 text-sm font-semibold text-fed-blue">{item.useCase}</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{item.whyPeopleRelate}</p>

        <div className="mt-5 space-y-3">
          <TagGroup label="Appeal" tags={item.appealTags} />
          <TagGroup label="Audience" tags={item.relatabilityTags} />
          <TagGroup label="Scenario" tags={item.scenarioTags} />
          {item.diversityTags.length ? (
            <TagGroup label="Diversity" tags={item.diversityTags} />
          ) : null}
        </div>

        {item.audioSrc ? <AudioPlayer src={item.audioSrc} compact /> : null}

        <details className="mt-5 rounded-2xl border border-fed-blue/10 bg-white/80 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-fed-blue">
            Show full prompt
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
            {item.prompt}
          </p>
        </details>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onCopyPrompt} className={secondaryButtonClasses}>
            Copy prompt
          </button>
          <button type="button" onClick={onOpen} className={secondaryButtonClasses}>
            View details
          </button>
          <button
            type="button"
            onClick={onToggleSelection}
            className={`${primaryButtonClasses} sm:col-span-2`}
          >
            {isSelected ? "Selected for Review" : "Select for Review"}
          </button>
        </div>
      </div>
    </article>
  );
}
