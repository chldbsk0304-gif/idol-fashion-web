// GET /api/img?u=<encoded-url>
//
// Same-origin proxy for X CDN images. Two reasons we need this:
//   1) html2canvas can't render cross-origin images that don't return CORS
//      headers; it taints the canvas and toBlob() fails.
//   2) X (pbs.twimg.com) sometimes gates by Referer; serving the same image
//      through our domain bypasses that.
//
// Tight allowlist (pbs.twimg.com only) so this can't be abused as a generic
// image proxy. Vercel's edge cache picks up the Cache-Control header.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOSTS = new Set(['pbs.twimg.com']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u) {
    return NextResponse.json({ error: 'u query missing' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      // Don't forward credentials; some CDNs reject when they see one.
      headers: { 'User-Agent': 'fitmatch/1.0' },
      cache: 'no-store',
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `upstream fetch failed: ${m}` }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'non-image upstream' }, { status: 415 });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'image too large' }, { status: 413 });
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // 1 day at the edge; ETag deduped by URL+u.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
