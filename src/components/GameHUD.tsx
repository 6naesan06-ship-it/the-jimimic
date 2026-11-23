import React from 'react';
import { BookOpen, Compass, Flashlight, Pause, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ChapterMeta, CutsceneLine, JOBS, MONSTERS } from '../data/lore';
import { HudSnapshot } from '../game/MimicEngine';

interface GameHUDProps {
  chapter: ChapterMeta;
  hud: HudSnapshot;
  muted: boolean;
  pickupToast: string | null;
  subtitle: CutsceneLine | null;
  onToggleMute: () => void;
  onOpenCodex: () => void;
  onOpenPause: () => void;
  onToggleFlashlight: () => void;
  onToggleCrouch: () => void;
  onTriggerSkill: () => void;
  onInteract: () => void;
  onLockPointer: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  chapter,
  hud,
  muted,
  pickupToast,
  subtitle,
  onToggleMute,
  onOpenCodex,
  onOpenPause,
  onToggleFlashlight,
  onToggleCrouch,
  onTriggerSkill,
  onInteract,
  onLockPointer,
}) => {
  const dangerRatio =
    hud.nearestMonsterDist < 18
      ? Math.max(0, Math.min(0.75, (1 - hud.nearestMonsterDist / 18) * 0.75))
      : 0;

  const closestMonster = hud.closestMonsterId
    ? MONSTERS.find((m) => m.id === hud.closestMonsterId)
    : null;

  const jobMeta = JOBS.find((j) => j.id === hud.jobId) || JOBS[0];
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const skillReady = hud.skillCooldown <= 0.05;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Danger Proximity Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: dangerRatio,
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(127, 29, 29, 0.72) 100%)',
        }}
      />

      {/* Subtle Scanlines */}
      <div className="horror-scanlines absolute inset-0 opacity-20" />

      {/* Top Left: Chapter, Job & Objective */}
      <div className="absolute top-4 left-4 max-w-sm bg-[#08080c]/88 border border-zinc-800/90 rounded-md px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="text-red-400 font-medium">{chapter.title}</span>
          <span aria-hidden="true">·</span>
          <span className="text-zinc-200">{jobMeta.name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{formatTime(hud.elapsedSeconds)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-zinc-100">
            {hud.exitUnlocked
              ? '출구 봉인 해제 · 붉은 도리이로 탈출'
              : `${chapter.itemNoun} 수집`}
          </span>
          <span
            className={`font-mono-tabular text-sm font-semibold ${
              hud.exitUnlocked ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {hud.collectedItems} / {hud.requiredItems}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-snug">{chapter.objectiveLabel}</p>

        {/* Exorcist / Developer Spirit Compass */}
        {hud.nearestObjectiveDist !== null && hud.nearestObjectiveAngleDeg !== null && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-800/80 text-xs text-amber-300">
            <Compass
              className="w-4 h-4 shrink-0"
              style={{ transform: `rotate(${hud.nearestObjectiveAngleDeg}deg)` }}
            />
            <span>
              {hud.exitUnlocked ? '출구 방향' : '가장 가까운 봉인'} ·{' '}
              <span className="font-mono-tabular">{hud.nearestObjectiveDist}m</span>
            </span>
          </div>
        )}

        {/* Doctor Second Chance indicator */}
        {hud.jobId === 'doctor' && (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-400">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hud.doctorReviveReady ? '응급 처치 부활 대기 중 (1회)' : '응급 처치 소모됨'}
            </span>
          </div>
        )}

        {/* Developer Overdrive indicator */}
        {hud.jobId === 'developer' && (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-cyan-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>관리자 권한: 사망 면역 · 야간 투시 활성</span>
          </div>
        )}

        {hud.anyMonsterChasing && closestMonster && (
          <p className="text-xs font-semibold text-red-400 pt-1 border-t border-zinc-800/80">
            추격 중: {closestMonster.name} (
            <span className="font-mono-tabular">{hud.nearestMonsterDist.toFixed(1)}m</span> · 12m
            이상 벗어나면 정지)
          </p>
        )}
      </div>

      {/* Top Right: Action Buttons */}
      <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onToggleMute}
          title={muted ? '소리 켜기' : '음소거'}
          className="flex items-center justify-center w-10 h-10 bg-[#08080c]/88 hover:bg-zinc-900 border border-zinc-800/90 rounded-md text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={onOpenCodex}
          className="flex items-center gap-1.5 px-3 h-10 bg-[#08080c]/88 hover:bg-zinc-900 border border-zinc-800/90 rounded-md text-xs font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>도감 [TAB]</span>
        </button>
        <button
          onClick={onOpenPause}
          className="flex items-center gap-1.5 px-3 h-10 bg-[#08080c]/88 hover:bg-zinc-900 border border-zinc-800/90 rounded-md text-xs font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>일시정지</span>
        </button>
      </div>

      {/* Center Reticle & Interact Prompt */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={`w-1.5 h-1.5 rounded-full transition-transform duration-150 ${
            hud.nearestPrompt ? 'bg-amber-300 scale-150' : 'bg-white/60'
          }`}
        />

        {hud.nearestPrompt && (
          <div className="mt-5 px-3.5 py-1.5 bg-[#08080c]/92 border border-amber-500/40 rounded text-xs font-medium text-amber-200">
            {hud.nearestPrompt}
          </div>
        )}

        {pickupToast && (
          <div className="mt-4 px-4 py-2 bg-red-950/92 border border-red-700/70 rounded text-xs font-medium text-red-100">
            {pickupToast}
          </div>
        )}
      </div>

      {/* Roblox The Mimic-style Bottom-Center Story Subtitles */}
      {subtitle && (
        <div className="pointer-events-none absolute bottom-24 sm:bottom-18 left-1/2 -translate-x-1/2 w-[min(92vw,34rem)] px-5 py-3 bg-[#07070b]/92 border border-zinc-700/80 rounded-md shadow-xl text-center">
          <p
            className="text-xs font-semibold tracking-wide mb-1"
            style={{ color: subtitle.accent || '#f87171' }}
          >
            [{subtitle.speaker}]
          </p>
          <p className="text-sm font-serif-kr text-zinc-100 leading-relaxed">{subtitle.text}</p>
        </div>
      )}

      {/* Discreet Mouse Look Hint when pointer not locked */}
      {!hud.pointerLocked && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2">
          <button
            onClick={onLockPointer}
            className="px-3.5 py-1.5 bg-[#08080c]/88 hover:bg-zinc-900 border border-zinc-700/80 rounded text-xs text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            화면을 클릭하여 시점 고정 · 또는 마우스 드래그 / Q·R 회전
          </button>
        </div>
      )}

      {/* Bottom Left: Battery, Stamina & Active Job Skill */}
      <div className="absolute bottom-4 left-4 w-72 bg-[#08080c]/88 border border-zinc-800/90 rounded-md p-3.5 space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Flashlight className="w-3.5 h-3.5 text-amber-300" />
              <span>손전등 [F] · {hud.flashlightOn ? '켜짐' : '꺼짐'}</span>
            </span>
            <span className="font-mono-tabular text-zinc-300">
              {hud.jobId === 'developer' ? '∞' : `${Math.round(hud.battery)}%`}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                hud.battery < 22 ? 'bg-red-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, hud.battery))}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">
              체력 [Shift] · {hud.crouching ? '은신 자세' : '서 있음'}
            </span>
            <span className="font-mono-tabular text-zinc-300">
              {hud.jobId === 'developer' ? '∞' : Math.round(hud.stamina)}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-zinc-200 transition-all duration-150"
              style={{ width: `${staminaPct}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>{jobMeta.activeSkillName} [G]</span>
          </span>
          <span
            className={`font-mono-tabular font-medium ${
              hud.skillActive
                ? 'text-amber-300'
                : skillReady
                  ? 'text-emerald-400'
                  : 'text-zinc-400'
            }`}
          >
            {hud.skillActive
              ? '발동 중'
              : skillReady
                ? '사용 가능'
                : `${Math.ceil(hud.skillCooldown)}s`}
          </span>
        </div>
      </div>

      {/* Bottom Right: Compact Controls & Quick Touch Buttons */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerSkill}
            disabled={!skillReady}
            className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              skillReady
                ? 'bg-red-950/90 hover:bg-red-900 border-red-600/80 text-red-100'
                : 'bg-[#08080c]/88 border-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {jobMeta.activeSkillName} [G]
          </button>
          <button
            onClick={onToggleFlashlight}
            className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              hud.flashlightOn
                ? 'bg-amber-950/88 border-amber-600/70 text-amber-200'
                : 'bg-[#08080c]/88 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            손전등 [F]
          </button>
          <button
            onClick={onToggleCrouch}
            className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              hud.crouching
                ? 'bg-red-950/88 border-red-700/70 text-red-200'
                : 'bg-[#08080c]/88 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            은신 [C]
          </button>
          {hud.nearestPrompt && (
            <button
              onClick={onInteract}
              className="px-3.5 py-2 text-xs font-semibold rounded border bg-red-800 hover:bg-red-700 border-red-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              상호작용 [E]
            </button>
          )}
        </div>
        <div className="hidden sm:block px-3 py-1.5 bg-[#08080c]/85 border border-zinc-800/80 rounded text-xs text-zinc-400">
          이동 WASD · 달리기 Shift · 손전등 F · 은신 C · 조사 E · 직업 스킬 G
        </div>
      </div>
    </div>
  );
};
