// POST /api/analyze — image → 15-style distribution
//
// Accepts either:
//   - multipart/form-data with field name "image" (preferred from the browser)
//   - application/json with { "imageBase64": "...", "mediaType": "image/jpeg" }
//
// The image bytes are forwarded straight to Vision and dropped from memory
// when the request returns — we never persist them.

import { NextRequest, NextResponse } from 'next/server';
import { analyzeOOTD, VisionError } from '@/lib/vision';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
// Body parser ceiling — clients resize to ≤ 6MB before upload (FitMatchApp's
// COMPRESSION_OPTS); the server hard-caps at 8MB to match the privacy/UX copy.
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB hard cap
const RL_MAX = 5;                  // per minute, per IP (Vision is the expensive call)

interface JsonBody {
  imageBase64?: string;
  mediaType?: string;
}

function isDataUrl(s: string): boolean {
  return s.startsWith('data:');
}

function stripDataUrl(s: string): { mediaType: string; base64: string } | null {
  const m = s.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { max: RL_MAX, scope: 'analyze' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${rl.retryAfterSec}초 후 다시 시도해주세요.` },
      { status: 429, headers: rateLimitHeaders(rl, RL_MAX) },
    );
  }

  const contentType = req.headers.get('content-type') || '';

  try {
    let imageBase64: string | null = null;
    let mediaType: string | null = null;

    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('image');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: '`image` 필드에 파일이 없습니다.' },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `이미지가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB > 8MB).` },
          { status: 413 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      imageBase64 = buf.toString('base64');
      mediaType = file.type || 'image/jpeg';
    } else if (contentType.includes('application/json')) {
      const body = (await req.json()) as JsonBody;
      if (!body.imageBase64) {
        return NextResponse.json({ error: 'imageBase64 필드 누락' }, { status: 400 });
      }
      if (isDataUrl(body.imageBase64)) {
        const parsed = stripDataUrl(body.imageBase64);
        if (!parsed) {
          return NextResponse.json({ error: 'data URL 형식 오류' }, { status: 400 });
        }
        imageBase64 = parsed.base64;
        mediaType = parsed.mediaType;
      } else {
        imageBase64 = body.imageBase64;
        mediaType = body.mediaType || 'image/jpeg';
      }
      // Approximate base64 → bytes size check
      const approxBytes = (imageBase64.length * 3) / 4;
      if (approxBytes > MAX_BYTES) {
        return NextResponse.json(
          { error: `이미지가 너무 큽니다 (${(approxBytes / 1024 / 1024).toFixed(1)}MB > 8MB).` },
          { status: 413 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type은 multipart/form-data 또는 application/json 이어야 합니다.' },
        { status: 415 },
      );
    }

    const result = await analyzeOOTD(imageBase64!, mediaType!);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VisionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
