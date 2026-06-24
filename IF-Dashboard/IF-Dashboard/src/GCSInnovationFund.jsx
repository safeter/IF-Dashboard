import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useCloudSection } from "./lib/cloud";
import {
  LayoutGrid, Megaphone, ListChecks, CalendarDays, Users2,
  ArrowRight, Check, Clock, X, Sparkles, GraduationCap,
  UploadCloud, RefreshCw, CalendarCheck, Trophy, Pizza,
  CheckCircle2, Circle, Search, Award, Plus, Trash2, Pencil,
} from "lucide-react";

/* ============================================================
   GCS Innovation Fund — clickable prototype
   Design system: Wealthsimple warm minimalism × Gina Cody burgundy
   Brand hex verified: Concordia Burgundy #912338, Wealthsimple Dune #32302F
   ============================================================ */

const T = {
  paper: "#FAF8F5", surface: "#FFFFFF", ink: "#32302F", muted: "#6E6E6E",
  hairline: "#ECE7E1", burgundy: "#912338", tint: "#E9D3D7", gold: "#CBB576",
  turquoise: "#057D78", turqTint: "#CCE3E4",
  ok: "#508212", info: "#0072A8", warn: "#E5A712", danger: "#DA3A16",
};

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
.main{flex:1;min-width:0;display:flex;flex-direction:column}
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
.kchip{background:${T.surface};border:1px solid ${T.hairline};border-radius:11px;padding:11px;margin-top:9px}
.tabs{display:inline-flex;gap:4px;background:${T.surface};border:1px solid ${T.hairline};
  border-radius:11px;padding:3px}
.tabs button{padding:6px 13px;border-radius:8px;font-size:13px;font-weight:600;color:${T.muted}}
.tabs button.on{background:var(--accent);color:#fff}
.timeline{position:relative;padding-left:26px}
.timeline:before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:${T.hairline}}
.tnode{position:absolute;left:0;width:16px;height:16px;border-radius:50%;border:3px solid ${T.paper}}
.swim{display:flex;align-items:center;gap:14px}
.track{flex:1;height:9px;border-radius:999px;background:${T.hairline};overflow:hidden}
.track>div{height:100%;border-radius:999px;background:var(--accent)}
@media(max-width:860px){
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
  background:${T.surface};color:${T.muted}}
.chip.on{border-color:var(--accent);color:#fff;background:var(--accent)}
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
function cycleLabel(d = NOW) {
  const y = d.getFullYear(), m = d.getMonth(); // Jan–Mar: prior cohort finishing; else current
  const start = m <= 2 ? y - 1 : y;
  return `${start}–${String((start + 1) % 100).padStart(2, "0")}`;
}
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
  { id:1, name:"NeuroWeave", blurb:"Adaptive EEG headband for focus training", cohort:"regular", flaggedBy:["Judges","Program team"], score:26, stage:"scheduled", agreed:"yes", date:"Jul 4, 10:00", outcome:null },
  { id:2, name:"HydroSense", blurb:"Low-cost lead sensors for municipal water", cohort:"regular", flaggedBy:["Judges"], score:22, stage:"responded", agreed:"yes", date:"", outcome:null },
  { id:3, name:"GridGuard", blurb:"Anomaly detection for grid SCADA networks", cohort:"special", flaggedBy:["Judges","Program team"], score:27, stage:"completed", agreed:"yes", date:"Jul 2, 14:30", outcome:"select" },
  { id:4, name:"TerraCast", blurb:"Soil-carbon modelling for small farms", cohort:"regular", flaggedBy:["Program team"], score:19, stage:"invited", agreed:"pending", date:"", outcome:null },
  { id:5, name:"PhishFence", blurb:"On-device phishing detection for SMBs", cohort:"special", flaggedBy:["Judges"], score:21, stage:"flagged", agreed:"pending", date:"", outcome:null },
  { id:6, name:"MediMesh", blurb:"Mesh network for rural clinic devices", cohort:"regular", flaggedBy:["Judges","Program team"], score:24, stage:"completed", agreed:"yes", date:"Jul 1, 11:00", outcome:"waitlist" },
  { id:7, name:"AeroPatch", blurb:"Drone-applied crop micro-treatments", cohort:"regular", flaggedBy:["Judges"], score:16, stage:"responded", agreed:"declined", date:"", outcome:null },
  { id:8, name:"CipherVault", blurb:"Post-quantum key vault for IoT fleets", cohort:"special", flaggedBy:["Judges","Program team"], score:27, stage:"scheduled", agreed:"yes", date:"Jul 5, 09:30", outcome:null },
];

const CLASSES = [
  { course: "ENGR 290 — Engineering Design", prof: "Dr. A. Khoury", date: "Feb 11", campus: "SGW", calls: ["Regular", "Special"], done: true },
  { course: "COMP 6231 — Distributed Systems", prof: "Dr. L. Tremblay", date: "Feb 18", campus: "SGW", calls: ["Special"], done: true },
  { course: "MECH 393 — Capstone", prof: "Dr. R. Okafor", date: "Mar 3", campus: "Loyola", calls: ["Regular"], done: false },
  { course: "INSE 6130 — OS Security", prof: "Dr. M. Debbabi", date: "Mar 6", campus: "SGW", calls: ["Special"], done: false },
];

const PIZZA = [
  { title: "Pizza Q&A · Hall building", date: "Feb 13", time: "12:00", room: "H-820", reg: 42, done: true },
  { title: "Pizza Q&A · EV building", date: "Feb 27", time: "13:00", room: "EV-2.184", reg: 35, done: true },
  { title: "Pizza Q&A · Special call info", date: "Mar 5", time: "12:30", room: "EV-3.309", reg: 28, done: false },
];

/* configurable calls — each has its own topic + colour, like the switcher */
const PALETTE = [
  { name: "Burgundy", hex: "#912338" },
  { name: "Turquoise", hex: "#057D78" },
  { name: "Dark blue", hex: "#004085" },
  { name: "Mauve", hex: "#573996" },
  { name: "Magenta", hex: "#DB0272" },
  { name: "Green", hex: "#508212" },
  { name: "Orange", hex: "#DA3A16" },
  { name: "Gold", hex: "#9A7B12" },
];
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
    ["Validate judges with Dr. Shihab", "Program team"],
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
  { date:"Sep 12", title:"Kickoff — rules, entrepreneurship, VC primer", who:"Pascal Dubois · Arman · Riccardo (D3)", kind:"milestone", done:true },
  { date:"Oct 3",  title:"Fundamentals of entrepreneurship", who:"Ehsan Derayati", kind:"talk", done:true },
  { date:"Oct 17", title:"Homecoming — alumni mixer", who:"Past cohorts", kind:"community", done:true },
  { date:"Nov 7",  title:"VC funding", who:"Riccardo (D3)", kind:"talk", done:false },
  { date:"Nov 21", title:"Storytelling", who:"Johanne Pelletier", kind:"talk", done:false },
  { date:"Dec 5",  title:"Monthly progress meetings", who:"Program team × teams", kind:"meeting", done:false },
  { date:"Jan 16", title:"Philosophy of entrepreneurship", who:"Pierre Chamberland", kind:"talk", done:false },
  { date:"Feb 6",  title:"From the field — Innovation Fund graduate", who:"Alumni guest", kind:"talk", done:false },
  { date:"Feb 20", title:"Intellectual property", who:"Denis Keseris", kind:"talk", done:false },
  { date:"Mar 6",  title:"Extra session (topic TBD)", who:"To be confirmed", kind:"talk", done:false },
  { date:"Mar 27", title:"Demo Day", who:"All teams", kind:"milestone", done:false },
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
const mapCohort = (v) => (/special|cyber|security/.test(String(v).toLowerCase()) ? "special" : "regular");
const mapAgreed = (v) => {
  const s = String(v).toLowerCase();
  if (/declin|reject|can.?t|^no\b|unavail/.test(s)) return "declined";
  if (/yes|agree|confirm|accept|attend|✓/.test(s)) return "yes";
  return "pending";
};
const mapOutcome = (v) => {
  const s = String(v).toLowerCase().trim();
  if (!s) return null;
  if (/wait/.test(s)) return "waitlist";
  if (/reject|declin|not\s?select|cut|^no\b/.test(s)) return "reject";
  if (/select|accept|award|win|fund|advance/.test(s)) return "select";
  return null;
};
const mapStage = (v, hasDate, outcome) => {
  const s = String(v).toLowerCase().trim();
  const hit = STAGES.find((st) => s.includes(st.id) || s.includes(st.label.toLowerCase()));
  if (hit) return hit.id;
  if (outcome) return "decided";
  if (hasDate) return "scheduled";
  return "flagged";
};
const splitList = (v) => String(v).split(/[;,/|]/).map((x) => x.trim()).filter(Boolean);

function rowsToTeams(rows) {
  const clean = (rows || []).filter((r) => r && Object.keys(r).length);
  if (!clean.length) return [];
  const headers = Object.keys(clean[0]);
  const hName = pickCol(headers, /team|project|name|startup|venture/);
  if (!hName) return [];
  const hBlurb = pickCol(headers, /blurb|descr|summary|pitch|idea|one.?lin|tagline|about/);
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
        id: i + 1,
        name,
        blurb: hBlurb ? String(r[hBlurb] ?? "").trim() : "",
        cohort: hCohort ? mapCohort(r[hCohort]) : "regular",
        flaggedBy: flags.length ? flags : ["Imported"],
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
const EInput = ({ value, onChange, placeholder, w, mono, align }) => (
  <input
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={mono ? "mono" : ""}
    style={{
      width: w || "100%", padding: "6px 8px", border: "1px solid transparent",
      borderRadius: 8, fontFamily: mono ? "IBM Plex Mono" : "inherit", fontSize: 13,
      background: "transparent", color: "var(--ink, #32302F)", textAlign: align || "left",
    }}
    onFocus={(e) => { e.target.style.background = "#FAF8F5"; e.target.style.borderColor = "#ECE7E1"; }}
    onBlur={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "transparent"; }}
  />
);

/* ---------- annual wheel (signature element) ---------- */
function Wheel({ accent }) {
  const cx = 160, cy = 160, R = 320;
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
const CHECK_SEED = (() => {
  const preset = new Set(["0-0", "0-1", "0-2", "0-3", "1-0", "1-1", "2-0", "2-1"]);
  return Object.fromEntries(FLAT_CHECK.map((i) => [i.id, preset.has(i.id)]));
})();

/* ============================================================ */
export default function App() {
  const [view, setView] = useState("dashboard");
  const [callList, setCallList] = useCloudSection("calls", SEED_CALLS);
  const [activeCall, setActiveCall] = useState("regular");
  const [draft, setDraft] = useState({ open: false, name: "", topic: "", accent: PALETTE[1].hex });
  const [sessions, setSessions] = useCloudSection("sessions", SESSIONS);
  const [psDraft, setPsDraft] = useState({ date: "", title: "", who: "" });
  const [teams, setTeams] = useCloudSection("teams", SEED_TEAMS);
  const [alumni, setAlumni] = useCloudSection("alumni", SEED_ALUMNI);
  const [selTab, setSelTab] = useState("list");
  const [importedName, setImportedName] = useState(null);
  const [importError, setImportError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [classes, setClasses] = useCloudSection("classes", CLASSES);
  const [pizza, setPizza] = useCloudSection("pizza", PIZZA);
  const [checked, setChecked] = useCloudSection("checklist", CHECK_SEED);
  const [road, setRoad] = useCloudSection("road", ROAD_TEAMS);
  const [events, setEvents] = useCloudSection("events", CRITICAL);
  const [evDraft, setEvDraft] = useState({ open: false, m: "Sep", label: "", color: PALETTE[2].hex });
  const [cohortsTab, setCohortsTab] = useState("success");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [query, setQuery] = useState("");
  const accentObj = callList.find((c) => c.id === activeCall) || callList[0];
  const accent = accentObj ? accentObj.accent : T.burgundy;

  const upd = (id, patch) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const advance = (t) => {
    const i = STAGES.findIndex((s) => s.id === t.stage);
    if (i < STAGES.length - 1) upd(t.id, { stage: STAGES[i + 1].id });
  };
  const cycleAgreed = (t) => {
    const order = ["pending", "yes", "declined"];
    upd(t.id, { agreed: order[(order.indexOf(t.agreed) + 1) % 3] });
  };

  const ingest = (rows, fname) => {
    try {
      const parsed = rowsToTeams(rows);
      if (!parsed.length) {
        setImportError("Couldn't find a team or project column. Check the export's column headers and try again.");
        return;
      }
      setTeams(parsed);
      setImportedName(fname);
      setImportError(null);
      setSelTab("list");
    } catch (err) {
      setImportError("That file couldn't be read. Try re-exporting from Airtable as CSV or XLSX.");
    }
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
  const resetData = () => {
    setTeams(SEED_TEAMS);
    setImportedName(null);
    setImportError(null);
  };
  const toggleCheck = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const cycleRoad = (i) => {
    const order = ["notstarted", "progress", "ready"];
    setRoad((r) => r.map((t, j) => (j === i ? { ...t, status: order[(order.indexOf(t.status) + 1) % 3] } : t)));
  };

  /* inline editing across promo / planning */
  const [editingCall, setEditingCall] = useState(null);
  const [classMsg, setClassMsg] = useState(null);
  const updClass = (i, patch) => setClasses((cs) => cs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addClass = () => setClasses((cs) => [...cs, { course: "", prof: "", campus: "", date: "", calls: [], done: false }]);
  const rmClass = (i) => setClasses((cs) => cs.filter((_, j) => j !== i));
  const updPizza = (i, patch) => setPizza((ps) => ps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addPizza = () => setPizza((ps) => [...ps, { title: "", date: "", time: "", room: "", reg: 0, done: false }]);
  const rmPizza = (i) => setPizza((ps) => ps.filter((_, j) => j !== i));
  const updCall = (id, patch) => setCallList((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updRoad = (i, patch) => setRoad((r) => r.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addRoad = () => setRoad((r) => [...r, { team: "", lastSeen: "—", runs: 0, status: "notstarted" }]);
  const rmRoad = (i) => setRoad((r) => r.filter((_, j) => j !== i));
  const updAlum = (i, patch) => setAlumni((al) => al.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addAlum = () => setAlumni((al) => [...al, { team: "", year: "", contact: "", status: "pending" }]);
  const rmAlum = (i) => setAlumni((al) => al.filter((_, j) => j !== i));

  const [cohortData, setCohortData] = useCloudSection("cohorts", COHORTS);
  const [editTeam, setEditTeam] = useState(null);
  const [cohortMsg, setCohortMsg] = useState(null);
  const updTeam = (ci, ti, patch) => setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: co.teams.map((t, b) => (b === ti ? { ...t, ...patch } : t)) } : co)));
  const rmTeam = (ci, ti) => setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: co.teams.filter((_, b) => b !== ti) } : co)));
  const addTeam = (ci) => setCohortData((cd) => cd.map((co, a) => (a === ci ? { ...co, teams: [...co.teams, { name: "", blurb: "", awards: [], phase2: false, note: "" }] } : co)));
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
        g.teams.push({ name: t.name, blurb: t.blurb, awards: t.awards, phase2: t.phase2, note: t.note });
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
      calls: [], done: false,
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

  const demoDone = FLAT_CHECK.filter((i) => checked[i.id]).length;
  const demoTotal = FLAT_CHECK.length;
  const demoPct = Math.round((demoDone / demoTotal) * 100);

  const visibleTeams = teams; // skin is a visual lens here; all teams shown, tagged by cohort
  const counts = {
    submitted: callList.reduce((a, c) => a + (Number(c.subs) || 0), 0), shortlisted: teams.length,
    scheduled: teams.filter((t) => t.stage === "scheduled" || t.stage === "completed" || t.stage === "decided").length,
    selected: teams.filter((t) => t.outcome === "select").length,
  };
  const comingPct = Math.round((alumni.filter((a) => a.status === "coming").length / alumni.length) * 100);

  const NAV = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutGrid },
    { id: "calls", label: "Calls & promo", Icon: Megaphone },
    { id: "selection", label: "Selection", Icon: ListChecks },
    { id: "planning", label: "Planning", Icon: CalendarCheck },
    { id: "programming", label: "Programming", Icon: CalendarDays },
    { id: "cohorts", label: "Cohorts", Icon: Trophy },
  ];

  const agreedPill = (a) =>
    a === "yes" ? <Pill bg="#E8F0DD" fg={T.ok}><Check size={12} /> Agreed</Pill> :
    a === "declined" ? <Pill bg="#FBE3DC" fg={T.danger}><X size={12} /> Declined</Pill> :
    <Pill bg="#FBF1D8" fg="#9a7b12"><Clock size={12} /> Pending</Pill>;

  const outcomePill = (o) =>
    o === "select" ? <Pill bg={accent} fg="#fff">Selected</Pill> :
    o === "waitlist" ? <Pill bg={T.tint} fg={T.burgundy}>Waitlist</Pill> :
    o === "reject" ? <Pill bg="#EFEAE5" fg={T.muted}>Not selected</Pill> :
    <span style={{ color: T.muted, fontSize: 12 }}>—</span>;

  return (
    <div className="gcs" style={{ "--accent": accent }}>
      <style>{STYLE}</style>

      {/* sidebar */}
      <aside className="side">
        <button className="brand" onClick={() => setView("dashboard")} style={{ background: "none", border: "none", textAlign: "left", width: "100%" }}>
          <div className="brandmark">IF</div>
          <div className="brandtext">
            <div className="disp" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>Innovation Fund</div>
            <div className="eyebrow" style={{ fontSize: 9.5 }}>Gina Cody School</div>
          </div>
        </button>
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={"navitem" + (view === id ? " on" : "")} onClick={() => setView(id)}>
            <Icon size={17} /> {label}
          </button>
        ))}
        <div className="sidefoot" style={{ marginTop: "auto", padding: "14px 10px 4px" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Cycle {cycleLabel()}</div>
          <div style={{ fontSize: 12.5, color: T.muted }}>{PHASE_BY_MONTH[CURRENT]}</div>
        </div>
      </aside>

      {/* main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="eyebrow">{PHASE_BY_MONTH[CURRENT]}</div>
            <div className="disp" style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>
              {NAV.find((n) => n.id === view).label}
            </div>
          </div>
          <div className="skin">
            {callList.map((c) => (
              <button key={c.id} className={activeCall === c.id ? "on" : ""} style={activeCall === c.id ? { background: c.accent } : {}} onClick={() => setActiveCall(c.id)} title={c.topic}>{c.name}</button>
            ))}
            <button onClick={() => { setView("calls"); setDraft((d) => ({ ...d, open: true })); }} title="Add a call" style={{ padding: "6px 12px", color: T.muted, fontWeight: 800 }}>+</button>
          </div>
        </div>

        <div className="content">
          {view === "dashboard" && (
            <>
              <div className="h1 disp">The year at a glance</div>
              <div className="sub">One cohort cycle, two parallel calls. Right now: {(PHASE_BY_MONTH[CURRENT] || "").toLowerCase()}.</div>

              <div className="grid" style={{ gridTemplateColumns: "1.1fr 1.4fr", marginTop: 22, alignItems: "stretch" }}>
                <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Wheel accent={accent} />
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
                    <Legend color={accent} label="Kickoff · Demo Day" />
                    <Legend color={T.gold} label="Homecoming" />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <Stat n={counts.submitted} l="Proposals submitted" accent={accent} />
                    <Stat n={counts.shortlisted} l="Shortlisted to interview" accent={accent} />
                    <Stat n={counts.scheduled} l="Interviews scheduled" accent={accent} />
                    <Stat n={counts.selected} l="Selected so far" accent={accent} />
                  </div>
                  <div className="card">
                    <div className="eyebrow" style={{ marginBottom: 12 }}>Two cohorts, live at once</div>
                    <Swimlane label="Cohort 2025–26 · programming" sub="Sep → Mar · session 3 of 11" pct={28} accent={accent} />
                    <div style={{ height: 14 }} />
                    <Swimlane label="Cohort 2026–27 · selecting" sub="Interviews underway · Jun–Jul" pct={64} accent={accent} />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Needs attention</div>
                <Alert icon={<Clock size={15} />} text="2 shortlisted teams have no interview date yet" cta="Open selection" onClick={() => setView("selection")} accent={accent} />
                <Alert icon={<CalendarCheck size={15} />} text={`Demo Day prep is ${demoPct}% complete — ${demoTotal - demoDone} steps left`} cta="Open planning" onClick={() => setView("planning")} accent={accent} />
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
                    onRemove={c.fixed ? null : () => { setCallList((cs) => cs.filter((x) => x.id !== c.id)); if (activeCall === c.id) setActiveCall("regular"); }} />
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
                        <tr key={i}>
                          <td style={{ minWidth: 170 }}><EInput value={p.course} onChange={(v) => updClass(i, { course: v })} placeholder="Course" /></td>
                          <td style={{ minWidth: 80 }}><EInput value={p.campus} onChange={(v) => updClass(i, { campus: v })} placeholder="Campus" /></td>
                          <td style={{ minWidth: 120 }}><EInput value={p.prof} onChange={(v) => updClass(i, { prof: v })} placeholder="Professor" /></td>
                          <td style={{ minWidth: 90 }}><EInput value={p.date} onChange={(v) => updClass(i, { date: v })} placeholder="Date" mono /></td>
                          <td>
                            <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                              {callList.map((c) => {
                                const on = p.calls.includes(c.name);
                                return (
                                  <button key={c.id} className={"mini" + (on ? " on" : "")} style={on ? { borderColor: c.accent, color: c.accent } : {}}
                                    onClick={() => updClass(i, { calls: on ? p.calls.filter((x) => x !== c.name) : [...p.calls, c.name] })}>{c.name}</button>
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
                        <tr key={i}>
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
                      <div style={{ color: T.muted, fontSize: 12 }}>Excel or CSV. We map team, score, cohort, flagged-by, interview date and outcome. Showing sample data until you import.</div>
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

              {selTab === "list" ? (
                <div className="card" style={{ marginTop: 20, padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Team</th><th>Cohort</th><th>Flagged by</th><th>Score /{MAX_SCORE}</th>
                          <th>Agreed?</th><th>Interview</th><th>Outcome</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTeams.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{t.name}</div>
                              <div style={{ color: T.muted, fontSize: 11.5 }}>{t.blurb}</div>
                            </td>
                            <td>
                              <Pill bg={t.cohort === "special" ? T.turqTint : T.tint} fg={t.cohort === "special" ? T.turquoise : T.burgundy}>
                                {t.cohort === "special" ? "Special" : "Regular"}
                              </Pill>
                            </td>
                            <td style={{ color: T.muted, fontSize: 12 }}>{t.flaggedBy.join(" · ")}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <input className="scorebox" value={t.score ?? ""} onChange={(e) => { const n = e.target.value.replace(/\D/g, "").slice(0, 2); upd(t.id, { score: n === "" ? "" : Math.min(Number(n), MAX_SCORE) }); }} placeholder="—" />
                                <span className="mono" style={{ fontSize: 10.5, color: T.muted }}>
                                  /{MAX_SCORE}{t.score ? ` · ${(Number(t.score) / JUDGES).toFixed(1)}/5 avg` : ""}
                                </span>
                              </div>
                            </td>
                            <td><button onClick={() => cycleAgreed(t)} title="Click to cycle">{agreedPill(t.agreed)}</button></td>
                            <td className="mono" style={{ fontSize: 12 }}>
                              {t.date ? t.date :
                                <button className="mini" onClick={() => upd(t.id, { date: "Jul 7, 13:00", stage: "scheduled" })}>+ Set date</button>}
                            </td>
                            <td>
                              {t.stage === "completed" || t.stage === "decided" ? (
                                <select value={t.outcome ?? ""} onChange={(e) => upd(t.id, { outcome: e.target.value || null, stage: "decided" })}
                                  style={{ fontFamily: "IBM Plex Mono", fontSize: 12, padding: "4px 6px", border: `1px solid ${T.hairline}`, borderRadius: 8, background: T.surface, color: T.ink }}>
                                  <option value="">Decide…</option>
                                  <option value="select">Selected</option>
                                  <option value="waitlist">Waitlist</option>
                                  <option value="reject">Not selected</option>
                                </select>
                              ) : outcomePill(t.outcome)}
                            </td>
                            <td>
                              {t.stage !== "decided" && (
                                <button className="mini on" onClick={() => advance(t)} title="Advance stage">
                                  {STAGES[STAGES.findIndex((s) => s.id === t.stage) + 1]?.label} <ArrowRight size={11} style={{ verticalAlign: -1 }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(6,1fr)", marginTop: 20, gap: 10 }}>
                  {STAGES.map((s) => {
                    const items = visibleTeams.filter((t) => t.stage === s.id);
                    return (
                      <div key={s.id} className="col">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="eyebrow">{s.label}</span>
                          <span className="mono" style={{ fontSize: 11, color: T.muted }}>{items.length}</span>
                        </div>
                        {items.length === 0 && <div style={{ color: T.muted, fontSize: 11.5, marginTop: 10 }}>Empty</div>}
                        {items.map((t) => (
                          <div key={t.id} className="kchip">
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                              <Pill bg={t.cohort === "special" ? T.turqTint : T.tint} fg={t.cohort === "special" ? T.turquoise : T.burgundy}>
                                {t.cohort === "special" ? "Special" : "Regular"}
                              </Pill>
                              <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{t.score != null && t.score !== "" ? `${t.score}/${MAX_SCORE}` : "—"}</span>
                            </div>
                            {t.stage !== "decided" && (
                              <button className="mini" style={{ marginTop: 9, width: "100%" }} onClick={() => advance(t)}>Advance →</button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {view === "planning" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="h1 disp">Planning & critical dates</div>
                  <div className="sub">The year's milestones, with a live check that every step is done before each one.</div>
                </div>
                <select defaultValue="Cohort 6" style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, padding: "8px 12px", border: `1px solid ${T.hairline}`, borderRadius: 10, background: T.surface, color: T.ink }}>
                  <option value="Cohort 6">Cohort 6 · approaching Demo Day</option>
                  <option value="Cohort 7">Cohort 7 · recruiting</option>
                </select>
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
                            <div key={k} className="evt" title="Click to edit" style={{ background: bg, cursor: "pointer" }}
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

              <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", marginTop: 16 }}>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>Demo Day · Mar 27</div>
                      <div style={{ color: T.muted, fontSize: 12.5 }}>{demoDone} of {demoTotal} steps done</div>
                    </div>
                    <div className="disp" style={{ fontSize: 30, fontWeight: 800, color: accent }}>{demoPct}%</div>
                  </div>
                  <div className="track" style={{ marginTop: 12 }}><div style={{ width: demoPct + "%", background: accent }} /></div>
                  {DEMO_CHECKLIST.map((g, gi) => (
                    <div key={gi} style={{ marginTop: 16 }}>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>{g.group}</div>
                      {g.items.map((it, ii) => {
                        const id = `${gi}-${ii}`;
                        const done = checked[id];
                        return (
                          <button key={id} className={"chk" + (done ? " done" : "")} onClick={() => toggleCheck(id)}>
                            {done ? <CheckCircle2 size={17} style={{ color: accent, flex: "0 0 auto" }} /> : <Circle size={17} style={{ color: T.muted, flex: "0 0 auto" }} />}
                            <span className="lbl">{it[0]}</span>
                            <span className="owner">{it[1]}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
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
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i === road.length - 1 ? "none" : `1px solid ${T.hairline}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <EInput value={t.team} onChange={(v) => updRoad(i, { team: v })} placeholder="Team" />
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                            <span className="mono" style={{ color: T.muted, fontSize: 10.5, paddingLeft: 8 }}>seen</span>
                            <EInput value={t.lastSeen} onChange={(v) => updRoad(i, { lastSeen: v })} placeholder="—" mono w="64px" />
                            <button className="mono" style={{ fontSize: 10.5, color: T.muted, border: `1px solid ${T.hairline}`, borderRadius: 6, padding: "2px 6px" }}
                              onClick={() => updRoad(i, { runs: (Number(t.runs) || 0) + 1 })}>{t.runs} run{Number(t.runs) === 1 ? "" : "s"} +</button>
                          </div>
                        </div>
                        <button className="mini" onClick={() => cycleRoad(i)} style={{ borderColor: meta.c, color: meta.c, whiteSpace: "nowrap" }}>{meta.l}</button>
                        <button onClick={() => rmRoad(i)} title="Remove" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                </div>
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
                <div className="mono" style={{ fontSize: 12, color: T.muted }}>{sessions.filter((s) => s.done).length}/{sessions.length} held</div>
              </div>
              <div className="card" style={{ marginTop: 20 }}>
                <div className="timeline">
                  {sessions.map((s, i) => {
                    const color = s.kind === "milestone" ? accent : s.kind === "community" ? T.gold : s.kind === "meeting" ? T.info : T.muted;
                    return (
                      <div key={i} style={{ position: "relative", paddingBottom: i === sessions.length - 1 ? 0 : 20 }}>
                        <span className="tnode" style={{ top: 2, background: s.done ? color : T.surface, borderColor: T.paper, boxShadow: `0 0 0 2px ${color}` }} />
                        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontSize: 12, color: T.muted, width: 52, flex: "0 0 52px" }}>{s.date}</span>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 8 }}>
                              {s.title}
                              {s.kind === "milestone" && <Sparkles size={14} style={{ color: accent }} />}
                            </div>
                            <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{s.who}</div>
                          </div>
                          <button onClick={() => setSessions((ss) => ss.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                            className="chk" style={{ width: "auto", borderBottom: "none", padding: 0, gap: 7 }} title="Mark held">
                            {s.done ? <CheckCircle2 size={18} style={{ color: T.ok }} /> : <Circle size={18} style={{ color: T.muted }} />}
                            <span style={{ fontSize: 12, color: s.done ? T.ok : T.muted, fontWeight: 600 }}>{s.done ? "Held" : "Upcoming"}</span>
                          </button>
                          <button onClick={() => setSessions((ss) => ss.filter((_, j) => j !== i))} title="Remove session" style={{ color: T.muted, display: "grid", placeItems: "center" }}><Trash2 size={14} /></button>
                        </div>
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
                    setSessions((ss) => [...ss, { date: psDraft.date.trim() || "TBD", title: psDraft.title.trim(), who: psDraft.who.trim() || "TBD", kind: "talk", done: false }]);
                    setPsDraft({ date: "", title: "", who: "" });
                  }}><Plus size={15} /> Add</button>
                </div>
              </div>
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
                        <div key={ci} style={{ marginTop: 22 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
                            <span className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{co.c}</span>
                            <span className="mono" style={{ fontSize: 12, color: T.muted }}>{co.year}</span>
                            <span className="mono" style={{ fontSize: 11, color: T.muted }}>· {co.teams.length} team{co.teams.length === 1 ? "" : "s"}</span>
                            <button className="btn ghost" style={{ marginLeft: "auto", fontSize: 11.5, padding: "5px 10px" }} onClick={() => { addTeam(ci); setEditTeam(`${ci}-${co.teams.length}`); }}><Plus size={13} /> Add team</button>
                          </div>
                          <div className="scards">
                            {visible.map(({ t, ti }) => (
                              editTeam === `${ci}-${ti}` ? (
                                <TeamEditCard key={ti} t={t} awards={AWARDS}
                                  onChange={(patch) => updTeam(ci, ti, patch)}
                                  onToggleAward={(a) => toggleAward(ci, ti, a)}
                                  onDone={() => setEditTeam(null)}
                                  onRemove={() => { rmTeam(ci, ti); setEditTeam(null); }} />
                              ) : (
                                <TeamCard key={ti} t={t} onEdit={() => setEditTeam(`${ci}-${ti}`)} />
                              )
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "0.8fr 2fr", marginTop: 20 }}>
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
                          <tr key={i}>
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
function Alert({ icon, text, cta, onClick, accent, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${T.hairline}` }}>
      <span style={{ color: accent, display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: T.paper, flex: "0 0 30px" }}>{icon}</span>
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
      <textarea value={t.blurb} onChange={(e) => onChange({ blurb: e.target.value })} placeholder="One-line description" rows={2} style={{ ...inp, marginBottom: 10, resize: "vertical" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {awards.map((a) => {
          const on = t.awards.includes(a);
          return <button key={a} className="mini" style={on ? { borderColor: AWARD_COLOR[a], color: a === "Most Innovative" ? T.ink : "#fff", background: AWARD_COLOR[a] } : {}} onClick={() => onToggleAward(a)}>{a}</button>;
        })}
        <button className="mini" style={t.phase2 ? { borderColor: T.burgundy, color: "#fff", background: T.burgundy } : {}} onClick={() => onChange({ phase2: !t.phase2 })}>Phase II</button>
      </div>
      <input value={t.note || ""} onChange={(e) => onChange({ note: e.target.value })} placeholder="Traction note (optional)" style={{ ...inp, marginBottom: 11 }} />
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
