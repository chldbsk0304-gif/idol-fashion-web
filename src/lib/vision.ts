// Claude Vision wrapper for /api/analyze.
//
// Contract: take an image (base64-encoded buffer + media type) and return a
// 15-style distribution. The prompt is fixed by the design brief and must not
// drift; if you need to tune behavior, prefer post-processing in JS over
// changing the prompt unless the brief is updated.

import Anthropic from '@anthropic-ai/sdk';
import { AnalyzeResponse, STYLE_ORDER, StyleDistribution } from './styles';

const MODEL = 'claude-sonnet-4-5';

// System prompt fixed verbatim by the design brief.
const SYSTEM_PROMPT = `당신은 한국 패션 스타일 분석 전문가입니다. 첨부된 이미지의 OOTD(전신 사복)를 분석해서,
이 사람의 패션을 무신사 공식 15개 스타일에 분포로 매핑해주세요.

15개 스타일:
캐주얼, 스트릿, 미니멀, 걸리시, 스포티, 로맨틱, 클래식, 시크,
워크웨어, 시티보이, 고프코어, 레트로, 프레피, 리조트, 에스닉

규칙:
- 합계는 정확히 1.0
- 가장 강한 스타일 1개에 0.3~0.6 정도 비중
- 보조 스타일 2~3개에 나머지 분배
- 해당 없는 스타일은 0
- 최소 3개 이상의 스타일에 분포

JSON으로만 응답하세요. 설명 금지.

형식:
{
  "distribution": { "캐주얼": 0.0, "스트릿": 0.0, ... },
  "dominant_style": "스타일명",
  "confidence": 0.0~1.0,
  "brief_analysis": "한 줄 분석 (한국어)"
}`;

const SUPPORTED_MEDIA = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export class VisionError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

// Extracts the first balanced `{...}` block from a string. Defensive against
// the model wrapping JSON in code fences or prose.
function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// Make the distribution well-formed even if the model drifted:
//   - drop unknown styles
//   - clamp negatives, normalize to sum to 1
//   - if everything zeroed out, return the raw object (caller will reject)
function normalizeDistribution(raw: Record<string, unknown>): StyleDistribution {
  const cleaned: StyleDistribution = {};
  for (const style of STYLE_ORDER) {
    const v = raw[style];
    cleaned[style] = typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
  }
  const total = Object.values(cleaned).reduce<number>((s, v) => s + (v ?? 0), 0);
  if (total <= 0) return cleaned;
  for (const k of Object.keys(cleaned)) {
    cleaned[k] = (cleaned[k] ?? 0) / total;
  }
  return cleaned;
}

/**
 * Call Claude Vision on an OOTD image and return the 15-style distribution.
 *
 * @param imageBase64  raw base64-encoded image bytes (no data: prefix)
 * @param mediaType    e.g. 'image/jpeg'
 */
export async function analyzeOOTD(
  imageBase64: string,
  mediaType: string,
): Promise<AnalyzeResponse> {
  // Two auth shapes are supported:
  //   ANTHROPIC_API_KEY   — sends `x-api-key` header (default Anthropic console keys)
  //   ANTHROPIC_AUTH_TOKEN — sends `Authorization: Bearer` (BizRouter, OAuth gateways)
  // The SDK picks the right one from env automatically; we just gatekeep on
  // presence so a missing key surfaces a clear error instead of a 401.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey && !authToken) {
    throw new VisionError(
      'ANTHROPIC_API_KEY 또는 ANTHROPIC_AUTH_TOKEN이 서버에 설정되지 않았습니다.',
      500,
    );
  }
  if (!SUPPORTED_MEDIA.has(mediaType)) {
    throw new VisionError(`지원하지 않는 이미지 형식입니다: ${mediaType}`, 415);
  }

  // Constructor with no args → SDK reads ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
  // / ANTHROPIC_BASE_URL from env. Explicit args win if both are set.
  const client = new Anthropic();
  let msg;
  try {
    msg = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: '이 OOTD를 분석해 JSON으로만 응답하세요.',
            },
          ],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new VisionError(`Vision 호출 실패: ${message}`, 502);
  }

  const textBlock = msg.content.find((b) => b.type === 'text');
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  const jsonStr = extractJsonObject(text);
  if (!jsonStr) {
    throw new VisionError('Vision 응답에서 JSON을 추출하지 못했습니다.', 502);
  }

  let parsed: {
    distribution?: Record<string, unknown>;
    dominant_style?: string;
    confidence?: number;
    brief_analysis?: string;
  };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new VisionError('Vision 응답 JSON 파싱 실패', 502);
  }

  const distribution = normalizeDistribution(parsed.distribution ?? {});
  const total = Object.values(distribution).reduce<number>((s, v) => s + (v ?? 0), 0);
  if (total <= 0) {
    throw new VisionError('이미지에서 스타일을 추출하지 못했습니다. 다른 사진으로 시도해주세요.', 422);
  }

  // Pick dominant_style from the normalized distribution if the model didn't
  // give one, or if it returned an unknown style.
  let dominant = parsed.dominant_style ?? '';
  if (!dominant || !(STYLE_ORDER as readonly string[]).includes(dominant)) {
    dominant = Object.entries(distribution).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  }

  const confidence =
    typeof parsed.confidence === 'number' && isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;

  return {
    distribution,
    dominant_style: dominant,
    confidence,
    brief_analysis: typeof parsed.brief_analysis === 'string' ? parsed.brief_analysis : '',
  };
}
