export type BookId = 1 | 2;
export type MonsterId =
  | 'shizu'
  | 'biwaki'
  | 'megumi'
  | 'oomukade'
  | 'saigomo'
  | 'keiko'
  | 'kyogi'
  | 'nure'
  | 'hyakume'
  | 'nagisa'
  | 'kuishinbo'
  | 'rin_mio'
  | 'jigoku_warden'
  | 'senzai_fallen'
  | 'enzukai';
export type DifficultyMode = 'normal' | 'nightmare';
export type JobId = 'student' | 'doctor' | 'police' | 'exorcist' | 'developer' | 'hacker';

export interface JobMeta {
  id: JobId;
  name: string;
  englishTitle: string;
  unlockType: 'free' | 'clear_1' | 'clear_2' | 'clear_all' | 'code';
  unlockLabel: string;
  summary: string;
  passiveLabel: string;
  activeSkillName: string;
  activeSkillDesc: string;
  cooldownSec: number;
  accentColor: string;
}

export const JOBS: JobMeta[] = [
  {
    id: 'student',
    name: '학생',
    englishTitle: 'Student',
    unlockType: 'free',
    unlockLabel: '기본 해금',
    summary: 'LA 퀸타 고교의 구조에 익숙하며 빠른 발놀림과 공간 감각으로 아이템을 찾아 빠져나가는 생존자입니다.',
    passiveLabel: '배터리 200 · 이동 속도 +15% · 스태미나 130(+35%) · [Q] 아이템 순간이동',
    activeSkillName: '질주 본능',
    activeSkillDesc: '[G] 5초간 무제한 질주 / [Q] 가장 가까운 아이템 앞으로 순간이동 (쿨타임 8초).',
    cooldownSec: 22,
    accentColor: '#3b82f6',
  },
  {
    id: 'doctor',
    name: '의사',
    englishTitle: 'Doctor',
    unlockType: 'clear_1',
    unlockLabel: '제1장 클리어 시 해금',
    summary: '극한의 공포 속에서도 심박을 통제하고 응급 처치로 죽음의 문턱에서 살아남습니다.',
    passiveLabel: '배터리 200 · 은신 소음 -25% · 챕터당 1회 치명타 자동 회피(응급 처치)',
    activeSkillName: '아드레날린 주사',
    activeSkillDesc: '즉시 스태미나를 100% 회복하고 손전등 배터리를 25%(+50) 충전합니다.',
    cooldownSec: 32,
    accentColor: '#10b981',
  },
  {
    id: 'police',
    name: '경찰',
    englishTitle: 'Police Officer',
    unlockType: 'clear_2',
    unlockLabel: '제2장 클리어 시 해금',
    summary: '6명의 실종 사건을 수사하기 위해 투입된 현장 형사로 강력한 장비와 섬광탄을 지녔습니다.',
    passiveLabel: '배터리 200 · 고성능 전술 손전등(배터리 소모 -30% · 광량 강화)',
    activeSkillName: '전술 섬광탄',
    activeSkillDesc: '12.5m 이내의 괴물에게 강렬한 섬광을 터뜨려 3.5초간 경직시킵니다.',
    cooldownSec: 28,
    accentColor: '#0ea5e9',
  },
  {
    id: 'exorcist',
    name: '퇴마사',
    englishTitle: 'Hidden · Exorcist',
    unlockType: 'clear_all',
    unlockLabel: '제1~4장 모두 클리어 시 해금',
    summary: '마사시게 가문의 비술과 성스러운 부적으로 제어의 저주를 간파하고 악령의 움직임을 묶는 히든 직업입니다.',
    passiveLabel: '배터리 200 · 가장 가까운 목표 방향 나침반 · 배터리 소모 -45%',
    activeSkillName: '정화의 오후다',
    activeSkillDesc: '15m 이내의 모든 괴물을 5초간 제자리에 봉인해 움직임을 멈춥니다.',
    cooldownSec: 24,
    accentColor: '#f59e0b',
  },
  {
    id: 'developer',
    name: '개발자',
    englishTitle: 'Secret · Developer',
    unlockType: 'code',
    unlockLabel: '비밀 코드로 잠금 해제',
    summary: '인증 코드를 통해 봉인된 절대 관리자 권한. 사망 면역과 초광속 기동, 원격 봉인 회수 능력을 가집니다.',
    passiveLabel: '사망 완전 면역(무적) · 야간 투시 · 무한 스태미나/배터리 · 이속 +65% · 나침반',
    activeSkillName: '시스템 지배',
    activeSkillDesc: '전체 괴물 12초 정지 + 가장 가까운 목표 1개 즉시 원격 회수 (모두 회수 시 출구 앞 순간이동).',
    cooldownSec: 4,
    accentColor: '#ef4444',
  },
  {
    id: 'hacker',
    name: '해커',
    englishTitle: 'Secret · Hacker',
    unlockType: 'code',
    unlockLabel: '비밀 코드로 잠금 해제',
    summary: '비밀 코드로 봉인된 최강 사이버 침투자. 방화벽 무적, 초고속 기동, 맵 전체 봉인 일괄 해킹 능력을 지닙니다.',
    passiveLabel: '방화벽 무적(사망 면역) · 야간 투시 · 무한 스태미나/배터리 · 이속 +75% · 검 피해 2배 · 나침반',
    activeSkillName: '시스템 백도어',
    activeSkillDesc: '전 괴물 15초 마비 + 남은 봉인 일괄 해킹 (해제 후 사용 시 출구 순간이동) / 4장 보스 결계 즉시 파괴(-250 HP · 5초 스턴).',
    cooldownSec: 4,
    accentColor: '#22d3ee',
  },
];

export function getBookIdForChapter(chapterId: number): BookId {
  return chapterId >= 5 ? 2 : 1;
}

export function getBookChapterOrder(chapterId: number): number {
  return chapterId >= 5 ? chapterId - 4 : chapterId;
}

export function isChapterUnlocked(chapterId: number, clearedChapters: number[]): boolean {
  if (chapterId >= 6) return false;
  if (chapterId <= 1 || chapterId === 5) return true;
  return clearedChapters.includes(chapterId - 1);
}

export function isJobUnlocked(
  jobId: JobId,
  clearedChapters: number[],
  devUnlocked: boolean,
  hackerUnlocked = false
): boolean {
  if (jobId === 'student') return true;
  if (jobId === 'doctor') return clearedChapters.includes(1);
  if (jobId === 'police') return clearedChapters.includes(2);
  if (jobId === 'exorcist') return [1, 2, 3, 4].every((id) => clearedChapters.includes(id));
  if (jobId === 'developer') return devUnlocked;
  if (jobId === 'hacker') return hackerUnlocked;
  return false;
}

export interface CutsceneLine {
  speaker: string;
  speakerRole?: string;
  accent?: string;
  text: string;
}

export interface ChapterSubtitles {
  onStart: CutsceneLine;
  onFirstItem: CutsceneLine;
  onHalfItem: CutsceneLine;
  onAllItems: CutsceneLine;
  onFirstChase: CutsceneLine;
  onEscapeChase: CutsceneLine;
}

export interface ChapterMeta {
  id: number;
  bookId?: BookId;
  comingSoon?: boolean;
  code: string;
  title: string;
  subtitle: string;
  location: string;
  objectiveLabel: string;
  requiredItems: number;
  itemNoun: string;
  monsters: MonsterId[];
  introLines: string[];
  introScenes: CutsceneLine[];
  clearTitle: string;
  clearLines: string[];
  clearScenes: CutsceneLine[];
  badClearTitle?: string;
  badClearScenes?: CutsceneLine[];
  subtitles: ChapterSubtitles;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  themeAccent: string;
}

export interface CharacterLore {
  id: string;
  bookId?: BookId;
  name: string;
  japaneseName: string;
  role: string;
  status: string;
  summary: string;
  quote: string;
}

export interface MonsterLore {
  id: MonsterId;
  bookId?: BookId;
  name: string;
  japaneseName: string;
  bookOrigin: string;
  title: string;
  dangerLevel: string;
  chapterAppearance: string;
  description: string;
  behaviorTip: string;
  accentColor: string;
}

export interface DiaryEntry {
  id: string;
  bookId?: BookId;
  chapterId: number;
  title: string;
  author: string;
  dateLabel: string;
  content: string[];
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 1,
    code: 'Book I · Chapter I',
    title: '제1장: 실종과 이세계 진입',
    subtitle: '2021년 8월 7일 · LA 퀸타 고교와 아라리 이세계',
    location: 'LA 퀸타 고등학교 지하 · 아라리 마을 회랑',
    objectiveLabel: '실종된 친구들의 단서(열쇠) 4개를 모아 이세계 출구를 여십시오',
    requiredItems: 4,
    itemNoun: '교실 열쇠',
    monsters: ['shizu', 'biwaki'],
    introLines: [
      '2021년 8월 7일, 야스는 실종된 6명의 친구들을 찾기 위해 폐교된 모교(LA 퀸타 고등학교)로 들어섰다.',
      '어머니 케이코까지 킨토루에게 납치되어 조종당하고 있다는 불길한 징조 속에, 학교 지하는 기괴한 이세계(아라리 마을·호텔)로 이어져 있었다.',
      '현실을 모방한 복도를 배회하는 시즈, 비와키, 쿠리코의 추격을 피해 출구의 봉인을 풀어야 한다.'
    ],
    introScenes: [
      {
        speaker: '프롤로그 · 마사시게 가문의 저주',
        speakerRole: '배경 설화',
        accent: '#f59e0b',
        text: '과거 사무라이 마사시게 쿠스노키가 네 마리의 악마 중 하나인 ‘제어의 짐승’ 킨토루(사마)를 봉인했다. 그 원한으로 킨토루는 가문 대대로 저주를 내려 가족들을 괴물로 만들기 시작했다.',
      },
      {
        speaker: '야스',
        speakerRole: '주인공 · 2021년 8월 7일',
        accent: '#60a5fa',
        text: '“저주를 피해 미국으로 이주했던 어머니 케이코까지 킨토루에게 납치당해 조종당하고 있어… 게다가 6명의 친구들마저 이 LA 퀸타 고등학교에서 실종되다니…”',
      },
      {
        speaker: '야스',
        speakerRole: '이세계 진입',
        accent: '#60a5fa',
        text: '“학교 지하 문을 열자 아라리 마을과 호텔을 닮은 기괴한 공간으로 빨려 들어왔다. 시즈와 비와키, 쿠리코가 배회하고 있어… 어서 열쇠 4개를 찾아야 해!”',
      },
    ],
    clearTitle: '지하실 문 돌파 · 이세계 깊은 곳으로',
    clearLines: [
      '네 개의 열쇠로 굳게 잠겨 있던 육중한 지하실 철문을 열자 아라리 마을 너머의 거대한 황궁과 병원이 모습을 드러냈다.',
      '야스는 친구들이 아직 살아 있으리라는 희망을 품고 지하실 문 너머 어둠 속으로 발을 내디뎠다.'
    ],
    clearScenes: [
      {
        speaker: '야스',
        speakerRole: 'Chapter I 탈출',
        accent: '#60a5fa',
        text: '“지하실 문이 열렸어…! 하지만 여기가 끝이 아니야. 문 너머로 황궁과 낡은 병원의 기운이 느껴져.”',
      },
      {
        speaker: '시즈 (원령의 속삭임)',
        speakerRole: '이세계의 추적자',
        accent: '#ef4444',
        text: '“아무리 도망쳐 봐야… 킨토루 님의 손바닥 안이야. 네 친구들이 어떻게 되었는지 곧 알게 될 거다…”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '2021년 8월 7일… LA 퀸타 고교가 이세계와 이어졌어. 열쇠 4개를 찾고 괴물로부터 12m 밖으로 피해야 해.',
      },
      onFirstItem: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '첫 번째 열쇠를 찾았어. 실종된 6명의 친구들 중 누군가가 여길 지나갔어.',
      },
      onHalfItem: {
        speaker: '야스',
        accent: '#f59e0b',
        text: '절반 모았어… 시즈와 비와키가 근처에 있어. 손전등을 끄면 들키기 쉽지 않아.',
      },
      onAllItems: {
        speaker: '야스',
        accent: '#10b981',
        text: '열쇠 4개를 모두 모았어! 봉인이 풀린 지하실 문 출구로 달려!',
      },
      onFirstChase: {
        speaker: '야스',
        accent: '#ef4444',
        text: '젠장, 들켰어! 복도를 꺾어서 12m 이상 거리를 벌려야 추격을 멈춘다!',
      },
      onEscapeChase: {
        speaker: '야스',
        accent: '#94a3b8',
        text: '12m 밖으로 벗어났어… 추적이 끊겼다. 숨을 고르자.',
      },
    },
    fogColor: 0x020306,
    fogDensity: 0.102,
    ambientColor: 0x0b0e14,
    themeAccent: '#dc2626',
  },
  {
    id: 2,
    code: 'Book I · Chapter II',
    title: '제2장: 가문의 비밀과 진실',
    subtitle: '황궁 · 잊혀진 자의 영역 · 병원과 조상들의 비극',
    location: '황궁 회랑 · 잊혀진 자의 영역 · 병원',
    objectiveLabel: '저주받은 조상의 인형 부적 5장을 모아 가문의 진실이 담긴 문을 여십시오',
    requiredItems: 5,
    itemNoun: '조상의 기억 부적',
    monsters: ['megumi', 'biwaki'],
    introLines: [
      '황궁과 잊혀진 자의 영역, 음산한 병원을 헤매던 야스는 킨토루의 냉혹한 목소리를 듣는다.',
      '실종되었던 6명의 친구들은 이미 킨토루에게 잡아먹혔다는 충격적인 진실, 그리고 이 모든 공포가 선조 마사시게 쿠스노키의 죄값을 치르는 과정이라는 사실.',
      '지금 자신을 습격하는 괴물 메구미 등이 사실은 저주받아 인형이 된 자신의 조상들이었다는 것을 알게 된다.'
    ],
    introScenes: [
      {
        speaker: '킨토루 (사마)',
        speakerRole: '제어의 짐승',
        accent: '#ef4444',
        text: '“아직도 친구들을 찾고 있느냐, 야스? 네가 그토록 찾아 헤매던 6명의 친구들은 이미 내 뱃속으로 사라진 지 오래다.”',
      },
      {
        speaker: '야스',
        speakerRole: '충격과 혼란',
        accent: '#60a5fa',
        text: '“거짓말… 그럴 리 없어…! 대체 왜 나한테 이런 짓을 하는 거야?!”',
      },
      {
        speaker: '킨토루 (사마)',
        speakerRole: '가문의 비밀 폭로',
        accent: '#ef4444',
        text: '“너희 선조 마사시게 쿠스노키가 나를 봉인한 죄값이다. 이 황궁과 병원에서 너를 찢어발기려 하는 인형 괴물 메구미 역시, 저주받은 네 자신의 조상이지.”',
      },
      {
        speaker: '야스',
        speakerRole: '생존의 의지',
        accent: '#60a5fa',
        text: '“내 조상들이 저주받아 인형이 되었다고…? 미안하지만 멈출 수 없어. 부적 5장을 모아 어머니와 아버지까지 구할 방법을 찾아야 해.”',
      },
    ],
    clearTitle: '잊혀진 자의 영역 돌파 · 선조의 부름',
    clearLines: [
      '다섯 장의 부적이 불타오르며 황궁과 병원 너머 벚꽃 늪으로 향하는 결계가 열렸다.',
      '그 순간 야스의 귓가에 고대 사무라이 선조 ‘마사시게 쿠스노키’의 장엄한 영혼의 목소리가 울려 퍼졌다.'
    ],
    clearScenes: [
      {
        speaker: '야스',
        speakerRole: '진실 직면',
        accent: '#60a5fa',
        text: '“친구들을 지키지 못했어… 하지만 내 혈통에 걸린 이 저주만은 반드시 내 손으로 끝내겠어.”',
      },
      {
        speaker: '마사시게 쿠스노키의 영혼',
        speakerRole: '야스의 선조',
        accent: '#f59e0b',
        text: '“내 후손 야스여… 내 업보 때문에 네가 피눈물을 흘리게 되었구나. 벚꽃 늪과 저택으로 오너라. 그곳에 킨토루를 베어 넘길 ‘축복받은 검’이 숨겨져 있다.”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '여긴 황궁과 잊혀진 자의 영역… 나를 쫓는 인형 괴물들이 전부 내 조상님들이었다니…',
      },
      onFirstItem: {
        speaker: '메구미 (조상의 원념)',
        accent: '#a855f7',
        text: '“미안해… 내 후손아… 킨토루의 저주가 내 몸을 인형으로 묶어 놓았어…”',
      },
      onHalfItem: {
        speaker: '킨토루',
        accent: '#ef4444',
        text: '“선조의 죄를 대물림한 핏줄이여, 병원 복도 끝에서 네 친구들의 뒤를 따르거라.”',
      },
      onAllItems: {
        speaker: '야스',
        accent: '#10b981',
        text: '부적 5장이 모두 모였어! 출구 도리이로 나가서 선조 쿠스노키의 흔적을 찾자.',
      },
      onFirstChase: {
        speaker: '야스',
        accent: '#ef4444',
        text: '조상 메구미의 인형이 덮쳐온다! 코너를 돌아 12m 밖으로 피해야 해!',
      },
      onEscapeChase: {
        speaker: '야스',
        accent: '#94a3b8',
        text: '겨우 시야에서 벗어났어… 미안해요, 메구미 조상님.',
      },
    },
    fogColor: 0x030205,
    fogDensity: 0.114,
    ambientColor: 0x0d070e,
    themeAccent: '#b91c1c',
  },
  {
    id: 3,
    code: 'Book I · Chapter III',
    title: '제3장: 선조의 검과 희생',
    subtitle: '벚꽃 늪 · 저택 · 지네 형상 오오무카데와 나비 영혼',
    location: '벚꽃 늪 · 쿠스노키 선조의 저택',
    objectiveLabel: '나비 영혼 등불 5개를 제물로 바쳐 문을 열고 축복받은 검을 얻으십시오',
    requiredItems: 5,
    itemNoun: '나비 영혼 등불',
    monsters: ['oomukade', 'megumi'],
    introLines: [
      '선조 마사시게 쿠스노키의 영혼으로부터 킨토루를 처단할 수 있는 ‘축복받은 검’의 존재를 알게 된 야스.',
      '야스는 벚꽃이 흩날리는 늪과 저택을 지나 거대한 지네 형상의 킨토루, 오오무카데(Oomukade)와 마주한다.',
      '그러나 앞으로 나아갈 문을 열기 위해 야스는 나비로 형상화된 조상들의 영혼을 제물로 바치며 직접 소멸시키는 비극을 겪는다.'
    ],
    introScenes: [
      {
        speaker: '마사시게 쿠스노키의 영혼',
        speakerRole: '선조의 계시',
        accent: '#f59e0b',
        text: '“야스여, 벚꽃 늪 너머 저택에 봉인된 축복받은 검을 손에 넣어야만 킨토루를 벨 수 있다. 허나 저주의 문을 열려면 늪을 맴도는 나비 영혼들을 바쳐야만 하느니라…”',
      },
      {
        speaker: '야스',
        speakerRole: '잔혹한 선택',
        accent: '#60a5fa',
        text: '“잠깐만요… 그 나비 영혼들이 전부 저주에 묶인 우리 조상님들이잖아요! 내 손으로 조상님들을 완전히 소멸시켜야 한다는 건가요?!”',
      },
      {
        speaker: '오오무카데 (지네 킨토루)',
        speakerRole: '제어의 지네 화신',
        accent: '#ef4444',
        text: '“쿠하하하! 살아남고 싶다면 네 피붙이의 영혼마저 불태워 바쳐 보아라, 마사시게의 후손아!”',
      },
    ],
    clearTitle: '축복받은 검 획득 · 조상들의 안식',
    clearLines: [
      '마지막 나비 영혼이 빛을 다해 소멸하며 제단의 문이 열렸고, 야스는 마침내 킨토루를 베어 넘길 축복받은 검을 손에 쥐었다.',
      '하지만 그 순간, 부모님 다쿠와 케이코마저 위험에 처해 있다는 불길한 예감이 야스를 덮쳤다.'
    ],
    clearScenes: [
      {
        speaker: '나비 영혼 (메구미와 조상들)',
        speakerRole: '소멸하며 남긴 빛',
        accent: '#f472b6',
        text: '“슬퍼하지 마라, 야스… 우리를 소멸시킨 것이 아니라 영원한 저주에서 해방시켜 준 것이란다. 이 검으로 킨토루를 끝내거라…”',
      },
      {
        speaker: '야스',
        speakerRole: '축복받은 검 획득',
        accent: '#60a5fa',
        text: '“손에 잡혔다… 마사시게 쿠스노키의 축복받은 검! …잠깐, 어머니 케이코와 아버지 다쿠까지 지금 본가에서 킨토루에게 완전히 잠식당하고 있어!”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '여기가 벚꽃 늪과 저택… 나비 영혼 5개를 모아 문을 열고 축복받은 검을 얻어야 해.',
      },
      onFirstItem: {
        speaker: '야스',
        accent: '#f472b6',
        text: '나비 영혼 하나가 문에 스며들며 사라졌어… 내 손으로 조상님을 소멸시키다니…',
      },
      onHalfItem: {
        speaker: '마사시게 쿠스노키',
        accent: '#f59e0b',
        text: '“망설이지 마라, 야스. 오오무카데의 지네 다리 소리가 가까워지고 있다!”',
      },
      onAllItems: {
        speaker: '야스',
        accent: '#10b981',
        text: '모든 나비 영혼의 힘이 검의 봉인을 풀었어! 어서 출구 도리이로 빠져나가자!',
      },
      onFirstChase: {
        speaker: '오오무카데',
        accent: '#ef4444',
        text: '“기어가는 지네의 발톱을 피해 12m 밖으로 도망칠 수 있을 것 같으냐!”',
      },
      onEscapeChase: {
        speaker: '야스',
        accent: '#94a3b8',
        text: '12m 이상 거리를 벌렸어… 벚꽃 나무 뒤로 몸을 숨기자.',
      },
    },
    fogColor: 0x060205,
    fogDensity: 0.106,
    ambientColor: 0x10070d,
    themeAccent: '#db2777',
  },
  {
    id: 4,
    code: 'Book I Finale · Chapter IV',
    title: '제4장: 거대한 동굴 · 최후의 결전',
    subtitle: '지하 대동굴 둥지 · 축복받은 검으로 맞서 싸우는 거미 사이고모',
    location: '킨토루의 지하 대동굴 (사이고모의 둥지)',
    objectiveLabel: '축복받은 검(좌클릭 / Space)으로 사이고모를 직접 베어 쓰러뜨리십시오 (약 20회 타격)',
    requiredItems: 0,
    itemNoun: '보스 토벌',
    monsters: ['saigomo', 'keiko'],
    introLines: [
      '축복받은 검을 손에 쥔 야스는 저주받은 부모님의 흔적을 따라 킨토루가 도사리는 거대한 지하 동굴에 도달한다.',
      '동굴 깊은 곳에서는 ‘제어의 결계’를 두른 거미 형상 ‘사이고모(Saigomo)’로 변모한 킨토루와, 조종당하는 어머니 케이코가 기다리고 있었다.',
      '사이고모는 스턴 상태일 때만 피해를 입는다! 화려하고 치명적인 5가지 맹공을 피하면서 공격 준비 패링·암벽 충돌·오의 후 과열로 3초 스턴을 끌어내 검으로 베어라!'
    ],
    introScenes: [
      {
        speaker: '야스',
        speakerRole: '지하 대동굴 진입',
        accent: '#60a5fa',
        text: '“학교 지하도, 저택도 아니야… 피의 웅덩이와 붉은 수정이 솟은 거대한 동굴 깊숙이 제어의 짐승 킨토루가 숨어 있어.”',
      },
      {
        speaker: '케이코 (조종당하는 어머니)',
        speakerRole: '킨토루의 실에 묶인 몸',
        accent: '#f43f5e',
        text: '“크으으… 야스… 어서 도망쳐… 사이고모가 거대한 동굴 안에서 네 검을 부수려 기다리고 있어…!”',
      },
      {
        speaker: '사이고모 (거미 킨토루)',
        speakerRole: '제어의 짐승 본체',
        accent: '#ef4444',
        text: '“마사시게의 후손아! 네 선조의 검으로 나를 벨 수 있을 것 같으냐? 이 지하 대동굴이 곧 네 무덤이 될 것이다!”',
      },
    ],
    clearTitle: '사이고모 토벌 · 마사시게 가문의 저주 해방',
    clearLines: [
      '거대한 지하 동굴을 울리는 일격 끝에 야스의 축복받은 검이 거미 형상 킨토루 ‘사이고모’의 핵을 베어 가르고 쓰러뜨렸다.',
      '사이고모가 소멸하자 동굴이 무너지며 마사시게 쿠스노키 가문을 괴롭히던 오랜 제어의 저주가 마침내 끊어졌다.'
    ],
    clearScenes: [
      {
        speaker: '사이고모 (킨토루)',
        speakerRole: '제어의 짐승 최후',
        accent: '#ef4444',
        text: '“크아아악…! 마사시게의 검이… 또다시 나를… 제어(Control)의 실이 끊어지고 있다…!”',
      },
      {
        speaker: '케이코 & 다쿠',
        speakerRole: '저주에서 풀려난 부모님',
        accent: '#34d399',
        text: '“야스…! 드디어 킨토루의 조종에서 벗어났구나… 네가 우리 가문을 지켰어. 정말 고맙다, 내 아들…”',
      },
      {
        speaker: '해설 · Book I: 지배의 서 완결',
        speakerRole: '엔딩',
        accent: '#10b981',
        text: '사이고모를 쓰러뜨린 야스는 기나긴 악몽의 저주를 끊어내고 가족과 함께 현실의 빛 속으로 돌아왔다. [Book I: Control Clear]',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '사이고모에게 제어의 결계가 둘러져 있어! 스턴 상태에서만 베어 피해를 줄 수 있으니 기둥 충돌·공격 준비 패링·오의 후 틈을 노려!',
      },
      onFirstItem: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '동굴 어둠 속에서 사이고모의 붉은 눈빛이 번뜩이고 있어!',
      },
      onHalfItem: {
        speaker: '사이고모 (킨토루)',
        accent: '#ef4444',
        text: '“어리석은 후손아! 제어의 결계와 붉은 혈풍폭 앞에서는 네 축복받은 검도 무력할 뿐이다!”',
      },
      onAllItems: {
        speaker: '야스',
        accent: '#10b981',
        text: '사이고모가 쓰러지고 있어! 마지막 일격을 날리자!',
      },
      onFirstChase: {
        speaker: '야스',
        accent: '#ef4444',
        text: '사이고모가 돌진해 온다! 동굴 바위 기둥 뒤로 피해서 부딪히게 만들어!',
      },
      onEscapeChase: {
        speaker: '야스',
        accent: '#94a3b8',
        text: '잠시 숨을 고르고 반격 타이밍을 노리자!',
      },
    },
    fogColor: 0x050102,
    fogDensity: 0.044,
    ambientColor: 0x16090c,
    themeAccent: '#ef4444',
  },
  // --- BOOK II: JEALOUSY (질투의 서) ---
  {
    id: 5,
    bookId: 2,
    code: 'Book II · Chapter I',
    title: '제1장: 아오가시마 섬의 추격',
    subtitle: '심장이 뜯긴 모방체 · 아오가시마 섬과 요괴들의 습격',
    location: '아오가시마 섬 · 외딴 마을과 선착장',
    objectiveLabel: '섬에서 쥐를 잡아 독이 든 우물에 담근 뒤, 미오와 린에게 3번 먹여 선착장 출구로 탈출하십시오',
    requiredItems: 3,
    itemNoun: '독 쥐 먹이기',
    monsters: ['rin_mio', 'nure', 'hyakume'],
    introLines: [
      '어린 시절 엄격하고 폭력적인 아버지 아래에서 자란 이사무와 센자이 형제. 동생 이사무가 처벌을 피하려 책임을 형에게 떠넘긴 날 이후, 센자이는 깊은 질투와 증오를 품게 되었다.',
      '훗날 키이로이바라 교단의 수장 쿄기에게 이끌려 해저 성역의 엔즈카이를 마주한 센자이는 교단에 투신했고, 형사가 된 이사무를 유인하기 위해 검은 물질로 자신의 가짜 시체(모방체)를 만들어 바다에 띄웠다.',
      '심장이 뜯긴 형의 시체를 보고 타살을 확신한 이사무는 진실을 파헤치기 위해 아오가시마 섬에 발을 들인다.'
    ],
    introScenes: [
      {
        speaker: '사건의 발단 · 형제의 갈등',
        speakerRole: '숨겨진 과거',
        accent: '#f59e0b',
        text: '어린 시절 폭력적인 아버지에게 사실을 고했다가 머리에 큰 상처를 입은 형 센자이. 이사무가 처벌을 피하려고 형에게 책임을 떠넘긴 그날부터 아버지의 편애와 형의 깊은 질투가 시작되었다.',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '형사 · Book II 주인공',
        accent: '#38bdf8',
        text: '“바다에 떠내려온 센자이 형의 시체는 심장이 뜯겨 있었어… 단순 사고가 아니야. 반드시 아오가시마 섬에서 진범을 찾아내겠어.”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '아오가시마 상륙',
        accent: '#38bdf8',
        text: '“섬에 요괴들이 들끓고 있어! 살아있는 쥐를 잡아 ‘독이 든 우물’에 담근 뒤, 미오와 린에게 3번 먹여 무력화해야 선착장 출구로 나갈 수 있어!”',
      },
    ],
    clearTitle: '선착장의 조우 · 교단 수장 쿄기의 납치',
    clearLines: [
      '독을 삼킨 미오와 린의 광기 어린 추격을 뚫고 아오가시마 선착장의 배까지 도달한 이사무.',
      '하지만 그 배 위에서 기다리고 있던 키이로이바라 교단의 수장 쿄기에게 기습당해, 엔즈카이가 봉인된 심해 성역으로 끌려가고 만다.'
    ],
    clearScenes: [
      {
        speaker: '쿄기 (Kyōgi)',
        speakerRole: '키이로이바라 교단 수장',
        accent: '#eab308',
        text: '“잘 왔다, 형사 우치우미 이사무. 네가 찾던 형 센자이는 검은 물질로 가짜 시체를 만들어 널 이곳으로 유인했을 뿐이다.”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '형사 · 체포됨',
        accent: '#ef4444',
        text: '“뭐라고…?! 형이 살아 있다고?! 크윽…! (의식을 잃고 심해 성역으로 끌려간다)”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '아오가시마 섬이야. 쥐를 찾아 독이 든 우물에 담그고, 미오와 린에게 3번 먹여야 탈출할 수 있어!',
      },
      onFirstItem: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '좋아, 미오와 린에게 독 쥐를 1번 먹였어! 두 번만 더 먹이면 출구가 열릴 거야!',
      },
      onHalfItem: {
        speaker: '미오와 린',
        accent: '#f472b6',
        text: '“크으윽… 속이 타들어 간다… 네놈을 절대 용서하지 않겠다…!”',
      },
      onAllItems: {
        speaker: '이사무',
        accent: '#10b981',
        text: '3번 모두 먹였어! 선착장 출구가 열렸으니 어서 출구로 들어가 도망치자!',
      },
      onFirstChase: {
        speaker: '이사무',
        accent: '#ef4444',
        text: '괴이들이 나를 노리고 있어! 섬 골목 모퉁이를 돌아 12m 밖으로 거리를 벌려!',
      },
      onEscapeChase: {
        speaker: '이사무',
        accent: '#94a3b8',
        text: '따돌렸어… 12m 이상 벗어나면 추격이 끊겨.',
      },
    },
    fogColor: 0x040b10,
    fogDensity: 0.09,
    ambientColor: 0x10202b,
    themeAccent: '#38bdf8',
  },
  {
    id: 6,
    bookId: 2,
    comingSoon: true,
    code: 'Book II · Chapter II',
    title: '제2장: 심해의 성역과 죽음',
    subtitle: '센자이의 배신 · 나기사의 추격과 엔즈카이의 부활',
    location: '해저 성역 · 가라앉은 심해 신전',
    objectiveLabel: '심해 성역의 봉인 부적 5장을 회수하여 깊은 제단 출구로 이동하십시오',
    requiredItems: 5,
    itemNoun: '심해 성역 부적',
    monsters: ['nagisa', 'kyogi'],
    introLines: [
      '교단 수장 쿄기에게 납치되어 심해 성역에서 깨어난 이사무. 꿈속에서 보았던 뒷모습의 남자를 쫓다가, 마침내 살아있던 형 센자이와 재회한다.',
      '그러나 센자이는 이미 교단의 간부가 되어 동생 이사무를 증오하고 있었고, 이사무를 차가운 함정에 빠뜨린다.',
      '심해의 괴물 나기사와 교단 세력을 피해 성역 깊은 곳으로 향하는 이사무 앞에는 끔찍한 운명이 기다리고 있었다.'
    ],
    introScenes: [
      {
        speaker: '우치우미 센자이',
        speakerRole: '이사무의 형 · 교단 간부',
        accent: '#eab308',
        text: '“오랜만이구나, 이사무. 가짜 시체에 속아 여기까지 잘도 기어 내려왔군. 어린 시절 내 머리가 깨졌던 그날을 잊은 건 아니겠지?”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '형사',
        accent: '#38bdf8',
        text: '“센자이 형… 정말 살아 있었구나! 하지만 왜 교단 따위에…! 어서 멈춰, 엔즈카이는 형까지 이용하고 버릴 거야!”',
      },
      {
        speaker: '우치우미 센자이',
        speakerRole: '함정 발동',
        accent: '#eab308',
        text: '“닥쳐! 넌 그저 아버지의 편애 속에서 나만 망가뜨렸을 뿐이야! 이 심해 성역에서 나기사의 먹이가 되어라!”',
      },
    ],
    clearTitle: '엔즈카이 부활 · 심장을 뜯긴 최후',
    clearLines: [
      '심해 괴물 나기사를 따돌리며 성역 가장 깊은 제단에 도달한 이사무.',
      '하지만 그 순간 봉인이 완전히 풀린 ‘질투의 짐승’ 엔즈카이와 정면으로 맞닥뜨렸고, 이사무는 엔즈카이에게 심장을 뜯겨 처참하게 사망하고 만다.'
    ],
    clearScenes: [
      {
        speaker: '엔즈카이 (질투의 짐승)',
        speakerRole: '봉인 해제',
        accent: '#eab308',
        text: '“하하하! 드디어 봉인이 풀렸다! 우치우미 형제의 추악한 질투가 나를 완전히 깨웠구나!”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '심장을 잃은 최후',
        accent: '#ef4444',
        text: '“커억…! 아, 안 돼… 내 심장이…! 형… 아직 구하지 못했는데… 이대로 죽을 순 없어…!”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '심해 성역 바닥이 물에 잠겨 있어. 나기사와 쿄기를 피해 부적 5장을 모으자!',
      },
      onFirstItem: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '첫 번째 부적을 손에 넣었어. 센자이 형이 날 여기까지 유인해 가두다니…',
      },
      onHalfItem: {
        speaker: '나기사',
        accent: '#2dd4bf',
        text: '“쉬이이이익… 심해의 성역에서 살아 나갈 수 있을 거라 믿느냐…”',
      },
      onAllItems: {
        speaker: '이사무',
        accent: '#10b981',
        text: '부적 5장을 모두 모았어! 성역 최심부 제단의 문이 열리고 있어!',
      },
      onFirstChase: {
        speaker: '이사무',
        accent: '#ef4444',
        text: '나기사가 쫓아온다! 침수된 기둥 사이를 빠져나가 12m 밖으로 피해!',
      },
      onEscapeChase: {
        speaker: '이사무',
        accent: '#94a3b8',
        text: '물보라 소리가 멀어졌어. 엔즈카이의 봉인실이 코앞이야…',
      },
    },
    fogColor: 0x020c10,
    fogDensity: 0.088,
    ambientColor: 0x082228,
    themeAccent: '#2dd4bf',
  },
  {
    id: 7,
    bookId: 2,
    comingSoon: true,
    code: 'Book II · Chapter III',
    title: '제3장: 지옥(지고쿠)에서의 거래',
    subtitle: '영혼의 인도자들과 지고쿠의 시련 · 시니가미와 백염(White Flame)의 계약',
    location: '사후 세계 · 지옥(지고쿠 · 地獄)',
    objectiveLabel: '영혼의 등불 5개를 밝혀 저승의 신 시니가미가 기다리는 출구로 향하십시오',
    requiredItems: 5,
    itemNoun: '영혼의 등불',
    monsters: ['jigoku_warden', 'kuishinbo'],
    introLines: [
      '엔즈카이에게 심장을 뜯겨 육체를 잃은 이사무는 피의 강과 유황 연기가 들끓는 지옥(지고쿠)으로 떨어졌다.',
      '영혼의 인도자들과 수많은 지옥의 괴물들이 배회하는 사후 세계에서, 이사무는 이승으로 돌아가 형을 구하고 엔즈카이를 막을 방법을 찾는다.',
      '지옥의 관문에서 기다리는 저승의 신 시니가미(Shinigami)에게 도달하기 위해 등불 5개를 모아야 한다.'
    ],
    introScenes: [
      {
        speaker: '우치우미 이사무',
        speakerRole: '죽은 영혼 · 지고쿠 추락',
        accent: '#38bdf8',
        text: '“심장이 없어… 여긴 지옥(지고쿠)인가? 하지만 이대로 끝낼 순 없어. 형이 엔즈카이에게 완전히 잠식당하기 전에 돌아가야 해!”',
      },
      {
        speaker: '시고쿠의 영혼 인도자',
        speakerRole: '사후 세계의 감시자',
        accent: '#f472b6',
        text: '“산 자의 미련을 버려라. 심장이 없는 망자가 갈 곳은 오직 영원한 어둠뿐이다…”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '결의',
        accent: '#38bdf8',
        text: '“인도자들과 지옥의 아귀들을 따돌리고 영혼 등불 5개를 모으자. 저승의 신 시니가미라면 돌아갈 길을 열어줄 거야!”',
      },
    ],
    clearTitle: '시니가미와의 계약 · 백염(White Flame)을 얻은 부활',
    clearLines: [
      '지옥의 험난한 시련을 뚫고 출구에서 저승의 신 시니가미와 마주한 이사무.',
      '이사무는 자신의 영혼을 바치는 대가로 일시적인 부활(절반의 부활)과 짐승을 처치할 수 있는 신성한 힘 ‘백염(White Flame)’을 얻어 폐허가 된 현실 세계로 귀환한다.'
    ],
    clearScenes: [
      {
        speaker: '시니가미 (Shinigami)',
        speakerRole: '저승의 신',
        accent: '#c084fc',
        text: '“네 영혼을 완전히 바친다면 일시적인 ‘절반의 부활’과 짐승을 태워버릴 신성한 불꽃 ‘백염(White Flame)’을 내어주마. 엔즈카이를 베는 순간, 네 수명도 끝날 것이다.”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '백염을 품은 귀환',
        accent: '#e0f2fe',
        text: '“좋아, 그 계약 받아들이겠어! 형을 구하고 엔즈카이를 소멸시킬 수만 있다면 내 영혼은 기꺼이 바치겠다!”',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '지옥(지고쿠)이야… 영혼의 인도자와 지옥의 괴물 쿠이신보를 피해 등불 5개를 모으자!',
      },
      onFirstItem: {
        speaker: '이사무',
        accent: '#38bdf8',
        text: '첫 번째 등불을 밝혔어. 피의 강 다리를 건널 때는 시야 확보가 중요해.',
      },
      onHalfItem: {
        speaker: '시고쿠의 영혼 인도자',
        accent: '#fb7185',
        text: '“돌아가려 발버둥 쳐도 이승에는 이미 파멸만이 기다리고 있을 뿐이다…”',
      },
      onAllItems: {
        speaker: '이사무',
        accent: '#10b981',
        text: '5개의 영혼 등불이 전부 빛나고 있어! 시니가미가 기다리는 출구로 가자!',
      },
      onFirstChase: {
        speaker: '이사무',
        accent: '#ef4444',
        text: '지옥의 감시자가 다가온다! 유황 바위 뒤로 돌아 12m 밖으로 거리를 벌려!',
      },
      onEscapeChase: {
        speaker: '이사무',
        accent: '#94a3b8',
        text: '겨우 따돌렸어… 엔즈카이에게 빼앗긴 걸 되찾으러 반드시 돌아간다!',
      },
    },
    fogColor: 0x120504,
    fogDensity: 0.086,
    ambientColor: 0x260c07,
    themeAccent: '#fb7185',
  },
  {
    id: 8,
    bookId: 2,
    comingSoon: true,
    code: 'Book II Finale · Chapter IV',
    title: '제4장: 파괴된 도쿄와 최종 결전',
    subtitle: '2022년 폐허가 된 도쿄 가와사키구 · 센자이 해방과 백염 결전',
    location: '2022년 현대 일본 · 파괴된 도쿄 가와사키구',
    objectiveLabel: '백염의 성검(좌클릭 / Space)으로 형 센자이를 해방시키고 엔즈카이를 소멸시키십시오',
    requiredItems: 0,
    itemNoun: '최종 보스 토벌',
    monsters: ['enzukai', 'senzai_fallen'],
    introLines: [
      '2022년 현대 일본(가와사키구 및 도쿄 일대)으로 귀환한 이사무는 엔즈카이의 힘으로 폐허가 되어버린 참혹한 도시를 마주한다.',
      '무너진 빌딩과 아스팔트 도로 한복판에서 교단 세력과 타락한 형 센자이가 이사무를 가로막는다.',
      '시니가미에게 받은 신성한 힘 ‘백염(White Flame)’을 휘둘러 형을 집어삼킨 질투의 저주를 끊어내고, 엔즈카이를 완전히 소멸시켜라!'
    ],
    introScenes: [
      {
        speaker: '우치우미 이사무',
        speakerRole: '2022년 도쿄 가와사키구 귀환',
        accent: '#e0f2fe',
        text: '“도쿄가… 엔즈카이의 저주로 폐허가 되어 버렸어! 하지만 내 손엔 시니가미가 준 백염(White Flame)이 있어!”',
      },
      {
        speaker: '타락한 센자이',
        speakerRole: '질투에 잠식된 형',
        accent: '#eab308',
        text: '“네가 지옥에서 기어 돌아왔다고 달라질 건 없다, 이사무! 나도 이 도시도 모두 질투의 불길에 삼켜질 뿐이야!”',
      },
      {
        speaker: '엔즈카이 (질투의 짐승)',
        speakerRole: 'Book II 최종 보스',
        accent: '#eab308',
        text: '“절반만 살아있는 시체 주제에 백염을 들었구나! 부서진 도쿄의 잿더미 속에서 다시 심장을 뜯어주마!”',
      },
    ],
    clearTitle: '굿 엔딩(정사) · 백염의 희생과 형제의 화해',
    clearLines: [
      '백염의 힘으로 타락한 형 센자이의 저주를 끊어내 해방시킨 이사무는, 마침내 질투의 짐승 엔즈카이를 완전히 소멸시키는 데 성공한다.',
      '시니가미와의 거래 대가로 수명을 다한 이사무는 센자이의 품에서 숨을 거두었고, 살아남은 센자이는 동생의 희생을 기리며 비극적인 형제의 갈등을 마무리한다.'
    ],
    clearScenes: [
      {
        speaker: '엔즈카이 (질투의 짐승)',
        speakerRole: '백염에 의한 소멸',
        accent: '#eab308',
        text: '“크아아악…! 백염의 불꽃이 내 질투의 핵을 태우고 있어…! 인간 형제 따위에게 내가 소멸하다니…!!”',
      },
      {
        speaker: '우치우미 센자이',
        speakerRole: '저주에서 해방된 형',
        accent: '#facc15',
        text: '“이사무… 내 안의 저주를 끊어내려고… 네 남은 생명까지 전부 태워버린 거냐… 안 돼, 눈 좀 떠 봐!”',
      },
      {
        speaker: '우치우미 이사무',
        speakerRole: '마지막 미소 · 계약 만료',
        accent: '#e0f2fe',
        text: '“형… 어린 날 내가 잘못을 떠넘겨서 정말 미안했어… 이제 질투는 끝이야. 형은 꼭 살아서… 다시 그림을 그려…”',
      },
      {
        speaker: '굿 엔딩 (정사 루트) · Book II 완결',
        speakerRole: '에필로그',
        accent: '#10b981',
        text: '시니가미와의 계약대로 수명을 다해 눈을 감은 이사무. 살아남은 센자이는 동생의 숭고한 희생을 가슴에 새기고 죄를 속죄하며 형제의 비극에 마침표를 찍었다.',
      },
    ],
    badClearTitle: '배드 엔딩 · 질투와 네타모가 집어삼킨 세상',
    badClearScenes: [
      {
        speaker: '엔즈카이 (질투의 짐승)',
        speakerRole: '완전 강림',
        accent: '#ef4444',
        text: '“하하하하! 백염마저 꺼져가고 있구나! 인간의 나약한 죄책감 따위가 질투의 짐승을 막을 수 있을 리가 없지!”',
      },
      {
        speaker: '우치우미 센자이',
        speakerRole: '절망',
        accent: '#ca8a04',
        text: '“안 돼… 이사무의 불꽃이 꺼졌어… 도쿄 전체가 검은 안개와 짐승들의 울부짖음에 잠기고 있어…!”',
      },
      {
        speaker: '네타모 (Netamo) · 새로운 위협',
        speakerRole: '배드 엔딩의 그림자',
        accent: '#a855f7',
        text: '부서진 도쿄의 하늘 위로 엔즈카이를 넘어서는 또 다른 심연의 위협 ‘네타모’의 기운이 깨어나며, 세상은 끝없는 절망과 질투의 어둠 속으로 삼켜지고 말았다.',
      },
    ],
    subtitles: {
      onStart: {
        speaker: '이사무',
        accent: '#e0f2fe',
        text: '폐허가 된 2022년 도쿄 가와사키구야! 먼저 백염으로 형을 잠재우고, 엔즈카이가 스턴에 빠진 3초를 노려 베자!',
      },
      onFirstItem: {
        speaker: '이사무',
        accent: '#e0f2fe',
        text: '백염의 검기가 타오르고 있어! 결계가 깨진 순간을 절대 놓치지 마!',
      },
      onHalfItem: {
        speaker: '엔즈카이 (질투의 짐승)',
        accent: '#eab308',
        text: '“그깟 시니가미의 불꽃으로 버텨 보아라! 내 질투의 오의로 도쿄와 함께 부숴주마!”',
      },
      onAllItems: {
        speaker: '이사무',
        accent: '#10b981',
        text: '엔즈카이의 몸이 백염에 타들어가고 있어! 마지막 일격을 날리자!',
      },
      onFirstChase: {
        speaker: '이사무',
        accent: '#ef4444',
        text: '엔즈카이가 돌진한다! 무너진 도쿄 빌딩 기둥 뒤로 피해 부딪히게 만들거나 준비 동작에 패링을 걸어!',
      },
      onEscapeChase: {
        speaker: '이사무',
        accent: '#94a3b8',
        text: '잠시 숨을 고르고 형을 지키며 반격할 기회를 노리자!',
      },
    },
    fogColor: 0x09080c,
    fogDensity: 0.036,
    ambientColor: 0x1e1b24,
    themeAccent: '#eab308',
  },
];

export const CHARACTERS: CharacterLore[] = [
  {
    id: 'yasu',
    name: '야스 (야스오 마스다)',
    japaneseName: '益田 康 (Yasu Masuda)',
    role: '주인공 · Book I 화자',
    status: '생존 · 가문의 저주를 끊기 위해 사투 중',
    summary:
      '마사시게 쿠스노키의 후손. 2021년 8월 7일 실종된 6명의 친구들과 납치된 어머니 케이코를 구하기 위해 폐교된 LA 퀸타 고등학교 지하로 들어갔다가 킨토루의 이세계에 휘말린다.',
    quote: '“친구들을 잃었지만… 어머니와 아버지까지 빼앗길 순 없어. 반드시 이 저주를 끊겠어.”',
  },
  {
    id: 'masashige',
    name: '마사시게 쿠스노키',
    japaneseName: '楠木 正成 (Masashige Kusunoki)',
    role: '야스의 선조 · 고대 사무라이',
    status: '영혼으로 야스를 인도',
    summary:
      '과거 네 마리의 악마(짐승) 중 하나인 제어의 짐승 킨토루를 봉인한 위대한 사무라이. 그의 봉인에 원한을 품은 킨토루가 가문 대대로 저주를 걸었으며, 챕터 3에서 야스에게 축복받은 검의 위치를 알려 준다.',
    quote: '“내 후손 야스여, 벚꽃 늪 너머 축복받은 검을 들어 내 업보를 끝내다오.”',
  },
  {
    id: 'keiko',
    name: '케이코',
    japaneseName: '恵子 (Keiko)',
    role: '야스의 어머니',
    status: '킨토루에게 납치·세뇌됨 (챕터 4 보스 수하)',
    summary:
      '가문의 저주를 피해 일본에서 미국으로 이주했으나, 결국 킨토루에게 납치당해 조종당하게 된 어머니. 챕터 4에서 저주받아 괴물이 된 채 피의 늪에서 야스를 가로막는다.',
    quote: '“야스… 내 아들아… 제발 가까이 오지 마… 내 몸이 내 말을 듣지 않아…”',
  },
  {
    id: 'taku',
    name: '다쿠',
    japaneseName: '拓 (Taku)',
    role: '야스의 아버지',
    status: '저주받아 괴물이 됨 (챕터 4)',
    summary:
      '미국에서 가족을 지키려 했던 야스의 아버지. 킨토루의 저주가 본가까지 덮치면서 괴물로 변모해 왜곡된 집에서 야스에게 비극적인 시련을 안긴다.',
    quote: '“가족을 지켜야 했는데… 제어의 실이 우리를 삼켜 버렸구나…”',
  },
  {
    id: 'friends_6',
    name: '실종된 6명의 친구들',
    japaneseName: 'LA Quinta High School 6 Friends',
    role: '야스의 동창생들 · 사건의 발단',
    status: '챕터 2에서 전원 희생 확인',
    summary:
      '2021년 8월 7일 LA 퀸타 고등학교에서 실종된 6명의 친구들. 야스가 이세계로 발을 들인 이유였으나, 챕터 2에서 이미 킨토루에게 잡아먹혔다는 잔혹한 진실이 밝혀진다.',
    quote: '“지하 복도 끝에서 이상한 여자의 웃음소리가 들렸어…”',
  },
  {
    id: 'megumi',
    name: '메구미',
    japaneseName: '恵 (Megumi)',
    role: '저주받아 인형이 된 야스의 조상',
    status: '챕터 3 나비 영혼 의식으로 해방',
    summary:
      '황궁과 잊혀진 자의 영역, 병원에서 야스를 덮친 인형 괴물들의 실체이자 마사시게 가문의 선조. 챕터 3에서 야스가 나비 영혼들을 바치며 비극적인 안식을 얻는다.',
    quote: '“우리 조상들은 인형 속에 갇혀 후손을 해치는 저주를 받았단다…”',
  },
  {
    id: 'kintoru_char',
    name: '킨토루 (사마 / 제어의 짐승)',
    japaneseName: 'キントル · 制御の獣 (Kintoru / Sama)',
    role: '네 마리의 악마 중 제어(Control) · Book I 흑막',
    status: '오오무카데 / 사이고모로 변신하여 결전',
    summary:
      '마사시게 쿠스노키에게 봉인되었던 원한으로 가문을 파멸시키려는 제어의 악마. 현실을 모방한 아라리 마을을 만들고 친구들을 삼켰으며, 지네(오오무카데)와 거미(사이고모) 형상으로 야스와 맞선다.',
    quote: '“마사시게의 핏줄이여, 네 친구들도 네 조상들도 전부 내 제어 아래 있을 뿐이다.”',
  },
  // --- BOOK II: JEALOUSY CHARACTERS ---
  {
    id: 'isamu',
    bookId: 2,
    name: '우치우미 이사무',
    japaneseName: '内海 勇 (Isamu Uchiumi)',
    role: '주인공 · 형사 · Book II 화자',
    status: '최종 결전 후 시니가미와의 계약으로 수명 종료 (정사)',
    summary:
      '바다에 떠내려온 형의 가짜 시체(모방체)를 보고 타살을 확신해 아오가시마 섬을 수사한 형사. 어린 시절 아버지의 폭력을 피하려 형에게 책임을 떠넘긴 원죄가 있었으며, 심해 성역에서 엔즈카이에게 심장을 뜯겨 사망한 뒤 지고쿠에서 시니가미와 계약해 ‘백염’을 얻어 형을 구하고 생을 마감한다.',
    quote: '“내 영혼을 바쳐 얻은 백염으로 형을 구하고, 엔즈카이를 끝내겠어.”',
  },
  {
    id: 'senzai',
    bookId: 2,
    name: '우치우미 센자이',
    japaneseName: '内海 潜在 (Senzai Uchiumi)',
    role: '이사무의 형 · 교단 간부 · 비극적 대립자',
    status: '도쿄 결전에서 저주 해방 후 생존 (정사 루트)',
    summary:
      '어린 시절 동생 이사무의 부추김으로 아버지에게 사실을 고했다가 머리에 큰 상처를 입었고, 이사무가 책임을 떠넘기며 아버지의 편애가 시작되자 동생에게 깊은 질투와 증오를 품었다. 쿄기의 인도로 엔즈카이를 만나 교단에 투신하고 모방체 시체로 동생을 유인했으나, 최종 결전에서 이사무의 백염에 의해 구원받는다.',
    quote: '“네가 내 삶을 망가뜨린 그날부터 난 질투 속에서만 살아왔어… 그런데 왜 나를 살린 거냐, 이사무…”',
  },
  {
    id: 'enzukai_char',
    bookId: 2,
    name: '엔즈카이 (질투의 짐승)',
    japaneseName: 'エンズカイ · 嫉妬の獣 (Enzukai)',
    role: '네 마리의 짐승 중 질투(Jealousy) · Book II 최종 보스',
    status: '심해 성역에서 부활 후 도쿄 결전에서 백염에 소멸 (정사)',
    summary:
      '아오가시마 해저 성역에 봉인되어 있던 ‘질투의 짐승’. 우치우미 형제의 갈등과 교단의 제물을 발판 삼아 챕터 2에서 봉인을 풀고 부활해 이사무의 심장을 뜯어냈으며, 2022년 도쿄 가와사키구까지 폐허로 만들었으나 시니가미의 백염을 얻은 이사무에게 소멸된다.',
    quote: '“질투와 증오야말로 인간이 바치는 가장 달콤한 제물이지. 이 도쿄는 내 것이다!”',
  },
  {
    id: 'kyogi_char',
    bookId: 2,
    name: '쿄기 (키이로이바라 교단 수장)',
    japaneseName: 'キョウギ · 黄色い薔薇教団 (Kyōgi)',
    role: '키이로이바라(노란 장미) 교단 창설자',
    status: '아오가시마에서 이사무 납치 · 도쿄 결전 지원',
    summary:
      '아오가시마를 찾은 센자이를 해저 성역의 엔즈카이에게 인도해 교단으로 끌어들인 수장. 챕터 1 막바지 배 위에서 이사무를 붙잡아 심해 성역으로 끌고 갔으며, 챕터 4 도쿄 폐허에서도 교단 세력을 이끈다.',
    quote: '“검은 모방체에 속아 여기까지 온 어리석은 형사여, 이제 심해 성역의 제물이 되어라.”',
  },
  {
    id: 'shinigami',
    bookId: 2,
    name: '시니가미 (Shinigami)',
    japaneseName: '死神 (Shinigami)',
    role: '저승의 신 · 지고쿠의 계약자',
    status: '이사무에게 절반의 부활과 백염(White Flame) 부여',
    summary:
      '지옥(지고쿠)으로 떨어진 이사무가 이승으로 돌아가기 위해 거래를 맺은 저승의 신. 이사무의 영혼을 받는 대가로 일시적인 절반의 부활과 짐승을 소멸시킬 수 있는 신성한 힘 ‘백염(White Flame)’을 내어주었다.',
    quote: '“네 영혼을 바친다면 절반의 생과 ‘백염’을 주마. 허나 임무를 마친 순간 수명도 다할 것이다.”',
  },
  {
    id: 'rin_mio_char',
    bookId: 2,
    name: '미오와 린 (고아 자매 원혼)',
    japaneseName: '美桜 ＆ 凛 (Mio & Rin)',
    role: '아오가시마 섬의 고아 자매 원혼',
    status: '교단과 얽힌 괴이로 아오가시마 배회',
    summary:
      '아오가시마 섬에서 기아와 질투의 비극 끝에 하나의 몸으로 묶여버린 고아 자매 원혼. 챕터 1 아오가시마 섬의 추격에서 뱀 요괴 누레, 외눈박이 거인 햐쿠메와 함께 이사무를 덮친다.',
    quote: '“우리를 갈라놓을 순 없어… 언니와 동생은 영원히 함께니까…”',
  },
  {
    id: 'netamo_char',
    bookId: 2,
    name: '네타모 (Netamo)',
    japaneseName: 'ネタモ (Netamo · 배드 엔딩의 위협)',
    role: '배드 엔딩에서 세상을 위협하는 또 다른 심연의 존재',
    status: '배드 엔딩 분기 시 강림',
    summary:
      '최종 결전에서 이사무가 엔즈카이를 완전히 막아내지 못하거나 저주에 굴복했을 때 모습을 드러내는 절망적인 재앙의 상징. 질투의 짐승과 함께 현실 세계를 집어삼킨다.',
    quote: '“빛이 꺼진 자리에는 오직 더 깊은 질투와 네타모의 그림자만이 남는다.”',
  },
];

export const MONSTERS: MonsterLore[] = [
  {
    id: 'shizu',
    name: '시즈',
    japaneseName: 'シズ (Shizu)',
    bookOrigin: 'Book I · Chapter I',
    title: '모교와 호텔을 배회하는 창백한 원령',
    dangerLevel: '위험 (불빛·소음 민감)',
    chapterAppearance: '제1장 LA 퀸타 고교 & 아라리 이세계',
    description:
      '야스가 친구들을 찾아 LA 퀸타 고교와 이세계 호텔로 들어섰을 때 마주하는 기괴한 원령. 찢어진 흰 소복과 고개를 꺾은 채 찢어질 듯 웃으며 복도를 배회한다.',
    behaviorTip:
      '손전등(F) 불빛과 달리기 소리에 민감합니다. 추격당할 때는 복도를 꺾어 12m 이상 거리를 벌리면 추격을 멈춥니다.',
    accentColor: '#e11d48',
  },
  {
    id: 'biwaki',
    name: '비와키',
    japaneseName: 'ビワキ (Biwaki)',
    bookOrigin: 'Book I · Chapter I & II',
    title: '아라리 마을과 병원의 불협화음 추적자',
    dangerLevel: '위험 (기습 추적)',
    chapterAppearance: '제1장 아라리 이세계 · 제2장 병원',
    description:
      '현실을 모방한 이세계 아라리 마을과 황궁·병원에서 야스를 집요하게 쫓는 괴물. 어두운 남빛 로브 사이로 불길한 안광을 띠며 조용히 거리를 좁힌다.',
    behaviorTip:
      '시야각이 넓어 복도 교차로에서 마주치기 쉽습니다. 은신(C)으로 기척을 줄이고 12m 밖 어둠으로 빠져나가십시오.',
    accentColor: '#6366f1',
  },
  {
    id: 'megumi',
    name: '메구미 (조상 인형)',
    japaneseName: 'メグミ (Megumi · 呪われた先祖の人形)',
    bookOrigin: 'Book I · Chapter II & III',
    title: '저주받아 인형이 된 마사시게의 조상',
    dangerLevel: '고위험 (고속 순찰)',
    chapterAppearance: '제2장 황궁·병원 · 제3장 벚꽃 늪',
    description:
      '챕터 2에서 정체가 밝혀지는 비극적 괴물. 킨토루의 저주로 영혼이 인형 육체에 갇혀 버린 야스 자신의 조상으로, 원치 않게 후손을 습격한다.',
    behaviorTip:
      '복도를 빠르게 순찰하므로 문과 기둥을 방패 삼아 시선을 끊고 12m 이상 이탈하십시오.',
    accentColor: '#a855f7',
  },
  {
    id: 'oomukade',
    name: '오오무카데',
    japaneseName: '大百足 (Oomukade · 지네 형상 킨토루)',
    bookOrigin: 'Book I · Chapter III',
    title: '벚꽃 늪을 기어 다니는 지네 킨토루',
    dangerLevel: '매우 위험 (고속 돌진)',
    chapterAppearance: '제3장 벚꽃 늪 & 저택',
    description:
      '챕터 3에서 킨토루가 거대한 지네(오오무카데)의 형상으로 변모한 모습. 붉은 갑각과 수많은 다리로 벚꽃 늪과 저택을 미끄러지듯 질주한다.',
    behaviorTip:
      '직선 주행 속도가 매우 빠릅니다. 벚꽃 나무와 저택 모퉁이를 연속으로 돌아 시야를 끊고 12m 밖으로 탈출하십시오.',
    accentColor: '#db2777',
  },
  {
    id: 'saigomo',
    name: '사이고모',
    japaneseName: 'サイゴモ (Saigomo · 거미 형상 킨토루)',
    bookOrigin: 'Book I · Chapter IV 최종 보스',
    title: '제어의 짐승 킨토루의 최종 거미 형상',
    dangerLevel: '치명적 (지하 대동굴 최종 보스)',
    chapterAppearance: '제4장 지하 대동굴 (사이고모의 둥지)',
    description:
      '여섯 개의 거대한 거미 다리와 화려한 붉은 하카마, 창백한 노(能) 가면을 두른 킨토루의 최후 형태. 평소에는 ‘제어의 결계’로 검격을 튕겨내며, 거대 동굴에서 도약 강타 충격파, 붉은 수정 가시 융기, 2연속 9발 독구 난사, 고속 돌진, 360도 핏빛 오의로 압박한다.',
    behaviorTip:
      '평소 결계가 활성화된 동안에는 피해를 줄 수 없습니다. ① 돌진 시 동굴 기둥 충돌 ② 공격 준비(붉은 예고) 중 검으로 패링 반격 ③ 360도 핏빛 오의 발동 직후 탈진 시 3초 스턴이 걸리며, 이때 축복받은 검으로 집중 타격(약 20타)해 처치할 수 있습니다.',
    accentColor: '#dc2626',
  },
  {
    id: 'keiko',
    name: '케이코 (저주받은 어머니)',
    japaneseName: '恵子 (Cursed Keiko)',
    bookOrigin: 'Book I · Chapter IV',
    title: '킨토루에게 조종당하는 야스의 어머니',
    dangerLevel: '고위험 (동굴 내 협공)',
    chapterAppearance: '제4장 지하 대동굴',
    description:
      '일본에서 미국까지 도망쳤지만 결국 킨토루에게 납치되어 세뇌당한 야스의 어머니. 지하 대동굴 결전에서 사이고모와 함께 야스의 발목을 잡는다.',
    behaviorTip:
      '접근 시 축복받은 검으로 한 번 베어 8초간 폭주를 잠재운 뒤 사이고모와의 결전에 집중하십시오.',
    accentColor: '#f43f5e',
  },
  // --- BOOK II MONSTERS ---
  {
    id: 'rin_mio',
    bookId: 2,
    name: '미오와 린 (자매 원혼)',
    japaneseName: '凛 ＆ 美桜 (Rin & Mio)',
    bookOrigin: 'Book II · Chapter I',
    title: '아오가시마 섬을 배회하는 고아 자매 원혼',
    dangerLevel: '위험 (이중 울음·기습)',
    chapterAppearance: '제1장 아오가시마 섬',
    description:
      '아오가시마 섬의 어두운 골목과 부두 근처에서 기괴한 이중 울음소리를 내며 나타나는 고아 자매 원혼. 뒤통수에 돋아난 또 다른 얼굴이 사방의 움직임을 감시한다.',
    behaviorTip:
      '제1장에서는 독이 든 우물에 담근 쥐를 3번 먹여야 출구가 열립니다. 추격전에서는 미오와 린이 끝까지 쫓아오니 코너를 돌아 탈출구까지 전력 질주하십시오.',
    accentColor: '#f472b6',
  },
  {
    id: 'nure',
    bookId: 2,
    name: '누레 (뱀 요괴)',
    japaneseName: '濡れ女 (Nure · 뱀 요괴)',
    bookOrigin: 'Book II · Chapter I',
    title: '해안 물가를 기어 다니는 뱀 요괴',
    dangerLevel: '고위험 (물가 고속 추적)',
    chapterAppearance: '제1장 아오가시마 섬 해안·부두',
    description:
      '긴 뱀의 하반신과 젖은 긴 머리카락을 휘날리며 아오가시마의 갯바위와 얕은 물가를 미끄러지듯 기어오는 뱀 요괴. 교단의 영역을 침범한 자를 끝까지 추적한다.',
    behaviorTip:
      '직선 주행이 빠르므로 부두 벽과 가옥 모퉁이를 연속으로 돌아 12m 밖으로 이탈하십시오.',
    accentColor: '#14b8a6',
  },
  {
    id: 'hyakume',
    bookId: 2,
    name: '햐쿠메 (외눈박이 거인)',
    japaneseName: '百目 (Hyakume · 외눈박이 거인)',
    bookOrigin: 'Book II · Chapter I',
    title: '온몸에 수많은 눈을 지닌 외눈박이 거인 괴물',
    dangerLevel: '매우 위험 (넓은 시야각)',
    chapterAppearance: '제1장 아오가시마 섬',
    description:
      '거대한 체구와 얼굴 중앙을 채운 끔찍한 외눈, 그리고 어깨와 팔에 돋아난 수많은 눈알로 섬을 순찰하는 거인 요괴.',
    behaviorTip:
      '발소리가 매우 크므로 가까이 오기 전에 은신(C)하여 몸을 숨기고 12m 거리를 유지하십시오.',
    accentColor: '#f97316',
  },
  {
    id: 'kyogi',
    bookId: 2,
    name: '쿄기 (교단 수장)',
    japaneseName: 'キョウギ (Kyōgi · 黄色い薔薇)',
    bookOrigin: 'Book II · Chapter I & II',
    title: '키이로이바라 교단의 수장',
    dangerLevel: '고위험 (심해 성역 감시)',
    chapterAppearance: '제1장 배 위 납치 · 제2장 심해의 성역',
    description:
      '센자이를 교단으로 끌어들여 엔즈카이를 모시게 한 장본인. 제1장 막바지 선착장 배 위에서 이사무를 생포해 심해 성역으로 끌고 갔으며, 성역 내부를 순찰하며 감시한다.',
    behaviorTip:
      '노란 장미 가면과 등불이 보이면 즉시 경로를 바꾸어 12m 밖으로 벗어나십시오.',
    accentColor: '#eab308',
  },
  {
    id: 'nagisa',
    bookId: 2,
    name: '나기사',
    japaneseName: 'ナギサ (Nagisa · 深海の海蛇)',
    bookOrigin: 'Book II · Chapter II',
    title: '심해의 성역을 수호하는 바다 괴수',
    dangerLevel: '매우 위험 (심해 고속 추격)',
    chapterAppearance: '제2장 심해의 성역',
    description:
      '가라앉은 해저 성역의 푸른 물살 속에서 이사무를 사냥하는 거대한 심해 괴물. 빛나는 청록색 지느러미와 날카로운 송곳니로 성역의 침입자를 찢어버린다.',
    behaviorTip:
      '성역의 외곽 회랑과 석주를 돌아 시선을 끊고 12m 이상 거리를 벌리십시오.',
    accentColor: '#2dd4bf',
  },
  {
    id: 'jigoku_warden',
    bookId: 2,
    name: '영혼의 인도자 (지고쿠)',
    japaneseName: '地獄の案内人 (Jigoku Soul Guide)',
    bookOrigin: 'Book II · Chapter III',
    title: '지고쿠에서 망자의 탈출을 막는 영혼의 인도자',
    dangerLevel: '고위험 (저주 등불 추적)',
    chapterAppearance: '제3장 지옥(지고쿠)',
    description:
      '피의 강과 유황 불꽃이 타오르는 지옥(지고쿠)을 떠돌며 시니가미에게 향하려는 영혼들을 끌어내리는 망자의 인도자.',
    behaviorTip:
      '창백한 저주 불빛이 보이면 좁은 협곡을 벗어나 넓은 용암/피의 강 다리 쪽으로 우회해 12m를 벌리십시오.',
    accentColor: '#a855f7',
  },
  {
    id: 'kuishinbo',
    bookId: 2,
    name: '쿠이신보 (지고쿠 아귀)',
    japaneseName: 'クイシンボ (Kuishinbo)',
    bookOrigin: 'Book II · Chapter III',
    title: '지옥의 구렁텅이를 배회하는 식탐의 괴물',
    dangerLevel: '매우 위험 (난폭 순찰)',
    chapterAppearance: '제3장 지옥(지고쿠)',
    description:
      '지고쿠의 가장 어두운 통로를 배회하며 썩지 않는 영혼마저 씹어 먹으려 드는 끔찍한 지옥의 아귀.',
    behaviorTip:
      '소리에 예민하므로 지옥 구간에서는 은신(C)과 대시(Shift)를 적절히 조절해 12m 밖으로 따돌리십시오.',
    accentColor: '#fb7185',
  },
  {
    id: 'senzai_fallen',
    bookId: 2,
    name: '타락한 센자이',
    japaneseName: '堕落した潜在 (Corrupted Senzai)',
    bookOrigin: 'Book II · Chapter IV',
    title: '질투의 저주에 잠식되어 동생을 막아서는 형',
    dangerLevel: '고위험 (도쿄 결전 협공)',
    chapterAppearance: '제4장 파괴된 도쿄 가와사키구',
    description:
      '엔즈카이의 질투의 저주에 깊이 물든 채 폐허가 된 2022년 도쿄에서 이사무를 가로막는 형 센자이. 백염의 검으로 일격을 가하면 잠시 저주가 끊어져 주춤한다.',
    behaviorTip:
      '백염의 검으로 한 번 베어 8초간 저주를 잠재운 뒤 엔즈카이의 스턴 틈을 집중 공략하십시오.',
    accentColor: '#facc15',
  },
  {
    id: 'enzukai',
    bookId: 2,
    name: '엔즈카이',
    japaneseName: 'エンズカイ (Enzukai · 嫉妬の獣)',
    bookOrigin: 'Book II · Chapter II & IV 최종 보스',
    title: '심해에서 부활해 도쿄를 폐허로 만든 질투의 짐승',
    dangerLevel: '치명적 (파괴된 도쿄 최종 보스)',
    chapterAppearance: '제2장 결말(이사무 살해) · 제4장 파괴된 도쿄 가와사키구',
    description:
      '제2장에서 이사무의 심장을 뜯어내 죽음으로 몰아넣고 2022년 도쿄 일대를 폐허로 만든 질투의 짐승. 평소에는 ‘질투의 결계’로 검격을 튕겨내며 도약 강타·수정 가시·황금탄막·고속 돌진·360도 오의로 압박한다.',
    behaviorTip:
      '질투의 결계가 활성화된 상태에서는 피해를 입지 않습니다. ① 돌진을 폐허 빌딩 기둥에 충돌 ② 공격 준비 중 백염검 패링 반격 ③ 360도 오의 직후 과열 시 걸리는 3초 스턴 동안 집중 타격해 소멸시키십시오.',
    accentColor: '#eab308',
  },
];

export const DIARIES: DiaryEntry[] = [
  {
    id: 'diary_1_laquinta',
    chapterId: 1,
    title: '2021.08.07 LA 퀸타 고교 실종 메모',
    author: '야스',
    dateLabel: '2021. 08. 07 · LA 퀸타 고등학교 지하',
    content: [
      '6명의 친구들이 전부 이 폐교에서 실종되었다. 경찰보다 먼저 지하실 문을 열었을 때, 복도는 미국이 아닌 낡은 일본 마을 아라리로 바뀌어 있었다.',
      '저택 어딘가에 있는 시즈와 비와키, 쿠리코는 빛과 소리에 반응하지만 12m 이상 거리를 벌리면 추격을 멈춘다.',
      '반드시 열쇠 4개를 찾아 지하실 문 밖 이세계 안쪽으로 들어가야 해.'
    ],
  },
  {
    id: 'diary_1_keiko_trace',
    chapterId: 1,
    title: '케이코가 떨어뜨린 찢긴 편지',
    author: '케이코',
    dateLabel: '미국 이주 직후 · 이세계 입구',
    content: [
      '야스, 다쿠… 마사시게 가문의 저주를 피해 일본을 떠났건만, 제어의 짐승 킨토루가 결국 여기까지 나를 찾아냈어.',
      '내 정신이 흐려지고 있어. 만약 내가 괴물로 변해 너희 앞에 서더라도 절대 망설이지 마.'
    ],
  },
  {
    id: 'diary_2_kintoru_truth',
    chapterId: 2,
    title: '킨토루의 조롱과 6명의 진실',
    author: '킨토루 (대필 환청 기록)',
    dateLabel: '황궁 · 잊혀진 자의 영역',
    content: [
      '“네가 그토록 찾아 헤매던 6명의 친구들은 이미 내가 먹어 치웠다.”',
      '“너희 선조 쿠스노키의 죄로 인형이 된 네 조상들이다.”',
      '경고: 2장 이후부터는 중간중간 킨토루가 직접 정신을 침식하려 손을 뻗는다. 다가오는 손을 마우스로 터치해 6초 동안 버텨내야 한다.'
    ],
  },
  {
    id: 'diary_2_megumi',
    chapterId: 2,
    title: '메구미의 흐릿한 기억 조각',
    author: '메구미',
    dateLabel: '저주받은 병원 병실',
    content: [
      '우리는 가문의 원죄 때문에 영혼이 인형에 묶여 버렸다.',
      '부적 다섯 장을 모아 결계를 풀고 벚꽃 늪으로 향하거라. 그곳에서 선조 마사시게 님이 너를 기다리고 계신다.'
    ],
  },
  {
    id: 'diary_3_kusunoki',
    chapterId: 3,
    title: '마사시게 쿠스노키의 유언과 검',
    author: '마사시게 쿠스노키',
    dateLabel: '벚꽃 늪 제단',
    content: [
      '과거 내가 네 마리의 악마 중 제어의 짐승 킨토루를 봉인한 대가로 우리 가문 전체가 저주받았다.',
      '저택 깊은 곳에 킨토루를 베어 넘길 축복받은 검이 있다. 지네 형상 오오무카데를 피해 나비 영혼 등불을 모아 봉인을 열어라.'
    ],
  },
  {
    id: 'diary_3_butterfly',
    chapterId: 3,
    title: '나비 영혼의 희생 기록',
    author: '야스',
    dateLabel: '벚꽃 늪 · 저택 문 앞',
    content: [
      '문을 열기 위해 등불에 담긴 나비 영혼들을 바칠 때마다 내 조상님들의 존재가 영원히 소멸해 간다…',
      '손이 떨리지만 이 비극을 끝내기 위해선 축복받은 검이 반드시 필요해.'
    ],
  },
  {
    id: 'diary_4_parents',
    chapterId: 4,
    title: '다쿠와 케이코의 마지막 편지',
    author: '다쿠 & 케이코',
    dateLabel: '지하 대동굴 입구',
    content: [
      '사랑하는 아들 야스에게. 우리가 저주에 굴복해 괴물이 되어 너를 가로막더라도 끝까지 살아남아 사이고모(킨토루)를 쓰러뜨려 다오.',
      '마사시게 가문의 비극은 네 세대에서 반드시 끝나야 한다.'
    ],
  },
  {
    id: 'diary_4_saigomo',
    chapterId: 4,
    title: '축복받은 검 토벌 지침',
    author: '마사시게 쿠스노키',
    dateLabel: '사이고모의 지하 대동굴',
    content: [
      '사이고모가 두른 제어의 결계는 평상시 축복받은 검의 칼날조차 튕겨낸다. 반드시 스턴을 걸어 결계를 깨뜨린 3초 동안 베어야 한다.',
      '붉은 수정 가시와 핏빛 오의, 도약 충격파를 피하며 암벽 충돌이나 공격 준비 중 패링, 또는 오의 직후 과열 순간을 노려 약 20차례 이상 베어 저주를 끝내거라!'
    ],
  },
  // --- BOOK II DIARIES ---
  {
    id: 'diary_5_mimic_corpse',
    bookId: 2,
    chapterId: 5,
    title: '모방체 시체 감식 보고서',
    author: '우치우미 이사무',
    dateLabel: '아오가시마 해안 수사 수첩',
    content: [
      '바다에서 건져 올린 형의 시체는 심장이 뜯긴 채 부패하지 않는 정체불명의 검은 물질로 뭉쳐져 있었다.',
      '섬을 떠돌던 쥐들을 잡아 독이 든 우물에 담갔다가 미오와 린에게 3번 먹여야 선착장 탈출구가 열린다는 기괴한 소문이 돌고 있다.'
    ],
  },
  {
    id: 'diary_5_childhood_scar',
    bookId: 2,
    chapterId: 5,
    title: '센자이의 찢긴 일기 (어린 시절)',
    author: '우치우미 센자이',
    dateLabel: '오래된 우치우미 가문 기록',
    content: [
      '이사무 네가 “형에게 사실대로 말하라고 했다”며 내 등을 떠민 그날, 아버지가 휘두른 흉기에 내 이마가 찢어졌다.',
      '정작 너는 아버지의 매질이 두려워 전부 내 탓으로 돌렸고, 그날 이후 아버지의 편애와 내 지옥 같은 질투가 시작되었다.'
    ],
  },
  {
    id: 'diary_6_sanctum_betrayal',
    bookId: 2,
    chapterId: 6,
    title: '키이로이바라 교단 간부 서약서',
    author: '우치우미 센자이',
    dateLabel: '해저 성역 입구',
    content: [
      '쿄기 님의 인도로 해저 성역에 봉인된 엔즈카이 님을 뵈었을 때, 내 안의 질투가 비로소 주인을 찾았음을 깨달았다.',
      '동생 이사무가 바다의 가짜 시체를 물고 성역까지 내려온다면, 나기사가 기다리는 심해의 제단에 가두어 그 심장을 바칠 것이다.'
    ],
  },
  {
    id: 'diary_6_nagisa_warning',
    bookId: 2,
    chapterId: 6,
    title: '생존을 포기한 잠수부의 수기',
    author: '실종된 잠수부',
    dateLabel: '심해의 성역 침수 회랑',
    content: [
      '성역 깊은 곳의 봉인이 얇아지고 있다. 푸른 비늘의 바다 괴물 나기사가 물길을 따라 순찰 중이니 부적 다섯 장을 모으기 전엔 절대 발각되지 마라.',
      '또한 2장부터는 엔즈카이의 질투 손아귀가 정신을 갉아먹으니 6초간 손을 쳐내 버텨야 한다.'
    ],
  },
  {
    id: 'diary_7_jigoku_scroll',
    bookId: 2,
    chapterId: 7,
    title: '지고쿠(地獄) 망자의 기록',
    author: '이름 없는 망자',
    dateLabel: '사후 세계 · 지고쿠 피의 강',
    content: [
      '심장을 잃고 떨어진 이 곳은 영혼의 인도자들이 감시하는 지고쿠다. 돌아가고 싶다면 영혼 등불 다섯 개를 밝혀 저승의 신 시니가미 앞에 서라.',
      '시니가미는 대가 없이 힘을 빌려주지 않는다. 반드시 영혼과 수명을 걸어야만 백염(White Flame)을 손에 넣을 수 있다.'
    ],
  },
  {
    id: 'diary_7_white_flame',
    bookId: 2,
    chapterId: 7,
    title: '시니가미와 백염의 서약서',
    author: '시니가미 (Shinigami)',
    dateLabel: '지고쿠 출구 관문',
    content: [
      '형사 우치우미 이사무의 영혼을 담보로 일시적인 절반의 부활과 신성한 힘 ‘백염(White Flame)’을 허락하노라.',
      '이승의 해가 완전히 저물어 짐승을 처단하는 순간, 계약자의 수명 또한 거두어들일 것이다.'
    ],
  },
  {
    id: 'diary_8_tokyo_2022',
    bookId: 2,
    chapterId: 8,
    title: '2022년 가와사키구 대피 방송 녹취록',
    author: '도쿄 재난대책본부',
    dateLabel: '2022년 · 파괴된 가와사키구',
    content: [
      '[긴급] 원인 불명의 검은 안개와 거대한 한냐 형상 괴이(엔즈카이) 출현으로 가와사키구 및 도쿄 일대 건물 다수가 붕괴되었습니다.',
      '현장에 남은 자들은 질투의 결계에 접근하지 말 것. 유일한 희망은 백염을 쥔 자뿐이다.'
    ],
  },
  {
    id: 'diary_8_endings',
    bookId: 2,
    chapterId: 8,
    title: '운명의 두 갈래 · 센자이와 네타모',
    author: '시니가미의 예언',
    dateLabel: '2022년 도쿄 최종 결전장',
    content: [
      '백염으로 형 센자이를 해방하고 엔즈카이를 끝까지 소멸시키면, 이사무는 계약대로 눈을 감지만 형은 구원받는다(굿 엔딩).',
      '만약 망설이거나 저주에 굴복하면 질투의 짐승과 새로운 위협 ‘네타모’가 세상을 집어삼키고 말 것이다(배드 엔딩).'
    ],
  },
];

