import type { Lang } from "@/lib/i18n";
import type { PaymentMethod } from "@/lib/data/types";

/**
 * Translations for names, streets, expense items and categories stored in the database.
 * When the user selects Tamil ("ta"), database-stored English terms are translated to Tamil.
 * When the user selects English ("en"), Tamil terms (or transliterations) resolve to English.
 */

export const PERSON_NAMES_EN_TO_TA: Record<string, string> = {
  "Akash": "ஆகாஷ்",
  "Sundaravel Rajan": "சுந்தரவேல் ராஜன்",
  "Muthu Kannan": "முத்து கண்ணன்",
  "Karthik Raja": "கார்த்திக் ராஜா",
  "Palanisamy Gounder": "பழனிசாமி கவுண்டர்",
  "Murugan Selvam": "முருகன் செல்வம்",
  "Ravi Kumar": "ரவி குமார்",
  "Vignesh Anand": "விக்னேஷ் ஆனந்த்",
  "Suresh Babu": "சுரேஷ் பாபு",
  "Manikandan Ram": "மணிகண்டன் ராம்",
  "Kathir Vel": "கதிர்வேல்",
  "Dinesh Pandian": "தினேஷ் பாண்டியன்",
  "Prakash Rao": "பிரகாஷ் ராவ்",
  "Selvam Annamalai": "செல்வம் அண்ணாமலை",
  "Ganesh Kumar": "கணேஷ் குமார்",
  "Boopathy Chelliah": "பூபதி செல்லையா",
  "Arumugam Siva": "ஆறுமுகம் சிவா",
  "Ramasamy Perumal": "ராமசாமி பெருமாள்",
  "Ilango Krishnan": "இளங்கோ கிருஷ்ணன்",
  "Jegan Muthu": "ஜெகன் முத்து",
  "Karuppaiah Nadar": "கருப்பையா நாடார்",
  "Thangavel Murugan": "தங்கவேல் முருகன்",
  "Udhaya Kumar": "உதய குமார்",
  "Velmurugan Raja": "வேல்முருகன் ராஜா",
  "Sakthivel Pandian": "சக்திவேல் பாண்டியன்",
  "Marimuthu Eswaran": "மாரிமுத்து ஈஸ்வரன்",
  "Natesan Gopal": "நடேசன் கோபால்",
  "Chelladurai Bose": "செல்லத்துரை போஸ்",
  "Lakshmanan Iyer": "லட்சுமணன் ஐயர்",
  "Mukesh": "முகேஷ்",
  "Prabha": "பிரபா",
  "prabha": "பிரபா",
  "Ravi": "ரவி",
  "Muthu": "முத்து",
  "Suresh": "சுரேஷ்",
  "Karthik": "கார்த்திக்",
  "Murugan": "முருகன்",
  "Selvam": "செல்வம்",
  "Sundaravel": "சுந்தரவேல்",
  "Rajan": "ராஜன்",
  "Kumar": "குமார்",
  "Ganesh": "கணேஷ்",
  "Babu": "பாபு",
  "Siva": "சிவா",
  "Pandian": "பாண்டியன்",
  "Anand": "ஆனந்த்",
  "Krishnan": "கிருஷ்ணன்",
  "Bose": "போஸ்",
  "Gopal": "கோபால்",
};

export const EXPENSE_TITLES_EN_TO_TA: Record<string, string> = {
  "Pandal erection material": "பந்தல் அமைக்கும் பொருட்கள்",
  "Idol + pooja items": "விநாயகர் சிலை மற்றும் பூசைப் பொருட்கள்",
  "Sound system hire": "ஒலிபெருக்கி வாடகை",
  "Lights & festoons": "மின்விளக்குகள் மற்றும் தோரணங்கள்",
  "Snacks for volunteers": "தன்னார்வலர்களுக்கு சிற்றுண்டி",
  "Printing invitation cards": "அழைப்பிதழ் அச்சிடுதல்",
  "Transport of idol & materials": "சிலை மற்றும் பொருட்கள் போக்குவரத்து",
  "Deepam oil & camphor": "தீப எண்ணெய் மற்றும் கற்பூரம்",
  "Stage decoration flowers": "மேடை அலங்கார மலர்கள்",
  "Prasadam ingredients (advance)": "பிரசாதப் பொருட்கள் (முன்பணம்)",
  "Banana leaves & plates": "வாழை இலைகள் மற்றும் தட்டுகள்",
  "Volunteer t-shirts": "தன்னார்வலர் சீருடை டி-ஷர்ட்",
  "Street cleaning after festival": "திருவிழாவிற்கு பின் தெரு சுத்தம் செய்தல்",
  "Electrician charges": "மின் பணியாளர் கூலி",
  "Registration board & flex": "பதிவு பலகை மற்றும் பிளெக்ஸ்",
  "Ground maintenance": "திடல் பராமரிப்பு",
  "Cricket kit (balls, stumps)": "கிரிக்கெட் விளையாட்டு உபகரணங்கள்",
  "Sports medals & shields": "விளையாட்டுப் பதக்கங்கள் மற்றும் கோப்பைகள்",
  "Pongal kolam colours": "பொங்கல் கோலப் பொடிகள்",
  "Treasurer stationery & receipt book": "பொருளாளர் எழுதுபொருட்கள் & ரசீது புத்தகம்",
  "Poster printing for events": "நிகழ்வு சுவரொட்டி அச்சிடுதல்",
  "Pongal community lunch provisions": "பொங்கல் சமபந்தி உணவுப் பொருட்கள்",
  "Idol flowers": "விநாயகர் சிலை மலர்கள்",
  "Pandal cloth": "பந்தல் துணி",
  "Printing": "அச்சுப் பணி",
  "Food for volunteers": "தன்னார்வலர்களுக்கு உணவு",
  "Transport": "போக்குவரத்து",
  "Sound hire": "ஒலிபெருக்கி வாடகை",
  "General expenses": "பொது செலவுகள்",
  "Flex banner": "பிளெக்ஸ் பேனர்",
  "Mic & speaker set": "மைக் & ஸ்பீக்கர் செட்",
  "Tea & snacks": "தேநீர் & சிற்றுண்டி",
  "Water packets": "குடிநீர் பாக்கெட்டுகள்",
};

export const EXPENSE_CATEGORIES_MAP: Record<string, { en: string; ta: string }> = {
  Decoration: { en: "Decoration", ta: "அலங்காரம்" },
  Food: { en: "Food", ta: "உணவு" },
  Sound: { en: "Sound", ta: "ஒலிபெருக்கி" },
  Lighting: { en: "Lighting", ta: "மின்விளக்கு" },
  Pandal: { en: "Pandal", ta: "பந்தல்" },
  Idol: { en: "Idol", ta: "சிலை / பூசை" },
  Sports: { en: "Sports", ta: "விளையாட்டு" },
  Prizes: { en: "Prizes", ta: "பரிசுகள்" },
  Transport: { en: "Transport", ta: "போக்குவரத்து" },
  Cleaning: { en: "Cleaning", ta: "சுத்தம் செய்தல்" },
  Printing: { en: "Printing", ta: "அச்சுப் பணி" },
  Other: { en: "Other", ta: "மற்றவை" },
};

export const COLLECTION_CATEGORIES_MAP: Record<string, { en: string; ta: string }> = {
  "ஊர் வசூல்": { en: "Village Collection", ta: "ஊர் வசூல்" },
  "மன்றம் வசூல்": { en: "Mandram Collection", ta: "மன்றம் வசூல்" },
  "பிற வசூல்": { en: "Other Collection", ta: "பிற வசூல்" },
  "village": { en: "Village Collection", ta: "ஊர் வசூல்" },
  "mandram": { en: "Mandram Collection", ta: "மன்றம் வசூல்" },
  "other": { en: "Other Collection", ta: "பிற வசூல்" },
  "Oor Vasul": { en: "Village Collection", ta: "ஊர் வசூல்" },
  "Mandram Vasul": { en: "Mandram Collection", ta: "மன்றம் வசூல்" },
  "Special / Other": { en: "Other Collection", ta: "பிற வசூல்" },
};

/** Translate contributor or member name */
export function translatePersonName(name: string, lang: Lang): string {
  if (!name) return "";
  if (lang === "en") return name;
  if (PERSON_NAMES_EN_TO_TA[name]) return PERSON_NAMES_EN_TO_TA[name];

  // Try partial word replacement if composite name
  let translated = name;
  let hasMatch = false;
  for (const [en, ta] of Object.entries(PERSON_NAMES_EN_TO_TA)) {
    if (translated.includes(en)) {
      translated = translated.replace(en, ta);
      hasMatch = true;
    }
  }
  return hasMatch ? translated : name;
}

/** Return street address as-is (preserved without translation) */
export function translateStreet(street: string | null | undefined, _lang?: Lang): string {
  return street ?? "";
}

/** Translate expense title */
export function translateExpenseTitle(title: string, lang: Lang): string {
  if (!title) return "";
  if (lang === "en") return title;
  if (EXPENSE_TITLES_EN_TO_TA[title]) return EXPENSE_TITLES_EN_TO_TA[title];

  let res = title;
  for (const [en, ta] of Object.entries(EXPENSE_TITLES_EN_TO_TA)) {
    if (res.toLowerCase().includes(en.toLowerCase())) {
      res = res.replace(new RegExp(en, "i"), ta);
      return res;
    }
  }
  return title;
}

/** Translate expense category */
export function translateExpenseCategory(category: string, lang: Lang): string {
  if (!category) return "";
  const meta = EXPENSE_CATEGORIES_MAP[category];
  if (!meta) return category;
  if (lang === "ta") return meta.ta;
  if (lang === "both") return `${meta.ta} · ${meta.en}`;
  return meta.en;
}

/** Translate collection category */
export function translateCategory(category: string | null | undefined, lang: Lang): string {
  if (!category) return lang === "ta" ? "ஊர் வசூல்" : "Village Collection";
  const meta = COLLECTION_CATEGORIES_MAP[category];
  if (meta) {
    if (lang === "ta") return meta.ta;
    if (lang === "both") return `${meta.ta} · ${meta.en}`;
    return meta.en;
  }
  return category;
}

/** Translate event name */
export function translateEventName(
  name: string | null | undefined,
  tamilName: string | null | undefined,
  lang: Lang
): string {
  if (!name && !tamilName) {
    return lang === "ta" ? "பொது நிதி" : lang === "both" ? "பொது நிதி · General Fund" : "General Fund";
  }
  const en = name ?? "";
  const ta = tamilName ?? name ?? "";
  if (lang === "ta") return ta || en;
  if (lang === "both") return ta && ta !== en ? `${ta} · ${en}` : en;
  return en || ta;
}

/** Translate payment method */
export function translatePaymentMethod(method: PaymentMethod, lang: Lang): string {
  const map: Record<PaymentMethod, { en: string; ta: string }> = {
    cash: { en: "Cash", ta: "ரொக்கம்" },
    upi: { en: "GPay (UPI)", ta: "ஜிபே (UPI)" },
    bank: { en: "Bank Transfer", ta: "வங்கி" },
    other: { en: "Other", ta: "மற்றவை" },
  };
  const m = map[method] ?? { en: method, ta: method };
  if (lang === "ta") return m.ta;
  if (lang === "both") return `${m.ta} · ${m.en}`;
  return m.en;
}
