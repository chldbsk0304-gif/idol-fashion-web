'use client';

// Result page — the SHARE-WORTHY money card. Verbatim port; data injected via
// props (matches, userDistribution) instead of the prototype's globals.

import React from 'react';
import { COLORS, CTA, IdolPortraitOrPhoto, proxiedImage } from './ui';

export default function ResultScreen({
  matches,
  userDistribution,
  onRetry,
  onShare,
  primaryIdx,
  setPrimaryIdx,
}) {
  const all = matches;
  const primary = all[primaryIdx];
  const others = all.filter((_, i) => i !== primaryIdx);

  const userDist = userDistribution;
  const idolDist = primary.distribution;

  // Distribution table: drop rows where BOTH sides are 0 (visual noise), sort
  // by user value desc then idol value desc, but always keep at least 3 rows so
  // the comparison still reads as a comparison.
  const distKeys = React.useMemo(() => {
    const union = Array.from(new Set([...Object.keys(userDist), ...Object.keys(idolDist)]));
    const scored = union.map((k) => ({
      k,
      u: userDist[k] || 0,
      i: idolDist[k] || 0,
    }));
    scored.sort((a, b) => (b.u - a.u) || (b.i - a.i));
    const nonZero = scored.filter((r) => r.u > 0 || r.i > 0);
    const result = nonZero.length >= 3 ? nonZero : scored.slice(0, 3);
    return result.map((r) => r.k);
  }, [userDist, idolDist]);

  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    setStep(0);
    const ids = [];
    [120, 320, 560, 820, 1100, 1350].forEach((d, i) => {
      ids.push(setTimeout(() => setStep(i + 1), d));
    });
    return () => ids.forEach(clearTimeout);
  }, [primaryIdx]);

  return (
    <div style={{
      background: COLORS.bg, color: COLORS.text,
      minHeight: '100%',
      paddingTop: 24, paddingBottom: 120,
      position: 'relative',
    }}>
      <div style={{
        padding: '14px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, letterSpacing: 1.6, color: COLORS.accent,
      }}>
        <span><span style={{ opacity: 0.6 }}>+ </span>RESULT.OUT</span>
        <button onClick={onRetry} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: COLORS.muted, fontFamily: 'inherit', fontSize: 11, letterSpacing: 1.6,
          padding: 0,
        }}>↻ RETRY</button>
      </div>

      <div id="share-card" style={{
        margin: '14px 20px 0',
        background: '#FFFFFF',
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          padding: '12px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: `1px solid ${COLORS.line}`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 2, color: COLORS.muted,
        }}>
          <span><span style={{ color: COLORS.accent }}>◆</span> FITMATCH · 2026</span>
          <span>ID&nbsp;#0A9F2C</span>
        </div>

        <div style={{ position: 'relative' }}>
          <IdolPortraitOrPhoto
            seed={primary.seed}
            imageUrl={primary.imageUrl}
            // Hide the corner label when a real photo is rendered — the photo
            // already carries the visual information and the label overlapped
            // with the name pinned to the bottom-left.
            label={primary.imageUrl ? null : `${primary.primary}.PRIMARY`}
            ratio="3 / 4"
          />
          {step >= 1 && (
            <div className="rise" style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(14,17,23,0.78)',
              border: `1px solid ${COLORS.accent}`,
              padding: '8px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              backdropFilter: 'blur(6px)',
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: COLORS.muted }}>MATCH</div>
              <div style={{ fontSize: 26, color: COLORS.accent, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                {Math.round(primary.score * 100)}<span style={{ fontSize: 16, opacity: 0.7 }}>%</span>
              </div>
            </div>
          )}

          {step >= 2 && (
            <div className="rise" style={{
              position: 'absolute', left: 16, bottom: 16, right: 16,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, letterSpacing: 2,
                  lineHeight: 1.4,
                  color: COLORS.accent,
                  opacity: 0.85,
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}>{primary.group}</div>
                <div style={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 34, fontWeight: 800,
                  letterSpacing: -0.5,
                  lineHeight: 1.15,
                  color: '#fff',
                  textShadow: '0 2px 16px rgba(0,0,0,0.5)',
                  marginTop: 6,
                }}>
                  {primary.nameKr}
                  {primary.name && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: COLORS.accent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
                      /{primary.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {step >= 3 && (
          <div className="rise" style={{
            padding: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12,
            borderBottom: `1px solid ${COLORS.line}`,
          }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, letterSpacing: 1.6, color: COLORS.muted,
                lineHeight: 1.4,
              }}>PRIMARY&nbsp;STYLE</div>
              <div style={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 18, fontWeight: 700, marginTop: 4,
                lineHeight: 1.2,
                color: COLORS.text,
              }}>{primary.primary}</div>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, letterSpacing: 1.5,
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}`,
              padding: '6px 10px',
              background: 'rgba(230,57,137,0.05)',
            }}>
              YOU ≈ {primary.nameKr}
            </div>
          </div>
        )}

        {step >= 4 && (
          <div className="rise" style={{ padding: '16px 16px 18px' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, letterSpacing: 2, color: COLORS.muted,
              marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>STYLE.DISTRIBUTION</span>
              <span style={{ fontSize: 8, opacity: 0.7 }}>UNIT&nbsp;%</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr 1fr',
              gap: '6px 10px',
              alignItems: 'center',
            }}>
              <div></div>
              <Header text="YOU" />
              <Header text={(primary.nameKr || primary.name || '').toUpperCase()} accent />

              {distKeys.map((k) => (
                <DistRow key={k}
                  label={k}
                  you={userDist[k] || 0}
                  idol={idolDist[k] || 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {step >= 5 && Array.isArray(primary.items) && primary.items.length > 0 && (
        <ProductCarousel idolName={primary.nameKr} items={primary.items} />
      )}

      {step >= 5 && others.length > 0 && (
        <div className="rise" style={{ padding: '22px 20px 0' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: 2, color: COLORS.muted,
            marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1, height: 1, background: COLORS.line }} />
            <span>OTHER&nbsp;MATCHES</span>
            <span style={{ flex: 1, height: 1, background: COLORS.line }} />
          </div>
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {others.map((m) => {
              const realIdx = all.indexOf(m);
              return (
                <button key={m.name || m.nameKr} onClick={() => setPrimaryIdx(realIdx)} style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: COLORS.text,
                  fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6,
                  width: 96,
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    overflow: 'hidden',
                    border: `1px solid ${COLORS.line}`,
                  }}>
                    <IdolPortraitOrPhoto seed={m.seed} imageUrl={m.imageUrl} ratio="1 / 1" />
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 8, letterSpacing: 1.4, color: COLORS.muted,
                    lineHeight: 1.2,
                  }}>{m.group}</div>
                  <div style={{
                    fontWeight: 700, fontSize: 13, color: COLORS.text,
                    marginTop: -2,
                  }}>{m.nameKr}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11, color: COLORS.accent, fontWeight: 600,
                    marginTop: -2,
                  }}>{Math.round(m.score * 100)}%</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        position: 'sticky', bottom: 0,
        padding: '14px 20px 30px',
        background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, rgba(255,255,255,0))',
      }}>
        <div style={{
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: 2, color: COLORS.accent,
          marginBottom: 12,
        }}>
          <span className="blink">▮</span> SHARE TO UNLOCK NEXT
        </div>
        <CTA onClick={onShare}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V9M7 1L4 4M7 1L10 4M1 9V12C1 12.6 1.4 13 2 13H12C12.6 13 13 12.6 13 12V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          결과 공유하기
        </CTA>
      </div>
    </div>
  );
}

function ProductCarousel({ idolName, items }) {
  return (
    <div className="rise" style={{ padding: '22px 0 0' }}>
      <div style={{
        padding: '0 20px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, letterSpacing: 2, color: COLORS.accent,
        marginBottom: 12,
      }}>
        <span style={{ opacity: 0.6 }}>+ </span>
        PRODUCTS · {idolName}이 착용한 아이템
        <span style={{ opacity: 0.6 }}> +</span>
      </div>
      {/* Scroll snap horizontal carousel — peeks the next card so users see
          it's swipable. No JS dependency. alignItems:stretch makes every card
          the same height regardless of how many lines its product name uses. */}
      <div
        className="scroll"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '4px 20px 14px',
          WebkitOverflowScrolling: 'touch',
          alignItems: 'stretch',
        }}
      >
        {items.map((it, i) => (
          <ProductCard key={i} item={it} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ item }) {
  const [broken, setBroken] = React.useState(false);

  // Container styles apply to BOTH the `<a>` and `<div>` outer wrappers so
  // wrapping in an anchor doesn't change layout. Without this, `<a>` defaults
  // to inline and the inner card lost its width → aspect-ratio collapsed and
  // every card came out a different height.
  const outerStyle = {
    flex: '0 0 45%',
    width: '45%',
    minWidth: 144,
    maxWidth: 240,
    scrollSnapAlign: 'start',
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    color: COLORS.text,
    textDecoration: 'none',
  };

  const inner = (
    <>
      <div style={{
        width: '100%',
        aspectRatio: '1 / 1',
        background: '#0F1115',
        position: 'relative',
        overflow: 'hidden',
        flex: '0 0 auto',
      }}>
        {item.imageUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImage(item.imageUrl)}
            alt={item.productName || ''}
            crossOrigin="anonymous"
            loading="lazy"
            onError={() => setBroken(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, letterSpacing: 1.4,
            color: 'rgba(230,57,137,0.5)',
            background: 'repeating-linear-gradient(45deg, transparent 0 8px, rgba(230,57,137,0.05) 8px 9px)',
          }}>IMG.404</div>
        )}
      </div>
      <div style={{
        padding: '10px 12px 12px',
        minHeight: 72, // text area reserves ~4.5em so 1-line and 2-line cards stay the same total height
        display: 'flex', flexDirection: 'column',
        flex: '1 1 auto',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 1.2,
          color: COLORS.accent,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>{item.brand || '—'}</div>
        <div style={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 12, fontWeight: 600,
          color: COLORS.text,
          marginTop: 4,
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          // Reserve two lines of vertical space even when the product name fits
          // on one line, so adjacent cards align.
          minHeight: 'calc(1.35em * 2)',
        }}>{item.productName || '제품명 미상'}</div>
      </div>
    </>
  );

  if (item.postUrl) {
    return (
      <a href={item.postUrl} target="_blank" rel="noopener noreferrer" style={outerStyle}>
        {inner}
      </a>
    );
  }
  return <div style={outerStyle}>{inner}</div>;
}

function Header({ text, accent }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 9, letterSpacing: 1.4,
      color: accent ? COLORS.accent : COLORS.muted,
      textAlign: 'left',
    }}>{text}</div>
  );
}

function DistRow({ label, you, idol }) {
  return (
    <>
      <div style={{
        fontFamily: 'Pretendard, sans-serif',
        fontSize: 12, fontWeight: 500, color: COLORS.text,
        whiteSpace: 'nowrap',
      }}>{label}</div>
      <Cell value={you} muted />
      <Cell value={idol} />
    </>
  );
}

function Cell({ value, muted }) {
  const total = 10;
  const filled = Math.round(value * total);
  const color = muted ? '#0E1117' : COLORS.accent;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
    }}>
      <span style={{
        letterSpacing: 0.5,
        color,
        opacity: muted ? 0.65 : 1,
      }}>
        {'▮'.repeat(filled)}<span style={{ opacity: 0.18 }}>{'▯'.repeat(total - filled)}</span>
      </span>
      <span style={{
        minWidth: 26, textAlign: 'right',
        color: muted ? COLORS.muted : COLORS.accent,
      }}>
        {Math.round(value * 100)}
      </span>
    </div>
  );
}
