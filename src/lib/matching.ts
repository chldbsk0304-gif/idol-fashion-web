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
  type IdolItem,
  type MatchResponse,
  type MatchedIdol,
  type StyleDistribution,
} from './styles';

interface StyledItem {
  idol_name?: string;
  brand?: string | null;
  product_name?: string | null;
  style?: string | null;
  post_url?: string | null;
  posted_at?: string | null;
  images?: Array<{ url?: string; type?: string }>;
}

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
let _imageCache: Map<string, string> | null = null;
let _itemsCache: Map<string, IdolItem[]> | null = null;

async function loadIdolDB(): Promise<RawIdolDB> {
  if (_cache) return _cache;
  const p = path.join(process.cwd(), 'data', 'idol_style_ranking.json');
  const raw = await fs.readFile(p, 'utf-8');
  _cache = JSON.parse(raw) as RawIdolDB;
  return _cache;
}

// Pre-index "first image URL" per idol from items_with_style.json. Prefer
// type:'wearing' if any item is tagged that way; else take the first non-empty
// URL across all items for that idol.
async function loadImageIndex(): Promise<Map<string, string>> {
  if (_imageCache) return _imageCache;
  const p = path.join(process.cwd(), 'data', 'items_with_style.json');
  let items: StyledItem[];
  try {
    items = JSON.parse(await fs.readFile(p, 'utf-8')) as StyledItem[];
  } catch {
    _imageCache = new Map();
    return _imageCache;
  }
  const wearing = new Map<string, string>();
  const anyImg = new Map<string, string>();
  for (const it of items) {
    const idol = it.idol_name?.trim();
    if (!idol || !Array.isArray(it.images)) continue;
    for (const img of it.images) {
      if (!img?.url) continue;
      if (img.type === 'wearing' && !wearing.has(idol)) wearing.set(idol, img.url);
      if (!anyImg.has(idol)) anyImg.set(idol, img.url);
    }
  }
  const merged = new Map<string, string>(anyImg);
  for (const [k, v] of wearing) merged.set(k, v); // wearing overrides
  _imageCache = merged;
  return merged;
}

// Index of worn items per idol, ready to feed the result page carousel.
async function loadItemsIndex(): Promise<Map<string, IdolItem[]>> {
  if (_itemsCache) return _itemsCache;
  const p = path.join(process.cwd(), 'data', 'items_with_style.json');
  let raw: StyledItem[];
  try {
    raw = JSON.parse(await fs.readFile(p, 'utf-8')) as StyledItem[];
  } catch {
    _itemsCache = new Map();
    return _itemsCache;
  }
  const grouped = new Map<string, IdolItem[]>();
  for (const it of raw) {
    const idol = it.idol_name?.trim();
    if (!idol) continue;
    // Need at least an image or a brand/product to be worth showing.
    const firstImg = it.images?.find((i) => i?.url)?.url ?? null;
    if (!firstImg && !it.brand && !it.product_name) continue;
    const arr = grouped.get(idol) ?? [];
    arr.push({
      brand: it.brand ?? null,
      productName: it.product_name ?? null,
      style: it.style ?? null,
      imageUrl: firstImg,
      postUrl: it.post_url ?? null,
    });
    grouped.set(idol, arr);
  }
  _itemsCache = grouped;
  return grouped;
}

// Build the carousel list for one idol: primary-style items first, then the
// rest, capped at maxItems.
function pickItemsForIdol(
  all: IdolItem[],
  primaryStyle: string,
  maxItems = 12,
): IdolItem[] {
  const onStyle: IdolItem[] = [];
  const offStyle: IdolItem[] = [];
  for (const it of all) {
    if (it.style && it.style === primaryStyle) onStyle.push(it);
    else offStyle.push(it);
  }
  return [...onStyle, ...offStyle].slice(0, maxItems);
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
  const [db, imageIndex, itemsIndex] = await Promise.all([
    loadIdolDB(),
    loadImageIndex(),
    loadItemsIndex(),
  ]);
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
      imageUrl: imageIndex.get(name),
      distribution: idolDist,
      totalItems: entry.total_items,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const winners = candidates.slice(0, topK);
  // Only attach the items list to the top match — that's the one whose
  // products the result page will showcase. Saves payload.
  if (winners[0]) {
    const all = itemsIndex.get(winners[0].name) ?? [];
    winners[0].items = pickItemsForIdol(all, winners[0].primary, 12);
  }

  return {
    user_distribution: userDist,
    matches: winners,
    considered: candidates.length,
  };
}
