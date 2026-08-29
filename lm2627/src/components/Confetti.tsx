import { useEffect, useState } from 'react';

/**
 * Celebration for a goal by the favourite team (kid mode). Pure CSS pieces, no
 * canvas: cheap enough for an old tablet.
 */
export function Confetti({ fire, onDone }: { fire: number; onDone?: () => void }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; color: string; rotate: number }>>([]);

  useEffect(() => {
    if (!fire) return;
    const colors = ['#38bdf8', '#f472b6', '#facc15', '#4ade80', '#a78bfa'];
    setPieces(
      Array.from({ length: 40 }, (_, i) => ({
        id: fire * 1000 + i,
        left: Math.random() * 100,
        delay: Math.random() * 250,
        color: colors[i % colors.length],
        rotate: Math.random() * 360,
      })),
    );
    const timer = setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, 2200);
    return () => clearTimeout(timer);
  }, [fire, onDone]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-5vh',
            left: `${p.left}%`,
            width: 10,
            height: 14,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${1400 + p.delay}ms linear ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}

/** Short celebratory blip via WebAudio — no audio files to ship. */
export function playGoalSound(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.3);
    });
    setTimeout(() => void ctx.close(), 900);
  } catch {
    // Sound is a nice-to-have; never let it break score entry.
  }
}
