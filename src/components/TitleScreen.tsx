import React, { useState } from 'react';
import { BookOpen, KeyRound, Lock, Play, Skull, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { CHAPTERS, DifficultyMode, JOBS, JobId, MONSTERS, isChapterUnlocked, isJobUnlocked } from '../data/lore';

interface TitleScreenProps {
  selectedChapter: number;
  selectedJob: JobId;
  clearedChapters: number[];
  devUnlocked: boolean;
  difficulty: DifficultyMode;
  muted: boolean;
  onSelectChapter: (id: number) => void;
  onSelectJob: (job: JobId) => void;
  onUnlockDevWithCode: (code: string) => boolean;
  onSelectDifficulty: (mode: DifficultyMode) => void;
  onStartGame: () => void;
  onOpenCodex: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedChapter,
  selectedJob,
  clearedChapters,
  devUnlocked,
  difficulty,
  muted,
  onSelectChapter,
  onSelectJob,
  onUnlockDevWithCode,
  onSelectDifficulty,
  onStartGame,
  onOpenCodex,
  onToggleMute,
}) => {
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);

  const activeChapter = CHAPTERS.find((c) => c.id === selectedChapter) || CHAPTERS[0];
  const activeJob = JOBS.find((j) => j.id === selectedJob) || JOBS[0];

  const handleJobClick = (jobId: JobId) => {
    if (jobId === 'developer' && !devUnlocked) {
      setCodeInput('');
      setCodeError(false);
      setCodeModalOpen(true);
      return;
    }
    if (!isJobUnlocked(jobId, clearedChapters, devUnlocked)) return;
    onSelectJob(jobId);
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onUnlockDevWithCode(codeInput);
    if (ok) {
      setCodeModalOpen(false);
      setCodeError(false);
      onSelectJob('developer');
    } else {
      setCodeError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-8 bg-gradient-to-r from-[#050406]/94 via-[#050406]/78 to-[#050406]/35 overflow-y-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-6 shrink-0">
        <div className="font-display text-lg md:text-xl font-bold tracking-widest text-zinc-100 whitespace-nowrap shrink-0">
          THE MIMIC
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenCodex}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-[#0e0d12]/90 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-red-400" />
            <span>세계관 및 괴물 도감</span>
          </button>
          <button
            onClick={onToggleMute}
            className="flex items-center justify-center w-9 h-9 text-zinc-300 hover:text-white bg-[#0e0d12]/90 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors shrink-0 cursor-pointer"
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl w-full space-y-5 my-auto py-4">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-red-400">
            ROBLOX THE MIMIC · BOOK I: CONTROL
          </p>
          <h1 className="text-3xl md:text-5xl font-serif-kr font-black text-zinc-100 tracking-tight leading-tight text-balance">
            더 미믹: 지배의 서
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
            2021년 8월 7일, 실종된 6명의 친구들과 킨토루에게 납치된 어머니 케이코를 구하기 위해 마사시게 가문의 저주 속 이세계로 뛰어드는 생존 공포 게임.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 cols: Chapter Selection & Start Box */}
          <div className="lg:col-span-7 space-y-3">
            <p className="text-xs font-medium text-zinc-400">챕터 선택</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CHAPTERS.map((ch) => {
                const selected = ch.id === selectedChapter;
                const cleared = clearedChapters.includes(ch.id);
                const unlocked = isChapterUnlocked(ch.id, clearedChapters);
                return (
                  <button
                    key={ch.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && onSelectChapter(ch.id)}
                    className={`text-left p-3.5 rounded-md border transition-colors ${
                      !unlocked
                        ? 'bg-[#08070b]/75 border-zinc-800/50 text-zinc-500 cursor-not-allowed'
                        : selected
                          ? 'bg-red-950/65 border-red-700/80 text-zinc-100 cursor-pointer'
                          : 'bg-[#0b0a0e]/88 border-zinc-800/90 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={unlocked ? 'text-red-400 font-medium' : 'text-zinc-500 font-medium'}>
                        {ch.code}
                      </span>
                      {!unlocked ? (
                        <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : cleared ? (
                        <span className="text-emerald-400">클리어</span>
                      ) : null}
                    </div>
                    <div className={`text-sm font-serif-kr font-bold mt-1 ${unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                      {ch.title}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      {unlocked ? ch.location : `제${ch.id - 1}장 클리어 시 해금`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chapter Summary + Difficulty + Start CTA */}
            <div className="p-4 bg-[#0b0a0e]/92 border border-zinc-800/90 rounded-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div>
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <span>출현 마수</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-red-300 font-medium">
                      {activeChapter.monsters
                        .map((id) => MONSTERS.find((m) => m.id === id)?.name || id)
                        .join(', ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">{activeChapter.subtitle}</p>
                </div>

                {/* Difficulty Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded self-start">
                  <button
                    onClick={() => onSelectDifficulty('normal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficulty === 'normal'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    일반 모드
                  </button>
                  <button
                    onClick={() => onSelectDifficulty('nightmare')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      difficulty === 'nightmare'
                        ? 'bg-red-900 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Skull className="w-3 h-3" />
                    <span>악몽 모드</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-400">
                  선택된 직업: <span className="text-zinc-100 font-semibold">{activeJob.name}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-amber-300">{activeJob.activeSkillName}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={onOpenCodex}
                    className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    스토리 도감
                  </button>
                  <button
                    onClick={onStartGame}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-800 hover:bg-red-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>제{selectedChapter}장 시작하기</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 cols: Job Selection */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">직업 선택</p>
              <span className="text-xs text-zinc-500 font-mono-tabular">
                클리어 {clearedChapters.length}/4장
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
              {JOBS.map((job) => {
                const isSelected = selectedJob === job.id;
                const unlocked = isJobUnlocked(job.id, clearedChapters, devUnlocked);

                return (
                  <button
                    key={job.id}
                    onClick={() => handleJobClick(job.id)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      isSelected
                        ? 'bg-[#171117] border-red-600/80 text-zinc-100 cursor-pointer'
                        : !unlocked && job.unlockType !== 'code'
                          ? 'bg-[#09080c]/75 border-zinc-800/60 text-zinc-500 cursor-not-allowed'
                          : 'bg-[#0b0a0e]/88 border-zinc-800/90 text-zinc-300 hover:border-zinc-700 hover:text-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-serif-kr font-bold">{job.name}</span>
                      {!unlocked ? (
                        job.unlockType === 'code' ? (
                          <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )
                      ) : (
                        <Sparkles
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: job.accentColor }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      {!unlocked ? job.unlockLabel : job.activeSkillName}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active Job Detail Box */}
            <div className="p-3.5 bg-[#0b0a0e]/92 border border-zinc-800/90 rounded-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-100">{activeJob.name}</span>
                <span className="text-zinc-500">{activeJob.englishTitle}</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{activeJob.summary}</p>
              <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-xs">
                <p className="text-emerald-400">특성: {activeJob.passiveLabel}</p>
                <p className="text-amber-300">
                  액티브 [G] {activeJob.activeSkillName}: {activeJob.activeSkillDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls Guide */}
      <footer className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400 shrink-0">
        <div>조작: WASD 이동 · Shift 달리기 · F 손전등 · C 은신 · E 조사 · G 직업 스킬 · 마우스 시점</div>
        <div>헤드폰 착용을 권장합니다</div>
      </footer>

      {/* Secret Developer Passcode Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form
            onSubmit={handleSubmitCode}
            className="w-full max-w-sm bg-[#0b0a0f] border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100">
                <KeyRound className="w-4 h-4 text-red-400" />
                <h3 className="text-base font-serif-kr font-bold">개발자 인증</h3>
              </div>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              개발자 직업을 잠금 해제하려면 4자리 숫자 인증 코드를 입력하십시오.
            </p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setCodeError(false);
              }}
              placeholder="인증 코드 입력"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 focus:border-red-600 rounded text-sm font-mono-tabular text-white tracking-widest outline-none"
            />

            {codeError && (
              <p className="text-xs text-red-400">인증 코드가 일치하지 않습니다.</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 rounded cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded cursor-pointer"
              >
                잠금 해제
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
