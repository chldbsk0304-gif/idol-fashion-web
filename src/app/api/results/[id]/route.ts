// GET /api/results/:id — read a stored result.

import { NextResponse } from 'next/server';
import { getResult } from '@/lib/result-store';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = getResult(params.id);
  if (!data) {
    return NextResponse.json({ error: 'not found or expired' }, { status: 404 });
  }
  return NextResponse.json(data);
}
