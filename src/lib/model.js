import { T } from "./theme";
import { daysUntil, fmtDate, ISO_RE, safeUrl } from "./ui";

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
   it stayed in every count as though it were still running. Phase I and
   Phase II teams share one list, so a team reads the same in either phase;
   anything saved before this reads as active.
   ============================================================ */
export const TEAM_STATUS = [
  { id: "active", label: "Active", fg: T.okInk, bg: T.okTint },
  { id: "atrisk", label: "At risk", fg: T.warnInk, bg: T.warnTint },
  { id: "completed", label: "Completed", fg: T.infoInk, bg: T.infoTint },
  { id: "withdrawn", label: "Withdrawn", fg: T.mutedInk, bg: T.chip },
];
export const statusOf = (p) =>
  TEAM_STATUS.find((x) => x.id === (p && p.status)) || TEAM_STATUS[0];
/** Still doing the work: owes deliverables, expected at sessions and check-ins. */
export const isRunning = (p) => ["active", "atrisk"].includes(statusOf(p).id);
/** Counts toward the money: everyone but a team that withdrew. */
export const isFunded = (p) => statusOf(p).id !== "withdrawn";

/* ============================================================
   Check-ins

   Both phases promise teams regular check-ins (monthly in Phase I). The date
   of the last one is read from the meetings already logged, so a team that
   has gone quiet shows up without anyone keeping a separate list.
   ============================================================ */
export const CHECKIN_DAYS = 35;

/** The most recent check-in on or before today, and how long ago it was. */
export function lastCheckin(rec) {
  const past = ((rec && rec.meetings) || [])
    .map((m) => m && m.date)
    .filter((d) => daysUntil(d) !== null && daysUntil(d) <= 0)
    .sort();
  const last = past.length ? past[past.length - 1] : null;
  const days = last ? -daysUntil(last) : null;
  const stale = isRunning(rec) && (days === null || days > CHECKIN_DAYS);
  const label = days === null ? "No check-in yet"
    : days === 0 ? "Today"
    : days < 14 ? `${days} day${days === 1 ? "" : "s"} ago`
    : `${Math.round(days / 7)} weeks ago`;
  return { last, days, stale, label };
}

export function deliverableState(d) {
  if (!d) return { key: "pending", label: "Pending", fg: T.mutedInk, bg: T.chip, rank: 4 };
  if (d.status === "submitted") return { key: "submitted", label: "Submitted", fg: T.okInk, bg: T.okTint, rank: 5 };

  const days = daysUntil(d.due);
  if (days === null) {
    return { key: "pending", label: d.due ? "No firm date" : "No due date", fg: T.mutedInk, bg: T.chip, rank: 4 };
  }
  if (days < 0) {
    const n = Math.abs(days);
    return { key: "overdue", label: `Overdue by ${n} day${n === 1 ? "" : "s"}`, fg: T.dangerInk, bg: T.dangerTint, rank: 0, days };
  }
  if (days === 0) return { key: "today", label: "Due today", fg: T.dangerInk, bg: T.dangerTint, rank: 1, days };
  if (days <= SOON_DAYS) return { key: "soon", label: `Due in ${days} day${days === 1 ? "" : "s"}`, fg: T.warnInk, bg: T.warnTint, rank: 2, days };
  return { key: "scheduled", label: `Due ${fmtDate(d.due)}`, fg: T.infoInk, bg: T.infoTint, rank: 3, days };
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

/* ============================================================
   Attendance roster check

   The attendance list is built from each Phase I team's Members field. A
   team with nobody listed, or a Selected team that was never set up as a
   Phase I team, would otherwise be missing from it without anyone noticing.
   ============================================================ */
export function rosterGaps(profiles, missingProfiles) {
  return {
    noMembers: (profiles || []).filter((p) => isRunning(p) && parseMembers(p.members).length === 0),
    noProfile: missingProfiles || [],
  };
}

/* ============================================================
   Team tracker

   One row per team, one column per thing we are waiting on — a document
   submitted, a meeting scheduled. Each cell says where it stands. The list
   of things is editable per phase; the answers live on the team itself, so
   they travel with it.
   ============================================================ */
export const TRACK_STATUS = [
  { id: "notdone", label: "Not done", fg: T.mutedInk, bg: T.chip },
  { id: "scheduled", label: "Scheduled", fg: T.infoInk, bg: T.infoTint },
  { id: "followup", label: "Needs follow-up", fg: T.warnInk, bg: T.warnTint },
  { id: "done", label: "Done", fg: T.okInk, bg: T.okTint },
];
export const trackStatus = (rec, itemId) =>
  TRACK_STATUS.find((x) => x.id === ((rec && rec.tracker) || {})[itemId]) || TRACK_STATUS[0];

/** Counts across the running teams in view. */
export function trackerSummary(teams, items) {
  const rows = (teams || []).filter(isRunning);
  const cells = rows.flatMap((t) => (items || []).map((it) => ({ team: t, st: trackStatus(t, it.id).id })));
  const followTeams = new Set(cells.filter((c) => c.st === "followup").map((c) => c.team.id));
  return {
    teams: rows.length,
    total: cells.length,
    done: cells.filter((c) => c.st === "done").length,
    scheduled: cells.filter((c) => c.st === "scheduled").length,
    followup: cells.filter((c) => c.st === "followup").length,
    teamsFollowup: followTeams.size,
  };
}

/* ============================================================
   Money ledgers

   Both phases record money the same way: dated rows with an amount and a
   note. Phase II pays an award out in tranches; Phase I spends a seed
   budget held in the team's Financial Services account. One reader keeps
   the two totals, the screens and the Excel export in agreement.
   ============================================================ */
/** Total of a team's money rows. Rows without an amount count as nothing. */
export function ledgerTotal(rec) {
  return ((rec && rec.payments) || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
}

/** Rows on file that carry no amount — they add nothing until one is typed. */
export function ledgerBlanks(rec) {
  return ((rec && rec.payments) || []).filter((x) => !(Number(x.amount) > 0)).length;
}

/** The line under a funding bar: where the figure above it came from. Both
    phases say it the same way, from here, so the two cannot drift apart. */
export function ledgerNote(rec) {
  const n = ((rec && rec.payments) || []).length;
  const blank = ledgerBlanks(rec);
  if (!n) return "no payments recorded yet — add one under Payments";
  if (blank) return `${blank} of ${n} payment${n === 1 ? "" : "s"} has no amount — type it in the $ box`;
  return `total of ${n} payment${n === 1 ? "" : "s"} under Payments`;
}

/* ============================================================
   The dashboard's readings

   The landing page answers three questions — what needs doing, what is
   coming, how is each team — from what the other screens already hold.
   Everything here is a pure reading of that data, so the dashboard can never
   disagree with the page it links to.
   ============================================================ */

/** Paid to a team so far: its payments, or the single figure typed before
    payments were itemised. */
export const paidOut = (rec) =>
  ((rec && rec.payments) || []).length ? ledgerTotal(rec) : Number(rec && rec.spent) || 0;

/** The programme year runs September to August. */
export const PROGRAM_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const CAL = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n) => String(n).padStart(2, "0");

/**
 * Session and milestone dates are typed the way people say them — "Nov 21",
 * "21 Nov", "Mar 27, 14:00" — with no year, because the cycle supplies it:
 * September to December fall in the cycle's first year, January to August in
 * its second. Returns an ISO date, or null for anything that isn't a day
 * ("TBD", "end Mar").
 */
export function parseProgramDate(text, cycleId, now = new Date()) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (ISO_RE.test(t)) return daysUntil(t) === null ? null : t;
  const m = t.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})\b/i) || t.match(/\b(\d{1,2})\s+([a-z]{3})[a-z]*\b/i);
  if (!m) return null;
  const [word, num] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
  const month = CAL.indexOf(word.toLowerCase());
  const day = Number(num);
  if (month < 0 || day < 1) return null;
  const typedYear = t.match(/\b(20\d{2})\b/);
  const cycleYear = String(cycleId || "").match(/(20\d{2})/);
  const start = cycleYear ? Number(cycleYear[1]) : (now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1);
  const year = typedYear ? Number(typedYear[1]) : (month >= 8 ? start : start + 1);
  if (day > new Date(year, month + 1, 0).getDate()) return null;
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * How one team is doing, read from its own record: what it owes, when it was
 * last seen, the documents on file, tracker follow-ups and its money. `level`
 * is the worst of them, so a list can be sorted with the teams to chase first.
 */
export function teamHealth(rec, { award = 0, items = [] } = {}) {
  const st = statusOf(rec);
  const paid = paidOut(rec);
  if (!isRunning(rec)) {
    return { level: "idle", score: -1, status: st, flags: [st.label], out: 0, overdue: 0, worst: null,
      checkin: lastCheckin(rec), docs: docsSummary(rec), followups: 0, trackDone: 0, trackTotal: 0, paid, award };
  }
  const outs = (rec.deliverables || []).filter(isOutstanding).map(deliverableState);
  const overdue = outs.filter((x) => x.key === "overdue" || x.key === "today").length;
  const soon = outs.filter((x) => x.key === "soon").length;
  const worst = outs.length ? outs.reduce((w, x) => (x.rank < w.rank ? x : w)) : null;
  const checkin = lastCheckin(rec);
  const docs = docsSummary(rec);
  const followups = items.filter((it) => trackStatus(rec, it.id).id === "followup").length;
  const trackDone = items.filter((it) => trackStatus(rec, it.id).id === "done").length;
  const overpaid = award > 0 && paid > award;
  const noMembers = parseMembers(rec.members).length === 0;

  const flags = [];
  if (overdue) flags.push(`${overdue} overdue`);
  if (overpaid) flags.push("paid over budget");
  if (st.id === "atrisk") flags.push("at risk");
  if (checkin.stale) flags.push(checkin.days === null ? "no check-in yet" : "check-in due");
  if (followups) flags.push(`${followups} to follow up`);
  if (docs.missing.length) flags.push(`${docs.missing.length} document${docs.missing.length === 1 ? "" : "s"} missing`);
  if (noMembers) flags.push("no members listed");
  if (!overdue && soon) flags.push(`${soon} due this week`);

  const danger = overdue > 0 || overpaid;
  const warn = st.id === "atrisk" || checkin.stale || followups > 0 || docs.missing.length > 0 || noMembers || soon > 0;
  const score = overdue * 4 + (overpaid ? 4 : 0) + (st.id === "atrisk" ? 3 : 0) + (checkin.stale ? 2 : 0)
    + followups * 1.5 + docs.missing.length + (noMembers ? 1 : 0) + soon * 0.5;
  return { level: danger ? "danger" : warn ? "warn" : "ok", score, status: st, flags,
    out: outs.length, overdue, worst, checkin, docs, followups, trackDone, trackTotal: items.length, paid, award };
}

/**
 * Attendance across the sessions that were held and marked: the share of
 * marks that read "present", and the held sessions nobody took attendance at.
 */
export function attendanceSummary(sessions, attendance, roster) {
  const keys = new Set((roster || []).map((r) => r.key));
  let present = 0, marked = 0, counted = 0;
  const unmarked = [];
  (sessions || []).filter((s) => s.done).forEach((s) => {
    const row = (attendance && s.sid && attendance[s.sid]) || {};
    const vals = Object.keys(row).filter((k) => keys.has(k)).map((k) => row[k]);
    if (!vals.length) { unmarked.push(s); return; }
    counted++;
    marked += vals.length;
    present += vals.filter((v) => v === "present").length;
  });
  return { rate: marked ? Math.round((present / marked) * 100) : null, sessions: counted, unmarked };
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


/* ============================================================
   Team documents

   Every team — Phase I and Phase II alike — is expected to keep two documents
   on file: its budget and its calendar of activities. They get named slots so
   a missing one is visible, rather than being one more line in a free list
   that nobody notices is absent. Anything else goes under "other documents".
   ============================================================ */
export const REQUIRED_DOCS = [
  { key: "budget", label: "Budget" },
  { key: "calendar", label: "Calendar of activities" },
];

/** True when the slot holds a real, openable web address. */
export const docOnFile = (rec, key) => !!safeUrl(rec && rec.docs && rec.docs[key] && rec.docs[key].url);

/** { onFile, total, missing: [labels] } across the required slots. */
export function docsSummary(rec) {
  const missing = REQUIRED_DOCS.filter((d) => !docOnFile(rec, d.key)).map((d) => d.label);
  return { onFile: REQUIRED_DOCS.length - missing.length, total: REQUIRED_DOCS.length, missing };
}
