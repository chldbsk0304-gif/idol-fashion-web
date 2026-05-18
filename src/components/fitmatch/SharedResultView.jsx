'use client';

// Read-only view of a saved result. Reuses ResultScreen + ShareScreen so the
// share-card looks identical to what the original author saw.
//
// "Retry" on this surface starts a fresh run (navigate back to /) — we cannot
// re-run someone else's photo.

import React from 'react';
import { useRouter } from 'next/navigation';
import ResultScreen from './screen-result';
import ShareScreen from './screen-share';

export default function SharedResultView({ stored }) {
  const router = useRouter();
  const [primaryIdx, setPrimaryIdx] = React.useState(stored.primaryIdx || 0);
  const [showShare, setShowShare] = React.useState(false);

  const matches = stored.matches;
  const userDistribution = stored.userDistribution;
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/result/${stored.id}`
      : '';

  return (
    <div className="fitmatch-shell">
      <ResultScreen
        matches={matches}
        userDistribution={userDistribution}
        primaryIdx={primaryIdx}
        setPrimaryIdx={setPrimaryIdx}
        onRetry={() => router.push('/')}
        onShare={() => setShowShare(true)}
      />
      {showShare && (
        <ShareScreen
          matches={matches}
          primaryIdx={primaryIdx}
          shareUrl={shareUrl}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
