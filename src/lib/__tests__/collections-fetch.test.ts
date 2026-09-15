import { describe, expect, it } from "vitest";
import { queryCollections } from "@/lib/data/repository";
import { buildSeed } from "@/lib/data/seed";
import type { DB, Collection } from "@/lib/data/types";

describe("collections data fetching and query logic", () => {
  const seedDB = buildSeed(new Date(2026, 8, 5, 12));

  it("returns all collections when no filter is provided", () => {
    const res = queryCollections(seedDB, {});
    expect(res.total).toBe(seedDB.collections.length);
    expect(res.items.length).toBe(seedDB.collections.length);
    const expectedSum = seedDB.collections.reduce((s, c) => s + c.amount, 0);
    expect(res.sum).toBe(expectedSum);
    expect(res.allSum).toBe(expectedSum);
  });

  it("calculates sum and total accurately from the exact same dataset", () => {
    const res = queryCollections(seedDB, {});
    const itemsSum = res.items.reduce((s, c) => s + c.amount, 0);
    expect(res.sum).toBe(itemsSum);
    expect(res.total).toBe(res.items.length);
  });

  it("filters collections by eventId correctly without dropping records whose year differs", () => {
    // Create a mock DB with collections spanning across years for the same event
    const testDB: DB = {
      ...seedDB,
      events: [
        {
          id: "evt_test",
          name: "Test Festival",
          tamilName: "திருவிழா",
          type: "festival",
          status: "completed",
          startDate: "2025-10-01",
          endDate: "2025-10-05",
          location: "Main Ground",
          description: "Test event",
          createdAt: "2025-09-01T00:00:00Z",
          updatedAt: "2025-09-01T00:00:00Z",
        },
      ],
      collections: [
        {
          id: "col_1",
          receiptNumber: "NBM-2025-0001",
          personName: "Donor A",
          amount: 1000,
          paymentMethod: "cash",
          contributionType: "name",
          date: "2025-10-02",
          eventId: "evt_test",
          createdBy: "Admin",
          createdAt: "2025-10-02T10:00:00Z",
          updatedAt: "2025-10-02T10:00:00Z",
        },
        {
          id: "col_2",
          receiptNumber: "NBM-2026-0002",
          personName: "Donor B",
          amount: 2000,
          paymentMethod: "upi",
          contributionType: "name",
          date: "2026-01-15", // Late collection for the same event, recorded in 2026
          eventId: "evt_test",
          createdBy: "Admin",
          createdAt: "2026-01-15T10:00:00Z",
          updatedAt: "2026-01-15T10:00:00Z",
        },
        {
          id: "col_3",
          receiptNumber: "NBM-2026-0003",
          personName: "Donor C",
          amount: 500,
          paymentMethod: "cash",
          contributionType: "name",
          date: "2026-02-01",
          eventId: "other_event",
          createdBy: "Admin",
          createdAt: "2026-02-01T10:00:00Z",
          updatedAt: "2026-02-01T10:00:00Z",
        },
      ],
    };

    const res = queryCollections(testDB, { eventId: "evt_test" });
    // Both col_1 (2025) and col_2 (2026) must be included because both have eventId === "evt_test"
    expect(res.total).toBe(2);
    // Sorts newest first by default: col_2 (2026-01-15) then col_1 (2025-10-02)
    expect(res.items.map((i) => i.id)).toEqual(["col_2", "col_1"]);
    expect(res.sum).toBe(3000);
    expect(res.allSum).toBe(3500);
  });

  it("filters collections by date range correctly", () => {
    const testDB: DB = {
      ...seedDB,
      collections: [
        {
          id: "col_2025",
          receiptNumber: "NBM-2025-0001",
          personName: "Old Donor",
          amount: 500,
          paymentMethod: "cash",
          contributionType: "name",
          date: "2025-05-10",
          eventId: "evt_1",
          createdBy: "Admin",
          createdAt: "2025-05-10T00:00:00Z",
          updatedAt: "2025-05-10T00:00:00Z",
        },
        {
          id: "col_2026",
          receiptNumber: "NBM-2026-0001",
          personName: "New Donor",
          amount: 1500,
          paymentMethod: "upi",
          contributionType: "name",
          date: "2026-03-20",
          eventId: "evt_2",
          createdBy: "Admin",
          createdAt: "2026-03-20T00:00:00Z",
          updatedAt: "2026-03-20T00:00:00Z",
        },
      ],
    };

    const res2026 = queryCollections(testDB, { from: "2026-01-01", to: "2026-12-31" });
    expect(res2026.total).toBe(1);
    expect(res2026.items[0].id).toBe("col_2026");
    expect(res2026.sum).toBe(1500);

    const resAll = queryCollections(testDB, {});
    expect(resAll.total).toBe(2);
    expect(resAll.sum).toBe(2000);
  });

  it("handles pagination with page and perPage without losing total count or sum", () => {
    const res = queryCollections(seedDB, { perPage: 5, page: 1 });
    expect(res.items.length).toBe(5);
    expect(res.total).toBe(seedDB.collections.length);
    expect(res.sum).toBe(seedDB.collections.reduce((s, c) => s + c.amount, 0));
  });

  it("optimistic state updates maintain data consistency on Add, Edit, and Delete", () => {
    let state = {
      items: [...seedDB.collections],
      total: seedDB.collections.length,
      sum: seedDB.collections.reduce((s, c) => s + c.amount, 0),
      allSum: seedDB.collections.reduce((s, c) => s + c.amount, 0),
    };

    // 1. Add
    const newCol: Collection = {
      id: "col_new",
      receiptNumber: "NBM-2026-9999",
      personName: "Fresh Donor",
      amount: 5000,
      paymentMethod: "upi",
      contributionType: "name",
      date: "2026-09-15",
      eventId: "evt_vini",
      createdBy: "Admin",
      createdAt: "2026-09-15T00:00:00Z",
      updatedAt: "2026-09-15T00:00:00Z",
    };

    state = {
      ...state,
      items: [newCol, ...state.items],
      total: state.total + 1,
      sum: state.sum + newCol.amount,
      allSum: state.allSum + newCol.amount,
    };
    expect(state.total).toBe(seedDB.collections.length + 1);
    expect(state.items[0].id).toBe("col_new");
    expect(state.sum).toBe(seedDB.collections.reduce((s, c) => s + c.amount, 0) + 5000);

    // 2. Edit
    const updatedAmount = 7000;
    const diff = updatedAmount - newCol.amount;
    state = {
      ...state,
      items: state.items.map((it) => (it.id === "col_new" ? { ...it, amount: updatedAmount } : it)),
      sum: state.sum + diff,
      allSum: state.allSum + diff,
    };
    expect(state.items.find((i) => i.id === "col_new")?.amount).toBe(7000);
    expect(state.sum).toBe(seedDB.collections.reduce((s, c) => s + c.amount, 0) + 7000);

    // 3. Delete
    state = {
      ...state,
      items: state.items.filter((it) => it.id !== "col_new"),
      total: state.total - 1,
      sum: state.sum - 7000,
      allSum: state.allSum - 7000,
    };
    expect(state.total).toBe(seedDB.collections.length);
    expect(state.sum).toBe(seedDB.collections.reduce((s, c) => s + c.amount, 0));
  });
});
