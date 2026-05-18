'use client';

// Top-level state machine — Phase 3 wiring.
//
// Flow:
//   upload → (file picked, 평가받기 tapped) → analyzing
//                                           ├─ POST /api/analyze    (image → 15-style dist)
//                                           └─ POST /api/match      (dist → top idols)
//          → result (when BOTH the 6.5s scan timer AND the API have finished)
//          → share (modal overlay; navigable back to result)
//
// Design contract: do not change visuals. We pipe live data into the same
// props the prototype already used; the screens render identically.

import React from 'react';
import imageCompression from 'browser-image-compression';
import UploadScreen from './screen-upload';
import AnalyzingScreen from './screen-analyzing';
import ResultScreen from './screen-result';
import ShareScreen from './screen-share';

// Time-based portion of the scan. The bar reaches ~95% by this point and
// parks there until the API actually returns; final ramp to 100% happens
// inside AnalyzingScreen once we set resultReady.
const SCAN_DURATION_MS = 5000;

// Cap before we ship bytes to the server. Phase 5 explicitly asks for client
// resize ≤ 8 MB; we go a touch lower so multipart overhead stays under cap.
const COMPRESSION_OPTS = {
  maxSizeMB: 6,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
};

export default function FitMatchApp() {
  const [phase, setPhase] = React.useState('upload'); // 'upload' | 'analyzing' | 'result'
  const [slots, setSlots] = React.useState([null]);
  const [primaryIdx, setPrimaryIdx] = React.useState(0);
  const [showShare, setShowShare] = React.useState(false);

  const [matches, setMatches] = React.useState([]);
  const [userDistribution, setUserDistribution] = React.useState({});
  const [briefAnalysis, setBriefAnalysis] = React.useState('');

  // Resolution gate: result screen only appears when BOTH are true.
  const [resultReady, setResultReady] = React.useState(false);
  const [timerDone, setTimerDone] = React.useState(false);

  // Shareable URL minted on first arrival to the result screen.
  const [resultId, setResultId] = React.useState(null);
  const shareUrl = resultId && typeof window !== 'undefined'
    ? `${window.location.origin}/result/${resultId}`
    : '';

  // AnalyzingScreen calls onDone after the 95→100% ramp completes; by then
  // resultReady is true, so we can transition immediately.
  React.useEffect(() => {
    if (phase === 'analyzing' && timerDone && resultReady) {
      setPhase('result');
      setTimerDone(false);
    }
  }, [phase, timerDone, resultReady]);

  // Stable callback so AnalyzingScreen's mount-once effect doesn't see a
  // new function identity on every parent render.
  const handleScanDone = React.useCallback(() => setTimerDone(true), []);

  // Mint a shareable id as soon as we have a result on screen. Failure here is
  // non-fatal — share targets that need a URL will fall back to copy-text.
  React.useEffect(() => {
    if (phase !== 'result' || matches.length === 0 || resultId) return;
    let cancelled = false;
    fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userDistribution,
        matches,
        primaryIdx,
        briefAnalysis,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.id) setResultId(data.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [phase, matches, userDistribution, primaryIdx, briefAnalysis, resultId]);

  // Cleanup any object URLs we created.
  const revokeSlotUrls = (arr) => {
    arr.forEach((s) => {
      if (s?.kind === 'file' && s.url) URL.revokeObjectURL(s.url);
    });
  };

  const reset = () => {
    setSlots((cur) => {
      revokeSlotUrls(cur);
      return [null];
    });
    setPhase('upload');
    setShowShare(false);
    setPrimaryIdx(0);
    setMatches([]);
    setUserDistribution({});
    setBriefAnalysis('');
    setResultReady(false);
    setTimerDone(false);
    setResultId(null);
  };

  const startAnalysis = async () => {
    const slot = slots[0];
    if (!slot || slot.kind !== 'file' || !slot.file) {
      alert('업로드된 사진이 없어요.');
      return;
    }

    setResultReady(false);
    setTimerDone(false);
    setPhase('analyzing');

    try {
      // Compress in-place; falls back to original on failure.
      let file = slot.file;
      try {
        file = await imageCompression(slot.file, COMPRESSION_OPTS);
      } catch (e) {
        console.warn('compression failed, sending original', e);
      }

      const analyzeForm = new FormData();
      analyzeForm.append('image', file, file.name || 'ootd.jpg');

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        body: analyzeForm,
      });
      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}));
        throw new Error(body.error || `분석 실패 (HTTP ${analyzeRes.status})`);
      }
      const analyzeData = await analyzeRes.json();

      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distribution: analyzeData.distribution, topK: 3 }),
      });
      if (!matchRes.ok) {
        const body = await matchRes.json().catch(() => ({}));
        throw new Error(body.error || `매칭 실패 (HTTP ${matchRes.status})`);
      }
      const matchData = await matchRes.json();

      const shaped = matchData.matches.map((m) => ({
        // The result/share screens render `nameKr` (large) and optionally
        // `name` (small mono next to it). Our DB only has Korean names; leave
        // `name` empty so the slash-suffix doesn't duplicate the Korean name.
        name: '',
        nameKr: m.nameKr || m.name,
        group: m.group,
        score: m.score,
        primary: m.primary,
        seed: m.seed,
        imageUrl: m.imageUrl,
        distribution: m.distribution,
        items: m.items,
      }));

      setMatches(shaped);
      setUserDistribution(analyzeData.distribution);
      setBriefAnalysis(analyzeData.brief_analysis || '');
      setPrimaryIdx(0);
      setResultId(null);
      setResultReady(true);
    } catch (err) {
      console.error('analysis pipeline failed', err);
      alert(`분석 중 오류가 발생했어요\n${err.message}`);
      setPhase('upload');
    }
  };

  return (
    <div className="fitmatch-shell">
      {phase === 'upload' && (
        <UploadScreen
          slots={slots}
          setSlots={setSlots}
          onContinue={startAnalysis}
        />
      )}
      {phase === 'analyzing' && (
        <AnalyzingScreen
          slots={slots.some(Boolean) ? slots : [{ kind: 'fake', seed: 0 }]}
          durationMs={SCAN_DURATION_MS}
          resultReady={resultReady}
          onDone={handleScanDone}
        />
      )}
      {phase === 'result' && matches.length > 0 && (
        <ResultScreen
          matches={matches}
          userDistribution={userDistribution}
          primaryIdx={primaryIdx}
          setPrimaryIdx={setPrimaryIdx}
          onRetry={reset}
          onShare={() => setShowShare(true)}
        />
      )}
      {showShare && matches.length > 0 && (
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
