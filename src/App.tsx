/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  CutsceneLine,
  DiaryEntry,
  DifficultyMode,
  JOBS,
  JobId,
  MONSTERS,
  MonsterId,
  getBookChapterOrder,
  isChapterUnlocked,
  isJobUnlocked,
} from './data/lore';
import { HudSnapshot, MimicEngine } from './game/MimicEngine';
import { soundEngine } from './game/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { CodexModal } from './components/CodexModal';
import { MonsterPortrait } from './components/MonsterPortrait';
import { KintoruControlOverlay } from './components/KintoruControlOverlay';

type ScreenState =
  | 'title'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'diary'
  | 'jumpscare'
  | 'dead'
  | 'clear';

const STORAGE_CLEARED_KEY = 'mimic_cleared_chapters';
const STORAGE_DEV_KEY = 'mimic_dev_unlocked';

const INITIAL_HUD: HudSnapshot = {
  stamina: 100,
  maxStamina: 100,
  battery: 200,
  maxBattery: 200,
  flashlightOn: true,
  crouching: false,
  collectedItems: 0,
  requiredItems: 4,
  exitUnlocked: false,
  nearestPrompt: null,
  nearestMonsterDist: 99,
  closestMonsterId: null,
  anyMonsterChasing: false,
  pointerLocked: false,
  elapsedSeconds: 0,
  jobId: 'student',
  skillCooldown: 0,
  maxSkillCooldown: 22,
  skillActive: false,
  studentTeleportCooldown: 0,
  maxStudentTeleportCooldown: 8,
  doctorReviveReady: false,
  nearestObjectiveDist: null,
  nearestObjectiveAngleDeg: null,
  isBossFight: false,
  playerHp: 100,
  playerMaxHp: 100,
  hurtFlash: 0,
  bossHp: 1000,
  bossMaxHp: 1000,
  bossStunTimer: 0,
  bossAttackWarning: null,
  bossHitsLanded: 0,
  finalChaseActive: false,
  finalChaseElapsed: 0,
  inChaseMap: false,
  carriedRat: 'none',
  kyogiEyesPierced: 0,
  kyogiEyesTotal: 0,
  kyogiImmobilized: false,
  difficulty: 'normal',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MimicEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('title');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedJob, setSelectedJob] = useState<JobId>('student');
  const [clearedChapters, setClearedChapters] = useState<number[]>([]);
  const [devUnlocked, setDevUnlocked] = useState<boolean>(false);
  const [hackerUnlocked, setHackerUnlocked] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<DifficultyMode>('normal');
  const [muted, setMuted] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [codexOpen, setCodexOpen] = useState<boolean>(false);
  const [unlockedDiaryIds, setUnlockedDiaryIds] = useState<string[]>([]);
  const [activeDiary, setActiveDiary] = useState<DiaryEntry | null>(null);
  const [killerMonster, setKillerMonster] = useState<MonsterId>('shizu');
  const [clearTimeSec, setClearTimeSec] = useState<number>(0);
  const [clearRewardText, setClearRewardText] = useState<string | null>(null);
  const [pickupToast, setPickupToast] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<CutsceneLine | null>(null);
  const [introSceneIdx, setIntroSceneIdx] = useState<number>(0);
  const [clearSceneIdx, setClearSceneIdx] = useState<number>(0);
  const [endingBranch, setEndingBranch] = useState<'good' | 'bad'>('good');
  const [kintoruControlActive, setKintoruControlActive] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const subtitleTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setPickupToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setPickupToast(null);
    }, 2800);
  }, []);

  const showSubtitle = useCallback((line: CutsceneLine) => {
    setSubtitle(line);
    if (subtitleTimerRef.current) window.clearTimeout(subtitleTimerRef.current);
    subtitleTimerRef.current = window.setTimeout(() => {
      setSubtitle(null);
    }, 5400);
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_CLEARED_KEY);
      localStorage.removeItem(STORAGE_DEV_KEY);
    } catch {
      // ignore storage errors
    }

    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new MimicEngine(mount, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onDiaryFound: (diary) => {
        setUnlockedDiaryIds((prev) =>
          prev.includes(diary.id) ? prev : [...prev, diary.id]
        );
        setActiveDiary(diary);
        setScreen('diary');
      },
      onJumpscare: (monsterId) => {
        setKintoruControlActive(false);
        setKillerMonster(monsterId);
        setScreen('jumpscare');
      },
      onPlayerDied: (monsterId) => {
        setKintoruControlActive(false);
        setKillerMonster(monsterId);
        setScreen('dead');
      },
      onChapterClear: (chId, elapsed) => {
        setKintoruControlActive(false);
        soundEngine.stopBgm();
        setClearTimeSec(elapsed);
        setClearSceneIdx(0);
        setEndingBranch('good');
        setSubtitle(null);
        setClearedChapters((prev) => {
          const isFirstClear = !prev.includes(chId);
          const next = isFirstClear ? [...prev, chId] : prev;
          const allCleared = [1, 2, 3, 4].every((id) => next.includes(id));

          if (isFirstClear) {
            if (chId === 1) {
              setClearRewardText(
                '제2장 「가문의 비밀과 진실」과 새로운 직업 ‘의사(Doctor)’가 해금되었습니다!'
              );
            } else if (chId === 2) {
              setClearRewardText(
                '제3장 「선조의 검과 희생」과 새로운 직업 ‘경찰(Police Officer)’이 해금되었습니다!'
              );
            } else if (chId === 3) {
              setClearRewardText(
                'Book I 최종장 제4장 「최후의 결전과 엔딩」이 해금되었습니다!'
              );
            } else if (chId === 4 && allCleared) {
              setClearRewardText(
                'Book I 제1~4장을 모두 클리어하고 사이고모를 쓰러뜨려 히든 직업 ‘퇴마사(Exorcist)’가 해금되었습니다! Book II 「질투의 서」에도 도전해 보세요.'
              );
            } else if (chId === 5) {
              setClearRewardText(
                'Book II 제1장 「아오가시마 섬의 추격」을 클리어했습니다! 제2~4장은 현재 출시 예정이며 1장 완성 후 순차 공개됩니다.'
              );
            } else if (chId === 6) {
              setClearRewardText(
                'Book II 제3장 「지옥(지고쿠)에서의 거래」가 해금되었습니다!'
              );
            } else if (chId === 7) {
              setClearRewardText(
                'Book II 최종장 제4장 「파괴된 도쿄와 최종 결전」이 해금되었습니다!'
              );
            } else if (chId === 8) {
              setClearRewardText(
                'Book II 「질투의 서」의 모든 장을 완주하고 ‘질투의 짐승’ 엔즈카이를 처단했습니다! 아래에서 굿 엔딩(정사)과 배드 엔딩(네타모)을 모두 확인해 보세요.'
              );
            } else {
              setClearRewardText(null);
            }
          } else {
            setClearRewardText(null);
          }

          return next;
        });
        setScreen('clear');
      },
      onItemCollected: (count, total, kind) => {
        if (kind === 'rat_feed') {
          if (count >= total) {
            showToast('미오와 린에게 독 쥐 3회 먹이기 완료!');
          } else {
            showToast(`미오와 린에게 독 쥐를 먹였습니다 (${count} / ${total})`);
          }
          return;
        }
        if (kind === 'kyogi_eye') {
          if (count >= total) {
            showToast('👁️ 쿄기의 눈을 모두 찔렀습니다! 쿄기가 움직일 수 없습니다!');
          } else {
            showToast(`👁️ 쿄기의 눈 찌르기 (${count} / ${total})`);
          }
          return;
        }
        if (count >= total) {
          showToast(
            kind === 'key'
              ? '열쇠 4개를 모두 모았습니다! 출구로 들어가 추격전을 돌파하십시오.'
              : '모든 봉인 아이템을 모았습니다! 붉은 도리이 출구로 들어가 추격전을 돌파하십시오.'
          );
        } else {
          showToast(`봉인 아이템 회수 (${count} / ${total})`);
        }
      },
      onSystemNotice: (message) => {
        showToast(message);
      },
      onSubtitle: (line) => {
        showSubtitle(line);
      },
      onKintoruControlChange: (active) => {
        setKintoruControlActive(active);
      },
    });

    engineRef.current = engine;

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (subtitleTimerRef.current) window.clearTimeout(subtitleTimerRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast, showSubtitle]);

  // Global keyboard shortcuts for Codex (Tab) and Pause (P / Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (codexOpen) {
          setCodexOpen(false);
          if (screen === 'paused') {
            engineRef.current?.setPaused(false);
            setScreen('playing');
          }
        } else if (screen === 'playing' || screen === 'title' || screen === 'paused') {
          if (screen === 'playing') {
            engineRef.current?.setPaused(true);
            setScreen('paused');
          }
          setCodexOpen(true);
        }
      } else if (e.code === 'KeyP') {
        if (screen === 'playing') {
          engineRef.current?.setPaused(true);
          setScreen('paused');
        } else if (screen === 'paused' && !codexOpen) {
          engineRef.current?.setPaused(false);
          setScreen('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, codexOpen]);

  const handleToggleMute = () => {
    soundEngine.init();
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const handleOpenIntro = () => {
    if (!isChapterUnlocked(selectedChapter, clearedChapters)) return;
    if (!isJobUnlocked(selectedJob, clearedChapters, devUnlocked, hackerUnlocked)) return;
    soundEngine.init();
    setIntroSceneIdx(0);
    setScreen('intro');
  };

  const handleUnlockSecretJob = (jobId: 'developer' | 'hacker', code: string): boolean => {
    if (code.trim() === '4751') {
      if (jobId === 'developer') setDevUnlocked(true);
      else setHackerUnlocked(true);
      return true;
    }
    return false;
  };

  const handleBeginChapter = (chapterId = selectedChapter) => {
    if (!isChapterUnlocked(chapterId, clearedChapters)) return;
    const jobToUse = isJobUnlocked(selectedJob, clearedChapters, devUnlocked, hackerUnlocked)
      ? selectedJob
      : 'student';
    soundEngine.init();
    setSelectedChapter(chapterId);
    setClearRewardText(null);
    setEndingBranch('good');
    setSubtitle(null);
    setKintoruControlActive(false);
    engineRef.current?.startChapter(chapterId, difficulty, jobToUse);
    setScreen('playing');
    engineRef.current?.requestPointerLock();
  };

  const handleResume = () => {
    engineRef.current?.setPaused(false);
    setScreen('playing');
    engineRef.current?.requestPointerLock();
  };

  const handleCloseDiary = () => {
    setActiveDiary(null);
    engineRef.current?.setPaused(false);
    setScreen('playing');
    engineRef.current?.requestPointerLock();
  };

  const handleReturnToTitle = () => {
    soundEngine.stopBgm();
    setActiveDiary(null);
    setCodexOpen(false);
    setSubtitle(null);
    setKintoruControlActive(false);
    engineRef.current?.buildTitleDiorama();
    setScreen('title');
  };

  const currentChapter = CHAPTERS.find((c) => c.id === selectedChapter) || CHAPTERS[0];
  const currentJobMeta = JOBS.find((j) => j.id === selectedJob) || JOBS[0];
  const killerLore = MONSTERS.find((m) => m.id === killerMonster) || MONSTERS[0];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050507] text-zinc-100">
      {/* Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          selectedChapter={selectedChapter}
          selectedJob={selectedJob}
          clearedChapters={clearedChapters}
          devUnlocked={devUnlocked}
          hackerUnlocked={hackerUnlocked}
          difficulty={difficulty}
          muted={muted}
          onSelectChapter={setSelectedChapter}
          onSelectJob={setSelectedJob}
          onUnlockSecretJob={handleUnlockSecretJob}
          onSelectDifficulty={setDifficulty}
          onStartGame={handleOpenIntro}
          onOpenCodex={() => setCodexOpen(true)}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Chapter Story Intro Cutscene */}
      {screen === 'intro' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/92 p-6">
          <div className="max-w-2xl w-full bg-[#0b0a0f] border border-zinc-800 rounded-lg p-7 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-red-400 font-medium tracking-wider">
                  {currentChapter.code} · {currentChapter.location} · 직업: {currentJobMeta.name}
                </p>
                <h2 className="text-2xl font-serif-kr font-bold text-zinc-100">
                  {currentChapter.title}
                </h2>
              </div>
              <span className="font-mono-tabular text-xs text-zinc-400 shrink-0">
                {Math.min(introSceneIdx + 1, currentChapter.introScenes.length)} /{' '}
                {currentChapter.introScenes.length}
              </span>
            </div>

            {/* Interactive Cutscene Dialogue Box */}
            {(() => {
              const scene =
                currentChapter.introScenes[introSceneIdx] ||
                currentChapter.introScenes[currentChapter.introScenes.length - 1];
              return (
                <div className="p-5 bg-[#121017] border border-zinc-800/90 rounded-md space-y-2.5 min-h-32 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="font-semibold"
                      style={{ color: scene.accent || '#f87171' }}
                    >
                      {scene.speaker}
                    </span>
                    {scene.speakerRole && (
                      <>
                        <span aria-hidden="true" className="text-zinc-600">
                          ·
                        </span>
                        <span className="text-zinc-400">{scene.speakerRole}</span>
                      </>
                    )}
                  </div>
                  <p className="text-base font-serif-kr text-zinc-100 leading-relaxed">
                    {scene.text}
                  </p>
                </div>
              );
            })()}

            <div className="p-3.5 bg-[#0e0d13] border border-zinc-800/80 rounded text-xs text-zinc-400 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-zinc-200 font-medium">
                  {currentChapter.id === 4
                    ? `결전 목표 · 축복받은 검으로 사이고모와 대결 (스턴 ${difficulty === 'nightmare' ? '2.4초' : '3초'} · 패배 후 추격전 맵)`
                    : currentChapter.id === 8
                      ? `결전 목표 · 백염으로 센자이를 해방하고 엔즈카이 소멸 (스턴 ${difficulty === 'nightmare' ? '2.4초' : '3초'} · 추격전 맵)`
                      : `생존 목표 · 괴물 추격 범위 ${difficulty === 'nightmare' ? '15.5m' : '12m'} · 출구 진입 시 추격전 맵 전환`}
                </p>
                {difficulty === 'nightmare' && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-red-950/90 border border-red-600/80 text-red-200 rounded">
                    ☠ 악몽 모드
                  </span>
                )}
              </div>
              <p>{currentChapter.objectiveLabel}</p>
              <p className="text-amber-300/90 pt-1">
                {currentJobMeta.name} 스킬 [G] ({currentJobMeta.activeSkillName}):{' '}
                {currentJobMeta.activeSkillDesc}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReturnToTitle}
                  className="px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
                >
                  뒤로 가기
                </button>
                {introSceneIdx < currentChapter.introScenes.length - 1 && (
                  <button
                    onClick={() => handleBeginChapter(selectedChapter)}
                    className="px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors cursor-pointer"
                  >
                    스킵하고 바로 시작
                  </button>
                )}
              </div>

              {introSceneIdx < currentChapter.introScenes.length - 1 ? (
                <button
                  onClick={() => setIntroSceneIdx((i) => i + 1)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
                >
                  다음 대사
                </button>
              ) : (
                <button
                  onClick={() => handleBeginChapter(selectedChapter)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
                >
                  어둠 속으로 들어가기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active First-Person HUD */}
      {screen === 'playing' && (
        <GameHUD
          chapter={currentChapter}
          hud={hud}
          muted={muted}
          pickupToast={pickupToast}
          subtitle={subtitle}
          onToggleMute={handleToggleMute}
          onOpenCodex={() => {
            engineRef.current?.setPaused(true);
            setScreen('paused');
            setCodexOpen(true);
          }}
          onOpenPause={() => {
            engineRef.current?.setPaused(true);
            setScreen('paused');
          }}
          onToggleFlashlight={() => engineRef.current?.toggleFlashlight()}
          onToggleCrouch={() => engineRef.current?.toggleCrouch()}
          onTriggerSkill={() => engineRef.current?.triggerJobSkill()}
          onTriggerStudentTeleport={() => engineRef.current?.triggerStudentTeleportSkill()}
          onSwordAttack={() => engineRef.current?.triggerSwordAttack()}
          onInteract={() => engineRef.current?.triggerInteract()}
          onLockPointer={() => engineRef.current?.requestPointerLock()}
        />
      )}

      {/* Chapter 2+ Kintoru Mind-Control Hand Touch QTE */}
      {kintoruControlActive && (screen === 'playing' || screen === 'paused') && (
        <KintoruControlOverlay
          paused={screen !== 'playing' || codexOpen}
          chapterId={selectedChapter}
          nightmare={difficulty === 'nightmare'}
          onComplete={(survived) => {
            engineRef.current?.resolveKintoruControl(survived);
          }}
        />
      )}

      {/* Diary Reader Overlay */}
      {screen === 'diary' && activeDiary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-6">
          <div className="max-w-lg w-full bg-[#13100e] border border-amber-900/50 rounded-lg p-7 space-y-5 shadow-2xl">
            <div className="border-b border-amber-900/40 pb-3">
              <p className="text-xs text-amber-400/90">
                {activeDiary.dateLabel} · 작성자: {activeDiary.author}
              </p>
              <h3 className="text-xl font-serif-kr font-bold text-amber-100 mt-1">
                {activeDiary.title}
              </h3>
            </div>
            <div className="space-y-3 text-sm text-stone-300 leading-relaxed font-serif-kr">
              {activeDiary.content.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCloseDiary}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
              >
                기록 접고 계속 탐색
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {screen === 'paused' && !codexOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-6">
          <div className="max-w-sm w-full bg-[#0b0b0f] border border-zinc-800 rounded-lg p-6 space-y-5">
            <div>
              <p className="text-xs text-red-400">일시정지</p>
              <h3 className="text-xl font-serif-kr font-bold text-zinc-100 mt-0.5">
                {currentChapter.title}
              </h3>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleResume}
                className="w-full py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
              >
                게임 계속하기
              </button>
              <button
                onClick={() => setCodexOpen(true)}
                className="w-full py-2.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
              >
                세계관 및 괴물 도감 열기
              </button>
              <button
                onClick={() => handleBeginChapter(selectedChapter)}
                className="w-full py-2.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
              >
                현재 챕터 처음부터 다시하기
              </button>
              <button
                onClick={handleReturnToTitle}
                className="w-full py-2.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors cursor-pointer"
              >
                타이틀 화면으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jumpscare Overlay */}
      {screen === 'jumpscare' && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-red-950/35">
          <div className="animate-jumpscare w-64 h-80 opacity-85">
            <MonsterPortrait
              monsterId={killerMonster}
              className="w-full h-full rounded-full border-2 border-red-700/70"
            />
          </div>
        </div>
      )}

      {/* Death Screen */}
      {screen === 'dead' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060305]/94 p-6">
          <div className="max-w-xl w-full bg-[#0e090c] border border-red-900/60 rounded-lg overflow-hidden shadow-2xl flex flex-col sm:flex-row">
            <MonsterPortrait
              monsterId={killerLore.id}
              className="w-full sm:w-48 h-52 sm:h-auto shrink-0 border-b sm:border-b-0 sm:border-r border-red-900/40"
            />
            <div className="p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 tracking-wider">
                  YOU WERE CAUGHT · 사망
                </p>
                <h2 className="text-2xl font-serif-kr font-black text-zinc-100">
                  {killerLore.name}에게 붙잡혔습니다
                </h2>
                <p className="text-xs text-zinc-400">{killerLore.japaneseName}</p>
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <p className="text-xs font-medium text-amber-300">대처 요령</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {killerLore.behaviorTip}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleBeginChapter(selectedChapter)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
                >
                  제{getBookChapterOrder(selectedChapter)}장 다시 도전
                </button>
                <button
                  onClick={handleReturnToTitle}
                  className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
                >
                  타이틀 화면
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Clear / Story Ending Cutscene Screen */}
      {screen === 'clear' && (() => {
        const hasBadEnding =
          selectedChapter === 8 && Boolean(currentChapter.badClearScenes?.length);
        const activeClearTitle =
          hasBadEnding && endingBranch === 'bad' && currentChapter.badClearTitle
            ? currentChapter.badClearTitle
            : currentChapter.clearTitle;
        const activeClearScenes =
          hasBadEnding && endingBranch === 'bad' && currentChapter.badClearScenes
            ? currentChapter.badClearScenes
            : currentChapter.clearScenes;
        const scene =
          activeClearScenes[clearSceneIdx] ||
          activeClearScenes[activeClearScenes.length - 1];

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-6">
            <div className="max-w-2xl w-full bg-[#0b0b0f] border border-zinc-800 rounded-lg p-7 space-y-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-emerald-400 font-medium tracking-wider">
                    BOOK {selectedChapter >= 5 ? 'II' : 'I'} · CHAPTER {getBookChapterOrder(selectedChapter)} CLEARED
                    {difficulty === 'nightmare' ? ' · ☠ 악몽 모드' : ''} · 소요 시간{' '}
                    <span className="font-mono-tabular">
                      {Math.floor(clearTimeSec / 60)}분 {Math.floor(clearTimeSec % 60)}초
                    </span>
                  </p>
                  <h2 className="text-2xl font-serif-kr font-black text-zinc-100">
                    {activeClearTitle}
                  </h2>
                </div>
                <span className="font-mono-tabular text-xs text-zinc-400 shrink-0">
                  {Math.min(clearSceneIdx + 1, activeClearScenes.length)} /{' '}
                  {activeClearScenes.length}
                </span>
              </div>

              {hasBadEnding && (
                <div className="flex items-center gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-md">
                  <button
                    onClick={() => {
                      setEndingBranch('good');
                      setClearSceneIdx(0);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      endingBranch === 'good'
                        ? 'bg-emerald-900/80 text-emerald-100 border border-emerald-600/70'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    굿 엔딩 (정사 루트 · 센자이 구원과 희생)
                  </button>
                  <button
                    onClick={() => {
                      setEndingBranch('bad');
                      setClearSceneIdx(0);
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      endingBranch === 'bad'
                        ? 'bg-purple-950/90 text-purple-100 border border-purple-600/70'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    배드 엔딩 (저주 굴복 · 엔즈카이 &amp; 네타모)
                  </button>
                </div>
              )}

              <div className="p-5 bg-[#121017] border border-zinc-800/90 rounded-md space-y-2.5 min-h-32 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="font-semibold"
                    style={{ color: scene.accent || '#34d399' }}
                  >
                    {scene.speaker}
                  </span>
                  {scene.speakerRole && (
                    <>
                      <span aria-hidden="true" className="text-zinc-600">
                        ·
                      </span>
                      <span className="text-zinc-400">{scene.speakerRole}</span>
                    </>
                  )}
                </div>
                <p className="text-base font-serif-kr text-zinc-100 leading-relaxed">
                  {scene.text}
                </p>
              </div>

              {clearRewardText && clearSceneIdx >= activeClearScenes.length - 1 && (
                <div className="p-4 bg-amber-950/50 border border-amber-700/70 rounded-md space-y-1">
                  <p className="text-xs font-semibold text-amber-300">새로운 해금 보상</p>
                  <p className="text-xs text-amber-100 leading-relaxed">{clearRewardText}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleReturnToTitle}
                  className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
                >
                  타이틀로 돌아가기
                </button>

                {clearSceneIdx < activeClearScenes.length - 1 ? (
                  <button
                    onClick={() => setClearSceneIdx((i) => i + 1)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
                  >
                    다음 장면 보기
                  </button>
                ) : selectedChapter === 4 ? (
                  <button
                    onClick={() => {
                      setSelectedChapter(5);
                      setIntroSceneIdx(0);
                      setScreen('intro');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-600 rounded transition-colors cursor-pointer"
                  >
                    Book II: 질투의 서 제1장 시작하기
                  </button>
                ) : (() => {
                  const nextChapter = CHAPTERS.find((c) => c.id === selectedChapter + 1);
                  if (nextChapter && !nextChapter.comingSoon) {
                    return (
                      <button
                        onClick={() => {
                          const nextId = selectedChapter + 1;
                          setSelectedChapter(nextId);
                          setIntroSceneIdx(0);
                          setScreen('intro');
                        }}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors cursor-pointer"
                      >
                        제{getBookChapterOrder(selectedChapter + 1)}장으로 계속하기
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => setCodexOpen(true)}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                    >
                      {nextChapter?.comingSoon
                        ? '제2~4장 출시 예정 · 도감 보기'
                        : '전체 도감 및 기록 확인하기'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lore & Monster Codex Modal */}
      {codexOpen && (
        <CodexModal
          unlockedDiaryIds={unlockedDiaryIds}
          onClose={() => {
            setCodexOpen(false);
            if (screen === 'paused') {
              engineRef.current?.setPaused(false);
              setScreen('playing');
            }
          }}
        />
      )}
    </div>
  );
}
