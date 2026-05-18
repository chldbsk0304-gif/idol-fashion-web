'use client';

// Share modal — Phase 4 wiring.
//
// The visual card (9:16 preview) is unchanged from the prototype. The four
// targets gained real behavior:
//   STORY  — render preview to PNG (html2canvas) and use Web Share API w/ file
//            if the device supports it, else trigger download + nudge.
//   X      — open Twitter web intent with text + result URL.
//   TALK   — copy text + URL (Kakao SDK would need an app key; we punt to
//            clipboard so the user can paste into the KakaoTalk compose).
//   COPY   — copy result URL (or text if URL not minted yet).
//   이미지 저장 footer — same PNG render but always downloads.

import React from 'react';
import { COLORS, CTA, IdolPortraitOrPhoto, PixelCross } from './ui';

// Make sure every <img> inside the capture node has actually finished
// downloading. html2canvas will skip half-loaded images silently.
async function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          }),
    ),
  );
}

// Renders the on-screen 9:16 preview to a 1080px-wide PNG. We don't build a
// separate offscreen DOM — the visible card already holds the right aspect
// ratio, so we just scale the canvas resolution up.
async function renderCardToBlob(node) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* best-effort */ }
  }
  await waitForImages(node);

  const html2canvas = (await import('html2canvas')).default;
  const rect = node.getBoundingClientRect();
  const targetWidth = 1080; // Instagram story standard
  const scale = rect.width > 0 ? targetWidth / rect.width : 2;

  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 8000,
  });
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ShareScreen({ matches, primaryIdx, shareUrl, onClose }) {
  const primary = matches[primaryIdx];
  const [target, setTarget] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const previewRef = React.useRef(null);

  const phrase = `나는 ${primary.nameKr} (${primary.group})랑 ${Math.round(primary.score * 100)}% 닮은 스타일! · FITMATCH`;
  const linkPayload = shareUrl ? `${phrase}\n${shareUrl}` : phrase;

  const flashTarget = (key, ms = 1400) => {
    setTarget(key);
    setTimeout(() => setTarget((cur) => (cur === key ? null : cur)), ms);
  };

  const send = async (key) => {
    if (busy) return;
    setTarget(key);
    try {
      if (key === 'copy') {
        const text = shareUrl || phrase;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(() => {});
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      if (key === 'x') {
        const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(phrase)}${
          shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''
        }`;
        window.open(intent, '_blank', 'noopener');
        flashTarget(key);
        return;
      }
      if (key === 'talk') {
        // No Kakao SDK without an app key. Copy a ready-to-paste message.
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(linkPayload).catch(() => {});
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        flashTarget(key);
        return;
      }
      if (key === 'story' || key === 'download') {
        if (!previewRef.current) return;
        setBusy(true);
        const blob = await renderCardToBlob(previewRef.current);
        if (!blob) throw new Error('PNG 생성 실패');
        const file = new File([blob], 'fitmatch.png', { type: 'image/png' });
        const canShareFile =
          typeof navigator !== 'undefined' &&
          navigator.canShare &&
          navigator.canShare({ files: [file] });
        if (key === 'story' && canShareFile) {
          await navigator.share({
            title: 'FITMATCH',
            text: phrase,
            files: [file],
          });
        } else {
          triggerDownload(blob, 'fitmatch.png');
        }
        flashTarget(key);
        return;
      }
    } catch (err) {
      console.error('share failed', err);
      // user-cancelled share throws AbortError — ignore silently
      if (!(err && err.name === 'AbortError')) {
        alert(`공유 실패: ${err.message || err}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(247,248,250,0.92)',
      backdropFilter: 'blur(8px)',
      zIndex: 30,
      display: 'flex', flexDirection: 'column',
      paddingTop: 24,
      animation: 'rise 0.25s ease-out',
    }}>
      <div style={{
        padding: '14px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, letterSpacing: 1.6, color: COLORS.accent,
      }}>
        <span><span style={{ opacity: 0.6 }}>+ </span>SHARE.CARD</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: COLORS.text, fontSize: 20, padding: 0,
          fontFamily: 'inherit',
          width: 28, height: 28,
        }}>×</button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 30px 0',
      }}>
        <div ref={previewRef} style={{
          // Pin the height first; aspectRatio derives the width so the card
          // is always 9:16. Without this, width:100% on a wide viewport made
          // the card huge horizontally and maxHeight then cropped it,
          // breaking the ratio. min() also caps the height on tall phones.
          height: 'min(70vh, 560px)',
          aspectRatio: '9 / 16',
          width: 'auto',
          maxWidth: '100%',
          background: '#0B1014',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(230,57,137,0.08)',
        }}>
          <IdolPortraitOrPhoto seed={primary.seed} imageUrl={primary.imageUrl} ratio="9 / 16" />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(11,16,20,0.55) 0%, rgba(11,16,20,0) 30%, rgba(11,16,20,0) 50%, rgba(11,16,20,0.95) 100%)',
          }} />

          <div style={{
            position: 'absolute', left: 14, right: 14, top: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: 2,
            color: '#fff',
          }}>
            <span><span style={{ color: COLORS.accent }}>◆</span> FITMATCH</span>
            <span style={{ opacity: 0.7 }}>#0A9F2C</span>
          </div>

          <div style={{
            position: 'absolute', top: 38, right: 14,
            border: `1px solid ${COLORS.accent}`,
            background: 'rgba(14,17,23,0.6)',
            padding: '8px 12px',
            fontFamily: 'JetBrains Mono, monospace',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: COLORS.muted }}>MATCH</div>
            <div style={{ fontSize: 22, color: COLORS.accent, fontWeight: 700, lineHeight: 1 }}>
              {Math.round(primary.score * 100)}<span style={{ fontSize: 13, opacity: 0.7 }}>%</span>
            </div>
          </div>

          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 14,
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, letterSpacing: 2, color: COLORS.accent,
            }}>{primary.group}</div>
            <div style={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 28, fontWeight: 800, color: '#fff',
              letterSpacing: -0.5, lineHeight: 1.05,
              marginTop: 4,
            }}>
              {primary.nameKr}
              {primary.name && (
                <span style={{ marginLeft: 6, fontSize: 13, color: COLORS.accent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
                  /{primary.name}
                </span>
              )}
            </div>
            <div style={{
              marginTop: 10,
              padding: '8px 10px',
              border: `1px solid rgba(230,57,137,0.4)`,
              background: 'rgba(14,17,23,0.5)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, letterSpacing: 1.2,
              color: COLORS.accent,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>PRIMARY · {primary.primary.toUpperCase()}</span>
              <span style={{ color: COLORS.muted }}>YOU ≈ {primary.nameKr}</span>
            </div>
            <div style={{
              marginTop: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8, letterSpacing: 1.6,
              color: COLORS.muted,
              textAlign: 'center',
            }}>
              fitmatch.app · 너랑 닮은 아이돌 찾기
            </div>
          </div>

          <PixelCross style={{ position: 'absolute', top: 6, left: 6 }} />
          <PixelCross style={{ position: 'absolute', bottom: 6, right: 6 }} />
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 2, color: COLORS.muted,
          textAlign: 'center', marginBottom: 12,
        }}>
          {target && target !== 'copy'
            ? <span style={{ color: COLORS.accent }}>{`> OPENING ${target.toUpperCase()}…`}</span>
            : copied
              ? <span style={{ color: COLORS.accent }}>{'> LINK COPIED'}</span>
              : <span>{'> CHOOSE DESTINATION'}</span>}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        }}>
          <Target label="STORY" sub="Instagram" onClick={() => send('story')} active={target === 'story'} />
          <Target label="X" sub="post" onClick={() => send('x')} active={target === 'x'} />
          <Target label="TALK" sub="Kakao" onClick={() => send('talk')} active={target === 'talk'} />
          <Target label="COPY" sub="link" onClick={() => send('copy')} active={copied} />
        </div>
      </div>

      <div style={{ padding: '18px 20px 30px' }}>
        <CTA variant="ghost" onClick={() => send('download')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V10M7 10L3 6M7 10L11 6M1 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          이미지 저장
        </CTA>
      </div>
    </div>
  );
}

function Target({ label, sub, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(230,57,137,0.12)' : COLORS.surface,
      border: `1px solid ${active ? COLORS.accent : COLORS.line}`,
      borderRadius: 10,
      padding: '12px 6px 10px',
      cursor: 'pointer',
      color: COLORS.text,
      fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      transition: 'all 0.15s',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, letterSpacing: 1.4, fontWeight: 700,
        color: active ? COLORS.accent : COLORS.text,
      }}>{label}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 8, letterSpacing: 1.4,
        color: COLORS.muted,
      }}>{sub}</div>
    </button>
  );
}
