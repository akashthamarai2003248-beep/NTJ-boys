import { describe, expect, it } from "vitest";
import { parseVoiceExpenseTranscript, parseVoiceTranscript } from "@/lib/utils/voice";
import type { Event } from "@/lib/data/types";

function ev(id: string, name: string, tamilName: string): Event {
  return {
    id,
    name,
    tamilName,
    type: "festival",
    status: "active",
    startDate: "2026-09-19",
    endDate: "2026-09-23",
    location: "",
    description: "",
    createdAt: "",
    updatedAt: "",
  };
}

const EVENTS = [
  ev("evt_vini", "Vinayagar Chathurthi 2026", "விநாயகர் சதுர்த்தி விழா"),
  ev("evt_pongal", "Pongal 2027", "பொங்கல் திருவிழா"),
  ev("evt_sports", "Pongal Sports 2027", "பொங்கல் விளையாட்டு போட்டிகள்"),
];

describe("voice transcript parsing", () => {
  it("extracts name, cash and amount", () => {
    expect(parseVoiceTranscript("Ravi Kumar cash 750", EVENTS)).toEqual({
      name: "Ravi Kumar",
      paymentMethod: "cash",
      amount: 750,
    });
  });

  it("extracts phone (one or two chunks) and UPI", () => {
    expect(parseVoiceTranscript("98400 00002 Ravi Kumar 750 UPI", EVENTS)).toEqual({
      phone: "9840000002",
      name: "Ravi Kumar",
      amount: 750,
      paymentMethod: "upi",
    });
    expect(parseVoiceTranscript("9840000002 500", EVENTS)).toEqual({
      phone: "9840000002",
      amount: 500,
    });
  });

  it("drops a +91 country code from the phone", () => {
    expect(parseVoiceTranscript("+91 98400 00002 Ravi 500", EVENTS)).toEqual({
      phone: "9840000002",
      name: "Ravi",
      amount: 500,
    });
  });

  it("leaves no name for a bare '750 cash' — admin records a Voice entry", () => {
    expect(parseVoiceTranscript("750 cash", EVENTS)).toEqual({
      amount: 750,
      paymentMethod: "cash",
    });
  });

  it("maps general fund to eventId null", () => {
    expect(parseVoiceTranscript("cash 750 general fund", EVENTS)).toEqual({
      paymentMethod: "cash",
      amount: 750,
      eventId: null,
    });
  });

  it("matches an event by full name and by a loose word", () => {
    expect(parseVoiceTranscript("Muthu 500 for vinayagar chathurthi", EVENTS)).toEqual({
      name: "Muthu",
      amount: 500,
      eventId: "evt_vini",
    });
    expect(parseVoiceTranscript("pongal 500", EVENTS)).toEqual({
      amount: 500,
      eventId: "evt_pongal",
    });
  });

  it("prefers the longest matching event phrase", () => {
    expect(parseVoiceTranscript("pongal sports 750", EVENTS)).toEqual({
      amount: 750,
      eventId: "evt_sports",
    });
  });

  it("handles Tamil payment + event words", () => {
    expect(parseVoiceTranscript("ரவி 750 ரொக்கம் பொங்கல்", EVENTS)).toEqual({
      name: "ரவி",
      amount: 750,
      paymentMethod: "cash",
      eventId: "evt_pongal",
    });
  });

  it("extracts a street phrase only when clearly anchored", () => {
    expect(parseVoiceTranscript("Ravi Kumar, south street, 750", EVENTS)).toEqual({
      name: "Ravi Kumar",
      street: "south street",
      amount: 750,
    });
    expect(parseVoiceTranscript("Ravi Kumar from south street 750", EVENTS)).toEqual({
      name: "Ravi Kumar",
      street: "south street",
      amount: 750,
    });
  });

  it("keeps an unanchored street phrase in the name instead of splitting it", () => {
    expect(parseVoiceTranscript("Ravi Kumar south street 750", EVENTS)).toEqual({
      name: "Ravi Kumar south street",
      amount: 750,
    });
  });

  it("strips 'rupees' words", () => {
    expect(parseVoiceTranscript("Ravi 750 rupees", EVENTS)).toEqual({
      name: "Ravi",
      amount: 750,
    });
  });

  it("returns nothing for empty or unrecognisable input", () => {
    expect(parseVoiceTranscript("", EVENTS)).toEqual({});
    expect(parseVoiceTranscript("   ", EVENTS)).toEqual({});
  });
});

describe("expense voice transcript parsing", () => {
  it("extracts title, amount and paid-by from a full dictation", () => {
    expect(parseVoiceExpenseTranscript("Sound system hire, 750, paid by Muthu Kannan, cash, Pongal", EVENTS)).toEqual({
      title: "Sound system hire",
      category: "Sound",
      amount: 750,
      paidBy: "Muthu Kannan",
      paymentMethod: "cash",
      eventId: "evt_pongal",
    });
  });

  it("keeps a category word that belongs to the title", () => {
    expect(parseVoiceExpenseTranscript("Food for volunteers 2000 gpay", EVENTS)).toEqual({
      title: "Food for volunteers",
      category: "Food",
      amount: 2000,
      paymentMethod: "upi",
    });
  });

  it("accepts a comma-anchored 'by X' and a bare category dictation", () => {
    expect(parseVoiceExpenseTranscript("pandal erection, 3000, by Muthu", EVENTS)).toEqual({
      title: "pandal erection",
      category: "Pandal",
      amount: 3000,
      paidBy: "Muthu",
    });
  });

  it("strips speech fillers from the title", () => {
    expect(parseVoiceExpenseTranscript("We spent on idol 3500 please", EVENTS)).toEqual({
      title: "idol",
      category: "Idol",
      amount: 3500,
    });
  });

  it("maps general fund to eventId null and matches a loose event word", () => {
    expect(parseVoiceExpenseTranscript("Printing 250 general fund", EVENTS)).toEqual({
      title: "Printing",
      category: "Printing",
      amount: 250,
      eventId: null,
    });
    expect(parseVoiceExpenseTranscript("Transport 4000 for chathurthi", EVENTS)).toEqual({
      title: "Transport",
      category: "Transport",
      amount: 4000,
      eventId: "evt_vini",
    });
  });

  it("leaves an unknown dictation as title only", () => {
    expect(parseVoiceExpenseTranscript("paint brushes 400", EVENTS)).toEqual({
      title: "paint brushes",
      amount: 400,
    });
  });

  it("keeps a Tamil title as-is", () => {
    expect(parseVoiceExpenseTranscript("ஒலிபெருக்கி அமைப்பு 750", EVENTS)).toEqual({
      title: "ஒலிபெருக்கி அமைப்பு",
      amount: 750,
    });
  });

  it("fills the date field from spoken dates", () => {
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(parseVoiceExpenseTranscript("Sound hire 750 today", EVENTS)).toEqual({
      title: "Sound hire",
      amount: 750,
      category: "Sound",
      date: iso(today),
    });
    expect(parseVoiceExpenseTranscript("Idol flowers 300 yesterday", EVENTS)).toEqual({
      title: "Idol flowers",
      category: "Idol", // parser still reports it — the form chooses not to fill the category field
      amount: 300,
      date: iso(yesterday),
    });
    expect(parseVoiceExpenseTranscript("Pandal cloth 4000 05/09/2026", EVENTS)).toEqual({
      title: "Pandal cloth",
      category: "Pandal",
      amount: 4000,
      date: "2026-09-05",
    });
    expect(parseVoiceExpenseTranscript("Printing 250 5 September", EVENTS)).toEqual({
      title: "Printing",
      amount: 250,
      category: "Printing",
      date: `${new Date().getFullYear()}-09-05`,
    });
    // plain titles and amounts must never be eaten as dates
    expect(parseVoiceExpenseTranscript("paint brushes 400", EVENTS)).toEqual({ title: "paint brushes", amount: 400 });
  });

  it("returns nothing for empty input", () => {
    expect(parseVoiceExpenseTranscript("", EVENTS)).toEqual({});
  });
});