// POST /api/results — persist a result and mint a shareable id.

import { NextRequest, NextResponse } from 'next/server';
import { saveResult } from '@/lib/result-store';
import { STYLE_ORDER, type MatchedIdol, type StyleDistribution } from '@/lib/styles';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const RL_MAX = 20;

interface CreateBody {
  userDistribution?: StyleDistribution;
  matches?: MatchedIdol[];
  primaryIdx?: number;
  briefAnalysis?: string;
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

function isValidMatch(m: unknown): m is MatchedIdol {
  if (!m || typeof m !== 'object') return false;
  const x = m as Record<string, unknown>;
  return (
    typeof x.nameKr === 'string' &&
    typeof x.group === 'string' &&
    typeof x.primary === 'string' &&
    typeof x.score === 'number' &&
    typeof x.seed === 'number' &&
    typeof x.distribution === 'object' && x.distribution !== null
  );
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { max: RL_MAX, scope: 'results' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해주세요.` },
      { status: 429, headers: rateLimitHeaders(rl, RL_MAX) },
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'JSON 본문 파싱 실패' }, { status: 400 });
  }

  if (!isValidDistribution(body.userDistribution)) {
    return NextResponse.json({ error: 'userDistribution 누락' }, { status: 400 });
  }
  if (!Array.isArray(body.matches) || body.matches.length === 0 || !body.matches.every(isValidMatch)) {
    return NextResponse.json({ error: 'matches 형식이 올바르지 않음' }, { status: 400 });
  }
  const primaryIdx =
    typeof body.primaryIdx === 'number' && body.primaryIdx >= 0 && body.primaryIdx < body.matches.length
      ? body.primaryIdx
      : 0;

  const saved = saveResult({
    userDistribution: body.userDistribution,
    matches: body.matches as MatchedIdol[],
    primaryIdx,
    briefAnalysis: typeof body.briefAnalysis === 'string' ? body.briefAnalysis : undefined,
  });

  return NextResponse.json({ id: saved.id, createdAt: saved.createdAt });
}
