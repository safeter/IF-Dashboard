import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "./theme";

/* ============================================================
   In-app dialogs and toasts.

   Replaces window.confirm / prompt / alert, which are visually jarring,
   deprecated in some embedding contexts, and silently suppressed by some
   browsers. The API is promise-based so call sites read the same way:

     if (!(await ui.confirm("Delete this?"))) return;
     const name = await ui.prompt("Rename cycle", current);   // null if cancelled
     await ui.alert("Saved.");
     ui.toast("Published to the library.");                   // non-blocking

   A single <DialogHost /> near the app root renders whatever is open.
   ============================================================ */

let pushDialog = null;
let pushToast = null;
const queued = [];

const request = (spec) =>
  new Promise((resolve) => {
    if (pushDialog) pushDialog({ ...spec, resolve });
    else queued.push({ ...spec, resolve }); // host not mounted yet
  });

export const ui = {
  confirm: (message, opts = {}) => request({ kind: "confirm", message, ...opts }),
  /* Three-way: resolves true for the primary, "alt" for the middle option, and
     false for cancel. Needed where neither answer is a plain yes/no — losing
     someone else's edits versus losing your own, say. */
  choose: (message, opts = {}) => request({ kind: "confirm", message, ...opts }),
  prompt: (message, initial = "", opts = {}) => request({ kind: "prompt", message, initial, ...opts }),
  alert: (message, opts = {}) => request({ kind: "alert", message, ...opts }),
  toast: (message, tone = "ok") => { if (pushToast) pushToast(message, tone); },
};

const overlay = {
  position: "fixed", inset: 0, zIndex: 100, background: "rgba(50,48,47,.34)",
  display: "grid", placeItems: "center", padding: 20,
};
const sheet = {
  width: "min(420px, 100%)", background: T.surface, border: `1px solid ${T.hairline}`,
  borderRadius: 18, padding: 22, boxShadow: "0 18px 50px rgba(0,0,0,.18)",
  fontFamily: "'Inter', system-ui, sans-serif", color: T.ink,
};

export function DialogHost() {
  const [d, setD] = useState(null);
  const [value, setValue] = useState("");
  const [toasts, setToasts] = useState([]);
  const inputRef = useRef(null);
  const okRef = useRef(null);
  const currentRef = useRef(null); // the open dialog, readable from a stable callback

  useEffect(() => {
    pushDialog = (spec) => { currentRef.current = spec; setValue(spec.initial ?? ""); setD(spec); };
    pushToast = (message, tone) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((ts) => [...ts, { id, message, tone }]);
      setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
    };
    while (queued.length) pushDialog(queued.shift());
    return () => { pushDialog = null; pushToast = null; };
  }, []);

  // Focus the field (or the primary button) whenever a dialog opens.
  useEffect(() => {
    if (!d) return;
    const el = d.kind === "prompt" ? inputRef.current : okRef.current;
    if (el) { el.focus(); if (el.select) el.select(); }
  }, [d]);

  /* Resolving inside a state updater would be a side effect in a function
     React may call more than once. Keep the updater pure and settle the
     promise here instead. */
  const close = useCallback((result) => {
    const cur = currentRef.current;
    currentRef.current = null;
    setD(null);
    if (cur) cur.resolve(result);
  }, []);

  // Escape always cancels; the resolved value matches each kind's contract.
  useEffect(() => {
    if (!d) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(d.kind === "prompt" ? null : false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, close]);

  const tones = {
    ok: { fg: T.ok, bg: T.okTint },
    warn: { fg: T.warnInk, bg: T.warnTint },
    danger: { fg: T.danger, bg: T.dangerTint },
  };

  return (
    <>
      {d && (
        <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) close(d.kind === "prompt" ? null : false); }}>
          <div style={sheet} role="dialog" aria-modal="true" aria-label={d.title || "Dialog"}>
            {d.title && <div className="disp" style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{d.title}</div>}
            <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", color: d.title ? T.muted : T.ink }}>
              {d.message}
            </div>

            {d.kind === "prompt" && (
              <input
                ref={inputRef}
                value={value}
                placeholder={d.placeholder || ""}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); close(value.trim() ? value : null); } }}
                style={{
                  width: "100%", marginTop: 14, padding: "9px 11px", border: `1px solid ${T.hairline}`,
                  borderRadius: 9, fontFamily: "inherit", fontSize: 13.5, background: T.paper,
                  color: T.ink, boxSizing: "border-box",
                }}
              />
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {d.kind !== "alert" && (
                <button className="btn ghost" onClick={() => close(d.kind === "prompt" ? null : false)}>
                  {d.cancelLabel || "Cancel"}
                </button>
              )}
              {d.altLabel && (
                <button className="btn ghost" onClick={() => close("alt")}>{d.altLabel}</button>
              )}
              <button
                ref={okRef}
                className="btn"
                style={d.danger ? { background: T.danger } : undefined}
                onClick={() => close(d.kind === "prompt" ? (value.trim() ? value : null) : true)}
              >
                {d.confirmLabel || (d.kind === "alert" ? "OK" : d.kind === "prompt" ? "Save" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 22, zIndex: 120, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
          {toasts.map((t) => {
            const tone = tones[t.tone] || tones.ok;
            return (
              <div key={t.id} role="status" style={{
                background: T.surface, border: `1px solid ${T.hairline}`, borderLeft: `3px solid ${tone.fg}`,
                borderRadius: 12, padding: "10px 15px", fontSize: 13, color: T.ink, maxWidth: 420,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)", fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {t.message}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================================================
   NoteField — a textarea that grows with its content.

   Notes in this app are frequently long (meeting minutes, action items,
   traction updates), so nothing here is capped to one line. It starts at
   `minRows` and grows to fit; the user can still drag it taller.
   ============================================================ */
export function NoteField({ value, onChange, placeholder, minRows = 1, mono, style }) {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useEffect(resize, [value, resize]);

  return (
    <textarea
      ref={ref}
      className={"notefield" + (mono ? " mono" : "")}
      value={value ?? ""}
      rows={minRows}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      style={style}
    />
  );
}

/* ============================================================
   Date helpers + DateField.

   Deliverable due dates drive the "who owes us something" views, so they
   are stored as ISO (YYYY-MM-DD). Dates typed as free text before this
   change are kept and shown verbatim until someone re-picks them.
   ============================================================ */
export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** Whole days from today to an ISO date; null when the value isn't a real date. */
export const daysUntil = (iso) => {
  if (!ISO_RE.test(String(iso || ""))) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then - today) / 86400000);
};
/** "12 Mar" / "12 Mar 2027" for dates outside the current year. */
export const fmtDate = (iso) => {
  if (!ISO_RE.test(String(iso || ""))) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
};

export function DateField({ value, onChange, w = "132px", title }) {
  const legacy = value && !ISO_RE.test(String(value));
  const [editingLegacy, setEditingLegacy] = useState(false);

  // A pre-existing free-text date is shown as-is with a one-click swap to a
  // real date, so no one silently loses what they had typed.
  if (legacy && !editingLegacy) {
    return (
      <button
        onClick={() => setEditingLegacy(true)}
        title="Typed as text — click to set a real date"
        className="mono"
        style={{
          width: w, padding: "5px 8px", border: `1px dashed ${T.warn}`, borderRadius: 8,
          fontSize: 12, color: T.warnInk, background: T.warnTint, textAlign: "left",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      type="date"
      title={title}
      value={ISO_RE.test(String(value || "")) ? value : ""}
      onChange={(e) => { onChange(e.target.value); setEditingLegacy(false); }}
      className="datefield mono"
      style={{ width: w }}
    />
  );
}

/* ============================================================
   Links

   People paste whatever the address bar gave them, so a bare "drive.google.com/…"
   has to work. Only http and https are ever produced: a javascript: or data:
   URL typed into one of these fields must never become a live href.
   ============================================================ */
export function safeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try { parsed = new URL(candidate); } catch { return null; }
  return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
}

/** "drive.google.com/drive/folders/…" -> "drive.google.com" for a compact label. */
export function linkHost(value) {
  const href = safeUrl(value);
  if (!href) return "";
  try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return ""; }
}
