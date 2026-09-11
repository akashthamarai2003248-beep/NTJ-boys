import { describe, expect, it } from "vitest";
import { formatINR, parseRupees, rupeesInWords } from "@/lib/utils/money";
import { formatShort, timeAgo } from "@/lib/utils/date";
import { initials, normalizeName, normalizePhone } from "@/lib/utils/id";
import { buildSeed } from "@/lib/data/seed";
import { DEMO_TOTALS } from "@/lib/data/seed";
import { applyRegister, buildReports, findUser, gameModeOf, listGames, publicOverview, queryCollections, queryExpenses, resolvePodium } from "@/lib/data/repository";
import { freshDB } from "@/lib/data/store";
import { GAME_KINDS } from "@/lib/data/types";

describe("money", () => {
  it("formats Indian grouping", () => {
    expect(formatINR(85500)).toBe("₹85,500");
    expect(formatINR(42750)).toBe("₹42,750");
    expect(formatINR(100000)).toBe("₹1,00,000");
    expect(formatINR(0)).toBe("₹0");
  });

  it("parses user money input", () => {
    expect(parseRupees("1,000")).toBe(1000);
    expect(parseRupees("₹500")).toBe(500);
    expect(parseRupees(" 2,500 ")).toBe(2500);
    expect(parseRupees("1000.00")).toBe(1000);
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("-5")).toBeNull();
    expect(parseRupees("")).toBeNull();
  });

  it("spells amounts in words (Indian system)", () => {
    expect(rupeesInWords(0)).toBe("zero");
    expect(rupeesInWords(1000)).toBe("One thousand");
    expect(rupeesInWords(85750)).toBe("Eighty-five thousand seven hundred fifty");
    expect(rupeesInWords(100000)).toBe("One lakh");
  });
});

describe("registration", () => {
  it("creates a member account and logs it", () => {
    const db = freshDB();
    const user = applyRegister(db, {
      name: "Vijay Kumar", phone: "9840010999", email: "vijay@nbm.demo", password: "secret1",
    });
    expect(user.role).toBe("member");
    expect(user.position).toBe("Member");
    expect(user.phone).toBe("9840010999");
    expect(db.users).toHaveLength(4);
    expect(db.activity[0]).toMatchObject({ entity: "member", action: "added", actorName: "Vijay Kumar" });
  });

  it("rejects duplicate phone or email", () => {
    const db = freshDB();
    applyRegister(db, { name: "A", phone: "9840010999", email: "a@nbm.demo", password: "secret1" });
    expect(() =>
      applyRegister(db, { name: "B", phone: "9840010999", email: "b@nbm.demo", password: "secret1" }),
    ).toThrow(/phone/i);
    expect(() =>
      applyRegister(db, { name: "C", phone: "9840010888", email: "a@nbm.demo", password: "secret1" }),
    ).toThrow(/email/i);
  });

  it("validates name, phone, email and password", () => {
    const db = freshDB();
    expect(() =>
      applyRegister(db, { name: "", phone: "9840010999", email: "x@nbm.demo", password: "secret1" }),
    ).toThrow(/name/i);
    expect(() =>
      applyRegister(db, { name: "A", phone: "123", email: "x@nbm.demo", password: "secret1" }),
    ).toThrow(/phone/i);
    expect(() =>
      applyRegister(db, { name: "A", phone: "9840010999", email: "nope", password: "secret1" }),
    ).toThrow(/email/i);
    expect(() =>
      applyRegister(db, { name: "A", phone: "9840010999", email: "x@nbm.demo", password: "123" }),
    ).toThrow(/password/i);
  });

  it("allows registration with phone and password without email", () => {
    const db = freshDB();
    const user = applyRegister(db, { name: "Thamarai", phone: "9840010888", password: "secretPassword" });
    expect(user.phone).toBe("9840010888");
    expect(user.name).toBe("Thamarai");
    expect(user.role).toBe("member");
    expect(user.email).toBe("9840010888@nbm.mandram");
  });

  it("authenticates Akash admin by phone 8248590767 and password akash123", () => {
    const admin = findUser("8248590767", "akash123");
    expect(admin).not.toBeNull();
    expect(admin?.name).toBe("Akash");
    expect(admin?.role).toBe("admin");
    expect(admin?.phone).toBe("8248590767");
  });

  it("authenticates admin by username ntjboys and password ntj2010", () => {
    const admin = findUser("ntjboys", "ntj2010");
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe("admin");
  });

  it("never grants admin role to regular registered members even if named Akash or Admin", () => {
    const db = freshDB();
    const u1 = applyRegister(db, { name: "Akash", phone: "9876543210", password: "mypassword1" });
    expect(u1.role).toBe("member");
    expect(u1.position).toBe("Member");

    const u2 = applyRegister(db, { name: "Admin", phone: "9876543211", password: "mypassword2" });
    expect(u2.role).toBe("member");
    expect(u2.position).toBe("Member");
  });

  it("rejects invalid admin password", () => {
    const fake = findUser("ntjboys", "wrongpassword");
    expect(fake).toBeNull();
  });
});

describe("dates & ids", () => {
  it("formats short dates", () => {
    expect(formatShort("2026-09-05")).toMatch(/05 Sep/);
  });
  it("timeAgo labels", () => {
    expect(timeAgo(new Date().toISOString())).toBe("Just now");
  });
  it("normalises names & phones", () => {
    expect(normalizeName("  Ravi   Kumar ")).toBe("ravi kumar");
    expect(normalizePhone("+91 98400 10001")).toBe("919840010001");
    expect(initials("Ravi Kumar")).toBe("RK");
  });
});

describe("demo seed invariants", () => {
  const db = buildSeed(new Date(2026, 8, 5, 12));

  it("demo totals are exactly ₹85,500 varavu and ₹42,750 selavu", () => {
    const varavu = db.collections.reduce((s, c) => s + c.amount, 0);
    const selavu = db.expenses.reduce((s, e) => s + e.amount, 0);
    expect(varavu).toBe(DEMO_TOTALS.varavu);
    expect(selavu).toBe(DEMO_TOTALS.selavu);
    // balance derives automatically
    expect(varavu - selavu).toBe(DEMO_TOTALS.varavu - DEMO_TOTALS.selavu);
  });

  it("contains 25+ members and three anchor events", () => {
    expect(db.members.length).toBeGreaterThanOrEqual(25);
    expect(db.events).toHaveLength(3);
    expect(db.users).toHaveLength(3);
  });

  it("uses 10-digit phone numbers", () => {
    for (const u of db.users) expect(u.phone.replace(/\D/g, "")).toHaveLength(10);
    for (const m of db.members) expect(m.phone.replace(/\D/g, "")).toHaveLength(10);
  });

  it("generates unique sequential receipt numbers per year", () => {
    const numbers = db.collections.map((c) => c.receiptNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const n of numbers) expect(n).toMatch(/^NBM-\d{4}-\d{4}$/);
  });

  it("keeps every collection amount positive", () => {
    for (const c of db.collections) expect(c.amount).toBeGreaterThan(0);
    for (const e of db.expenses) expect(e.amount).toBeGreaterThan(0);
  });

  it("stores dates in yyyy-mm-dd", () => {
    for (const c of db.collections) expect(c.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("demo sports seed", () => {
  const db = buildSeed(new Date(2026, 8, 5, 12));

  it("has the showcase cricket cup with winners + Pongal 2027 games", () => {
    const cricket = db.games.find((g) => g.id === "g_cricket_2026");
    expect(cricket?.status).toBe("completed");
    const cricketTeams = db.teams.filter((t) => t.gameId === "g_cricket_2026");
    expect(cricketTeams.length).toBe(4);
    const played = db.matches.filter((m) => m.gameId === "g_cricket_2026" && m.status === "played");
    expect(played.length).toBeGreaterThanOrEqual(2);
    expect(db.results.filter((r) => r.gameId === "g_cricket_2026")).toHaveLength(3);
    const tug = db.games.find((g) => g.id === "g_tug_2027");
    expect(tug?.eventId).toBe("evt_sports");
    expect(db.participants.filter((p) => p.gameId === "g_tug_2027").length).toBeGreaterThan(0);
    expect(db.gallery.length).toBeGreaterThanOrEqual(4);
  });

  it("recorded winners are consistent with scores", () => {
    for (const m of db.matches.filter((x) => x.status === "played")) {
      const expected = m.scoreA === m.scoreB ? null : m.scoreA! > m.scoreB! ? m.teamAId : m.teamBId;
      expect(m.winnerTeamId).toBe(expected);
    }
  });

  it("resolves the podium names from teams", () => {
    const game = db.games.find((g) => g.id === "g_cricket_2026")!;
    const podium = resolvePodium(db, game);
    expect(podium).toHaveLength(3);
    expect(podium[0].position).toBe(1);
    expect(podium[0].name.length).toBeGreaterThan(0);
    expect(podium[0].color).toBeTruthy();
  });

  it("gameModeOf maps each kind to team or individual", () => {
    for (const k of GAME_KINDS) {
      expect(gameModeOf(k.value)).toBe(k.mode);
    }
  });

  it("listGames decorates counts and flags results", () => {
    const games = listGames(db);
    const cricket = games.find((g) => g.id === "g_cricket_2026")!;
    expect(cricket.teamCount).toBe(4);
    expect(cricket.hasResults).toBe(true);
    expect(cricket.participantCount).toBeGreaterThan(0);
  });
});

describe("reports & public overview", () => {
  const db = buildSeed(new Date(2026, 8, 5, 12));

  it("report totals match the seed invariants", () => {
    const r = buildReports(db, "all");
    expect(r.totals.varavu).toBe(DEMO_TOTALS.varavu);
    expect(r.totals.selavu).toBe(DEMO_TOTALS.selavu);
    expect(r.totals.balance).toBe(DEMO_TOTALS.varavu - DEMO_TOTALS.selavu);
  });

  it("every event keeps balance = varavu − selavu", () => {
    const r = buildReports(db, "all");
    for (const e of r.byEvent) {
      expect(e.varavu - e.selavu).toBe(e.balance);
    }
    // all money is accounted across events + general
    const total = r.byEvent.reduce((s, e) => s + e.varavu, 0);
    expect(total).toBe(r.totals.varavu);
  });

  it("payment methods & categories roll up to totals", () => {
    const r = buildReports(db, "all");
    const byMethod = r.byMethod.reduce((s, m) => s + m.varavu, 0);
    expect(byMethod).toBe(r.totals.varavu);
    const byCat = r.byCategory.reduce((s, c) => s + c.amount, 0);
    expect(byCat).toBe(r.totals.selavu);
  });

  it("keeps every report breakdown scoped to the selected year", () => {
    const r = buildReports(db, "2026");
    expect(r.byEvent.reduce((sum, event) => sum + event.varavu, 0)).toBe(r.totals.varavu);
    expect(r.byEvent.reduce((sum, event) => sum + event.selavu, 0)).toBe(r.totals.selavu);
    expect(r.topDonors.every((donor) => donor.total > 0 && donor.total <= r.totals.varavu)).toBe(true);
    expect(r.cashflow.reduce((sum, month) => sum + month.varavu, 0)).toBe(r.totals.varavu);
    expect(r.cashflow.reduce((sum, month) => sum + month.selavu, 0)).toBe(r.totals.selavu);
  });

  it("public overview hides nothing private", () => {
    const o = publicOverview(db);
    expect(o.enabled).toBe(true);
    expect(o.totals.varavu).toBe(DEMO_TOTALS.varavu);
    for (const e of o.events) {
      expect(e.varavu - e.selavu).toBe(e.balance);
    }
    const json = JSON.stringify(o);
    expect(json).not.toContain("phone");
    expect(json).not.toContain("984");
    expect(json).not.toContain("notes");
  });
});

describe("queryExpenses and queryCollections filtering", () => {
  const db = buildSeed(new Date(2026, 8, 5, 12));

  it("filters expenses by payment method", () => {
    const upiExpenses = queryExpenses(db, { payment: "upi" });
    expect(upiExpenses.total).toBeGreaterThan(0);
    for (const item of upiExpenses.items) {
      expect(item.paymentMethod).toBe("upi");
    }

    const cashExpenses = queryExpenses(db, { payment: "cash" });
    expect(cashExpenses.total).toBeGreaterThan(0);
    for (const item of cashExpenses.items) {
      expect(item.paymentMethod).toBe("cash");
    }
  });

  it("filters collections by payment method", () => {
    const upiCollections = queryCollections(db, { payment: "upi" });
    expect(upiCollections.total).toBeGreaterThan(0);
    for (const item of upiCollections.items) {
      expect(item.paymentMethod).toBe("upi");
    }
  });
});
