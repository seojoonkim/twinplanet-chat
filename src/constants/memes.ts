// ─── tripleS 짤방 메타데이터 ──────────────────────────────────
// sentBy: 메시지를 누가 "보내는"지 (해당 멤버 본인 or 다른 멤버)
// triggers: 대화에 이 단어가 나오면 발동 가능
// chance: 0~1 발동 확률 (기본 0.6)

export interface MemeData {
  id: string;
  filename: string;          // /public/memes/ 기준
  member: string;            // 짤방의 주인공 멤버
  sentBy: string | 'any';   // 누가 공유하는지
  description: string;
  caption: string;           // 멤버가 이미지와 함께 보내는 텍스트
  triggers: string[];        // 대화 중 이 단어 나오면 발동 가능
  antiTriggers?: string[];   // 이 단어 있으면 발동 안 함
  chance?: number;           // 발동 확률 (0~1)
}

export const MEMES: MemeData[] = [
  // ─── 채연 짤방 ─────────────────────────────────────────────
  {
    id: 'chaeyeon_ghost_1',
    filename: 'google_chaeyeon_haunted_49.jpg',
    member: 'chaeyeon',
    sentBy: 'seoyeon',
    description: '채연 귀신의집 공포 반응',
    caption: '이거 실화임? ㅋㅋㅋㅋ 채연아 저장해뒀어',
    triggers: ['귀신', '무서', '공포', '배지전쟁', '귀신의집', '트라우마'],
    chance: 0.7,
  },
  {
    id: 'chaeyeon_ghost_2',
    filename: 'google_chaeyeon_meme_1.jpg',
    member: 'chaeyeon',
    sentBy: 'yooyeon',
    description: '채연 귀신의집 눈물 장면',
    caption: '이거 말해도 되나... 말하겠습니다',
    triggers: ['귀신', '무서', '채연', '울', '눈물', '비명'],
    chance: 0.5,
  },
  {
    id: 'chaeyeon_mc_1',
    filename: 'google_chaeyeon_meme_2.jpg',
    member: 'chaeyeon',
    sentBy: 'chaeyeon',
    description: '채연 MC 진행자 포즈',
    caption: '자~ 여러분! 제가 한번 진행해볼게요 ✨',
    triggers: ['MC', '진행', '방송', '보니하니', '진행자'],
    chance: 0.6,
  },
  {
    id: 'chaeyeon_mc_2',
    filename: 'google_chaeyeon_meme_3.jpg',
    member: 'chaeyeon',
    sentBy: 'chaewon',
    description: '채연 보니하니 하니 시절',
    caption: '언니 이거 보니하니 맞죠?',
    triggers: ['보니하니', '하니', '진행자', 'MC'],
    chance: 0.55,
  },
  {
    id: 'chaeyeon_watermelon',
    filename: 'google_chaeyeon_meme_4.jpg',
    member: 'chaeyeon',
    sentBy: 'chaeyeon',
    description: '채연 워터밤 2023',
    caption: '워터밤 그때 진짜 더웠는데... 그래도 재밌었어!',
    triggers: ['워터밤', '여름', '물', '축제'],
    chance: 0.5,
  },
  {
    id: 'chaeyeon_yeon',
    filename: 'google_chaeyeon_meme_5.jpg',
    member: 'chaeyeon',
    sentBy: 'chaeyeon',
    description: '채연 너는 무슨 연이니 시전',
    caption: '근데 너는 무슨 연이니?? 🤔',
    triggers: ['연', '무슨 연', '이름'],
    chance: 0.65,
  },
  {
    id: 'chaeyeon_child_actor',
    filename: 'google_chaeyeon_meme_6.jpg',
    member: 'chaeyeon',
    sentBy: 'seoyeon',
    description: '채연 아역배우 시절',
    caption: '구암허준 채연이 맞아? ㅋㅋㅋ',
    triggers: ['아역', '구암', '여왕의교실', '어릴때', '데뷔전'],
    chance: 0.6,
  },
  {
    id: 'chaeyeon_green',
    filename: 'google_chaeyeon_meme_7.jpg',
    member: 'chaeyeon',
    sentBy: 'chaewon',
    description: '채연 연두색 표정',
    caption: '언니 상징색이 연두색인 거 알죠?',
    triggers: ['연두', '상징색', '초록'],
    chance: 0.7,
  },

  // ─── 채원 짤방 ─────────────────────────────────────────────
  {
    id: 'chaewon_strawberry_1',
    filename: 'google_chaewon_strawberry_11.jpg',
    member: 'chaewon',
    sentBy: 'chaewon',
    description: '채원 딸기 사랑 표정',
    caption: '딸기 얘기가 나왔으니 제가 한마디...',
    triggers: ['딸기', '딸랑단', '딸기농사', '딸기잼'],
    chance: 0.8,
  },
  {
    id: 'chaewon_strawberry_2',
    filename: 'google_chaewon_strawberry_kr_50.jpg',
    member: 'chaewon',
    sentBy: 'yooyeon',
    description: '채원 딸기농사 지원서 관련',
    caption: '입사지원서에 딸기농사 적은 거 진짜예요?',
    triggers: ['딸기농사', '지원서', '은퇴'],
    chance: 0.75,
  },
  {
    id: 'chaewon_martial_1',
    filename: 'msnz_chaewon_1.jpg',
    member: 'chaewon',
    sentBy: 'chaewon',
    description: '채원 쌍절곤 개인기',
    caption: '이거는 제가 해결할 수 있어요',
    triggers: ['무술', '합기도', '특공무술', '쌍절곤', '단'],
    chance: 0.7,
  },
  {
    id: 'chaewon_martial_2',
    filename: 'msnz_chaewon_2.jpg',
    member: 'chaewon',
    sentBy: 'chaeyeon',
    description: '채원 무술 포즈',
    caption: '채원아 무서워!! ㅋㅋㅋㅋ',
    triggers: ['무술', '격파', '발차기', '주먹'],
    chance: 0.6,
  },
  {
    id: 'chaewon_odaiba',
    filename: 'google_triples_meme_kpop_39.jpg',
    member: 'chaewon',
    sentBy: 'chaeyeon',
    description: '채원 오다이바 본인 못 찾기',
    caption: '채원아 이게 너잖아?? ㅋㅋㅋ 본인 맞지??',
    triggers: ['오다이바', '일본', '모니터', '못 찾', '닮은꼴'],
    chance: 0.7,
  },
  {
    id: 'chaewon_seoyeon_twins',
    filename: 'ymagazine_3yeon.jpg',
    member: 'chaewon',
    sentBy: 'chaeyeon',
    description: '채원 서연 닮은꼴',
    caption: '이거 채원이야 서연이야 ㅋㅋㅋ',
    triggers: ['닮', '쌍둥이', '헷갈', '구분'],
    chance: 0.65,
  },
  {
    id: 'chaewon_4d_expression',
    filename: 'google_triples_meme_kpop_40.jpg',
    member: 'chaewon',
    sentBy: 'chaewon',
    description: '채원 4차원 멍한 표정',
    caption: '...',
    triggers: ['4차원', '외계인', '왹왹', '뜬금없', '갑자기'],
    chance: 0.6,
  },
  {
    id: 'chaewon_universe_ticket',
    filename: 'google_triples_meme_kpop_41.jpg',
    member: 'chaewon',
    sentBy: 'chaewon',
    description: '채원 유니버스티켓 시절',
    caption: '그때 떨어지고 진짜 많이 울었는데...',
    triggers: ['유니버스티켓', '탈락', '오디션'],
    chance: 0.55,
  },

  // ─── 유연 짤방 ─────────────────────────────────────────────
  {
    id: 'yooyeon_csat_1',
    filename: 'google_yooyeon_samsu_51.jpg',
    member: 'yooyeon',
    sentBy: 'yooyeon',
    description: '유연 삼수 명언 장면',
    caption: '이과 가오가 저를 망쳐서... 삼수까지 이끌었습니다',
    triggers: ['삼수', '수능', '이과', '가오', '공부'],
    chance: 0.75,
  },
  {
    id: 'yooyeon_executive',
    filename: 'google_yooyeon_fact_21.jpg',
    member: 'yooyeon',
    sentBy: 'chaeyeon',
    description: '유연 임원 포스',
    caption: '유연 언니 또 임원모드ㅋㅋ 주주총회예요?',
    triggers: ['임원', '포스', '회의', 'CEO', '대표', '딱딱'],
    chance: 0.7,
  },
  {
    id: 'yooyeon_shortcut',
    filename: 'msnz_yooyeon_1.jpg',
    member: 'yooyeon',
    sentBy: 'chaeyeon',
    description: '유연 단발 사건',
    caption: '언니 단발 진짜 충격이었어요 ㅋㅋㅋ',
    triggers: ['단발', '머리', '잘렸', '컷트'],
    chance: 0.65,
  },
  {
    id: 'yooyeon_ewha',
    filename: 'google_yooyeon_fact_22.jpg',
    member: 'yooyeon',
    sentBy: 'yooyeon',
    description: '유연 이화여대',
    caption: '그래도 이화여대 가긴 했습니다...',
    triggers: ['이화여대', '대학교', '복학', '과학교육'],
    chance: 0.6,
  },
  {
    id: 'yooyeon_leon',
    filename: 'seoyeon_yooyeon_moment.jpeg',
    member: 'yooyeon',
    sentBy: 'seoyeon',
    description: '유연 레옹 무대',
    caption: '차단하겠다면서 본인이 제일 자주 꺼내는 거 알죠?',
    triggers: ['레옹', '차단', '무대'],
    chance: 0.7,
  },
  {
    id: 'yooyeon_archery',
    filename: 'google_yooyeon_fact_23.jpg',
    member: 'yooyeon',
    sentBy: 'yooyeon',
    description: '유연 양궁 10점',
    caption: '왼손 양궁 10점은... 그냥 됐어요',
    triggers: ['양궁', '활', '운동', '재능'],
    chance: 0.55,
  },

  // ─── 서연 짤방 ─────────────────────────────────────────────
  {
    id: 'seoyeon_ceo_speech',
    filename: 'google_seoyeon_leader_31.jpg',
    member: 'seoyeon',
    sentBy: 'seoyeon',
    description: '서연 대표님 일 잘해주세요 수상소감',
    caption: '대표님, 앞으로 일 잘해주세요',
    triggers: ['대표님', '정병기', '수상', '소감', '회사', '1위'],
    chance: 0.75,
  },
  {
    id: 'seoyeon_crying',
    filename: 'google_seoyeon_leader_32.jpg',
    member: 'seoyeon',
    sentBy: 'chaeyeon',
    description: '서연 그리고그리고 울음 밈',
    caption: '서연이 또 그리고 그리고ㅋㅋㅋㅋ',
    triggers: ['그리고', '울', '눈물', '수상소감', '감동'],
    chance: 0.7,
  },
  {
    id: 'seoyeon_zero_trainee',
    filename: 'google_seoyeon_leader_33.jpg',
    member: 'seoyeon',
    sentBy: 'chaeyeon',
    description: '서연 연습생 0일 리더',
    caption: '채연이 5년인데 서연이는 0일이라고?! 나 아직도 이해 안 돼 ㅋㅋㅋ',
    triggers: ['연습생', '0일', '리더', '퀸덤', '즉시'],
    chance: 0.7,
  },
  {
    id: 'seoyeon_s1',
    filename: 'google_seoyeon_leader_34.jpg',
    member: 'seoyeon',
    sentBy: 'seoyeon',
    description: '서연 S1 근본 포즈',
    caption: '우리는 하나이자 스물넷입니다',
    triggers: ['S1', '근본', '최초', '첫번째'],
    chance: 0.55,
  },
  {
    id: 'seoyeon_icecream',
    filename: 'seoyeon_bonus_1.jpg',
    member: 'seoyeon',
    sentBy: 'seoyeon',
    description: '서연 아이스크림 사랑',
    caption: '아이스크림 얘기 나왔어? 내 얘기야',
    triggers: ['아이스크림', '아이스', '빙수', '디저트'],
    chance: 0.65,
  },
  {
    id: 'seoyeon_license',
    filename: 'seoyeon_krystal_1.jpg',
    member: 'seoyeon',
    sentBy: 'chaeyeon',
    description: '서연 장롱면허',
    caption: '서연이 면허 있는데 못 몰잖아ㅋㅋㅋ',
    triggers: ['면허', '운전', '차', '장롱'],
    chance: 0.6,
  },

  // ─── 그룹/정병기 짤방 ─────────────────────────────────────
  {
    id: 'jbk_appear',
    filename: 'jbk_appear.jpg',
    member: 'jungbyeongki',
    sentBy: 'seoyeon',
    description: '정병기 대표 등장',
    caption: '대표님 여기 계세요?',
    triggers: ['대표님', '정병기', '모드하우스', '회사'],
    chance: 0.5,
  },
  {
    id: 'group_assemble',
    filename: 'assemble25_group.jpeg',
    member: 'group',
    sentBy: 'any',
    description: 'ASSEMBLE25 단체 사진',
    caption: 'ASSEMBLE25! 🌟',
    triggers: ['어셈블', 'ASSEMBLE', '24명', '전원'],
    chance: 0.5,
  },
  {
    id: 'group_wav',
    filename: 'assemble25_all_1.jpg',
    member: 'group',
    sentBy: 'any',
    description: 'WAV 팬들과 함께',
    caption: 'WAV 여러분 보고 싶어요!',
    triggers: ['WAV', '팬', '팬분들', '팬사인회'],
    chance: 0.45,
  },
  {
    id: 'group_gravity',
    filename: 'assemble25_all_2.jpg',
    member: 'group',
    sentBy: 'seoyeon',
    description: 'Gravity 무대',
    caption: 'Gravity 무대 진짜 열심히 했는데 ㅎㅎ',
    triggers: ['Gravity', '그래비티', '데뷔', '무대'],
    chance: 0.45,
  },
  {
    id: 'group_laugh_1',
    filename: 'group_meme_1.jpg',
    member: 'group',
    sentBy: 'any',
    description: '멤버들 단체 웃음 짤',
    caption: 'ㅋㅋㅋㅋㅋ',
    triggers: ['ㅋㅋㅋ', '웃기', '진짜', '미쳐'],
    chance: 0.3,
  },
];

// 트리거 매칭 함수
export function findMatchingMeme(
  text: string,
  _lastSpeaker: string,
  recentMemeIds: string[]
): MemeData | null {
  const lowerText = text.toLowerCase();

  const candidates = MEMES.filter((meme) => {
    // 최근에 쓴 짤은 제외 (중복 방지)
    if (recentMemeIds.includes(meme.id)) return false;

    // antiTrigger 체크
    if (meme.antiTriggers?.some((t) => lowerText.includes(t))) return false;

    // trigger 매칭
    const matched = meme.triggers.some((t) => lowerText.includes(t.toLowerCase()));
    if (!matched) return false;

    // sentBy가 'any'가 아니면 현재 화자(or 다른 화자)만 가능
    // sentBy === lastSpeaker: 본인이 자기 짤 보내는 경우
    // sentBy !== lastSpeaker & sentBy !== 'any': 다른 멤버가 보내는 경우
    return true;
  });

  if (candidates.length === 0) return null;

  // 확률 기반 선택
  const lucky = candidates.filter((m) => Math.random() < (m.chance ?? 0.6));
  if (lucky.length === 0) return null;

  // 랜덤 하나 선택
  return lucky[Math.floor(Math.random() * lucky.length)] ?? null;
}
