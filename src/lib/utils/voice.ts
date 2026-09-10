/**
 * Pure parsing for the admin "Voice to text" collection shortcut.
 *
 * The admin dictates a contribution — e.g. "Ravi Kumar, cash, 750, Pongal" —
 * and the browser's SpeechRecognition hands us one transcript string.
 * This function extracts the fields the CollectionForm understands:
 * name, street, phone, amount, payment method and event. Anything it does
 * not recognise is left alone for the admin to fix by hand.
 */

import type { Event, ExpenseCategory, PaymentMethod } from "@/lib/data/types";
import { parseRupees } from "@/lib/utils/money";
import { todayISO } from "@/lib/utils/date";

export interface VoiceTranscriptParse {
  name?: string;
  street?: string;
  phone?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  /** undefined → not mentioned; null → explicitly "general fund" */
  eventId?: string | null;
}

/** Indian mobile: optional +91, then 10 digits in one or two chunks. */
const PHONE_RE = /(?:\+?91[ -]?)?(\d{5})[ -]?(\d{5})/;
const NUMBER_TOKEN = /(\d[\d,]*)/g;

const UPI_RE = /(google\s?pay|gpay|phonepay|phonepe|paytm|\bupi\b|யுபிஐ|ஜிபே|ஜி\s?பே|கூகுள்\s?பே)/i;
const BANK_RE = /(bank\s?transfer|\bbank\b|neft|imps|வங்கி)/i;
const CASH_RE = /(\bcash\b|ரொக்கம்)/i;
const GENERAL_FUND_RE = /(general\s?fund|பொது\s?நிதி|பொதுநிதி)/i;
const RUPEES_RE = /\b(rupees?|rs\.?)\b|ரூபாய்|ரூபா|ரூ/i;

/**
 * A street phrase is only taken when it is unambiguous: after a comma or a
 * "from / of / at / in / on / near" filler. Never when it could swallow the
 * contributor's name ("Ravi Kumar south street" keeps the name intact).
 */
const STREET_RE =
  /(?:,\s*|\b(?:from|of|at|in|on|near)\s+)((?:[A-Za-z0-9\u0B80-\u0BFF]+\s+){0,2}[A-Za-z0-9\u0B80-\u0BFF]+\s+(?:street|road|nagar|lane|salai|st|தெரு|சாலை|நகர்))(?:[\s,]|$)/i;

const STOP_WORDS = new Set(["fund", "general", "the", "for", "and", "with", "from", "into"]);
/** Politeness words people append at the end of a dictation. */
const TRAILING_FILLERS = /\b(?:for|please|pls|thanks|thank\s*you|ok(?:ay)?|so)\s*$/i;

function matchMethod(text: string): { value: PaymentMethod; re: RegExp } | null {
  if (UPI_RE.test(text)) return { value: "upi", re: UPI_RE };
  if (BANK_RE.test(text)) return { value: "bank", re: BANK_RE };
  if (CASH_RE.test(text)) return { value: "cash", re: CASH_RE };
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanName(s: string): string | undefined {
  let cleaned = s
    .replace(/[.,;:!?\-–—()"'“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  while (TRAILING_FILLERS.test(cleaned)) cleaned = cleaned.replace(TRAILING_FILLERS, "").trim();
  return cleaned || undefined;
}

/** Full phrases that uniquely identify an event (name, name w/o year, Tamil name). */
function phraseCandidates(e: Event): string[] {
  const withoutYear = e.name.replace(/\s+\d{4}$/, "").trim();
  return Array.from(new Set([e.name, withoutYear, e.tamilName].filter(Boolean)));
}

/** Distinctive words (≥ 4 chars) of an event's name, used for loose matching. */
function eventWords(e: Event): string[] {
  const words = new Set<string>();
  const withoutYear = e.name.replace(/\s+\d{4}$/, "").trim();
  for (const w of `${withoutYear} ${e.tamilName}`.split(/\s+/)) {
    const clean = w.replace(/[^A-Za-z\u0B80-\u0BFF]/g, "").toLowerCase();
    if (clean.length >= 4 && !STOP_WORDS.has(clean)) words.add(clean);
  }
  return Array.from(words);
}

function findEvent(text: string, events: Event[]): { event: Event; phrase?: string; words?: string[] } | null {
  const lower = text.toLowerCase();
  // 1) longest full phrase contained in the transcript ("pongal 2027")
  const hits = events
    .flatMap((e) => phraseCandidates(e).map((phrase) => ({ event: e, phrase })))
    .filter((h) => lower.includes(h.phrase.toLowerCase()))
    .sort((a, b) => b.phrase.length - a.phrase.length);
  if (hits[0]) return { event: hits[0].event, phrase: hits[0].phrase };
  // 2) any distinctive word from an event's name ("chathurthi", "pongal"…)
  let best: { event: Event; words: string[] } | null = null;
  for (const e of events) {
    const words = eventWords(e).filter((w) => lower.includes(w));
    if (words.length && (!best || words.length > best.words.length)) best = { event: e, words };
  }
  return best;
}

/** Expense-specific extractions: category, paid-by and a free-form title. */

/** "paid by Muthu Kannan" / "pay by Muthu Kannan" — name runs to a comma or the end. */
const PAID_BY_RE = /\b(?:paid|pay(?:s|ed)?|given)\s+by\s+([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]*?)(?=\s*[,;]|\s*$)/i;
/** bare ", by Muthu Kannan" — only when anchored after a comma, never mid-title. */
const COMMA_BY_RE = /,\s*by\s+([A-Za-z\u0B80-\u0BFF][A-Za-z\u0B80-\u0BFF .'-]*?)(?=\s*[,;]|\s*$)/i;

/** Category keyword → ExpenseCategory. Longest words first so "printing" beats "print". */
const CATEGORY_WORDS: [RegExp, ExpenseCategory][] = [
  [/\btransport(?:ation)?\b/i, "Transport"],
  [/\bdecoration\b/i, "Decoration"],
  [/\blight(?:ing)?\b/i, "Lighting"],
  [/\bcleaning\b/i, "Cleaning"],
  [/\bprinting\b/i, "Printing"],
  [/\bpandal\b/i, "Pandal"],
  [/\bsports?\b/i, "Sports"],
  [/\bprizes?\b/i, "Prizes"],
  [/\bsound\b/i, "Sound"],
  [/\bfood\b/i, "Food"],
  [/\bidol\b/i, "Idol"],
];

/** Words that prefix a dictated title and should be dropped ("we spent on sound…"). */
const TITLE_LEAD = /^\s*\b(?:we|i|have|had|spent|spend|bought|purchased|purchase|paid|paying|for|on|the|a|an|of|with|about|around|please|pls|thanks|thank\s*you|ok(?:ay)?|so)\b\s*/i;
/** Words people trail off with ("…for the event please"). */
const TITLE_TAIL = /\s*\b(?:please|pls|thanks|thank\s*you|ok(?:ay)?|so|for|on|the|a|an|of|with)\b\s*$/i;

function cleanTitle(s: string): string | undefined {
  let cleaned = s
    .replace(/[.,;:!?\-–—()"'“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  while (TITLE_LEAD.test(cleaned)) cleaned = cleaned.replace(TITLE_LEAD, "").trim();
  while (TITLE_TAIL.test(cleaned)) cleaned = cleaned.replace(TITLE_TAIL, "").trim();
  return cleaned || undefined;
}

function matchCategory(text: string): ExpenseCategory | undefined {
  for (const [re, cat] of CATEGORY_WORDS) {
    if (re.test(text)) return cat;
  }
  return undefined;
}

/**
 * A spoken date: "today", "yesterday", "05-09-2026", "5 September 2026",
 * "9 slash 9" (year defaults to the current one). Only removed from the
 * transcript when it matches, so ordinary titles are untouched.
 */
const DATE_RE =
  /\b(?:today|yesterday|இன்று|நேற்று)\b|(?:\b\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?\b)|(?:\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:\.?,?\s*\d{4})?)|(?:\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b(?:\.?,?\s*\d{4})?)|(?:\b\d{4}-\d{2}-\d{2}\b)/i;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/** yyyy-mm-dd for a matched date phrase, or undefined when it means today. */
function dateFromMatch(m: string): string | undefined {
  const lower = m.toLowerCase().trim();
  if (lower === "today" || lower === "இன்று") return todayISO();
  if (lower === "yesterday" || lower === "நேற்று") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  const iso = lower.match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return lower;
  // d/m or d/m/yyyy or d/m/yy — day first (Indian convention)
  const dmy = lower.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]);
    let year = dmy[3] ? Number(dmy[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return undefined;
  }
  // "5 September 2026" / "September 5" — month name form
  const words = lower.replace(/[.,]/g, " ").split(/\s+/);
  const monthIdx = words.findIndex((w) => MONTHS[w] !== undefined);
  if (monthIdx === -1) return undefined;
  const mon = MONTHS[words[monthIdx]];
  const day = Number(words.find((w) => /^\d{1,2}(st|nd|rd|th)?$/.test(w))?.replace(/st|nd|rd|th$/, ""));
  const yearTok = words.find((w) => /^\d{4}$/.test(w));
  const year = yearTok ? Number(yearTok) : new Date().getFullYear();
  if (day >= 1 && day <= 31) {
    return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return undefined;
}

/**
 * Extract expense fields from a dictated transcript, e.g.
 * "Sound system hire, 750, paid by Muthu Kannan, cash, Pongal".
 * Category words are matched on the leftover text but never removed —
 * "Sound system hire" keeps its "Sound". Anything unrecognised stays
 * in the title for the admin to fix by hand.
 */
export function parseVoiceExpenseTranscript(text: string, events: Event[]): VoiceExpenseParse {
  const original = text.trim();
  if (!original) return {};
  let work = ` ${original} `;
  const out: VoiceExpenseParse = {};

  const method = matchMethod(work);
  if (method) {
    out.paymentMethod = method.value;
    work = work.replace(method.re, " ");
  }

  if (GENERAL_FUND_RE.test(work)) {
    out.eventId = null;
    work = work.replace(GENERAL_FUND_RE, " ");
  }

  const hit = findEvent(work, events);
  if (hit) {
    out.eventId = hit.event.id;
    if (hit.phrase) {
      work = work.replace(new RegExp(escapeRegExp(hit.phrase), "i"), " ");
    } else if (hit.words) {
      for (const w of hit.words) work = work.replace(new RegExp(escapeRegExp(w), "i"), " ");
    }
  }

  const dateMatch = work.match(DATE_RE);
  if (dateMatch) {
    const iso = dateFromMatch(dateMatch[0]);
    if (iso) {
      out.date = iso;
      work = work.replace(dateMatch[0], " ");
    }
  }

  const paidBy = work.match(PAID_BY_RE) ?? work.match(COMMA_BY_RE);
  if (paidBy) {
    out.paidBy = cleanName(paidBy[1]);
    work = work.replace(paidBy[0], " ");
  }

  work = work.replace(RUPEES_RE, " ");

  // amount = the last number token, like the collection parser
  const tokens = [...work.matchAll(NUMBER_TOKEN)];
  const amountToken = tokens.length ? tokens[tokens.length - 1] : null;
  if (amountToken) {
    const n = parseRupees(amountToken[1]);
    if (n && n > 0) {
      out.amount = n;
      work = work.replace(amountToken[0], " ");
    }
  }

  out.category = matchCategory(work);

  const title = cleanTitle(work);
  if (title) out.title = title;

  return out;
}

export interface VoiceExpenseParse {
  title?: string;
  category?: ExpenseCategory;
  amount?: number;
  paidBy?: string;
  paymentMethod?: PaymentMethod;
  /** yyyy-mm-dd from a spoken date ("today", "05-09-2026", "5 September") */
  date?: string;
  /** undefined → not mentioned; null → explicitly "general fund" */
  eventId?: string | null;
}
export function parseVoiceTranscript(text: string, events: Event[]): VoiceTranscriptParse {
  const original = text.trim();
  if (!original) return {};
  // padded so removals never join neighbouring words
  let work = ` ${original} `;
  const out: VoiceTranscriptParse = {};

  const phone = work.match(PHONE_RE);
  if (phone) {
    out.phone = `${phone[1]}${phone[2]}`;
    work = work.replace(PHONE_RE, " ");
  }

  const method = matchMethod(work);
  if (method) {
    out.paymentMethod = method.value;
    work = work.replace(method.re, " ");
  }

  if (GENERAL_FUND_RE.test(work)) {
    out.eventId = null;
    work = work.replace(GENERAL_FUND_RE, " ");
  }

  const hit = findEvent(work, events);
  if (hit) {
    out.eventId = hit.event.id;
    if (hit.phrase) {
      work = work.replace(new RegExp(escapeRegExp(hit.phrase), "i"), " ");
    } else if (hit.words) {
      for (const w of hit.words) work = work.replace(new RegExp(escapeRegExp(w), "i"), " ");
    }
  }

  const street = work.trim().match(STREET_RE);
  if (street) {
    out.street = cleanName(street[1]);
    work = work.replace(street[0], " ");
  }

  work = work.replace(RUPEES_RE, " ");

  // amount = the last number token ("2nd cross street" keeps "2", "750" wins)
  const tokens = [...work.matchAll(NUMBER_TOKEN)];
  const amountToken = tokens.length ? tokens[tokens.length - 1] : null;
  if (amountToken) {
    const n = parseRupees(amountToken[1]);
    if (n && n > 0) {
      out.amount = n;
      work = work.replace(amountToken[0], " ");
    }
  }

  const name = cleanName(work);
  if (name) out.name = name;

  return out;
}