"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import type { ArtworkItem } from "@/data/artworks";
import {
  STORAGE_KEY,
  hasThumbnail,
  mediaTypeLabels,
  sortBySourceOrder,
  withBasePath
} from "@/lib/review-utils";

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

type PresentationBookProps = {
  artworks: ArtworkItem[];
};

const curatedPresentationIds = [
  "FS-001",
  "FS-009",
  "FS-015",
  "FS-016",
  "FS-020",
  "FS-021",
  "FS-022",
  "FS-023",
  "FS-024",
  "FS-025",
  "FS-026",
  "FS-027",
  "FS-028",
  "FS-019",
  "FS-003",
  "FS-005",
  "FS-006",
  "FS-017"
];

type PageProps = {
  children: ReactNode;
};

const BookPage = forwardRef<HTMLDivElement, PageProps>(function BookPage(
  { children },
  ref
) {
  return (
    <div ref={ref} className="h-full w-full overflow-hidden bg-transparent">
      {children}
    </div>
  );
});

export function PresentationBook({ artworks }: PresentationBookProps) {
  const bookRef = useRef<any>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [bookItems, setBookItems] = useState<ArtworkItem[]>([]);
  const [selectionMode, setSelectionMode] = useState<
    "shortlist" | "curated"
  >("curated");

  const soundtrackItem = useMemo(
    () => artworks.find((item) => item.id === "MU-003" && item.audioSrc) ?? null,
    [artworks]
  );
  const seminarCount = useMemo(
    () =>
      artworks.filter(
        (item) => item.mediaType === "image" && item.section === "Workshops / Training"
      ).length,
    [artworks]
  );
  const soundtrackCount = useMemo(
    () => artworks.filter((item) => item.mediaType === "music" && item.audioSrc).length,
    [artworks]
  );
  const coverItems = bookItems.slice(0, 3);
  const focusSections = [...new Set(bookItems.map((item) => item.section))].slice(0, 3);

  useEffect(() => {
    const fallbackItems = curatedPresentationIds
      .map((id) => artworks.find((item) => item.id === id))
      .filter(isPresentableImage);

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setBookItems(fallbackItems);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setBookItems(fallbackItems);
        return;
      }

      const validIds = sortBySourceOrder(
        parsed.filter((value): value is string =>
          artworks.some((item) => item.id === value)
        ),
        artworks
      );

      const selectedItems = validIds
        .map((id) => artworks.find((item) => item.id === id))
        .filter(isPresentableImage);

      if (selectedItems.length >= 1) {
        setBookItems(selectedItems);
        setSelectionMode("shortlist");
        return;
      }

      setBookItems(fallbackItems);
    } catch {
      setBookItems(fallbackItems);
    }
  }, [artworks]);

  const totalPages = bookItems.length + 3 + (soundtrackItem ? 1 : 0);
  const sourceLabel =
    selectionMode === "shortlist"
      ? "Built from your saved shortlist"
      : "Built from FedSafe curated highlights";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0f2235_0%,#132b43_52%,#0e1d2d_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.1rem] border border-white/10 bg-white/10 p-3">
              <Image
                src={withBasePath("/brand/fedsafe-logo.png")}
                alt="FedSafe Retirement"
                width={96}
                height={60}
                className="h-auto w-full"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">
                FedSafe Retirement
              </p>
              <h1 className="mt-2 font-serif text-4xl leading-none text-white">
                Client Presentation Book
              </h1>
              <p className="mt-2 text-sm leading-7 text-white/72">{sourceLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={withBasePath("/")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Back to gallery
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#caa45f] bg-[#caa45f] px-5 py-3 text-sm font-semibold text-[#102234] transition hover:bg-[#d5b06c]"
            >
              Print summary
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-[1.9rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex max-w-[1100px] flex-col items-center">
              {bookItems.length ? (
                <>
                  <HTMLFlipBook
                    key={`presentation-${selectionMode}-${bookItems.length}`}
                    ref={bookRef}
                    width={520}
                    height={700}
                    size="stretch"
                    minWidth={280}
                    maxWidth={620}
                    minHeight={420}
                    maxHeight={780}
                    style={{}}
                    showCover
                    mobileScrollSupport
                    flippingTime={900}
                    usePortrait
                    startZIndex={0}
                    autoSize
                    clickEventForward
                    useMouseEvents
                    swipeDistance={24}
                    showPageCorners
                    disableFlipByClick={false}
                    className="mx-auto !shadow-[0_40px_120px_rgba(0,0,0,0.42)]"
                    drawShadow
                    maxShadowOpacity={0.35}
                    startPage={0}
                    onFlip={(event: { data: number }) => setPageIndex(event.data)}
                  >
                    <BookPage>
                      <CoverSheet
                        items={coverItems}
                        seminarCount={seminarCount}
                        soundtrackCount={soundtrackCount}
                      />
                    </BookPage>

                    <BookPage>
                      <IntroSheet
                        count={bookItems.length}
                        selectionMode={selectionMode}
                        seminarCount={seminarCount}
                        soundtrackCount={soundtrackCount}
                        focusSections={focusSections}
                      />
                    </BookPage>

                    {bookItems.map((item) => (
                      <BookPage key={item.id}>
                        <ConceptSheet item={item} />
                      </BookPage>
                    ))}

                    {soundtrackItem ? (
                      <BookPage key={soundtrackItem.id}>
                        <SoundtrackSheet item={soundtrackItem} />
                      </BookPage>
                    ) : null}

                    <BookPage>
                      <ClosingSheet items={bookItems} />
                    </BookPage>
                  </HTMLFlipBook>

                  <div className="mt-5 text-sm font-medium tracking-[0.12em] text-white/65">
                    Page {pageIndex + 1} of {totalPages}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => bookRef.current?.pageFlip()?.flipNext()}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#caa45f] bg-[#caa45f] px-5 py-3 text-sm font-semibold text-[#102234] transition hover:bg-[#d5b06c]"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[520px] w-full items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/5 px-6 text-center text-white/72">
                  Preparing the presentation book...
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <InfoPanel
              title="Why This Works"
              body="This booklet turns the media kit into a client-facing experience. It feels curated, finite, and easy to review together on a call."
            />
            <InfoPanel
              title="Included Concepts"
              body={`${bookItems.length} image concepts are included here, with ${seminarCount} seminar-oriented scenes and multiple hero, consultation, and patriotic directions prioritized.`}
            />
            <InfoPanel
              title="Selection Flow"
              body="If you already picked items in the main gallery, this booklet can use that shortlist automatically. Otherwise it falls back to the strongest FedSafe highlights."
            />
            {soundtrackItem ? (
              <InfoPanel
                title="Soundtrack Support"
                body={`${soundtrackItem.id} is included as a soundtrack page so the media kit feels multi-format instead of image-only.`}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function CoverSheet({
  items,
  seminarCount,
  soundtrackCount
}: {
  items: ArtworkItem[];
  seminarCount: number;
  soundtrackCount: number;
}) {
  return (
    <div className="h-full bg-[linear-gradient(165deg,#0f2235_0%,#163554_48%,#102538_100%)] p-8 text-white">
      <div className="grid h-full gap-6 rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(202,164,95,0.26),transparent_30%)] p-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/72">
              FedSafe Retirement
            </div>
            <Image
              src={withBasePath("/brand/fedsafe-mark.png")}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 opacity-90"
            />
          </div>

          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#d3b06f]">
              Presentation Book
            </p>
            <h2 className="max-w-md font-serif text-5xl leading-none">
              A FedSafe concept deck that feels ready for the boardroom.
            </h2>
            <p className="max-w-lg text-base leading-8 text-white/78">
              Hero imagery, workshop scenes, consultation moments, patriotic storytelling,
              and soundtrack direction assembled into one client-ready narrative.
            </p>
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              <CoverStat label="Seminar Scenes" value={String(seminarCount)} />
              <CoverStat label="Soundtracks" value={String(soundtrackCount)} />
              <CoverStat label="Review Mode" value="Curated" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#caa45f] to-transparent" />
            <p className="text-sm uppercase tracking-[0.24em] text-white/58">
              Turn the page to begin
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-[1.35rem] border border-white/10 shadow-[0_18px_38px_rgba(7,18,29,0.34)] ${
                index === 0 ? "h-[11.5rem]" : "h-[9rem]"
              }`}
            >
              <FlipbookArtworkImage
                src={item.thumbnail!}
                alt={`${item.id} ${item.title}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/68">
                  {item.id}
                </p>
                <p className="mt-1 text-base font-semibold leading-tight text-white">
                  {item.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntroSheet({
  count,
  selectionMode,
  seminarCount,
  soundtrackCount,
  focusSections
}: {
  count: number;
  selectionMode: "shortlist" | "curated";
  seminarCount: number;
  soundtrackCount: number;
  focusSections: string[];
}) {
  return (
    <div className="h-full bg-[linear-gradient(180deg,#f8f5ef_0%,#f2ebdf_100%)] p-8 text-[#233142]">
      <div className="flex h-full flex-col rounded-[1.4rem] border border-[#d8c8ae] bg-white/75 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2b537c]">
          Overview
        </p>
        <h2 className="mt-4 font-serif text-4xl leading-tight">
          A curated FedSafe story, ready for review.
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          This flipbook is designed for presentation mode: fewer choices on screen,
          larger imagery, and enough context to make selection conversations easier.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <MetricCard label="Image Concepts" value={String(count)} />
          <MetricCard
            label="Book Source"
            value={selectionMode === "shortlist" ? "Saved shortlist" : "Curated highlights"}
          />
          <MetricCard label="Seminar Scenes" value={String(seminarCount)} />
          <MetricCard label="Attached Tracks" value={String(soundtrackCount)} />
        </div>

        <div className="mt-8 rounded-[1.25rem] border border-[#d8c8ae] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2b537c]">
            Focus Areas
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {focusSections.map((section) => (
              <PageTag key={section}>{section}</PageTag>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[1.25rem] border border-[#d8c8ae] bg-[#f8f5ef] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2b537c]">
            How to Use
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <li>Review the images page by page with the client.</li>
            <li>Call out concept IDs that feel strongest or most on-brand.</li>
            <li>Return to the main gallery for filters, exports, and soundtrack playback.</li>
          </ul>
        </div>

        <div className="mt-auto pt-6 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          FedSafe Retirement review booklet
        </div>
      </div>
    </div>
  );
}

function ConceptSheet({ item }: { item: ArtworkItem }) {
  return (
    <div className="h-full bg-[linear-gradient(180deg,#f6f2ea_0%,#efe5d7_100%)] p-6 text-[#233142]">
      <div className="flex h-full flex-col rounded-[1.3rem] border border-[#dcccb4] bg-white shadow-[0_14px_40px_rgba(35,49,66,0.08)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-[1.3rem] bg-[#ece4d7]">
          <FlipbookArtworkImage
            src={item.thumbnail!}
            alt={`${item.id} ${item.title}`}
            fit="contain"
          />
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PageTag>{item.id}</PageTag>
            <PageTag>{item.section}</PageTag>
            <PageTag>{mediaTypeLabels[item.mediaType]}</PageTag>
          </div>

          <h2 className="mt-4 font-serif text-3xl leading-tight">{item.title}</h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#2b537c]">
            {item.useCase}
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {item.whyPeopleRelate}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <MetaBlock label="Appeal">{item.appealTags.slice(0, 4).join(" • ")}</MetaBlock>
            <MetaBlock label="Audience">
              {item.relatabilityTags.slice(0, 4).join(" • ")}
            </MetaBlock>
          </div>

          <div className="mt-auto pt-5 text-xs uppercase tracking-[0.24em] text-slate-400">
            Prompt-led concept page
          </div>
        </div>
      </div>
    </div>
  );
}

function SoundtrackSheet({ item }: { item: ArtworkItem }) {
  return (
    <div className="h-full bg-[linear-gradient(180deg,#11263a_0%,#17324d_100%)] p-8 text-white">
      <div className="flex h-full flex-col rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(202,164,95,0.22),transparent_28%)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/64">
          Soundtrack Concept
        </p>
        <h2 className="mt-4 font-serif text-4xl leading-tight">
          {item.id} • {item.title}
        </h2>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#d3b06f]">
          {item.trackType}
        </p>

        <p className="mt-6 text-base leading-8 text-white/78">
          {item.whyPeopleRelate}
        </p>

        <div className="mt-8 rounded-[1.25rem] border border-white/12 bg-white/6 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">
            Prompt Direction
          </p>
          <p className="mt-4 text-sm leading-7 text-white/78">
            {truncateText(item.prompt, 310)}
          </p>
        </div>

        {item.audioSrc ? (
          <div className="mt-6 rounded-[1.25rem] border border-white/12 bg-white/6 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/60">
              Attached Review Track
            </p>
            <audio controls preload="none" className="mt-4 w-full">
              <source src={withBasePath(item.audioSrc)} type="audio/mpeg" />
            </audio>
          </div>
        ) : null}

        <div className="mt-auto pt-5 text-xs uppercase tracking-[0.24em] text-white/45">
          Multi-format media kit support
        </div>
      </div>
    </div>
  );
}

function ClosingSheet({ items }: { items: ArtworkItem[] }) {
  return (
    <div className="h-full bg-[linear-gradient(180deg,#f7f3eb_0%,#ede2d0_100%)] p-8 text-[#233142]">
      <div className="flex h-full flex-col rounded-[1.4rem] border border-[#dcccb4] bg-white/80 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2b537c]">
          Next Step
        </p>
        <h2 className="mt-4 font-serif text-4xl leading-tight">
          Capture the client’s final picks and move into production.
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          Use the main review gallery to save selections, export IDs, and finalize
          which concepts should advance into additional image, video, or soundtrack work.
        </p>

        <div className="mt-8 rounded-[1.25rem] border border-[#dcccb4] bg-[#f8f5ef] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2b537c]">
            Included IDs
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {items.map((item) => item.id).join(" • ")}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="Return to Gallery"
            body="Use filters, detail modals, and selection exports."
          />
          <ActionCard
            title="Create Final Shortlist"
            body="Capture the IDs the client wants to move forward with."
          />
        </div>

        <div className="mt-auto pt-5 text-right text-xs uppercase tracking-[0.24em] text-slate-400">
          FedSafe Retirement presentation close
        </div>
      </div>
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
        {title}
      </p>
      <p className="mt-3 text-sm leading-7 text-white/74">{body}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#dcccb4] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2b537c]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl leading-none text-[#233142]">{value}</p>
    </div>
  );
}

function CoverStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
        {label}
      </p>
      <p className="mt-3 font-serif text-2xl leading-none text-white">{value}</p>
    </div>
  );
}

function MetaBlock({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-[#e6d9c7] bg-[#fbf8f2] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2b537c]">
        {label}
      </p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{children}</p>
    </div>
  );
}

function PageTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#dcccb4] bg-[#f8f5ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b537c]">
      {children}
    </span>
  );
}

function ActionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[#dcccb4] bg-white p-4">
      <p className="font-semibold text-[#233142]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function isPresentableImage(item: ArtworkItem | undefined): item is ArtworkItem {
  return Boolean(item && item.mediaType === "image" && hasThumbnail(item));
}

function FlipbookArtworkImage({
  src,
  alt,
  fit = "cover"
}: {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
}) {
  return (
    <img
      src={withBasePath(src)}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
