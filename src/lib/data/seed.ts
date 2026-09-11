import {
  type Collection,
  type DB,
  type DemoUser,
  type Event,
  type Expense,
  type Game,
  type GameResult,
  type GalleryPhoto,
  type Match,
  type Member,
  type Participant,
  type PaymentMethod,
  type ExpenseCategory,
  type Team,
} from "./types";
import { addDaysISO, toISO } from "@/lib/utils/date";

/* ─────────────────────────────────────────────────────────────
 * DEMO SEED — clearly marked for development.
 * Remove by deleting ./.data/db.json or clicking
 * "Reset demo data" in Settings. Nothing here is production data.
 *
 * The generator anchors every date to "now" so the dashboard
 * (this week / month / year charts) always looks alive.
 * ───────────────────────────────────────────────────────────── */

export const DEMO_TOTALS = { varavu: 85500, selavu: 42750 } as const;

export const DEMO_CREDENTIALS = [
  { role: "admin", email: "admin@nbm.demo", password: "akash123", name: "Akash", phone: "8248590767" },
  { role: "treasurer", email: "treasurer@nbm.demo", password: "treasurer123", name: "Muthu Kannan" },
  { role: "member", email: "member@nbm.demo", password: "member123", name: "Karthik Raja" },
] as const;

const NAMES = [
  "Akash", "Muthu Kannan", "Karthik Raja", "Palanisamy Gounder",
  "Murugan Selvam", "Ravi Kumar", "Vignesh Anand", "Suresh Babu",
  "Manikandan Ram", "Kathir Vel", "Dinesh Pandian", "Prakash Rao",
  "Selvam Annamalai", "Ganesh Kumar", "Boopathy Chelliah", "Arumugam Siva",
  "Ramasamy Perumal", "Ilango Krishnan", "Jegan Muthu", "Karuppaiah Nadar",
  "Thangavel Murugan", "Udhaya Kumar", "Velmurugan Raja", "Sakthivel Pandian",
  "Marimuthu Eswaran", "Natesan Gopal", "Chelladurai Bose", "Lakshmanan Iyer",
] as const;

const STREETS = [
  "South Street", "North Street", "Temple Street", "Anna Salai", "Middle Street",
  "Mettu Street", "Kamraj Street", "Nethaji Street", "1st Cross Street", "West Street",
  "Gandhi Nagar", "Pudur Road", "Perumal Kovil St", "Church Street", "Bus Stand Road",
] as const;

const POSITIONS: Member["role"][] = [
  "President", "Secretary", "Treasurer", "Coordinator", "Member", "Member",
  "Member", "Member", "Volunteer", "Volunteer", "Member", "Member", "Member",
  "Coordinator", "Member", "Volunteer", "Member", "Member", "Member", "Member",
  "Member", "Member", "Volunteer", "Member", "Member", "Member", "Volunteer", "Member",
];

/** deterministic little RNG so demo data is stable across resets */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function phoneFor(i: number, rnd: () => number): string {
  // 10-digit Indian mobile: 984 + 3-digit exchange + 4-digit subscriber
  const exchange = 100 + ((i * 7) % 900);
  return `984${String(exchange)}${String(Math.floor(rnd() * 10000)).padStart(4, "0")}`;
}

interface SeedRow {
  name: string;
  amount: number;
  method: PaymentMethod;
  eventId: string | null;
  daysAgo: number;
  note?: string;
}

export function buildSeed(now: Date = new Date()): DB {
  const rnd = mulberry32(20260905);

  /* ── Events (anchored to next festival seasons) ── */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Next Vinayagar Chathurthi: Tue 8 Sep
  let viniYear = today.getFullYear();
  let viniStart = new Date(viniYear, 8, 8);
  if (viniStart.getTime() < today.getTime() - 8 * 86400000) {
    viniYear += 1;
    viniStart = new Date(viniYear, 8, 8);
  }
  const viniStartISO = toISO(viniStart);
  const e1Active = viniStart.getTime() <= today.getTime() + 21 * 86400000;

  // Next Pongal: 14 Jan
  let pongalYear = today.getFullYear();
  let pongalStart = new Date(pongalYear, 0, 14);
  if (pongalStart.getTime() < today.getTime() + 21 * 86400000) {
    pongalYear += 1;
    pongalStart = new Date(pongalYear, 0, 14);
  }
  const pongalStartISO = toISO(pongalStart);

  const events: Event[] = [
    {
      id: "evt_vini",
      name: `Vinayagar Chathurthi ${viniYear}`,
      tamilName: "விநாயகர் சதுர்த்தி விழா",
      type: "festival",
      status: e1Active ? "active" : "upcoming",
      startDate: viniStartISO,
      endDate: addDaysISO(viniStartISO, 4),
      location: "Netaji Subhash Chandra Bose Street, Temple Arch",
      cover: "/vinayagar-chathurthi.webp",
      description:
        "Annual Vinayagar Chathurthi celebration with pandal, idol installation, prasadam distribution and cultural evening. All residents of the street are warmly invited.",
      createdAt: new Date(viniStart.getTime() - 90 * 86400000).toISOString(),
      updatedAt: new Date(viniStart.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "evt_pongal",
      name: `Pongal ${pongalYear}`,
      tamilName: "பொங்கல் திருவிழா",
      type: "festival",
      status: "upcoming",
      startDate: pongalStartISO,
      endDate: addDaysISO(pongalStartISO, 3),
      location: "Nethaji Boys Mandram Ground, North Street",
      description:
        "Traditional Pongal celebration with kolam competition, pongal panai, community lunch and evening cultural programs.",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: "evt_sports",
      name: `Pongal Sports ${pongalYear}`,
      tamilName: "பொங்கல் விளையாட்டு போட்டிகள்",
      type: "sports",
      status: "registration",
      startDate: addDaysISO(pongalStartISO, 4),
      endDate: addDaysISO(pongalStartISO, 5),
      location: "Nethaji Boys Mandram Ground, North Street",
      description:
        "Annual sports meet — running, cricket, tug of war, lemon & spoon and more. Prizes for winners and participants.",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  /* ── Members ── */
  const members: Member[] = NAMES.map((name, i) => {
    const joined = new Date(today.getTime() - ((i * 7 + 3) % 84) * 30 * 86400000);
    return {
      id: `mem_${String(i + 1).padStart(2, "0")}`,
      name,
      phone: i === 0 ? "8248590767" : phoneFor(i, rnd),
      street: `${10 + i}, ${STREETS[i % STREETS.length]}`,
      role: POSITIONS[i] ?? "Member",
      joinedDate: toISO(joined),
      createdAt: joined.toISOString(),
      updatedAt: joined.toISOString(),
    };
  });

  // Demo sign-in users also appear as board members
  const users: DemoUser[] = [
    {
      id: "usr_admin", name: "Akash", phone: "8248590767",
      email: "admin@nbm.demo", password: "akash123", role: "admin", position: "President",
    },
    {
      id: "usr_treasurer", name: "Muthu Kannan", phone: "9840010002",
      email: "treasurer@nbm.demo", password: "treasurer123", role: "treasurer", position: "Treasurer",
    },
    {
      id: "usr_member", name: "Karthik Raja", phone: "9840010003",
      email: "member@nbm.demo", password: "member123", role: "member", position: "Member",
    },
  ];

  /* ── Collections — base rows, then an auto-tuned headline donor keeps the
     grand total exactly at ₹85,500 so the dashboard demo numbers stay true. ── */
  const methods: PaymentMethod[] = ["cash", "upi", "upi", "cash", "upi", "upi", "cash"];
  const rowAmounts = [2000, 1000, 500, 250, 1500, 750, 1000, 3000, 500, 2000, 1000, 2500, 1000, 500, 1500, 250, 2000, 1000, 500, 3000, 1000, 750, 1500, 500, 2000, 1000, 250, 2000, 1000, 500, 1500, 250, 1000, 2000, 500, 1000, 2500, 500, 1000, 750, 2000, 1000];

  const rows: SeedRow[] = rowAmounts.map((amount, i) => {
    const person = NAMES[(i * 5 + 2) % NAMES.length];
    const method = methods[i % methods.length];
    // events: every 3rd row is general fund; a few rows support upcoming Pongal
    const bucket = i % 9;
    const eventId = bucket < 5 ? "evt_vini" : bucket === 7 ? "evt_pongal" : null;
    // recent cluster + wide spread keeps every chart period alive
    const daysAgo = i < 6 ? i * 2 : (i * 17) % 245;
    return { name: person, amount, method, eventId, daysAgo };
  });

  const baseSum = rows.reduce((s, r) => s + r.amount, 0);
  const headline = Math.max(0, DEMO_TOTALS.varavu - baseSum);
  rows.push({
    name: "Ravi Kumar", amount: headline || 2000, method: "upi", eventId: "evt_vini", daysAgo: 9,
    note: "Headline family donation — முக்கிய குடும்ப நன்கொடை",
  });

  const byDate = [...rows].sort((a, b) => a.daysAgo - b.daysAgo);
  const yearCounters: Record<string, number> = {};
  const collections: Collection[] = byDate.map((r, i) => {
    const date = toISO(new Date(today.getTime() - r.daysAgo * 86400000));
    const year = String(new Date(date).getFullYear());
    yearCounters[year] = (yearCounters[year] ?? 0) + 1;
    const ts = new Date(`${date}T10:${String(i % 60).padStart(2, "0")}:00`).toISOString();
    return {
      id: `col_${String(i + 1).padStart(3, "0")}`,
      receiptNumber: `NBM-${year}-${String(yearCounters[year]).padStart(4, "0")}`,
      personName: r.name,
      phone: members.find((m) => m.name === r.name)?.phone ?? null,
      street: members.find((m) => m.name === r.name)?.street ?? null,
      amount: r.amount,
      paymentMethod: r.method,
      contributionType: i % 6 === 2 ? "voice" : i % 6 === 4 ? "name" : "namePhone",
      date,
      eventId: r.eventId,
      notes: r.note ?? null,
      createdBy: i % 3 === 0 ? "Muthu Kannan" : "Sundaravel Rajan",
      createdAt: ts,
      updatedAt: ts,
    };
  });

  /* ── Expenses — same auto-tuned total technique for exactly ₹42,750 ── */
  const expDefs: { title: string; cat: ExpenseCategory; amount: number; method: PaymentMethod; eventId: string | null; daysAgo: number }[] = [
    { title: "Pandal erection material", cat: "Pandal", amount: 7500, method: "cash", eventId: "evt_vini", daysAgo: 40 },
    { title: "Idol + pooja items", cat: "Idol", amount: 3500, method: "cash", eventId: "evt_vini", daysAgo: 25 },
    { title: "Sound system hire", cat: "Sound", amount: 2000, method: "cash", eventId: "evt_vini", daysAgo: 18 },
    { title: "Lights & festoons", cat: "Lighting", amount: 1500, method: "cash", eventId: "evt_vini", daysAgo: 16 },
    { title: "Snacks for volunteers", cat: "Food", amount: 500, method: "cash", eventId: "evt_vini", daysAgo: 12 },
    { title: "Printing invitation cards", cat: "Printing", amount: 750, method: "cash", eventId: "evt_vini", daysAgo: 21 },
    { title: "Transport of idol & materials", cat: "Transport", amount: 1000, method: "cash", eventId: "evt_vini", daysAgo: 30 },
    { title: "Deepam oil & camphor", cat: "Decoration", amount: 400, method: "cash", eventId: "evt_vini", daysAgo: 10 },
    { title: "Stage decoration flowers", cat: "Decoration", amount: 1200, method: "cash", eventId: "evt_vini", daysAgo: 8 },
    { title: "Prasadam ingredients (advance)", cat: "Food", amount: 3000, method: "upi", eventId: "evt_vini", daysAgo: 6 },
    { title: "Banana leaves & plates", cat: "Food", amount: 800, method: "cash", eventId: "evt_vini", daysAgo: 5 },
    { title: "Volunteer t-shirts", cat: "Other", amount: 1800, method: "cash", eventId: "evt_vini", daysAgo: 33 },
    { title: "Street cleaning after festival", cat: "Cleaning", amount: 600, method: "cash", eventId: "evt_vini", daysAgo: 4 },
    { title: "Electrician charges", cat: "Lighting", amount: 900, method: "cash", eventId: "evt_vini", daysAgo: 9 },
    { title: "Registration board & flex", cat: "Printing", amount: 700, method: "cash", eventId: "evt_sports", daysAgo: 15 },
    { title: "Ground maintenance", cat: "Cleaning", amount: 500, method: "cash", eventId: "evt_sports", daysAgo: 11 },
    { title: "Cricket kit (balls, stumps)", cat: "Sports", amount: 1600, method: "cash", eventId: "evt_sports", daysAgo: 3 },
    { title: "Sports medals & shields", cat: "Prizes", amount: 2500, method: "upi", eventId: "evt_sports", daysAgo: 2 },
    { title: "Pongal kolam colours", cat: "Decoration", amount: 350, method: "cash", eventId: "evt_pongal", daysAgo: 20 },
    { title: "Treasurer stationery & receipt book", cat: "Other", amount: 450, method: "cash", eventId: null, daysAgo: 45 },
    { title: "Poster printing for events", cat: "Printing", amount: 550, method: "upi", eventId: null, daysAgo: 14 },
  ];
  const expBase = expDefs.reduce((s, e) => s + e.amount, 0);
  expDefs.push({
    title: "Pongal community lunch provisions", cat: "Food", amount: Math.max(0, DEMO_TOTALS.selavu - expBase),
    method: "cash", eventId: "evt_pongal", daysAgo: 1,
  });

  const expenses: Expense[] = [...expDefs]
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .map((e, i) => {
      const date = toISO(new Date(today.getTime() - e.daysAgo * 86400000));
      const ts = new Date(`${date}T11:${String(i % 60).padStart(2, "0")}:00`).toISOString();
      return {
        id: `exp_${String(i + 1).padStart(3, "0")}`,
        title: e.title,
        category: e.cat,
        amount: e.amount,
        eventId: e.eventId,
        paidBy: i % 4 === 0 ? "Akash" : "Muthu Kannan",
        date,
        paymentMethod: e.method,
        description: null,
        billUrl: null,
        createdBy: i % 3 === 0 ? "Akash" : "Muthu Kannan",
        createdAt: ts,
        updatedAt: ts,
      };
    });

  /* ── Games & sports — a completed summer cricket cup (showcase) + the
     Pongal 2027 competitions mid-registration ── */
  const games: Game[] = [
    {
      id: "g_cricket_2026", eventId: null,
      name: "Summer Cricket Cup 2026", tamilName: "கோடை கிரிக்கெட் கோப்பை",
      kind: "cricket", mode: "team", status: "completed",
      rules: "6-a-side street cricket · 8 overs per side. Matches played at the Mandram ground.",
      createdAt: new Date(now.getTime() - 120 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 60 * 86400000).toISOString(),
    },
    {
      id: "g_tug_2027", eventId: "evt_sports",
      name: "Pongal Tug of War", tamilName: "பொங்கல் கயிறு இழுத்தல்",
      kind: "tug", mode: "team", status: "open",
      rules: "Teams of 6 pullers — street vs street knockout.",
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    },
    {
      id: "g_run_2027", eventId: "evt_sports",
      name: "Running 100 m", tamilName: "100 மீட்டர் ஓட்டம்",
      kind: "running", mode: "individual", status: "open",
      rules: "Under-30 and open categories — fastest time wins.",
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    },
  ];

  const teamDefs: { id: string; gameId: string; name: string; color: string }[] = [
    { id: "t_c1", gameId: "g_cricket_2026", name: "Nethaji Street Chargers", color: "saffron" },
    { id: "t_c2", gameId: "g_cricket_2026", name: "South Street Kings", color: "navy" },
    { id: "t_c3", gameId: "g_cricket_2026", name: "Temple Street Warriors", color: "red" },
    { id: "t_c4", gameId: "g_cricket_2026", name: "Pudur Road Strikers", color: "leaf" },
    { id: "t_t1", gameId: "g_tug_2027", name: "North Street Bulls", color: "navy" },
    { id: "t_t2", gameId: "g_tug_2027", name: "South Street Kings", color: "saffron" },
    { id: "t_t3", gameId: "g_tug_2027", name: "Temple Street Warriors", color: "red" },
    { id: "t_t4", gameId: "g_tug_2027", name: "Nethaji Street Chargers", color: "leaf" },
  ];
  const teams: Team[] = teamDefs.map((t, i) => ({
    ...t,
    createdAt: new Date(now.getTime() - (90 - i) * 86400000).toISOString(),
  }));

  const byName = (n: string) => members.find((m) => m.name === n);
  const cricketRoster = NAMES.slice(0, 24);
  const participants: Participant[] = [];
  let pn = 0;
  // spread 24 players across the 4 cricket teams
  for (let i = 0; i < cricketRoster.length; i++) {
    const name = cricketRoster[i];
    const team = teams[i % 4];
    if (team.gameId !== "g_cricket_2026") continue;
    const m = byName(name);
    participants.push({
      id: `p_c${String(i + 1).padStart(2, "0")}`, gameId: team.gameId, teamId: team.id,
      memberId: m?.id ?? null, name, phone: m?.phone ?? null,
      createdAt: new Date(now.getTime() - 100 * 86400000).toISOString(),
    });
  }
  // tug-of-war rosters: 4 teams × 5 names
  const tugTeams = teams.filter((t) => t.gameId === "g_tug_2027");
  for (let ti = 0; ti < tugTeams.length; ti++) {
    for (let j = 0; j < 5; j++) {
      const name = NAMES[(ti * 5 + j + 24) % NAMES.length];
      const m = byName(name);
      pn += 1;
      participants.push({
        id: `p_t${String(pn).padStart(2, "0")}`, gameId: "g_tug_2027", teamId: tugTeams[ti].id,
        memberId: m?.id ?? null, name, phone: m?.phone ?? null,
        createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(),
      });
    }
  }
  // individual runners registered
  for (let i = 0; i < 8; i++) {
    const name = NAMES[(i * 3 + 8) % NAMES.length];
    const m = byName(name);
    pn += 1;
    participants.push({
      id: `p_r${String(i + 1).padStart(2, "0")}`, gameId: "g_run_2027", teamId: null,
      memberId: m?.id ?? null, name, phone: m?.phone ?? null,
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
    });
  }

  const [champions, kings, warriors, strikers] = teams.slice(0, 4);
  const matchDay = (daysAgo: number, h: number) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toISOString();
    return ts.slice(0, 10);
  };
  const matches: Match[] = [
    {
      id: "m_c1", gameId: "g_cricket_2026", round: "Semi-final",
      teamAId: champions.id, teamBId: strikers.id, scoreA: 142, scoreB: 118,
      status: "played", winnerTeamId: champions.id, note: "Chargers chased in 7.4 overs",
      playedAt: matchDay(68, 9), createdAt: new Date(now.getTime() - 68 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 68 * 86400000).toISOString(),
    },
    {
      id: "m_c2", gameId: "g_cricket_2026", round: "Semi-final",
      teamAId: kings.id, teamBId: warriors.id, scoreA: 96, scoreB: 101,
      status: "played", winnerTeamId: warriors.id, note: "Last-over finish",
      playedAt: matchDay(66, 9), createdAt: new Date(now.getTime() - 66 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 66 * 86400000).toISOString(),
    },
    {
      id: "m_c3", gameId: "g_cricket_2026", round: "Final",
      teamAId: champions.id, teamBId: warriors.id, scoreA: 168, scoreB: 150,
      status: "played", winnerTeamId: champions.id, note: "Champions by 18 runs",
      playedAt: matchDay(60, 16), createdAt: new Date(now.getTime() - 60 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 60 * 86400000).toISOString(),
    },
  ];

  const recordedAt = new Date(now.getTime() - 59 * 86400000).toISOString();
  const results: GameResult[] = [
    { id: "r_c1", gameId: "g_cricket_2026", position: 1, kind: "team", teamId: champions.id, label: "Champions · வாகையாளர்கள்", note: "Undefeated in the tournament", recordedAt },
    { id: "r_c2", gameId: "g_cricket_2026", position: 2, kind: "team", teamId: warriors.id, label: "Runners-up · இரண்டாம் பரிசு", note: "Reached the final", recordedAt },
    { id: "r_c3", gameId: "g_cricket_2026", position: 3, kind: "team", teamId: kings.id, label: "Third place · மூன்றாம் பரிசு", note: "Won the consolation match", recordedAt },
  ];

  /* ── Gallery — generated SVG "photos" (offline-safe demo art) ── */
  function svgScene(emoji: string, from: string, to: string, label: string): string {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="800" height="520" fill="url(#g)"/>` +
      `<circle cx="660" cy="80" r="150" fill="rgba(255,255,255,0.10)"/>` +
      `<circle cx="80" cy="460" r="180" fill="rgba(255,255,255,0.08)"/>` +
      `<text x="400" y="250" font-size="150" text-anchor="middle">${emoji}</text>` +
      `<text x="400" y="430" font-size="34" font-family="sans-serif" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle">${label}</text>` +
      `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  const gallery: GalleryPhoto[] = [
    { id: "gal_01", eventId: "evt_vini", url: svgScene("🪔", "#0a1330", "#3d5fac", "Vinayagar Chathurthi 2026"), caption: "Pandal lighting on the first evening", uploadedBy: "Akash", createdAt: new Date(now.getTime() - 4 * 86400000).toISOString() },
    { id: "gal_02", eventId: "evt_vini", url: svgScene("🌺", "#7e3e10", "#ed7a10", "Flower garland for the idol"), caption: "மாலை அலங்காரம் — garland decoration", uploadedBy: "Muthu Kannan", createdAt: new Date(now.getTime() - 6 * 86400000).toISOString() },
    { id: "gal_03", eventId: "evt_pongal", url: svgScene("🌾", "#1b6c47", "#e7b942", "Pongal 2027 · கரும்பு"), caption: "Sugarcane & kolam ready for Pongal", uploadedBy: "Akash", createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { id: "gal_04", eventId: "evt_sports", url: svgScene("🏏", "#0c1b3f", "#ff9933", "Summer Cricket Cup 2026"), caption: "Final over of the cricket cup final", uploadedBy: "Karthik Raja", createdAt: new Date(now.getTime() - 55 * 86400000).toISOString() },
    { id: "gal_05", eventId: null, url: svgScene("🎉", "#2d4790", "#31a76c", "Community celebration"), caption: "Prize distribution evening", uploadedBy: "Muthu Kannan", createdAt: new Date(now.getTime() - 30 * 86400000).toISOString() },
  ];

  /* ── Activity + settings ── */
  const activity = [
    ...collections.slice(-6).map((c) => ({
      id: `act_c_${c.id}`, actorId: "usr_admin", actorName: "Akash",
      action: "added" as const, entity: "collection" as const, label: c.personName,
      amount: c.amount, eventName: null, at: c.createdAt,
    })),
    ...expenses.slice(-5).map((e) => ({
      id: `act_e_${e.id}`, actorId: "usr_treasurer", actorName: "Muthu Kannan",
      action: "added" as const, entity: "expense" as const, label: e.title,
      amount: e.amount, eventName: null, at: e.createdAt,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    users,
    members,
    events,
    collections,
    expenses,
    games,
    teams,
    participants,
    matches,
    results,
    gallery,
    activity,
    settings: { publicView: true, updatedAt: now.toISOString() },
    meta: { demo: true, seededAt: now.toISOString() },
  };
}
