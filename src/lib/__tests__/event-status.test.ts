import { describe, it, expect } from "vitest";
import { resolveEventStatus, friendlyDateRange } from "../utils/date";
import { buildSeed } from "../data/seed";
import { listEvents } from "../data/repository";

describe("resolveEventStatus", () => {
  const TODAY = "2026-09-10";

  it("marks past start date as active even if stored status was upcoming (the user's case)", () => {
    const status = resolveEventStatus("upcoming", "2026-09-08", "2026-09-08", TODAY);
    expect(status).toBe("active");
  });

  it("marks multi-day event ongoing today as active", () => {
    const status = resolveEventStatus("upcoming", "2026-09-08", "2026-09-12", TODAY);
    expect(status).toBe("active");
  });

  it("marks event starting today as active", () => {
    const status = resolveEventStatus("upcoming", "2026-09-10", "2026-09-15", TODAY);
    expect(status).toBe("active");
  });

  it("keeps future event as upcoming", () => {
    const status = resolveEventStatus("upcoming", "2026-10-01", "2026-10-05", TODAY);
    expect(status).toBe("upcoming");
  });

  it("preserves registration status for future event", () => {
    const status = resolveEventStatus("registration", "2026-10-01", "2026-10-05", TODAY);
    expect(status).toBe("registration");
  });

  it("transitions registration status to active once start date arrives", () => {
    const status = resolveEventStatus("registration", "2026-09-08", "2026-09-12", TODAY);
    expect(status).toBe("active");
  });

  it("respects explicit completed status regardless of dates", () => {
    const status = resolveEventStatus("completed", "2026-09-10", "2026-09-15", TODAY);
    expect(status).toBe("completed");
  });

  it("auto-completes events that ended more than 7 days ago", () => {
    const status = resolveEventStatus("upcoming", "2026-08-01", "2026-08-05", TODAY);
    expect(status).toBe("completed");
  });

  it("keeps events within the 7-day wrap-up window active", () => {
    const status = resolveEventStatus("upcoming", "2026-09-05", "2026-09-07", TODAY);
    expect(status).toBe("active");
  });
  it("never downgrades an already active event to upcoming even if startDate is in the future", () => {
    const status = resolveEventStatus("active", "2026-09-19", "2026-09-23", TODAY);
    expect(status).toBe("active");
  });
});

describe("friendlyDateRange", () => {
  it("formats single date correctly", () => {
    const range = friendlyDateRange("2026-09-08", "2026-09-08");
    expect(range).toBe("Tue 8 Sept");
  });

  it("formats multi-day date range correctly", () => {
    const range = friendlyDateRange("2026-09-08", "2026-09-12");
    expect(range).toBe("Tue 8 Sept – Sat 12 Sept");
  });
});

describe("buildSeed events", () => {
  it("produces Vinayagar Chathurthi 2026 with Tue 8 Sep and active status", () => {
    const seed = buildSeed();
    const vini = seed.events.find((e) => e.id === "evt_vini");
    expect(vini).toBeDefined();
    expect(vini?.startDate).toBe("2026-09-08");
    const listed = listEvents(seed);
    const listedVini = listed.find((e) => e.id === "evt_vini");
    expect(listedVini?.status).toBe("active");
  });

  it("does not include past year collections or expenses in event stats", () => {
    const seed = buildSeed();
    const vini = seed.events.find((e) => e.id === "evt_vini")!;
    const initialStats = listEvents(seed).find((e) => e.id === "evt_vini")!;

    // Add a collection from 2025 tagged with evt_vini
    seed.collections.push({
      id: "col_past_year",
      receiptNumber: "NBM-2025-9999",
      personName: "Past Contributor",
      amount: 8999,
      paymentMethod: "cash",
      contributionType: "namePhone",
      date: "2025-08-20",
      eventId: "evt_vini",
      createdBy: "Admin",
      createdAt: "2025-08-20T10:00:00Z",
      updatedAt: "2025-08-20T10:00:00Z",
    });

    // Add an expense from 2025 tagged with evt_vini
    seed.expenses.push({
      id: "exp_past_year",
      title: "Past Expense",
      category: "Other",
      amount: 3000,
      paymentMethod: "cash",
      date: "2025-08-20",
      eventId: "evt_vini",
      paidBy: "Mandram",
      createdBy: "Admin",
      createdAt: "2025-08-20T10:00:00Z",
      updatedAt: "2025-08-20T10:00:00Z",
    });

    const newStats = listEvents(seed).find((e) => e.id === "evt_vini")!;
    expect(newStats.varavu).toBe(initialStats.varavu);
    expect(newStats.selavu).toBe(initialStats.selavu);
    expect(newStats.balance).toBe(initialStats.balance);
  });
});

