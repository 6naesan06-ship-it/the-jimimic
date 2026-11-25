import React from 'react';
import {
  BookOpen,
  Compass,
  Flashlight,
  Heart,
  Pause,
  ShieldAlert,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
  onSwordAttack: () => void;
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
  onSwordAttack,
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
  const playerHpPct = Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100));
  const bossHpPct = Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100));
  const skillReady = hud.skillCooldown <= 0.05;
  const isSwordChapter = chapter.id === 4 || chapter.id === 8;

  const finalChasePulse = hud.finalChaseActive
    ? 0.42 + Math.abs(Math.sin(hud.finalChaseElapsed * 4.5)) * 0.38
    : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Danger Proximity / Final Escape Chase Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: Math.max(dangerRatio, finalChasePulse),
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(153, 27, 27, 0.82) 100%)',
        }}
      />

      {/* Hurt Impact Flash */}
      {hud.hurtFlash > 0.02 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: Math.min(0.82, hud.hurtFlash * 0.75),
            background:
              'radial-gradient(circle at center, rgba(185, 28, 28, 0.14) 30%, rgba(220, 38, 38, 0.78) 100%)',
          }}
        />
      )}

      {/* Subtle Scanlines */}
      <div className="horror-scanlines absolute inset-0 opacity-20" />

      {/* Top Left: Chapter, Job & Objective */}
      <div
        className={`absolute top-4 left-4 max-w-sm bg-[#08080c]/88 border rounded-md px-4 py-3 space-y-1.5 ${
          hud.difficulty === 'nightmare' ? 'border-red-900/90' : 'border-zinc-800/90'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="text-red-400 font-medium">{chapter.title}</span>
          <span aria-hidden="true">·</span>
          <span className="text-zinc-200">{jobMeta.name}</span>
          {hud.difficulty === 'nightmare' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-950/90 border border-red-600/80 text-red-200 rounded">
                ☠ 악몽
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{formatTime(hud.elapsedSeconds)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          {hud.inChaseMap || hud.finalChaseActive ? (
            <>
              <span className="text-sm font-bold text-red-400 animate-pulse">
                {chapter.id === 5
                  ? '🚨 추격전 전용 맵 · 미오와 린을 피해 탈출!'
                  : chapter.id === 1
                    ? '🚨 추격전 전용 맵 · 지하실 출구로 탈출!'
                    : chapter.id === 4 || chapter.id === 8
                      ? '🚨 붕괴 추격전 맵 · 탈출 도리이로 전력 질주!'
                      : '🚨 추격전 전용 맵 · 붉은 도리이로 탈출!'}
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-emerald-400 shrink-0">
                도주 중
              </span>
            </>
          ) : hud.isBossFight ? (
            <>
              <span className="text-sm font-medium text-red-300">
                {chapter.id === 8 ? '엔즈카이 토벌전 (백염의 성검)' : '사이고모 토벌전 (축복받은 검)'}
              </span>
              <span className="font-mono-tabular text-sm font-semibold text-amber-300">
                타격 {hud.bossHitsLanded}회
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-zinc-100">
                {hud.exitUnlocked
                  ? chapter.id === 1
                    ? '지하실 문 개방 · 들어가면 추격전 시작!'
                    : chapter.id === 5
                      ? '선착장 출구 개방 · 들어가면 미오와 린 추격전!'
                      : '출구 개방 · 들어가면 추격전 시작!'
                  : `${chapter.itemNoun} 수집`}
              </span>
              <span
                className={`font-mono-tabular text-sm font-semibold ${
                  hud.exitUnlocked ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {hud.collectedItems} / {hud.requiredItems}
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-zinc-400 leading-snug">{chapter.objectiveLabel}</p>

        {/* Chapter 5 Rat & Poisoned Well Inventory Status */}
        {chapter.id === 5 && !hud.inChaseMap && !hud.exitUnlocked && (
          <div
            className={`px-2.5 py-1.5 rounded border text-xs font-medium ${
              hud.carriedRat === 'poisoned'
                ? 'bg-emerald-950/75 border-emerald-600/70 text-emerald-200'
                : hud.carriedRat === 'raw'
                  ? 'bg-amber-950/75 border-amber-600/70 text-amber-200'
                  : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-300'
            }`}
          >
            {hud.carriedRat === 'poisoned'
              ? '🐀 보유 중: 독에 절인 쥐 → 미오와 린에게 다가가 [E]'
              : hud.carriedRat === 'raw'
                ? '🐀 보유 중: 시궁쥐 → 초록빛 독이 든 우물에서 [E]'
                : '🐀 보유 쥐 없음 → 먼저 바닥의 시궁쥐를 잡으세요'}
          </div>
        )}

        {/* Exorcist / Developer / Hacker / Chase Spirit Compass */}
        {hud.nearestObjectiveDist !== null && hud.nearestObjectiveAngleDeg !== null && (
          <div
            className={`flex items-center gap-2 pt-1.5 border-t border-zinc-800/80 text-xs ${
              hud.inChaseMap || hud.finalChaseActive
                ? 'text-emerald-300 font-semibold'
                : 'text-amber-300'
            }`}
          >
            <Compass
              className="w-4 h-4 shrink-0"
              style={{ transform: `rotate(${hud.nearestObjectiveAngleDeg}deg)` }}
            />
            <span>
              {hud.inChaseMap
                ? '추격전 탈출 출구 방향'
                : hud.isBossFight
                  ? chapter.id === 8
                    ? '엔즈카이 위치'
                    : '사이고모 위치'
                  : hud.exitUnlocked
                    ? chapter.id === 1
                      ? '추격전 진입 문 방향'
                      : '추격전 진입 출구 방향'
                    : chapter.id === 5
                      ? hud.carriedRat === 'poisoned'
                        ? '미오와 린 위치'
                        : hud.carriedRat === 'raw'
                          ? '독이 든 우물 위치'
                          : '가장 가까운 시궁쥐'
                      : '가장 가까운 봉인'}{' '}
              · <span className="font-mono-tabular">{hud.nearestObjectiveDist}m</span>
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

        {/* Developer / Hacker Overdrive indicator */}
        {(hud.jobId === 'developer' || hud.jobId === 'hacker') && (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-cyan-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hud.jobId === 'hacker'
                ? '방화벽 가동: 사망 면역 · 야간 투시 · 백도어 활성'
                : '관리자 권한: 사망 면역 · 야간 투시 활성'}
            </span>
          </div>
        )}

        {!hud.isBossFight && hud.anyMonsterChasing && closestMonster && (
          <p className="text-xs font-semibold text-red-400 pt-1 border-t border-zinc-800/80">
            {hud.inChaseMap || hud.finalChaseActive ? (
              <>
                총공세 추격: {closestMonster.name} (
                <span className="font-mono-tabular">{hud.nearestMonsterDist.toFixed(1)}m</span> ·
                멈추지 않고 끝까지 추격합니다!)
              </>
            ) : (
              <>
                추격 중: {closestMonster.name} (
                <span className="font-mono-tabular">{hud.nearestMonsterDist.toFixed(1)}m</span> ·
                {hud.difficulty === 'nightmare' ? '15.5m' : '12m'} 이상 벗어나면 정지)
              </>
            )}
          </p>
        )}
      </div>

      {/* Dedicated Chase Map / Final Escape Top-Center Urgent Banner */}
      {(hud.inChaseMap || hud.finalChaseActive) && (
        <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 w-[min(92vw,30rem)] bg-[#140407]/94 border border-red-600/85 rounded-md px-4 py-2.5 space-y-1 shadow-2xl">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-serif-kr font-bold text-red-300 animate-pulse">
              🚨 CHASE SEQUENCE · 추격전 전용 맵
            </span>
            {hud.nearestObjectiveDist !== null && (
              <span className="font-mono-tabular font-bold text-emerald-300">
                출구까지 {hud.nearestObjectiveDist}m
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-200 leading-snug">
            {chapter.id === 5
              ? '독에 굶주린 미오와 린이 끝까지 뒤쫓아옵니다! 초록색 나침반을 따라 붉은 도리이 출구로 전력 질주하세요!'
              : chapter.id === 1
                ? '어둠 속의 괴물들이 미친 듯이 몰려옵니다! 초록색 나침반을 따라 탈출구로 달려가세요!'
                : chapter.id === 4 || chapter.id === 8
                  ? '붕괴하는 통로 너머 적의 원념이 끝까지 뒤쫓습니다! 나침반을 따라 탈출 도리이로 전력 질주하세요!'
                  : '이 장의 괴물들이 추격전 전용 통로에서 끝까지 뒤쫓아옵니다! 초록빛 탈출구까지 멈추지 말고 달리세요!'}
          </p>
        </div>
      )}

      {/* Final Chapter Top-Center Boss Health Bar & Attack / Stun Status */}
      {hud.isBossFight && (
        <div className="absolute top-14 sm:top-4 left-1/2 -translate-x-1/2 w-[min(92vw,28rem)] bg-[#08080c]/92 border border-red-900/80 rounded-md px-4 py-2.5 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif-kr font-bold text-red-300">
              {chapter.id === 8 ? '엔즈카이 (질투의 짐승)' : '사이고모 (거미 형상 킨토루)'}
            </span>
            <span className="font-mono-tabular text-zinc-200 font-semibold">
              {hud.bossHp} / {hud.bossMaxHp}
            </span>
          </div>
          <div className="h-2.5 bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                hud.bossStunTimer > 0 ? 'bg-amber-400' : 'bg-red-600'
              }`}
              style={{ width: `${bossHpPct}%` }}
            />
          </div>
          {hud.bossStunTimer > 0 ? (
            <p className="text-center text-xs font-bold text-amber-300">
              ⚡ 결계 파괴! 스턴 상태! 지금 검으로 베십시오! ({hud.bossStunTimer.toFixed(1)}s)
            </p>
          ) : hud.bossAttackWarning ? (
            <p className="text-center text-xs font-semibold text-red-300 animate-pulse">
              {hud.bossAttackWarning}
            </p>
          ) : (
            <p className="text-center text-[11px] text-amber-200/80">
              🛡️ {chapter.id === 8 ? '질투의 결계' : '제어의 결계'} 활성 · 스턴 시에만 피해! (기둥 충돌 / 공격 준비 패링 / 오의 후 {hud.difficulty === 'nightmare' ? '2.4초' : '3초'} 스턴)
            </p>
          )}
        </div>
      )}

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
      {!hud.pointerLocked && !hud.isBossFight && !hud.finalChaseActive && !hud.inChaseMap && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2">
          <button
            onClick={onLockPointer}
            className="px-3.5 py-1.5 bg-[#08080c]/88 hover:bg-zinc-900 border border-zinc-700/80 rounded text-xs text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            화면을 클릭하여 시점 고정 · 또는 마우스 드래그 / Q·R 회전
          </button>
        </div>
      )}

      {/* Bottom Left: HP (Ch.4 & Ch.8), Battery, Stamina & Active Job Skill */}
      <div className="absolute bottom-4 left-4 w-72 bg-[#08080c]/88 border border-zinc-800/90 rounded-md p-3.5 space-y-2.5">
        {isSwordChapter && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-300 flex items-center gap-1.5 font-medium">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <span>{chapter.id === 8 ? '이사무의 체력' : '야스의 체력'}</span>
              </span>
              <span className="font-mono-tabular text-zinc-200 font-semibold">
                {hud.jobId === 'developer' || hud.jobId === 'hacker'
                  ? '∞'
                  : `${Math.round(hud.playerHp)} / ${hud.playerMaxHp}`}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  playerHpPct < 30 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${hud.jobId === 'developer' || hud.jobId === 'hacker' ? 100 : playerHpPct}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Flashlight className="w-3.5 h-3.5 text-amber-300" />
              <span>손전등 [F] · {hud.flashlightOn ? '켜짐' : '꺼짐'}</span>
            </span>
            <span className="font-mono-tabular text-zinc-300">
              {hud.jobId === 'developer' || hud.jobId === 'hacker' ? '∞' : `${Math.round(hud.battery)}%`}
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
              스태미나 [Shift] · {hud.crouching ? '은신 자세' : '서 있음'}
            </span>
            <span className="font-mono-tabular text-zinc-300">
              {hud.jobId === 'developer' || hud.jobId === 'hacker' ? '∞' : Math.round(hud.stamina)}
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
          {isSwordChapter && (
            <button
              onClick={onSwordAttack}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border bg-amber-900/90 hover:bg-amber-800 border-amber-500/80 text-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>검 베기 [좌클릭 / Space]</span>
            </button>
          )}
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
          {hud.isBossFight
            ? '이동 WASD · 달리기 Shift · 검 베기 좌클릭/Space · 손전등 F · 스킬 G'
            : '이동 WASD · 달리기 Shift · 손전등 F · 은신 C · 조사 E · 직업 스킬 G'}
        </div>
      </div>
    </div>
  );
};
