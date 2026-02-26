import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_MEMBERS } from '@/constants/group-rooms';

// ── 타입 ────────────────────────────────────────────────────
type FeedSource = 'youtube' | 'twitter' | 'instagram';

interface CommentLike {
  memberId: string;
}

interface Reply {
  memberId: string;
  content: string;
  likes: CommentLike[];
}

interface Comment {
  memberId: string;
  memberName: string;
  sNumber: string;
  content: string;
  likes: CommentLike[];
  replies: Reply[];
}

interface UnifiedPost {
  id: string;
  source: FeedSource;
  timestamp: number;
  title?: string;
  body: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  link?: string;
  likes: number;
  comments: Comment[];
  posterId: string;
  authorAvatarUrl?: string;
  // 리트윗(리포스트) 메타
  isRetweet?: boolean;
  rtAuthorName?: string;
  rtAuthorUsername?: string;
  // 트윗 내 링크들
  tweetUrls?: { url: string; expanded: string; display: string }[];
  memberTags?: string[];
}

// ── 해시 유틸 ────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── タレントラベル ────────────────────────────────────────────
const S_NUMBERS: Record<string, string> = {
  'atarashii-gakko': 'AG!',
  mizyu:    'MIZYU',
  rin:      'RIN',
  suzuka:   'SUZUKA',
  kanon:    'KANON',
  nako:     '奈子',
  nana:     '奈々',
  taiyo:    '太陽',
  yoshiaki: 'よしあき',
  michi:    'ミチ',
};

const MEMBER_ORDER = Object.keys(S_NUMBERS);

const MEMBER_KEYWORDS: Record<string, string[]> = {
  'atarashii-gakko': ['AG!', 'ATARASHII GAKKO', '新しい学校', 'リーダーズ', '아타라시이'],
  mizyu:    ['MIZYU', 'ミジュ', '미쥬'],
  rin:      ['RIN', '린', 'りん'],
  suzuka:   ['SUZUKA', 'スズカ', '스즈카'],
  kanon:    ['KANON', 'かのん', '카논'],
  nako:     ['奈子', '矢吹奈子', 'nako', 'なこ', '나코'],
  nana:     ['奈々', '鈴木奈々', 'nana', 'なな', '나나'],
  taiyo:    ['太陽', '杉浦太陽', 'taiyo', 'たいよう', '타이요'],
  yoshiaki: ['よしあき', 'yoshiaki', '요시아키', 'ONSENSE'],
  michi:    ['ミチ', 'michi', '미치', 'よしミチ'],
};

function detectMemberTags(text: string): string[] {
  const found: string[] = [];
  for (const [id, keywords] of Object.entries(MEMBER_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) found.push(id);
  }
  return found.length > 0 ? found : ['all'];
}

// ── 키워드 태그 ──────────────────────────────────────────────
interface Tags {
  hasJapan: boolean;
  hasConcert: boolean;
  hasComeback: boolean;
  hasFood: boolean;
  hasPhoto: boolean;
  hasDance: boolean;
  hasCute: boolean;
  hasMayu: boolean;
  hasKaede: boolean;
  hasKotone: boolean;
}

function detectTags(title: string, body: string): Tags {
  const kw = (title + ' ' + body).toLowerCase();
  return {
    hasJapan:    /일본|japan|tokyo|osaka|東京|大阪|jp\b/.test(kw),
    hasConcert:  /콘서트|concert|공연|투어|tour|zone|stage|무대/.test(kw),
    hasComeback: /컴백|comeback|신곡|앨범|album|love.?pop|assemble|ep\b/.test(kw),
    hasFood:     /먹|food|eat|맛있|맛집|배고|hungry|meal|🍜|🍚|🍣/.test(kw),
    hasPhoto:    /사진|포토|photo|pic|📷|shot|촬영/.test(kw),
    hasDance:    /안무|댄스|dance|춤|choreography/.test(kw),
    hasCute:     /귀여|cute|애교|아기|baby|💕/.test(kw),
    hasMayu:     /mayu|마유|マユ/.test(kw),
    hasKaede:    /kaede|카에데|カエデ/.test(kw),
    hasKotone:   /kotone|코토네|コトネ/.test(kw),
  };
}

// ── 포스터(업로더) 감지 ───────────────────────────────────────
const MEMBER_NAME_PATTERNS: [string, RegExp][] = [
  ['atarashii-gakko', /#AG|#ATARASHIIGAKKO|#新しい学校/i],
  ['mizyu',    /#MIZYU|#mizyu|#ミジュ/i],
  ['rin',      /#RIN\b|#rin\b|#りん/i],
  ['suzuka',   /#SUZUKA|#suzuka|#スズカ/i],
  ['kanon',    /#KANON|#kanon|#かのん/i],
  ['nako',     /#nako|#奈子|#矢吹奈子/i],
  ['nana',     /#nana|#鈴木奈々|#suzukinana/i],
  ['taiyo',    /#taiyo|#太陽|#杉浦太陽/i],
  ['yoshiaki', /#yoshiaki|#よしあき|#ONSENSE/i],
  ['michi',    /#michi|#ミチ|#よしミチ/i],
  // legacy placeholder to avoid empty array
  ['seoyeon',  /#seoyeon|#서연|#SeoYeon|#소연/i],
  ['hyerin',   /#hyerin|#혜린|#HyeRin/i],
  ['jiwoo',    /#jiwoo|#지우|#JiWoo/i],
  ['chaeyeon', /#chaeyeon|#채연|#ChaEYeon/i],
  ['yooyeon',  /#yooyeon|#유연|#YooYeon/i],
  ['sumin',    /#sumin|#수민|#SuMin/i],
  ['naekyung', /#naekyung|#나경|#NaeKyung/i],
  ['yubin',    /#yubin|#유빈|#YuBin/i],
  ['kaede',    /#kaede|#카에데|#カエデ/i],
  ['dahyun',   /#dahyun|#다현|#DaHyun/i],
  ['kotone',   /#kotone|#코토네|#コトネ/i],
  ['yeonji',   /#yeonji|#연지|#YeonJi/i],
  ['nien',     /#nien|#니엔/i],
  ['sohyun',   /#sohyun|#소현|#SoHyun/i],
  ['shinwi',   /#shinwi|#신위|#XinYu/i],
  ['mayu',     /#mayu|#마유|#マユ/i],
  ['rin',      /#rin\b|#린\b|#リン/i],
  ['jubin',    /#jubin|#주빈|#JuBin/i],
  ['hayeon',   /#hayeon|#하연|#HaYeon/i],
  ['sion',     /#sion\b|#시온|#シオン/i],
  ['chaewon',  /#chaewon|#채원|#ChaeWon/i],
  ['seollin',  /#seollin|#설린|#SeolLin/i],
  ['seoa',     /#seoa|#서아|#SeoA/i],
  ['jiyeon',   /#jiyeon|#지연|#JiYeon/i],
];

function detectPoster(body: string, seed: number): string {
  const matched: string[] = [];
  for (const [id, pattern] of MEMBER_NAME_PATTERNS) {
    if (pattern.test(body)) matched.push(id);
  }
  if (matched.length === 0) return 'jbk';
  if (matched.length === 1) return matched[0]!;
  return matched[Math.abs(seed) % matched.length]!;
}

// ── 댓글 컨텐츠 풀 (멤버별 × 컨텍스트별) ─────────────────────
type Ctx = 'concert' | 'comeback' | 'food' | 'japan' | 'photo' | 'dance' | 'cute' | 'default';

const COMMENT_POOL: Record<string, Partial<Record<Ctx, string[]>>> = {
  seoyeon: {
    concert: [
      "어... 이번 안무 진짜 힘들었는데. 잘 봐줘요",
      "잘 하면 돼 뭘 걱정해",
      "어... 연습 때 다리 쥐 났었는데 아무도 모르지",
    ],
    comeback: [
      "어... 잘 될 것 같은데 왜 불안하지",
      "열심히 했으니까 되겠죠 어...",
      "어... 이 곡 녹음할 때 한 번에 됐어 나 천재인가",
    ],
    food: ["어... 맛있겠다", "먹으러 가자"],
    photo: ["어... 나 여기서 좀 괜찮지 않아?", "사진은 뭐 찍히는 대로"],
    cute: ["어... 귀엽긴 하네"],
    default: ["어... 잘 부탁해요", "열심히 할게요", "어... 할 말 없는데", "어... 사실 이거 준비하면서 제일 힘든 파트 있었는데 지금은 말할 수 있어요. 발목 삔 상태로 연습했어요. 아무도 몰랐죠? 그래도 다 됐으니까 괜찮아요 코스모스 감사합니다"],
  },
  hyerin: {
    concert: [
      "저 이 안무 마스터했어요!! 드디어!! 3일 걸림ㅋㅋ",
      "07즈 중에 내가 제일 잘하죠 ㅎㅎ (사실 다들 잘함)",
      "무대 끝나고 치킨 먹기로 약속했거든요 힘나요",
    ],
    comeback: ["이 노래 듣고 안무 바로 떠올랐어요!!", "진짜 자신 있어요!!"],
    food: ["맛있겠다! 지우야 같이 가자 내가 사줄게", "이거 진짜 맛있어요 추천!!"],
    default: ["기대해주세요!!", "이번엔 다르다고요 ㅎㅎ"],
  },
  jiwoo: {
    concert: [
      "이 공연... 어떻게 가요? 표 어디서 사요?",
      "저 무대 끝나고 어디 가야 해요?? 출구가 어디 ㅠㅠ",
      "이 무대에서 왜 제가 센터죠?? 저 키 큰 게 잘못인가요??",
    ],
    comeback: ["이 노래 가사가... 무슨 뜻이에요?? 저만 모르는 건가요??"],
    food: [
      "이게 뭐예요? 어떻게 만들어요? 저 못 만들겠어요",
      "이거 먹으면 키 더 크나요?? 이미 충분히 큰데...",
    ],
    photo: ["사진 찍을 때 표정을 어떻게 해야 해요?? 이게 맞나요??"],
    default: ["진짜 재밌을 것 같아요!", "같이 즐겨요~ ㅎㅎ"],
  },
  chaeyeon: {
    concert: [
      "오오오오!!! 💥 이 무대 진짜 기대됐는데 드디어!!!",
      "오!! 나 이거 보고 소름 돋았어!!!! 팔에 보여줄까요???",
      "오 잠깐만요 저 이 안무 연습하다가 어제 넘어졌는데 아무도 몰라야 해요",
    ],
    comeback: [
      "오!!!! 신곡 나왔다!!!! 저 이미 100번 들음!!!!",
      "오오오 이 노래 진짜 미쳤다!!!! 뮤비도 미쳤어!!!!",
    ],
    food: ["오오!! 나 이거 먹어봤는데 진짜 맛있어!!!!!", "이거 먹으면서 안무 연습했어요 ㅋㅋ"],
    photo: ["오!!!!! 이 사진 미쳤어!!! 다들 너무 이쁘다!!!!"],
    cute: ["오!!!! 귀여워!!! 나도 귀여워줘요!!! 💕💕"],
    default: ["에너지 폭발할 거예요 💥", "열심히 준비했어요!", "오오오오!!!!!! 저 진짜 이 무대/곡 기다렸는데 드디어!!! 연습하면서 얼마나 설렜는지 몰라요!! 다들 꼭 꼭 꼭 봐주세요!! 저 진짜 최선 다했어요!! 💥💥💥"],
  },
  yooyeon: {
    concert: ["잘 됐어", "오케이", "무대 좋네"],
    comeback: ["나왔네", "들었어", "괜찮은데"],
    food: ["맛있으면 됨"],
    photo: ["ㅇㅇ", "잘 나왔네"],
    cute: ["..."],
    default: ["알겠어", "ㅇㅇ", "그래"],
  },
  sumin: {
    concert: [
      "선배님들 정말 대단하세요!! 저도 열심히 할게요!! 감사합니다!! 💕",
      "언니오빠들 무대 너무 멋있어요!! 저 울 것 같아요!! 💕",
    ],
    comeback: [
      "와 새 노래 너무 좋아요!! 언니오빠들 다들 수고하셨어요!! 💕",
      "진짜 감동적이에요!! 존경합니다!! 💕",
    ],
    food: ["이거 맛있어 보여요!! 다 같이 먹으면 좋겠어요!! 💕"],
    cute: ["너무 귀여워요!! 저도 귀엽나요?? 💕"],
    default: ["코스모스 많이 와줘요! 💕", "같이 신나게 놀아요~ 💕", "언니오빠들 정말 너무 고생 많으셨어요!! 이걸 준비하시느라 얼마나 힘드셨을지... 저는 옆에서 보면서 진짜 대단하다고 생각했어요!! 코스모스 여러분도 꼭 함께해주세요!! 수민이도 열심히 할게요!! 💕💕"],
  },
  naekyung: {
    concert: [
      "저 이 무대 연습하면서 울었어요...",
      "코스모스분들 만나면 또 울 것 같아요 ㅠㅠ",
      "저 이 곡 처음 들었을 때 샤워하다가 울었어요...",
    ],
    comeback: [
      "신곡 처음 들었을 때 눈물났어요... 진짜 너무 좋아요 ㅠㅠ",
      "가사 읽다가 또 울었어요... 이러면 안 되는데 ㅠㅠ",
    ],
    food: ["맛있는 거 먹으면 왜 눈물이 나죠 ㅠㅠ 감동이에요"],
    photo: ["이 사진 보니까 눈물나요... 추억이 ㅠㅠ"],
    cute: ["귀여워서 울겠어요 ㅠㅠ"],
    default: ["무조건 옵니다!! 🔥", "기대하세요!!!", "저 처음 이 곡 받았을 때 가사 읽다가 울었어요... 진짜 이런 감정을 이렇게 표현할 수 있구나 싶어서... 코스모스 여러분이 들어줄 때 저도 같이 느낄 수 있으면 좋겠어요 ㅠㅠ 감사해요"],
  },
  yubin: {
    concert: [
      "이 무대... 사실 좀 무서운데 ㅋㅋ 대신 줄넘기 하나는 자신 있음",
      "어... 잘 될 거야 아마도 ㅋㅋ (줄넘기 싸들고 갈까)",
    ],
    comeback: ["괜찮은 것 같아 ㅋㅋ 들어볼게", "나쁘지 않은데 ㅋ"],
    food: ["먹어볼게 ㅋ", "맛있으면 다행이지 뭐"],
    default: ["어... 잘 될 거야", "ㅋㅋ 해볼게"],
  },
  kaede: {
    japan: [
      "やっと日本！！！待ってたよ～！！！ 진짜 기대돼!!!",
      "일본 공연 楽しみにしてた！！やっぱ最高～！！",
      "やっと日本に行ける！！嬉しすぎ！！ 다들 와줘!!",
    ],
    concert: ["この舞台 진짜 최고야！みんな来てね！", "ステージ楽しみ!!"],
    food: ["이거 일본에서도 먹어봤어요!! 美味しい！！"],
    photo: ["写真きれい！！ 예쁘다!! ✨"],
    default: ["頑張ります！✨ 같이 가요~", "楽しみ!! 기대해줘!!", "ずっとこれを待ってたよ～！！！연습하면서 진짜 힘들었지만 카에데 최선 다했어요！みんな絶対見てね！！コスモスのみんな大好き！！🌸"],
  },
  dahyun: {
    food: [
      "아이고 이거 진짜 맛있다아~ 부산에도 생겼으면 좋겠네~",
      "우리 부산 음식이 더 맛있는데 ㅋㅋ 한번 와봐라",
      "부산 가면 이거보다 맛있는 거 사줄게~",
    ],
    concert: ["진짜 좋다아~ 이 무대 부산 팬들도 봤으면 좋겠는데~"],
    comeback: ["이 노래 진짜 좋다아~ 부산에서도 다 알겠다~", "부산 사투리로 부르면 더 좋을텐데ㅋㅋ"],
    default: ["좋다아~ 기대해주이소!", "다현이가 잘 하겠심더~"],
  },
  kotone: {
    japan: [
      "やっと…待ってた",
      "東京来るんだ…嬉しい",
      "日本ツアー…楽しみにしてる",
    ],
    concert: ["見に行く", "最高だった", "ステージ良かった"],
    food: ["食べたい…", "美味しそう"],
    default: ["楽しみ", "良かった", "うん"],
  },
  yeonji: {
    concert: [
      "이 무대 보고 나서 게임 접속했는데 집중 안 됨 ㅋㅋ",
      "이 에너지 게임에도 써야 하는데ㅋㅋ 버프 받은 느낌",
    ],
    comeback: ["새 노래 나왔다 ㅋㅋ 게임 BGM으로 써야겠다", "이거 듣고 랭크 2연승함 ㅋㅋ"],
    food: ["먹으면서 게임하면 딱인데 ㅋㅋ"],
    photo: ["이 사진 게임 로딩 화면 느낌 ㅋㅋ 이쁘다"],
    default: ["ㄱㄱ", "GG ㅋㅋ", "이거 버프임 ㅋ"],
  },
  nien: {
    food: [
      "먹방!!! 我要吃!! 저도 데려가줘요!!! 🍜",
      "이거 대만에도 있어요!! 맛있어!! 好吃！",
      "저 이거 3그릇 먹었어요. 사실이에요.",
    ],
    japan: ["일본 음식도 맛있어요!! 好吃好吃！！"],
    concert: ["공연 끝나고 뭐 먹어요?? 我好饿！！", "무대 멋있어요!! 加油！"],
    default: ["저도 할 수 있어요!! 加油！", "열심히 할게요!! 💜"],
  },
  sohyun: {
    concert: ["...좋아", "무대... 예쁘겠다"],
    comeback: ["좋다", "들었어... 좋아"],
    photo: ["예쁘다"],
    food: ["먹고 싶다"],
    cute: ["귀엽"],
    default: ["열심히 할게요", "...좋아", "ㅎ"],
  },
  shinwi: {
    concert: [
      "키 크니까 무대에서 다르죠 ㅎㅎ 174cm의 위엄",
      "174cm의 퍼포먼스 기대해주세요~ 무대 위에서 제가 더 빛나요",
    ],
    photo: [
      "역시 키 크면 사진이 달라요 ㅎㅎ 비율 보세요",
      "제 사진이 왜 이렇게 잘 나왔을까요 역시 저니까 ㅎㅎ",
    ],
    comeback: ["이 노래 불러봤는데요 제 목소리가 제일 어울려요 사실", "새 노래! 제 파트가 제일 좋지 않나요? ㅎㅎ"],
    default: ["제가 있으니까 괜찮을 거예요 ㅎㅎ", "역시 저 ✨"],
  },
  mayu: {
    photo: [
      "この写真 너무 아름다워… 내가 찍었으면 좋았을텐데 ㅠㅠ",
      "📷 光がすごく綺麗… 이런 빛은 못 참아",
    ],
    japan: [
      "日本での撮影楽しみにしてる✨ 카메라 3개 가져갈 거야",
      "아 근데 내 카메라 배터리 또 없어졌어",
    ],
    concert: ["舞台照明 아름다울 것 같아！ 카메라 가져가도 돼요??"],
    default: ["写真撮りたい✨", "綺麗～ 예쁘다~"],
  },
  rin: {
    concert: ["무대 연습 많이 했어요... 기대해주세요", "댄스 파트 자신 있어요"],
    dance: ["이 안무 좋아요. 많이 연습했어요", "이 동작이 제일 어려웠는데 마스터했어요"],
    default: ["기대해주세요~", "열심히 할게요"],
  },
  jubin: {
    concert: [
      "자, 다들 주목!! 이번 공연 포인트는 바로~~ (MC 본능 발동)",
      "오늘의 하이라이트 소개해드리겠습니다~ 무대 4번에서 대박나거든요",
    ],
    comeback: [
      "이번 곡 킬링파트 들어보셨나요?? 제가 설명해드리겠습니다~~",
      "자 여기서 퀴즈! 이 노래 키 몇번 바뀌게요?? 맞추면 사인 ㅋㅋ",
    ],
    food: ["자 오늘의 맛집 리뷰 시간입니다~~ 결론부터 말씀드리면... 맛있어요 ㅋㅋ"],
    photo: ["사진 리뷰 코너! 오늘 MVP는~~ ㅋㅋ"],
    default: ["열심히 준비했어요!! 🙌", "설레요!!", "자자자, 여러분 주목해주세요!! 이번 작품의 포인트를 제가 직접 설명해드리겠습니다~ 먼저 첫 번째 파트에서 주목해야 할 부분은... 아 이거 다 스포일러 되겠다ㅋㅋ 그냥 보세요 최고예요!!"],
  },
  hayeon: {
    photo: [
      "잠깐 저 이 사진에서 좀 이쁘지 않아요?? 사진 잘 받은 것 같은데 ㅎㅎ",
      "저 잘생겼다... 매일 느끼지만 오늘 특히 ㅎㅎ",
    ],
    concert: [
      "무대 조명 받으면 제가 더 빛나거든요 사실ㅎㅎ",
      "이번 무대 스타일링 진짜 제 얼굴에 맞춤이에요 ㅎㅎ",
    ],
    comeback: ["뮤비에서 제 얼굴이 제일 잘 나왔어요 인정?? ㅎㅎ"],
    default: ["꼭 봐주세요~ 잘생긴 사람이 ㅎㅎ", "행복한 시간 될 거예요!"],
  },
  sion: {
    concert: [
      "꺄아아아아!!!!! 💜💜 이 공연 진짜 기대돼요!!!!! 저 이미 흥했어요!!!!!",
      "으아아아!! 무대 보자마자 소리 질렀어요!! 지금도 흥남!!",
    ],
    comeback: [
      "꺄!!!!! 신곡!!!!! 저 이거 진짜 진짜 좋아해요!!!!! 😭😭",
      "꺄아아아!!!!!!! 저 이거 듣고 밥 3번 먹었어요 흥이 나서",
    ],
    food: ["먹방!! 흥!! 먹으면서 춤추면 칼로리 제로 아닌가요?!?!", "이거 맛있어요?? 맛있으면 흥나잖아요!!!!!"],
    cute: ["귀여워요!!!!! 저도 귀여워요!!!!! 💕💕💕"],
    default: ["시온이 열심히 할게요 🌸", "코스모스 사랑해요~!!!!!", "꺄아아아아아아아아!!!!!!!! 저 진짜 이거 받고 숙소에서 혼자 방방 뛰었어요ㅋㅋㅋ 룸메이트가 뭐냐고 해서 신곡이라고 했더니 같이 뛰어줬어요ㅋㅋ 진짜 너무 좋아요 여러분 들어보세요!!!!! 💜💜"],
  },
  chaewon: {
    concert: [
      "저 흥 못 참아서 대기실에서 쌍절곤 돌릴 뻔 했어요 진짜로 ㅋㅋ",
      "무대에서 쌍절곤 퍼포먼스 하면 안 되나요?? 진짜 멋있을 건데",
    ],
    comeback: [
      "이 노래 들으면서 쌍절곤 연습하면 박자 딱 맞을 것 같은데 ㅋㅋ",
      "저 이 노래 리듬 타다가 쌍절곤 돌리다가 창문 칠 뻔 했어요",
    ],
    food: ["이거 쌍절곤으로 면 건질 수 있을까요 ㅋㅋ", "맛있겠다!! 먹으면서 쌍절곤 연습할래요 ㅋ"],
    cute: ["저 귀엽죠?? 귀엽죠?? 인정이죠?? 💕", "막내 파워!! 귀여운 건 제가 1등이에요!!"],
    default: ["떨리는데 기대돼요~", "저 이번엔 진짜 열심히요 ㅋㅋ"],
  },
  seollin: {
    concert: [
      "저 승마 연습하면서 이 노래 들었는데 박자 딱 맞아요 ㅋㅋ",
      "오빠 언니들 항상 멋있어요!! 말 타면서 응원할게요 🐴",
    ],
    comeback: ["새 노래 말 타면서 들었는데 말도 흥났어요 ㅋㅋ"],
    default: ["설린도 최선 다할게요! ✨", "기대해주세요! 🐴"],
  },
  seoa: {
    concert: [
      "저도 이 무대 보고 싶어요!!!! 선배님들 너무 멋있어요!!!",
      "무대 끝나고 선배님들한테 사인 받을래요!! ☀️",
    ],
    comeback: ["새 노래!! 저도 부르고 싶어요!! ☀️", "가사가 너무 예뻐요!!"],
    cute: ["저도 귀여워요?? ☀️☀️", "아기라서 원래 귀여운 거예요 ㅎㅎ"],
    default: ["꼭 봐주세요!! 열심히 할게요!! ☀️", "서아 기대돼요!! 🌟"],
  },
  jiyeon: {
    concert: [
      "발레 훈련 받아서 무대 체력은 자신 있어요~ (사실 넘어질 뻔 했음 ㅋㅋ)",
      "이 안무 발레 동작이랑 비슷한 파트 있어서 자신 있어요! (아마도)",
    ],
    dance: ["이 동작 발레에서 본 적 있어요! 제가 도와줄게요~"],
    default: ["우아하게 할게요... 아마도 ㅋㅋ", "지연이도 열심히 할게요!! 💜"],
  },
};

// ── 대화 스레드 (chemistry pairs) ──────────────────────────────
interface Thread {
  ctx: Ctx;
  comments: { memberId: string; content: string }[];
  replyChain: { memberId: string; content: string }[];
}

const THREADS: Thread[] = [
  // 채연 넘어짐
  { ctx: 'concert', comments: [{ memberId: 'chaeyeon', content: '오 잠깐만요 저 이 안무 연습하다가 어제 넘어졌는데 아무도 몰라야 해요' }],
    replyChain: [
      { memberId: 'hyerin', content: '채연아 나 봤는데 ㅋㅋㅋ' },
      { memberId: 'chaeyeon', content: '혜린언니!!!!!😭😭😭' },
      { memberId: 'jiwoo', content: '어디서 넘어졌어요?? 나도 조심해야 하는데ㅠㅠ' },
    ],
  },
  // 나경 샤워 울음
  { ctx: 'concert', comments: [{ memberId: 'naekyung', content: '저 이 곡 처음 들었을 때 샤워하다가 울었어요...' }],
    replyChain: [
      { memberId: 'yubin', content: '나경아 샤워하다가?? ㅋㅋㅋ 세상에' },
      { memberId: 'naekyung', content: '어쩔 수 없잖아요 ㅠㅠ 감동적인걸 ㅠㅠ' },
      { memberId: 'sumin', content: '나경언니 울지 마세요ㅠㅠ 저까지 슬퍼져요 💕' },
    ],
  },
  // 유연 잘 됐네
  { ctx: 'concert', comments: [{ memberId: 'yooyeon', content: '잘 됐네' }],
    replyChain: [
      { memberId: 'chaeyeon', content: '언니 이게 다예요??? 저 진짜... 😭' },
      { memberId: 'yooyeon', content: '응' },
      { memberId: 'seoyeon', content: 'ㅋㅋㅋ 유연이답다' },
    ],
  },
  // 일본 3인방
  { ctx: 'japan', comments: [{ memberId: 'kaede', content: 'やっと日本！！！待ってたよ～！！！ 진짜 기대돼!!!' }],
    replyChain: [
      { memberId: 'kotone', content: 'カエデ…テンション高すぎ笑' },
      { memberId: 'kaede', content: '당연하지！！！ 日本だよ！！！' },
      { memberId: 'mayu', content: '写真いっぱい撮ろうね！✨ 아 근데 내 카메라 배터리 또...' },
      { memberId: 'kaede', content: 'マユ！充電してよ！笑' },
    ],
  },
  // 니엔+다현 먹방
  { ctx: 'food', comments: [{ memberId: 'nien', content: '저 이거 3그릇 먹었어요. 사실이에요.' }],
    replyChain: [
      { memberId: 'dahyun', content: '니엔아 나도 3그릇 먹을 수 있는데 근데 부산 가면 더 맛있는 거 있어' },
      { memberId: 'nien', content: '다현언니 우리 먹방 같이 하자요!!!! 好吃！' },
      { memberId: 'jiwoo', content: '이거 어떻게 만들어요?? 재료가 뭐예요??' },
      { memberId: 'hyerin', content: '지우야 그냥 사 먹으면 돼 ㅋㅋ' },
    ],
  },
  // 채원 쌍절곤
  { ctx: 'comeback', comments: [{ memberId: 'chaewon', content: '저 이 노래 리듬 타다가 쌍절곤 돌리다가 창문 칠 뻔 했어요' }],
    replyChain: [
      { memberId: 'seoyeon', content: '채원아......제발' },
      { memberId: 'chaewon', content: '언니 괜찮았어요!!!! 창문은 무사해요!!' },
      { memberId: 'sion', content: '채원아 나도 같이 돌려볼래!!!! 🤣🤣' },
      { memberId: 'seoyeon', content: '...둘 다 안 돼' },
    ],
  },
  // 소현 한마디
  { ctx: 'comeback', comments: [{ memberId: 'sohyun', content: '좋다' }],
    replyChain: [
      { memberId: 'yooyeon', content: '소현이 리뷰' },
      { memberId: 'seoyeon', content: '이게 최고 리뷰야' },
    ],
  },
  // 시온 밥
  { ctx: 'comeback', comments: [{ memberId: 'sion', content: '꺄아아아!!!!!!! 저 이거 듣고 밥 3번 먹었어요 흥이 나서' }],
    replyChain: [
      { memberId: 'chaewon', content: '시온언니 밥이요?? ㅋㅋㅋ' },
      { memberId: 'sion', content: '흥나면 배고프잖아요!!!!!' },
      { memberId: 'jubin', content: '자 여기서 질문! 시온이는 몇 공기 먹었게요?? ㅋㅋ' },
    ],
  },
  // 하연+주빈
  { ctx: 'photo', comments: [{ memberId: 'hayeon', content: '잠깐 저 이 사진에서 좀 이쁘지 않아요?? 사진 잘 받은 것 같은데 ㅎㅎ' }],
    replyChain: [
      { memberId: 'jubin', content: '하연아 그거 내가 옆에 있어서 그런 거야 ㅎㅎ' },
      { memberId: 'hayeon', content: '주빈아 넌 항상 ㅋㅋㅋ' },
      { memberId: 'shinwi', content: '잠깐만요 저도 이 사진에서 비율이 미쳤는데 저 좀 봐주세요 ㅎㅎ' },
    ],
  },
  // 시온+채원 텐션
  { ctx: 'concert', comments: [{ memberId: 'sion', content: '꺄아아아아!!!!! 이 공연 진짜 기대돼요!!!!!' }],
    replyChain: [
      { memberId: 'chaewon', content: '시온언니!!! 저도요!!! 쌍절곤 가져가도 돼요???!!' },
      { memberId: 'sion', content: '당연하지!!!!!! 같이 돌리자!!!!!! 💜💜' },
      { memberId: 'yooyeon', content: '둘 다 안 돼' },
      { memberId: 'chaeyeon', content: '유연언니!!!!! 너무해요ㅠㅠ 근데 웃겨요 ㅋㅋㅋ' },
    ],
  },
  // 나경 컴백 울음
  { ctx: 'comeback', comments: [{ memberId: 'naekyung', content: '신곡 처음 들었을 때 눈물났어요... 진짜 너무 좋아요 ㅠㅠ' }],
    replyChain: [
      { memberId: 'yubin', content: '나경아 또 울어...? ㅋㅋㅋ' },
      { memberId: 'naekyung', content: '어쩔 수 없잖아요 ㅠㅠ 감동적인걸 ㅠㅠ' },
    ],
  },
  // 마유 카메라 배터리
  { ctx: 'japan', comments: [{ memberId: 'mayu', content: '写真いっぱい撮りたい✨ 아 근데 내 카메라 배터리 또 없어졌어' }],
    replyChain: [
      { memberId: 'kaede', content: 'マユ！充電してよ！笑' },
      { memberId: 'mayu', content: '충전기를 숙소에 놓고 왔어 ㅠㅠ' },
      { memberId: 'kotone', content: '…私が貸そうか' },
    ],
  },
  // 지우+혜린 엉뚱
  { ctx: 'concert', comments: [{ memberId: 'jiwoo', content: '이 공연... 어떻게 가요? 표 어디서 사요?' }],
    replyChain: [
      { memberId: 'hyerin', content: '지우야 내가 알려줄게 ㅋㅋ' },
      { memberId: 'jiwoo', content: '혜린언니 고마워요!! 근데 우리 공연인 거 맞죠...??' },
      { memberId: 'seoyeon', content: '어... 지우야 우리가 하는 거야' },
    ],
  },
  // 연지 게임
  { ctx: 'comeback', comments: [{ memberId: 'yeonji', content: '새 노래 나왔다 ㅋㅋ 게임 BGM으로 써야겠다' }],
    replyChain: [
      { memberId: 'sion', content: '연지야!! 게임말고 춤도 춰야지!!! ㅋㅋ' },
      { memberId: 'yeonji', content: '춤추면서 게임하면 되잖아요 ㅋㅋ (사실 안 됨)' },
    ],
  },
  // 지연 발레
  { ctx: 'dance', comments: [{ memberId: 'jiyeon', content: '발레 훈련 받아서 무대 체력은 자신 있어요~ (사실 넘어질 뻔 했음 ㅋㅋ)' }],
    replyChain: [
      { memberId: 'seollin', content: '지연아 괜찮았어?? ㅋㅋ 나도 승마하다가 ㅋㅋ' },
      { memberId: 'jiyeon', content: '우아하게 넘어졌으니까 괜찮아요 ㅎㅎ' },
    ],
  },
];

// ── 정병기 대표 댓글 ──────────────────────────────────────────
const JBK_REPLIES = [
  "멤버들 고생했어요 🙏",
  "다들 잘하고 있어요! 자랑스럽습니다",
  "ㅋㅋㅋ 이런 거 올려도 되나요",
  "맞아요 맞아요",
  "열심히 준비했습니다 코스모스 많이 봐주세요!",
  "멤버들이 진짜 열심히 했어요. 잘 부탁드립니다 🙇",
  "이런 반응 보면 힘이 나네요 감사합니다",
  "ㅋㅋ 맞는 말이에요",
];

// ── Like 친화도 ──────────────────────────────────────────────
const LIKE_AFFINITY: [string, string[]][] = [
  ['chaeyeon', ['sion', 'naekyung', 'seoa', 'jubin', 'hayeon']],
  ['yooyeon', ['seoyeon', 'yubin', 'sohyun']],
  ['naekyung', ['sumin', 'hyerin', 'jiwoo', 'seoa']],
  ['kaede', ['kotone', 'mayu']],
  ['kotone', ['kaede', 'mayu', 'rin']],
  ['mayu', ['kaede', 'kotone', 'seollin']],
  ['sion', ['chaewon', 'chaeyeon', 'hayeon', 'jubin']],
  ['chaewon', ['sion', 'seoa', 'seollin', 'jiyeon']],
  ['sumin', ['seoyeon', 'hyerin', 'jiwoo', 'chaeyeon', 'yooyeon']],
  ['sohyun', ['seoyeon', 'yooyeon', 'rin', 'yubin']],
  ['jubin', ['chaeyeon', 'sion', 'hayeon']],
];

function buildLikes(commenterId: string, seed: number, forcedMin?: number): CommentLike[] {
  const rng = seededRng(seed);
  const affinityMap = new Map<string, string[]>();
  for (const [liker, targets] of LIKE_AFFINITY) {
    for (const t of targets) {
      const arr = affinityMap.get(t) || [];
      arr.push(liker);
      affinityMap.set(t, arr);
    }
  }

  const isSohyun = commenterId === 'sohyun';
  const isYooyeonShort = commenterId === 'yooyeon';
  const baseCount = isSohyun ? 4 : isYooyeonShort ? 3 : 2;
  const maxCount = isSohyun ? 7 : isYooyeonShort ? 5 : 5;
  const targetCount = Math.max(forcedMin || 0, baseCount + Math.floor(rng() * (maxCount - baseCount + 1)));

  const affinityLikers = affinityMap.get(commenterId) || [];
  const likes: CommentLike[] = [];
  const used = new Set<string>([commenterId]);

  // Add affinity likers first
  for (const l of affinityLikers) {
    if (!used.has(l) && likes.length < targetCount) {
      if (isSohyun || isYooyeonShort || rng() < 0.7) {
        likes.push({ memberId: l });
        used.add(l);
      }
    }
  }

  // seoyeon+yubin always like yooyeon
  if (isYooyeonShort) {
    for (const must of ['seoyeon', 'yubin']) {
      if (!used.has(must)) { likes.push({ memberId: must }); used.add(must); }
    }
  }

  // Fill remaining with random members
  const shuffled = [...MEMBER_ORDER].sort(() => rng() - 0.5);
  for (const m of shuffled) {
    if (likes.length >= targetCount) break;
    if (!used.has(m)) { likes.push({ memberId: m }); used.add(m); }
  }

  return likes.slice(0, targetCount);
}

// ── 댓글 빌더 ────────────────────────────────────────────────
const COMMENT_COUNTS: Record<FeedSource, [number, number]> = {
  youtube: [8, 15],
  twitter: [10, 18],
  instagram: [15, 30],
};

function getCtx(tags: Tags): Ctx {
  if (tags.hasJapan) return 'japan';
  if (tags.hasConcert) return 'concert';
  if (tags.hasComeback) return 'comeback';
  if (tags.hasFood) return 'food';
  if (tags.hasPhoto) return 'photo';
  if (tags.hasDance) return 'dance';
  if (tags.hasCute) return 'cute';
  return 'default';
}

function getPreferredMembers(tags: Tags): string[] {
  const p: string[] = [];
  if (tags.hasJapan || tags.hasKaede || tags.hasKotone || tags.hasMayu) p.push('kaede', 'kotone', 'mayu');
  if (tags.hasConcert || tags.hasDance) p.push('chaeyeon', 'yubin', 'rin', 'jubin', 'hyerin');
  if (tags.hasComeback) p.push('sion', 'naekyung', 'sumin', 'chaewon');
  if (tags.hasFood) p.push('nien', 'dahyun', 'jiwoo');
  if (tags.hasPhoto) p.push('mayu', 'shinwi', 'hayeon');
  if (tags.hasCute) p.push('sumin', 'seoa', 'chaewon');
  return [...new Set(p)];
}

type CommentLength = 'short' | 'medium' | 'long';

function pickLength(rng: () => number): CommentLength {
  const r = rng();
  if (r < 0.30) return 'short';
  if (r < 0.70) return 'medium';
  return 'long';
}

function pickCommentByLength(memberId: string, ctx: Ctx, length: CommentLength, seed: number): string {
  const pool = COMMENT_POOL[memberId];
  if (!pool) return '기대돼요!';
  const ctxEntries = [...(pool[ctx] || []), ...(pool.default || [])];
  if (ctxEntries.length === 0) return '기대돼요!';

  const shortOnes = ctxEntries.filter(c => c.length < 25);
  const mediumOnes = ctxEntries.filter(c => c.length >= 25 && c.length < 70);
  const longOnes = ctxEntries.filter(c => c.length >= 70);

  let candidates: string[];
  if (length === 'short') candidates = shortOnes.length > 0 ? shortOnes : ctxEntries;
  else if (length === 'medium') candidates = mediumOnes.length > 0 ? mediumOnes : ctxEntries;
  else candidates = longOnes.length > 0 ? longOnes : ctxEntries;

  return candidates[Math.abs(seed) % candidates.length] || ctxEntries[0] || '기대돼요!';
}

function buildSmartComments(postId: string, source: FeedSource, title: string, body: string, posterId: string): Comment[] {
  const tags = detectTags(title, body);
  const ctx = getCtx(tags);
  const [minCount, maxCount] = COMMENT_COUNTS[source];
  const n = minCount + Math.abs(hashStr(postId)) % (maxCount - minCount);
  const rng = seededRng(hashStr(postId + 'comments'));
  const excludeIds = new Set([posterId]);

  // Pick applicable threads (skip threads where main commenter is the poster)
  const applicableThreads = THREADS.filter(t => (t.ctx === ctx || t.ctx === 'default') && t.comments[0]!.memberId !== posterId);
  const selectedThreads: Thread[] = [];
  const threadPool = [...applicableThreads];
  const numThreads = Math.min(Math.floor(rng() * 3) + 2, threadPool.length, Math.floor(n / 3));
  for (let i = 0; i < numThreads && threadPool.length > 0; i++) {
    const idx = Math.floor(rng() * threadPool.length);
    selectedThreads.push(threadPool.splice(idx, 1)[0]!);
  }

  const comments: Comment[] = [];
  const usedMembers = new Set<string>();

  // Insert thread comments
  for (const thread of selectedThreads) {
    const mainMsg = thread.comments[0]!;
    usedMembers.add(mainMsg.memberId);
    const m = ALL_MEMBERS[mainMsg.memberId];
    const replies: Reply[] = thread.replyChain.map(r => ({
      memberId: r.memberId,
      content: r.content,
      likes: buildLikes(r.memberId, hashStr(postId + r.memberId + r.content)),
    }));
    for (const r of thread.replyChain) usedMembers.add(r.memberId);

    comments.push({
      memberId: mainMsg.memberId,
      memberName: m?.name || mainMsg.memberId,
      sNumber: S_NUMBERS[mainMsg.memberId] || '',
      content: mainMsg.content,
      likes: buildLikes(mainMsg.memberId, hashStr(postId + mainMsg.memberId)),
      replies,
    });
  }

  // Fill remaining slots with individual comments
  const preferred = getPreferredMembers(tags).filter(m => !usedMembers.has(m) && !excludeIds.has(m));
  const others = MEMBER_ORDER.filter(m => !usedMembers.has(m) && !preferred.includes(m) && !excludeIds.has(m));
  const ordered = [...preferred, ...others.sort(() => rng() - 0.5)];

  let remaining = n - comments.length;
  for (const memberId of ordered) {
    if (remaining <= 0) break;
    const m = ALL_MEMBERS[memberId];
    const desiredLen = pickLength(rng);
    const content = pickCommentByLength(memberId, ctx, desiredLen, hashStr(postId + memberId));
    const replies: Reply[] = [];

    // Occasional sumin encouragement reply
    if (memberId !== 'sumin' && rng() < 0.15) {
      replies.push({
        memberId: 'sumin',
        content: '정말 멋있어요!! 화이팅!! 💕',
        likes: buildLikes('sumin', hashStr(postId + 'sumin-reply-' + memberId)),
      });
    }

    comments.push({
      memberId,
      memberName: m?.name || memberId,
      sNumber: S_NUMBERS[memberId] || '',
      content,
      likes: buildLikes(memberId, hashStr(postId + memberId + 'likes')),
      replies,
    });
    remaining--;
  }

  // 정병기 대표 (20% chance)
  if (rng() < 0.2 && comments.length > 2) {
    const targetIdx = 1 + Math.floor(rng() * (comments.length - 1));
    const jbkContent = JBK_REPLIES[Math.abs(hashStr(postId + 'jbk')) % JBK_REPLIES.length]!;
    comments[targetIdx]!.replies.push({
      memberId: 'jbk',
      content: jbkContent,
      likes: buildLikes('jbk', hashStr(postId + 'jbk-likes')),
    });
  }

  return comments;
}

// ── 시간 표시 ────────────────────────────────────────────────
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(ms).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

// ── SourceBadge ──────────────────────────────────────────────
function SourceBadge({ source }: { source: FeedSource }) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
  };

  switch (source) {
    case 'youtube':
      return (
        <span style={{ ...base, color: '#FF0000' }}>
          <svg width="16" height="12" viewBox="0 0 28 20" fill="none">
            <path d="M27.16 3.13C26.84 1.87 25.84.85 24.6.52 22.44 0 14 0 14 0S5.56 0 3.4.52C2.16.85 1.16 1.87.84 3.13.33 5.27.33 10 .33 10s0 4.73.51 6.87c.32 1.26 1.32 2.21 2.56 2.54C5.56 20 14 20 14 20s8.44 0 10.6-.59c1.24-.33 2.24-1.28 2.56-2.54.51-2.14.51-6.87.51-6.87s0-4.73-.51-6.87z" fill="#FF0000"/>
            <path d="M11.2 14.29l7.07-4.29L11.2 5.71v8.58z" fill="#fff"/>
          </svg>
          YouTube
        </span>
      );
    case 'twitter':
      return (
        <span style={{ ...base, color: '#000', gap: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#000">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </span>
      );
    case 'instagram':
      return (
        <span style={{ ...base, color: '#cc2366' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433"/>
                <stop offset="50%" stopColor="#dc2743"/>
                <stop offset="100%" stopColor="#bc1888"/>
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="#bc1888" stroke="none"/>
          </svg>
          Instagram
        </span>
      );
  }
}

// ── Like 표시 ────────────────────────────────────────────────
function LikeDisplay({ likes }: { likes: CommentLike[] }) {
  if (likes.length === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-1 ml-1">
      <span className="text-[11px]">❤️</span>
      <div className="flex -space-x-1">
        {likes.slice(0, 5).map(l => {
          const lm = ALL_MEMBERS[l.memberId];
          return (
            <div key={l.memberId} className="w-4 h-4 rounded-full overflow-hidden border border-white" style={{ background: lm?.color || '#ddd' }} title={lm?.name || l.memberId}>
              <img src={l.memberId === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${l.memberId}/profile.jpg`} alt={lm?.name || ''} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
          );
        })}
      </div>
      <span className="text-[11px] text-gray-400">
        {likes.slice(0, 3).map(l => ALL_MEMBERS[l.memberId]?.name || (l.memberId === 'jbk' ? '정병기' : l.memberId)).join(', ')}
        {likes.length > 3 ? ` 외 ${likes.length - 3}명` : ''}
      </span>
    </div>
  );
}

// ── Reply 렌더 ───────────────────────────────────────────────
function ReplyBubble({ r }: { r: Reply }) {
  const isJBK = r.memberId === 'jbk';
  const m = isJBK ? null : ALL_MEMBERS[r.memberId];
  const name = isJBK ? '정병기' : m?.name || r.memberId;
  const sNum = isJBK ? '' : S_NUMBERS[r.memberId] || '';
  const avatarSrc = isJBK ? '/jungbyeongki.jpg' : `/idols/${r.memberId}/profile.jpg`;

  return (
    <div className="flex items-start gap-2 ml-10 mt-2">
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-100" style={{ background: isJBK ? '#1a1a2e' : m?.color || '#ddd' }}>
        <img src={avatarSrc} alt={name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="font-bold text-[12px] text-gray-900">{name}</span>
            {isJBK ? (
              <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-bold">MODHAUS</span>
            ) : sNum ? (
              <span className="text-[10px] text-violet-500 font-semibold">{sNum}</span>
            ) : null}
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">{r.content}</p>
        </div>
        <LikeDisplay likes={r.likes} />
      </div>
    </div>
  );
}

// ── 트윗 본문 내 t.co URL → 클릭 가능 링크로 변환 ──────────────
function renderTweetText(
  text: string,
  urlEntries?: { url: string; expanded: string; display: string }[]
): React.ReactNode {
  if (!text) return null;
  if (!urlEntries?.length) return text;

  // t.co URL → {expanded, display} 맵 구축
  const urlMap = new Map(urlEntries.map(u => [u.url, u]));

  const TCO_RE = /https:\/\/t\.co\/[A-Za-z0-9]+/g;
  const segments: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = TCO_RE.exec(text)) !== null) {
    const tcoUrl = m[0];
    const entry = urlMap.get(tcoUrl);

    if (m.index > lastIdx) {
      segments.push(<React.Fragment key={`t${lastIdx}`}>{text.slice(lastIdx, m.index)}</React.Fragment>);
    }

    if (entry) {
      const isPic = entry.display.startsWith('pic.') || entry.expanded.includes('/photo/');
      const isSelf = entry.expanded.includes('x.com/triplescosmos') || entry.expanded.includes('twitter.com/triplescosmos');

      if (isSelf) {
        // 자기 링크 → 스킵
      } else if (isPic) {
        // "🔗 label : https://t.co/xxx" 패턴 감지 — ":" 뒤에 오는 pic URL은 실제 링크
        const preceding = text.slice(0, m.index).trimEnd();
        const lastChar = preceding.length > 0 ? preceding[preceding.length - 1] : '';
        if (lastChar === ':') {
          // 텍스트 라벨 뒤 URL → 실제 링크. t.co URL 자체를 클릭 가능하게 표시
          segments.push(
            <a
              key={`u${m.index}`}
              href={tcoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-500 hover:text-violet-700 hover:underline break-all"
              onClick={e => e.stopPropagation()}
            >
              {tcoUrl.replace('https://', '')}
            </a>
          );
        }
        // 그 외 pic URL → 이미지 첨부라 스킵
      } else {
        // 일반 링크 → display URL로 표시
        segments.push(
          <a
            key={`u${m.index}`}
            href={entry.expanded}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-700 hover:underline break-all"
            onClick={e => e.stopPropagation()}
          >
            {entry.display}
          </a>
        );
      }
    } else {
      // 엔티티에 없는 t.co URL → t.co 링크로 직접 표시
      segments.push(
        <a
          key={`u${m.index}`}
          href={tcoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-500 hover:text-violet-700 hover:underline break-all"
          onClick={e => e.stopPropagation()}
        >
          {tcoUrl.replace('https://', '')}
        </a>
      );
    }

    lastIdx = m.index + tcoUrl.length;
  }

  if (lastIdx < text.length) {
    segments.push(<React.Fragment key={`t${lastIdx}`}>{text.slice(lastIdx)}</React.Fragment>);
  }

  return <>{segments}</>;
}

// ── FeedCard ─────────────────────────────────────────────────
function FeedCard({ post }: { post: UnifiedPost }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryClosing, setGalleryClosing] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const touchStartX = useRef<number>(0);

  const closeGallery = () => {
    setGalleryClosing(true);
    setTimeout(() => { setGalleryOpen(false); setGalleryClosing(false); }, 220);
  };

  const SOURCE_LINK_LABELS: Record<FeedSource, string> = {
    youtube: '🎬 YouTube에서 보기 →',
    twitter: '𝕏 트위터에서 보기 →',
    instagram: '📷 인스타에서 보기 →',
  };

  const SOURCE_LINK_COLORS: Record<FeedSource, string> = {
    youtube: '#FF0000',
    twitter: '#000000',
    instagram: '#E1306C',
  };

  const ytVideoId = post.source === 'youtube' && post.link
    ? (() => { try { return new URL(post.link).searchParams.get('v') || post.link.split('v=')[1]?.split('&')[0] || null; } catch { return post.link.split('v=')[1]?.split('&')[0] || null; } })()
    : null;

  const allImages = useMemo(() => {
    if (post.images && post.images.length > 0) return post.images;
    if (post.imageUrl) return [post.imageUrl];
    return [];
  }, [post.images, post.imageUrl]);

  const visible = expanded ? post.comments : post.comments.slice(0, 2);

  // Lock body scroll when gallery open
  useEffect(() => {
    if (galleryOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [galleryOpen]);

  const openGallery = (idx: number) => {
    setGalleryIndex(idx);
    setGalleryOpen(true);
  };

  return (
    <div className="bg-white rounded-xl mb-3 overflow-hidden" style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)' }}>
      {/* ── 리트윗(리포스트) 배너 ── */}
      {post.isRetweet && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          <span className="text-[11px] text-gray-500 font-medium">
            tripleS official 님이 재게시함
            {post.rtAuthorName && (
              <span className="text-gray-400"> · <span className="font-semibold text-gray-600">{post.rtAuthorName}</span> 원글</span>
            )}
          </span>
        </div>
      )}
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-200"
          style={{ background: ALL_MEMBERS[post.posterId]?.color || '#ddd' }}>
          <img src={post.source === 'twitter' && post.authorAvatarUrl ? `/api/proxy-image?url=${encodeURIComponent(post.authorAvatarUrl)}` : post.posterId === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${post.posterId}/profile.jpg`} alt={ALL_MEMBERS[post.posterId]?.name || post.posterId}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[14px] text-gray-900 leading-tight">
              {ALL_MEMBERS[post.posterId]?.name || post.posterId}
            </span>
            <SourceBadge source={post.source} />
          </div>
          <p className="text-[12px] text-gray-400 leading-tight mt-0.5">
            {timeAgo(post.timestamp)} · {`tripleS · ${S_NUMBERS[post.posterId] || ''}`}
          </p>
        </div>
        <div className="text-gray-300 text-xl leading-none shrink-0">···</div>
      </div>

      {/* ── 본문 ── */}
      {(post.title || post.body) && (
        <div className="px-3.5 pb-2.5">
          {post.title && <p className="font-semibold text-[14px] text-gray-900 leading-snug mb-0.5">{post.title}</p>}
          {post.body && (
            <p
              className="text-[15px] text-gray-800 leading-relaxed"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {post.source === 'twitter'
                ? renderTweetText(post.body, post.tweetUrls)
                : post.body}
            </p>
          )}
        </div>
      )}

      {/* ── 이미지 / YouTube 임베드 ── */}
      {post.source === 'youtube' && ytVideoId ? (
        ytPlaying ? (
          <div className="w-full" style={{ paddingBottom: '56.25%', position: 'relative' }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative cursor-pointer" onClick={() => setYtPlaying(true)}>
            {post.imageUrl && (
              <img src={post.imageUrl} alt={post.title || ''} className="w-full object-cover" style={{ maxHeight: '280px' }} />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="yt-play-btn">
                <svg viewBox="0 0 68 48" width="68" height="48">
                  <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#ff0000" />
                  <path d="M45,24 27,14 27,34" fill="#ffffff" />
                </svg>
              </div>
            </div>
          </div>
        )
      ) : post.videoUrl ? (
        <div className="w-full overflow-hidden bg-gray-100">
          <video src={post.videoUrl} controls className="w-full" style={{ maxHeight: '600px' }} playsInline />
        </div>
      ) : post.images && post.images.length > 0 ? (
        <div className={`w-full overflow-hidden bg-gray-100 ${
          post.images.length === 1 ? '' :
          post.images.length === 3 ? 'grid grid-cols-2 gap-0.5' :
          'grid grid-cols-2 gap-0.5'
        }`}>
          {post.images.slice(0, 4).map((url, idx) => (
            <div
              key={idx}
              className={`overflow-hidden bg-gray-200 cursor-pointer ${
                post.images!.length === 3 && idx === 0 ? 'col-span-2' : ''
              }`}
              onClick={(e) => { e.stopPropagation(); openGallery(idx); }}
            >
              <img
                src={url}
                alt=""
                className={`w-full object-cover ${post.images!.length === 1 ? '' : 'h-44'}`}
                style={{ maxHeight: post.images!.length === 1 ? '600px' : undefined }}
                onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
      ) : post.imageUrl ? (
        <div className="w-full overflow-hidden bg-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); openGallery(0); }}>
          <img
            src={post.imageUrl}
            alt={post.title || ''}
            className="w-full object-cover"
            style={{ maxHeight: '600px' }}
            onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      ) : null}

      {/* 트윗 링크는 renderTweetText로 본문 내 인라인 표시 */}

      {/* ── 링크 ── */}
      {post.link && (
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3.5 py-2 text-sm font-semibold"
          style={{ color: SOURCE_LINK_COLORS[post.source] }}
        >
          {SOURCE_LINK_LABELS[post.source]}
        </a>
      )}

      {/* ── 리액션 카운트 ── */}
      <div className="flex items-center justify-between px-3.5 py-1.5">
        <span className="text-[12px] text-gray-400">
          {liked ? '❤️' : '🤍'} {(post.likes + (liked ? 1 : 0)).toLocaleString()}
        </span>
        <span className="text-[12px] text-gray-400">댓글 {post.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)}개</span>
      </div>

      <div className="h-px bg-gray-100 mx-3.5" />

      {/* ── 액션 버튼 ── */}
      <div className="flex items-center px-1 py-0.5">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
            liked ? 'text-violet-600' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {liked ? '❤️' : '🤍'} 좋아요
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          💬 댓글
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          ↗ 공유
        </button>
      </div>

      <div className="h-px bg-gray-100 mx-3.5" />

      {/* ── 멤버 댓글 ── */}
      <div className="px-3.5 py-3 space-y-1">
        {visible.map((c, ci) => {
          const m = ALL_MEMBERS[c.memberId];
          return (
            <div key={c.memberId + '-' + ci}>
              <div className="flex items-start gap-2.5">
                <div
                  className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-gray-100"
                  style={{ background: m?.color || '#ddd' }}
                >
                  <img
                    src={`/idols/${c.memberId}/profile.jpg`}
                    alt={c.memberName}
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="font-bold text-[12px] text-gray-900">{c.memberName}</span>
                      {c.sNumber ? (
                        <span className="text-[10px] text-violet-500 font-semibold">{c.sNumber}</span>
                      ) : null}
                    </div>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{c.content}</p>
                  </div>
                  <LikeDisplay likes={c.likes} />
                </div>
              </div>
              {/* Replies */}
              {c.replies.map((r, ri) => (
                <ReplyBubble key={r.memberId + '-' + ri} r={r} />
              ))}
            </div>
          );
        })}

        {post.comments.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[12px] text-gray-500 font-semibold ml-10 mt-2"
          >
            {expanded ? '접기' : `댓글 ${post.comments.length - 2}개 더 보기`}
          </button>
        )}
      </div>

      {/* ── 이미지 갤러리 모달 ── */}
      {galleryOpen && allImages.length > 0 && (
        <div
          className={`fixed inset-0 z-50 bg-black/95 flex flex-col ${galleryClosing ? 'gallery-out' : 'gallery-in'}`}
          onClick={closeGallery}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0" onClick={e => e.stopPropagation()} style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
            <span className="text-white/70 text-sm">{galleryIndex + 1} / {allImages.length}</span>
            <button onClick={closeGallery} className="text-white text-3xl leading-none w-10 h-10 flex items-center justify-center">×</button>
          </div>

          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { touchStartX.current = e.touches[0]!.clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0]!.clientX - touchStartX.current;
              if (Math.abs(dx) > 50) {
                if (dx < 0) setGalleryIndex(i => (i + 1) % allImages.length);
                else setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length);
              }
            }}
          >
            <img
              src={allImages[galleryIndex]}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ userSelect: 'none' }}
            />
            {allImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center"
                  onClick={() => setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length)}
                >‹</button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center"
                  onClick={() => setGalleryIndex(i => (i + 1) % allImages.length)}
                >›</button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 px-4 pb-4 pt-3 overflow-x-auto shrink-0" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              {allImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === galleryIndex ? 'border-white scale-105' : 'border-transparent opacity-60'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────
export default function FeedPage() {
  // SAMPLE_NOTICES 즉시 표시 → API 응답마다 순차 업데이트
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  type FeedSourceFilter = 'all' | 'youtube' | 'twitter' | 'instagram';
  const [filterMember, setFilterMember] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sourceFilter, setSourceFilter] = useState<FeedSourceFilter>('all');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const unified: UnifiedPost[] = [];

    const processYouTube = (videos: { id: string; publishedAt: string; title?: string; description?: string; thumbnail?: string; url?: string }[]) => {
      videos.forEach(v => {
        const ytPosterId = detectPoster(`${v.title || ''} ${v.description || ''}`, hashStr(`yt-${v.id}`));
        unified.push({
          id: `yt-${v.id}`,
          source: 'youtube',
          timestamp: new Date(v.publishedAt).getTime(),
          title: v.title,
          body: v.description?.slice(0, 100) || '',
          imageUrl: v.thumbnail,
          link: v.url,
          likes: 500 + Math.abs((v.id?.charCodeAt(0) || 0) * 37 % 5000),
          posterId: ytPosterId,
          comments: buildSmartComments(`yt-${v.id}`, 'youtube', v.title || '', v.description || '', ytPosterId),
        });
      });
    };

    const processTwitter = (tweets: {
      id: string; createdAt: string; text?: string;
      media?: { url?: string; preview_image_url?: string }[];
      images?: string[];
      videoUrl?: string;
      urls?: { url: string; expanded: string; display: string }[];
      url?: string; likes?: number;
      authorAvatarUrl?: string;
      isRetweet?: boolean; rtAuthorName?: string; rtAuthorUsername?: string;
    }[]) => {
      tweets.forEach(t => {
        const twPosterId = detectPoster(t.text || '', hashStr(`tw-${t.id}`));
        // t.co URL 처리: self-link만 제거, 나머지는 renderTweetText가 처리
        let cleanText = t.text || '';
        (t.urls || []).forEach(u => {
          const isSelfLink = u.expanded.includes('x.com/triplescosmos') || u.expanded.includes('twitter.com/triplescosmos');
          if (isSelfLink) {
            cleanText = cleanText.replace(u.url, '');
          }
        });
        cleanText = cleanText.trim();

        unified.push({
          id: `tw-${t.id}`,
          source: 'twitter',
          timestamp: new Date(t.createdAt).getTime(),
          body: cleanText,
          // API에서 받은 images 배열 우선, fallback으로 media 배열
          images: t.images?.length ? t.images : (t.media || []).map(m => m.url || m.preview_image_url || '').filter(Boolean),
          link: t.url,
          videoUrl: t.videoUrl || undefined,
          likes: t.likes || 0,
          authorAvatarUrl: t.authorAvatarUrl || '',
          posterId: twPosterId,
          comments: buildSmartComments(`tw-${t.id}`, 'twitter', '', cleanText, twPosterId),
          isRetweet: t.isRetweet,
          rtAuthorName: t.rtAuthorName,
          rtAuthorUsername: t.rtAuthorUsername,
          tweetUrls: t.urls || [],  // ALL urls — renderTweetText와 tweetUrls 섹션에서 각각 필터링
        });
      });
    };

    const processInstagram = (posts: { id: string; timestamp?: number; caption?: string; thumbnail?: string; url?: string; likes?: number; videoUrl?: string }[]) => {
      posts.forEach(p => {
        const igPosterId = detectPoster(p.caption || '', hashStr(`ig-${p.id}`));
        unified.push({
          id: `ig-${p.id}`,
          source: 'instagram',
          timestamp: p.timestamp || Date.now(),
          body: p.caption?.slice(0, 150) || '',
          imageUrl: p.thumbnail,
          videoUrl: p.videoUrl || undefined,
          link: p.url,
          likes: p.likes || 0,
          posterId: igPosterId,
          comments: buildSmartComments(`ig-${p.id}`, 'instagram', '', p.caption || '', igPosterId),
        });
      });
    };

    // API 응답마다 즉시 UI 업데이트 (순차 로딩)
    const flush = () => {
      const sorted = [...unified].sort((a, b) => b.timestamp - a.timestamp);
      setPosts([...sorted]);
    };

    let done = 0;
    const total = 3;
    const finish = () => {
      flush(); // 각 API 완료마다 즉시 반영
      done++;
      if (done === total) setApiLoading(false);
    };

    fetch('/api/feed-youtube').then(r => r.json()).then(d => processYouTube(d.videos || [])).catch(() => {}).finally(finish);
    fetch('/api/feed-twitter').then(r => r.json()).then(d => processTwitter(d.tweets || [])).catch(() => {}).finally(finish);
    fetch('/api/feed-instagram').then(r => r.json()).then(d => { if (d.error !== 'rate_limit') processInstagram(d.posts || []); }).catch(() => {}).finally(finish);
  }, []);

  const memberOptions = [
    { id: 'seoyeon', name: '서연', sNumber: 1 },
    { id: 'hyerin', name: '혜린', sNumber: 2 },
    { id: 'jiwoo', name: '지우', sNumber: 3 },
    { id: 'chaeyeon', name: '채연', sNumber: 4 },
    { id: 'yooyeon', name: '유연', sNumber: 5 },
    { id: 'sumin', name: '수민', sNumber: 6 },
    { id: 'naekyung', name: '나경', sNumber: 7 },
    { id: 'yubin', name: '유빈', sNumber: 8 },
    { id: 'kaede', name: '카에데', sNumber: 9 },
    { id: 'dahyun', name: '다현', sNumber: 10 },
    { id: 'kotone', name: '코토네', sNumber: 11 },
    { id: 'yeonji', name: '연지', sNumber: 12 },
    { id: 'nien', name: '니엔', sNumber: 13 },
    { id: 'sohyun', name: '소현', sNumber: 14 },
    { id: 'shinwi', name: '신위', sNumber: 15 },
    { id: 'mayu', name: '마유', sNumber: 16 },
    { id: 'rin', name: '린', sNumber: 17 },
    { id: 'jubin', name: '주빈', sNumber: 18 },
    { id: 'seollin', name: '설린', sNumber: 19 },
    { id: 'seoa', name: '서아', sNumber: 20 },
    { id: 'sion', name: '시온', sNumber: 21 },
    { id: 'hayeon', name: '하연', sNumber: 22 },
    { id: 'jiyeon', name: '지연', sNumber: 23 },
    { id: 'chaewon', name: '채원', sNumber: 24 },
  ];

  const displayPosts = posts.map((post) => ({
    ...post,
    memberTags: detectMemberTags((post.title || '') + ' ' + (post.body || '')),
  }));

  const sourceFiltered = sourceFilter === 'all'
    ? displayPosts
    : displayPosts.filter(p => p.source === sourceFilter);
  const filteredPosts = filterMember
    ? sourceFiltered.filter((p) => {
      const tags = detectMemberTags((p.title || '') + ' ' + (p.body || ''));
      return tags.includes(filterMember) || tags.includes('all');
    })
    : sourceFiltered;

  return (
    <div className="pb-4">
      <div
        className="px-4 pt-4 pb-3 border-b border-violet-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#F5F3FF' }}
      >
          <h1 className="text-sm font-normal text-gray-900 shrink-0">코스모스 공방 🌐</h1>
        <div className="flex items-center gap-2 shrink-0">
          {/* 출처 드랍다운 */}
          <div ref={sourceDropdownRef} className="relative">
            <button
              onClick={() => setSourceDropdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-normal text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
            >
              {sourceFilter === 'all' ? '출처' : sourceFilter === 'youtube' ? 'YouTube' : sourceFilter === 'twitter' ? '𝕏' : 'Instagram'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: sourceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {sourceDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-2" style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', minWidth: '130px' }}>
                {([['all', '전체'], ['youtube', 'YouTube'], ['twitter', '𝕏 트위터'], ['instagram', 'Instagram']] as [FeedSourceFilter, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => { setSourceFilter(val); setSourceDropdownOpen(false); }}
                    className={`w-full text-left text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${sourceFilter === val ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-violet-50'}`}>
                    {sourceFilter === val ? '✓ ' : ''}{label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 멤버 드랍다운 */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-normal text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
            >
              {filterMember
                ? (memberOptions.find((m) => m.id === filterMember)?.name ?? '모두 보기')
                : '모두 보기'}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-3"
                style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', width: '252px' }}
              >
                <button
                  onClick={() => { setFilterMember(''); setDropdownOpen(false); }}
                  className={`w-full text-left text-sm font-semibold px-3 py-1.5 rounded-lg mb-2 transition-colors ${!filterMember ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-violet-50'}`}
                >
                  ✓ 모두 보기
                </button>
                <div className="grid grid-cols-3 gap-1">
                  {memberOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setFilterMember(m.id); setDropdownOpen(false); }}
                      className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-colors ${filterMember === m.id ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-violet-50'}`}
                    >
                      <span className="text-[10px] text-gray-400 leading-none mb-0.5">S{m.sNumber}</span>
                      <span className="text-[13px] font-semibold leading-none">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {filteredPosts.map(post => <FeedCard key={post.id} post={post} />)}
      {/* API 로딩 중 — 하단에만 스켈레톤 2개 */}
      {apiLoading && [1, 2].map(i => (
        <div key={`sk-${i}`} className="bg-white rounded-xl h-52 animate-pulse mb-3"
          style={{ boxShadow: '0 6px 28px -4px rgba(0,0,0,0.07), 0 2px 10px -3px rgba(0,0,0,0.04)' }} />
      ))}
    </div>
  );
}
