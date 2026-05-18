// POST /api/match — user 15-style distribution → top idol matches.

import { NextRequest, NextResponse } from 'next/server';
import { matchIdols } from '@/lib/matching';
import { STYLE_ORDER, type StyleDistribution } from '@/lib/styles';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const RL_MAX = 30; // matching is cheap; allow more headroom than /analyze

interface MatchBody {
  distribution?: StyleDistribution;
  topK?: number;
  minItems?: number;
}

function isValidDistribution(d: unknown): d is StyleDistribution {
  if (!d || typeof d !== 'object') return false;
  const rec = d as Record<string, unknown>;
  let nonzero = 0;
  for (const k of Object.keys(rec)) {
    if (!(STYLE_ORDER as readonly string[]).includes(k)) continue;
    const v = rec[k];
    if (typeof v !== 'number' || !isFinite(v) || v < 0) return false;
    if (v > 0) nonzero++;
  }
  return nonzero > 0;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { max: RL_MAX, scope: 'match' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해주세요.` },
      { status: 429, headers: rateLimitHeaders(rl, RL_MAX) },
    );
  }

  let body: MatchBody;
  try {
    body = (await req.json()) as MatchBody;
  } catch {
    return NextResponse.json({ error: 'JSON 본문 파싱 실패' }, { status: 400 });
  }

  if (!isValidDistribution(body.distribution)) {
    return NextResponse.json(
      { error: 'distribution 필드가 유효하지 않습니다. (15스타일 중 1개 이상에 양수 값 필요)' },
      { status: 400 },
    );
  }

  const topK = typeof body.topK === 'number' ? Math.min(Math.max(1, body.topK), 10) : 3;
  const minItems = typeof body.minItems === 'number' ? Math.max(1, body.minItems) : 5;

  try {
    const result = await matchIdols(body.distribution, topK, minItems);
    if (result.matches.length === 0) {
      return NextResponse.json(
        { error: `매칭 후보가 없습니다. (min_items=${minItems} 기준)` },
        { status: 404 },
      );
    }
    return NextResponse.json(result, { headers: rateLimitHeaders(rl, RL_MAX) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
