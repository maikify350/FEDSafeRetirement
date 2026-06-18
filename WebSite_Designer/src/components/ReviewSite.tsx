"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useState } from "react";

import type { ArtworkItem } from "@/data/artworks";
import {
  buildSearchIndex,
  collectUniqueOptions,
  hasThumbnail,
  mediaTypeLabels,
  sectionOrder,
  serializeSelectionToCsv,
  withBasePath
} from "@/lib/review-utils";
import { useSelections } from "@/hooks/useSelections";

import { Tag } from "@/components/ui/Tag";
import { ActionButton } from "@/components/ui/ActionButton";
import { FilterField } from "@/components/ui/FilterField";
import { StatCard } from "@/components/ui/StatCard";
import { SeminarStat } from "@/components/ui/SeminarStat";
import { WorkflowStep } from "@/components/ui/WorkflowStep";
import {
  inputClasses,
  primaryButtonClasses,
  secondaryButtonClasses
} from "@/components/ui/styles";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { DetailModal } from "@/components/artwork/DetailModal";
import { MediaPreview } from "@/components/artwork/MediaPreview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Filters = {
  section: string;
  mediaType: string;
  appeal: string;
  relatability: string;
  scenario: string;
  diversity: string;
  search: string;
};

const defaultFilters: Filters = {
  section: "all",
  mediaType: "image",
  appeal: "all",
  relatability: "all",
  scenario: "all",
  diversity: "all",
  search: ""
};

const sectionDescriptions: Record<string, string> = {
  "Hero Images":
    "Big first-impression concepts for the homepage and top-of-funnel storytelling.",
  "Federal Roles":
    "Occupation-specific concepts tailored to the federal audience FedSafe serves every day.",
  "Planning / Guidance":
    "Clear, consultative visuals that reinforce trust, education, and confident decision-making.",
  "Concern to Clarity":
    "Emotionally grounded concepts that move from uncertainty into relief and control.",
  "Family / Legacy":
    "Warmer concepts built around purpose, peace of mind, family, and life after retirement.",
  "Workshops / Training":
    "Seminar, lunch-and-learn, and group education concepts for outreach and agency presentations.",
  "Service & Honor":
    "Respectful patriotic storytelling that honors service without feeling political or heavy-handed.",
  "Suno Music Concepts":
    "Short-video soundtrack directions that complement the visual concepts and campaign tone.",
  "Alternate Concepts":
    "Latest alternate directions added after client review, grouped at the end for easy side-by-side comparison without disturbing the core curated set."
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewSite({ artworks }: { artworks: ArtworkItem[] }) {
  const options = collectUniqueOptions(artworks);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeItem, setActiveItem] = useState<ArtworkItem | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const { selectedIds, isSyncing, toggle, clear } = useSelections(artworks);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const selectedSet = new Set(selectedIds);
  const selectedItems = artworks.filter((item) => selectedSet.has(item.id));
  const imageCount = artworks.filter((item) => item.mediaType === "image").length;
  const soundtrackCount = artworks.filter((item) => Boolean(item.audioSrc)).length;
  const workshopItems = artworks.filter(
    (item) => item.mediaType === "image" && item.section === "Workshops / Training"
  );

  const partnerSeminarShowcaseItems = ["FS-064", "FS-073", "FS-094", "FS-091"]
    .map((id) => artworks.find((item) => item.id === id && hasThumbnail(item)))
    .filter((item): item is ArtworkItem => Boolean(item));

  const showcaseItems = ["FS-015", "FS-020", "FS-026", "FS-028"]
    .map((id) => artworks.find((item) => item.id === id && hasThumbnail(item)))
    .filter((item): item is ArtworkItem => Boolean(item));

  const featuredTrack = artworks.find((item) => Boolean(item.audioSrc)) ?? null;

  const filteredItems = artworks.filter((item) => {
    if (filters.section !== "all" && item.section !== filters.section) return false;
    if (filters.mediaType !== "all" && item.mediaType !== filters.mediaType) return false;
    if (filters.appeal !== "all" && !item.appealTags.includes(filters.appeal)) return false;
    if (filters.relatability !== "all" && !item.relatabilityTags.includes(filters.relatability))
      return false;
    if (filters.scenario !== "all" && !item.scenarioTags.includes(filters.scenario)) return false;
    if (filters.diversity !== "all" && !item.diversityTags.includes(filters.diversity))
      return false;
    const q = filters.search.trim().toLowerCase();
    if (q && !buildSearchIndex(item).includes(q)) return false;
    return true;
  });

  const isMusicTab = filters.mediaType === "music";
  const isImageTab = !isMusicTab;

  const groupedItems = sectionOrder
    .map((section) => ({
      section,
      items: filteredItems.filter((item) => item.section === section)
    }))
    .filter((group) => group.items.length > 0);

  const visibleSections = groupedItems.map((g) => g.section);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const onFilterChange =
    (key: keyof Filters) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((current) => ({ ...current, [key]: event.target.value }));
    };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2200);
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement("textarea");
        el.value = value;
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      showToast(successMessage);
    } catch {
      showToast("Copy failed. Please try again.");
    }
  };

  const handleToggle = (id: string) => {
    const wasSelected = selectedSet.has(id);
    toggle(id);
    const item = artworks.find((a) => a.id === id);
    if (item) {
      showToast(
        wasSelected ? `${item.id} removed from review list` : `${item.id} added to review list`
      );
    }
  };

  const exportSelection = (format: "json" | "csv") => {
    if (!selectedItems.length) {
      showToast("Select at least one concept to export");
      return;
    }
    const contents =
      format === "json"
        ? JSON.stringify(selectedItems, null, 2)
        : serializeSelectionToCsv(selectedItems);
    const blob = new Blob([contents], {
      type: format === "json" ? "application/json" : "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      format === "json" ? "fedsafe-selected-artworks.json" : "fedsafe-selected-artworks.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(format === "json" ? "Exported as JSON" : "Exported as CSV");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen" suppressHydrationWarning>
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ------------------------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------------------------ */}
        <header className="panel-sheen relative overflow-hidden rounded-[2rem] border border-white/70 shadow-panel">
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-fed-gold/12" />
          <div className="absolute left-[-6rem] top-[-7rem] h-56 w-56 rounded-full bg-fed-sky/50 blur-3xl" />
          <div className="absolute right-[-4rem] top-[-3rem] h-48 w-48 rounded-full bg-fed-gold/20 blur-3xl" />
          <div className="relative grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:px-10 lg:py-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-fed-blue/10 bg-white/80 p-3 shadow-card">
                  <Image
                    src={withBasePath("/brand/fedsafe-logo.png")}
                    alt="FedSafe Retirement"
                    width={96}
                    height={60}
                    className="h-auto w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-3 rounded-full border border-fed-gold/30 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                    <Image
                      src={withBasePath("/brand/fedsafe-seal.png")}
                      alt=""
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px] rounded-full object-cover opacity-90"
                    />
                    FedSafe Retirement
                    <span className="h-1.5 w-1.5 rounded-full bg-fed-gold" />
                    Artwork Review Microsite
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    Built from the supplied prompt catalog — selections sync across all users in
                    real time.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl font-serif text-4xl leading-none text-balance sm:text-5xl lg:text-6xl">
                  Review artwork concepts, compare prompt directions, and shape a stunning FedSafe
                  presentation shortlist.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                  Every concept on this page is prompt-led, client-ready, and organized for fast
                  decision-making across imagery, story direction, and soundtrack support for short
                  videos.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#gallery" className={primaryButtonClasses}>
                  Browse concept gallery
                </a>
                <a href={withBasePath("/presentation/")} className={secondaryButtonClasses}>
                  Open presentation book
                </a>
                <a href="#selected-items" className={secondaryButtonClasses}>
                  Jump to shortlist
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <StatCard label="Total Concepts" value={String(artworks.length)} />
                <StatCard label="Image Concepts" value={String(imageCount)} />
                <StatCard label="Seminar Scenes" value={String(workshopItems.length)} />
                <StatCard label="Attached Tracks" value={String(soundtrackCount)} />
              </div>
            </div>

            {/* Spotlight panel */}
            <section className="relative overflow-hidden rounded-[1.8rem] bg-fed-navy p-6 text-white shadow-panel">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(202,164,95,0.28),transparent_32%)]" />
              <div className="absolute bottom-4 right-4 opacity-[0.12]">
                <Image
                  src={withBasePath("/brand/fedsafe-mark.png")}
                  alt=""
                  width={120}
                  height={120}
                  className="h-auto w-[120px]"
                />
              </div>
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                      Presentation Spotlight
                    </p>
                    <h2 className="mt-3 font-serif text-3xl leading-tight text-white">
                      Prompt-led concepts, polished for client review
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                    FedSafe curation
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {showcaseItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveItem(item)}
                      className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/8 text-left transition hover:-translate-y-1 hover:bg-white/12"
                    >
                      <div className="relative aspect-[16/10]">
                        <Image
                          src={withBasePath(item.thumbnail!)}
                          alt={`${item.id} ${item.title}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 20vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="space-y-2 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                          {item.id}
                        </p>
                        <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      </div>
                    </button>
                  ))}
                </div>

                {isMusicTab && featuredTrack ? (
                  <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                          Featured Track
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {featuredTrack.id} • {featuredTrack.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveItem(featuredTrack)}
                        className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        Open details
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/78">
                      {featuredTrack.trackType}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 space-y-4 rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                    Review Workflow
                  </p>
                  <WorkflowStep
                    number="01"
                    title="Filter the concept set"
                    description="Narrow by section, audience, emotional appeal, scenario, or diversity tags."
                    inverse
                  />
                  <WorkflowStep
                    number="02"
                    title="Open details and prompts"
                    description="Use the modal for the full brief, larger preview, and copy-ready generation prompt."
                    inverse
                  />
                  <WorkflowStep
                    number="03"
                    title="Select for review"
                    description="Selections sync instantly across all reviewers — no sharing required."
                    inverse
                  />
                </div>
              </div>
            </section>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Tab switcher */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-6 panel-sheen rounded-[1.75rem] border border-white/75 p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                Review Tabs
              </p>
              <h2 className="mt-2 font-serif text-3xl">Keep photos and soundtracks separate</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Use the photo tab for uninterrupted image review, or switch to the soundtrack tab
                when you want to focus only on audio concepts.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-fed-blue/15 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({ ...f, mediaType: "image", section: "all" }))
                }
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isImageTab ? "bg-fed-blue text-white shadow-sm" : "text-fed-blue hover:bg-fed-sky/35"
                }`}
              >
                Photos
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((f) => ({ ...f, mediaType: "music", section: "all" }))
                }
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isMusicTab ? "bg-fed-blue text-white shadow-sm" : "text-fed-blue hover:bg-fed-sky/35"
                }`}
              >
                Soundtracks
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Section nav */}
        {/* ------------------------------------------------------------------ */}
        <section className="mt-6 panel-sheen rounded-[1.75rem] border border-white/75 p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                Prompt-Led Navigation
              </p>
              <h2 className="mt-2 font-serif text-3xl">
                {isImageTab
                  ? "Jump through the photo gallery fast"
                  : "Jump through the soundtrack set fast"}
              </h2>
            </div>
            <div className="rounded-full border border-fed-gold/30 bg-fed-cream px-4 py-2 text-sm font-semibold text-fed-blue">
              Exact prompt source preserved per concept
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {visibleSections.map((section) => (
              <a
                key={section}
                href={`#${sectionAnchor(section)}`}
                className="rounded-full border border-fed-blue/12 bg-white px-4 py-2 text-sm font-semibold text-fed-blue transition hover:border-fed-blue/30 hover:bg-fed-sky/35"
              >
                {section}
              </a>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Partner seminar spotlight */}
        {/* ------------------------------------------------------------------ */}
        {isImageTab ? (
          <section className="mt-6 overflow-hidden rounded-[1.85rem] border border-fed-blue/10 bg-fed-navy text-white shadow-panel">
            <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8 lg:py-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(202,164,95,0.24),transparent_26%)]" />
              <div className="relative space-y-5">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/72">
                  <Image
                    src={withBasePath("/brand/fedsafe-seal.png")}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover opacity-90"
                  />
                  Partner Seminar Spotlight
                </div>
                <div>
                  <h2 className="max-w-xl font-serif text-4xl leading-tight text-white">
                    The partner seminar set now reads as a usable presentation series.
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-8 text-white/78">
                    The spotlight now favors the strongest existing partner seminar scenes for Ben,
                    Brian, Daniel, and Mike, with more believable branding placement and enough
                    visual variety for seminar, breakout, and event-marketing review.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SeminarStat label="Partner Finals" value={String(partnerSeminarShowcaseItems.length)} />
                  <SeminarStat label="Top-of-Funnel Use" value="Seminars + events" />
                  <SeminarStat label="Best Fit" value="Partner-led education" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href="#alternate-concepts" className={primaryButtonClasses}>
                    Jump to partner finals
                  </a>
                  <a
                    href={withBasePath("/presentation/")}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Open client booklet
                  </a>
                </div>
              </div>

              <div className="relative grid gap-3 sm:grid-cols-2">
                {partnerSeminarShowcaseItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItem(item)}
                    className="group relative overflow-hidden rounded-[1.4rem] border border-white/10 text-left shadow-[0_16px_40px_rgba(6,18,30,0.28)] transition hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/11]">
                      <Image
                        src={withBasePath(item.thumbnail!)}
                        alt={`${item.id} ${item.title}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 26vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/10 to-transparent" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                        {item.id}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-tight text-white">
                        {item.title}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------------ */}
        {/* Gallery + sidebar */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Gallery */}
          <div className="space-y-8">
            {/* Filters */}
            <section
              id="gallery"
              className="panel-sheen rounded-[1.75rem] border border-white/80 p-5 shadow-card sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                    Filters
                  </p>
                  <h2 className="mt-2 font-serif text-3xl">Find the strongest concepts faster</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    Search by concept ID, title, prompt language, audience cues, or emotional
                    direction without losing the original handoff structure.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilters(defaultFilters)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-fed-blue/20 bg-white px-5 text-sm font-semibold text-fed-blue transition hover:border-fed-blue/40 hover:bg-fed-sky/40"
                >
                  Clear filters
                </button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FilterField
                  label="Search"
                  field={
                    <input
                      type="search"
                      value={filters.search}
                      onChange={onFilterChange("search")}
                      placeholder="Search by ID, title, keyword, or prompt"
                      className={inputClasses}
                    />
                  }
                />
                <FilterField
                  label="Section"
                  field={
                    <select value={filters.section} onChange={onFilterChange("section")} className={inputClasses}>
                      <option value="all">All sections</option>
                      {options.sections.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  }
                />
                <FilterField
                  label="Media Type"
                  field={
                    <select value={filters.mediaType} onChange={onFilterChange("mediaType")} className={inputClasses}>
                      <option value="all">All media</option>
                      <option value="image">Image</option>
                      <option value="music">Suno Music</option>
                    </select>
                  }
                />
                <FilterField
                  label="Appeal / Emotion"
                  field={
                    <select value={filters.appeal} onChange={onFilterChange("appeal")} className={inputClasses}>
                      <option value="all">All appeal tags</option>
                      {options.appealTags.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  }
                />
                <FilterField
                  label="Audience / Relatability"
                  field={
                    <select value={filters.relatability} onChange={onFilterChange("relatability")} className={inputClasses}>
                      <option value="all">All audience tags</option>
                      {options.relatabilityTags.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  }
                />
                <FilterField
                  label="Scenario"
                  field={
                    <select value={filters.scenario} onChange={onFilterChange("scenario")} className={inputClasses}>
                      <option value="all">All scenarios</option>
                      {options.scenarioTags.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  }
                />
                <FilterField
                  label="Diversity"
                  field={
                    <select value={filters.diversity} onChange={onFilterChange("diversity")} className={inputClasses}>
                      <option value="all">All diversity tags</option>
                      {options.diversityTags.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  }
                />
                <FilterField
                  label="Results"
                  field={
                    <div className="flex h-12 items-center rounded-2xl border border-fed-blue/12 bg-fed-sky/35 px-4 text-sm font-medium text-fed-blue">
                      {filteredItems.length} concept{filteredItems.length === 1 ? "" : "s"} matching
                    </div>
                  }
                />
              </div>
            </section>

            {/* Grouped gallery */}
            {groupedItems.length ? (
              groupedItems.map((group) => (
                <section
                  key={group.section}
                  id={sectionAnchor(group.section)}
                  className="space-y-4"
                >
                  <div className="panel-sheen rounded-[1.6rem] border border-white/75 p-5 shadow-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                          Section
                        </p>
                        <h2 className="mt-1 font-serif text-3xl">{group.section}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                          {sectionDescriptions[group.section]}
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-fed-blue/12 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600">
                        {group.items.length} concept{group.items.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    {group.items.map((item) => (
                      <ArtworkCard
                        key={item.id}
                        item={item}
                        isSelected={selectedSet.has(item.id)}
                        onOpen={() => setActiveItem(item)}
                        onCopyPrompt={() => copyText(item.prompt, `${item.id} prompt copied`)}
                        onToggleSelection={() => handleToggle(item.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section className="panel-sheen rounded-[1.75rem] border border-white/75 p-8 text-center shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                  No Matches
                </p>
                <h2 className="mt-3 font-serif text-3xl">
                  No concepts match the current filters
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Try broadening the search term or clearing one or two filters to bring more
                  concepts back into view.
                </p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside id="selected-items" className="xl:sticky xl:top-6 xl:self-start">
            <section className="panel-sheen rounded-[1.75rem] border border-fed-blue/10 p-6 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                    Selected For Review
                  </p>
                  <h2 className="mt-2 font-serif text-3xl">
                    {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                  isSyncing
                    ? "border-amber-300/40 bg-amber-50 text-amber-700"
                    : "border-fed-gold/30 bg-fed-cream text-fed-blue"
                }`}>
                  {isSyncing ? "Saving…" : "Synced"}
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <a href={withBasePath("/presentation/")} className={primaryButtonClasses}>
                  Open presentation book
                </a>
                <ActionButton
                  label="Copy selected IDs"
                  onClick={() => copyText(selectedIds.join("\n"), "Selected concept IDs copied")}
                  disabled={!selectedItems.length}
                />
                <ActionButton
                  label="Export selected as JSON"
                  onClick={() => exportSelection("json")}
                  disabled={!selectedItems.length}
                />
                <ActionButton
                  label="Export selected as CSV"
                  onClick={() => exportSelection("csv")}
                  disabled={!selectedItems.length}
                />
                <ActionButton
                  label="Clear all selections"
                  onClick={() => { clear(); showToast("Selection list cleared"); }}
                  disabled={!selectedItems.length}
                  tone="secondary"
                />
              </div>

              <div className="mt-6 space-y-3">
                {selectedItems.length ? (
                  <div className="rounded-[1.4rem] border border-fed-gold/20 bg-fed-cream/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fed-blue">
                      Presentation note
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      Your saved shortlist will feed the booklet automatically once you have four
                      or more picks, so client conversations can move from gallery view into a
                      cleaner presentation flow.
                    </p>
                  </div>
                ) : null}

                {selectedItems.length ? (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-fed-blue/12 bg-white/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fed-blue">
                            {item.id}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-fed-navy">
                            {item.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(item.id)}
                          className="rounded-full border border-fed-blue/15 px-3 py-1 text-xs font-semibold text-fed-blue transition hover:border-fed-blue/30 hover:bg-fed-sky/40"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Tag tone="soft">{mediaTypeLabels[item.mediaType]}</Tag>
                        <Tag tone="soft">{item.section}</Tag>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveItem(item)}
                        className="mt-4 text-sm font-semibold text-fed-blue transition hover:text-fed-navy"
                      >
                        View details
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-fed-blue/20 bg-white/65 p-5 text-sm leading-7 text-slate-600">
                    No concepts selected yet. Use{" "}
                    <span className="font-semibold text-fed-navy">Select for Review</span> on any
                    card to start building the shortlist.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Footer */}
        {/* ------------------------------------------------------------------ */}
        <footer className="mt-10 overflow-hidden rounded-[1.75rem] border border-fed-blue/10 bg-fed-navy text-white shadow-panel">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(202,164,95,0.24),transparent_26%)]" />
            <div className="relative flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-white/10 bg-white/10 p-2">
                  <Image
                    src={withBasePath("/brand/fedsafe-mark.png")}
                    alt="FedSafe Retirement mark"
                    width={56}
                    height={56}
                    className="h-auto w-full"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                    FedSafe Retirement
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-white">
                    Client review gallery for artwork and soundtrack direction
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                  <Image
                    src={withBasePath("/brand/fedsafe-seal.png")}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full object-cover opacity-90"
                  />
                  Prompt catalog preserved
                </div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                  <Image
                    src={withBasePath("/brand/fedsafe-seal.png")}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full object-cover opacity-90"
                  />
                  Shared shortlist · real-time sync
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Detail modal */}
      {activeItem ? (
        <DetailModal
          item={activeItem}
          isSelected={selectedSet.has(activeItem.id)}
          onClose={() => setActiveItem(null)}
          onCopyPrompt={() => copyText(activeItem.prompt, `${activeItem.id} prompt copied`)}
          onToggleSelection={() => handleToggle(activeItem.id)}
        />
      ) : null}

      {/* Toast */}
      {toastMessage ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-fed-blue/20 bg-fed-navy px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionAnchor(section: string) {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
