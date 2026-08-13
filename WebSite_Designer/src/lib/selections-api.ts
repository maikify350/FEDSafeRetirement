import { supabase } from "./supabase";

const SELECTION_ROW_ID = "shared";

export async function loadRemoteSelections(): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("artwork_selections")
      .select("artwork_ids")
      .eq("id", SELECTION_ROW_ID)
      .single();
    if (error || !data) return [];
    return (data.artwork_ids as string[]) ?? [];
  } catch {
    return [];
  }
}

export async function saveRemoteSelections(ids: string[]): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("artwork_selections").upsert({
      id: SELECTION_ROW_ID,
      artwork_ids: ids,
      updated_at: new Date().toISOString()
    });
  } catch {
    // localStorage is the offline fallback — silent fail is fine
  }
}

export function subscribeToSelections(
  callback: (ids: string[]) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("artwork_selections_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "artwork_selections",
        filter: `id=eq.${SELECTION_ROW_ID}`
      },
      (payload) => {
        const ids = (payload.new as { artwork_ids: string[] }).artwork_ids ?? [];
        callback(ids);
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}
