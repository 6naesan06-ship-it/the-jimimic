import React, { useState } from 'react';
import { BookOpen, Users, Skull, FileText, X } from 'lucide-react';
import { CHAPTERS, CHARACTERS, DIARIES, MONSTERS } from '../data/lore';
import { MonsterPortrait } from './MonsterPortrait';

interface CodexModalProps {
  unlockedDiaryIds: string[];
  onClose: () => void;
}

type CodexTab = 'story' | 'characters' | 'monsters' | 'diaries';

export const CodexModal: React.FC<CodexModalProps> = ({ unlockedDiaryIds, onClose }) => {
  const [tab, setTab] = useState<CodexTab>('monsters');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-8">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[88vh] bg-[#0b0b0f] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#0e0e14]">
          <div>
            <p className="text-xs text-red-400 tracking-wider font-medium">
              THE MIMIC ARCHIVES
            </p>
            <h2 className="text-xl font-serif-kr font-bold text-zinc-100 mt-0.5">
              지배의 서 · 세계관 및 괴물 도감
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>닫기</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-800/70 bg-[#09090d] overflow-x-auto">
          <button
            onClick={() => setTab('monsters')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'monsters'
                ? 'bg-red-950/70 text-red-200 border border-red-800/70'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>괴물 도감 ({MONSTERS.length})</span>
          </button>
          <button
            onClick={() => setTab('characters')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'characters'
                ? 'bg-red-950/70 text-red-200 border border-red-800/70'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>등장인물 ({CHARACTERS.length})</span>
          </button>
          <button
            onClick={() => setTab('story')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'story'
                ? 'bg-red-950/70 text-red-200 border border-red-800/70'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>스토리 연대기</span>
          </button>
          <button
            onClick={() => setTab('diaries')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'diaries'
                ? 'bg-red-950/70 text-red-200 border border-red-800/70'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="font-mono-tabular">
              수집한 일지 ({unlockedDiaryIds.length}/{DIARIES.length})
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'monsters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {MONSTERS.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row bg-[#111117] border border-zinc-800/90 rounded-lg overflow-hidden"
                >
                  <MonsterPortrait
                    monsterId={m.id}
                    className="w-full sm:w-40 h-48 sm:h-auto shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-800/80"
                  />
                  <div className="p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                        <span>{m.bookOrigin}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-red-400">{m.dangerLevel}</span>
                      </div>
                      <h3 className="text-lg font-serif-kr font-bold text-zinc-100 mt-1">
                        {m.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{m.japaneseName}</p>
                      <p className="text-sm text-zinc-300 leading-relaxed mt-2.5">
                        {m.description}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-zinc-800/80">
                      <p className="text-xs font-medium text-amber-300/90">생존 공략</p>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                        {m.behaviorTip}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'characters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHARACTERS.map((char) => (
                <div
                  key={char.id}
                  className="p-5 bg-[#111117] border border-zinc-800/90 rounded-lg space-y-2.5"
                >
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <span>{char.role}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-red-400">{char.status}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-serif-kr font-bold text-zinc-100">
                      {char.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{char.japaneseName}</p>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{char.summary}</p>
                  <p className="text-xs italic text-zinc-400 pt-2 border-t border-zinc-800/70">
                    {char.quote}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'story' && (
            <div className="space-y-6">
              <div className="p-5 bg-[#111117] border border-zinc-800/90 rounded-lg space-y-2.5">
                <h3 className="text-base font-serif-kr font-bold text-red-300">
                  더 미믹(The Mimic) Book I: 지배의 서(Control) 배경 및 전체 줄거리
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  과거 야스의 선조인 사무라이 마사시게 쿠스노키가 네 마리의 악마(짐승) 중 하나인 ‘제어의 짐승’
                  킨토루(사마)를 봉인했다. 그 원한으로 킨토루는 마사시게 가문 대대로 저주를 걸어 가족들을
                  인형과 괴물로 만들기 시작했다. 저주를 피해 미국으로 이주했던 어머니 케이코마저 킨토루에게
                  납치되어 조종당하게 되고, 야스의 친구 6명도 실종된다.
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  2021년 8월 7일, 실종된 6명의 친구들을 찾아 폐교된 모교(LA 퀸타 고등학교)로 향한 야스는
                  아라리 마을·황궁·잊혀진 자의 영역·병원·벚꽃 늪을 거쳐 마침내 조상들을 소멸시키는 비극 끝에
                  축복받은 검을 얻는다. 최후의 결전에서 저주받은 부모(다쿠·케이코)를 뚫고 거미 형상 사이고모로
                  화한 킨토루를 쓰러뜨리며 가문의 오랜 저주를 끊어낸다.
                </p>
              </div>

              <div className="space-y-4">
                {CHAPTERS.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-5 bg-[#111117] border border-zinc-800/90 rounded-lg space-y-2"
                  >
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{ch.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ch.location}</span>
                    </div>
                    <h4 className="text-lg font-serif-kr font-bold text-zinc-100">{ch.title}</h4>
                    <div className="space-y-1.5 text-sm text-zinc-300 leading-relaxed">
                      {ch.introLines.map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'diaries' && (
            <div className="space-y-4">
              {DIARIES.map((d) => {
                const unlocked = unlockedDiaryIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    className={`p-5 border rounded-lg ${
                      unlocked
                        ? 'bg-[#111117] border-zinc-800'
                        : 'bg-[#09090c] border-zinc-800/50 opacity-70'
                    }`}
                  >
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>제{d.chapterId}장</span>
                      <span aria-hidden="true">·</span>
                      <span>{d.dateLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>작성자: {d.author}</span>
                    </div>
                    <h4 className="text-base font-serif-kr font-bold text-zinc-100 mt-1">
                      {unlocked ? d.title : '아직 발견하지 못한 기록'}
                    </h4>
                    {unlocked ? (
                      <div className="mt-2.5 space-y-1.5 text-sm text-zinc-300 leading-relaxed">
                        {d.content.map((p, idx) => (
                          <p key={idx}>{p}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">
                        제{d.chapterId}장 탐색 중 어딘가에 떨어진 노트를 [E] 키로 조사하면 해금됩니다.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
