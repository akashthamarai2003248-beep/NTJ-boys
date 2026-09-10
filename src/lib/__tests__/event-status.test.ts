import { describe, it, expect } from "vitest";
import { resolveEventStatus, friendlyDateRange } from "../utils/date";

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
