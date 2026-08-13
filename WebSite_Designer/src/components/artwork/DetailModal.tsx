"use client";

import { useEffect } from "react";
import type { ArtworkItem } from "@/data/artworks";
import { mediaTypeLabels } from "@/lib/review-utils";
import { Tag } from "@/components/ui/Tag";
import { primaryButtonClasses, secondaryButtonClasses } from "@/components/ui/styles";
import { MediaPreview } from "./MediaPreview";
import { AudioPlayer } from "./AudioPlayer";
import { MetaCard } from "./MetaCard";
import { MetaGroup } from "./MetaGroup";

export function DetailModal({
  item,
  isSelected,
  onClose,
  onCopyPrompt,
  onToggleSelection
}: {
  item: ArtworkItem;
  isSelected: boolean;
  onClose: () => void;
  onCopyPrompt: () => void;
  onToggleSelection: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/65 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="panel-sheen max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-white/80 shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`detail-title-${item.id}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-fed-blue/10 px-6 py-5 sm:px-8">
          <div>
            <div className="flex flex-wrap gap-2">
              <Tag tone="inverse">{item.id}</Tag>
              <Tag tone={item.mediaType === "image" ? "gold" : "blue"}>
                {mediaTypeLabels[item.mediaType]}
              </Tag>
              <Tag tone="soft">{item.section}</Tag>
            </div>
            <h2
              id={`detail-title-${item.id}`}
              className="mt-4 font-serif text-4xl leading-tight"
            >
              {item.title}
            </h2>
            <p className="mt-2 text-base text-slate-600">{item.useCase}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-fed-blue/15 bg-white px-4 py-2 text-sm font-semibold text-fed-blue transition hover:border-fed-blue/30 hover:bg-fed-sky/40"
          >
            Close
          </button>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[1.75rem] border border-fed-blue/10 bg-white">
              <MediaPreview item={item} large />
            </div>
            {item.audioSrc ? <AudioPlayer src={item.audioSrc} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <MetaCard label="Media Type" value={mediaTypeLabels[item.mediaType]} />
              <MetaCard label="Section" value={item.section} />
              {item.aspectRatio ? (
                <MetaCard label="Aspect Ratio" value={item.aspectRatio} />
              ) : null}
              {item.trackType ? (
                <MetaCard label="Track Type" value={item.trackType} />
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                Why People Relate
              </p>
              <p className="mt-3 text-base leading-8 text-slate-700">{item.whyPeopleRelate}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetaGroup label="Appeal / Emotion" tags={item.appealTags} />
              <MetaGroup label="Audience / Relatability" tags={item.relatabilityTags} />
              <MetaGroup label="Scenario" tags={item.scenarioTags} />
              {item.diversityTags.length ? (
                <MetaGroup label="Diversity" tags={item.diversityTags} />
              ) : (
                <MetaCard label="Diversity" value="Not specified for this concept" />
              )}
            </div>

            <div className="rounded-[1.5rem] border border-fed-blue/10 bg-white/85 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                  Full Prompt
                </p>
                <button type="button" onClick={onCopyPrompt} className={secondaryButtonClasses}>
                  Copy prompt
                </button>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                {item.prompt}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={onToggleSelection} className={primaryButtonClasses}>
                {isSelected ? "Selected for Review" : "Select for Review"}
              </button>
              <button type="button" onClick={onClose} className={secondaryButtonClasses}>
                Back to gallery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
