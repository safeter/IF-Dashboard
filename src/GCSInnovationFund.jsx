import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useCloudSection, useSaveStatus, retryFailedSaves, writeRows, deleteCycleData } from "./lib/cloud";
import { supabase } from "./lib/supabase";
import { T, PALETTE } from "./lib/theme";
import { ui, DialogHost, NoteField, DateField, todayISO, fmtDate } from "./lib/ui";
import {
  callFor, callGroups, matchCall, legacyCallId, UNASSIGNED,
  deliverableState, isOutstanding, deliverableSummary, profileDeliverableState, SOON_DAYS,
} from "./lib/model";
import {
  LayoutGrid, Megaphone, ListChecks, CalendarDays,
  Check, Clock, X, Sparkles, GraduationCap,
  UploadCloud, RefreshCw, CalendarCheck, Trophy, Pizza,
  CheckCircle2, Circle, Search, Award, Plus, Trash2, Pencil,
  ChevronDown, ChevronUp, ChevronsUp, ChevronsDown, Download, Upload, Settings, AlertTriangle, Users, BookOpen, Copy, Wallet,
  PackageCheck, Inbox,
} from "lucide-react";

/* ============================================================
   GCS Innovation Fund — internal dashboard
   Design system: Wealthsimple warm minimalism × Gina Cody burgundy
   Palette and call accents live in ./lib/theme
   ============================================================ */

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.gcs *{box-sizing:border-box;margin:0;padding:0}
.gcs{--accent:${T.burgundy};font-family:'Inter',system-ui,sans-serif;color:${T.ink};
  background:${T.paper};min-height:100vh;display:flex;line-height:1.45;-webkit-font-smoothing:antialiased}
.gcs button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.gcs :focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
.disp{font-family:'Schibsted Grotesk',system-ui,sans-serif;letter-spacing:-.02em}
.mono{font-family:'IBM Plex Mono',monospace}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:${T.muted}}

/* shell */
.side{width:236px;flex:0 0 236px;background:${T.surface};border-right:1px solid ${T.hairline};
  padding:22px 16px;display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh}
.brand{display:flex;align-items:center;gap:11px;padding:4px 8px 18px}
.brandmark{width:34px;height:34px;border-radius:10px;background:var(--accent);color:#fff;
  display:grid;place-items:center;font-weight:800;font-size:15px;flex:0 0 34px}
.navitem{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:11px;
  font-size:14px;font-weight:500;color:${T.muted};width:100%;text-align:left;transition:.12s}
.navitem:hover{background:${T.paper};color:${T.ink}}
.navitem.on{background:var(--accent);color:#fff}
.navitem.on svg{color:#fff}
.main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:18px 34px;border-bottom:1px solid ${T.hairline};background:${T.paper};
  position:sticky;top:0;z-index:5}
.content{padding:30px 34px 60px;max-width:1160px;width:100%}
.skin{display:inline-flex;background:${T.surface};border:1px solid ${T.hairline};
  border-radius:999px;padding:3px}
.skin button{padding:6px 14px;border-radius:999px;font-size:12.5px;font-weight:600;color:${T.muted}}
.skin button.on{color:#fff}

/* primitives */
.card{background:${T.surface};border:1px solid ${T.hairline};border-radius:18px;padding:20px}
.h1{font-size:27px;font-weight:700}
.sub{color:${T.muted};font-size:14px;margin-top:3px}
.grid{display:grid;gap:16px}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;
  padding:3px 9px;border-radius:999px;font-family:'IBM Plex Mono',monospace}
.btn{display:inline-flex;align-items:center;gap:7px;background:var(--accent);color:#fff;
  font-weight:600;font-size:13px;padding:8px 14px;border-radius:999px;transition:.12s}
.btn:hover{filter:brightness(.93)}
.btn.ghost{background:transparent;color:${T.ink};border:1px solid ${T.hairline}}
.btn.ghost:hover{background:${T.paper};filter:none}
.stat .n{font-family:'Schibsted Grotesk';font-size:38px;font-weight:800;letter-spacing:-.03em;line-height:1}
.stat .l{font-size:12.5px;color:${T.muted};margin-top:7px}
table{width:100%;border-collapse:collapse}
th{font-family:'IBM Plex Mono';font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
  color:${T.muted};text-align:left;padding:10px 12px;border-bottom:1px solid ${T.hairline};font-weight:500}
td{padding:11px 12px;border-bottom:1px solid ${T.hairline};font-size:13.5px;vertical-align:middle}
tr:last-child td{border-bottom:none}
.scorebox{width:54px;padding:5px 7px;border:1px solid ${T.hairline};border-radius:8px;
  font-family:'IBM Plex Mono';font-size:13px;text-align:center;background:${T.paper}}
.mini{font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;border:1px solid ${T.hairline};
  background:${T.surface};color:${T.muted}}
.mini.on{border-color:var(--accent);color:var(--accent);background:${T.surface}}
.col{background:${T.paper};border:1px solid ${T.hairline};border-radius:14px;padding:12px;min-width:0}
.board{display:grid;grid-template-columns:repeat(6,minmax(158px,1fr));gap:10px;overflow-x:auto;padding-bottom:6px}
@media(max-width:860px){.board{grid-template-columns:repeat(6,minmax(150px,1fr))}}
.kchip{background:${T.surface};border:1px solid ${T.hairline};border-radius:11px;padding:11px;margin-top:9px}
.tabs{display:inline-flex;gap:4px;background:${T.surface};border:1px solid ${T.hairline};
  border-radius:11px;padding:3px}
.tabs button{padding:6px 13px;border-radius:8px;font-size:13px;font-weight:600;color:${T.muted}}
.tabs button.on{background:var(--accent);color:#fff}
.swim{display:flex;align-items:center;gap:14px}
.track{flex:1;height:9px;border-radius:999px;background:${T.hairline};overflow:hidden}
.track>div{height:100%;border-radius:999px;background:var(--accent)}
.utilbtn{display:none}
.savechip{display:inline-flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;
  font-size:11px;color:${T.muted};white-space:nowrap}
.utilpanel{position:absolute;right:16px;top:60px;z-index:20;background:${T.surface};
  border:1px solid ${T.hairline};border-radius:14px;padding:12px;min-width:230px;
  box-shadow:0 8px 24px rgba(0,0,0,.08)}
@media(min-width:861px){.utilpanel{display:none}}
/* Summary rows keep their figures on one line where there is room, and wrap
   onto their own line rather than widening the page where there is not. */
.callrow{flex-wrap:wrap}
.callrow .nums{white-space:nowrap}
@media(max-width:520px){.callrow .nums{white-space:normal}}

@media(max-width:860px){
  /* The session row's columns are fixed-width and total more than a phone
     screen, so they wrap instead of pushing the page sideways. */
  .sessionrow{flex-wrap:wrap}
}
@media(max-width:1000px){
  /* Inline grid-template-columns is set per screen, so it has to be overridden
     here to let two- and three-column layouts stack on small viewports. */
  .gcs .grid.resp{grid-template-columns:1fr !important}
}
@media(max-width:860px){
  .utilbtn{display:inline-flex}
  .gcs{flex-direction:column}
  .side{width:100%;flex:0 0 auto;height:auto;position:sticky;top:0;flex-direction:row;
    align-items:center;gap:6px;overflow-x:auto;padding:10px 12px;border-right:none;
    border-bottom:1px solid ${T.hairline};z-index:6}
  .side .brandtext{display:none}
  .sidefoot{display:none}
  .navitem{width:auto;white-space:nowrap;flex:0 0 auto;padding:8px 11px}
  .content,.topbar{padding-left:18px;padding-right:18px}
}
.drop{border:1.5px dashed ${T.hairline};border-radius:14px;padding:15px 16px;display:flex;
  align-items:center;gap:13px;background:${T.surface};transition:.12s;cursor:pointer;width:100%;text-align:left}
.drop:hover{border-color:var(--accent)}
.drop.drag{border-color:var(--accent);background:${T.paper}}
.drop .ic{width:38px;height:38px;border-radius:11px;background:${T.paper};color:var(--accent);
  display:grid;place-items:center;flex:0 0 38px}
.importbar{display:flex;align-items:center;gap:11px;font-size:13px;flex-wrap:wrap}
.chk{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid ${T.hairline};
  font-size:13.5px;cursor:pointer;width:100%;text-align:left;background:none}
.chk:last-child{border-bottom:none}
.chk.done .lbl{text-decoration:line-through;color:${T.muted}}
.chk .owner{font-size:10.5px;color:${T.muted};margin-left:auto;font-family:'IBM Plex Mono';white-space:nowrap}
.chip{font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;border:1px solid ${T.hairline};
  background:${T.surface};color:${T.muted};max-width:230px;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;vertical-align:middle}
.chip.on{border-color:var(--accent);color:#fff;background:var(--accent)}
.chipx{display:inline-flex;align-items:center;gap:7px;max-width:300px}
.chipx .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.chipx .n{flex:0 0 auto;font-family:'IBM Plex Mono',monospace;font-size:10px;opacity:.85}
.chiprow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.calstrip{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;overflow-x:auto}
.calcell{border:1px solid ${T.hairline};border-radius:10px;padding:8px 6px;min-height:78px;
  background:${T.surface};min-width:62px}
.calcell .mo{font-family:'IBM Plex Mono';font-size:10px;color:${T.muted};text-transform:uppercase;letter-spacing:.06em}
.calcell.cur{background:${T.paper};border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.evt{font-size:10px;font-weight:700;margin-top:5px;padding:3px 5px;border-radius:6px;line-height:1.15;color:#fff}
.search{display:flex;align-items:center;gap:8px;border:1px solid ${T.hairline};border-radius:11px;
  padding:9px 12px;background:${T.surface};max-width:340px}
.search input{border:none;outline:none;font-family:inherit;font-size:13px;width:100%;background:transparent;color:${T.ink}}
.scards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:13px}
.award{font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;font-family:'IBM Plex Mono';color:#fff}

/* inline fields — focus styling in CSS rather than by mutating the DOM node */
.einput{padding:6px 8px;border:1px solid transparent;border-radius:8px;font-family:inherit;
  font-size:13px;background:transparent;color:${T.ink};transition:.12s}
.einput::placeholder{color:#A8A29C}
.einput:hover{border-color:${T.hairline}}
.einput:focus{background:${T.paper};border-color:${T.hairline};outline:none;
  box-shadow:0 0 0 2px ${T.hairline}}
.notefield{width:100%;padding:7px 9px;border:1px solid ${T.hairline};border-radius:9px;
  font-family:inherit;font-size:13px;line-height:1.5;background:${T.surface};color:${T.ink};
  resize:vertical;box-sizing:border-box;overflow:hidden;min-height:34px;display:block}
.notefield::placeholder{color:#A8A29C}
.notefield:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px ${T.hairline}}
.datefield{padding:5px 8px;border:1px solid ${T.hairline};border-radius:8px;font-size:12px;
  background:${T.surface};color:${T.ink};font-family:'IBM Plex Mono',monospace}
.datefield:focus{outline:none;border-color:var(--accent)}

/* call grouping — a themed band per call so two calls never read as one list */
.callband{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 14px;
  border-radius:14px 14px 0 0;border:1px solid ${T.hairline};border-bottom:none;background:${T.surface}}
.callband .dot{width:10px;height:10px;border-radius:999px;flex:0 0 10px}
.callgroup{border:1px solid ${T.hairline};border-radius:0 0 14px 14px;background:${T.surface};
  padding:4px 14px 10px;overflow-x:auto}
.callgroup+.callband{margin-top:20px}
.calltag{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;
  font-family:'IBM Plex Mono',monospace;color:#fff;white-space:nowrap}

/* deliverables */
.delrow{display:flex;align-items:flex-start;gap:12px;padding:10px 0;
  border-bottom:1px solid ${T.hairline};flex-wrap:wrap}
.delrow:last-child{border-bottom:none}
/* Fixed-width status column so the titles line up down the list. */
.delrow>.pill{flex:0 0 132px;justify-content:center;margin-top:1px}
@media(max-width:640px){.delrow>.pill{flex:0 0 auto}}
.badge{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 5px;
  border-radius:999px;font-size:10px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:#fff}
.empty{color:${T.muted};font-size:13px;padding:14px 0;text-align:center}

`;

/* ---------- sample data ---------- */
const MONTHS = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const PHASE_BY_MONTH = {
  Sep:"Kickoff", Oct:"Programming + Homecoming", Nov:"Programming", Dec:"Programming",
  Jan:"Programming", Feb:"Promo season", Mar:"Demo Day + calls open", Apr:"Submissions",
  May:"Submissions", Jun:"Selection", Jul:"Selection", Aug:"Onboarding",
};
const NOW = new Date();
const CURRENT = NOW.toLocaleString("en-US", { month: "short" }); // e.g. "Jun" — updates automatically
/* Sections stored as lists; used to sanity-check restored backups.
   Note: `attendance` is deliberately absent — it is an object map
   (sessionId → {personKey: status}), not a list. */
const ARRAY_SECTIONS = new Set([
  "cycles", "calls", "teams", "classes", "pizza", "sessions",
  "events", "demochecklist", "road", "cohorts", "alumni", "results",
  "eventChecklists", "teamProfiles", "kb", "phase2Teams",
]);

/* cycles: the registry lives in cloud storage (global scope); this is only the first-run seed */
const SEED_CYCLES = [{ id: "2026-27", label: "2026–27", status: "active" }];
const nextCycleLabel = (label) => {
  const m = String(label).match(/(\d{4})/);
  if (!m) return "";
  const y = Number(m[1]) + 1;
  return `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
};
const PHASE_SHORT = (PHASE_BY_MONTH[CURRENT] || "").split(/[ +]/)[0].toUpperCase();

const STAGES = [
  { id:"flagged",   label:"Flagged" },
  { id:"invited",   label:"Invited" },
  { id:"responded", label:"Responded" },
  { id:"scheduled", label:"Scheduled" },
  { id:"completed", label:"Completed" },
  { id:"decided",   label:"Decided" },
];

const JUDGES = 6;            // panel size
const MAX_SCORE = JUDGES * 5; // each judge scores /5 → 30 ceiling
const SEED_TEAMS = [
  { id:1, name:"NeuroWeave", blurb:"Adaptive EEG headband for focus training", callId:"regular", flaggedBy:["Judges","Program team"], score:26, stage:"scheduled", agreed:"yes", date:"Jul 4, 10:00", outcome:null },
  { id:2, name:"HydroSense", blurb:"Low-cost lead sensors for municipal water", callId:"regular", flaggedBy:["Judges"], score:22, stage:"responded", agreed:"yes", date:"", outcome:null },
  { id:3, name:"GridGuard", blurb:"Anomaly detection for grid SCADA networks", callId:"special-1", flaggedBy:["Judges","Program team"], score:27, stage:"completed", agreed:"yes", date:"Jul 2, 14:30", outcome:"select" },
  { id:4, name:"TerraCast", blurb:"Soil-carbon modelling for small farms", callId:"regular", flaggedBy:["Program team"], score:19, stage:"invited", agreed:"pending", date:"", outcome:null },
  { id:5, name:"PhishFence", blurb:"On-device phishing detection for SMBs", callId:"special-1", flaggedBy:["Judges"], score:21, stage:"flagged", agreed:"pending", date:"", outcome:null },
  { id:6, name:"MediMesh", blurb:"Mesh network for rural clinic devices", callId:"regular", flaggedBy:["Judges","Program team"], score:24, stage:"completed", agreed:"yes", date:"Jul 1, 11:00", outcome:"waitlist" },
  { id:7, name:"AeroPatch", blurb:"Drone-applied crop micro-treatments", callId:"regular", flaggedBy:["Judges"], score:16, stage:"responded", agreed:"declined", date:"", outcome:null },
  { id:8, name:"CipherVault", blurb:"Post-quantum key vault for IoT fleets", callId:"special-1", flaggedBy:["Judges","Program team"], score:27, stage:"scheduled", agreed:"yes", date:"Jul 5, 09:30", outcome:null },
];

const CLASSES = [
  { course: "ENGR 290 — Engineering Design", prof: "Dr. A. Khoury", date: "Feb 11", campus: "SGW", calls: ["regular", "special-1"], done: true },
  { course: "COMP 6231 — Distributed Systems", prof: "Dr. L. Tremblay", date: "Feb 18", campus: "SGW", calls: ["special-1"], done: true },
  { course: "MECH 393 — Capstone", prof: "Dr. R. Okafor", date: "Mar 3", campus: "Loyola", calls: ["regular"], done: false },
  { course: "INSE 6130 — OS Security", prof: "Dr. M. Debbabi", date: "Mar 6", campus: "SGW", calls: ["special-1"], done: false },
];

const PIZZA = [
  { title: "Pizza Q&A · Hall building", date: "Feb 13", time: "12:00", room: "H-820", reg: 42, done: true },
  { title: "Pizza Q&A · EV building", date: "Feb 27", time: "13:00", room: "EV-2.184", reg: 35, done: true },
  { title: "Pizza Q&A · Special call info", date: "Mar 5", time: "12:30", room: "EV-3.309", reg: 28, done: false },
];

/* configurable calls — each has its own topic + colour, like the switcher.
   PALETTE is imported from ./lib/theme. */
const SEED_CALLS = [
  { id: "regular", name: "Regular", topic: "Open to all GCS student projects", accent: "#912338", open: "Mar 2", close: "May 8", subs: 34, fixed: true },
  { id: "special-1", name: "Special", topic: "Cybersecurity", accent: "#057D78", open: "Mar 2", close: "May 8", subs: 13 },
];

/* critical dates for the planning calendar */
const CRITICAL = [
  { m: "Sep", label: "Kickoff", date: "Sep 12" },
  { m: "Oct", label: "Homecoming", date: "Oct 17" },
  { m: "Feb", label: "Promo opens", date: "Feb 1" },
  { m: "Mar", label: "Calls open", date: "Mar 2" },
  { m: "Mar", label: "Demo Day", date: "Mar 27", key: true },
  { m: "May", label: "Calls close", date: "May 8" },
  { m: "Jun", label: "Selection", date: "Jun 1" },
];

/* Demo Day prep checklist — sourced from the program's process doc */
const DEMO_CHECKLIST = [
  { group: "Logistics", items: [
    ["Set Demo Day date (gauge cohort readiness)", "Program team"],
    ["Confirm Dr. Shihab's availability", "Anne-Marie"],
    ["Book the room", "Greg · Bookings"],
    ["Send room template to Facilities", "Program team"],
    ["Secure the Dean's presence", "Program team"],
    ["Book AV & setup", "Nikki"],
    ["Select & retain catering", "Program team"],
    ["Secure photographer", "Program team"],
  ]},
  { group: "Invitations", items: [
    ["Validate judges with Dr. Nik-Bakht", "Program team"],
    ["Send judge invitations & record confirmations", "Program team"],
    ["Send calendar hold to judges", "Program team"],
    ["Invite mentors", "Program team"],
    ["Invite VC firms (Anges QC, Axelys, Cycle Capital…)", "Program team"],
    ["Invite Luke Quin, Hala & advancement office", "Program team"],
    ["Share with Michelle, Samia, Rhonda → donors & prospects", "Advancement"],
    ["Ask Vincent to reach faculty & students", "Vincent"],
  ]},
  { group: "Content & rehearsals", items: [
    ["Create Eventbrite / Grenadine listing", "Christina S-G"],
    ["Get approval — Guillermo, then Dr. Shihab", "Guillermo"],
    ["Start 'Road to Demo Day' weekly rehearsals", "Program team"],
    ["Prepare 3 team-summary slides", "Program team"],
    ["Collect logos & descriptions from teams", "Program team"],
    ["Collect final presentations", "Program team"],
    ["Run the in-person Demo Day trial", "Program team"],
  ]},
  { group: "Week of Demo Day", items: [
    ["Print judges' names on the fancy paper", "Program team"],
    ["Send reminder to registration list", "Program team"],
  ]},
];

/* Road to Demo Day — rehearsal tracking for the cohort approaching its Demo Day */
const ROAD_TEAMS = [
  { team: "GoniVision", lastSeen: "Mar 2", runs: 3, status: "ready" },
  { team: "Ready Plan Go", lastSeen: "Mar 1", runs: 2, status: "progress" },
  { team: "Re:CON", lastSeen: "Feb 24", runs: 2, status: "progress" },
  { team: "Temperise", lastSeen: "Feb 20", runs: 1, status: "progress" },
  { team: "Smooth Detector", lastSeen: "—", runs: 0, status: "notstarted" },
];

/* Former-cohort success library — for promoting past teams' wins */
const COHORTS = [
  { c: "Cohort 1", year: "2022", teams: [
    { name: "Microlock", blurb: "Hand-hygiene scanner that audits handwashing to curb infection spread.", awards: ["Most Innovative"], phase2: false },
    { name: "Parklive", blurb: "Montreal parking app with pre-planned commutes and spot-finding.", awards: ["Audience"], phase2: false },
    { name: "Alvia", blurb: "Wildfire threat assessment via drones and mapping.", awards: ["Judges"], phase2: true, note: "Servicing a large industrial client" },
    { name: "OurPwr", blurb: "Wearable safety alert for people who feel under threat.", awards: ["Judges"], phase2: true, note: "Launching June 2026" },
    { name: "Xact", blurb: "ML-guided patient positioning for clearer X-rays.", awards: ["Most Innovative"], phase2: false },
    { name: "Yetti SRB", blurb: "Electric remote-controlled snow-removal robot.", awards: [], phase2: false },
  ]},
  { c: "Cohort 2", year: "Spring 2023", teams: [
    { name: "Nova Food", blurb: "Scan-your-receipt grocery app for financial, dietary and eco advice.", awards: [], phase2: false },
    { name: "BetterU", blurb: "Marketplace for trainers, coaches and nutritionists to find clients.", awards: [], phase2: false },
    { name: "InsightWear AI", blurb: "Assistive wearable using OCR + haptics to guide the visually impaired.", awards: ["Judges"], phase2: true },
    { name: "CapmAI", blurb: "Deep-learning add-on that classifies capsule-endoscopy images.", awards: ["Audience", "Most Innovative"], phase2: false },
  ]},
  { c: "Cohort 3", year: "May 2024", teams: [
    { name: "Lodavo", blurb: "Makes saving fun — save money to earn prize-draw tickets.", awards: [], phase2: false },
    { name: "QuoteNet", blurb: "AR + AI painting-estimate app for contractors.", awards: ["Public's Choice", "Judges"], phase2: true },
    { name: "Ploomba", blurb: "Autonomous agritech robots + AI analytics for farms.", awards: ["Judges"], phase2: true },
    { name: "Abraider", blurb: "First handheld device that braids afro-textured hair fast.", awards: ["Most Innovative"], phase2: false },
    { name: "HomeEatz", blurb: "Community platform connecting home cooks to local customers.", awards: [], phase2: false },
  ]},
  { c: "Cohort 4 & 5", year: "Fall 2024", teams: [
    { name: "JAMS", blurb: "AR music platform with AI feedback to keep beginner guitarists going.", awards: ["Judges"], phase2: true },
    { name: "Metabolight", blurb: "High-throughput screening + fermentation for sustainable chemicals.", awards: ["Most Innovative", "Judges"], phase2: true },
    { name: "Keaty", blurb: "Chatbot that helps students manage time and find campus resources.", awards: ["Judges"], phase2: true },
    { name: "Pryvnt", blurb: "External ankle brace worn outside the cleat for soccer & football.", awards: [], phase2: false },
    { name: "HireUp", blurb: "Tech recruitment via skills competitions for faster, unbiased hiring.", awards: [], phase2: false },
    { name: "Edge Star AI", blurb: "Autonomous eco-friendly lawn-care robot.", awards: ["Most Innovative"], phase2: false },
    { name: "Tangify", blurb: "Portable weight-monitoring for free-ranging beef cattle.", awards: [], phase2: false },
  ]},
  { c: "Cohort 6", year: "Jan 2026", teams: [
    { name: "Smooth Detector", blurb: "Multimodal fake-news detection API with uncertainty scoring.", awards: [], phase2: false },
    { name: "Temperise", blurb: "Patented biodegradable thermal battery — 1000 W, −50 to +60 °C.", awards: [], phase2: false },
    { name: "Ready Plan Go", blurb: "AI tax-automation back office for accounting firms.", awards: [], phase2: false, note: "Clients live in US & Canada" },
    { name: "Re:CON", blurb: "In-situ automated fiber placement — 87% faster composite cycles.", awards: [], phase2: false, note: "In pilot testing" },
    { name: "GoniVision", blurb: "Equipment-free AI computer-vision goniometer for range-of-motion.", awards: ["Public's Choice", "Judges"], phase2: false },
  ]},
];
const AWARD_COLOR = { "Judges": T.burgundy, "Most Innovative": T.gold, "Audience": T.turquoise, "Public's Choice": T.info };
const AWARDS = ["Judges", "Most Innovative", "Audience", "Public's Choice"];

const SESSIONS = [
  { date:"Sep 12", time:"16:00–17:00", place:"EV2.309", title:"Kickoff — rules, entrepreneurship, VC primer", who:"Pascal Dubois · Arman · Riccardo (D3)", kind:"milestone", done:true },
  { date:"Oct 3",  time:"16:00–18:00", place:"EV2.309", title:"Fundamentals of entrepreneurship", who:"Ehsan Derayati", kind:"talk", done:true },
  { date:"Oct 17", time:"16:00–18:00", place:"EV2.309", title:"Homecoming — alumni mixer", who:"Past cohorts", kind:"community", done:true },
  { date:"Nov 7",  time:"16:00–18:00", place:"EV2.309", title:"VC funding", who:"Riccardo (D3)", kind:"talk", done:false },
  { date:"Nov 21", time:"16:00–18:00", place:"EV2.309", title:"Storytelling", who:"Johanne Pelletier", kind:"talk", done:false },
  { date:"Dec 5",  time:"16:00–18:00", place:"EV2.309", title:"Monthly progress meetings", who:"Program team × teams", kind:"meeting", done:false },
  { date:"Jan 16", time:"16:00–18:00", place:"EV2.309", title:"Philosophy of entrepreneurship", who:"Pierre Chamberland", kind:"talk", done:false },
  { date:"Feb 6",  time:"16:00–18:00", place:"EV2.309", title:"From the field — Innovation Fund graduate", who:"Alumni guest", kind:"talk", done:false },
  { date:"Feb 20", time:"16:00–18:00", place:"EV2.309", title:"Intellectual property", who:"Denis Keseris", kind:"talk", done:false },
  { date:"Mar 6",  time:"16:00–18:00", place:"EV2.309", title:"Extra session (topic TBD)", who:"To be confirmed", kind:"talk", done:false },
  { date:"Mar 27", time:"TBD", place:"TBD", title:"Demo Day", who:"All teams", kind:"milestone", done:false },
];

const SEED_ALUMNI = [
  { team:"SolarSkin", year:"2023", contact:"founders@solarskin.io", status:"coming" },
  { team:"BioLume", year:"2023", contact:"hello@biolume.co", status:"coming" },
  { team:"RailSense", year:"2024", contact:"team@railsense.ca", status:"maybe" },
  { team:"VoltLoop", year:"2024", contact:"info@voltloop.dev", status:"coming" },
  { team:"AquaTrace", year:"2024", contact:"contact@aquatrace.io", status:"pending" },
  { team:"FormFit", year:"2025", contact:"crew@formfit.app", status:"no" },
  { team:"PavePrint", year:"2025", contact:"build@paveprint.co", status:"coming" },
];

/* ---------- airtable export parsing ---------- */
const pickCol = (headers, re) => headers.find((h) => re.test(String(h).toLowerCase().trim()));
export const mapAgreed = (v) => {
  const s = String(v).toLowerCase();
  if (/declin|reject|can.?t|^no\b|unavail/.test(s)) return "declined";
  if (/yes|agree|confirm|accept|attend|✓/.test(s)) return "yes";
  return "pending";
};
export const mapOutcome = (v) => {
  const s = String(v).toLowerCase().trim();
  if (!s) return null;
  if (/wait/.test(s)) return "waitlist";
  if (/reject|declin|not\s?select|cut|^no\b/.test(s)) return "reject";
  if (/select|accept|award|win|fund|advance/.test(s)) return "select";
  return null;
};
export const mapStage = (v, hasDate, outcome) => {
  const s = String(v).toLowerCase().trim();
  const hit = STAGES.find((st) => s.includes(st.id) || s.includes(st.label.toLowerCase()));
  if (hit) return hit.id;
  if (outcome) return "decided";
  if (hasDate) return "scheduled";
  return "flagged";
};
const splitList = (v) => String(v).split(/[;,/|]/).map((x) => x.trim()).filter(Boolean);

/**
 * Parse an Airtable/Excel export into pipeline teams.
 *
 * `callList` resolves the call column onto a real call id, so a themed call
 * lands in its own group rather than being flattened to "special".
 * `existing` lets a re-import keep a team's id when the name is unchanged,
 * which preserves the link from Team profiles and Demo Day results.
 */
export function rowsToTeams(rows, callList = [], existing = []) {
  const clean = (rows || []).filter((r) => r && Object.keys(r).length);
  if (!clean.length) return [];
  const priorId = new Map(
    (existing || [])
      .filter((t) => t && t.name)
      .map((t) => [String(t.name).trim().toLowerCase(), t.id])
  );
  const headers = Object.keys(clean[0]);
  const hName = pickCol(headers, /team|project|name|startup|venture/);
  if (!hName) return [];
  const hBlurb = pickCol(headers, /blurb|descr|summary|pitch|idea|one.?lin|tagline|about|problem|value|proposition|statement/);
  const hCohort = pickCol(headers, /cohort|call|track|stream|special|theme|stage.?type/);
  const hScore = pickCol(headers, /score|total|rating|eval|points|mark|average/);
  const hFlag = pickCol(headers, /flag|interview.?by|recommend|shortlist|requested|nominat|pick/);
  const hAgreed = pickCol(headers, /agreed|response|rsvp|confirm|accept|attending|reply/);
  const hDate = pickCol(headers, /date|scheduled|slot|when|^time/);
  const hOutcome = pickCol(headers, /outcome|decision|result|selected|verdict/);
  const hStage = pickCol(headers, /stage|pipeline|step|status|phase/);
  return clean
    .map((r, i) => {
      const name = String(r[hName] ?? "").trim();
      if (!name) return null;
      const rawScore = hScore ? String(r[hScore]).replace(/[^\d.]/g, "") : "";
      const score = rawScore ? Math.min(Math.round(parseFloat(rawScore)), MAX_SCORE) : null;
      const date = hDate ? String(r[hDate] ?? "").trim() : "";
      const outcome = hOutcome ? mapOutcome(r[hOutcome]) : null;
      const flags = hFlag ? splitList(r[hFlag]) : [];
      return {
        id: priorId.get(name.toLowerCase()) ?? i + 1,
        name,
        blurb: hBlurb ? String(r[hBlurb] ?? "").trim() : "",
        callId: hCohort ? matchCall(r[hCohort], callList) : legacyCallId("regular", callList),
        flaggedBy: flags.length ? flags : [],
        score: Number.isNaN(score) ? null : score,
        stage: mapStage(hStage ? r[hStage] : "", !!date, outcome),
        agreed: hAgreed ? mapAgreed(r[hAgreed]) : "pending",
        date,
        outcome,
      };
    })
    .filter(Boolean);
}

/* ---------- helpers ---------- */
const Pill = ({ bg, fg, children }) => (
  <span className="pill" style={{ background: bg, color: fg }}>{children}</span>
);
const EInput = ({ value, onChange, placeholder, w, mono, align, title, ariaLabel }) => (
  <input
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    title={title}
    aria-label={ariaLabel || placeholder}
    className={"einput" + (mono ? " mono" : "")}
    style={{ width: w || "100%", textAlign: align || "left" }}
  />
);

/* Icon-only control. Every one carries a label so the screen is navigable
   without sight of the glyph. */
const IconBtn = ({ onClick, title, children, color, disabled, style }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    style={{
      color: color || T.muted, display: "grid", placeItems: "center", padding: 3,
      opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer", ...style,
    }}
  >
    {children}
  </button>
);

/* ---------- annual wheel (signature element) ---------- */
function Wheel({ accent }) {
  const cx = 160, cy = 160;
  const polar = (r, a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const annular = (rI, rO, a0, a1) => {
    const o0 = polar(rO, a0), o1 = polar(rO, a1), i1 = polar(rI, a1), i0 = polar(rI, a0);
    const big = a1 - a0 > 180 ? 1 : 0;
    return `M ${o0.x} ${o0.y} A ${rO} ${rO} 0 ${big} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${rI} ${rI} 0 ${big} 0 ${i0.x} ${i0.y} Z`;
  };
  const curIdx = MONTHS.indexOf(CURRENT);
  const events = [
    { m: "Sep", label: "Kickoff", color: accent },
    { m: "Oct", label: "Homecoming", color: T.gold },
    { m: "Mar", label: "Demo Day", color: accent },
  ];
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}>
      {/* programming season band: Sep..Mar = idx 0..6 */}
      <path d={annular(96, 120, 0, 7 * 30)} fill={accent} opacity="0.12" />
      {/* current-month wedge */}
      <path d={annular(94, 122, curIdx * 30, curIdx * 30 + 30)} fill={accent} opacity="0.9" />
      {/* month ticks + labels */}
      {MONTHS.map((m, i) => {
        const a = i * 30 + 15;
        const p = polar(140, a);
        const isCur = i === curIdx;
        return (
          <text key={m} x={p.x} y={p.y + 4} textAnchor="middle"
            fontFamily="IBM Plex Mono" fontSize="11"
            fontWeight={isCur ? 700 : 400} fill={isCur ? accent : T.muted}>{m}</text>
        );
      })}
      {/* event dots */}
      {events.map((e) => {
        const a = MONTHS.indexOf(e.m) * 30 + 15;
        const p = polar(108, a);
        return <circle key={e.label} cx={p.x} cy={p.y} r="4.5" fill={e.color} stroke="#fff" strokeWidth="2" />;
      })}
      {/* center */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontFamily="Schibsted Grotesk" fontWeight="800" fontSize="34" fill={T.ink}>{CURRENT.toUpperCase()}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9.5" letterSpacing="1.2" fill={accent}>{PHASE_SHORT}</text>
    </svg>
  );
}

const FLAT_CHECK = DEMO_CHECKLIST.flatMap((g, gi) =>
  g.items.map((it, ii) => ({ id: `${gi}-${ii}`, group: g.group, label: it[0], owner: it[1] }))
);
const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/**
 * Stamp a stable id onto every row of a list section that lacks one.
 *
 * React keys must be stable. Keying an editable row by its array index means
 * that deleting row 2 makes React reuse row 3's DOM node for row 2 — which
 * moves the caret and swaps the value under the user's cursor mid-edit. Rows
 * saved before ids existed are stamped once, lazily, and the write is a
 * one-time convergence per section.
 */
function useStableIds(list, setList, key = "rid") {
  useEffect(() => {
    const needs = (x) => x && typeof x === "object" && !x[key];
    if (Array.isArray(list) && list.some(needs)) {
      setList((l) => l.map((x) => (needs(x) ? { ...x, [key]: uid() } : x)));
    }
    // `setList` is recreated each render; the guard above makes re-runs no-ops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);
}

/* ---------- events: each cycle carries its own set of event checklists,
   cloned from these templates. Kickoff includes the August onboarding steps. */
const KICKOFF_TEMPLATE = [
  ["Logistics", "Set kickoff date & book the room", "Georgia"],
  ["Logistics", "Send calendar invites to all teams", "Program team"],
  ["Logistics", "AV check in the room", "Program team"],
  ["Logistics", "Order pizza / catering", "Georgia"],
  ["Cohort onboarding", "Collect signed participation agreements", "Pascal"],
  ["Cohort onboarding", "Confirm Financial Services accounts opened per team", "Georgia"],
  ["Cohort onboarding", "Collect team logos & one-liners", "Program team"],
  ["Cohort onboarding", "Add teams to the cohort mailing list", "Program team"],
  ["Content", "Update the rules presentation", "Pascal"],
  ["Content", "Confirm Arman — entrepreneurship talk", "Pascal"],
  ["Content", "Confirm Riccardo (D3) — 15 minutes", "Pascal"],
];
const HOMECOMING_TEMPLATE = [
  ["Logistics", "Set the date & book the venue", "Georgia"],
  ["Logistics", "Catering", "Georgia"],
  ["Logistics", "Name tags", "Georgia"],
  ["Logistics", "Photographer", "Program team"],
  ["Invitations", "Build the alumni invite list from the Cohorts library", "Program team"],
  ["Invitations", "Send invitations", "Program team"],
  ["Invitations", "Track RSVPs in the Cohorts tab", "Program team"],
  ["On the night", "Plan the mixer / intro activity", "Program team"],
  ["After", "Send thank-yous", "Pascal"],
  ["After", "Update traction notes from conversations", "Pascal"],
];
const DEFAULT_EVENTS = () => ([
  { id: "ev-kickoff", key: "kickoff", name: "Kickoff", date: "Sep",
    items: KICKOFF_TEMPLATE.map((t, i) => ({ id: `ko-${i}`, group: t[0], label: t[1], owner: t[2], done: false })) },
  { id: "ev-homecoming", key: "homecoming", name: "Homecoming", date: "Oct",
    items: HOMECOMING_TEMPLATE.map((t, i) => ({ id: `hc-${i}`, group: t[0], label: t[1], owner: t[2], done: false })) },
  { id: "ev-demoday", key: "demoday", name: "Demo Day", date: "end Mar",
    items: FLAT_CHECK.map((i) => ({ id: `dd-${i.id}`, group: i.group, label: i.label, owner: i.owner, done: false })) },
]);
const EV_SEED = DEFAULT_EVENTS();

/* ---------- knowledge base: internal team answer sheet (global scope).
   Seeded only from the kickoff deck + locked program decisions; anything I
   could not source is marked draft:true for Pascal to confirm — no invented
   policy. */
const KB_SEED = [
  { id: "kb-r1", category: "rules", draft: false, title: "Mission",
    body: "The GCS Innovation Fund supports innovative student-led projects with strong commercialization potential. It provides financial and mentoring support and grows the school's innovation success stories." },
  { id: "kb-r2", category: "rules", draft: false, title: "Who can apply",
    body: "Student-led projects from the Gina Cody School of Engineering and Computer Science. Each year there are two parallel calls: the Regular call, open to all GCS student projects, and a themed Special call (the topic changes each cycle)." },
  { id: "kb-r3", category: "rules", draft: false, title: "The two phases",
    body: "Phase 1 — Seed program: the cohort year, September to March. Technology and market development, expert mentorship, the presentation series, monthly check-ins, and preparation for Demo Day.\n\nPhase 2 — Maturation: awarded after the Demo Day pitch to a panel of expert judges. Selected projects receive up to $50,000 per year to build a prototype, find product–market fit, and secure initial clients and funding.\n\nImportant vocabulary: being Selected at the June–July selection admits a team into the cohort. Funding is decided later, at Demo Day." },
  { id: "kb-r4", category: "rules", draft: false, title: "Eligible expenses",
    body: "Financial Services opens an account per funded project. Eligible categories: hiring individuals, materials & supplies, small equipment, software, and procurement of goods/services. (Not exhaustive — confirm specifics with Financial Services.)" },
  { id: "kb-r5", category: "rules", draft: false, title: "The annual calendar",
    body: "February–March: promo season (class visits, Pizza Q&As).\nMarch: Regular + Special calls open.\nEarly May: calls close.\nJune–July: selection — evaluation (6 judges scoring /5, total /30), interviews, decisions.\nAugust: onboarding.\nSeptember: kickoff.\nOctober: Homecoming.\nEnd of March: Demo Day, followed by Phase 2 funding decisions." },
  { id: "kb-f1", category: "faq", draft: false, title: "How much funding can a team receive?",
    body: "Up to $50,000 per year, in Phase 2, awarded after the Demo Day pitch. The Seed year itself centers on mentorship, programming, and development support." },
  { id: "kb-f2", category: "faq", draft: false, title: "When are applications due?",
    body: "Calls open in March and close in early May. Exact dates are set per cycle — check the current calls on the dashboard or the program page." },
  { id: "kb-f3", category: "faq", draft: true, title: "Can a team apply to both the Regular and Special calls?",
    body: "⚠ Draft — confirm the policy before quoting. Suggested answer: apply to the call that best fits the project; a Special-call project is by definition also within the Regular call's scope, so pick one." },
  { id: "kb-f4", category: "faq", draft: true, title: "Who owns the IP?",
    body: "⚠ Draft — confirm with Denis Keseris / the IP office before quoting. Concordia's IP policy applies; the program itself does not take equity or IP." },
  { id: "kb-f5", category: "faq", draft: true, title: "Is there a team size limit?",
    body: "⚠ Draft — confirm. No limit has been documented; the practical guidance has been a core team that can present and execute." },
  { id: "kb-f6", category: "faq", draft: false, title: "What happens if we're not selected?",
    body: "Teams can reapply in a future cycle, and waitlisted teams are contacted when the next calls open. Feedback is available on request." },
  { id: "kb-t1", category: "templates", draft: true, title: "Interview invitation (email)",
    body: "Subject: GCS Innovation Fund — interview invitation\n\nHi [team name],\n\nThank you for your application to the GCS Innovation Fund. The evaluation committee would like to invite you to a short interview about your project.\n\nCould you share your availability during [date range]? Interviews run about [20] minutes, [on campus / online].\n\nBest,\n[Name]\nResearch & Innovation, Gina Cody School" },
  { id: "kb-t2", category: "templates", draft: true, title: "Acceptance (email)",
    body: "Subject: Welcome to the GCS Innovation Fund\n\nHi [team name],\n\nCongratulations — your project has been selected for this year's cohort! The program runs September to March, ending at Demo Day.\n\nNext steps: [participation agreement] · [kickoff date & location] · [what to prepare].\n\nWe're glad to have you.\n[Name]" },
  { id: "kb-t3", category: "templates", draft: true, title: "Not selected, with feedback offer (email)",
    body: "Subject: GCS Innovation Fund — your application\n\nHi [team name],\n\nThank you for applying. This cycle was competitive and your project was not selected. We'd be glad to share the committee's feedback if useful — just reply to this email.\n\nCalls reopen in March, and we hope you'll consider applying again.\n\nBest,\n[Name]" },
  { id: "kb-t4", category: "templates", draft: true, title: "Waitlist (email)",
    body: "Subject: GCS Innovation Fund — waitlist\n\nHi [team name],\n\nYour project has been placed on this cycle's waitlist. If a spot opens before kickoff, we'll contact you right away — and when the next calls open we'll reach out directly.\n\nBest,\n[Name]" },
  { id: "kb-t5", category: "templates", draft: true, title: "Homecoming invitation (email)",
    body: "Subject: Homecoming — come meet the new cohort\n\nHi [name],\n\nEach October we bring past Innovation Fund teams back to meet the incoming cohort. This year: [date, time, place]. Food's on us.\n\nCan we count you in? [RSVP link]\n\n[Name]" },
];

/* ---------- phase 2: funded teams tracked across cohorts (global scope).
   Each carries the Maturation-year award, a payment ledger, and a meetings log.
   Seeded from the known Cohort 6 & 7 winners; amounts are the awards, paid
   records start empty for Pascal to fill as disbursements happen. */
const PHASE2_SEED = [
  { id: "p2-recon", team: "Re:CON", cohort: "Cohort 6", awarded: 25000, status: "active",
    note: "Most Innovative — automated fiber placement", payments: [], meetings: [] },
  { id: "p2-goni", team: "GoniVision", cohort: "Cohort 6", awarded: 25000, status: "active",
    note: "Public's Choice + Judges' — AI goniometry", payments: [], meetings: [] },
  { id: "p2-misc", team: "MiSC Robotics", cohort: "Cohort 7", awarded: 20000, status: "active",
    note: "Most Innovative + Judges' — affordable lab robots", payments: [], meetings: [] },
  { id: "p2-aegis", team: "AEGIS", cohort: "Cohort 7", awarded: 20000, status: "active",
    note: "Public's Choice + Judges' — cybersecurity training", payments: [], meetings: [] },
  { id: "p2-harv", team: "Har-V", cohort: "Cohort 7", awarded: 20000, status: "active",
    note: "Judges' — manufacturing knowledge memory", payments: [], meetings: [] },
];

/* ============================================================ */
export default function App() {
  const [view, setView] = useState("dashboard");

  /* ---- cycles: registry is global; everything operational is keyed by the viewed cycle ---- */
  const [cycles, setCycles, saveCycles] = useCloudSection("cycles", SEED_CYCLES, "global");
  const saveState = useSaveStatus();
  const [utilOpen, setUtilOpen] = useState(false);
  const activeCycle = cycles.find((c) => c.status === "active") || cycles[0] || SEED_CYCLES[0];
  const [viewCycleId, setViewCycleId] = useState(null); // null = follow the active cycle
  const cycleId = viewCycleId ?? activeCycle.id;
  const viewedCycle = cycles.find((c) => c.id === cycleId) || activeCycle;
  const isPastView = cycleId !== activeCycle.id;
  const [cyOpen, setCyOpen] = useState(false);
  const [newCyLabel, setNewCyLabel] = useState("");

  const [callList, setCallList] = useCloudSection("calls", SEED_CALLS, cycleId);
  const [activeCall, setActiveCall] = useState("regular");
  const [draft, setDraft] = useState({ open: false, name: "", topic: "", accent: PALETTE[1].hex });
  const [sessions, setSessions] = useCloudSection("sessions", SESSIONS, cycleId);
  const [psDraft, setPsDraft] = useState({ date: "", title: "", who: "" });
  const [progTab, setProgTab] = useState("sessions");
  const [teams, setTeams] = useCloudSection("teams", SEED_TEAMS, cycleId);
  const [callFilter, setCallFilter] = useState("all");   // Selection: which call's teams to show
  const [teamQuery, setTeamQuery] = useState("");        // Selection: free-text search
  const [teamsTab, setTeamsTab] = useState("profiles");  // Teams: profiles | deliverables
  const [alumni, setAlumni] = useCloudSection("alumni", SEED_ALUMNI, "global");
  const [selTab, setSelTab] = useState("list");
  const [dragId, setDragId] = useState(null);
  const [importedName, setImportedName] = useState(null);
  const [importError, setImportError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [classes, setClasses] = useCloudSection("classes", CLASSES, cycleId);
  const [pizza, setPizza] = useCloudSection("pizza", PIZZA, cycleId);
  const [evList, setEvList, saveEvList] = useCloudSection("eventChecklists", EV_SEED, cycleId);
  const [activeEvId, setActiveEvId] = useState(null);
  const [results, setResults] = useCloudSection("results", [], cycleId);
  const [profiles, setProfiles] = useCloudSection("teamProfiles", [], cycleId);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [kb, setKb] = useCloudSection("kb", KB_SEED, "global");
  const [phase2, setPhase2] = useCloudSection("phase2Teams", PHASE2_SEED, "global");
  const [activeP2Id, setActiveP2Id] = useState(null);
  const [kbTab, setKbTab] = useState("rules");
  const [kbQuery, setKbQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [road, setRoad] = useCloudSection("road", ROAD_TEAMS, cycleId);
  const [events, setEvents] = useCloudSection("events", CRITICAL, cycleId);
  const [evDraft, setEvDraft] = useState({ open: false, m: "Sep", label: "", color: PALETTE[2].hex });
  const [cohortsTab, setCohortsTab] = useState("success");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [query, setQuery] = useState("");
  /* The themed accent follows the selected call. If that call was deleted or
     the cycle's call list never had a "regular", fall back to the first call
     that does exist rather than leaving the switcher with nothing selected. */
  const accentObj = callList.find((c) => c.id === activeCall) || callList[0];
  const accent = accentObj ? accentObj.accent : T.burgundy;
  useEffect(() => {
    if (callList.length && !callList.some((c) => c.id === activeCall)) setActiveCall(callList[0].id);
  }, [callList, activeCall]);

  /* Deliverables: derived once and reused by the dashboard, the nav badge and
     the Teams screen, so every surface agrees on what is outstanding. */
  const deliverables = useMemo(() => deliverableSummary(profiles), [profiles]);

  /* Deleting a filled-in row has no undo and the trash icon sits right next
     to the fields, so anything carrying data asks first. Blank rows — the
     usual case, an "Add" clicked by mistake — are removed without a prompt. */
  const confirmDelete = async (label, hasContent) => {
    if (!hasContent) return true;
    return ui.confirm("This can't be undone.", { title: `Delete ${label}?`, confirmLabel: "Delete", danger: true });
  };

  const upd = (id, patch) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const cycleAgreed = (t) => {
    const order = ["pending", "yes", "declined"];
    upd(t.id, { agreed: order[(order.indexOf(t.agreed) + 1) % 3] });
  };
  // kanban: move a team to a stage, optionally inserting before another card (for ordering)
  const moveTeam = (id, targetStage, beforeId) => {
    setTeams((ts) => {
      const moving = ts.find((t) => t.id === id);
      if (!moving) return ts;
      const without = ts.filter((t) => t.id !== id);
      const updated = { ...moving, stage: targetStage };
      if (beforeId) {
        const idx = without.findIndex((t) => t.id === beforeId);
        if (idx >= 0) return [...without.slice(0, idx), updated, ...without.slice(idx)];
      }
      return [...without, updated];
    });
  };

  const ingest = async (rows, fname) => {
    let parsed;
    try {
      parsed = rowsToTeams(rows, callList, teams);
    } catch {
      setImportError("That file couldn't be read. Try re-exporting from Airtable as CSV or XLSX.");
      return;
    }
    if (!parsed.length) {
      setImportError("Couldn't find a team or project column. Check the export's column headers and try again.");
      return;
    }
    if (teams.length && !(await ui.confirm(
      `Replace the current ${teams.length} team${teams.length === 1 ? "" : "s"} with ${parsed.length} from this file?`,
      { title: "Replace the pipeline", confirmLabel: "Replace", danger: true }
    ))) return;
    setTeams(parsed);
    setImportedName(fname);
    setImportError(null);
    setSelTab("list");
    ui.toast(`Loaded ${parsed.length} team${parsed.length === 1 ? "" : "s"} from ${fname}.`);
  };
  const onFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    if (ext === "csv") {
      reader.onload = (e) => {
        const res = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
        ingest(res.data, file.name);
      };
      reader.onerror = () => setImportError("Couldn't read that file.");
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          ingest(rows, file.name);
        } catch (err) {
          setImportError("Couldn't read that spreadsheet. Make sure the first sheet has a header row.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError("Use a .csv, .xlsx, or .xls file.");
    }
  };
  const resetData = async () => {
    if (!(await ui.confirm("This replaces the current list with the sample teams.", { title: "Reset to sample data", confirmLabel: "Reset", danger: true }))) return;
    setTeams(SEED_TEAMS);
    setImportedName(null);
    setImportError(null);
  };

  /* ---- cycle rollover: create the next cycle, seed fresh templates, keep history browsable ---- */
  const startNewCycle = async () => {
    const label = (newCyLabel.trim() || nextCycleLabel(activeCycle.label)).trim();
    if (!label) return;
    const id = label.replace(/\s+/g, "").replace(/–/g, "-");
    if (cycles.some((c) => c.id === id)) { await ui.alert(`Cycle ${label} already exists.`); return; }
    if (!(await ui.confirm(
      `${activeCycle.label} becomes browsable history, and ${label} starts with fresh templates.`,
      { title: `Start cycle ${label}?`, confirmLabel: "Start cycle" }
    ))) return;
    const templates = {
      teams: [], classes: [], pizza: [], road: [], results: [], teamProfiles: [],
      attendance: {},
      sessions: SESSIONS.map((s) => ({ ...s, sid: uid(), done: false })),
      eventChecklists: DEFAULT_EVENTS(),
      events: CRITICAL,
      calls: callList.map((c) => ({ ...c, subs: 0 })),
    };
    // Seed every section in ONE request, then commit the registry with a
    // direct (non-debounced) write. Order matters: if the seed fails we stop
    // before the registry changes, so a half-made cycle is never announced.
    const rows = Object.entries(templates).map(([section, data]) => ({ cycle: id, section, data }));
    if (!(await writeRows(rows))) {
      await ui.alert("Couldn't create the cycle — nothing was changed. Check your connection and try again.");
      return;
    }
    const nextRegistry = [
      ...cycles.map((c) => (c.status === "active" ? { ...c, status: "past" } : c)),
      { id, label, status: "active" },
    ];
    if (!(await saveCycles(nextRegistry))) {
      await ui.alert("The new cycle's data was saved but the switch didn't commit. Reload and try again.");
      return;
    }
    setViewCycleId(null);
    setCyOpen(false);
    setNewCyLabel("");
  };

  const renameCycle = async (c) => {
    const label = ((await ui.prompt("What should this cycle be called?", c.label, { title: "Rename cycle" })) || "").trim();
    if (!label || label === c.label) return;
    await saveCycles(cycles.map((x) => (x.id === c.id ? { ...x, label } : x)));
  };

  const deleteCycle = async (c) => {
    if (c.id === activeCycle.id) { await ui.alert("The active cycle can't be deleted. Start or switch to another cycle first."); return; }
    if (!(await ui.confirm(
      `Everything stored in ${c.label} goes with it. This cannot be undone — take a Backup first.`,
      { title: `Delete ${c.label}?`, confirmLabel: "Delete", danger: true }
    ))) return;
    if (!(await saveCycles(cycles.filter((x) => x.id !== c.id)))) {
      await ui.alert("Couldn't update the cycle list — nothing was deleted.");
      return;
    }
    if (!(await deleteCycleData(c.id))) {
      await ui.alert(`${c.label} was removed from the list, but its stored data could not be deleted. It will be cleaned up next time you delete the cycle.`);
    }
    if (viewCycleId === c.id) setViewCycleId(null);
  };

  /* ---- backup: one JSON of everything; restore overwrites everything ---- */
  const exportAll = async () => {
    if (!supabase) { await ui.alert("Connect the database to export."); return; }
    const { data, error } = await supabase.from("app_state").select("cycle,section,data,updated_at");
    if (error) { await ui.alert("Export failed: " + error.message); return; }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), rows: data || [] }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `if-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importAllFile = (file) => {
    if (!file) return;
    if (!supabase) { ui.alert("Connect the database to restore."); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const rows = parsed && Array.isArray(parsed.rows) ? parsed.rows : null;
        if (!rows || !rows.length) { await ui.alert("That doesn't look like a dashboard backup file."); return; }
        // Validate before touching anything: known sections must be arrays,
        // and every row needs a cycle + section. Unknown sections are allowed
        // through so older/newer backups stay restorable.
        const problems = [];
        rows.forEach((r, i) => {
          if (!r || typeof r.cycle !== "string" || typeof r.section !== "string") {
            problems.push(`row ${i + 1}: missing cycle or section`);
          } else if (ARRAY_SECTIONS.has(r.section) && !Array.isArray(r.data)) {
            problems.push(`${r.section} (${r.cycle}): expected a list`);
          }
        });
        if (problems.length) {
          await ui.alert(
            `${problems.slice(0, 5).join("\n")}${problems.length > 5 ? `\n…and ${problems.length - 5} more` : ""}`,
            { title: "This backup looks damaged — nothing was changed" }
          );
          return;
        }
        if (!(await ui.confirm(
          `This overwrites ALL current data (${rows.length} sections) with the backup from ${parsed.exportedAt || "an unknown date"}.`,
          { title: "Restore backup", confirmLabel: "Overwrite everything", danger: true }
        ))) return;
        const ok = await writeRows(rows.map((r) => ({ cycle: r.cycle, section: r.section, data: r.data })));
        if (!ok) { await ui.alert("Restore failed — your current data is unchanged."); return; }
        await ui.alert("Backup restored. The page will reload now.");
        window.location.reload();
      } catch {
        await ui.alert("Couldn't read that file — is it a backup exported from this app?");
      }
    };
    reader.readAsText(file);
  };
  /* ---- events: per-event checklist handlers ---- */
  const activeEv = evList.find((e) => e.id === activeEvId) || evList[0] || null;
  const updEvent = (evId, patch) => setEvList((l) => l.map((e) => (e.id === evId ? { ...e, ...patch } : e)));
  const updEvItems = (evId, fn) => setEvList((l) => l.map((e) => (e.id === evId ? { ...e, items: fn(e.items) } : e)));
  const toggleEvItem = (evId, itemId) => updEvItems(evId, (its) => its.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)));
  const updEvItem = (evId, itemId, patch) => updEvItems(evId, (its) => its.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  const rmEvItem = async (evId, itemId) => {
    const it = (evList.find((e) => e.id === evId)?.items || []).find((x) => x.id === itemId) || {};
    if (!(await confirmDelete(it.label ? `“${it.label}”` : "this step", !!(it.label || it.owner)))) return;
    updEvItems(evId, (its) => its.filter((i) => i.id !== itemId));
  };
  const addEvItem = (evId, group) => updEvItems(evId, (its) => [...its, { id: uid(), group, label: "", owner: "", done: false }]);
  const addEvGroup = async (evId) => {
    const g = ((await ui.prompt("Name the new group", "", { title: "Add a group", placeholder: "e.g. Invitations" })) || "").trim();
    if (g) addEvItem(evId, g);
  };
  const addEvent = async () => {
    const n = ((await ui.prompt("Name the event", "", { title: "Add an event", placeholder: "e.g. Investor night" })) || "").trim();
    if (!n) return;
    const ev = { id: uid(), name: n, date: "", items: [{ id: uid(), group: "General", label: "", owner: "", done: false }] };
    setEvList((l) => [...l, ev]);
    setActiveEvId(ev.id);
  };
  const rmEvent = async (evId) => {
    const ev = evList.find((e) => e.id === evId);
    if (!ev) return;
    if (!(await ui.confirm(`Its ${ev.items.length} step${ev.items.length === 1 ? "" : "s"} go with it.`,
      { title: `Remove "${ev.name}"?`, confirmLabel: "Remove", danger: true }))) return;
    setEvList((l) => l.filter((e) => e.id !== evId));
    if (activeEvId === evId) setActiveEvId(null);
  };
  /* One-time per cycle: absorb the legacy flat Demo Day checklist (with its
     user edits and progress) into the Events system, preserving everything. */
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    (async () => {
      const { data: newRow } = await supabase.from("app_state").select("data")
        .eq("cycle", cycleId).eq("section", "eventChecklists").maybeSingle();
      if (!alive || newRow) return;
      const { data: oldRow } = await supabase.from("app_state").select("data")
        .eq("cycle", cycleId).eq("section", "demochecklist").maybeSingle();
      if (!alive || !oldRow || !Array.isArray(oldRow.data) || !oldRow.data.length) return;
      const migrated = DEFAULT_EVENTS().map((ev) =>
        ev.key === "demoday" ? { ...ev, items: oldRow.data } : ev
      );
      await saveEvList(migrated);
    })();
    return () => { alive = false; };
  }, [cycleId]);

  /* ---- team profiles ---- */
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  const blankProfile = (t) => ({
    id: uid(), teamId: t ? t.id : null, name: t ? t.name : "",
    members: "", dept: "", supervisor: "", mentor: "", finance: "pending", notes: "",
    meetings: [], deliverables: [],
  });
  const missingProfiles = teams.filter(
    (t) => t.outcome === "select" && !profiles.some((p) => p.teamId === t.id || (p.name && p.name === t.name))
  );
  const createMissingProfiles = () => {
    if (!missingProfiles.length) return;
    setProfiles((ps) => [...ps, ...missingProfiles.map(blankProfile)]);
  };
  const updProfile = (id, patch) => setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const rmProfile = async (id) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    if (!(await ui.confirm("Meetings and deliverables go with it.",
      { title: `Remove the profile for "${p.name || "this team"}"?`, confirmLabel: "Remove", danger: true }))) return;
    setProfiles((ps) => ps.filter((x) => x.id !== id));
    if (activeProfileId === id) setActiveProfileId(null);
  };
  const updSub = (pid, key, subId, patch) =>
    updProfile(pid, { [key]: (profiles.find((p) => p.id === pid)?.[key] || []).map((x) => (x.id === subId ? { ...x, ...patch } : x)) });
  const addSub = (pid, key, blank) =>
    updProfile(pid, { [key]: [...(profiles.find((p) => p.id === pid)?.[key] || []), { id: uid(), ...blank }] });
  const rmSub = (pid, key, subId) =>
    updProfile(pid, { [key]: (profiles.find((p) => p.id === pid)?.[key] || []).filter((x) => x.id !== subId) });

  /* ---- knowledge base ---- */
  const updKb = (id, patch) => setKb((ks) => ks.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  const rmKb = async (id) => {
    const k = kb.find((x) => x.id === id) || {};
    if (!(await confirmDelete(k.title ? `“${k.title}”` : "this entry", !!(k.title || k.body)))) return;
    setKb((ks) => ks.filter((x) => x.id !== id));
  };
  const addKb = (category) => setKb((ks) => [...ks, { id: uid(), category, title: "", body: "", draft: true }]);
  const [kbEdit, setKbEdit] = useState(null);
  const copyKb = (k) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(k.body || "");
      setCopiedId(k.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  /* ---- demo day results ---- */
  const missingResults = teams.filter(
    (t) => t.outcome === "select" && !results.some((r) => r.teamId === t.id || (r.team && r.team === t.name))
  );
  const addMissingResults = () => {
    if (!missingResults.length) return;
    setResults((rs) => [...rs, ...missingResults.map((t) => ({
      id: uid(), teamId: t.id, team: t.name, pitched: false, awards: [], phase2: false, amount: "", note: "",
    }))]);
  };
  const updResult = (id, patch) => setResults((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const rmResult = async (id) => {
    const r = results.find((x) => x.id === id) || {};
    if (!(await confirmDelete(r.team ? `“${r.team}”` : "this result", !!(r.team || r.note || r.awards?.length || r.amount)))) return;
    setResults((rs) => rs.filter((x) => x.id !== id));
  };
  const toggleResultAward = (id, a) => setResults((rs) => rs.map((r) =>
    r.id === id ? { ...r, awards: r.awards.includes(a) ? r.awards.filter((x) => x !== a) : [...r.awards, a] } : r));
  const publishResults = async () => {
    const entries = results.filter((r) => (r.team || "").trim());
    if (!entries.length) { await ui.alert("No results to publish yet — add the cohort's teams first."); return; }
    const label = ((await ui.prompt("Name this cohort in the library", "", { title: "Publish to the library", placeholder: "e.g. Cohort 7" })) || "").trim();
    if (!label) return;
    const libTeams = entries.map((r) => {
      const src = teams.find((t) => t.id === r.teamId || t.name === r.team);
      const note = [
        (r.note || "").trim() || null,
        r.phase2 && Number(r.amount) > 0 ? `$${Number(r.amount).toLocaleString()}/yr Phase 2` : null,
      ].filter(Boolean).join(" — ");
      return { rid: uid(), name: r.team, blurb: src ? src.blurb : "", awards: r.awards, phase2: !!r.phase2, note };
    });
    const existing = cohortData.findIndex((c) => c.c.toLowerCase() === label.toLowerCase());
    const next = existing >= 0
      ? cohortData.map((c, i) => (i === existing ? { ...c, year: viewedCycle.label, teams: libTeams } : c))
      : [...cohortData, { c: label, year: viewedCycle.label, teams: libTeams }];
    if (!(await ui.confirm(
      `${libTeams.length} team${libTeams.length === 1 ? "" : "s"} will be ${existing >= 0 ? "written over the existing" : "added as a new"} "${label}" entry.`,
      { title: `${existing >= 0 ? "Update" : "Add"} "${label}"?`, confirmLabel: existing >= 0 ? "Update" : "Add" }
    ))) return;
    if (await saveCohorts(next)) {
      ui.toast("Published to the Cohorts library.");
      setView("cohorts");
      setCohortsTab("success");
    } else {
      await ui.alert("Publish failed — the library is unchanged. Check your connection and try again.");
    }
  };

  /* ---- phase 2: funded-team tracking (payments + meetings) ---- */
  const activeP2 = phase2.find((p) => p.id === activeP2Id) || phase2[0] || null;
  const p2Paid = (p) => (p.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const updP2 = (id, patch) => setPhase2((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addP2 = () => {
    const p = { id: uid(), team: "", cohort: viewedCycle.label, awarded: "", status: "active", note: "", payments: [], meetings: [] };
    setPhase2((ps) => [...ps, p]);
    setActiveP2Id(p.id);
  };
  const rmP2 = async (id) => {
    const p = phase2.find((x) => x.id === id);
    if (!p) return;
    if (!(await ui.confirm("Payment and meeting records go with it.",
      { title: `Remove ${p.team || "this team"} from Phase II tracking?`, confirmLabel: "Remove", danger: true }))) return;
    setPhase2((ps) => ps.filter((x) => x.id !== id));
    if (activeP2Id === id) setActiveP2Id(null);
  };
  const updP2Sub = (pid, key, subId, patch) =>
    updP2(pid, { [key]: (phase2.find((p) => p.id === pid)?.[key] || []).map((x) => (x.id === subId ? { ...x, ...patch } : x)) });
  const addP2Sub = (pid, key, blank) =>
    updP2(pid, { [key]: [...(phase2.find((p) => p.id === pid)?.[key] || []), { id: uid(), ...blank }] });
  const rmP2Sub = (pid, key, subId) =>
    updP2(pid, { [key]: (phase2.find((p) => p.id === pid)?.[key] || []).filter((x) => x.id !== subId) });
  const missingP2 = results.filter(
    (r) => r.phase2 && (r.team || "").trim() && !phase2.some((p) => p.team && p.team.toLowerCase() === r.team.toLowerCase())
  );
  const pullP2FromResults = () => {
    if (!missingP2.length) return;
    setPhase2((ps) => [...ps, ...missingP2.map((r) => ({
      id: uid(), team: r.team, cohort: viewedCycle.label,
      awarded: Number(r.amount) || "", status: "active", note: (r.note || ""), payments: [], meetings: [],
    }))]);
  };

  const cycleRoad = (i) => {
    const order = ["notstarted", "progress", "ready"];
    setRoad((r) => r.map((t, j) => (j === i ? { ...t, status: order[(order.indexOf(t.status) + 1) % 3] } : t)));
  };

  /* ---- attendance: roster × sessions, per cycle ----
     Sessions need stable ids because rows can be reordered; without them,
     attendance would follow a position instead of a session. Ids are assigned
     lazily to any legacy session that predates this feature. */
  /* Stable React keys for every list the user can edit and delete rows from. */
  useStableIds(classes, setClasses);
  useStableIds(pizza, setPizza);
  useStableIds(road, setRoad);
  useStableIds(alumni, setAlumni);
  useStableIds(events, setEvents);

  const [attendance, setAttendance] = useCloudSection("attendance", {}, cycleId);
  const [attSessionId, setAttSessionId] = useState(null);
  useEffect(() => {
    if (sessions.some((s) => !s.sid)) {
      setSessions((ss) => ss.map((s) => (s.sid ? s : { ...s, sid: uid() })));
    }
  }, [sessions]);

  /* Roster is derived from the team profiles' member lists — one line per
     person, "Name  email" or "Name, program, email" — so Pascal maintains
     people in one place only. */
  const roster = profiles.flatMap((p) =>
    String(p.members || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, li) => {
        const em = line.match(/[\w.+-]+@[\w.-]+\.\w+/);
        const email = em ? em[0] : "";
        let name = line.replace(email, "").replace(/\s{2,}/g, " ").trim();
        name = name.replace(/[\s,;:·|\-–]+$/, "").trim();
        return { rowId: `${p.id}:${li}`, key: (email || name).toLowerCase(), name: name || email, email, team: p.name || "Untitled", profileId: p.id };
      })
  );
  const attFor = (sid) => (attendance && attendance[sid]) || {};
  const setAtt = (sid, key, val) =>
    setAttendance((a) => {
      const cur = { ...(a || {}) };
      const row = { ...(cur[sid] || {}) };
      if (val) row[key] = val; else delete row[key];
      cur[sid] = row;
      return cur;
    });
  const cycleAtt = (sid, key) => {
    const order = [undefined, "present", "absent", "excused"];
    const cur = attFor(sid)[key];
    setAtt(sid, key, order[(order.indexOf(cur) + 1) % order.length]);
  };
  const markAllPresent = (sid) => {
    setAttendance((a) => {
      const cur = { ...(a || {}) };
      const row = { ...(cur[sid] || {}) };
      roster.forEach((r) => { row[r.key] = "present"; });
      cur[sid] = row;
      return cur;
    });
  };
  const attStats = (sid) => {
    const row = attFor(sid);
    const present = roster.filter((r) => row[r.key] === "present").length;
    const absent = roster.filter((r) => row[r.key] === "absent").length;
    const excused = roster.filter((r) => row[r.key] === "excused").length;
    return { present, absent, excused, marked: present + absent + excused, total: roster.length };
  };

  const PRINT_CSS = `
  @page { margin: 0.6in; }
  body { font-family: Georgia,'Times New Roman',serif; color:#2b2b2b; margin:0; }
  .head { border-bottom:3px solid ${T.burgundy}; padding-bottom:10px; margin-bottom:16px; }
  h1 { font-size:19px; margin:0; color:${T.burgundy}; }
  .sub { font-size:12.5px; color:#555; margin-top:3px; }
  table { border-collapse:collapse; width:100%; }
  th { background:${T.burgundy}; color:#fff; font-family:Arial,sans-serif; font-size:10px;
       letter-spacing:.05em; text-transform:uppercase; text-align:left; padding:7px 8px; }
  td { border-bottom:1px solid #ddd; padding:8px; font-size:12px; vertical-align:middle; }
  tr:nth-child(even) td { background:#faf8f5; }
  .team { font-family:Arial,sans-serif; font-size:10.5px; color:#555; }
  .em { font-family:Arial,sans-serif; font-size:10px; color:#777; }
  .sig { width:190px; border-bottom:1px solid #999; }
  .foot { margin-top:14px; font-size:10px; color:#888; font-family:Arial,sans-serif; }
  .teamhead td { background:#f0eae4 !important; font-family:Arial,sans-serif; font-size:10px;
       text-transform:uppercase; letter-spacing:.05em; color:#555; font-weight:bold; }
  .box { display:inline-block; width:12px; height:12px; border:1.2px solid #666; }
  .grid td, .grid th { text-align:center; }
  .grid td.n, .grid th.n { text-align:left; }
  `;
  const openPrint = (html, title) => {
    const w = window.open("", "_blank");
    if (!w) { ui.alert("Your browser blocked the print window. Allow pop-ups for this site, then try again."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${html}<div class="foot">Gina Cody School of Engineering and Computer Science · Concordia University</div></body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* Blank sign-in sheet for one session — printed, signed, then entered back in. */
  const printSignIn = (s) => {
    if (!roster.length) { ui.alert("No members found. Add team members in the Teams section first."); return; }
    const byTeam = {};
    roster.forEach((r) => { (byTeam[r.team] = byTeam[r.team] || []).push(r); });
    const rows = Object.keys(byTeam).sort().map((team) => {
      const head = `<tr class="teamhead"><td colspan="4">${esc(team)}</td></tr>`;
      const people = byTeam[team].map((r) =>
        `<tr><td>${esc(r.name)}</td><td class="em">${esc(r.email)}</td><td style="text-align:center"><span class="box"></span></td><td class="sig"></td></tr>`
      ).join("");
      return head + people;
    }).join("");
    openPrint(
      `<div class="head"><h1>Attendance sheet</h1>
       <div class="sub">${esc(s.title)}${s.who ? " — " + esc(s.who) : ""}<br/>
       ${esc(s.date)}${s.time ? " · " + esc(s.time) : ""}${s.place ? " · " + esc(s.place) : ""} · Cycle ${esc(viewedCycle.label)}</div></div>
       <table><thead><tr><th>Name</th><th>Email</th><th style="width:60px;text-align:center">Present</th><th style="width:200px">Signature</th></tr></thead>
       <tbody>${rows}</tbody></table>`,
      `Attendance — ${s.title}`
    );
  };

  /* Full grid: everyone × every session, matching the master contact sheet. */
  const printAttendanceGrid = () => {
    if (!roster.length) { ui.alert("No members found. Add team members in the Teams section first."); return; }
    const mark = { present: "P", absent: "A", excused: "E" };
    const heads = sessions.map((s) => `<th style="font-size:9px">${esc(s.title.length > 22 ? s.title.slice(0, 20) + "…" : s.title)}<br/><span style="font-weight:normal;opacity:.8">${esc(s.date)}</span></th>`).join("");
    const byTeam = {};
    roster.forEach((r) => { (byTeam[r.team] = byTeam[r.team] || []).push(r); });
    const rows = Object.keys(byTeam).sort().map((team) => {
      const head = `<tr class="teamhead"><td class="n" colspan="${sessions.length + 1}">${esc(team)}</td></tr>`;
      const people = byTeam[team].map((r) => {
        const cells = sessions.map((s) => `<td>${mark[attFor(s.sid)[r.key]] || ""}</td>`).join("");
        return `<tr><td class="n">${esc(r.name)}</td>${cells}</tr>`;
      }).join("");
      return head + people;
    }).join("");
    openPrint(
      `<div class="head"><h1>Attendance record</h1>
       <div class="sub">GCS Student Innovation Fund — Phase 1 · Cycle ${esc(viewedCycle.label)} · P = present · A = absent · E = excused</div></div>
       <table class="grid"><thead><tr><th class="n">Name</th>${heads}</tr></thead><tbody>${rows}</tbody></table>`,
      `Attendance record — ${viewedCycle.label}`
    );
  };

  /* Removing a person edits the team profile they came from — the member list
     stays the single source of truth — and clears their attendance marks. */
  const removePerson = async (r) => {
    if (!(await ui.confirm("They are deleted from the team's member list and their attendance marks are cleared.",
      { title: `Remove ${r.name} from ${r.team}?`, confirmLabel: "Remove", danger: true }))) return;
    setProfiles((ps) => ps.map((p) => {
      if (p.id !== r.profileId) return p;
      const kept = String(p.members || "").split(/\r?\n/).filter((line) => {
        const t = line.trim();
        if (!t) return false;
        const em = t.match(/[\w.+-]+@[\w.-]+\.\w+/);
        const key = (em ? em[0] : t.replace(/[\s,;:·|\-–]+$/, "")).toLowerCase();
        return key !== r.key;
      });
      return { ...p, members: kept.join("\n") };
    }));
    setAttendance((a) => {
      const cur = { ...(a || {}) };
      Object.keys(cur).forEach((sid) => {
        if (cur[sid] && cur[sid][r.key]) { const row = { ...cur[sid] }; delete row[r.key]; cur[sid] = row; }
      });
      return cur;
    });
  };

  /* Removing a session also drops the attendance marked against it, which
     would otherwise sit in the attendance map forever with nothing to key it
     to and quietly inflate every stored cycle. */
  const rmSession = async (i) => {
    const sess = sessions[i] || {};
    const marked = sess.sid ? Object.keys(attFor(sess.sid)).length : 0;
    const ok = await confirmDelete(
      sess.title ? `“${sess.title}”` : "this session",
      !!(sess.title || sess.who || marked)
    );
    if (!ok) return;
    setSessions((ss) => ss.filter((_, j) => j !== i));
    if (sess.sid) {
      setAttendance((a) => {
        if (!a || !a[sess.sid]) return a;
        const cur = { ...a };
        delete cur[sess.sid];
        return cur;
      });
    }
  };

  /* Reorder programming sessions without retyping them. */
  const moveSession = (i, dir) => setSessions((ss) => {
    const j = i + dir;
    if (j < 0 || j >= ss.length) return ss;
    const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const moveSessionEnd = (i, toTop) => setSessions((ss) => {
    if (i < 0 || i >= ss.length) return ss;
    const c = [...ss]; const [it] = c.splice(i, 1);
    if (toTop) c.unshift(it); else c.push(it);
    return c;
  });

  /* Print the finalized programming as a "Calendar of Activities" sheet
     matching the Gina Cody template (Date · Time · Place · Activity). */
  const printCalendar = () => {
    const rows = sessions.map((s) => {
      const activity = esc(s.title) + (s.who && s.who !== "TBD" ? ` — <span class="who">${esc(s.who)}</span>` : "");
      return `<tr><td class="date">${esc(s.date)}</td><td class="time">${esc(s.time)}</td><td class="place">${esc(s.place)}</td><td>${activity}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Calendar of Activities — ${esc(viewedCycle.label)}</title>
<style>
  @page { margin: 0.7in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2b2b2b; margin: 0; }
  .head { border-bottom: 3px solid ${T.burgundy}; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 20px; margin: 0; color: ${T.burgundy}; letter-spacing: .01em; }
  .sub { font-size: 13px; color: #555; margin-top: 3px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: ${T.burgundy}; color: #fff; font-family: Arial, sans-serif; font-size: 10.5px;
       letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 8px 10px; }
  td { border-bottom: 1px solid #ddd; padding: 9px 10px; font-size: 12.5px; vertical-align: top; }
  tr:nth-child(even) td { background: #faf8f5; }
  .date { white-space: nowrap; font-weight: bold; width: 130px; }
  .time { white-space: nowrap; font-family: Arial, sans-serif; font-size: 11.5px; color: #444; width: 96px; }
  .place { white-space: nowrap; font-family: Arial, sans-serif; font-size: 11.5px; color: #444; width: 82px; }
  .who { color: #555; }
  .foot { margin-top: 16px; font-size: 10.5px; color: #888; font-family: Arial, sans-serif; }
</style></head><body>
  <div class="head">
    <h1>Calendar of Activities</h1>
    <div class="sub">GCS Student Innovation Fund — Phase 1 · Cycle ${esc(viewedCycle.label)}</div>
  </div>
  <table><thead><tr><th>Date</th><th>Time</th><th>Place</th><th>Activity</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="foot">Gina Cody School of Engineering and Computer Science · Concordia University</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { ui.alert("Your browser blocked the print window. Allow pop-ups for this site, then try again."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
  };

  /* inline editing across promo / planning */
  const [editingCall, setEditingCall] = useState(null);
  const [classMsg, setClassMsg] = useState(null);
  const updClass = (i, patch) => setClasses((cs) => cs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  /* Class visits used to record which calls they advertised by the call's
     DISPLAY NAME, so renaming a call silently unlinked every class. They now
     record the call id; legacy name entries are still recognised and are
     rewritten to the id the first time the chip is toggled. */
  const classHasCall = (cls, call) => {
    const list = cls.calls || [];
    return list.includes(call.id) || list.includes(call.name);
  };
  const toggleClassCall = (i, cls, call) => {
    const list = cls.calls || [];
    const next = classHasCall(cls, call)
      ? list.filter((x) => x !== call.id && x !== call.name)
      : [...list.filter((x) => x !== call.name && x !== call.id), call.id];
    updClass(i, { calls: next });
  };
  const addClass = () => setClasses((cs) => [...cs, { rid: uid(), course: "", prof: "", campus: "", date: "", calls: [], done: false }]);
  const rmClass = async (i) => {
    const c = classes[i] || {};
    if (!(await confirmDelete(c.course ? `“${c.course}”` : "this class visit", !!(c.course || c.prof || c.date)))) return;
    setClasses((cs) => cs.filter((_, j) => j !== i));
  };
  const updPizza = (i, patch) => setPizza((ps) => ps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addPizza = () => setPizza((ps) => [...ps, { rid: uid(), title: "", date: "", time: "", room: "", reg: 0, done: false }]);
  const rmPizza = async (i) => {
    const q = pizza[i] || {};
    if (!(await confirmDelete(q.title ? `“${q.title}”` : "this Q&A", !!(q.title || q.date || q.room)))) return;
    setPizza((ps) => ps.filter((_, j) => j !== i));
  };
  const updCall = (id, patch) => setCallList((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updRoad = (i, patch) => setRoad((r) => r.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addRoad = () => setRoad((r) => [...r, { rid: uid(), team: "", lastSeen: "—", runs: 0, status: "notstarted", note: "" }]);
  const rmRoad = async (i) => {
    const t = road[i] || {};
    if (!(await confirmDelete(t.team ? `“${t.team}”` : "this row", !!(t.team || t.note || Number(t.runs))))) return;
    setRoad((r) => r.filter((_, j) => j !== i));
  };
  const updAlum = (i, patch) => setAlumni((al) => al.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addAlum = () => setAlumni((al) => [...al, { rid: uid(), team: "", year: "", contact: "", status: "pending" }]);
  const rmAlum = async (i) => {
    const a = alumni[i] || {};
    if (!(await confirmDelete(a.team ? `“${a.team}”` : "this row", !!(a.team || a.contact)))) return;
    setAlumni((al) => al.filter((_, j) => j !== i));
  };

  const [cohortData, setCohortData, saveCohorts] = useCloudSection("cohorts", COHORTS, "global");
  const [editTeam, setEditTeam] = useState(null);
  const [cohortMsg, setCohortMsg] = useState(null);
  /* Cohort teams are nested one level down, so they need their own stamp.
     Without it the edit target (`editTeam`) is an array index and removing a
     team silently opens the editor on whichever team slid into its place. */
  useEffect(() => {
    const needs = (t) => t && typeof t === "object" && !t.rid;
    if (cohortData.some((co) => (co.teams || []).some(needs))) {
      setCohortData((cd) => cd.map((co) => ({
        ...co,
        teams: (co.teams || []).map((t) => (needs(t) ? { ...t, rid: uid() } : t)),
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortData]);
  const updTeam = (ci, ti, patch) => setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: co.teams.map((t, b) => (b === ti ? { ...t, ...patch } : t)) } : co)));
  const rmTeam = (ci, ti) => setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: co.teams.filter((_, b) => b !== ti) } : co)));
  const addTeam = (ci) => {
    const rid = uid();
    setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: [...co.teams, { rid, name: "", blurb: "", awards: [], phase2: false, note: "" }] } : co)));
    return rid;
  };
  const toggleAward = (ci, ti, a) => setCohortData((cd) => cd.map((co, x) => (x === ci ? { ...co, teams: co.teams.map((t, y) => (y === ti ? { ...t, awards: t.awards.includes(a) ? t.awards.filter((z) => z !== a) : [...t.awards, a] } : t)) } : co)));
  const teamsFromRows = (rows) => {
    const clean = (rows || []).filter((r) => r && Object.keys(r).length);
    if (!clean.length) return [];
    const h = Object.keys(clean[0]);
    const f = (re) => h.find((x) => re.test(String(x).toLowerCase().trim()));
    const hN = f(/team|name|startup|project|venture/), hB = f(/blurb|descr|summary|pitch|about|tagline/),
      hC = f(/cohort|batch|group/), hY = f(/year|season/), hA = f(/award|prize|won/),
      hP = f(/phase|matur/), hNo = f(/note|traction|update|current|status/);
    if (!hN) return [];
    return clean.map((r) => ({
      name: String(r[hN] ?? "").trim(),
      blurb: hB ? String(r[hB] ?? "").trim() : "",
      cohort: hC ? String(r[hC] ?? "").trim() : "Imported",
      year: hY ? String(r[hY] ?? "").trim() : "",
      awards: hA ? String(r[hA] ?? "").split(/[;,/|]/).map((s) => s.trim()).filter(Boolean) : [],
      phase2: hP ? /yes|true|1|✓|phase/i.test(String(r[hP])) : false,
      note: hNo ? String(r[hNo] ?? "").trim() : "",
    })).filter((t) => t.name);
  };
  const mergeTeams = (list, fname) => {
    if (!list.length) { setCohortMsg("Couldn't find a team/name column in that file."); return; }
    setCohortData((cd) => {
      const next = cd.map((co) => ({ ...co, teams: [...co.teams] }));
      list.forEach((t) => {
        const key = t.cohort || "Imported";
        let g = next.find((co) => co.c.toLowerCase() === key.toLowerCase());
        if (!g) { g = { c: key, year: t.year || "", teams: [] }; next.push(g); }
        g.teams.push({ rid: uid(), name: t.name, blurb: t.blurb, awards: t.awards, phase2: t.phase2, note: t.note });
      });
      return next;
    });
    setCohortMsg(`Added ${list.length} team${list.length === 1 ? "" : "s"} from ${fname}.`);
  };
  const onCohortFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    if (ext === "csv") {
      reader.onload = (e) => mergeTeams(teamsFromRows(Papa.parse(e.target.result, { header: true, skipEmptyLines: true }).data), file.name);
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          mergeTeams(teamsFromRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" })), file.name);
        } catch { setCohortMsg("Couldn't read that spreadsheet."); }
      };
      reader.readAsArrayBuffer(file);
    } else setCohortMsg("Use a .csv, .xlsx, or .xls file.");
  };

  const classesFromRows = (rows) => {
    const clean = (rows || []).filter((r) => r && Object.keys(r).length);
    if (!clean.length) return [];
    const h = Object.keys(clean[0]);
    const f = (re) => h.find((x) => re.test(String(x).toLowerCase().trim()));
    const hC = f(/course|class|subject|title/), hP = f(/prof|instructor|teacher|faculty/),
      hM = f(/campus|building|location/), hD = f(/date|day|when/), hT = f(/time|slot/);
    if (!hC) return [];
    return clean.map((r) => ({
      course: String(r[hC] ?? "").trim(),
      prof: hP ? String(r[hP] ?? "").trim() : "",
      campus: hM ? String(r[hM] ?? "").trim() : "",
      date: [hD ? String(r[hD] ?? "").trim() : "", hT ? String(r[hT] ?? "").trim() : ""].filter(Boolean).join(" "),
      rid: uid(), calls: [], done: false,
    })).filter((c) => c.course);
  };
  const onClassFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    const finish = (rows) => {
      const parsed = classesFromRows(rows);
      if (!parsed.length) { setClassMsg("Couldn't find a course/class column in that file."); return; }
      setClasses((cs) => [...cs, ...parsed]);
      setClassMsg(`Added ${parsed.length} class${parsed.length === 1 ? "" : "es"} from ${file.name}.`);
    };
    if (ext === "csv") {
      reader.onload = (e) => finish(Papa.parse(e.target.result, { header: true, skipEmptyLines: true }).data);
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          finish(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
        } catch { setClassMsg("Couldn't read that spreadsheet."); }
      };
      reader.readAsArrayBuffer(file);
    } else setClassMsg("Use a .csv, .xlsx, or .xls file.");
  };

  const nextEv = evList.find((ev) => ev.items.some((i) => !i.done)) || evList[evList.length - 1] || null;
  const nextEvDone = nextEv ? nextEv.items.filter((i) => i.done).length : 0;
  const nextEvTotal = nextEv ? nextEv.items.length : 0;
  const nextEvPct = nextEvTotal ? Math.round((nextEvDone / nextEvTotal) * 100) : 0;

  /* Selection is read one call at a time. Teams are grouped by the call they
     applied to, so a themed call (Cybersecurity, say) never shares a table
     with the Regular call. `allGroups` drives the filter counts; `shownGroups`
     is what the screen renders after the filter and search are applied. */
  const teamMatches = (t) => {
    const q = teamQuery.trim().toLowerCase();
    if (!q) return true;
    return (t.name || "").toLowerCase().includes(q)
      || (t.blurb || "").toLowerCase().includes(q)
      || (t.flaggedBy || []).join(" ").toLowerCase().includes(q);
  };
  const allGroups = callGroups(teams, callList);
  const searchedGroups = callGroups(teams.filter(teamMatches), callList);
  const shownGroups = callFilter === "all"
    ? searchedGroups
    : searchedGroups.filter((g) => g.call.id === callFilter);
  const visibleTeams = shownGroups.flatMap((g) => g.teams);
  const blankTeam = () => ({
    id: uid(),
    name: "", blurb: "",
    callId: callFilter !== "all" && callFilter !== UNASSIGNED ? callFilter : (accentObj ? accentObj.id : "regular"),
    flaggedBy: [], score: "", stage: "flagged", agreed: "pending", date: "", outcome: null,
  });
  const counts = {
    submitted: callList.reduce((a, c) => a + (Number(c.subs) || 0), 0), shortlisted: teams.length,
    scheduled: teams.filter((t) => t.stage === "scheduled" || t.stage === "completed" || t.stage === "decided").length,
    selected: teams.filter((t) => t.outcome === "select").length,
  };
  const comingPct = alumni.length ? Math.round((alumni.filter((a) => a.status === "coming").length / alumni.length) * 100) : 0;
  const heldN = sessions.filter((s) => s.done).length;
  const progPct = sessions.length ? Math.round((heldN / sessions.length) * 100) : 0;
  const selPct = teams.length ? Math.round((counts.scheduled / teams.length) * 100) : 0;
  const noDate = teams.filter((t) => !t.date && ["flagged", "invited", "responded"].includes(t.stage)).length;

  const NAV = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutGrid },
    { id: "calls", label: "Calls & promo", Icon: Megaphone },
    { id: "selection", label: "Selection", Icon: ListChecks },
    { id: "teams", label: "Teams", Icon: Users, badge: deliverables.outstanding, badgeTone: deliverables.overdue ? T.danger : T.warnInk },
    { id: "phase2", label: "Phase II", Icon: Wallet },
    { id: "planning", label: "Planning", Icon: CalendarCheck },
    { id: "programming", label: "Programming", Icon: CalendarDays },
    { id: "knowledge", label: "Knowledge", Icon: BookOpen },
    { id: "cohorts", label: "Cohorts", Icon: Trophy },
  ];

  const agreedPill = (a) =>
    a === "yes" ? <Pill bg="#E8F0DD" fg={T.ok}><Check size={12} /> Agreed</Pill> :
    a === "declined" ? <Pill bg="#FBE3DC" fg={T.danger}><X size={12} /> Declined</Pill> :
    <Pill bg="#FBF1D8" fg="#9a7b12"><Clock size={12} /> Pending</Pill>;

  /* One definition, rendered twice: in the sidebar on desktop and inside the
     topbar menu on narrow screens (where the sidebar footer is hidden). */
  const utilPanel = (
    <>
      <button onClick={() => setCyOpen((o) => !o)} title="Switch cycle"
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left" }}>
        <span className="eyebrow">Cycle {viewedCycle.label}</span>
        <ChevronDown size={12} style={{ color: T.muted, transform: cyOpen ? "rotate(180deg)" : "none", transition: ".12s" }} />
      </button>
      {cyOpen && (
        <div style={{ marginTop: 7, border: `1px solid ${T.hairline}`, borderRadius: 11, padding: 7, background: T.paper }}>
          {cycles.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 7, background: c.id === cycleId ? T.surface : "none" }}>
              <button
                onClick={() => { setViewCycleId(c.id === activeCycle.id ? null : c.id); setCyOpen(false); setUtilOpen(false); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flex: 1, minWidth: 0, padding: "5px 7px", fontSize: 12.5, fontWeight: c.id === cycleId ? 700 : 500 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                <span className="mono" style={{ fontSize: 10, color: c.status === "active" ? T.ok : T.muted }}>{c.status === "active" ? "active" : "past"}</span>
              </button>
              <button onClick={() => renameCycle(c)} title="Rename cycle" style={{ color: T.muted, display: "grid", placeItems: "center", padding: 3 }}><Pencil size={11} /></button>
              {c.id !== activeCycle.id && (
                <button onClick={() => deleteCycle(c)} title="Delete cycle" style={{ color: T.muted, display: "grid", placeItems: "center", padding: 3 }}><Trash2 size={11} /></button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 5, marginTop: 7, paddingTop: 7, borderTop: `1px solid ${T.hairline}` }}>
            <input value={newCyLabel} onChange={(e) => setNewCyLabel(e.target.value)}
              placeholder={nextCycleLabel(activeCycle.label) || "2027–28"}
              style={{ flex: 1, minWidth: 0, fontSize: 11.5, padding: "5px 7px", border: `1px solid ${T.hairline}`, borderRadius: 7, fontFamily: "inherit", background: T.surface, color: T.ink }} />
            <button className="mini" onClick={startNewCycle}>Start</button>
          </div>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 9 }}>
        {isPastView ? "Past cycle · read and edit history" : PHASE_BY_MONTH[CURRENT]}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        <button className="mini" onClick={exportAll} title="Download a backup of all data">
          <Download size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Backup
        </button>
        <label className="mini" style={{ cursor: "pointer" }} title="Restore from a backup file">
          <Upload size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Restore
          <input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => { importAllFile(e.target.files[0]); e.target.value = ""; }} />
        </label>
      </div>
      {supabase && (
        <button onClick={() => supabase.auth.signOut()}
          style={{ marginTop: 10, fontSize: 12, color: T.muted, background: "none", border: `1px solid ${T.hairline}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" }}>
          Sign out
        </button>
      )}
    </>
  );

  const saveChip = saveState.failed > 0 ? (
    <button className="savechip" onClick={retryFailedSaves} title="A change didn't save — click to retry" style={{ color: T.danger }}>
      <AlertTriangle size={12} /> Not saved · Retry
    </button>
  ) : saveState.pending > 0 ? (
    <span className="savechip"><RefreshCw size={12} /> Saving…</span>
  ) : (
    <span className="savechip" style={{ color: T.ok }}><Check size={12} /> Saved</span>
  );

  return (
    <div className="gcs" style={{ "--accent": accent }}>
      <style>{STYLE}</style>
      <DialogHost />

      {/* sidebar */}
      <aside className="side">
        <button className="brand" onClick={() => setView("dashboard")} style={{ background: "none", border: "none", textAlign: "left", width: "100%" }}>
          <div className="brandmark">IF</div>
          <div className="brandtext">
            <div className="disp" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>Innovation Fund</div>
            <div className="eyebrow" style={{ fontSize: 9.5 }}>Gina Cody School</div>
          </div>
        </button>
        {NAV.map(({ id, label, Icon, badge, badgeTone }) => (
          <button key={id} className={"navitem" + (view === id ? " on" : "")} onClick={() => setView(id)}
            title={badge ? `${label} — ${badge} deliverable${badge === 1 ? "" : "s"} outstanding` : label}>
            <Icon size={17} /> {label}
            {badge > 0 && (
              <span className="badge" style={{ marginLeft: "auto", background: view === id ? "rgba(255,255,255,.28)" : badgeTone }}>{badge}</span>
            )}
          </button>
        ))}
        <div className="sidefoot" style={{ marginTop: "auto", padding: "14px 10px 4px" }}>
          {utilPanel}
        </div>
      </aside>

      {/* main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="eyebrow">Cycle {viewedCycle.label}{isPastView ? " · past" : ""}</div>
            <div className="disp" style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>
              {(NAV.find((n) => n.id === view) || NAV[0]).label}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {saveChip}
            <div className="skin">
              {callList.map((c) => (
                <button key={c.id} className={activeCall === c.id ? "on" : ""} style={activeCall === c.id ? { background: c.accent } : {}} onClick={() => setActiveCall(c.id)} title={c.topic}>{c.name}</button>
              ))}
              <button onClick={() => { setView("calls"); setDraft((d) => ({ ...d, open: true })); }} title="Add a call" style={{ padding: "6px 12px", color: T.muted, fontWeight: 800 }}>+</button>
            </div>
            <button className="utilbtn mini" onClick={() => setUtilOpen((o) => !o)} title="Cycle, backup and account"
              style={{ alignItems: "center", gap: 5 }}>
              <Settings size={13} /> Menu
            </button>
          </div>
        </div>

        {utilOpen && (
          <div className="utilpanel">{utilPanel}</div>
        )}

        {isPastView && (
          <div style={{ background: T.tint, color: T.burgundy, padding: "8px 34px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>Viewing {viewedCycle.label} · past cycle — edits save to that cycle.</span>
            <button onClick={() => setViewCycleId(null)} style={{ textDecoration: "underline", fontWeight: 700, color: T.burgundy }}>
              Back to {activeCycle.label}
            </button>
          </div>
        )}

        <div className="content">
          {view === "dashboard" && (
            <>
              <div className="h1 disp">The year at a glance</div>
              <div className="sub">One cohort cycle, two parallel calls. Right now: {(PHASE_BY_MONTH[CURRENT] || "").toLowerCase()}.</div>

              <div className="grid resp" style={{ gridTemplateColumns: "1.1fr 1.4fr", marginTop: 22, alignItems: "stretch" }}>
                <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Wheel accent={accent} />
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
                    <Legend color={accent} label="Kickoff · Demo Day" />
                    <Legend color={T.gold} label="Homecoming" />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                  <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                    <Stat n={counts.submitted} l="Proposals submitted" accent={accent} />
                    <Stat n={counts.shortlisted} l="Shortlisted to interview" accent={accent} />
                    <Stat n={counts.scheduled} l="Interviews scheduled" accent={accent} />
                    <Stat n={counts.selected} l="Selected so far" accent={accent} />
                  </div>
                  {/* Every call, side by side — submissions and how far its
                      teams have got — rather than one blended total. */}
                  <div className="card">
                    <div className="eyebrow" style={{ marginBottom: 10 }}>By call</div>
                    {allGroups.map(({ call, teams: ts }) => (
                      <button key={call.id} onClick={() => { setView("selection"); setCallFilter(call.id); }}
                        title={`Open the ${call.name} call in Selection`} className="callrow"
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 0", borderBottom: `1px solid ${T.hairline}` }}>
                        <span style={{ width: 9, height: 9, borderRadius: 999, background: call.accent, flex: "0 0 9px" }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{call.name}</span>
                          {call.topic && call.id !== UNASSIGNED && <span style={{ color: T.muted, fontSize: 12 }}> · {call.topic}</span>}
                        </span>
                        <span className="mono nums" style={{ fontSize: 11.5, color: T.muted }}>
                          {call.subs != null ? `${call.subs} subs · ` : ""}{ts.length} shortlisted · {ts.filter((t) => t.outcome === "select").length} selected
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="card">
                    <div className="eyebrow" style={{ marginBottom: 12 }}>Cycle {viewedCycle.label} · two seasons</div>
                    <Swimlane label="Selection · Jun–Jul" sub={`${counts.scheduled}/${teams.length} at interview or beyond`} pct={selPct} accent={accent} />
                    <div style={{ height: 14 }} />
                    <Swimlane label="Programming · Sep → Mar" sub={`${heldN}/${sessions.length} sessions held`} pct={progPct} accent={accent} />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Needs attention</div>
                <Alert icon={<Clock size={15} />} text={noDate ? `${noDate} shortlisted team${noDate === 1 ? " has" : "s have"} no interview date yet` : "All shortlisted teams have an interview date"} cta="Open selection" onClick={() => setView("selection")} accent={accent} />
                <Alert
                  icon={<PackageCheck size={15} />}
                  tone={deliverables.overdue ? T.danger : undefined}
                  text={deliverables.outstanding
                    ? `${deliverables.teamsOwing} team${deliverables.teamsOwing === 1 ? "" : "s"} owe${deliverables.teamsOwing === 1 ? "s" : ""} us ${deliverables.outstanding} deliverable${deliverables.outstanding === 1 ? "" : "s"}` +
                      (deliverables.overdue ? ` — ${deliverables.overdue} overdue or due today` : "")
                    : "Every deliverable on file is submitted"}
                  cta="See what's owed"
                  onClick={() => { setView("teams"); setTeamsTab("deliverables"); }}
                  accent={accent} />
                <Alert icon={<CalendarCheck size={15} />} text={nextEv ? `${nextEv.name} prep is ${nextEvPct}% complete — ${nextEvTotal - nextEvDone} step${nextEvTotal - nextEvDone === 1 ? "" : "s"} left` : "No events planned yet"} cta="Open planning" onClick={() => setView("planning")} accent={accent} />
                <Alert icon={<Megaphone size={15} />} text={`Promo: ${classes.filter((c) => c.done).length}/${classes.length} class visits and ${pizza.filter((p) => p.done).length}/${pizza.length} pizza Q&As done`} cta="Manage promo" onClick={() => setView("calls")} accent={accent} />
                <Alert icon={<Trophy size={15} />} text={`Homecoming: ${comingPct}% of alumni confirmed`} cta="View cohorts" onClick={() => setView("cohorts")} accent={accent} last />
              </div>
            </>
          )}

          {view === "calls" && (
            <>
              <div className="h1 disp">Calls & promotion</div>
              <div className="sub">Calls launch together each spring. Add a themed call, give it a topic and pick its colour — it appears in the switcher up top.</div>
              <div className="scards" style={{ marginTop: 20 }}>
                {callList.map((c) => (
                  <CallCard key={c.id} call={c} active={activeCall === c.id} palette={PALETTE}
                    editing={editingCall === c.id}
                    onEdit={() => setEditingCall(editingCall === c.id ? null : c.id)}
                    onChange={(patch) => updCall(c.id, patch)}
                    onUse={() => setActiveCall(c.id)}
                    onRemove={c.fixed ? null : async () => {
                      const attached = teams.filter((t) => callFor(t, callList).id === c.id).length;
                      const ok = await ui.confirm(
                        attached
                          ? `${attached} team${attached === 1 ? "" : "s"} applied to this call. They are kept, but move to an “Unassigned” group in Selection until you put them in another call.`
                          : "Class visits advertised under this call lose their tag.",
                        { title: `Remove the ${c.name} call?`, confirmLabel: "Remove", danger: true }
                      );
                      if (!ok) return;
                      setCallList((cs) => cs.filter((x) => x.id !== c.id));
                      if (activeCall === c.id) setActiveCall("regular");
                      if (callFilter === c.id) setCallFilter("all");
                    }} />
                ))}
                <AddCallCard draft={draft} setDraft={setDraft} palette={PALETTE}
                  onAdd={() => {
                    const name = draft.name.trim();
                    if (!name) return;
                    const id = "call-" + Date.now();
                    setCallList((cs) => [...cs, { id, name, topic: draft.topic.trim() || "Themed call", accent: draft.accent, open: "Mar 2", close: "May 8", subs: 0 }]);
                    setActiveCall(id);
                    setDraft({ open: false, name: "", topic: "", accent: PALETTE[1].hex });
                  }} />
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div className="eyebrow">Class visits · {classes.filter((c) => c.done).length}/{classes.length} done</div>
                  <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addClass}><Plus size={14} /> Add class</button>
                </div>

                <label
                  className={"drop" + (dragging ? " drag" : "")}
                  style={{ marginBottom: 12 }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); onClassFile(e.dataTransfer.files[0]); }}
                >
                  <span className="ic"><UploadCloud size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Drop a class list to add them in bulk</div>
                    <div style={{ color: T.muted, fontSize: 11.5 }}>CSV or Excel. We map course, professor, campus and date.</div>
                  </div>
                  <span className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }}>Browse</span>
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => onClassFile(e.target.files[0])} />
                </label>
                {classMsg && <div style={{ fontSize: 12, color: T.ok, marginBottom: 10 }}>{classMsg}</div>}

                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead><tr><th>Course</th><th>Campus</th><th>Professor</th><th>Date</th><th>Advertised</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {classes.map((p, i) => (
                        <tr key={p.rid || `class-${i}`}>
                          <td style={{ minWidth: 170 }}><EInput value={p.course} onChange={(v) => updClass(i, { course: v })} placeholder="Course" /></td>
                          <td style={{ minWidth: 80 }}><EInput value={p.campus} onChange={(v) => updClass(i, { campus: v })} placeholder="Campus" /></td>
                          <td style={{ minWidth: 120 }}><EInput value={p.prof} onChange={(v) => updClass(i, { prof: v })} placeholder="Professor" /></td>
                          <td style={{ minWidth: 90 }}><EInput value={p.date} onChange={(v) => updClass(i, { date: v })} placeholder="Date" mono /></td>
                          <td>
                            <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                              {callList.map((c) => {
                                const on = classHasCall(p, c);
                                return (
                                  <button key={c.id} className={"mini" + (on ? " on" : "")}
                                    style={on ? { borderColor: c.accent, color: "#fff", background: c.accent } : {}}
                                    title={c.topic}
                                    onClick={() => toggleClassCall(i, p, c)}>{c.name}</button>
                                );
                              })}
                            </span>
                          </td>
                          <td>
                            <button className={"mini" + (p.done ? " on" : "")} onClick={() => updClass(i, { done: !p.done })}>
                              {p.done ? <><Check size={11} style={{ verticalAlign: -1 }} /> Done</> : "Planned"}
                            </button>
                          </td>
                          <td><button onClick={() => rmClass(i)} title="Remove" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div className="eyebrow"><Pizza size={12} style={{ verticalAlign: -2, marginRight: 5 }} />Pizza Q&amp;As · {pizza.filter((p) => p.done).length}/{pizza.length} done</div>
                  <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addPizza}><Plus size={14} /> Add Q&amp;A</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead><tr><th>Session</th><th>Date</th><th>Time</th><th>Room</th><th>Registered</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {pizza.map((p, i) => (
                        <tr key={p.rid || `pizza-${i}`}>
                          <td style={{ minWidth: 180 }}><EInput value={p.title} onChange={(v) => updPizza(i, { title: v })} placeholder="Session" /></td>
                          <td style={{ minWidth: 80 }}><EInput value={p.date} onChange={(v) => updPizza(i, { date: v })} placeholder="Date" mono /></td>
                          <td style={{ minWidth: 70 }}><EInput value={p.time} onChange={(v) => updPizza(i, { time: v })} placeholder="Time" mono /></td>
                          <td style={{ minWidth: 90 }}><EInput value={p.room} onChange={(v) => updPizza(i, { room: v })} placeholder="Room" mono /></td>
                          <td style={{ minWidth: 70 }}><EInput value={p.reg} onChange={(v) => updPizza(i, { reg: v.replace(/\D/g, "") })} placeholder="0" mono align="center" w="56px" /></td>
                          <td>
                            <button className={"mini" + (p.done ? " on" : "")} onClick={() => updPizza(i, { done: !p.done })}>
                              {p.done ? <><Check size={11} style={{ verticalAlign: -1 }} /> Done</> : "Planned"}
                            </button>
                          </td>
                          <td><button onClick={() => rmPizza(i)} title="Remove" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {view === "selection" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Selection pipeline</div>
                  <div className="sub">Scores are mirrored from Airtable by hand — the sum of {JUDGES} judges scoring out of 5, so {MAX_SCORE} is the ceiling. Track who wants to interview each team, then take them to a decision.</div>
                </div>
                <div className="tabs">
                  <button className={selTab === "list" ? "on" : ""} onClick={() => setSelTab("list")}>Interview list</button>
                  <button className={selTab === "board" ? "on" : ""} onClick={() => setSelTab("board")}>Board</button>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                {!importedName ? (
                  <label
                    className={"drop" + (dragging ? " drag" : "")}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
                  >
                    <span className="ic"><UploadCloud size={19} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>Drop your Airtable export to load the pipeline</div>
                      <div style={{ color: T.muted, fontSize: 12 }}>Excel or CSV. We map team, score, call, flagged-by, interview date and outcome — a “Cybersecurity” or “Special” value lands the team in that call. Showing sample data until you import.</div>
                    </div>
                    <span className="btn ghost" style={{ fontSize: 12, padding: "7px 13px" }}>Browse</span>
                    <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} />
                  </label>
                ) : (
                  <div className="importbar">
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: T.paper, color: T.ok, display: "grid", placeItems: "center", flex: "0 0 32px" }}><Check size={16} /></span>
                    <span><b>{teams.length} teams</b> loaded from <span className="mono" style={{ fontSize: 12 }}>{importedName}</span></span>
                    <label className="mini" style={{ cursor: "pointer" }}>
                      Replace file
                      <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} />
                    </label>
                    <button className="mini" onClick={resetData}><RefreshCw size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Reset to sample</button>
                  </div>
                )}
                {importError && <div style={{ marginTop: 9, fontSize: 12.5, color: T.danger }}>{importError}</div>}
              </div>

              {/* Which call are we looking at? The pipeline is never shown as
                  one undifferentiated list — Regular and each themed call get
                  their own space, colour and counts. */}
              <div className="chiprow" style={{ marginTop: 18 }}>
                <button className={"chip chipx" + (callFilter === "all" ? " on" : "")} onClick={() => setCallFilter("all")}>
                  <span className="lbl">All calls</span><span className="n">{teams.length}</span>
                </button>
                {allGroups.map(({ call, teams: ts }) => (
                  <button
                    key={call.id}
                    title={call.topic}
                    className={"chip chipx" + (callFilter === call.id ? " on" : "")}
                    style={callFilter === call.id
                      ? { background: call.accent, borderColor: call.accent, color: "#fff" }
                      : { borderColor: call.accent, color: call.accent }}
                    onClick={() => setCallFilter(call.id)}
                  >
                    <span className="lbl">{call.name}{call.topic && call.id !== UNASSIGNED ? ` · ${call.topic}` : ""}</span>
                    <span className="n">{ts.length}</span>
                  </button>
                ))}
                <div className="search" style={{ marginLeft: "auto", maxWidth: 260 }}>
                  <Search size={15} style={{ color: T.muted }} />
                  <input placeholder="Search teams…" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} aria-label="Search teams" />
                </div>
              </div>

              {selTab === "list" ? (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <div className="eyebrow">{visibleTeams.length} team{visibleTeams.length === 1 ? "" : "s"} shown · click any field to edit</div>
                    <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => setTeams((ts) => [...ts, blankTeam()])}>
                      <Plus size={14} /> Add team
                    </button>
                  </div>

                  {visibleTeams.length === 0 ? (
                    <div className="card" style={{ color: T.muted, fontSize: 13.5 }}>
                      {teamQuery.trim()
                        ? `No team matches “${teamQuery.trim()}”.`
                        : "No teams in this call yet — drop your Airtable export above, or use “Add team”."}
                    </div>
                  ) : shownGroups.map(({ call, teams: groupTeams }) => {
                    if (!groupTeams.length) return null;
                    const decided = groupTeams.filter((t) => t.outcome).length;
                    const selected = groupTeams.filter((t) => t.outcome === "select").length;
                    return (
                      <div key={call.id}>
                        <div className="callband" style={{ borderTop: `3px solid ${call.accent}` }}>
                          <span className="dot" style={{ background: call.accent }} />
                          <span className="disp" style={{ fontWeight: 700, fontSize: 15 }}>{call.id === UNASSIGNED ? "Unassigned" : `${call.name} call`}</span>
                          {call.topic && <span style={{ color: T.muted, fontSize: 12.5 }}>{call.topic}</span>}
                          <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: T.muted, whiteSpace: "nowrap" }}>
                            {groupTeams.length} team{groupTeams.length === 1 ? "" : "s"} · {decided} decided · {selected} selected
                          </span>
                        </div>
                        <div className="callgroup">
                          <table>
                            <thead>
                              <tr>
                                <th scope="col">Team</th><th scope="col">Call</th><th scope="col">Flagged by</th><th scope="col">Score /{MAX_SCORE}</th>
                                <th scope="col">Agreed?</th><th scope="col">Interview</th><th scope="col">Outcome</th><th scope="col">Next step</th><th scope="col" aria-label="Remove" />
                              </tr>
                            </thead>
                            <tbody>
                              {groupTeams.map((t) => (
                                <tr key={t.id}>
                                  <td style={{ minWidth: 210 }}>
                                    <EInput value={t.name} onChange={(v) => upd(t.id, { name: v })} placeholder="Team name" />
                                    <NoteField value={t.blurb} onChange={(v) => upd(t.id, { blurb: v })} placeholder="What the project is"
                                      style={{ marginTop: 3, border: "1px solid transparent", background: "transparent", fontSize: 12.5, color: T.muted, padding: "4px 8px", resize: "none" }} />
                                  </td>
                                  <td>
                                    <select
                                      value={callFor(t, callList).id}
                                      aria-label={`Call for ${t.name || "this team"}`}
                                      onChange={(e) => upd(t.id, { callId: e.target.value, cohort: undefined })}
                                      style={{ fontFamily: "IBM Plex Mono", fontSize: 11.5, padding: "5px 7px", borderRadius: 8, background: T.surface, maxWidth: 130,
                                               border: `1px solid ${callFor(t, callList).accent}`, color: callFor(t, callList).accent, fontWeight: 600 }}>
                                      {callList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      {callFor(t, callList).id === UNASSIGNED && <option value={UNASSIGNED}>Unassigned</option>}
                                    </select>
                                  </td>
                                  <td style={{ minWidth: 130 }}>
                                    <EInput value={(t.flaggedBy || []).join(", ")} onChange={(v) => upd(t.id, { flaggedBy: v.split(/[,;·]/).map((x) => x.trim()).filter(Boolean) })} placeholder="Judges, Program team" />
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                      <input className="scorebox" aria-label={`Score for ${t.name || "this team"}`} value={t.score ?? ""}
                                        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); upd(t.id, { score: v === "" ? "" : Math.min(Number(v), MAX_SCORE) }); }} placeholder="—" />
                                      <span className="mono" style={{ fontSize: 10.5, color: T.muted }}>{t.score ? `${(Number(t.score) / JUDGES).toFixed(1)}/5` : ""}</span>
                                    </div>
                                  </td>
                                  <td><button onClick={() => cycleAgreed(t)} title="Click to cycle: pending → agreed → declined">{agreedPill(t.agreed)}</button></td>
                                  <td style={{ minWidth: 118 }}><EInput value={t.date} onChange={(v) => upd(t.id, { date: v })} placeholder="Set date/time" mono /></td>
                                  <td>
                                    <select value={t.outcome ?? ""} aria-label={`Outcome for ${t.name || "this team"}`} onChange={(e) => upd(t.id, { outcome: e.target.value || null })}
                                      style={{ fontFamily: "IBM Plex Mono", fontSize: 12, padding: "5px 7px", border: `1px solid ${T.hairline}`, borderRadius: 8, background: T.surface, color: T.ink }}>
                                      <option value="">Decide…</option>
                                      <option value="select">Selected</option>
                                      <option value="waitlist">Waitlist</option>
                                      <option value="reject">Not selected</option>
                                    </select>
                                  </td>
                                  <td>
                                    <select value={t.stage} aria-label={`Next step for ${t.name || "this team"}`} onChange={(e) => upd(t.id, { stage: e.target.value })}
                                      style={{ fontFamily: "IBM Plex Mono", fontSize: 12, padding: "5px 7px", border: `1px solid ${T.hairline}`, borderRadius: 8, background: T.surface, color: T.ink }}>
                                      {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                                    </select>
                                  </td>
                                  <td>
                                    <IconBtn title={`Delete ${t.name || "team"}`} onClick={async () => {
                                      if (!(await ui.confirm("This removes the team from the selection pipeline.", { title: `Delete ${t.name || "this team"}?`, confirmLabel: "Delete", danger: true }))) return;
                                      setTeams((ts) => ts.filter((x) => x.id !== t.id));
                                    }}><Trash2 size={14} /></IconBtn>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8, color: T.muted }}>
                    Drag cards to reorder or move between columns · or use ← →
                    {callFilter === "all" ? " · the stripe on each card is its call" : ""}
                  </div>
                  <div className="board">
                    {STAGES.map((st, si) => {
                      const items = visibleTeams.filter((t) => t.stage === st.id);
                      return (
                        <div key={st.id} className="col"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); if (dragId) moveTeam(dragId, st.id, null); setDragId(null); }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="eyebrow">{st.label}</span>
                            <span className="mono" style={{ fontSize: 11, color: T.muted }}>{items.length}</span>
                          </div>
                          {items.length === 0 && <div style={{ color: T.muted, fontSize: 11.5, marginTop: 10 }}>Drop here</div>}
                          {items.map((t) => {
                            const call = callFor(t, callList);
                            return (
                              <div key={t.id} className="kchip" draggable
                                onDragStart={() => setDragId(t.id)}
                                onDragEnd={() => setDragId(null)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragId && dragId !== t.id) moveTeam(dragId, t.stage, t.id); setDragId(null); }}
                                style={{ opacity: dragId === t.id ? 0.4 : 1, cursor: "grab", borderLeft: `3px solid ${call.accent}` }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name || "Untitled"}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7, gap: 6 }}>
                                  <span className="calltag" style={{ background: call.accent }}>{call.name}</span>
                                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{t.score != null && t.score !== "" ? `${t.score}/${MAX_SCORE}` : "—"}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                                  <button className="mini" aria-label="Move to previous stage" style={{ flex: 1, opacity: si === 0 ? 0.35 : 1 }} disabled={si === 0} onClick={() => upd(t.id, { stage: STAGES[si - 1].id })}>←</button>
                                  <button className="mini" aria-label="Move to next stage" style={{ flex: 1, opacity: si === STAGES.length - 1 ? 0.35 : 1 }} disabled={si === STAGES.length - 1} onClick={() => upd(t.id, { stage: STAGES[si + 1].id })}>→</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {view === "teams" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Teams · cycle {viewedCycle.label}</div>
                  <div className="sub">The cohort's home for the Seed year — members, onboarding status, monthly check-ins, and deliverables.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div className="tabs">
                    <button className={teamsTab === "profiles" ? "on" : ""} onClick={() => setTeamsTab("profiles")}>Profiles</button>
                    <button className={teamsTab === "deliverables" ? "on" : ""} onClick={() => setTeamsTab("deliverables")}>
                      Deliverables
                      {deliverables.outstanding > 0 && (
                        <span className="badge" style={{ marginLeft: 6, background: deliverables.overdue ? T.danger : T.warnInk }}>
                          {deliverables.outstanding}
                        </span>
                      )}
                    </button>
                  </div>
                  {teamsTab === "profiles" && (
                    <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => { const p = blankProfile(null); setProfiles((ps) => [...ps, p]); setActiveProfileId(p.id); }}>
                      <Plus size={13} /> Add team
                    </button>
                  )}
                </div>
              </div>

              {teamsTab === "deliverables" ? (
                <>
                  {/* What are we waiting on? One list, worst first, so nothing
                      has to be hunted for team by team. */}
                  <div className="grid resp" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18, gap: 12 }}>
                    <Stat n={deliverables.overdue} l={`Overdue or due today`} accent={deliverables.overdue ? T.danger : accent} />
                    <Stat n={deliverables.soon} l={`Due within ${SOON_DAYS} days`} accent={deliverables.soon ? T.warnInk : accent} />
                    <Stat n={deliverables.teamsOwing} l="Teams that owe us something" accent={accent} />
                  </div>

                  <div className="card" style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                      <div className="eyebrow"><Inbox size={12} style={{ verticalAlign: -2, marginRight: 5 }} />Waiting on · {deliverables.outstanding} outstanding</div>
                      <div className="mono" style={{ fontSize: 11.5, color: T.muted }}>Today is {fmtDate(todayISO())}</div>
                    </div>

                    {deliverables.rows.length === 0 ? (
                      <div className="empty">
                        <PackageCheck size={22} style={{ color: T.ok, display: "block", margin: "0 auto 8px" }} />
                        Nothing outstanding. Every deliverable on file is submitted.
                      </div>
                    ) : deliverables.rows.map((d) => (
                      <div key={`${d.profileId}:${d.id}`} className="delrow">
                        <Pill bg={d.state.bg} fg={d.state.fg}>{d.state.label}</Pill>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.title || "Untitled deliverable"}</div>
                          <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
                            {d.team}{d.due ? ` · due ${fmtDate(d.due)}` : " · no due date set"}
                          </div>
                          {d.note && <div style={{ color: T.muted, fontSize: 12, marginTop: 5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{d.note}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flex: "0 0 auto", alignItems: "center" }}>
                          <button className="mini" onClick={() => updSub(d.profileId, "deliverables", d.id, { status: "submitted" })}>
                            <Check size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Mark submitted
                          </button>
                          <button className="mini" title="Open this team's profile"
                            onClick={() => { setActiveProfileId(d.profileId); setTeamsTab("profiles"); }}>Open team</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-team roll-up, so it is obvious who is consistently behind. */}
                  {profiles.length > 0 && (
                    <div className="card" style={{ marginTop: 16 }}>
                      <div className="eyebrow" style={{ marginBottom: 6 }}>By team</div>
                      <div style={{ overflowX: "auto" }}>
                        <table>
                          <thead><tr><th scope="col">Team</th><th scope="col">Outstanding</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col" aria-label="Open" /></tr></thead>
                          <tbody>
                            {[...profiles].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((p) => {
                              const all = p.deliverables || [];
                              const out = all.filter(isOutstanding);
                              const worst = profileDeliverableState(p);
                              return (
                                <tr key={p.id}>
                                  <td style={{ minWidth: 160, fontWeight: 600 }}>{p.name || "Untitled team"}</td>
                                  <td className="mono">{out.length}</td>
                                  <td className="mono" style={{ color: T.muted }}>{all.length - out.length}/{all.length}</td>
                                  <td>{worst
                                    ? <Pill bg={worst.bg} fg={worst.fg}>{worst.label}</Pill>
                                    : <Pill bg={T.okTint} fg={T.ok}><Check size={12} /> All in</Pill>}</td>
                                  <td>
                                    <button className="mini" onClick={() => { setActiveProfileId(p.id); setTeamsTab("profiles"); }}>Open</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {missingProfiles.length > 0 && (
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: T.tint, borderRadius: 12, padding: "10px 14px" }}>
                      <span style={{ fontSize: 13, color: T.burgundy }}>
                        {missingProfiles.length} Selected team{missingProfiles.length === 1 ? " doesn't" : "s don't"} have a profile yet.
                      </span>
                      <button className="mini" style={{ borderColor: T.burgundy, color: T.burgundy }} onClick={createMissingProfiles}>Create {missingProfiles.length === 1 ? "it" : "them"}</button>
                    </div>
                  )}

                  {profiles.length === 0 ? (
                    <div className="card" style={{ marginTop: 16, color: T.muted, fontSize: 13.5 }}>
                      No team profiles yet. They're created from the Selection pipeline's Selected teams, or add one manually.
                    </div>
                  ) : (
                    <>
                      {/* A team chip carries its worst outstanding deliverable, so
                          the teams to chase are visible without opening each one. */}
                      <div className="chiprow" style={{ marginTop: 18 }}>
                        {[...profiles].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((p) => {
                          const worst = profileDeliverableState(p);
                          const on = activeProfile && activeProfile.id === p.id;
                          return (
                            <button key={p.id} title={worst ? `${p.name || "Untitled"} — ${worst.label}` : p.name || "Untitled"}
                              className={"chip" + (on ? " on" : "")} onClick={() => setActiveProfileId(p.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                              {worst && <span style={{ width: 7, height: 7, borderRadius: 999, background: worst.fg, flex: "0 0 7px" }} />}
                              {p.name || "Untitled"}
                            </button>
                          );
                        })}
                      </div>

                      {activeProfile && (
                        <div className="grid resp" style={{ gridTemplateColumns: "1fr 1.3fr", marginTop: 14 }}>
                          <div className="card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div className="eyebrow">Profile</div>
                              <IconBtn title="Remove profile" onClick={() => rmProfile(activeProfile.id)}><Trash2 size={14} /></IconBtn>
                            </div>
                            <EInput value={activeProfile.name} onChange={(v) => updProfile(activeProfile.id, { name: v })} placeholder="Team name" />
                            <div className="eyebrow" style={{ margin: "12px 0 3px" }}>Members</div>
                            <NoteField value={activeProfile.members} onChange={(v) => updProfile(activeProfile.id, { members: v })}
                              placeholder={"One per line — name, program, email"} minRows={4} />
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginTop: 10 }}>
                              <div><div className="eyebrow" style={{ marginBottom: 3 }}>Department</div><EInput value={activeProfile.dept} onChange={(v) => updProfile(activeProfile.id, { dept: v })} placeholder="e.g. MIE" /></div>
                              <div><div className="eyebrow" style={{ marginBottom: 3 }}>Supervisor</div><EInput value={activeProfile.supervisor} onChange={(v) => updProfile(activeProfile.id, { supervisor: v })} placeholder="Professor" /></div>
                              <div><div className="eyebrow" style={{ marginBottom: 3 }}>Mentor</div><EInput value={activeProfile.mentor} onChange={(v) => updProfile(activeProfile.id, { mentor: v })} placeholder="Assigned mentor" /></div>
                              <div>
                                <div className="eyebrow" style={{ marginBottom: 3 }}>Finance account</div>
                                <button className={"mini" + (activeProfile.finance === "opened" ? " on" : "")}
                                  style={activeProfile.finance === "opened" ? { borderColor: T.ok, color: T.ok, background: T.surface } : {}}
                                  onClick={() => updProfile(activeProfile.id, { finance: activeProfile.finance === "opened" ? "pending" : "opened" })}>
                                  {activeProfile.finance === "opened" ? <><Check size={11} style={{ verticalAlign: -1 }} /> Opened</> : "Pending"}
                                </button>
                              </div>
                            </div>
                            <div className="eyebrow" style={{ margin: "14px 0 3px" }}>Notes</div>
                            <NoteField value={activeProfile.notes} onChange={(v) => updProfile(activeProfile.id, { notes: v })}
                              placeholder="Anything worth remembering — context, risks, decisions, who said what. Grows as you type." minRows={6} />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div className="card">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div className="eyebrow">Progress meetings · {(activeProfile.meetings || []).length}</div>
                                <button className="mini" onClick={() => addSub(activeProfile.id, "meetings", { date: todayISO(), note: "" })}><Plus size={11} style={{ verticalAlign: -1 }} /> Meeting</button>
                              </div>
                              {(activeProfile.meetings || []).length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>No meetings logged yet.</div>}
                              {(activeProfile.meetings || []).map((m) => (
                                <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: `1px solid ${T.hairline}` }}>
                                  <div style={{ flex: "0 0 auto", paddingTop: 1 }}>
                                    <DateField value={m.date} onChange={(v) => updSub(activeProfile.id, "meetings", m.id, { date: v })} w="126px" title="Meeting date" />
                                  </div>
                                  <NoteField value={m.note} onChange={(v) => updSub(activeProfile.id, "meetings", m.id, { note: v })}
                                    placeholder="Notes, decisions, action items — as long as you need" minRows={2} />
                                  <IconBtn title="Remove meeting" style={{ marginTop: 4 }} onClick={() => rmSub(activeProfile.id, "meetings", m.id)}><Trash2 size={13} /></IconBtn>
                                </div>
                              ))}
                            </div>

                            <div className="card">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
                                <div className="eyebrow">
                                  Deliverables · {(activeProfile.deliverables || []).filter((d) => d.status === "submitted").length}/{(activeProfile.deliverables || []).length} submitted
                                </div>
                                <button className="mini" onClick={() => addSub(activeProfile.id, "deliverables", { title: "", due: "", status: "pending", note: "" })}><Plus size={11} style={{ verticalAlign: -1 }} /> Deliverable</button>
                              </div>
                              {(activeProfile.deliverables || []).length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>Nothing due yet.</div>}
                              {(activeProfile.deliverables || []).map((d) => {
                                const st = deliverableState(d);
                                const submitted = d.status === "submitted";
                                return (
                                  <div key={d.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.hairline}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ flex: 1, minWidth: 150 }}>
                                        <EInput value={d.title} onChange={(v) => updSub(activeProfile.id, "deliverables", d.id, { title: v })} placeholder="What they owe us" />
                                      </span>
                                      <DateField value={d.due} onChange={(v) => updSub(activeProfile.id, "deliverables", d.id, { due: v })} title="Due date" />
                                      <button
                                        className="mini"
                                        title={submitted ? "Mark as still outstanding" : "Mark as submitted"}
                                        onClick={() => updSub(activeProfile.id, "deliverables", d.id, { status: submitted ? "pending" : "submitted" })}
                                        style={{ borderColor: st.fg, color: submitted ? "#fff" : st.fg, background: submitted ? T.ok : T.surface, whiteSpace: "nowrap" }}>
                                        {submitted ? <><Check size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Submitted</> : st.label}
                                      </button>
                                      <IconBtn title="Remove deliverable" onClick={() => rmSub(activeProfile.id, "deliverables", d.id)}><Trash2 size={13} /></IconBtn>
                                    </div>
                                    <NoteField value={d.note} onChange={(v) => updSub(activeProfile.id, "deliverables", d.id, { note: v })}
                                      placeholder="Notes — what exactly is expected, what's been chased, what's missing" minRows={1}
                                      style={{ marginTop: 7, fontSize: 12.5 }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {view === "planning" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Planning & critical dates</div>
                  <div className="sub">The year's milestones — and an owned checklist for every event, from Kickoff to Demo Day.</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="eyebrow">Program year · critical dates</div>
                  <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEvDraft((d) => ({ open: !d.open, m: "Sep", label: "", color: PALETTE[2].hex, idx: null }))}>
                    <Plus size={14} /> Add date
                  </button>
                </div>

                {evDraft.open && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14, padding: 12, background: T.paper, borderRadius: 12 }}>
                    <select value={evDraft.m} onChange={(e) => setEvDraft({ ...evDraft, m: e.target.value })}
                      style={{ padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: T.surface, color: T.ink }}>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input value={evDraft.label} onChange={(e) => setEvDraft({ ...evDraft, label: e.target.value })} placeholder="Event (e.g. Judges briefing)"
                      style={{ flex: 1, minWidth: 160, padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: T.surface, color: T.ink }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      {PALETTE.slice(0, 6).map((p) => (
                        <button key={p.hex} title={p.name} onClick={() => setEvDraft({ ...evDraft, color: p.hex })}
                          style={{ width: 22, height: 22, borderRadius: 999, background: p.hex, border: evDraft.color === p.hex ? `2px solid ${T.ink}` : "2px solid transparent" }} />
                      ))}
                    </div>
                    <button className="btn" style={{ background: evDraft.color }} onClick={() => {
                      if (!evDraft.label.trim()) return;
                      const item = { m: evDraft.m, label: evDraft.label.trim(), date: evDraft.m, color: evDraft.color, custom: true };
                      setEvents((ev) => evDraft.idx != null ? ev.map((x, j) => (j === evDraft.idx ? { ...x, ...item } : x)) : [...ev, item]);
                      setEvDraft({ open: false, m: "Sep", label: "", color: PALETTE[2].hex, idx: null });
                    }}>{evDraft.idx != null ? "Save" : "Add"}</button>
                    {evDraft.idx != null && (
                      <button className="btn ghost" onClick={() => { setEvents((ev) => ev.filter((_, j) => j !== evDraft.idx)); setEvDraft({ open: false, m: "Sep", label: "", color: PALETTE[2].hex, idx: null }); }}>Remove</button>
                    )}
                    <button className="btn ghost" onClick={() => setEvDraft({ open: false, m: "Sep", label: "", color: PALETTE[2].hex, idx: null })}>Cancel</button>
                  </div>
                )}

                <div className="calstrip">
                  {MONTHS.map((m) => {
                    const evs = events.filter((c) => c.m === m);
                    return (
                      <div key={m} className={"calcell" + (m === CURRENT ? " cur" : "")}>
                        <div className="mo">{m}</div>
                        {evs.map((e, k) => {
                          const bg = e.color ? e.color : e.key ? accent : e.label === "Homecoming" ? T.gold : T.muted;
                          return (
                            <div key={e.rid || `${m}-${k}`} className="evt" title="Click to edit" style={{ background: bg, cursor: "pointer" }}
                              onClick={() => { const idx = events.indexOf(e); setEvDraft({ open: true, m: e.m, label: e.label, color: bg, idx }); }}>
                              {e.label}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div style={{ color: T.muted, fontSize: 11.5, marginTop: 9 }}>Tip: click any date to edit it, or use “Add date” for a new one.</div>
              </div>

              <div className="grid resp" style={{ gridTemplateColumns: "1.35fr 1fr", marginTop: 16 }}>
                <div className="card">
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                    {evList.map((ev) => {
                      const d = ev.items.filter((i) => i.done).length;
                      return (
                        <button key={ev.id} className={"chip" + (activeEv && activeEv.id === ev.id ? " on" : "")} onClick={() => setActiveEvId(ev.id)}>
                          {ev.name} <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}>{d}/{ev.items.length}</span>
                        </button>
                      );
                    })}
                    <button className="chip" onClick={addEvent}><Plus size={12} style={{ verticalAlign: -2 }} /> Event</button>
                  </div>

                  {activeEv ? (() => {
                    const evDone = activeEv.items.filter((i) => i.done).length;
                    const evTotal = activeEv.items.length;
                    const evPct = evTotal ? Math.round((evDone / evTotal) * 100) : 0;
                    const groups = [...new Set(activeEv.items.map((i) => i.group))];
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <EInput value={activeEv.name} onChange={(v) => updEvent(activeEv.id, { name: v })} placeholder="Event name" />
                              <EInput value={activeEv.date} onChange={(v) => updEvent(activeEv.id, { date: v })} placeholder="Date" mono w="86px" />
                            </div>
                            <div style={{ color: T.muted, fontSize: 12.5, paddingLeft: 8 }}>{evDone} of {evTotal} steps done</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                            <div className="disp" style={{ fontSize: 30, fontWeight: 800, color: accent }}>{evPct}%</div>
                            <button onClick={() => rmEvent(activeEv.id)} title="Remove this event" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="track" style={{ marginTop: 12 }}><div style={{ width: evPct + "%", background: accent }} /></div>
                        {groups.map((group) => (
                          <div key={group} style={{ marginTop: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div className="eyebrow">{group}</div>
                              <button className="mini" style={{ fontSize: 11 }} onClick={() => addEvItem(activeEv.id, group)}><Plus size={11} style={{ verticalAlign: -1 }} /> Step</button>
                            </div>
                            {activeEv.items.filter((c) => c.group === group).map((c) => (
                              <div key={c.id} className={"chk" + (c.done ? " done" : "")} style={{ cursor: "default" }}>
                                <button onClick={() => toggleEvItem(activeEv.id, c.id)} title="Check off" style={{ flex: "0 0 auto", display: "grid", placeItems: "center" }}>
                                  {c.done ? <CheckCircle2 size={17} style={{ color: accent }} /> : <Circle size={17} style={{ color: T.muted }} />}
                                </button>
                                <EInput value={c.label} onChange={(v) => updEvItem(activeEv.id, c.id, { label: v })} placeholder="Step" />
                                <EInput value={c.owner} onChange={(v) => updEvItem(activeEv.id, c.id, { owner: v })} placeholder="Owner" w="120px" align="right" />
                                <button onClick={() => rmEvItem(activeEv.id, c.id)} title="Remove" style={{ flex: "0 0 auto", color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={13} /></button>
                              </div>
                            ))}
                          </div>
                        ))}
                        <button className="mini" style={{ marginTop: 14 }} onClick={() => addEvGroup(activeEv.id)}><Plus size={11} style={{ verticalAlign: -1 }} /> Group</button>
                      </>
                    );
                  })() : (
                    <div style={{ color: T.muted, fontSize: 13 }}>No events yet — add one above.</div>
                  )}
                </div>

                <div className="card" style={{ alignSelf: "flex-start" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div className="eyebrow">Road to Demo Day</div>
                    <button className="btn ghost" style={{ fontSize: 11.5, padding: "5px 10px" }} onClick={addRoad}><Plus size={13} /> Team</button>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12.5, marginBottom: 8 }}>Edit names and dates seen. Click the status to cycle.</div>
                  {road.map((t, i) => {
                    const meta = t.status === "ready" ? { c: T.ok, l: "Ready" } : t.status === "progress" ? { c: T.warn, l: "In progress" } : { c: T.muted, l: "Not started" };
                    return (
                      <div key={t.rid || `road-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: i === road.length - 1 ? "none" : `1px solid ${T.hairline}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <EInput value={t.team} onChange={(v) => updRoad(i, { team: v })} placeholder="Team" />
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1, flexWrap: "wrap" }}>
                            <span className="mono" style={{ color: T.muted, fontSize: 10.5, paddingLeft: 8 }}>seen</span>
                            <EInput value={t.lastSeen} onChange={(v) => updRoad(i, { lastSeen: v })} placeholder="—" mono w="64px" ariaLabel="Last seen" />
                            <button className="mono" title="Log another rehearsal run" style={{ fontSize: 10.5, color: T.muted, border: `1px solid ${T.hairline}`, borderRadius: 6, padding: "2px 6px" }}
                              onClick={() => updRoad(i, { runs: (Number(t.runs) || 0) + 1 })}>{t.runs} run{Number(t.runs) === 1 ? "" : "s"} +</button>
                          </div>
                          <NoteField value={t.note} onChange={(v) => updRoad(i, { note: v })}
                            placeholder="Rehearsal feedback — what to fix before the next run"
                            minRows={1} style={{ marginTop: 6, fontSize: 12.5 }} />
                        </div>
                        <button className="mini" onClick={() => cycleRoad(i)} style={{ borderColor: meta.c, color: meta.c, whiteSpace: "nowrap", marginTop: 2 }}>{meta.l}</button>
                        <IconBtn title="Remove team" style={{ marginTop: 4 }} onClick={() => rmRoad(i)}><Trash2 size={13} /></IconBtn>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
                  <div>
                    <div className="eyebrow">Demo Day results · cycle {viewedCycle.label}</div>
                    <div style={{ color: T.muted, fontSize: 12.5, marginTop: 3 }}>Record each team's pitch, awards and Phase 2 funding — then publish the cohort into the success library.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {missingResults.length > 0 && (
                      <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addMissingResults}>
                        <Plus size={13} /> Add {missingResults.length} selected team{missingResults.length === 1 ? "" : "s"}
                      </button>
                    )}
                    <button className="btn" style={{ fontSize: 12, padding: "6px 14px" }} onClick={publishResults}>
                      <Trophy size={13} /> Publish to library
                    </button>
                  </div>
                </div>
                {results.length === 0 ? (
                  <div style={{ color: T.muted, fontSize: 13, padding: "10px 0" }}>
                    No results yet. {missingResults.length ? "Use “Add selected teams” to pull in the cohort." : "Teams appear here once the pipeline has Selected outcomes."}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead><tr><th>Team</th><th>Pitched</th><th>Awards</th><th>Phase 2</th><th>Amount /yr</th><th>Note</th><th></th></tr></thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.id}>
                            <td style={{ minWidth: 170 }}><EInput value={r.team} onChange={(v) => updResult(r.id, { team: v })} placeholder="Team" /></td>
                            <td>
                              <button className={"mini" + (r.pitched ? " on" : "")} onClick={() => updResult(r.id, { pitched: !r.pitched })}>
                                {r.pitched ? <><Check size={11} style={{ verticalAlign: -1 }} /> Yes</> : "—"}
                              </button>
                            </td>
                            <td style={{ minWidth: 210 }}>
                              <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                                {AWARDS.map((a) => {
                                  const on = r.awards.includes(a);
                                  return (
                                    <button key={a} className="mini" onClick={() => toggleResultAward(r.id, a)}
                                      style={on ? { borderColor: AWARD_COLOR[a], color: a === "Most Innovative" ? T.ink : "#fff", background: AWARD_COLOR[a] } : {}}>{a}</button>
                                  );
                                })}
                              </span>
                            </td>
                            <td>
                              <button className={"mini" + (r.phase2 ? " on" : "")} onClick={() => updResult(r.id, { phase2: !r.phase2 })}>
                                {r.phase2 ? "Phase 2" : "—"}
                              </button>
                            </td>
                            <td style={{ minWidth: 96 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <span className="mono" style={{ color: T.muted, fontSize: 12 }}>$</span>
                                <EInput value={r.amount} onChange={(v) => { const n = v.replace(/\D/g, "").slice(0, 5); updResult(r.id, { amount: n === "" ? "" : Math.min(Number(n), 50000) }); }} placeholder="0" mono w="70px" />
                              </div>
                            </td>
                            <td style={{ minWidth: 200 }}><NoteField value={r.note} onChange={(v) => updResult(r.id, { note: v })} placeholder="Traction note" minRows={1} style={{ fontSize: 12.5 }} /></td>
                            <td><button onClick={() => rmResult(r.id)} title="Remove" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {view === "programming" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Programming · Sep → Mar</div>
                  <div className="sub">The presentation series and monthly check-ins that lead each cohort to Demo Day. Tick a session once it's held.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div className="tabs">
                    <button className={progTab === "sessions" ? "on" : ""} onClick={() => setProgTab("sessions")}>Sessions</button>
                    <button className={progTab === "attendance" ? "on" : ""} onClick={() => setProgTab("attendance")}>Attendance</button>
                  </div>
                  {progTab === "sessions" ? (
                    <>
                      <span className="mono" style={{ fontSize: 12, color: T.muted }}>{sessions.filter((s) => s.done).length}/{sessions.length} held</span>
                      <button className="btn ghost" style={{ fontSize: 12, padding: "7px 13px" }} onClick={printCalendar} title="Open a printable Calendar of Activities">
                        <Download size={14} /> Print calendar
                      </button>
                    </>
                  ) : (
                    <button className="btn ghost" style={{ fontSize: 12, padding: "7px 13px" }} onClick={printAttendanceGrid} title="Print the full attendance record">
                      <Download size={14} /> Print full record
                    </button>
                  )}
                </div>
              </div>

              {progTab === "sessions" && (<>
              <div className="card" style={{ marginTop: 20 }}>
                <div>
                  {sessions.map((s, i) => {
                    const color = s.kind === "milestone" ? accent : s.kind === "community" ? T.gold : s.kind === "meeting" ? T.info : T.muted;
                    return (
                      <div key={s.sid || `session-${i}`} className="sessionrow" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i === sessions.length - 1 ? "none" : `1px solid ${T.hairline}` }}>
                        <span style={{ width: 12, height: 12, borderRadius: 999, background: s.done ? color : T.surface, boxShadow: `0 0 0 2px ${color}`, marginTop: 9, flex: "0 0 12px" }} />
                        <div style={{ width: 72, flex: "0 0 72px" }}>
                          <EInput value={s.date} onChange={(v) => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, date: v } : x)))} placeholder="Date" mono />
                          <EInput value={s.time} onChange={(v) => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, time: v } : x)))} placeholder="Time" mono />
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <EInput value={s.title} onChange={(v) => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, title: v } : x)))} placeholder="Session title" />
                            {s.kind === "milestone" && <Sparkles size={14} style={{ color: accent, flex: "0 0 auto" }} />}
                          </div>
                          <EInput value={s.who} onChange={(v) => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, who: v } : x)))} placeholder="Speaker" />
                        </div>
                        <div style={{ width: 84, flex: "0 0 84px", marginTop: 1 }}>
                          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>Place</div>
                          <EInput value={s.place} onChange={(v) => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, place: v } : x)))} placeholder="Room" mono />
                        </div>
                        <div style={{ width: 112, flex: "0 0 112px", marginTop: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 1 }}>Room booking</div>
                          <button className="mini" onClick={() => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, roomRequested: !x.roomRequested } : x)))}
                            style={{ fontSize: 10.5, padding: "3px 7px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderColor: s.roomRequested ? T.info : T.hairline, color: s.roomRequested ? T.info : T.muted }} title="Room request sent to Facilities">
                            {s.roomRequested ? <Check size={11} /> : <Circle size={10} />} Request sent
                          </button>
                          <button className="mini" onClick={() => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, roomConfirmed: !x.roomConfirmed } : x)))}
                            style={{ fontSize: 10.5, padding: "3px 7px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderColor: s.roomConfirmed ? T.ok : T.hairline, color: s.roomConfirmed ? T.ok : T.muted }} title="Room booking confirmed">
                            {s.roomConfirmed ? <CheckCircle2 size={11} /> : <Circle size={10} />} Confirmed
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginTop: 4, flex: "0 0 auto" }}>
                          <button title="Move to top" disabled={i === 0} onClick={() => moveSessionEnd(i, true)} style={{ color: T.muted, display: "grid", placeItems: "center", padding: 2, opacity: i === 0 ? 0.3 : 1, cursor: i === 0 ? "default" : "pointer" }}><ChevronsUp size={13} /></button>
                          <button title="Move to bottom" disabled={i === sessions.length - 1} onClick={() => moveSessionEnd(i, false)} style={{ color: T.muted, display: "grid", placeItems: "center", padding: 2, opacity: i === sessions.length - 1 ? 0.3 : 1, cursor: i === sessions.length - 1 ? "default" : "pointer" }}><ChevronsDown size={13} /></button>
                          <button title="Move up" disabled={i === 0} onClick={() => moveSession(i, -1)} style={{ color: T.muted, display: "grid", placeItems: "center", padding: 2, opacity: i === 0 ? 0.3 : 1, cursor: i === 0 ? "default" : "pointer" }}><ChevronUp size={14} /></button>
                          <button title="Move down" disabled={i === sessions.length - 1} onClick={() => moveSession(i, 1)} style={{ color: T.muted, display: "grid", placeItems: "center", padding: 2, opacity: i === sessions.length - 1 ? 0.3 : 1, cursor: i === sessions.length - 1 ? "default" : "pointer" }}><ChevronDown size={14} /></button>
                        </div>
                        <button onClick={() => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                          className="mini" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", borderColor: s.done ? T.ok : T.hairline, color: s.done ? T.ok : T.muted }} title="Mark held">
                          {s.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}{s.done ? "Held" : "Upcoming"}
                        </button>
                        <button onClick={() => printSignIn(s)} title="Print attendance sheet for this session" style={{ marginTop: 8, color: T.muted, display: "grid", placeItems: "center" }}><Download size={14} /></button>
                        <IconBtn title="Remove session" style={{ marginTop: 8 }} onClick={() => rmSession(i)}><Trash2 size={14} /></IconBtn>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.hairline}`, flexWrap: "wrap" }}>
                  <input value={psDraft.date} onChange={(e) => setPsDraft({ ...psDraft, date: e.target.value })} placeholder="Date"
                    style={{ width: 76, padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: T.surface, color: T.ink }} />
                  <input value={psDraft.title} onChange={(e) => setPsDraft({ ...psDraft, title: e.target.value })} placeholder="Session title"
                    style={{ flex: 2, minWidth: 160, padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: T.surface, color: T.ink }} />
                  <input value={psDraft.who} onChange={(e) => setPsDraft({ ...psDraft, who: e.target.value })} placeholder="Speaker"
                    style={{ flex: 1, minWidth: 120, padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: T.surface, color: T.ink }} />
                  <button className="btn" onClick={() => {
                    if (!psDraft.title.trim()) return;
                    setSessions((ss) => [...ss, { sid: uid(), date: psDraft.date.trim() || "TBD", time: "16:00–18:00", place: "EV2.309", title: psDraft.title.trim(), who: psDraft.who.trim() || "TBD", kind: "talk", done: false }]);
                    setPsDraft({ date: "", title: "", who: "" });
                  }}><Plus size={15} /> Add</button>
                </div>
              </div>
              </>)}

              {progTab === "attendance" && (
                roster.length === 0 ? (
                  <div className="card" style={{ marginTop: 20, color: T.muted, fontSize: 13.5 }}>
                    No members yet. Attendance is built from the member lists in <button onClick={() => setView("teams")} style={{ color: accent, fontWeight: 600, textDecoration: "underline" }}>Teams</button> — add one person per line (name and email) and they'll appear here.
                  </div>
                ) : (() => {
                  const cur = sessions.find((s) => s.sid === attSessionId) || sessions[0];
                  if (!cur) return <div className="card" style={{ marginTop: 20, color: T.muted, fontSize: 13.5 }}>Add a session first.</div>;
                  const st = attStats(cur.sid);
                  const byTeam = {};
                  roster.forEach((r) => { (byTeam[r.team] = byTeam[r.team] || []).push(r); });
                  const pill = { present: { bg: "#E8F0DD", fg: T.ok, lbl: "Present" }, absent: { bg: "#FBE3DC", fg: T.danger, lbl: "Absent" }, excused: { bg: "#FBF1D8", fg: "#9a7b12", lbl: "Excused" } };
                  return (
                    <>
                      <div className="chiprow" style={{ marginTop: 18 }}>
                        {sessions.map((s) => {
                          const ss = attStats(s.sid);
                          return (
                            <button key={s.sid} title={s.title} className={"chip" + (cur.sid === s.sid ? " on" : "")} onClick={() => setAttSessionId(s.sid)}>
                              {s.date} · {s.title.length > 20 ? s.title.slice(0, 18) + "…" : s.title}
                              <span className="mono" style={{ fontSize: 10, marginLeft: 6, opacity: 0.85 }}>{ss.marked ? `${ss.present}/${ss.total}` : "—"}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="card" style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                          <div>
                            <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{cur.title}</div>
                            <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>
                              {cur.date}{cur.time ? " · " + cur.time : ""}{cur.place ? " · " + cur.place : ""}{cur.who ? " · " + cur.who : ""}
                            </div>
                            <div className="mono" style={{ fontSize: 12, marginTop: 6 }}>
                              <span style={{ color: T.ok }}>{st.present} present</span> · <span style={{ color: T.danger }}>{st.absent} absent</span> · <span style={{ color: "#9a7b12" }}>{st.excused} excused</span> · <span style={{ color: T.muted }}>{st.total - st.marked} unmarked</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="mini" onClick={() => markAllPresent(cur.sid)}>Mark all present</button>
                            <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => printSignIn(cur)}>
                              <Download size={13} /> Sign-in sheet
                            </button>
                          </div>
                        </div>
                        <div className="track" style={{ marginBottom: 4 }}><div style={{ width: (st.total ? (st.present / st.total) * 100 : 0) + "%", background: accent }} /></div>

                        {Object.keys(byTeam).sort().map((team) => (
                          <div key={team} style={{ marginTop: 14 }}>
                            <div className="eyebrow" style={{ marginBottom: 4 }}>{team}</div>
                            {byTeam[team].map((r) => {
                              const v = attFor(cur.sid)[r.key];
                              const p = v ? pill[v] : null;
                              return (
                                <div key={r.rowId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.hairline}` }}>
                                  <button onClick={() => cycleAtt(cur.sid, r.key)} title="Click to cycle present → absent → excused"
                                    style={{ flex: "0 0 92px", textAlign: "left" }}>
                                    {p ? <Pill bg={p.bg} fg={p.fg}>{p.lbl}</Pill> : <Pill bg="#EFEAE5" fg={T.muted}>Unmarked</Pill>}
                                  </button>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                                    {r.email && <div className="mono" style={{ fontSize: 10.5, color: T.muted }}>{r.email}</div>}
                                  </div>
                                  <button onClick={() => removePerson(r)} title={`Remove ${r.name} from ${r.team}`}
                                    style={{ flex: "0 0 auto", color: T.muted, display: "grid", placeItems: "center", padding: 3 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </>
          )}

          {view === "knowledge" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Knowledge base</div>
                  <div className="sub">The team's answer sheet — rules, applicant FAQ, and ready-to-send email templates. Entries marked draft need Pascal's confirmation before quoting.</div>
                </div>
                <div className="tabs">
                  <button className={kbTab === "rules" ? "on" : ""} onClick={() => setKbTab("rules")}>Rules & eligibility</button>
                  <button className={kbTab === "faq" ? "on" : ""} onClick={() => setKbTab("faq")}>FAQ</button>
                  <button className={kbTab === "templates" ? "on" : ""} onClick={() => setKbTab("templates")}>Templates</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
                <div className="search">
                  <Search size={15} style={{ color: T.muted }} />
                  <input placeholder="Search this tab…" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} />
                </div>
                <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { addKb(kbTab); }}>
                  <Plus size={13} /> Add entry
                </button>
              </div>

              {(() => {
                const q = kbQuery.trim().toLowerCase();
                const items = kb.filter((k) => k.category === kbTab &&
                  (!q || (k.title || "").toLowerCase().includes(q) || (k.body || "").toLowerCase().includes(q)));
                if (!items.length)
                  return <div className="card" style={{ marginTop: 16, color: T.muted, fontSize: 13.5 }}>Nothing here{q ? " matches that search" : " yet"} — add an entry.</div>;
                return (
                  <div className="scards" style={{ marginTop: 16 }}>
                    {items.map((k) => (
                      kbEdit === k.id ? (
                        <div key={k.id} className="card" style={{ padding: 15, borderColor: T.burgundy, boxShadow: `0 0 0 1px ${T.tint} inset` }}>
                          <input value={k.title} onChange={(e) => updKb(k.id, { title: e.target.value })} placeholder={kbTab === "faq" ? "Question" : "Title"}
                            style={{ width: "100%", padding: "7px 9px", border: `1px solid ${T.hairline}`, borderRadius: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 600, marginBottom: 8, background: T.surface, color: T.ink, boxSizing: "border-box" }} />
                          <div style={{ marginBottom: 10 }}>
                            <NoteField value={k.body} onChange={(v) => updKb(k.id, { body: v })} minRows={7}
                              mono={kbTab === "templates"}
                              placeholder={kbTab === "templates" ? "Email body — [brackets] for the parts to personalize" : "The answer, in plain language"}
                              style={{ fontSize: 12.5 }} />
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button className={"mini" + (k.draft ? " on" : "")} style={k.draft ? { borderColor: T.warn, color: "#9a7b12", background: "#FBF1D8" } : {}}
                              onClick={() => updKb(k.id, { draft: !k.draft })}>{k.draft ? "⚠ Draft" : "Confirmed"}</button>
                            <button className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "7px 12px" }} onClick={() => setKbEdit(null)}>Done</button>
                            <button className="btn ghost" style={{ padding: "7px 10px" }} onClick={() => { rmKb(k.id); setKbEdit(null); }} title="Remove entry"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <div key={k.id} className="card" style={{ padding: 15 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <span className="disp" style={{ fontWeight: 700, fontSize: 14.5 }}>{k.title || "Untitled"}</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto" }}>
                              {k.draft && <Pill bg="#FBF1D8" fg="#9a7b12">⚠ Draft</Pill>}
                              <button onClick={() => setKbEdit(k.id)} title="Edit" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Pencil size={13} /></button>
                            </div>
                          </div>
                          <div style={{ color: T.muted, fontSize: 12.5, marginTop: 7, lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: k.category === "templates" ? "'IBM Plex Mono', monospace" : "inherit" }}>
                            {k.body}
                          </div>
                          {k.category === "templates" && (
                            <button className="mini" style={{ marginTop: 11 }} onClick={() => copyKb(k)}>
                              <Copy size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{copiedId === k.id ? "Copied ✓" : "Copy email"}
                            </button>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {view === "cohorts" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Cohorts</div>
                  <div className="sub">Every team we've backed — their wins, Phase II runs and traction — ready to promote. Plus who's coming to Homecoming.</div>
                </div>
                <div className="tabs">
                  <button className={cohortsTab === "success" ? "on" : ""} onClick={() => setCohortsTab("success")}>Success stories</button>
                  <button className={cohortsTab === "homecoming" ? "on" : ""} onClick={() => setCohortsTab("homecoming")}>Homecoming</button>
                </div>
              </div>

              {cohortsTab === "success" ? (
                <>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
                    <button className={"chip" + (cohortFilter === "all" ? " on" : "")} onClick={() => setCohortFilter("all")}>All</button>
                    {cohortData.map((co) => (
                      <button key={co.c} className={"chip" + (cohortFilter === co.c ? " on" : "")} onClick={() => setCohortFilter(co.c)}>{co.c}</button>
                    ))}
                    <button className={"chip" + (cohortFilter === "phase2" ? " on" : "")} onClick={() => setCohortFilter("phase2")}>Phase II only</button>
                    <div className="search" style={{ marginLeft: "auto" }}>
                      <Search size={15} style={{ color: T.muted }} />
                      <input placeholder="Search teams…" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                  </div>

                  <label
                    className={"drop" + (dragging ? " drag" : "")}
                    style={{ marginTop: 14 }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); onCohortFile(e.dataTransfer.files[0]); }}
                  >
                    <span className="ic"><UploadCloud size={18} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Bulk-add past teams</div>
                      <div style={{ color: T.muted, fontSize: 11.5 }}>CSV or Excel. We map name, description, cohort, year, awards, Phase II and note. New cohorts are created automatically.</div>
                    </div>
                    <span className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }}>Browse</span>
                    <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => onCohortFile(e.target.files[0])} />
                  </label>
                  {cohortMsg && <div style={{ fontSize: 12, color: T.ok, marginTop: 8 }}>{cohortMsg}</div>}

                  {(() => {
                    const q = query.trim().toLowerCase();
                    const match = (t) => (cohortFilter !== "phase2" || t.phase2) && (!q || (t.name || "").toLowerCase().includes(q) || (t.blurb || "").toLowerCase().includes(q));
                    const anyVisible = cohortData.some((co) => (cohortFilter === "all" || cohortFilter === "phase2" || cohortFilter === co.c) && co.teams.some(match));
                    if (!anyVisible)
                      return <div className="card" style={{ marginTop: 16, color: T.muted, fontSize: 13.5 }}>No teams match that. Try another cohort, clear the search, or drop in a file above.</div>;
                    return cohortData.map((co, ci) => {
                      if (cohortFilter !== "all" && cohortFilter !== "phase2" && cohortFilter !== co.c) return null;
                      const visible = co.teams.map((t, ti) => ({ t, ti })).filter(({ t }) => match(t));
                      if (!visible.length) return null;
                      return (
                        <div key={co.c || ci} style={{ marginTop: 22 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
                            <span className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{co.c}</span>
                            <span className="mono" style={{ fontSize: 12, color: T.muted }}>{co.year}</span>
                            <span className="mono" style={{ fontSize: 11, color: T.muted }}>· {co.teams.length} team{co.teams.length === 1 ? "" : "s"}</span>
                            <button className="btn ghost" style={{ marginLeft: "auto", fontSize: 11.5, padding: "5px 10px" }} onClick={() => setEditTeam(addTeam(ci))}><Plus size={13} /> Add team</button>
                          </div>
                          <div className="scards">
                            {visible.map(({ t, ti }) => (
                              editTeam === t.rid && t.rid ? (
                                <TeamEditCard key={t.rid} t={t} awards={AWARDS}
                                  onChange={(patch) => updTeam(ci, ti, patch)}
                                  onToggleAward={(a) => toggleAward(ci, ti, a)}
                                  onDone={() => setEditTeam(null)}
                                  onRemove={async () => {
                                    if (!(await ui.confirm("It is removed from the success library.", { title: `Remove ${t.name || "this team"}?`, confirmLabel: "Remove", danger: true }))) return;
                                    rmTeam(ci, ti); setEditTeam(null);
                                  }} />
                              ) : (
                                <TeamCard key={t.rid || `${ci}-${ti}`} t={t} onEdit={() => setEditTeam(t.rid)} />
                              )
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              ) : (
                <div className="grid resp" style={{ gridTemplateColumns: "0.8fr 2fr", marginTop: 20 }}>
                  <div className="card stat" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div className="n" style={{ color: accent }}>{comingPct}%</div>
                    <div className="l">of alumni teams confirmed for Homecoming</div>
                    <div style={{ marginTop: 14 }}>
                      <div className="track"><div style={{ width: comingPct + "%", background: accent }} /></div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0" }}>
                      <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addAlum}><Plus size={14} /> Add team</button>
                    </div>
                    <table>
                      <thead><tr><th>Team</th><th>Cohort year</th><th>Contact</th><th>RSVP</th><th></th></tr></thead>
                      <tbody>
                        {alumni.map((a, i) => (
                          <tr key={a.rid || `alum-${i}`}>
                            <td style={{ minWidth: 150 }}>
                              <span style={{ display: "flex", alignItems: "center" }}>
                                <GraduationCap size={14} style={{ marginRight: 5, color: T.muted, flex: "0 0 auto" }} />
                                <EInput value={a.team} onChange={(v) => updAlum(i, { team: v })} placeholder="Team" />
                              </span>
                            </td>
                            <td style={{ minWidth: 90 }}><EInput value={a.year} onChange={(v) => updAlum(i, { year: v })} placeholder="Year" mono /></td>
                            <td style={{ minWidth: 150 }}><EInput value={a.contact} onChange={(v) => updAlum(i, { contact: v })} placeholder="Contact" /></td>
                            <td>
                              <div style={{ display: "inline-flex", gap: 5 }}>
                                {[["coming", "Coming"], ["maybe", "Maybe"], ["no", "Can't"]].map(([v, lbl]) => (
                                  <button key={v} className={"mini" + (a.status === v ? " on" : "")}
                                    onClick={() => updAlum(i, { status: v })}>{lbl}</button>
                                ))}
                              </div>
                            </td>
                            <td><button onClick={() => rmAlum(i)} title="Remove" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {view === "phase2" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Phase II · funded teams</div>
                  <div className="sub">The Maturation-year teams — track disbursement of their award and the support meetings held with each.</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {missingP2.length > 0 && (
                    <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={pullP2FromResults}>
                      <Plus size={13} /> Add {missingP2.length} from Demo Day
                    </button>
                  )}
                  <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={addP2}><Plus size={13} /> Add team</button>
                </div>
              </div>

              {(() => {
                const totAwarded = phase2.reduce((s, p) => s + (Number(p.awarded) || 0), 0);
                const totPaid = phase2.reduce((s, p) => s + p2Paid(p), 0);
                return (
                  <div className="grid resp" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18, gap: 12 }}>
                    <Stat n={phase2.filter((p) => p.status === "active").length} l="Active Phase II teams" accent={accent} />
                    <Stat n={`$${totPaid.toLocaleString()}`} l="Disbursed to date" accent={accent} />
                    <Stat n={`$${Math.max(totAwarded - totPaid, 0).toLocaleString()}`} l="Committed, not yet paid" accent={accent} />
                  </div>
                );
              })()}

              {phase2.length === 0 ? (
                <div className="card" style={{ marginTop: 16, color: T.muted, fontSize: 13.5 }}>
                  No Phase II teams yet. Pull them in from a cycle's Demo Day results, or add one manually.
                </div>
              ) : (
                <>
                  <div className="chiprow" style={{ marginTop: 18 }}>
                    {[...phase2].sort((a, b) => (a.cohort || "").localeCompare(b.cohort || "") || (a.team || "").localeCompare(b.team || "")).map((p) => {
                      const paid = p2Paid(p);
                      const full = Number(p.awarded) > 0 && paid >= Number(p.awarded);
                      return (
                        <button key={p.id} title={p.team || "Untitled"} className={"chip" + (activeP2 && activeP2.id === p.id ? " on" : "")} onClick={() => setActiveP2Id(p.id)} style={{ maxWidth: 260 }}>
                          {p.team || "Untitled"}
                          <span className="mono" style={{ fontSize: 10, marginLeft: 6, color: full ? T.ok : T.muted }}>
                            {full ? "paid" : `$${paid.toLocaleString()}/${Number(p.awarded) ? "$" + Number(p.awarded).toLocaleString() : "—"}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeP2 && (() => {
                    const paid = p2Paid(activeP2);
                    const awarded = Number(activeP2.awarded) || 0;
                    const pct = awarded ? Math.min(Math.round((paid / awarded) * 100), 100) : 0;
                    const remaining = Math.max(awarded - paid, 0);
                    return (
                      <div className="grid resp" style={{ gridTemplateColumns: "1fr 1.25fr", marginTop: 14 }}>
                        <div className="card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div className="eyebrow">Team</div>
                            <button onClick={() => rmP2(activeP2.id)} title="Remove from tracking" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button>
                          </div>
                          <EInput value={activeP2.team} onChange={(v) => updP2(activeP2.id, { team: v })} placeholder="Team name" />
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginTop: 10 }}>
                            <div><div className="eyebrow" style={{ marginBottom: 3 }}>Cohort</div><EInput value={activeP2.cohort} onChange={(v) => updP2(activeP2.id, { cohort: v })} placeholder="Cohort 7" /></div>
                            <div>
                              <div className="eyebrow" style={{ marginBottom: 3 }}>Status</div>
                              <button className={"mini" + (activeP2.status === "completed" ? " on" : "")}
                                style={activeP2.status === "completed" ? { borderColor: T.ok, color: T.ok, background: T.surface } : {}}
                                onClick={() => updP2(activeP2.id, { status: activeP2.status === "completed" ? "active" : "completed" })}>
                                {activeP2.status === "completed" ? "Completed" : "Active"}
                              </button>
                            </div>
                          </div>
                          <div className="eyebrow" style={{ margin: "12px 0 3px" }}>Award ($/yr)</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span className="mono" style={{ color: T.muted }}>$</span>
                            <EInput value={activeP2.awarded} onChange={(v) => { const n = v.replace(/\D/g, "").slice(0, 6); updP2(activeP2.id, { awarded: n === "" ? "" : Math.min(Number(n), 50000) }); }} placeholder="0" mono w="90px" />
                          </div>
                          <div style={{ marginTop: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span className="eyebrow">Disbursed</span>
                              <span className="mono" style={{ fontSize: 12.5, color: remaining === 0 && awarded > 0 ? T.ok : T.ink }}>
                                ${paid.toLocaleString()}{awarded ? ` of $${awarded.toLocaleString()}` : ""}
                              </span>
                            </div>
                            <div className="track" style={{ marginTop: 7 }}><div style={{ width: pct + "%", background: remaining === 0 && awarded > 0 ? T.ok : accent }} /></div>
                            {awarded > 0 && <div style={{ color: T.muted, fontSize: 11.5, marginTop: 5 }}>{remaining > 0 ? `$${remaining.toLocaleString()} remaining` : "Fully disbursed"}</div>}
                          </div>
                          <div className="eyebrow" style={{ margin: "12px 0 3px" }}>Note</div>
                          <NoteField value={activeP2.note} onChange={(v) => updP2(activeP2.id, { note: v })}
                            placeholder="Awards, focus, anything worth remembering" minRows={5} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div className="card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div className="eyebrow">Payments · {(activeP2.payments || []).length}</div>
                              <button className="mini" onClick={() => addP2Sub(activeP2.id, "payments", { date: todayISO(), amount: "", note: "" })}><Plus size={11} style={{ verticalAlign: -1 }} /> Payment</button>
                            </div>
                            {(activeP2.payments || []).length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>No payments recorded yet.</div>}
                            {(activeP2.payments || []).map((pay) => (
                              <div key={pay.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: `1px solid ${T.hairline}` }}>
                                <div style={{ flex: "0 0 auto", paddingTop: 1 }}>
                                  <DateField value={pay.date} onChange={(v) => updP2Sub(activeP2.id, "payments", pay.id, { date: v })} w="126px" title="Payment date" />
                                </div>
                                <span className="mono" style={{ color: T.muted, fontSize: 12, paddingTop: 7 }}>$</span>
                                <EInput value={pay.amount} onChange={(v) => { const val = v.replace(/\D/g, "").slice(0, 6); updP2Sub(activeP2.id, "payments", pay.id, { amount: val === "" ? "" : Number(val) }); }} placeholder="0" mono w="70px" ariaLabel="Payment amount" />
                                <NoteField value={pay.note} onChange={(v) => updP2Sub(activeP2.id, "payments", pay.id, { note: v })} placeholder="Tranche / milestone — and any conditions attached" minRows={1} />
                                <IconBtn title="Remove payment" style={{ marginTop: 4 }} onClick={() => rmP2Sub(activeP2.id, "payments", pay.id)}><Trash2 size={13} /></IconBtn>
                              </div>
                            ))}
                          </div>

                          <div className="card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div className="eyebrow">Support meetings · {(activeP2.meetings || []).length}</div>
                              <button className="mini" onClick={() => addP2Sub(activeP2.id, "meetings", { date: todayISO(), note: "" })}><Plus size={11} style={{ verticalAlign: -1 }} /> Meeting</button>
                            </div>
                            {(activeP2.meetings || []).length === 0 && <div style={{ color: T.muted, fontSize: 12.5 }}>No meetings logged yet.</div>}
                            {(activeP2.meetings || []).map((m) => (
                              <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: `1px solid ${T.hairline}` }}>
                                <div style={{ flex: "0 0 auto", paddingTop: 1 }}>
                                  <DateField value={m.date} onChange={(v) => updP2Sub(activeP2.id, "meetings", m.id, { date: v })} w="126px" title="Meeting date" />
                                </div>
                                <NoteField value={m.note} onChange={(v) => updP2Sub(activeP2.id, "meetings", m.id, { note: v })} placeholder="Notes, decisions, action items — as long as you need" minRows={2} />
                                <IconBtn title="Remove meeting" style={{ marginTop: 4 }} onClick={() => rmP2Sub(activeP2.id, "meetings", m.id)}><Trash2 size={13} /></IconBtn>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small components ---------- */
function Stat({ n, l, accent }) {
  return (
    <div className="card stat">
      <div className="n" style={{ color: accent }}>{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}
function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.muted }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} /> {label}
    </span>
  );
}
function Swimlane({ label, sub, pct, accent }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11.5, color: T.muted }}>{sub}</span>
      </div>
      <div className="track"><div style={{ width: pct + "%", background: accent }} /></div>
    </div>
  );
}
function Alert({ icon, text, cta, onClick, accent, last, tone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${T.hairline}` }}>
      <span style={{ color: tone || accent, display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: tone ? T.dangerTint : T.paper, flex: "0 0 30px" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5 }}>{text}</span>
      <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={onClick}>{cta}</button>
    </div>
  );
}
function TeamCard({ t, onEdit }) {
  return (
    <div className="card" style={{ padding: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span className="disp" style={{ fontWeight: 700, fontSize: 15 }}>{t.name || "Untitled team"}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto" }}>
          {t.phase2 && <Pill bg={T.tint} fg={T.burgundy}>Phase II</Pill>}
          <button onClick={onEdit} title="Edit team" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Pencil size={13} /></button>
        </div>
      </div>
      <div style={{ color: T.muted, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>{t.blurb}</div>
      {(t.awards.length > 0 || t.note) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11, alignItems: "center" }}>
          {t.awards.map((a) => (
            <span key={a} className="award" style={{ background: AWARD_COLOR[a] || T.muted, color: a === "Most Innovative" ? T.ink : "#fff" }}>
              <Award size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{a}
            </span>
          ))}
          {t.note && <span style={{ fontSize: 11.5, color: T.ok, fontWeight: 600 }}>● {t.note}</span>}
        </div>
      )}
    </div>
  );
}
function TeamEditCard({ t, awards, onChange, onToggleAward, onDone, onRemove }) {
  const inp = { width: "100%", padding: "7px 9px", border: `1px solid ${T.hairline}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, background: T.surface, color: T.ink };
  return (
    <div className="card" style={{ padding: 15, borderColor: T.burgundy, boxShadow: `0 0 0 1px ${T.tint} inset` }}>
      <input value={t.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Team name" style={{ ...inp, fontSize: 14, fontWeight: 600, marginBottom: 8 }} />
      <div style={{ marginBottom: 10 }}>
        <NoteField value={t.blurb} onChange={(v) => onChange({ blurb: v })} placeholder="What the project is" minRows={2} style={{ fontSize: 12.5 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {awards.map((a) => {
          const on = t.awards.includes(a);
          return <button key={a} className="mini" style={on ? { borderColor: AWARD_COLOR[a], color: a === "Most Innovative" ? T.ink : "#fff", background: AWARD_COLOR[a] } : {}} onClick={() => onToggleAward(a)}>{a}</button>;
        })}
        <button className="mini" style={t.phase2 ? { borderColor: T.burgundy, color: "#fff", background: T.burgundy } : {}} onClick={() => onChange({ phase2: !t.phase2 })}>Phase II</button>
      </div>
      <div style={{ marginBottom: 11 }}>
        <NoteField value={t.note || ""} onChange={(v) => onChange({ note: v })} placeholder="Traction note — clients, funding, pilots, press" minRows={2} style={{ fontSize: 12.5 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onDone}>Done</button>
        <button className="btn ghost" onClick={onRemove} title="Remove team"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
function CallCard({ call, active, palette, editing, onEdit, onChange, onUse, onRemove }) {
  const fld = (k, ph, opts = {}) => (
    <input value={call[k] ?? ""} onChange={(e) => onChange({ [k]: opts.num ? e.target.value.replace(/\D/g, "") : e.target.value })} placeholder={ph}
      className={opts.mono ? "mono" : ""}
      style={{ width: opts.w || "100%", padding: "7px 9px", border: `1px solid ${T.hairline}`, borderRadius: 8, fontFamily: opts.mono ? "IBM Plex Mono" : "inherit", fontSize: 13, background: T.surface, color: T.ink }} />
  );
  if (editing) {
    return (
      <div className="card" style={{ padding: 16, borderColor: call.accent, boxShadow: `0 0 0 1px ${call.accent} inset` }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Edit call</div>
        <div style={{ marginBottom: 8 }}>{fld("name", "Call name")}</div>
        <div style={{ marginBottom: 11 }}>{fld("topic", "Topic")}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 11 }}>
          {fld("open", "Opens", { mono: true })}{fld("close", "Closes", { mono: true })}{fld("subs", "Subs", { mono: true, num: true })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 13 }}>
          {palette.map((p) => (
            <button key={p.hex} title={p.name} onClick={() => onChange({ accent: p.hex })}
              style={{ width: 24, height: 24, borderRadius: 999, background: p.hex, border: call.accent === p.hex ? `2px solid ${T.ink}` : "2px solid transparent" }} />
          ))}
        </div>
        <button className="btn" style={{ background: call.accent, width: "100%", justifyContent: "center" }} onClick={onEdit}>Done</button>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 16, borderColor: active ? call.accent : T.hairline, boxShadow: active ? `0 0 0 1px ${call.accent} inset` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: call.accent }} />
        <span className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{call.name} call</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={onEdit} title="Edit call" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Pencil size={13} /></button>
          {onRemove && <button onClick={onRemove} title="Remove call" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button>}
        </div>
      </div>
      <div style={{ color: T.muted, fontSize: 13, marginTop: 6 }}>{call.topic}</div>
      <div style={{ display: "flex", gap: 22, marginTop: 16 }}>
        <div><div className="eyebrow">Opens</div><div className="mono" style={{ fontSize: 13.5, marginTop: 3 }}>{call.open}</div></div>
        <div><div className="eyebrow">Closes</div><div className="mono" style={{ fontSize: 13.5, marginTop: 3 }}>{call.close}</div></div>
        <div><div className="eyebrow">Subs</div><div className="disp" style={{ fontSize: 21, fontWeight: 800, marginTop: 1, color: call.accent }}>{call.subs}</div></div>
      </div>
      <button className="mini" style={active ? { marginTop: 14, borderColor: call.accent, color: "#fff", background: call.accent } : { marginTop: 14 }} onClick={onUse}>
        {active ? "Active theme" : "Use this theme"}
      </button>
    </div>
  );
}
function AddCallCard({ draft, setDraft, palette, onAdd }) {
  if (!draft.open) {
    return (
      <button className="card" onClick={() => setDraft((d) => ({ ...d, open: true }))}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.muted, border: `1.5px dashed ${T.hairline}`, cursor: "pointer", minHeight: 150 }}>
        <Plus size={22} />
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>Add a call</span>
        <span style={{ fontSize: 11.5 }}>Choose a topic and colour</span>
      </button>
    );
  }
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <div className="card" style={{ padding: 16, borderColor: draft.accent, boxShadow: `0 0 0 1px ${draft.accent} inset` }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>New call</div>
      <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Call name (e.g. Special)"
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, marginBottom: 8, background: T.surface, color: T.ink }} />
      <input value={draft.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="Topic (e.g. Climate tech)"
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.hairline}`, borderRadius: 9, fontFamily: "inherit", fontSize: 13, marginBottom: 11, background: T.surface, color: T.ink }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 13 }}>
        {palette.map((p) => (
          <button key={p.hex} title={p.name} onClick={() => set({ accent: p.hex })}
            style={{ width: 24, height: 24, borderRadius: 999, background: p.hex, border: draft.accent === p.hex ? `2px solid ${T.ink}` : "2px solid transparent", outline: draft.accent === p.hex ? `2px solid ${p.hex}` : "none", outlineOffset: 1 }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ background: draft.accent, flex: 1, justifyContent: "center" }} onClick={onAdd}>Add call</button>
        <button className="btn ghost" onClick={() => setDraft({ open: false, name: "", topic: "", accent: palette[1].hex })}>Cancel</button>
      </div>
    </div>
  );
}
