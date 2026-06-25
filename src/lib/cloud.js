import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Drop-in replacement for useState that persists an entire "section" of the app
 * (an array or object) to the Supabase `app_state` table as JSON, and loads it
 * on mount. Shared across everyone using the same project, so the whole team
 * sees one live copy. Writes are debounced so inline typing isn't chatty.
 *
 * Usage:  const [teams, setTeams] = useCloudSection("teams", SEED_TEAMS);
 * If Supabase isn't configured, it behaves exactly like useState(seed).
 */
export function useCloudSection(section, seed) {
  const [data, setData] = useState(seed);
  const timer = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase
      .from("app_state")
      .select("data")
      .eq("cycle", "current")
      .eq("section", section)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (!alive || error || !row) return;
        if (row.data != null) setData(row.data);
      });
    return () => { alive = false; };
  }, [section]);

  const persist = (next) => {
    if (!supabase) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      supabase
        .from("app_state")
        .upsert({ cycle: "current", section, data: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error("Save failed:", section, error.message); });
    }, 500);
  };

  const set = (updater) =>
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });

  return [data, set];
}
