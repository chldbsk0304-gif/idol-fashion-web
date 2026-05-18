'use client';

// Shared UI primitives for the terminal/mint design system. Originally a single
// global script in the handoff prototype; converted to a module for Next.js.

import React from 'react';

export const COLORS = {
  bg: '#FFFFFF',
  surface: '#F7F8FA',
  surface2: '#F0F2F5',
  line: '#E5E7EB',
  accent: '#E63989',
  accentDim: '#2EAF74',
  muted: '#6B7280',
  text: '#0E1117',
  warn: '#FFB05E',
};

export const STYLES_15 = [
  '캐주얼', '스트릿', '미니멀', '걸리시', '스포티',
  '로맨틱', '클래식', '시크', '워크웨어', '시티보이',
  '고프코어', '레트로', '프레피', '리조트', '에스닉',
];

// X CDN images aren't CORS-friendly, so we send them through /api/img which
// adds CORS headers. Anything that's already same-origin or a data URL is
// returned as-is.
export function proxiedImage(url) {
  if (!url) return url;
  if (typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('/api/img')) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'pbs.twimg.com') {
      return `/api/img?u=${encodeURIComponent(url)}`;
    }
  } catch {
    /* not a parseable absolute URL — leave untouched */
  }
  return url;
}

// ──────────────────────────────────────────────────────────────────────────
// Components — copied verbatim from the handoff bundle. Visual fidelity is
// the contract: do not modify styling here without re-syncing with design.
// ──────────────────────────────────────────────────────────────────────────

export function MonoTag({ children, color, style }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      letterSpacing: 1.4,
      color: color || COLORS.accent,
      textTransform: 'uppercase',
      ...style,
    }}>
      <span style={{ opacity: 0.55, marginRight: 6 }}>+</span>
      {children}
      <span style={{ opacity: 0.55, marginLeft: 6 }}>+</span>
    </span>
  );
}

export function PixelCross({ size = 10, color, style }) {
  const c = color || COLORS.accent;
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={style} aria-hidden>
      <rect x="4" y="0" width="2" height="10" fill={c} />
      <rect x="0" y="4" width="10" height="2" fill={c} />
    </svg>
  );
}

export function BlockBar({ value = 0, total = 16, color, dim, width = '100%' }) {
  const filled = Math.round(value * total);
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      letterSpacing: 1,
      color: color || COLORS.accent,
      display: 'inline-block',
      width,
      whiteSpace: 'nowrap',
    }}>
      <span>{'▮'.repeat(filled)}</span>
      <span style={{ color: dim || 'rgba(230,57,137,0.18)' }}>{'▯'.repeat(total - filled)}</span>
    </span>
  );
}

export function StepBar({ filled = 0, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled;
        return (
          <div key={i} style={{
            flex: 1,
            height: 8,
            background: on ? COLORS.accent : 'transparent',
            border: `1px solid ${on ? COLORS.accent : 'rgba(230,57,137,0.25)'}`,
            position: 'relative',
            boxShadow: on ? '0 0 6px rgba(230,57,137,0.5)' : 'none',
          }}>
            {!on && (
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                width: 6, height: 6, transform: 'translate(-50%,-50%) rotate(45deg)',
                background: 'rgba(230,57,137,0.25)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CTA({ children, onClick, disabled, variant = 'primary', style }) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: 56,
        borderRadius: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        background: disabled
          ? 'transparent'
          : isPrimary ? COLORS.accent : 'transparent',
        color: disabled ? 'rgba(139,148,158,0.6)' : isPrimary ? '#FFFFFF' : COLORS.accent,
        boxShadow: !disabled && isPrimary
          ? '0 0 24px rgba(230,57,137,0.32), inset 0 0 0 1px rgba(255,255,255,0.18)'
          : 'none',
        border: disabled
          ? '1px dashed rgba(139,148,158,0.35)'
          : isPrimary ? 'none' : `1px solid ${COLORS.accent}`,
        transition: 'transform 0.1s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.985)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = '')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        {children}
      </span>
    </button>
  );
}

export function FakePhoto({ seed = 1, label, height = '100%', width = '100%' }) {
  const palettes = [
    ['#3a4a3f', '#4d6755', '#7ea88b'],
    ['#3d3a4a', '#544d67', '#8b7ea8'],
    ['#4a443a', '#67604d', '#a89a7e'],
    ['#3a474a', '#4d6567', '#7ea3a8'],
  ];
  const [a, b, c] = palettes[seed % palettes.length];
  return (
    <div style={{
      width, height,
      background: `linear-gradient(135deg, ${a}, ${b})`,
      position: 'relative', overflow: 'hidden',
      borderRadius: 'inherit',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.06) 14px 15px)`,
      }} />
      <div style={{
        position: 'absolute',
        left: '50%', top: '54%', transform: 'translate(-50%,-50%)',
        width: '50%', aspectRatio: '0.55',
        background: `radial-gradient(ellipse at 50% 30%, ${c}, transparent 70%)`,
        opacity: 0.7,
        filter: 'blur(8px)',
      }} />
      {label && (
        <div style={{
          position: 'absolute', left: 8, bottom: 8,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.6)',
        }}>{label}</div>
      )}
    </div>
  );
}

// When we have a real OOTD photo for the idol, render it on top of the
// gradient portrait so the pink glow remains as a frame and the photo is the
// hero. Falls back to the bare portrait when imageUrl is missing.
export function IdolPortraitOrPhoto({ seed = 0, imageUrl, label, style, ratio = '4 / 5' }) {
  if (!imageUrl) {
    return <IdolPortrait seed={seed} label={label} style={style} ratio={ratio} />;
  }
  const palettes = [
    { a: '#2a1a25', b: '#FF6FA8', c: '#FFE6F0' },
    { a: '#1a1f2a', b: '#8AB4FF', c: '#E0EAFF' },
    { a: '#2a241a', b: '#FFD66F', c: '#FFF3D6' },
    { a: '#1a2a25', b: '#A0F0C8', c: '#E6EDF3' },
  ];
  const p = palettes[seed % palettes.length];
  return (
    <div style={{
      width: '100%', aspectRatio: ratio,
      background: `linear-gradient(160deg, ${p.a} 0%, #0d1217 100%)`,
      position: 'relative', overflow: 'hidden',
      borderRadius: 'inherit',
      ...style,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxiedImage(imageUrl)}
        alt=""
        loading="lazy"
        crossOrigin="anonymous"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      {/* Mint glow framing, kept from the portrait fallback so the card still
          reads as the same component. */}
      <div style={{
        position: 'absolute', inset: 0,
        boxShadow: `inset 0 0 80px ${p.b}40, inset 0 -120px 80px -40px rgba(11,16,20,0.55)`,
        pointerEvents: 'none',
      }} />
      <PixelCross style={{ position: 'absolute', top: 8, left: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', top: 8, right: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', bottom: 8, left: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', bottom: 8, right: 8, color: p.b }} />
      {label && (
        <div style={{
          position: 'absolute', left: 12, bottom: 12,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
    </div>
  );
}

export function IdolPortrait({ seed = 0, label, style, ratio = '4 / 5' }) {
  const palettes = [
    { a: '#2a1a25', b: '#FF6FA8', c: '#FFE6F0' },
    { a: '#1a1f2a', b: '#8AB4FF', c: '#E0EAFF' },
    { a: '#2a241a', b: '#FFD66F', c: '#FFF3D6' },
    { a: '#1a2a25', b: '#A0F0C8', c: '#E6EDF3' },
  ];
  const p = palettes[seed % palettes.length];
  return (
    <div style={{
      width: '100%', aspectRatio: ratio,
      background: `linear-gradient(160deg, ${p.a} 0%, #0d1217 100%)`,
      position: 'relative', overflow: 'hidden',
      borderRadius: 'inherit',
      ...style,
    }}>
      <div style={{
        position: 'absolute', left: '50%', top: '58%', transform: 'translate(-50%,-50%)',
        width: '64%', aspectRatio: '0.6',
        background: `radial-gradient(ellipse at 50% 35%, ${p.b}30, transparent 75%)`,
        filter: 'blur(6px)',
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: '32%', transform: 'translate(-50%,-50%)',
        width: '32%', aspectRatio: '1',
        background: `radial-gradient(circle, ${p.c}aa, ${p.b}66 50%, transparent 75%)`,
        filter: 'blur(4px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(0deg, transparent 0 22px, rgba(255,255,255,0.025) 22px 23px)`,
      }} />
      <PixelCross style={{ position: 'absolute', top: 8, left: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', top: 8, right: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', bottom: 8, left: 8, color: p.b }} />
      <PixelCross style={{ position: 'absolute', bottom: 8, right: 8, color: p.b }} />
      {label && (
        <div style={{
          position: 'absolute', left: 12, bottom: 12,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
    </div>
  );
}

export function TerminalTopbar({ step, totalSteps = 1, count, total }) {
  return (
    <div style={{ padding: '14px 20px 0', position: 'relative' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, letterSpacing: 1.6, color: COLORS.accent,
        textTransform: 'uppercase',
      }}>
        <span>
          <span style={{ opacity: 0.55 }}>+ </span>
          STEP&nbsp;&nbsp;0{step}&nbsp;&nbsp;/&nbsp;&nbsp;0{totalSteps}
        </span>
        <span style={{ color: count >= total ? COLORS.accent : COLORS.muted }}>
          {count} / {total}
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        <StepBar filled={count} total={total} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Placeholder data — kept so the prototype renders before the live data
// pipeline (Phase 2/3) wires real /api/analyze + /api/match responses in.
// ──────────────────────────────────────────────────────────────────────────

export const PLACEHOLDER_MATCHES = [
  {
    name: 'AERIN', nameKr: '에린', group: 'NOVALINE',
    score: 0.94, primary: '시크', seed: 0,
    distribution: { '시크': 0.43, '미니멀': 0.26, '캐주얼': 0.17, '스트릿': 0.08, '워크웨어': 0.06 },
  },
  {
    name: 'HARU', nameKr: '하루', group: 'PRISMA:9',
    score: 0.89, primary: '미니멀', seed: 2,
    distribution: { '미니멀': 0.38, '시크': 0.22, '클래식': 0.18, '캐주얼': 0.14, '워크웨어': 0.08 },
  },
  {
    name: 'SION', nameKr: '시온', group: 'VANTA',
    score: 0.86, primary: '스트릿', seed: 3,
    distribution: { '스트릿': 0.34, '시크': 0.24, '고프코어': 0.18, '캐주얼': 0.16, '스포티': 0.08 },
  },
];

export const PLACEHOLDER_USER_DISTRIBUTION = {
  '시크': 0.45, '미니멀': 0.30, '캐주얼': 0.15, '스트릿': 0.06, '워크웨어': 0.04,
};
