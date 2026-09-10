import fs from "node:fs";
import path from "node:path";
import type { DB } from "./types";
import { buildSeed } from "./seed";

/* ─────────────────────────────────────────────────────────────
 * Local demo store — persists the DB document to ./.data/db.json
 * (gitignored). Auto-seeds on first load. This is the "local
 * adapter"; the repository layer is the single seam the app talks
 * to, so switching to Supabase (Phase 3) touches nothing else.
 * ───────────────────────────────────────────────────────────── */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;
let writeChain: Promise<void> = Promise.resolve();

/** Older Phase-1 db.json files lack the Phase-2 collections — fill them. */
function hydrateShape(db: DB): DB {
  if (!Array.isArray(db.games)) db.games = [];
  if (!Array.isArray(db.teams)) db.teams = [];
  if (!Array.isArray(db.participants)) db.participants = [];
  if (!Array.isArray(db.matches)) db.matches = [];
  if (!Array.isArray(db.results)) db.results = [];
  if (!Array.isArray(db.gallery)) db.gallery = [];
  if (!db.settings) db.settings = { publicView: true, updatedAt: new Date().toISOString() };
  return db;
}

function readFromDisk(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8").replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw) as DB;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.collections)) {
        hydrateShape(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.error("[store] failed to read local db, re-seeding:", err);
  }
  const seeded = hydrateShape(buildSeed());
  writeSync(seeded);
  return seeded;
}

function writeSync(db: DB) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error("[store] failed to persist local db:", err);
  }
}

/** Get the DB document (in-memory cache seeded from disk). */
export function getDB(): DB {
  if (!cache) cache = readFromDisk();
  return cache;
}

/**
 * Mutate the DB. Writes are serialised so concurrent requests cannot
 * corrupt the document. `fn` may return a value which is handed back.
 */
export async function mutateDB<T>(fn: (db: DB) => T): Promise<T> {
  let result!: T;
  const run = async () => {
    const db = getDB();
    result = fn(db);
    writeSync(db);
  };
  writeChain = writeChain.then(run, run);
  await writeChain;
  return result;
}

/** Drop everything and re-seed (used by demo reset). */
export async function resetToSeed(): Promise<DB> {
  const db = buildSeed();
  cache = db;
  writeSync(db);
  return db;
}

/** Used by tests / scripts to build a fresh in-memory db without disk. */
export function freshDB(now?: Date): DB {
  return buildSeed(now);
}
