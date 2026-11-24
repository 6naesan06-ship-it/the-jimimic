import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/soundEngine';

interface KintoruControlOverlayProps {
  paused: boolean;
  chapterId: number;
  onComplete: (survived: boolean) => void;
}

interface ApproachingHand {
  id: number;
  angle: number; // Radians around screen center
  distance: number; // 1.0 = outer edge, 0.0 = center grab
  speed: number;
  wobblePhase: number;
  recoilFlash: number;
}

interface ClickBurst {
  id: number;
  xPct: number;
  yPct: number;
  age: number;
}

const SURVIVAL_SECONDS = 6.0;
const GRAB_THRESHOLD = 0.07;

function createInitialHands(chapterId: number): ApproachingHand[] {
  const count = chapterId >= 4 ? 6 : 5;
  const speedScale = chapterId === 4 ? 1.12 : chapterId === 3 ? 1.04 : 0.96;
  const hands: ApproachingHand[] = [];
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    hands.push({
      id: i + 1,
      angle: baseAngle,
      distance: 0.78 + (i % 3) * 0.14 + Math.random() * 0.1,
      speed: (0.37 + Math.random() * 0.13) * speedScale,
      wobblePhase: Math.random() * Math.PI * 2,
      recoilFlash: 0,
    });
  }
  return hands;
}

export const KintoruControlOverlay: React.FC<KintoruControlOverlayProps> = ({
  paused,
  chapterId,
  onComplete,
}) => {
  const [remaining, setRemaining] = useState<number>(SURVIVAL_SECONDS);
  const [hands, setHands] = useState<ApproachingHand[]>(() => createInitialHands(chapterId));
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const [banishedCount, setBanishedCount] = useState<number>(0);

  const handsRef = useRef<ApproachingHand[]>(hands);
  const remainingRef = useRef<number>(SURVIVAL_SECONDS);
  const burstsRef = useRef<ClickBurst[]>([]);
  const resolvedRef = useRef<boolean>(false);
  const nextBurstIdRef = useRef<number>(1);
  const pausedRef = useRef<boolean>(paused);
  pausedRef.current = paused;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (!pausedRef.current && !resolvedRef.current) {
        remainingRef.current = Math.max(0, remainingRef.current - dt);

        let grabbed = false;
        const nextHands = handsRef.current.map((h) => {
          const nextDist = h.distance - h.speed * dt;
          if (nextDist <= GRAB_THRESHOLD) {
            grabbed = true;
          }
          return {
            ...h,
            distance: Math.max(0, nextDist),
            wobblePhase: h.wobblePhase + dt * 6.5,
            recoilFlash: Math.max(0, h.recoilFlash - dt * 4.5),
          };
        });

        const nextBursts = burstsRef.current
          .map((b) => ({ ...b, age: b.age + dt }))
          .filter((b) => b.age < 0.36);

        handsRef.current = nextHands;
        burstsRef.current = nextBursts;

        setRemaining(remainingRef.current);
        setHands(nextHands);
        setBursts(nextBursts);

        if (grabbed) {
          resolvedRef.current = true;
          onCompleteRef.current(false);
          return;
        }

        if (remainingRef.current <= 0) {
          resolvedRef.current = true;
          onCompleteRef.current(true);
          return;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleTouchHand = (
    e: React.PointerEvent<HTMLButtonElement>,
    handId: number,
    xPct: number,
    yPct: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (resolvedRef.current || pausedRef.current) return;

    soundEngine.playHandBanish();
    setBanishedCount((c) => c + 1);

    const newBurst: ClickBurst = {
      id: nextBurstIdRef.current++,
      xPct,
      yPct,
      age: 0,
    };
    burstsRef.current = [...burstsRef.current, newBurst];
    setBursts(burstsRef.current);

    handsRef.current = handsRef.current.map((h) => {
      if (h.id !== handId) return h;
      const angleShift = (Math.random() - 0.5) * 1.15;
      return {
        ...h,
        angle: h.angle + angleShift,
        distance: 1.08 + Math.random() * 0.22,
        recoilFlash: 1,
      };
    });
    setHands(handsRef.current);
  };

  const progressPct = Math.min(100, Math.max(0, ((SURVIVAL_SECONDS - remaining) / SURVIVAL_SECONDS) * 100));
  const minDist = hands.reduce((acc, h) => Math.min(acc, h.distance), 1);
  const dangerIntensity = Math.max(0, Math.min(1, 1 - minDist / 0.55));

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden select-none cursor-crosshair"
      style={{
        background: `radial-gradient(circle at center, rgba(15, 3, 8, ${0.32 + dangerIntensity * 0.28}) 22%, rgba(95, 8, 22, ${0.58 + dangerIntensity * 0.28}) 100%)`,
      }}
    >
      {/* Center Danger Grasp Ring */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full border-2 transition-transform duration-75"
          style={{
            width: `${110 + dangerIntensity * 70}px`,
            height: `${110 + dangerIntensity * 70}px`,
            borderColor: `rgba(239, 68, 68, ${0.28 + dangerIntensity * 0.65})`,
            boxShadow: `0 0 ${24 + dangerIntensity * 38}px rgba(220, 38, 38, ${0.25 + dangerIntensity * 0.5})`,
          }}
        />
      </div>

      {/* Top-Center Instruction & 3s Survival Timer */}
      <div className="pointer-events-none absolute top-16 sm:top-6 left-1/2 -translate-x-1/2 w-[min(92vw,30rem)] bg-[#090408]/95 border border-red-600/80 rounded-md px-5 py-3.5 shadow-2xl space-y-2 text-center">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-red-400">
          <span>KINTORU · 정신 지배 침식</span>
          <span className="font-mono-tabular text-amber-300">
            처낸 손 {banishedCount}회
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-serif-kr font-black text-red-100 animate-pulse">
          킨토루의 지배를 벗어나세요!
        </h2>
        <p className="text-xs text-zinc-300">
          다가오는 손을 마우스로 빠르게 터치(클릭)해{' '}
          <span className="text-amber-300 font-semibold">6초</span> 동안 버티십시오!
        </p>
        <div className="space-y-1 pt-0.5">
          <div className="h-2.5 bg-zinc-900 border border-red-900/70 rounded-sm overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="font-mono-tabular text-xs font-bold text-amber-300">
            버티기 남은 시간: {remaining.toFixed(1)}s / 6.0s
          </p>
        </div>
      </div>

      {/* Click / Touch Banish Spark Bursts */}
      {bursts.map((b) => {
        const t = b.age / 0.36;
        return (
          <div
            key={b.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300"
            style={{
              left: `${b.xPct}%`,
              top: `${b.yPct}%`,
              width: `${40 + t * 90}px`,
              height: `${40 + t * 90}px`,
              opacity: Math.max(0, 1 - t),
              boxShadow: '0 0 22px rgba(251, 191, 36, 0.8)',
            }}
          />
        );
      })}

      {/* Creepy Approaching Shadow / Cursed Hands */}
      {hands.map((hand) => {
        const clampedDist = Math.max(0.05, Math.min(1.25, hand.distance));
        const xPct = 50 + Math.cos(hand.angle) * clampedDist * 44;
        const yPct = 50 + Math.sin(hand.angle) * clampedDist * 40;
        // Point fingers inward toward screen center
        const rotDeg = (hand.angle * 180) / Math.PI - 90 + Math.sin(hand.wobblePhase) * 6;
        const scale = 0.82 + (1.2 - clampedDist) * 0.92;
        const isCritical = clampedDist < 0.35;

        return (
          <button
            key={hand.id}
            type="button"
            onPointerDown={(e) => handleTouchHand(e, hand.id, xPct, yPct)}
            aria-label="다가오는 킨토루의 손 터치하기"
            className="absolute -translate-x-1/2 -translate-y-1/2 w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center cursor-pointer touch-none focus:outline-none group"
            style={{
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: `translate(-50%, -50%) rotate(${rotDeg}deg) scale(${scale})`,
            }}
          >
            {/* Pulsing Target Halo */}
            <div
              className={`absolute inset-4 rounded-full transition-opacity ${
                isCritical
                  ? 'bg-red-600/30 ring-2 ring-red-400/90 animate-ping'
                  : 'bg-red-950/25 ring-1 ring-red-500/45 group-hover:ring-amber-300/90'
              }`}
            />

            {/* Creepy Elongated Cursed Hand SVG */}
            <svg
              viewBox="0 0 140 160"
              className="w-32 h-36 sm:w-36 sm:h-40 drop-shadow-[0_0_16px_rgba(220,38,38,0.75)] transition-transform group-hover:scale-105 active:scale-90"
            >
              <defs>
                <linearGradient id={`handGrad-${hand.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isCritical ? '#4c0519' : '#1f1620'} />
                  <stop offset="55%" stopColor="#140c14" />
                  <stop offset="100%" stopColor="#050307" />
                </linearGradient>
              </defs>

              {/* Forearm */}
              <path
                d="M52 158 L54 106 L86 106 L90 158 Z"
                fill={`url(#handGrad-${hand.id})`}
                stroke="#7f1d1d"
                strokeWidth="2"
              />

              {/* Palm */}
              <path
                d="M44 108 C38 92 40 72 50 64 L90 64 C101 72 102 92 94 108 Z"
                fill={`url(#handGrad-${hand.id})`}
                stroke={isCritical ? '#ef4444' : '#991b1b'}
                strokeWidth="2.2"
              />

              {/* Long Clawed Fingers reaching toward center (top in local SVG space) */}
              {/* Thumb */}
              <path
                d="M46 95 C30 84 22 68 18 52 C24 54 34 65 48 80 Z"
                fill="#180e16"
                stroke="#991b1b"
                strokeWidth="1.8"
              />
              {/* Index */}
              <path
                d="M48 68 C44 46 39 24 41 8 C46 18 52 40 57 65 Z"
                fill="#1a0f18"
                stroke="#b91c1c"
                strokeWidth="1.8"
              />
              {/* Middle */}
              <path
                d="M61 65 C61 40 62 18 67 3 C71 18 72 40 71 65 Z"
                fill="#1a0f18"
                stroke="#dc2626"
                strokeWidth="1.9"
              />
              {/* Ring */}
              <path
                d="M75 66 C78 44 84 22 90 10 C91 25 87 46 84 67 Z"
                fill="#1a0f18"
                stroke="#b91c1c"
                strokeWidth="1.8"
              />
              {/* Pinky */}
              <path
                d="M87 72 C95 54 105 38 113 28 C110 43 102 59 94 78 Z"
                fill="#180e16"
                stroke="#991b1b"
                strokeWidth="1.8"
              />

              {/* Red Kintoru Eye Sigil on Palm */}
              <ellipse
                cx="70"
                cy="88"
                rx="13"
                ry="8"
                fill="#450a0a"
                stroke="#f87171"
                strokeWidth="1.6"
              />
              <circle cx="70" cy="88" r="4.5" fill="#ef4444" />
              <ellipse cx="70" cy="88" rx="1.6" ry="4" fill="#090306" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};
