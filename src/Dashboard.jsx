import { useState } from "react";
import {
  AlertTriangle, ArrowRight, Banknote, CalendarCheck, CalendarClock, CalendarDays, Check, CheckCircle2,
  ClipboardCheck, DoorOpen, FileSpreadsheet, FileWarning, ListChecks, PackageCheck, Trophy, UserX, Users,
} from "lucide-react";
import { T } from "./lib/theme";
import { daysUntil, fmtDate, todayISO } from "./lib/ui";
import {
  PROGRAM_MONTHS, parseProgramDate, teamHealth, attendanceSummary, paidOut,
  isRunning, isFunded, isOutstanding, trackerSummary, callFor, CHECKIN_DAYS, UNASSIGNED,
} from "./lib/model";

/* ============================================================
   Dashboard

   The landing page used to open on a year wheel and four selection figures —
   true in June, beside the point in November. It now answers, in this order,
   what someone running the programme opens it to find out:

     1. What needs me?      one list, worst first, only things to act on
     2. What is coming?     the next dated things, whatever screen holds them
     3. How is each team?   every running team in both phases, on one line
     4. Where is the money? budgets and awards against what has been paid

   Nothing here is stored. Every line is read from the screen it links to
   (through lib/model), so the two cannot disagree.
   ============================================================ */

const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const DISP = "'Schibsted Grotesk', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const TONE = {
  danger: { fg: T.dangerInk, bg: T.dangerTint, dot: T.danger },
  warn: { fg: T.warnInk, bg: T.warnTint, dot: T.warn },
  info: { fg: T.infoInk, bg: T.infoTint, dot: T.info },
  ok: { fg: T.okInk, bg: T.okTint, dot: T.ok },
  idle: { fg: T.mutedInk, bg: T.chip, dot: T.muted },
};
const LONG_MONTH = { Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" };

const plural = (n, one, many = one + "s") => (n === 1 ? one : many);
const usd = (n) => `$${Math.round(n).toLocaleString()}`;
const kUsd = (n) => (n >= 1000 ? `$${(Math.round(n / 100) / 10).toLocaleString()}k` : usd(n));
const pct = (a, b) => (b ? Math.min(Math.round((a / b) * 100), 100) : 0);
/** "CORE WIRE, Cryogenic bearings and 2 more" — enough names to act on. */
const names = (list, max = 3) => {
  const ns = list.map((x) => x.name || "Untitled");
  if (ns.length <= max) return ns.join(", ");
  return `${ns.slice(0, max).join(", ")} and ${ns.length - max} more`;
};
const whenLabel = (days) => (days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 14 ? `In ${days} days` : days < 112 ? `In ${Math.round(days / 7)} weeks` : `In ${Math.floor(days / 30)} months`);

/* ---------- the year, as a small ring ---------- */
function YearRing({ month, season, accent, events }) {
  const c = 60;
  const polar = (r, a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
  };
  const arc = (rI, rO, a0, a1) => {
    const o0 = polar(rO, a0), o1 = polar(rO, a1), i1 = polar(rI, a1), i0 = polar(rI, a0);
    const big = a1 - a0 > 180 ? 1 : 0;
    return `M ${o0.x} ${o0.y} A ${rO} ${rO} 0 ${big} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${rI} ${rI} 0 ${big} 0 ${i0.x} ${i0.y} Z`;
  };
  const cur = Math.max(PROGRAM_MONTHS.indexOf(month), 0);
  const seen = {};
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" role="img" style={{ display: "block", flex: "0 0 auto" }}
      aria-label={`${LONG_MONTH[month] || month} — ${season}. The ring is the programme year, September to August.`}>
      <path d={arc(41, 55, 0, 359.99)} fill={T.hairline} opacity="0.55" />
      {/* programming season: September to March */}
      <path d={arc(41, 55, 0, 210)} fill={accent} opacity="0.16" />
      <path d={arc(39, 57, cur * 30 + 1.5, cur * 30 + 28.5)} fill={accent} />
      {(events || []).map((e, i) => {
        const mi = PROGRAM_MONTHS.indexOf(e.m);
        if (mi < 0) return null;
        const k = (seen[e.m] = (seen[e.m] || 0) + 1);
        const p = polar(48, mi * 30 + 15 + (k - 1) * 9);
        const fill = e.color || (e.key || /kickoff|demo/i.test(e.label || "") ? accent : /homecoming/i.test(e.label || "") ? T.gold : T.muted);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill={fill} stroke="#fff" strokeWidth="1.4"><title>{e.label}{e.date ? ` · ${e.date}` : ""}</title></circle>;
      })}
      <text x={c} y={c + 2} textAnchor="middle" fontFamily={DISP} fontWeight="800" fontSize="19" fill={T.ink}>{String(month).toUpperCase()}</text>
      <text x={c} y={c + 14} textAnchor="middle" fontFamily={MONO} fontSize="6.4" letterSpacing="0.8" fill={T.muted}>{PROGRAM_MONTHS[0].toUpperCase()} → {PROGRAM_MONTHS[11].toUpperCase()}</text>
    </svg>
  );
}

function Tag({ tone = "idle", children, title }) {
  const t = TONE[tone];
  return <span className="pill" title={title} style={{ background: t.bg, color: t.fg, whiteSpace: "nowrap" }}>{children}</span>;
}

/** A labelled bar that opens the screen it summarises. */
function Meter({ label, value, part, whole, tone, onClick, accent }) {
  return (
    <button className="meter" onClick={onClick} title={`Open ${label.toLowerCase()}`}>
      <span className="meterhead">
        <span className="meterlabel">{label}</span>
        <span className="mono" style={{ fontSize: 11.5, color: tone ? TONE[tone].fg : T.muted }}>{value}</span>
      </span>
      <span className="track"><span style={{ width: pct(part, whole) + "%", background: tone === "danger" ? T.danger : part >= whole && whole > 0 ? T.ok : accent }} /></span>
    </button>
  );
}

export default function Dashboard({
  cycle, isPast, month, season, accent,
  calls, selection, counts,
  p1, p2, p1Items, p2Items,
  sessions, attendance, roster, events, eventPrep, classes, pizza, alumni,
  gaps, missingP2, go, onExport,
}) {
  const [showAll, setShowAll] = useState({});
  const [showMinor, setShowMinor] = useState(false);
  const today = todayISO();
  const dateOf = (text) => parseProgramDate(text, cycle.id);

  /* ---- every team, read once ---- */
  const teams1 = p1.map((rec) => ({ rec, phase: 1, name: rec.name || "Untitled", group: callFor(rec, calls),
    h: teamHealth(rec, { award: Number(rec.budget) || 0, items: p1Items }) }));
  const teams2 = p2.map((rec) => ({ rec, phase: 2, name: rec.name || "Untitled", group: { name: String(rec.cohort || "").trim() || "No cohort", accent: T.burgundy },
    h: teamHealth(rec, { award: Number(rec.awarded) || 0, items: p2Items }) }));
  const all = [...teams1, ...teams2];
  const running = all.filter((t) => isRunning(t.rec));
  const open = (t, tab = "profiles") => (t.phase === 1 ? go.p1(tab, t.rec.id) : go.p2(tab, t.rec.id));
  const phaseWithMost = (list) => (list.filter((t) => t.phase === 2).length > list.filter((t) => t.phase === 1).length ? 2 : 1);

  /* ---- sessions and dates ---- */
  const dated = sessions.map((s) => ({ s, iso: dateOf(s.date) }));
  const pastUnheld = dated.filter((x) => x.iso && daysUntil(x.iso) < 0 && !x.s.done);
  const upcoming = dated.filter((x) => x.iso && daysUntil(x.iso) >= 0 && !x.s.done).sort((a, b) => a.iso.localeCompare(b.iso));
  const nextSession = upcoming[0] || null;
  const held = sessions.filter((s) => s.done).length;
  const att = attendanceSummary(sessions, attendance, roster);
  const demo = events.find((e) => /demo\s*day/i.test(e.label || "")) || null;
  const demoISO = (demo && dateOf(demo.date)) || dateOf((sessions.find((s) => /demo\s*day/i.test(s.title || "")) || {}).date);
  const demoIn = demoISO ? daysUntil(demoISO) : null;
  const selecting = ["May", "Jun", "Jul", "Aug"].includes(month) || p1.length === 0;

  /* The next event with a checklist, counting from this month round the year. */
  const curIdx = Math.max(PROGRAM_MONTHS.indexOf(month), 0);
  const monthIdx = (text) => {
    const hit = PROGRAM_MONTHS.findIndex((m) => new RegExp(`\\b${m}`, "i").test(String(text || "")));
    return hit < 0 ? 99 : hit;
  };
  const prepList = (eventPrep || []).map((ev) => ({ ev, idx: monthIdx(ev.date), done: ev.items.filter((i) => i.done).length, total: ev.items.length }));
  const nextPrep = prepList.filter((x) => x.idx >= curIdx && x.total > 0).sort((a, b) => a.idx - b.idx)[0] || null;

  /* ============ 1. What needs me ============ */
  const items = [];
  const clear = [];
  const add = (level, Icon, title, detail, cta, onClick, short = "") => items.push({ level, Icon, title, detail, cta, onClick, short });

  const late = running.filter((t) => t.h.overdue > 0);
  const lateN = late.reduce((n, t) => n + t.h.overdue, 0);
  if (lateN) {
    add("danger", PackageCheck, `${lateN} ${plural(lateN, "deliverable")} overdue or due today`, names(late),
      "See what's owed", () => (phaseWithMost(late) === 2 ? go.p2("deliverables") : go.p1("deliverables")));
  } else clear.push("deliverables");

  const overpaid = all.filter((t) => isFunded(t.rec) && t.h.award > 0 && t.h.paid > t.h.award);
  if (overpaid.length) {
    add("danger", Banknote, `${overpaid.length} ${plural(overpaid.length, "team has", "teams have")} been paid more than ${plural(overpaid.length, "its", "their")} budget`,
      names(overpaid), "Open team", () => open(overpaid[0]));
  } else clear.push("payments");

  const offList = [...gaps.noProfile, ...gaps.noMembers];
  if (offList.length) {
    add("warn", UserX, `${offList.length} Phase I ${plural(offList.length, "team is", "teams are")} missing from the attendance list`,
      names(offList), "Fix the list", () => go.events("attendance"));
  } else if (p1.length) clear.push("attendance list");

  if (missingP2.length) {
    add("warn", Trophy, `${missingP2.length} ${plural(missingP2.length, "team was", "teams were")} awarded Phase II but ${plural(missingP2.length, "isn't", "aren't")} set up there`,
      names(missingP2.map((r) => ({ name: r.team }))), "Open Phase II", () => go.p2("profiles"));
  }

  if (pastUnheld.length) {
    add("warn", CalendarClock, pastUnheld.length === 1
      ? `“${pastUnheld[0].s.title}” was on ${fmtDate(pastUnheld[0].iso)} but isn't marked as held`
      : `${pastUnheld.length} sessions have passed without being marked as held`,
      pastUnheld.length === 1 ? "Mark it held, or move its date if it was postponed." : pastUnheld.map((x) => x.s.title).join(", "),
      "Open events", () => go.events("sessions"));
  }

  if (nextSession && daysUntil(nextSession.iso) <= 21 && !nextSession.s.roomConfirmed) {
    const d = daysUntil(nextSession.iso);
    add("warn", DoorOpen, `“${nextSession.s.title}” is ${whenLabel(d).toLowerCase()} and its room isn't confirmed`,
      nextSession.s.roomRequested ? "The request was sent — waiting on the confirmation." : "No room request has been sent yet.",
      "Open events", () => go.events("sessions"));
  }

  const quiet = running.filter((t) => t.h.checkin.stale);
  if (quiet.length) {
    add("warn", CalendarDays, `${quiet.length} running ${plural(quiet.length, "team is", "teams are")} due a check-in`,
      `None in ${Math.round(CHECKIN_DAYS / 7)}+ weeks: ${names(quiet)}`, "Open team", () => open(quiet[0]));
  } else if (running.length) clear.push("check-ins");

  const atRisk = running.filter((t) => t.h.status.id === "atrisk");
  if (atRisk.length) {
    add("warn", AlertTriangle, `${atRisk.length} ${plural(atRisk.length, "team is", "teams are")} marked at risk`, names(atRisk), "Open team", () => open(atRisk[0]));
  }

  const f1 = trackerSummary(p1, p1Items), f2 = trackerSummary(p2, p2Items);
  const followN = f1.followup + f2.followup;
  if (followN) {
    const who = running.filter((t) => t.h.followups > 0);
    add("warn", ListChecks, `${followN} tracker ${plural(followN, "item needs", "items need")} a follow-up`, names(who),
      "Open tracker", () => (f2.followup > f1.followup ? go.p2("tracker") : go.p1("tracker")));
  } else if (running.length) clear.push("tracker");

  const noDocs = running.filter((t) => t.h.docs.missing.length > 0);
  if (noDocs.length) {
    add("warn", FileWarning, `${noDocs.length} running ${plural(noDocs.length, "team is", "teams are")} missing a budget or calendar of activities`,
      names(noDocs), "Open team", () => open(noDocs[0]));
  } else if (running.length) clear.push("documents");

  if (nextPrep && nextPrep.idx === curIdx && nextPrep.done < nextPrep.total) {
    const left = nextPrep.total - nextPrep.done;
    add("warn", CalendarCheck, `${nextPrep.ev.name} is this month and ${left} prep ${plural(left, "step is", "steps are")} still open`,
      `${nextPrep.done} of ${nextPrep.total} done`, "Open planning", () => go.planning(nextPrep.ev.id));
  }

  if (selecting && selection.length) {
    const noDate = selection.filter((t) => !t.date && ["flagged", "invited", "responded"].includes(t.stage));
    if (noDate.length) {
      add("warn", CalendarClock, `${noDate.length} shortlisted ${plural(noDate.length, "team has", "teams have")} no interview date yet`,
        names(noDate), "Open selection", () => go.selection());
    }
  }

  if (roster.length && att.unmarked.length) {
    add("info", ClipboardCheck, `Attendance wasn't recorded for ${att.unmarked.length} held ${plural(att.unmarked.length, "session")}`,
      att.unmarked.map((s) => s.title).join(", "), "Take attendance", () => go.events("attendance", att.unmarked[0].sid), "attendance not recorded");
  }

  const noAccount = teams1.filter((t) => isRunning(t.rec) && t.rec.finance !== "opened");
  if (noAccount.length) {
    add("info", Banknote, `${noAccount.length} Phase I ${plural(noAccount.length, "team's", "teams'")} Financial Services account isn't opened yet`,
      names(noAccount), "Open team", () => open(noAccount[0]), "finance accounts");
  }

  if (["Sep", "Oct"].includes(month) && alumni.length) {
    const coming = alumni.filter((a) => a.status === "coming").length;
    add("info", Users, `Homecoming: ${coming} of ${alumni.length} alumni confirmed`, "", "View cohorts", () => go.cohorts(), "Homecoming replies");
  }

  const order = { danger: 0, warn: 1, info: 2 };
  items.sort((a, b) => order[a.level] - order[b.level]);
  const urgent = items.filter((i) => i.level !== "info").length;
  /* Housekeeping stays in view while the list is short; once there is real
     chasing to do it folds away under one line, so it never buries it. */
  const minor = items.filter((i) => i.level === "info");
  const foldMinor = items.length > 6 && minor.length > 0 && urgent > 0 && !showMinor;
  const shownItems = foldMinor ? items.filter((i) => i.level !== "info") : items;

  /* ============ 2. What is coming ============ */
  const coming = [];
  upcoming.forEach(({ s, iso }) => coming.push({
    iso, title: s.title || "Untitled session", sub: [s.time, s.place, s.who].filter(Boolean).join(" · "),
    tag: s.roomConfirmed ? null : daysUntil(iso) <= 45 ? { tone: "warn", text: s.roomRequested ? "Room requested" : "Room not booked" } : null,
    onClick: () => go.events("sessions"),
  }));
  events.forEach((e) => {
    const iso = dateOf(e.date);
    if (!iso || daysUntil(iso) < 0 || coming.some((c) => c.iso === iso)) return;
    coming.push({ iso, title: e.label, sub: "Critical date", tag: null, onClick: () => go.planning() });
  });
  const dueGroups = new Map();
  running.forEach((t) => (t.rec.deliverables || []).filter(isOutstanding).forEach((d) => {
    const days = daysUntil(d.due);
    if (days === null || days < 0 || days > 28) return;
    const key = `${(d.title || "Untitled deliverable").trim()}|${d.due}`;
    if (!dueGroups.has(key)) dueGroups.set(key, { iso: d.due, title: (d.title || "Untitled deliverable").trim(), teams: [] });
    dueGroups.get(key).teams.push(t);
  }));
  dueGroups.forEach((g) => coming.push({
    iso: g.iso, title: `${g.title} due`, sub: `${g.teams.length} ${plural(g.teams.length, "team")} · ${names(g.teams, 2)}`,
    tag: daysUntil(g.iso) === 0 ? { tone: "danger", text: "Due today" } : null,
    onClick: () => (phaseWithMost(g.teams) === 2 ? go.p2("deliverables") : go.p1("deliverables")),
  }));
  coming.sort((a, b) => a.iso.localeCompare(b.iso));
  const comingShown = coming.slice(0, 6);

  /* ============ figures ============ */
  const run1 = teams1.filter((t) => isRunning(t.rec)), run2 = teams2.filter((t) => isRunning(t.rec));
  const dels = running.flatMap((t) => t.rec.deliverables || []);
  const delsIn = dels.filter((d) => !isOutstanding(d)).length;
  const fund1 = p1.filter(isFunded).reduce((a, r) => ({ total: a.total + (Number(r.budget) || 0), paid: a.paid + paidOut(r) }), { total: 0, paid: 0 });
  const fund2 = p2.filter(isRunning).reduce((a, r) => ({ total: a.total + (Number(r.awarded) || 0), paid: a.paid + paidOut(r) }), { total: 0, paid: 0 });
  const figures = [
    { n: run1.length + run2.length, l: `Teams running · ${run1.length} in Phase I, ${run2.length} in Phase II`, onClick: () => go.p1("profiles") },
    { n: dels.length ? `${delsIn}/${dels.length}` : "—", l: dels.length ? "Deliverables submitted" : "No deliverables set yet", onClick: () => go.p1("deliverables") },
    { n: att.rate === null ? "—" : `${att.rate}%`, l: att.rate === null ? "No attendance recorded yet" : `Attendance · ${att.sessions} ${plural(att.sessions, "session")}`, onClick: () => go.events("attendance") },
    { n: usd(fund1.paid + fund2.paid), l: `Paid out of ${usd(fund1.total + fund2.total)}`, onClick: () => go.p1("profiles") },
  ];

  const dateLine = new Date().toLocaleDateString("en-CA", { weekday: "long", day: "numeric", month: "long" });
  const headline = [
    isPast ? `Past cycle ${cycle.label}` : dateLine,
    `${season} season`,
    demoIn !== null && demoIn >= 0 ? (demoIn === 0 ? "Demo Day is today" : `Demo Day in ${demoIn} ${plural(demoIn, "day")} (${fmtDate(demoISO)})`) : null,
  ].filter(Boolean).join(" · ");

  /* ---------- one phase's teams, worst first ---------- */
  const healthGroup = ({ title, list, tab, emptyText }) => {
    const rank = { danger: 0, warn: 1, ok: 2 };
    const rows = list.filter((t) => isRunning(t.rec))
      .sort((a, b) => rank[a.h.level] - rank[b.h.level] || b.h.score - a.h.score || a.name.localeCompare(b.name));
    const hidden = list.length - rows.length;
    const limit = showAll[tab] ? rows.length : 10;
    const flagged = rows.filter((t) => t.h.level !== "ok").length;
    return (
      <div className="hgroup" key={tab}>
        <div className="hgrouphead">
          <span className="eyebrow">{title} · {rows.length} running</span>
          {rows.length > 0 && (
            <span className="mono" style={{ fontSize: 11, color: flagged ? T.warnInk : T.ok }}>
              {flagged ? `${flagged} ${plural(flagged, "needs", "need")} attention` : "all on track"}
            </span>
          )}
        </div>
        {rows.length === 0 && <div className="empty" style={{ textAlign: "left", padding: "6px 0 2px" }}>{emptyText}</div>}
        {rows.slice(0, limit).map((t) => {
          const h = t.h, tone = TONE[h.level];
          const del = !(t.rec.deliverables || []).length ? { text: "None set", fg: T.muted }
            : h.out === 0 ? { text: "All in", fg: T.ok }
            : { text: h.worst.label + (h.out > 1 ? ` · ${h.out} open` : ""), fg: h.overdue ? T.dangerInk : h.worst.key === "soon" ? T.warnInk : T.ink };
          const trk = !h.trackTotal ? { text: "—", fg: T.muted }
            : h.followups ? { text: `${h.followups} to follow up`, fg: T.warnInk }
            : { text: `${h.trackDone}/${h.trackTotal} done`, fg: h.trackDone === h.trackTotal ? T.ok : T.ink };
          return (
            <button key={t.rec.id} className="hrow" onClick={() => open(t)} title={`Open ${t.name}`}>
              <span className="hteam">
                <span className="hdot" style={{ background: tone.dot }} title={h.flags.length ? h.flags.join(" · ") : "On track"} />
                <span style={{ minWidth: 0 }}>
                  <span className="hname">{t.name}</span>
                  <span className="hsub">
                    <span style={{ color: t.group.id === UNASSIGNED ? T.muted : t.group.accent }}>{t.group.name}</span>
                    {h.status.id === "atrisk" && <span style={{ color: T.warnInk }}> · at risk</span>}
                  </span>
                  <span className="hflags" style={{ color: h.flags.length ? T.ink : T.ok }}>{h.flags.length ? h.flags.join(" · ") : "On track"}</span>
                </span>
              </span>
              <span className="hcell" style={{ color: del.fg }}>{del.text}</span>
              <span className="hcell" style={{ color: h.checkin.stale ? T.warnInk : T.ink }}>{h.checkin.label}</span>
              <span className="hcell" style={{ color: h.docs.missing.length ? T.warnInk : T.ok }}
                title={h.docs.missing.length ? `Missing: ${h.docs.missing.join(", ")}` : "Budget and calendar on file"}>{h.docs.onFile}/{h.docs.total}</span>
              <span className="hcell" style={{ color: trk.fg }}>{trk.text}</span>
              <span className="hcell hmoney">
                {h.award > 0 ? (
                  <>
                    <span style={{ color: h.paid > h.award ? T.dangerInk : T.ink }}>{kUsd(h.paid)} <span style={{ color: T.muted }}>of {kUsd(h.award)}</span></span>
                    <span className="track thin"><span style={{ width: pct(h.paid, h.award) + "%", background: h.paid > h.award ? T.danger : h.paid >= h.award ? T.ok : accent }} /></span>
                  </>
                ) : <span style={{ color: T.muted }}>No amount set</span>}
              </span>
              <ArrowRight size={14} className="harrow" aria-hidden="true" />
            </button>
          );
        })}
        {rows.length > limit && (
          <button className="mini" style={{ marginTop: 10 }} onClick={() => setShowAll((s) => ({ ...s, [tab]: true }))}>Show all {rows.length} teams</button>
        )}
        {hidden > 0 && <div style={{ fontSize: 11.5, color: T.muted, marginTop: 8 }}>{hidden} completed or withdrawn {plural(hidden, "team isn't", "teams aren't")} listed.</div>}
      </div>
    );
  };

  const funnel = [
    { n: counts.submitted, l: "Proposals" },
    { n: counts.shortlisted, l: "Shortlisted" },
    { n: counts.scheduled, l: "Interviewed or scheduled" },
    { n: counts.selected, l: "Selected" },
  ];
  const selectionCard = (
    <div className="card">
      <div className="cardhead">
        <div className="eyebrow">Selection{selecting ? " · in progress" : " · how this cohort was chosen"}</div>
        <button className="mini" onClick={() => go.selection()}>Open selection</button>
      </div>
      <div className="funnel">
        {funnel.map((f, i) => (
          <div key={f.l} className="fstep">
            <div className="disp fn" style={{ color: i === funnel.length - 1 ? accent : T.ink }}>{f.n}</div>
            <div className="fl">{f.l}</div>
          </div>
        ))}
      </div>
      {calls.map((call) => {
        const ts = selection.filter((t) => callFor(t, calls).id === call.id);
        return (
          <button key={call.id} className="linerow" onClick={() => go.selection(call.id)} title={`Open the ${call.name} call in Selection`}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: call.accent, flex: "0 0 8px" }} />
            <span style={{ flex: "1 1 140px", minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{call.name}</span>
              {call.topic && <span style={{ color: T.muted, fontSize: 12 }}> · {call.topic}</span>}
            </span>
            <span className="mono" style={{ fontSize: 11.5, color: T.muted }}>
              {call.subs != null && call.subs !== "" ? `${call.subs} proposals · ` : ""}{ts.length} shortlisted · {ts.filter((t) => t.outcome === "select").length} selected
            </span>
          </button>
        );
      })}
    </div>
  );

  const fundsCard = (
    <div className="card">
      <div className="cardhead"><div className="eyebrow">Money · paid out against what was granted</div></div>
      {fund1.total === 0 && fund2.total === 0 && fund1.paid === 0 && fund2.paid === 0 ? (
        <div className="empty" style={{ textAlign: "left", padding: "4px 0" }}>No budgets or awards recorded yet. Set each team's amount on its page.</div>
      ) : (
        [
          { key: 1, label: "Phase I seed budgets", scope: `cycle ${cycle.label}`, f: fund1, onClick: () => go.p1("profiles") },
          { key: 2, label: "Phase II awards", scope: "running teams", f: fund2, onClick: () => go.p2("profiles") },
        ].filter((r) => r.f.total > 0 || r.f.paid > 0).map((r) => {
          const over = r.f.paid > r.f.total;
          return (
            <button key={r.key} className="moneyrow" onClick={r.onClick} title={`Open ${r.label.split(" ").slice(0, 2).join(" ")} teams`}>
              <span className="meterhead">
                <span className="meterlabel">{r.label} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>· {r.scope}</span></span>
                <span className="disp" style={{ fontSize: 17, fontWeight: 700, color: over ? T.dangerInk : T.ink }}>{usd(r.f.paid)}</span>
              </span>
              <span className="track"><span style={{ width: pct(r.f.paid, r.f.total) + "%", background: over ? T.danger : accent }} /></span>
              <span className="mono" style={{ display: "block", fontSize: 11.5, marginTop: 6, color: over ? T.dangerInk : T.muted }}>
                {over
                  ? `${usd(r.f.paid - r.f.total)} more paid out than the ${usd(r.f.total)} granted`
                  : `paid out of ${usd(r.f.total)} · ${usd(r.f.total - r.f.paid)} still to pay`}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <div className="pagehead">
        <div style={{ minWidth: 0, flex: "1 1 420px" }}>
          <h1 className="h1 disp">Dashboard</h1>
          <p className="sub">{headline}</p>
        </div>
        <div className="pageactions">
          <button className="btn ghost" onClick={onExport}
            title="Selection, both phases, deliverables, check-ins, attendance, Demo Day and promotion — one sheet each">
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
      </div>

      <div className="dashtop">
        {/* 1 · what needs me */}
        <section className="card" aria-label="Needs attention">
          <div className="cardhead">
            <div className="eyebrow">Needs attention</div>
            {items.length > 0 && <Tag tone={items[0].level === "danger" ? "danger" : urgent ? "warn" : "info"}>{items.length} {plural(items.length, "thing")}</Tag>}
          </div>
          {items.length === 0 ? (
            <div className="allclear">
              <CheckCircle2 size={26} style={{ color: T.ok }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Nothing needs you right now</div>
                <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>Deliverables, check-ins, documents, the tracker and payments are all in order.</div>
              </div>
            </div>
          ) : shownItems.map((it) => {
            const tone = TONE[it.level];
            return (
              <button key={it.title} className="attn" onClick={it.onClick}>
                <span className="attnicon" style={{ background: tone.bg, color: tone.fg }}><it.Icon size={15} /></span>
                <span className="attntext">
                  <span className="attntitle">{it.title}</span>
                  {it.detail && <span className="attndetail" title={it.detail}>{it.detail}</span>}
                </span>
                <span className="attncta"><span className="lbl">{it.cta}</span> <ArrowRight size={13} aria-hidden="true" /></span>
              </button>
            );
          })}
          {foldMinor && (
            <button className="attnmore" onClick={() => setShowMinor(true)}>
              + {minor.length} smaller {plural(minor.length, "thing")} · {minor.map((m) => m.short).join(", ")}
            </button>
          )}
          {items.length > 0 && clear.length > 0 && (
            <div className="clearline"><Check size={12} style={{ color: T.ok, flex: "0 0 auto", marginTop: 2 }} /> <span>Nothing to do for {clear.join(", ")}.</span></div>
          )}
        </section>

        {/* 2 · where we are, and what is coming */}
        <section className="card" aria-label="This season and what is coming up">
          <div className="seasonhead">
            <YearRing month={month} season={season} accent={accent} events={events} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow">{LONG_MONTH[month] || month} · cycle {cycle.label}</div>
              <div className="disp" style={{ fontSize: 19, fontWeight: 700, margin: "3px 0 10px", lineHeight: 1.2 }}>{season}</div>
              <Meter label="Sessions held" value={`${held}/${sessions.length}`} part={held} whole={sessions.length} accent={accent} onClick={() => go.events("sessions")} />
              {nextPrep && <Meter label={`${nextPrep.ev.name} prep`} value={`${nextPrep.done}/${nextPrep.total} steps`} part={nextPrep.done} whole={nextPrep.total} accent={accent} onClick={() => go.planning(nextPrep.ev.id)} />}
              {["Jan", "Feb", "Mar", "Apr", "May"].includes(month) && (classes.length + pizza.length > 0) && (
                <Meter label="Promotion" value={`${classes.filter((c) => c.done).length + pizza.filter((q) => q.done).length}/${classes.length + pizza.length} visits and Q&As`}
                  part={classes.filter((c) => c.done).length + pizza.filter((q) => q.done).length} whole={classes.length + pizza.length} accent={accent} onClick={() => go.calls()} />
              )}
            </div>
          </div>

          <div className="eyebrow" style={{ margin: "18px 0 4px" }}>Coming up</div>
          {comingShown.length === 0 ? (
            <div className="empty" style={{ textAlign: "left", padding: "6px 0 0" }}>
              Nothing dated ahead. Sessions with a date like “Nov 21” appear here — add them under <button className="textlink" onClick={() => go.events("sessions")}>Events &amp; attendance</button>.
            </div>
          ) : comingShown.map((c, i) => {
            const d = daysUntil(c.iso);
            const [, mm, dd] = c.iso.split("-");
            return (
              <button key={i} className="upnext" onClick={c.onClick} title={`${c.title} — ${fmtDate(c.iso)}`}>
                <span className="dateblock" style={d <= 7 ? { borderColor: accent, color: accent } : undefined}>
                  <span className="dm">{["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mm)]}</span>
                  <span className="dd disp">{Number(dd)}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="uptitle">{c.title}</span>
                  {c.sub && <span className="upsub">{c.sub}</span>}
                </span>
                <span className="upwhen">
                  <span className="mono" style={{ fontSize: 11, color: d <= 7 ? T.ink : T.muted }}>{whenLabel(d)}</span>
                  {c.tag && <Tag tone={c.tag.tone}>{c.tag.text}</Tag>}
                </span>
              </button>
            );
          })}
          {coming.length > comingShown.length && (
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 8 }}>and {coming.length - comingShown.length} more later on.</div>
          )}
        </section>
      </div>

      <div className="card figures figbtn">
        {figures.map((f) => (
          <button key={f.l} className="fig" onClick={f.onClick}>
            <div className="n disp" style={{ color: accent }}>{f.n}</div>
            <div className="l">{f.l}</div>
          </button>
        ))}
      </div>

      {selecting && <div style={{ marginTop: 16 }}>{selectionCard}</div>}

      {/* 3 · how is each team */}
      <section className="card hwrap" style={{ marginTop: 16 }} aria-label="Teams at a glance">
        <div className="cardhead">
          <div className="eyebrow">Teams at a glance · the ones to chase first</div>
        </div>
        <div className="hhead" aria-hidden="true">
          <span>Team</span><span>Deliverables</span><span>Last check-in</span><span>Documents</span><span>Tracker</span><span>Paid out</span><span />
        </div>
        {healthGroup({ title: `Phase I · cycle ${cycle.label}`, list: teams1, tab: "p1",
          emptyText: "No Phase I teams running yet. They come from the teams marked Selected in Selection." })}
        {healthGroup({ title: "Phase II · all cohorts", list: teams2, tab: "p2",
          emptyText: "No Phase II teams running. They come from the teams awarded Phase II at Demo Day." })}
      </section>

      {/* 4 · where is the money, and how the cohort was chosen */}
      <div className="dashbottom" style={selecting ? { gridTemplateColumns: "minmax(0,1fr)" } : undefined}>
        {fundsCard}
        {!selecting && selectionCard}
      </div>
      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 14 }}>
        Read live from the other screens as of {fmtDate(today)} — nothing on this page is typed here.
      </div>
    </>
  );
}
