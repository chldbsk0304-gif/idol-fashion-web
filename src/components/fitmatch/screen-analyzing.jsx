'use client';

// Analysis loading screen.
//
// Progress is driven in two phases so the bar never restarts and so it stays
// in sync with the real API round-trip:
//   1) 0 → 0.95 by a time-based interpolation over `durationMs` (default 5s).
//      The bar holds at 0.95 if the API hasn't finished yet — this is the
//      "almost done" parking spot the brief asks for.
//   2) When `resultReady` flips true, the bar eases from its current value
//      (≤ 0.95) up to 1.0 over ~500ms, then onDone fires.
//
// `onDone` is captured into a ref so changes to the callback identity from
// the parent re-render don't restart the effect (this was the cause of the
// "progress runs twice" bug — onDone was in the dep list and the parent's
// inline arrow created a fresh ref on every render).

import React from 'react';
import { COLORS, STYLES_15, PixelCross, FakePhoto } from './ui';

const SCAN_PHASE_CEILING = 0.95;   // where the time-based timer parks
const FINAL_RAMP_MS = 500;         // 0.95 → 1.0 once API is back

export default function AnalyzingScreen({
  slots,
  onDone,
  resultReady = false,
  durationMs = 5000,
}) {
  const [progress, setProgress] = React.useState(0);
  const [scanIdx, setScanIdx] = React.useState(0);
  const [logs, setLogs] = React.useState([]);

  // Stable refs so the main effect runs exactly once.
  const onDoneRef = React.useRef(onDone);
  const durationRef = React.useRef(durationMs);
  const readyRef = React.useRef(resultReady);
  const finishedRef = React.useRef(false);
  React.useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  React.useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  React.useEffect(() => { readyRef.current = resultReady; }, [resultReady]);

  React.useEffect(() => {
    const start = Date.now();
    // Tracks where the bar is when we hand off to the final ramp.
    let rampFromValue = 0;
    let rampStart = 0;

    const tick = setInterval(() => {
      if (finishedRef.current) return;

      const elapsed = Date.now() - start;

      if (!readyRef.current) {
        // Phase 1: time-based, capped at SCAN_PHASE_CEILING.
        const t = Math.min(1, elapsed / durationRef.current) * SCAN_PHASE_CEILING;
        setProgress(t);
        setScanIdx(Math.min(STYLES_15.length - 1, Math.floor((t / SCAN_PHASE_CEILING) * STYLES_15.length)));
        rampFromValue = t;
        rampStart = Date.now();
      } else {
        // Phase 2: ramp from wherever phase 1 parked to 1.0.
        const rampElapsed = Date.now() - rampStart;
        const r = Math.min(1, rampElapsed / FINAL_RAMP_MS);
        const value = rampFromValue + (1 - rampFromValue) * r;
        setProgress(value);
        setScanIdx(STYLES_15.length - 1);
        if (r >= 1) {
          finishedRef.current = true;
          clearInterval(tick);
          // small breath at 100% before flipping screens
          setTimeout(() => onDoneRef.current?.(), 250);
        }
      }
    }, 50);

    return () => clearInterval(tick);
    // Intentionally mount-once. All inputs read via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const lines = [
      '> init style.scan v1.7',
      '> loading frame…',
      '> normalize.color · ok',
      '> detect.silhouette · ok',
      '> mapping 15 axes…',
      '> compare idol.db',
      '> ranking matches…',
      '> render result',
    ];
    let i = 0;
    const id = setInterval(() => {
      if (i >= lines.length) return clearInterval(id);
      setLogs((prev) => [...prev, lines[i]]);
      i++;
    }, 700);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(progress * 100);
  const safeSlots = (slots && slots.length) ? slots : [{ kind: 'fake', seed: 0 }];

  return (
    <div style={{
      background: COLORS.bg, color: COLORS.text,
      minHeight: '100%',
      padding: '24px 20px 40px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <PixelCross style={{ position: 'absolute', top: 30, left: 14 }} />
      <PixelCross style={{ position: 'absolute', top: 30, right: 14 }} />

      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, letterSpacing: 1.6, color: COLORS.accent,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: 8,
      }}>
        <span className="flicker">{'>'} ANALYZING&nbsp;STYLE</span>
        <span className="blink">_</span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <div style={{
          fontFamily: 'VT323, monospace',
          fontSize: 110, lineHeight: 1, color: COLORS.accent,
          letterSpacing: -2,
          textShadow: '0 0 18px rgba(230,57,137,0.4)',
        }}>
          {pct}<span style={{ fontSize: 56, opacity: 0.7 }}>%</span>
        </div>
        <div style={{
          marginTop: 6,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: 2,
          color: COLORS.muted,
        }}>
          SCANNING&nbsp;{String(scanIdx + 1).padStart(2,'0')}&nbsp;/&nbsp;15
        </div>
      </div>

      <div style={{
        marginTop: 26,
        display: 'flex', gap: 8, justifyContent: 'center',
      }}>
        {safeSlots.map((s, i) => (
          <div key={i} style={{
            width: 72, aspectRatio: '1', borderRadius: 8,
            border: `1px solid ${COLORS.accent}`,
            position: 'relative', overflow: 'hidden',
          }}>
            {s && s.kind === 'file' ? (
              <img src={s.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <FakePhoto seed={i} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, transparent, rgba(230,57,137,0.4))`,
              opacity: 0.4,
            }} />
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: `${(progress * 100) % 100}%`,
              height: 2,
              background: COLORS.accent,
              boxShadow: `0 0 12px ${COLORS.accent}`,
            }} />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 28,
        padding: '14px 14px',
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 2,
          color: COLORS.muted, marginBottom: 10,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>STYLE.AXES.15</span>
          <span style={{ color: COLORS.accent }}>{String(scanIdx + 1).padStart(2,'0')} ACTIVE</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}>
          {STYLES_15.map((s, i) => {
            const done = i < scanIdx;
            const active = i === scanIdx;
            return (
              <div key={s} style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: 0.4,
                padding: '6px 8px',
                background: active ? 'rgba(230,57,137,0.16)' : done ? 'rgba(230,57,137,0.05)' : 'transparent',
                border: `1px solid ${active ? COLORS.accent : done ? 'rgba(230,57,137,0.3)' : COLORS.line}`,
                color: active ? COLORS.accent : done ? 'rgba(230,57,137,0.8)' : COLORS.muted,
                display: 'flex', alignItems: 'center', gap: 6,
                position: 'relative',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontFamily: 'Pretendard, sans-serif' }}>{s}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9 }}>
                  {active ? <span className="blink">▮</span> : done ? '✓' : '·'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{
          height: 10,
          border: `1px solid ${COLORS.accent}`,
          position: 'relative',
          background: 'rgba(230,57,137,0.06)',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: COLORS.accent,
            boxShadow: '0 0 12px rgba(230,57,137,0.5)',
            transition: 'width 0.1s linear',
          }} />
        </div>
      </div>

      <div style={{
        marginTop: 18,
        height: 96,
        overflow: 'hidden',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, letterSpacing: 0.3,
        color: COLORS.muted,
        lineHeight: 1.7,
      }}>
        {logs.slice(-6).map((l, i, arr) => (
          <div key={l + i} style={{
            opacity: 0.4 + (i / arr.length) * 0.6,
          }}>{l}</div>
        ))}
      </div>
    </div>
  );
}
