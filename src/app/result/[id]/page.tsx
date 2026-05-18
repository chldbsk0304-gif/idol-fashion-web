// Server Component: load a saved result by id and pass to the client view.
// No fetch — we read the cache directly via the store module so this avoids
// a self-call to /api/results/:id.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getResult } from '@/lib/result-store';
import SharedResultView from '@/components/fitmatch/SharedResultView';

interface RouteParams {
  params: { id: string };
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const stored = getResult(params.id);
  if (!stored) return { title: 'FITMATCH · 결과 없음' };
  const primary = stored.matches[stored.primaryIdx] ?? stored.matches[0];
  const pct = Math.round((primary?.score ?? 0) * 100);
  return {
    title: `${primary?.nameKr} ${pct}% · FITMATCH`,
    description: `나는 ${primary?.nameKr}(${primary?.group})랑 ${pct}% 닮은 스타일!`,
  };
}

export default function ResultPage({ params }: RouteParams) {
  const stored = getResult(params.id);
  if (!stored) notFound();
  return <SharedResultView stored={stored} />;
}
