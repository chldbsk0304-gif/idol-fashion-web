'use client';

// Result page — the SHARE-WORTHY money card. Verbatim port; data injected via
// props (matches, userDistribution) instead of the prototype's globals.

import React from 'react';
import { COLORS, CTA, IdolPortrait } from './ui';

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
  const keys = Array.from(new Set([...Object.keys(userDist), ...Object.keys(idolDist)]));

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
          <IdolPortrait seed={primary.seed} label={`${primary.primary}.PRIMARY`} ratio="3 / 4" />
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
                  color: COLORS.accent,
                  opacity: 0.85,
                }}>{primary.group}</div>
                <div style={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 34, fontWeight: 800,
                  letterSpacing: -0.5,
                  lineHeight: 1.05,
                  color: '#fff',
                  textShadow: '0 2px 16px rgba(0,0,0,0.5)',
                  marginTop: 4,
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
            padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${COLORS.line}`,
          }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, letterSpacing: 2, color: COLORS.muted,
              }}>PRIMARY&nbsp;STYLE</div>
              <div style={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 18, fontWeight: 700, marginTop: 2,
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

              {keys.map((k) => (
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

      {step >= 5 && others.length > 0 && (
        <div className="rise" style={{ padding: '22px 20px 0' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: 2, color: COLORS.muted,
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1, height: 1, background: COLORS.line }} />
            <span>NEXT&nbsp;MATCHES</span>
            <span style={{ flex: 1, height: 1, background: COLORS.line }} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            {others.map((m) => {
              const realIdx = all.indexOf(m);
              return (
                <button key={m.name || m.nameKr} onClick={() => setPrimaryIdx(realIdx)} style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.line}`,
                  padding: 0,
                  borderRadius: 12,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textAlign: 'left',
                  color: COLORS.text,
                  fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <IdolPortrait seed={m.seed} ratio="1 / 1" />
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, letterSpacing: 1.6,
                      color: COLORS.muted,
                    }}>{m.group}</div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      marginTop: 2,
                    }}>
                      <span style={{
                        fontWeight: 700, fontSize: 15, color: COLORS.text,
                      }}>{m.nameKr}</span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12, color: COLORS.accent, fontWeight: 600,
                      }}>{Math.round(m.score * 100)}%</span>
                    </div>
                  </div>
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
