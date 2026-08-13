import type { ArtworkItem } from "@/data/artworks";

export const STORAGE_KEY = "fedsafe-review-selections";

export const sectionOrder = [
  "Hero Images",
  "Federal Roles",
  "Planning / Guidance",
  "Concern to Clarity",
  "Family / Legacy",
  "Workshops / Training",
  "Service & Honor",
  "Suno Music Concepts",
  "Alternate Concepts"
] as const;

export const mediaTypeLabels: Record<ArtworkItem["mediaType"], string> = {
  image: "Image",
  music: "Suno Music"
};

export function withBasePath(path: string) {
  if (!path || !path.startsWith("/")) {
    return path;
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}${path}`;
}

export function hasThumbnail(item: ArtworkItem) {
  return Boolean(item.thumbnail?.trim());
}

export function collectUniqueOptions(items: ArtworkItem[]) {
  return {
    sections: sectionOrder.filter((section) =>
      items.some((item) => item.section === section)
    ),
    appealTags: getUniqueSorted(items.flatMap((item) => item.appealTags)),
    relatabilityTags: getUniqueSorted(
      items.flatMap((item) => item.relatabilityTags)
    ),
    scenarioTags: getUniqueSorted(items.flatMap((item) => item.scenarioTags)),
    diversityTags: getUniqueSorted(items.flatMap((item) => item.diversityTags))
  };
}

export function getConceptNumber(id: string) {
  const [, numericId] = id.split("-");
  return numericId ?? id;
}

export function buildSearchIndex(item: ArtworkItem) {
  return [
    item.id,
    item.title,
    item.section,
    item.useCase,
    item.trackType ?? "",
    item.audioSrc ?? "",
    item.aspectRatio ?? "",
    item.whyPeopleRelate,
    item.prompt,
    ...item.appealTags,
    ...item.relatabilityTags,
    ...item.scenarioTags,
    ...item.diversityTags
  ]
    .join(" ")
    .toLowerCase();
}

export function sortBySourceOrder(ids: string[], items: ArtworkItem[]) {
  return [...ids].sort(
    (left, right) =>
      items.findIndex((item) => item.id === left) -
      items.findIndex((item) => item.id === right)
  );
}

export function serializeSelectionToCsv(items: ArtworkItem[]) {
  const headers = [
    "id",
    "title",
    "mediaType",
    "section",
    "useCase",
    "aspectRatio",
    "trackType",
    "audioSrc",
    "appealTags",
    "relatabilityTags",
    "scenarioTags",
    "diversityTags",
    "whyPeopleRelate",
    "prompt",
    "thumbnail"
  ];

  const rows = items.map((item) => [
    item.id,
    item.title,
    item.mediaType,
    item.section,
    item.useCase,
    item.aspectRatio ?? "",
    item.trackType ?? "",
    item.audioSrc ?? "",
    item.appealTags.join(" | "),
    item.relatabilityTags.join(" | "),
    item.scenarioTags.join(" | "),
    item.diversityTags.join(" | "),
    item.whyPeopleRelate,
    item.prompt,
    item.thumbnail ?? ""
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function getUniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function escapeCsvValue(value: string) {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}
