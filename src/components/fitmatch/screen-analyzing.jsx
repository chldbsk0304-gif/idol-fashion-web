'use client';

// Analysis loading screen — verbatim port. Timer animation is kept; real
// /api/analyze + /api/match calls land in Phase 2 and replace `onDone` timing.

import React from 'react';
import { COLORS, STYLES_15, PixelCross, FakePhoto } from './ui';

export default function AnalyzingScreen({ slots, onDone, durationMs = 6500 }) {
  const [progress, setProgress] = React.useState(0);
  const [scanIdx, setScanIdx] = React.useState(0);
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setProgress(t);
      const idx = Math.min(STYLES_15.length - 1, Math.floor(t * STYLES_15.length));
      setScanIdx(idx);
      if (t >= 1) {
        clearInterval(tick);
        setTimeout(onDone, 500);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [durationMs, onDone]);

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
