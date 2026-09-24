import {
  callFor, totalScore, judgeScores, judgesIn, deliverableState, statusOf, isRunning,
  isOutstanding, parseMembers, REQUIRED_DOCS,
} from "./model";
import { safeUrl } from "./ui";

/* ============================================================
   Excel export — the viewed cycle as one workbook, for reporting upward.

   A pure function: data in, workbook out. Every value is written as plain
   text or a number, never as a formula, so a team name that happens to begin
   with "=" is shown as typed and can't run anything when the file is opened.
   ============================================================ */

const OUTCOME = { select: "Selected", waitlist: "Waitlist", reject: "Not selected" };
const AGREED = { yes: "Agreed", declined: "Declined", pending: "Pending" };
const ATTEND = { present: "Present", absent: "Absent", excused: "Excused" };

const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const txt = (v) => (v == null ? "" : String(v));
const docCell = (rec, key) => {
  const d = rec && rec.docs && rec.docs[key];
  const href = d && safeUrl(d.url);
  return href || (d && d.url ? `(not a link) ${d.url}` : "");
};

function sheet(XLSX, header, rows) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  // Column widths from the content, capped so a long note can't make a column unusable.
  ws["!cols"] = header.map((h, i) => ({
    wch: Math.min(60, Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? "").split("\n")[0].length)) + 2),
  }));
  if (rows.length) {
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };
  }
  return ws;
}

/**
 * @param XLSX  the SheetJS module
 * @param d     { cycleLabel, exportedAt, judges, stages, calls, teams, profiles,
 *                phase2, results, sessions, attendance, classes, pizza }
 */
export function buildWorkbook(XLSX, d) {
  const wb = XLSX.utils.book_new();
  const calls = d.calls || [];
  const callName = (rec) => callFor(rec, calls).name;
  const stageLabel = (id) => ((d.stages || []).find((s) => s.id === id) || {}).label || txt(id);
  const J = d.judges;
  const judgeHeads = Array.from({ length: J }, (_, i) => `Judge ${i + 1}`);
  const profiles = d.profiles || [];
  const running = profiles.filter(isRunning);
  const phase2 = d.phase2 || [];
  const paid = (p) => (p.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  /* ---- Summary ---- */
  const outstanding = running.flatMap((p) => (p.deliverables || []).filter(isOutstanding));
  const overdue = outstanding.filter((x) => ["overdue", "today"].includes(deliverableState(x).key));
  const seedAllocated = running.reduce((s, p) => s + (Number(p.budget) || 0), 0);
  const seedSpent = running.reduce((s, p) => s + (Number(p.spent) || 0), 0);
  const activeP2 = phase2.filter((p) => p.status !== "completed");
  const summary = [
    ["Programme", "GCS Innovation Fund"],
    ["Cycle", d.cycleLabel],
    ["Exported", d.exportedAt],
    ...calls.map((c) => [`Proposals submitted · ${c.name}${c.topic ? ` (${c.topic})` : ""}`, num(c.subs)]),
    ["Shortlisted to interview", (d.teams || []).length],
    ["Selected", (d.teams || []).filter((t) => t.outcome === "select").length],
    ["Phase I teams running", running.length],
    ["Phase I teams withdrawn", profiles.length - running.length],
    ["Deliverables outstanding", outstanding.length],
    ["Deliverables overdue or due today", overdue.length],
    ["Phase I seed budgets allocated ($)", seedAllocated],
    ["Phase I seed budgets spent ($)", seedSpent],
    ["Phase II awards, active teams ($)", activeP2.reduce((s, p) => s + (Number(p.awarded) || 0), 0)],
    ["Phase II disbursed, active teams ($)", activeP2.reduce((s, p) => s + paid(p), 0)],
  ];
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Measure", "Value"], summary), "Summary");

  /* ---- Selection ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Team", "Description", "Call", "Flagged by", `Score /${J * 5}`, "Judges scored", ...judgeHeads, "Agreed", "Interview", "Outcome", "Stage"],
    (d.teams || []).map((t) => [
      txt(t.name), txt(t.blurb), callName(t), (t.flaggedBy || []).join(", "),
      num(totalScore(t, J)), judgesIn(t, J), ...judgeScores(t, J).map(num),
      AGREED[t.agreed] || txt(t.agreed), txt(t.date), OUTCOME[t.outcome] || "", stageLabel(t.stage),
    ])), "Selection");

  /* ---- Phase I teams ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Team", "Call", "Status", "Members", "Department", "Supervisor", "Mentor", "Finance account",
     "Budget ($)", "Spent ($)", "Remaining ($)", ...REQUIRED_DOCS.map((r) => r.label), "Deliverables outstanding", "Notes"],
    profiles.map((p) => {
      const b = num(p.budget), s = num(p.spent);
      return [
        txt(p.name), callName(p), statusOf(p).label, parseMembers(p.members).length,
        txt(p.dept), txt(p.supervisor), txt(p.mentor), p.finance === "opened" ? "Opened" : "Pending",
        b, s, b == null ? null : b - (s || 0), ...REQUIRED_DOCS.map((r) => docCell(p, r.key)),
        isRunning(p) ? (p.deliverables || []).filter(isOutstanding).length : 0, txt(p.notes),
      ];
    })), "Phase I teams");

  /* ---- Deliverables ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Team", "Team status", "Deliverable", "Due", "Status", "Note"],
    profiles.flatMap((p) => (p.deliverables || []).map((x) => [
      txt(p.name), statusOf(p).label, txt(x.title), txt(x.due),
      x.status === "submitted" ? "Submitted" : deliverableState(x).label, txt(x.note),
    ]))), "Deliverables");

  /* ---- Progress meetings ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Team", "Date", "Notes"],
    profiles.flatMap((p) => (p.meetings || []).map((m) => [txt(p.name), txt(m.date), txt(m.note)]))), "Meetings");

  /* ---- Contacts ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Team", "Call", "Name", "Email"],
    profiles.flatMap((p) => parseMembers(p.members).map((m) => [txt(p.name), callName(p), m.name, m.email]))), "Contacts");

  /* ---- Attendance ---- */
  const sessions = d.sessions || [];
  const people = profiles.flatMap((p) => parseMembers(p.members).map((m) => ({ ...m, team: p.name })));
  const att = d.attendance || {};
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Name", "Email", "Team", ...sessions.map((s) => `${txt(s.date)} · ${txt(s.title)}`.slice(0, 48))],
    people.map((m) => [m.name, m.email, txt(m.team), ...sessions.map((s) => ATTEND[(att[s.sid] || {})[m.key]] || "")])), "Attendance");

  /* ---- Programming ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Date", "Time", "Place", "Session", "Speaker", "Held", "Room requested", "Room confirmed"],
    sessions.map((s) => [txt(s.date), txt(s.time), txt(s.place), txt(s.title), txt(s.who),
      s.done ? "Yes" : "No", s.roomRequested ? "Yes" : "No", s.roomConfirmed ? "Yes" : "No"])), "Programming");

  /* ---- Phase II ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Team", "Cohort", "Status", "Award ($/yr)", "Disbursed ($)", "Remaining ($)", "Over award ($)", ...REQUIRED_DOCS.map((r) => r.label), "Note"],
    phase2.map((p) => {
      const a = Number(p.awarded) || 0, pd = paid(p);
      return [txt(p.team), txt(p.cohort), p.status === "completed" ? "Completed" : "Active",
        num(p.awarded), pd, Math.max(a - pd, 0), Math.max(pd - a, 0), ...REQUIRED_DOCS.map((r) => docCell(p, r.key)), txt(p.note)];
    })), "Phase II teams");
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Team", "Date", "Amount ($)", "Note"],
    phase2.flatMap((p) => (p.payments || []).map((x) => [txt(p.team), txt(x.date), num(x.amount), txt(x.note)]))), "Phase II payments");

  /* ---- Demo Day ---- */
  XLSX.utils.book_append_sheet(wb, sheet(XLSX,
    ["Team", "Pitched", `Pitch score /${J * 5}`, "Judges scored", ...judgeHeads, "Awards", "Phase 2", "Amount ($/yr)", "Note"],
    (d.results || []).map((r) => [
      txt(r.team), r.pitched ? "Yes" : "No", num(totalScore(r, J)), judgesIn(r, J), ...judgeScores(r, J).map(num),
      (r.awards || []).join(", "), r.phase2 ? "Yes" : "No", num(r.amount), txt(r.note),
    ])), "Demo Day");

  /* ---- Promotion ---- */
  const callById = (idOrName) => (calls.find((c) => c.id === idOrName || c.name === idOrName) || {}).name || txt(idOrName);
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Course", "Campus", "Professor", "Date", "Calls advertised", "Status"],
    (d.classes || []).map((c) => [txt(c.course), txt(c.campus), txt(c.prof), txt(c.date),
      (c.calls || []).map(callById).join(", "), c.done ? "Done" : "Planned"])), "Class visits");
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, ["Session", "Date", "Time", "Room", "Registered", "Status"],
    (d.pizza || []).map((q) => [txt(q.title), txt(q.date), txt(q.time), txt(q.room), num(q.reg), q.done ? "Done" : "Planned"])), "Pizza Q&As");

  return wb;
}

/** "innovation-fund-manager-2026-27-2026-09-24.xlsx" */
export const workbookName = (cycleId, date) =>
  `innovation-fund-manager-${String(cycleId || "cycle").replace(/[^\w-]+/g, "-")}-${date}.xlsx`;
