export type MonsterId = 'shizu' | 'biwaki' | 'megumi' | 'oomukade' | 'saigomo' | 'keiko';
export type DifficultyMode = 'normal' | 'nightmare';
export type JobId = 'student' | 'doctor' | 'police' | 'exorcist' | 'developer';

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
    summary: 'LA 퀸타 고교의 구조에 익숙하며 민첩한 발놀림으로 어둠을 빠져나가는 생존자입니다.',
    passiveLabel: '최대 스태미나 130 · 스태미나 회복 +35%',
    activeSkillName: '질주 본능',
    activeSkillDesc: '5초간 스태미나 소모 없이 이동 속도가 크게 상승합니다.',
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
    passiveLabel: '은신 소음 -25% · 챕터당 1회 치명타 자동 회피(응급 처치)',
    activeSkillName: '아드레날린 주사',
    activeSkillDesc: '즉시 스태미나를 100% 회복하고 손전등 배터리를 25% 충전합니다.',
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
    passiveLabel: '고성능 전술 손전등(배터리 소모 -30% · 광량 강화)',
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
    passiveLabel: '가장 가까운 목표 방향 나침반 · 배터리 소모 -45%',
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
];

export function isChapterUnlocked(chapterId: number, clearedChapters: number[]): boolean {
  if (chapterId <= 1) return true;
  return clearedChapters.includes(chapterId - 1);
}

export function isJobUnlocked(
  jobId: JobId,
  clearedChapters: number[],
  devUnlocked: boolean
): boolean {
  if (jobId === 'student') return true;
  if (jobId === 'doctor') return clearedChapters.includes(1);
  if (jobId === 'police') return clearedChapters.includes(2);
  if (jobId === 'exorcist') return [1, 2, 3, 4].every((id) => clearedChapters.includes(id));
  if (jobId === 'developer') return devUnlocked;
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
  subtitles: ChapterSubtitles;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  themeAccent: string;
}

export interface CharacterLore {
  id: string;
  name: string;
  japaneseName: string;
  role: string;
  status: string;
  summary: string;
  quote: string;
}

export interface MonsterLore {
  id: MonsterId;
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
    clearTitle: '이세계 깊은 곳으로 · 아라리 회랑 돌파',
    clearLines: [
      '네 개의 열쇠로 붉은 도리이 문을 열자 아라리 마을 너머의 거대한 황궁과 병원이 모습을 드러냈다.',
      '야스는 친구들이 아직 살아 있으리라는 희망을 품고 어둠 너머로 발을 내디뎠다.'
    ],
    clearScenes: [
      {
        speaker: '야스',
        speakerRole: 'Chapter I 탈출',
        accent: '#60a5fa',
        text: '“문이 열렸어…! 하지만 여기가 끝이 아니야. 도리이 너머로 황궁과 낡은 병원의 기운이 느껴져.”',
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
        text: '열쇠 4개를 모두 모았어! 아라리 이세계로 이어지는 붉은 도리이 출구로 달려!',
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
    title: '제4장: 최후의 결전과 엔딩',
    subtitle: '왜곡된 집 · 피의 늪 · 부모님의 방해와 거미 사이고모',
    location: '왜곡된 본가 · 피의 늪 & 사이고모의 은신처',
    objectiveLabel: '축복받은 검의 인장 6개를 해방해 거미 형상 사이고모를 쓰러뜨리십시오',
    requiredItems: 6,
    itemNoun: '축복받은 검의 인장',
    monsters: ['saigomo', 'keiko'],
    introLines: [
      '부모님마저 위험하다는 것을 깨달은 야스는 왜곡된 집과 피의 늪, 그리고 모교의 잔상을 다시 거쳐 킨토루의 진짜 은신처에 도달한다.',
      '그곳에서 기다리고 있던 것은 거대한 거미 형상 ‘사이고모(Saigomo)’로 변한 킨토루와, 저주받아 괴물이 되어 버린 부모님(다쿠, 케이코)이었다.',
      '부모님의 처절한 방해를 뚫고 여섯 개의 검 인장을 모두 깨워 사이고모를 쓰러뜨리고 가문의 오랜 저주를 끊어내라!'
    ],
    introScenes: [
      {
        speaker: '야스',
        speakerRole: '왜곡된 본가 · 피의 늪',
        accent: '#60a5fa',
        text: '“집이 피의 늪과 뒤섞여 왜곡되어 있어… 저 앞에 어머니 케이코와 아버지 다쿠가 보인다! 아버지, 어머니! 정신 차리세요!”',
      },
      {
        speaker: '케이코 & 다쿠 (저주받은 부모님)',
        speakerRole: '조종당하는 가족',
        accent: '#f43f5e',
        text: '“크으으… 야스… 가까이 오지 마… 킨토루의 실이 우리 몸을 조종하고 있어… 어서 도망쳐…!”',
      },
      {
        speaker: '사이고모 (거미 킨토루)',
        speakerRole: '제어의 짐승 본체',
        accent: '#ef4444',
        text: '“드디어 내 둥지까지 기어 들어왔구나, 야스. 네 부모의 손으로 직접 너를 찢고 내 거미줄에 매달아 주마!”',
      },
    ],
    clearTitle: '사이고모 토벌 · 마사시게 가문의 저주 해방',
    clearLines: [
      '여섯 번째 인장이 깨어나며 축복받은 검이 붉은 섬광을 뿜어냈고, 야스는 마침내 거미 형상의 킨토루 ‘사이고모’를 베어 쓰러뜨렸다.',
      '사이고모가 소멸하자 왜곡된 집과 피의 늪이 무너지며 마사시게 쿠스노키 가문을 괴롭히던 오랜 제어의 저주가 마침내 끊어졌다.'
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
        text: '여기가 사이고모의 은신처… 피의 늪을 건너 검의 인장 6개를 모두 해방하면 저주를 끊을 수 있어!',
      },
      onFirstItem: {
        speaker: '야스',
        accent: '#60a5fa',
        text: '첫 번째 검의 인장이 공명했어! 어머니, 아버지… 조금만 버티세요!',
      },
      onHalfItem: {
        speaker: '사이고모 (킨토루)',
        accent: '#ef4444',
        text: '“쓸데없는 발악이다! 내 거미 다리와 네 어미의 손길에서 빠져나갈 수 있을 것 같으냐!”',
      },
      onAllItems: {
        speaker: '야스',
        accent: '#10b981',
        text: '축복받은 검의 힘이 완전히 깨어났어! 붉은 도리이 제단으로 달려 사이고모를 베어 버리자!',
      },
      onFirstChase: {
        speaker: '야스',
        accent: '#ef4444',
        text: '거대한 거미 사이고모와 어머니가 쫓아와! 거미줄 회랑을 돌아 12m 밖으로 피해야 해!',
      },
      onEscapeChase: {
        speaker: '야스',
        accent: '#94a3b8',
        text: '12m 밖으로 벗어나 추격을 끊었어… 인장을 마저 해방하자!',
      },
    },
    fogColor: 0x050102,
    fogDensity: 0.116,
    ambientColor: 0x120508,
    themeAccent: '#ef4444',
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
    role: '네 마리의 악마 중 제어(Control) · 최종 흑막',
    status: '오오무카데 / 사이고모로 변신하여 결전',
    summary:
      '마사시게 쿠스노키에게 봉인되었던 원한으로 가문을 파멸시키려는 제어의 악마. 현실을 모방한 아라리 마을을 만들고 친구들을 삼켰으며, 지네(오오무카데)와 거미(사이고모) 형상으로 야스와 맞선다.',
    quote: '“마사시게의 핏줄이여, 네 친구들도 네 조상들도 전부 내 제어 아래 있을 뿐이다.”',
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
    dangerLevel: '치명적 (최종 결전 보스)',
    chapterAppearance: '제4장 왜곡된 집 · 피의 늪',
    description:
      '여섯 개의 거대한 거미 다리와 화려한 붉은 하카마, 창백한 노(能) 가면을 두른 킨토루의 최후 형태. 피의 늪과 거미줄 은신처에서 야스를 기다린다.',
    behaviorTip:
      '심장 박동이 빨라지면 사이고모가 12m 안으로 다가온 신호입니다. 도리이와 기둥을 엄폐물 삼아 인장 6개를 모두 해방하십시오.',
    accentColor: '#dc2626',
  },
  {
    id: 'keiko',
    name: '케이코 (저주받은 어머니)',
    japaneseName: '恵子 (Cursed Keiko)',
    bookOrigin: 'Book I · Chapter IV',
    title: '킨토루에게 조종당하는 야스의 어머니',
    dangerLevel: '고위험 (사이고모와 협공)',
    chapterAppearance: '제4장 왜곡된 집 · 피의 늪',
    description:
      '일본에서 미국까지 도망쳤지만 결국 킨토루에게 납치되어 세뇌당한 야스의 어머니. 챕터 4에서 피눈물을 흘리며 사이고모와 함께 야스의 앞을 가로막는다.',
    behaviorTip:
      '사이고모와 양쪽에서 포위당하지 않도록 항상 도주 경로를 확보하고 12m 이탈 거리를 유지하십시오.',
    accentColor: '#f43f5e',
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
      '반드시 열쇠 4개를 찾아 이세계 안쪽으로 들어가야 해.'
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
      '“황궁과 병원, 잊혀진 자의 영역을 떠도는 괴물들이 누구인지 아직도 모르겠느냐? 바로 너희 선조 쿠스노키의 죄로 인형이 된 네 조상들이다.”'
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
    dateLabel: '왜곡된 집 · 피의 늪 경계',
    content: [
      '사랑하는 아들 야스에게. 우리가 저주에 굴복해 괴물이 되어 너를 가로막더라도 끝까지 살아남아 사이고모(킨토루)를 쓰러뜨려 다오.',
      '마사시게 가문의 비극은 네 세대에서 반드시 끝나야 한다.'
    ],
  },
  {
    id: 'diary_4_saigomo',
    chapterId: 4,
    title: '축복받은 검의 마지막 의식',
    author: '야스',
    dateLabel: '사이고모의 거미 은신처',
    content: [
      '거미 형상 사이고모가 피의 늪 너머에서 나를 노리고 있다.',
      '여섯 개의 검 인장을 모두 깨우면 축복받은 검이 사이고모의 심장을 꿰뚫어 저주를 완전히 끊어낼 것이다.'
    ],
  },
];
