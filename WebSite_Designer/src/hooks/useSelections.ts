"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtworkItem } from "@/data/artworks";
import { STORAGE_KEY, sortBySourceOrder } from "@/lib/review-utils";
import {
  loadRemoteSelections,
  saveRemoteSelections,
  subscribeToSelections
} from "@/lib/selections-api";

const SAVE_DEBOUNCE_MS = 800;

function normalizeIds(ids: string[], artworks: ArtworkItem[]): string[] {
  return sortBySourceOrder(
    [...new Set(ids)].filter((id) => artworks.some((a) => a.id === id)),
    artworks
  );
}

export function useSelections(artworks: ArtworkItem[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Initial load: merge Supabase (primary) + localStorage (offline fallback)
  useEffect(() => {
    async function load() {
      try {
        const localRaw = window.localStorage.getItem(STORAGE_KEY);
        const localIds: string[] = localRaw ? JSON.parse(localRaw) : [];
        const remoteIds = await loadRemoteSelections();
        // Remote wins, then merge any local-only items
        const merged = remoteIds.length > 0
          ? normalizeIds([...remoteIds, ...localIds], artworks)
          : normalizeIds(localIds, artworks);
        setSelectedIds(merged);
      } catch {
        setSelectedIds([]);
      } finally {
        setHasLoaded(true);
      }
    }
    load();
  }, []); // artworks is static — safe to omit

  // Real-time: update when another user changes selections
  useEffect(() => {
    if (!hasLoaded) return;
    const unsubscribe = subscribeToSelections((remoteIds) => {
      isRemoteUpdate.current = true;
      setSelectedIds(normalizeIds(remoteIds, artworks));
    });
    return unsubscribe;
  }, [hasLoaded]); // artworks is static — safe to omit

  // Persist to localStorage + Supabase (debounced) whenever selections change
  useEffect(() => {
    if (!hasLoaded) return;

    // Skip saving when the change came FROM the server
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSyncing(true);
    saveTimer.current = setTimeout(async () => {
      await saveRemoteSelections(selectedIds);
      setIsSyncing(false);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hasLoaded, selectedIds]);

  const toggle = useCallback(
    (id: string) => {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : sortBySourceOrder([...current, id], artworks)
      );
    },
    [artworks]
  );

  const clear = useCallback(() => setSelectedIds([]), []);

  return { selectedIds, hasLoaded, isSyncing, toggle, clear };
}
