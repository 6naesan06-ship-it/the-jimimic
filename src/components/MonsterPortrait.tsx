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

  if (monsterId === 'kyogi') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#1f1808] via-[#0c0a06] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="쿄기 초상">
          <defs>
            <radialGradient id="kyogiGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#kyogiGlow)" />
          <path d="M40 220 L58 128 L122 128 L140 220 Z" fill="#18181b" />
          <rect x="66" y="156" width="48" height="10" fill="#eab308" />
          <path d="M48 80 L90 22 L132 80 L122 132 L58 132 Z" fill="#09090b" />
          <rect x="64" y="54" width="52" height="66" rx="8" fill="#18181b" stroke="#ca8a04" strokeWidth="2.5" />
          <circle cx="90" cy="64" r="6" fill="#eab308" />
          <ellipse cx="76" cy="84" rx="8" ry="4" fill="#facc15" />
          <ellipse cx="104" cy="84" rx="8" ry="4" fill="#facc15" />
          <path d="M70 105 Q90 118 110 105" fill="none" stroke="#eab308" strokeWidth="2.5" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'nagisa') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#062229] via-[#041117] to-[#020608] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="나기사 초상">
          <defs>
            <radialGradient id="nagisaGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#020608" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#nagisaGlow)" />
          <path d="M44 220 Q60 140 90 132 Q120 140 136 220 Z" fill="#0f3d4a" />
          <polygon points="54,78 24,52 50,98" fill="#2dd4bf" />
          <polygon points="126,78 156,52 130,98" fill="#2dd4bf" />
          <ellipse cx="90" cy="88" rx="32" ry="40" fill="#0c2f3a" stroke="#14b8a6" strokeWidth="2" />
          <ellipse cx="77" cy="82" rx="8" ry="5" fill="#2dd4bf" />
          <ellipse cx="103" cy="82" rx="8" ry="5" fill="#2dd4bf" />
          <path d="M68 106 Q90 124 112 106" fill="#041418" stroke="#99f6e4" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'kuishinbo') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#291018] via-[#12070a] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="쿠이신보 초상">
          <defs>
            <radialGradient id="kuiGlow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#kuiGlow)" />
          <ellipse cx="90" cy="172" rx="54" ry="58" fill="#3b2327" />
          <ellipse cx="90" cy="94" rx="40" ry="44" fill="#4c3336" />
          <circle cx="72" cy="74" r="6" fill="#09090b" />
          <circle cx="108" cy="74" r="6" fill="#09090b" />
          <circle cx="72" cy="74" r="2" fill="#fb7185" />
          <circle cx="108" cy="74" r="2" fill="#fb7185" />
          <ellipse cx="90" cy="108" rx="28" ry="22" fill="#180407" />
          <path d="M68 96 L74 110 L80 96 L86 110 L92 96 L98 110 L104 96 L112 110" fill="none" stroke="#e7e5e4" strokeWidth="2.5" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'rin_mio') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#260b1c] via-[#0e060b] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="린과 미오 초상">
          <defs>
            <radialGradient id="rinGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#rinGlow)" />
          <path d="M42 200 Q46 54 90 38 Q134 54 138 200 Z" fill="#09090b" />
          <path d="M46 220 L66 135 L114 135 L134 220 Z" fill="#881337" />
          <ellipse cx="122" cy="76" rx="18" ry="22" fill="#d4d4d8" opacity="0.85" />
          <circle cx="122" cy="72" r="3" fill="#f472b6" />
          <ellipse cx="86" cy="88" rx="30" ry="38" fill="#e4e4e7" />
          <circle cx="74" cy="82" r="6" fill="#09090b" />
          <circle cx="98" cy="82" r="6" fill="#09090b" />
          <path d="M74 88 L74 110 M98 88 L98 110" stroke="#9f1239" strokeWidth="2.5" />
          <ellipse cx="86" cy="108" rx="10" ry="7" fill="#4c0519" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'enzukai') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#291f07] via-[#120d04] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="엔즈카이 초상">
          <defs>
            <radialGradient id="enzukaiGlow" cx="50%" cy="40%" r="58%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#enzukaiGlow)" />
          <g stroke="#eab308" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M62 120 L22 72 L16 144" />
            <path d="M118 120 L158 72 L164 144" />
          </g>
          <path d="M40 220 L58 134 L122 134 L140 220 Z" fill="#7f1d1d" />
          <rect x="62" y="166" width="56" height="12" fill="#facc15" opacity="0.9" />
          <polygon points="62,54 50,18 74,44" fill="#facc15" />
          <polygon points="118,54 130,18 106,44" fill="#facc15" />
          <ellipse cx="90" cy="88" rx="32" ry="40" fill="#ca8a04" stroke="#451a03" strokeWidth="2" />
          <ellipse cx="77" cy="84" rx="8" ry="6" fill="#180505" />
          <ellipse cx="103" cy="84" rx="8" ry="6" fill="#180505" />
          <circle cx="77" cy="84" r="2.2" fill="#fef08a" />
          <circle cx="103" cy="84" r="2.2" fill="#fef08a" />
          <path d="M68 108 Q90 124 112 108 Q90 100 68 108 Z" fill="#2a0408" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'nure') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#072629] via-[#041214] to-[#020506] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="누레 초상">
          <defs>
            <radialGradient id="nureGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#020506" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#nureGlow)" />
          <path d="M36 220 Q56 150 90 142 Q124 150 144 220 Z" fill="#0f3b3e" />
          <path d="M40 198 Q46 54 90 36 Q134 54 140 198 Z" fill="#09090b" />
          <ellipse cx="90" cy="88" rx="30" ry="38" fill="#133d42" stroke="#2dd4bf" strokeWidth="1.5" />
          <ellipse cx="77" cy="82" rx="8" ry="5" fill="#a7f3d0" />
          <ellipse cx="103" cy="82" rx="8" ry="5" fill="#a7f3d0" />
          <rect x="76" y="77" width="2" height="10" fill="#042f2e" />
          <rect x="102" y="77" width="2" height="10" fill="#042f2e" />
          <path d="M72 108 Q90 124 108 108" fill="#061215" />
          <polygon points="78,107 82,120 86,107" fill="#ecfeff" />
          <polygon points="94,107 98,120 102,107" fill="#ecfeff" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'hyakume') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#2b170b] via-[#120a06] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="햐쿠메 초상">
          <defs>
            <radialGradient id="hyakumeGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#hyakumeGlow)" />
          <path d="M28 220 L52 132 L128 132 L152 220 Z" fill="#3b2c2e" />
          <circle cx="58" cy="158" r="7" fill="#fef3c7" />
          <circle cx="58" cy="158" r="3" fill="#b91c1c" />
          <circle cx="122" cy="158" r="7" fill="#fef3c7" />
          <circle cx="122" cy="158" r="3" fill="#b91c1c" />
          <ellipse cx="90" cy="88" rx="38" ry="44" fill="#3b2c2e" />
          <ellipse cx="90" cy="78" rx="22" ry="15" fill="#fef3c7" />
          <circle cx="90" cy="78" r="9.5" fill="#b91c1c" />
          <circle cx="90" cy="78" r="4.5" fill="#09090b" />
          <ellipse cx="90" cy="112" rx="22" ry="9" fill="#120508" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'jigoku_warden') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#221233] via-[#0e0717] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="지고쿠의 영혼 인도자 초상">
          <defs>
            <radialGradient id="wardenGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#wardenGlow)" />
          <path d="M36 220 L56 128 L124 128 L144 220 Z" fill="#1e1628" />
          <path d="M46 88 L90 22 L134 88 L124 134 L56 134 Z" fill="#140e1d" />
          <ellipse cx="90" cy="88" rx="28" ry="36" fill="#c4b5fd" />
          <ellipse cx="77" cy="82" rx="7.5" ry="10" fill="#09090b" />
          <ellipse cx="103" cy="82" rx="7.5" ry="10" fill="#09090b" />
          <circle cx="77" cy="82" r="2.5" fill="#e879f9" />
          <circle cx="103" cy="82" r="2.5" fill="#e879f9" />
          <line x1="72" y1="108" x2="108" y2="108" stroke="#18181b" strokeWidth="3" />
        </svg>
      </div>
    );
  }

  if (monsterId === 'senzai_fallen') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#262010] via-[#120e07] to-[#050507] flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 180 220" className="w-full h-full" aria-label="타락한 센자이 초상">
          <defs>
            <radialGradient id="senzaiGlow" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#050507" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="180" height="220" fill="url(#senzaiGlow)" />
          <path d="M42 220 L60 132 L120 132 L138 220 Z" fill="#1e1a18" />
          <rect x="64" y="150" width="52" height="10" fill="#eab308" />
          <ellipse cx="90" cy="86" rx="31" ry="39" fill="#cbc6be" />
          <path d="M68 54 L84 74" stroke="#7f1d1d" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="77" cy="82" rx="7" ry="5" fill="#181208" />
          <ellipse cx="103" cy="82" rx="7" ry="5" fill="#181208" />
          <circle cx="77" cy="82" r="2.5" fill="#facc15" />
          <circle cx="103" cy="82" r="2.5" fill="#facc15" />
          <path d="M74 108 Q90 100 106 108" fill="none" stroke="#451a03" strokeWidth="3" />
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
