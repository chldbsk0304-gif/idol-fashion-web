// Cosine-similarity matching against the idol style DB.
//
// Data shape (data/idol_style_ranking.json):
//   { "<idol-name>": {
//       group, total_items, status: "ok" | "insufficient_data",
//       primary: { style, count, pct },
//       secondary: [...],
//       full_distribution: { "<style>": <count>, ... }   // counts, NOT pct
//   } }
//
// Notes:
//  - full_distribution holds raw counts, so we normalize to a probability
//    distribution before comparing.
//  - We only match against idols with total_items >= 5 ("ok" status). The
//    aggregator already marks these; we double-check to be defensive.

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  STYLE_ORDER,
  type MatchResponse,
  type MatchedIdol,
  type StyleDistribution,
} from './styles';

interface RawIdolEntry {
  group: string | null;
  total_items: number;
  status: 'ok' | 'insufficient_data';
  primary: { style: string; count: number; pct: number } | null;
  secondary: { style: string; count: number; pct: number }[];
  full_distribution: Record<string, number>;
}

type RawIdolDB = Record<string, RawIdolEntry>;

let _cache: RawIdolDB | null = null;

async function loadIdolDB(): Promise<RawIdolDB> {
  if (_cache) return _cache;
  const p = path.join(process.cwd(), 'data', 'idol_style_ranking.json');
  const raw = await fs.readFile(p, 'utf-8');
  _cache = JSON.parse(raw) as RawIdolDB;
  return _cache;
}

function toVector(dist: StyleDistribution): number[] {
  return STYLE_ORDER.map((s) => dist[s] || 0);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

function normalizeCounts(counts: Record<string, number>): StyleDistribution {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (!total) return {};
  const out: StyleDistribution = {};
  for (const [k, v] of Object.entries(counts)) {
    out[k] = v / total;
  }
  return out;
}

// Stable seed for IdolPortrait palette (so the same idol always gets the same
// color). Hashes the idol name to one of 4 palettes.
function seedFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % 4;
}

/**
 * Compare a user distribution against the idol DB and return the top matches.
 *
 * @param userDist  15-style distribution from /api/analyze
 * @param topK      number of matches to return (default 3 = 1 primary + 2 next)
 * @param minItems  minimum total_items filter (default 5)
 */
export async function matchIdols(
  userDist: StyleDistribution,
  topK = 3,
  minItems = 5,
): Promise<MatchResponse> {
  const db = await loadIdolDB();
  const userVec = toVector(userDist);

  const candidates: MatchedIdol[] = [];
  for (const [name, entry] of Object.entries(db)) {
    if (entry.status !== 'ok' || entry.total_items < minItems) continue;
    if (!entry.primary) continue;

    const idolDist = normalizeCounts(entry.full_distribution);
    const score = cosine(userVec, toVector(idolDist));

    candidates.push({
      name,
      nameKr: name,
      group: entry.group ?? '',
      primary: entry.primary.style,
      score,
      seed: seedFromName(name),
      distribution: idolDist,
      totalItems: entry.total_items,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    user_distribution: userDist,
    matches: candidates.slice(0, topK),
    considered: candidates.length,
  };
}
