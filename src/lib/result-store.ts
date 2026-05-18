// In-memory result cache for shareable result URLs.
//
// MVP-grade: backed by a module-scope Map with TTL. Survives within a single
// serverless instance; resets on cold start / new deploy. For production
// durability swap this module for Vercel KV — the read/write shape (set/get)
// is identical so callers don't change.

import crypto from 'node:crypto';
import type { MatchedIdol, StyleDistribution } from './styles';

export interface StoredResult {
  id: string;
  createdAt: number;
  userDistribution: StyleDistribution;
  matches: MatchedIdol[];
  primaryIdx: number;
  /** Vision's brief_analysis line — useful but not load-bearing. */
  briefAnalysis?: string;
}

interface Entry {
  data: StoredResult;
  expiresAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_ENTRIES = 5000;            // soft cap to bound memory in dev

// In Next.js dev + on Vercel cold starts, route handlers and pages can each
// evaluate this module independently — so a plain module-scope Map ends up
// per-route. Pin it to globalThis so reads and writes hit the same instance
// within one Node process.
const GLOBAL_KEY = Symbol.for('@fitmatch/result-store');
type GlobalScope = typeof globalThis & { [GLOBAL_KEY]?: Map<string, Entry> };
const g = globalThis as GlobalScope;
const store: Map<string, Entry> = g[GLOBAL_KEY] ?? (g[GLOBAL_KEY] = new Map());

function reapExpired(now: number) {
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

function dropOldestIfFull() {
  if (store.size < MAX_ENTRIES) return;
  // Map preserves insertion order — first key is the oldest write.
  const oldest = store.keys().next().value;
  if (oldest) store.delete(oldest);
}

function newId(): string {
  // 8 url-safe chars, base32-ish. 5 bytes of entropy = collision-resistant
  // enough for the volumes we expect.
  return crypto.randomBytes(5).toString('hex'); // 10 hex chars
}

export function saveResult(
  payload: Omit<StoredResult, 'id' | 'createdAt'>,
): StoredResult {
  const now = Date.now();
  reapExpired(now);
  dropOldestIfFull();

  let id = newId();
  // collision guard (vanishingly unlikely; defensive)
  while (store.has(id)) id = newId();

  const data: StoredResult = { id, createdAt: now, ...payload };
  store.set(id, { data, expiresAt: now + TTL_MS });
  return data;
}

export function getResult(id: string): StoredResult | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.data;
}
