import React from 'react';
import { MonsterId } from '../data/lore';

interface MonsterPortraitProps {
  monsterId: MonsterId;
  className?: string;
}

export const MonsterPortrait: React.FC<MonsterPortraitProps> = ({ monsterId, className = '' }) => {
  if (monsterId === 'shizu') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#160d10] via-[#0b090d] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="시즈 초상">
          <defs>
            <radialGradient id="shizuGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#881337" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#shizuGlow)" />
          <path d="M40 190 Q38 60 90 36 Q142 60 140 190 Z" fill="#09090b" />
          <path d="M46 220 L66 135 L114 135 L134 220 Z" fill="#d4d4d8" opacity="0.88" />
          <path d="M74 135 L90 174 L106 135" fill="none" stroke="#18181b" strokeWidth="4" />
          <g transform="rotate(14 90 88)">
            <ellipse cx="90" cy="86" rx="33" ry="42" fill="#e4e4e7" />
            <path d="M68 54 L76 74 L70 92" fill="none" stroke="#52525b" strokeWidth="1.5" />
            <ellipse cx="77" cy="80" rx="8" ry="11" fill="#09090b" />
            <ellipse cx="103" cy="80" rx="8" ry="11" fill="#09090b" />
            <circle cx="77" cy="79" r="1.5" fill="#f4f4f5" />
            <circle cx="103" cy="79" r="1.5" fill="#f4f4f5" />
            <path d="M68 103 Q90 128 112 103 Q90 114 68 103 Z" fill="#180407" />
          </g>
        </svg>
      </div>
    );
  }

  if (monsterId === 'biwaki') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#0e1026] via-[#090913] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="비와키 초상">
          <defs>
            <radialGradient id="biwakiGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#biwakiGlow)" />
          {/* Biwa lute silhouette behind shoulder */}
          <ellipse cx="128" cy="126" rx="22" ry="38" fill="#451a03" transform="rotate(-18 128 126)" />
          <path d="M44 220 L62 132 L118 132 L136 220 Z" fill="#1e1b4b" />
          <rect x="64" y="156" width="52" height="12" fill="#d97706" opacity="0.85" />
          <ellipse cx="90" cy="84" rx="31" ry="39" fill="#d6d3d1" />
          <path d="M68 74 L84 82 M112 74 L96 82" stroke="#09090b" strokeWidth="4" />
          <circle cx="77" cy="82" r="4" fill="#09090b" />
          <circle cx="103" cy="82" r="4" fill="#09090b" />
          <path d="M74 106 Q90 118 106 106" fill="none" stroke="#18181b" strokeWidth="3.5" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'megumi') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#231026] via-[#0e0812] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="메구미 초상">
          <defs>
            <radialGradient id="megumiGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#a21caf" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#megumiGlow)" />
          <path d="M46 220 L66 134 L114 134 L134 220 Z" fill="#581c87" />
          <path d="M52 72 Q90 28 128 72 L124 132 L56 132 Z" fill="#09090b" />
          <g transform="rotate(-10 90 86)">
            <ellipse cx="90" cy="86" rx="30" ry="37" fill="#f4f4f5" />
            {/* Cracked porcelain lines */}
            <path d="M74 58 L82 78 L77 96" fill="none" stroke="#3f3f46" strokeWidth="1.6" />
            <circle cx="77" cy="82" r="7" fill="#09090b" />
            <circle cx="103" cy="82" r="7" fill="#09090b" />
            <circle cx="77" cy="82" r="2.2" fill="#e879f9" />
            <circle cx="103" cy="82" r="2.2" fill="#e879f9" />
            <path d="M80 105 L90 112 L100 105" fill="none" stroke="#991b1b" strokeWidth="2.5" />
          </g>
        </svg>
      </div>
    );
  }

  if (monsterId === 'oomukade') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#241208] via-[#100906] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="오오무카데 초상">
          <defs>
            <radialGradient id="oomukadeGlow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#oomukadeGlow)" />
          {/* Centipede legs */}
          <g stroke="#d97706" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M68 100 L28 74 L18 118" />
            <path d="M68 128 L24 114 L18 164" />
            <path d="M68 156 L30 152 L24 196" />
            <path d="M112 100 L152 74 L162 118" />
            <path d="M112 128 L156 114 L162 164" />
            <path d="M112 156 L150 152 L156 196" />
          </g>
          <ellipse cx="90" cy="148" rx="34" ry="54" fill="#270d0f" />
          <ellipse cx="90" cy="86" rx="30" ry="38" fill="#451218" />
          <circle cx="76" cy="82" r="5" fill="#fbbf24" />
          <circle cx="104" cy="82" r="5" fill="#fbbf24" />
          <path d="M74 110 L62 126 M106 110 L118 126" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'keiko') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#1f0a10] via-[#0c0709] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="케이코 초상">
          <defs>
            <radialGradient id="keikoGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#991b1b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#keikoGlow)" />
          <path d="M40 198 Q42 56 90 38 Q138 56 140 198 Z" fill="#09090b" />
          <path d="M46 220 L66 135 L114 135 L134 220 Z" fill="#18181b" />
          <rect x="64" y="160" width="52" height="12" fill="#7f1d1d" />
          <ellipse cx="90" cy="86" rx="31" ry="40" fill="#d4d4d8" />
          <ellipse cx="77" cy="80" rx="7.5" ry="9" fill="#09090b" />
          <ellipse cx="103" cy="80" rx="7.5" ry="9" fill="#09090b" />
          <path d="M77 89 L77 110 M103 89 L103 110" stroke="#7f1d1d" strokeWidth="2.5" />
          <path d="M74 108 Q90 100 106 108" fill="none" stroke="#18181b" strokeWidth="3" />
        </svg>
      </div>
    );
  }

  // Saigomo (Spider Demon Final Form of Kintoru)
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#23090d] via-[#100608] to-[#050507] flex items-center justify-center ${className}`}
    >
      <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="사이고모 초상">
        <defs>
          <radialGradient id="saigomoGlow" cx="50%" cy="40%" r="58%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#050507" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="180" height="220" fill="url(#saigomoGlow)" />
        {/* Spider legs behind kimono */}
        <g stroke="#27090e" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M62 120 L22 76 L14 148" />
          <path d="M60 144 L18 122 L16 192" />
          <path d="M118 120 L158 76 L166 148" />
          <path d="M120 144 L162 122 L164 192" />
        </g>
        <rect x="20" y="42" width="14" height="32" fill="#e7e5e4" stroke="#991b1b" strokeWidth="2" transform="rotate(-12 27 58)" />
        <rect x="146" y="46" width="14" height="32" fill="#e7e5e4" stroke="#991b1b" strokeWidth="2" transform="rotate(14 153 62)" />
        <path d="M40 220 L58 134 L122 134 L140 220 Z" fill="#7f1d1d" />
        <path d="M62 134 L90 186 L118 134" fill="#09090b" />
        <rect x="64" y="168" width="52" height="12" fill="#ca8a04" opacity="0.85" />
        <path d="M56 76 Q90 22 124 76 Z" fill="#09090b" />
        <polygon points="66,46 58,20 75,40" fill="#d97706" />
        <polygon points="114,46 122,20 105,40" fill="#d97706" />
        <ellipse cx="90" cy="88" rx="31" ry="40" fill="#f5f5f4" />
        <ellipse cx="77" cy="84" rx="8" ry="6.5" fill="#09090b" />
        <ellipse cx="103" cy="84" rx="8" ry="6.5" fill="#09090b" />
        <circle cx="77" cy="84" r="2" fill="#ef4444" />
        <circle cx="103" cy="84" r="2" fill="#ef4444" />
        <path d="M72 108 Q90 124 108 108 Q90 113 72 108 Z" fill="#991b1b" />
      </svg>
    </div>
  );
};
