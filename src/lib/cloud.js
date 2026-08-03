import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

/* ============================================================
   Save bookkeeping (module-level, shared by every section)
   - dirtyCount : edits waiting out the debounce window
   - inFlight   : upserts currently on the wire
   - failedMap  : last failed payload per (cycle,section), for retry
   ============================================================ */
const listeners = new Set();
const flushers = new Set();
const failedMap = new Map();
let dirtyCount = 0;
let inFlight = 0;

const rowKey = (r) => `${r.cycle}::${r.section}`;
const snapshot = () => ({ pending: dirtyCount + inFlight, failed: failedMap.size });
const emit = () => { const s = snapshot(); listeners.forEach((fn) => fn(s)); };

async function writeRow(row) {
  if (!supabase) return true;
  inFlight++; emit();
  const { error } = await supabase
    .from("app_state")
    .upsert({ ...row, updated_at: new Date().toISOString() });
  inFlight--;
  if (error) {
    failedMap.set(rowKey(row), row);
    console.error("Save failed:", row.section, error.message);
  } else {
    failedMap.delete(rowKey(row));
  }
  emit();
  return !error;
}

/** Subscribe to save state: { pending, failed }. */
export function useSaveStatus() {
  const [s, setS] = useState(snapshot);
  useEffect(() => {
    listeners.add(setS);
    setS(snapshot());
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}

/** Re-attempt every failed write. */
export async function retryFailedSaves() {
  const batch = [...failedMap.values()];
  failedMap.clear(); emit();
  for (const row of batch) await writeRow(row);
}

/* Best-effort: push pending edits before the tab is hidden or closed. */
if (typeof document !== "undefined") {
  const flushAll = () => flushers.forEach((fn) => fn());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  window.addEventListener("pagehide", flushAll);
}

/**
 * Persists a "section" of the app (an array or object) to the Supabase
 * `app_state` table as JSON, shared by everyone signed in.
 *
 * scope: "global" for data that spans years (cycles registry, cohorts,
 * alumni, kb) or a cycle id like "2026-27" for per-cycle data. The hook
 * re-fetches whenever the scope changes (i.e. the user switches cycle) and
 * refuses to save until the load for the current scope has finished — this
 * prevents a half-loaded screen from overwriting good data.
 *
 * Returns [data, set, saveNow] where saveNow(value) writes immediately,
 * bypassing the debounce, and resolves true/false. Use it for critical
 * writes that must not be lost if the tab closes (e.g. the cycle registry).
 */
export function useCloudSection(section, seed, scope) {
  const [data, setData] = useState(seed);
  const seedRef = useRef(seed);
  const scopeRef = useRef(scope);
  const loadedRef = useRef(!supabase);
  const timer = useRef(null);
  const pendingRow = useRef(null);
  const dirtyRef = useRef(false);

  const markDirty = (row) => {
    if (!dirtyRef.current) { dirtyRef.current = true; dirtyCount++; emit(); }
    pendingRow.current = row;
  };
  const takePending = () => {
    const row = pendingRow.current;
    pendingRow.current = null;
    if (dirtyRef.current) { dirtyRef.current = false; dirtyCount--; emit(); }
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    return row;
  };

  useEffect(() => {
    scopeRef.current = scope;
    if (!supabase) return;
    let alive = true;
    loadedRef.current = false;
    setData(seedRef.current);
    supabase
      .from("app_state")
      .select("data")
      .eq("cycle", scope)
      .eq("section", section)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!alive) return;
        if (row && row.data != null) setData(row.data);
        loadedRef.current = true;
      });
    return () => { alive = false; };
  }, [section, scope]);

  // Register this section's flush with the tab-close handler.
  useEffect(() => {
    const flush = () => { const row = takePending(); if (row) writeRow(row); };
    flushers.add(flush);
    return () => { flushers.delete(flush); };
  }, []);

  const persist = (next) => {
    if (!supabase || !loadedRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    markDirty({ cycle: scopeRef.current, section, data: next });
    timer.current = setTimeout(() => {
      const row = takePending();
      if (row) writeRow(row);
    }, 500);
  };

  const set = (updater) =>
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });

  const saveNow = async (value) => {
    setData(value);
    takePending();
    if (!supabase) return true;
    // Unlike the debounced persist, saveNow carries an explicit payload from
    // the caller, so it is safe (and necessary, for client-side migrations)
    // even before this section's initial load has resolved.
    return await writeRow({ cycle: scopeRef.current, section, data: value });
  };

  return [data, set, saveNow];
}

/** Delete every stored section for one cycle. */
export async function deleteCycleData(cycleId) {
  if (!supabase) return true;
  const { error } = await supabase.from("app_state").delete().eq("cycle", cycleId);
  if (error) console.error("Delete failed:", error.message);
  return !error;
}

/** Write many rows in a single request (near-atomic seeding of a new cycle). */
export async function writeRows(rows) {
  if (!supabase) return true;
  inFlight++; emit();
  const stamped = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("app_state").upsert(stamped);
  inFlight--; emit();
  if (error) console.error("Bulk write failed:", error.message);
  return !error;
}

/**
 * One-time, automatic migration from the single-cycle layout
 * (cycle='current') to the multi-cycle layout. Runs on first signed-in
 * load after this version deploys; a no-op ever after (it checks for the
 * cycles registry first).
 */
export async function ensureMigrated() {
  if (!supabase) return;
  const { data: reg } = await supabase
    .from("app_state")
    .select("section")
    .eq("cycle", "global")
    .eq("section", "cycles")
    .maybeSingle();
  if (reg) return;
  await supabase.from("app_state").update({ cycle: "global" })
    .eq("cycle", "current").in("section", ["cohorts", "alumni"]);
  await supabase.from("app_state").update({ cycle: "2026-27" })
    .eq("cycle", "current");
  await supabase.from("app_state").upsert({
    cycle: "global",
    section: "cycles",
    data: [{ id: "2026-27", label: "2026–27", status: "active" }],
    updated_at: new Date().toISOString(),
  });
}
