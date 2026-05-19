'use client';

// Upload screen — single OOTD slot. 1:1 visual port from the handoff bundle.
// Behavior changes for the live app land in Phase 2 (real file → /api/analyze).

import React from 'react';
import { COLORS, StepBar, PixelCross, CTA, FakePhoto } from './ui';

export default function UploadScreen({ slots, setSlots, onContinue }) {
  const filled = slots[0] ? 1 : 0;
  const fileRef = React.useRef(null);

  const pick = () => fileRef.current && fileRef.current.click();

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const next = slots.slice();
    next[0] = { kind: 'file', url, file, seed: 0 };
    setSlots(next);
    e.target.value = '';
  };

  const remove = (e) => {
    e.stopPropagation();
    const next = slots.slice();
    if (next[0]?.kind === 'file' && next[0].url) URL.revokeObjectURL(next[0].url);
    next[0] = null;
    setSlots(next);
  };

  const slot = slots[0];
  const loading = slot && slot.kind === 'loading';
  const has = !!slot && !loading;

  return (
    <div style={{
      background: COLORS.bg, color: COLORS.text,
      minHeight: '100%',
      paddingTop: 24,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, letterSpacing: 1.6, color: COLORS.accent,
          textTransform: 'uppercase',
        }}>
          <span>
            <span style={{ opacity: 0.55 }}>+ </span>
            STEP&nbsp;&nbsp;01&nbsp;&nbsp;/&nbsp;&nbsp;01
          </span>
          <span style={{ color: filled >= 1 ? COLORS.accent : COLORS.muted }}>
            {filled} / 1
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <StepBar filled={filled} total={1} />
        </div>
      </div>

      <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          border: `1px solid ${COLORS.accent}`,
          padding: '6px 14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: 2,
          color: COLORS.accent,
          background: 'rgba(230,57,137,0.06)',
        }}>
          <span style={{ opacity: 0.6 }}>+ </span>OOTD&nbsp;UPLOAD<span style={{ opacity: 0.6 }}> +</span>
        </div>
        <PixelCross size={14} color={COLORS.muted} style={{ opacity: 0.6 }} />
      </div>

      <div style={{ padding: '22px 20px 0', position: 'relative' }}>
        <PixelCross size={14} style={{ position: 'absolute', top: 18, left: 8 }} />
        <div style={{
          fontFamily: 'Pretendard, sans-serif',
          fontWeight: 700, fontSize: 28, lineHeight: 1.32,
          letterSpacing: -0.4,
        }}>
          <div>내 패션 취향을</div>
          <div>
            <span style={{ color: COLORS.accent }}>아이돌로 표현</span>하면<span style={{ color: COLORS.accent }}>?</span>
          </div>
        </div>
        <div style={{
          marginTop: 14,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, letterSpacing: 0.4,
          color: COLORS.muted,
          lineHeight: 1.55,
        }}>
          {'>'} 내 OOTD 사진을 업로드하고,<br/>
          &nbsp;&nbsp;&nbsp;나와 가장 취향이 비슷한 아이돌 스타일을 확인해보세요
        </div>
      </div>

      {/* Slot wrapper:
          - flex:1 + alignItems:center keeps the slot vertically centered in
            whatever space the screen has left after the headline + footer.
          - The slot itself owns its aspect ratio and width cap. */}
      <div style={{
        padding: '20px 20px 0',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <SingleSlot
          slot={slot}
          loading={loading}
          has={has}
          onClick={has || loading ? null : pick}
          onRemove={remove}
        />
      </div>

      <div style={{
        padding: '12px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, letterSpacing: 1.4, color: COLORS.muted,
        flexShrink: 0,
      }}>
        <span>
          <span className="blink" style={{ color: COLORS.accent }}>▮</span>
          &nbsp; SLOT.{filled} / 1
        </span>
        <span style={{ opacity: 0.7 }}>JPG · PNG · ≤ 8MB</span>
      </div>

      <div style={{
        padding: '14px 20px 30px',
        background: '#FFFFFF',
        flexShrink: 0,
      }}>
        <div style={{
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: 2, color: COLORS.muted,
          marginBottom: 12,
          minHeight: 14,
        }}>
          {filled >= 1 ? (
            <span style={{ color: COLORS.accent }}>· READY TO ANALYZE ·</span>
          ) : (
            <span>· 1 MORE TO UNLOCK ·</span>
          )}
        </div>
        <CTA disabled={filled < 1} onClick={onContinue}>
          평가 받기
          <span style={{ opacity: 0.7 }}>▶</span>
        </CTA>
        <div style={{
          marginTop: 12,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, letterSpacing: 1.2, color: COLORS.muted,
          opacity: 0.7,
        }}>
          업로드한 사진은 분석 직후 즉시 폐기됩니다
        </div>
      </div>
    </div>
  );
}

function SingleSlot({ slot, loading, has, onClick, onRemove }) {
  return (
    <div
      onClick={onClick || undefined}
      style={{
        // OOTD is a full-body photo, so the slot is 3:4 (portrait). Width
        // fills its column up to 400px so the slot looks right on phones,
        // tablets, and desktop without snapping at breakpoints.
        width: '100%',
        maxWidth: 400,
        aspectRatio: '3 / 4',
        background: has ? 'transparent' : 'rgba(230,57,137,0.04)',
        border: `1.5px dashed ${has ? 'rgba(230,57,137,0.6)' : 'rgba(230,57,137,0.4)'}`,
        borderRadius: 16,
        cursor: has || loading ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {!has && !loading && (
        <div style={{
          position: 'absolute', inset: 10,
          border: '1px dashed rgba(230,57,137,0.3)',
          borderRadius: 10,
          pointerEvents: 'none',
        }} />
      )}

      {!has && !loading && (
        <>
          <PixelCross size={12} style={{ position: 'absolute', top: 14, left: 14 }} />
          <PixelCross size={12} style={{ position: 'absolute', top: 14, right: 14 }} />
          <PixelCross size={12} style={{ position: 'absolute', bottom: 14, left: 14 }} />
          <PixelCross size={12} style={{ position: 'absolute', bottom: 14, right: 14 }} />
        </>
      )}

      {!has && !loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 14,
        }}>
          <div style={{ width: 48, height: 48, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '50%', top: 0, transform: 'translateX(-50%)',
              width: 6, height: 48,
              background: COLORS.accent,
              boxShadow: '0 0 14px rgba(230,57,137,0.6)',
            }} />
            <div style={{
              position: 'absolute',
              top: '50%', left: 0, transform: 'translateY(-50%)',
              height: 6, width: 48,
              background: COLORS.accent,
              boxShadow: '0 0 14px rgba(230,57,137,0.6)',
            }} />
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, letterSpacing: 1.6,
            color: 'rgba(230,57,137,0.7)',
          }}>01</div>
          <div style={{
            position: 'absolute', bottom: 22, left: 0, right: 0,
            textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: 1.6,
            color: COLORS.muted,
          }}>
            <span className="blink">_</span>&nbsp;&nbsp;TAP TO UPLOAD&nbsp;&nbsp;<span className="blink">_</span>
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 14,
          background: 'rgba(230,57,137,0.06)',
        }}>
          <div style={{
            width: 36, height: 36,
            border: `2px solid rgba(230,57,137,0.2)`,
            borderTopColor: COLORS.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, letterSpacing: 1.6,
            color: COLORS.accent,
          }}>UPLOADING…</div>
        </div>
      )}

      {has && (
        <>
          {slot.kind === 'file' ? (
            <img src={slot.url} alt="" style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
            }} />
          ) : (
            <FakePhoto seed={slot.seed} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            border: `1.5px solid ${COLORS.accent}`,
            borderRadius: 16,
            boxShadow: 'inset 0 0 36px rgba(230,57,137,0.12)',
            pointerEvents: 'none',
          }} />
          <PixelCross size={10} style={{ position: 'absolute', top: 10, left: 10 }} />
          <PixelCross size={10} style={{ position: 'absolute', bottom: 10, right: 10 }} />
          <button onClick={onRemove} style={{
            position: 'absolute', top: 12, right: 12,
            width: 30, height: 30, border: `1px solid ${COLORS.accent}`,
            background: 'rgba(14,17,23,0.85)',
            color: COLORS.accent,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16, cursor: 'pointer',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}>×</button>
          <div style={{
            position: 'absolute', left: 12, bottom: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, letterSpacing: 1.6,
            color: COLORS.accent,
            background: 'rgba(14,17,23,0.78)',
            padding: '4px 8px',
            border: `1px solid rgba(230,57,137,0.4)`,
            backdropFilter: 'blur(4px)',
          }}>OK · 01</div>
        </>
      )}
    </div>
  );
}
