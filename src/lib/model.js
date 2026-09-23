import { T } from "./theme";
import { daysUntil, fmtDate, ISO_RE } from "./ui";

/* ============================================================
   Call attribution

   Teams used to carry a binary `cohort: "regular" | "special"`, which could
   not say WHICH themed call a team came from once more than one existed.
   Teams now carry `callId`, pointing at an entry in the cycle's call list.
   Legacy rows are read through `callFor`, so nothing needs a data migration
   before the screens work.
   ============================================================ */
export const UNASSIGNED = "__unassigned";
const UNASSIGNED_CALL = { id: UNASSIGNED, name: "Unassigned", topic: "Not attributed to a call yet", accent: T.muted };

/** The call a legacy `cohort` value meant: the first themed call, or Regular. */
export function legacyCallId(cohort, callList) {
  if (String(cohort) === "special") {
    const themed = callList.find((c) => c.id !== "regular" && !c.fixed) || callList.find((c) => c.id !== "regular");
    if (themed) return themed.id;
  }
  return callList.some((c) => c.id === "regular") ? "regular" : (callList[0] ? callList[0].id : UNASSIGNED);
}

/** Resolve a team to its call object. Never throws; falls back to Unassigned. */
export function callFor(team, callList) {
  if (team && team.callId) {
    return callList.find((c) => c.id === team.callId) || UNASSIGNED_CALL;
  }
  const id = legacyCallId(team ? team.cohort : null, callList);
  return callList.find((c) => c.id === id) || UNASSIGNED_CALL;
}

/** Calls to show as groups: every configured call, plus Unassigned if in use. */
export function callGroups(teams, callList) {
  const groups = callList.map((c) => ({ call: c, teams: teams.filter((t) => callFor(t, callList).id === c.id) }));
  const orphans = teams.filter((t) => callFor(t, callList).id === UNASSIGNED);
  if (orphans.length) groups.push({ call: UNASSIGNED_CALL, teams: orphans });
  return groups;
}

/** Map an imported spreadsheet value onto a call id, by name then by topic. */
export function matchCall(value, callList) {
  const s = String(value ?? "").toLowerCase().trim();
  if (!s) return legacyCallId("regular", callList);
  const byName = callList.find((c) => s.includes(String(c.name).toLowerCase()));
  if (byName && byName.id !== "regular") return byName.id;
  const byTopic = callList.find((c) => c.topic && s.includes(String(c.topic).toLowerCase()));
  if (byTopic) return byTopic.id;
  if (/special|cyber|security/.test(s)) return legacyCallId("special", callList);
  if (byName) return byName.id;
  return legacyCallId("regular", callList);
}

/* ============================================================
   Deliverables

   A deliverable is outstanding unless it is explicitly submitted. Urgency
   is derived from the due date rather than typed by hand, so "who owes us
   something" is always current without anyone maintaining it.
   ============================================================ */
export const SOON_DAYS = 7;

/* ============================================================
   Team status

   A team that withdraws or goes quiet used to have nowhere to be recorded, so
   it stayed in every count as though it were still running. Status is carried
   on the Phase I profile; anything saved before this reads as active.
   ============================================================ */
export const TEAM_STATUS = [
  { id: "active", label: "Active", fg: T.ok, bg: T.okTint },
  { id: "atrisk", label: "At risk", fg: T.warnInk, bg: T.warnTint },
  { id: "withdrawn", label: "Withdrawn", fg: T.muted, bg: "#EFEAE5" },
];
export const statusOf = (p) =>
  TEAM_STATUS.find((x) => x.id === (p && p.status)) || TEAM_STATUS[0];
/** Withdrawn teams owe us nothing and are not counted as running. */
export const isRunning = (p) => statusOf(p).id !== "withdrawn";

export function deliverableState(d) {
  if (!d) return { key: "pending", label: "Pending", fg: T.muted, bg: "#EFEAE5", rank: 4 };
  if (d.status === "submitted") return { key: "submitted", label: "Submitted", fg: T.ok, bg: T.okTint, rank: 5 };

  const days = daysUntil(d.due);
  if (days === null) {
    return { key: "pending", label: d.due ? "No firm date" : "No due date", fg: T.muted, bg: "#EFEAE5", rank: 4 };
  }
  if (days < 0) {
    const n = Math.abs(days);
    return { key: "overdue", label: `Overdue by ${n} day${n === 1 ? "" : "s"}`, fg: T.danger, bg: T.dangerTint, rank: 0, days };
  }
  if (days === 0) return { key: "today", label: "Due today", fg: T.danger, bg: T.dangerTint, rank: 1, days };
  if (days <= SOON_DAYS) return { key: "soon", label: `Due in ${days} day${days === 1 ? "" : "s"}`, fg: T.warnInk, bg: T.warnTint, rank: 2, days };
  return { key: "scheduled", label: `Due ${fmtDate(d.due)}`, fg: T.info, bg: "#DCEBF3", rank: 3, days };
}

export const isOutstanding = (d) => !!d && d.status !== "submitted";

/** Every outstanding deliverable across all teams, most urgent first. */
export function outstandingDeliverables(profiles) {
  const rows = [];
  (profiles || []).filter(isRunning).forEach((p) => {
    (p.deliverables || []).forEach((d) => {
      if (!isOutstanding(d)) return;
      rows.push({ ...d, profileId: p.id, team: p.name || "Untitled team", state: deliverableState(d) });
    });
  });
  return rows.sort((a, b) => {
    if (a.state.rank !== b.state.rank) return a.state.rank - b.state.rank;
    const ad = a.state.days, bd = b.state.days;
    if (ad != null && bd != null && ad !== bd) return ad - bd;
    if (ad != null && bd == null) return -1;
    if (ad == null && bd != null) return 1;
    return String(a.team).localeCompare(String(b.team));
  });
}

/** Headline counts for the dashboard and the nav badge. */
export function deliverableSummary(profiles) {
  const rows = outstandingDeliverables(profiles);
  const overdue = rows.filter((r) => r.state.key === "overdue" || r.state.key === "today");
  const soon = rows.filter((r) => r.state.key === "soon");
  return {
    rows,
    outstanding: rows.length,
    overdue: overdue.length,
    soon: soon.length,
    teamsOwing: new Set(rows.map((r) => r.profileId)).size,
    teamsOverdue: new Set(overdue.map((r) => r.profileId)).size,
  };
}

/** The worst state among one team's deliverables — drives the team chip badge. */
export function profileDeliverableState(profile) {
  const outstanding = (profile.deliverables || []).filter(isOutstanding);
  if (!outstanding.length) return null;
  return outstanding
    .map(deliverableState)
    .reduce((worst, s) => (s.rank < worst.rank ? s : worst));
}

/* ============================================================
   People

   A team profile keeps its members as free text — one person per line,
   "Name  email" or "Name, program, email" — because that is how the lists
   arrive. Parsing happens on read, so the attendance roster and the contact
   directory always agree on who exists without a second place to maintain.
   ============================================================ */
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/;

export function parseMembers(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const em = line.match(EMAIL_RE);
      const email = em ? em[0] : "";
      const name = line.replace(email, "").replace(/\s{2,}/g, " ").trim().replace(/[\s,;:\u00b7|\-\u2013]+$/, "").trim();
      return { name: name || email, email, key: (email || name).toLowerCase() };
    });
}

export { ISO_RE };


/* ============================================================
   Scoring

   A team's score used to be one integer, typed by hand out of the panel's
   total. That made a transcription slip invisible and left no record of who
   scored what — thin for a decision that leads to a $50,000 award. Scores are
   now held per judge and the total is derived. A team carrying only the old
   single figure keeps it until someone enters the breakdown.
   ============================================================ */
export const JUDGE_MAX = 5;

/** The per-judge array, padded to `panel` slots. */
export const judgeScores = (rec, panel) => {
  const raw = Array.isArray(rec && rec.scores) ? rec.scores : [];
  return Array.from({ length: panel }, (_, i) => (raw[i] === 0 || raw[i] ? raw[i] : ""));
};
export const hasBreakdown = (rec) =>
  Array.isArray(rec && rec.scores) && rec.scores.some((v) => v === 0 || Number(v) > 0);

/** Total from the breakdown when there is one, else the legacy typed figure. */
export function totalScore(rec, panel) {
  if (hasBreakdown(rec)) {
    return judgeScores(rec, panel).reduce((a, v) => a + (Number(v) || 0), 0);
  }
  const legacy = rec && rec.score;
  return legacy === "" || legacy == null ? null : Number(legacy);
}

/** How many of the panel have actually scored — surfaces a half-entered row. */
export const judgesIn = (rec, panel) =>
  judgeScores(rec, panel).filter((v) => v === 0 || Number(v) > 0).length;
