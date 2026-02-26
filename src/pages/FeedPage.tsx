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
  mizyu:    ['MIZYU', 'ミジュ', '미쥬', 'AG!', 'ATARASHII GAKKO'],
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
  };
}

// ── 포스터(업로더) 감지 ───────────────────────────────────────
const MEMBER_NAME_PATTERNS: [string, RegExp][] = [
  ['mizyu',    /#MIZYU|#mizyu|#ミジュ|#AG|#ATARASHIIGAKKO|#新しい学校/i],
  ['rin',      /#RIN\b|#rin\b|#りん/i],
  ['suzuka',   /#SUZUKA|#suzuka|#スズカ/i],
  ['kanon',    /#KANON|#kanon|#かのん/i],
  ['nako',     /#nako|#奈子|#矢吹奈子/i],
  ['nana',     /#nana|#鈴木奈々|#suzukinana/i],
  ['taiyo',    /#taiyo|#太陽|#杉浦太陽/i],
  ['yoshiaki', /#yoshiaki|#よしあき|#ONSENSE/i],
  ['michi',    /#michi|#ミチ|#よしミチ/i],
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
  mizyu: {
    concert: [
      "ミジュコプター発射準備完了！무대 완전 기대돼!!",
      "리더로서 이번 무대 진짜 자신 있어요. 다들 봐줘!!",
      "연습 엄청 했거든요. 못 믿겠으면 와서 확인해요 ㅎㅎ",
    ],
    comeback: [
      "이 곡 처음 들었을 때 '이거다!'싶었어요. 역시 나 감각 있음 ㅎ",
      "녹음할 때 한 번에 OK나왔어요. 그냥 천재인 것 같아요 ㅎ",
    ],
    japan: [
      "日本！！やっとだ！！ 진짜 기대돼요 みんな来てね～！！",
      "日本のファンのみなさん！！待ってたよ！！💕",
    ],
    dance: [
      "안무 포인트는 역시 ミジュコプター이죠. 특허 출원 중이에요 ㅋㅋ",
      "이 동작 제가 제안했는데 정말 잘 됐어요 ㅎㅎ",
    ],
    cute: ["귀엽긴 한데... 저도 귀엽죠? 리더도 귀여울 수 있거든요 ㅎ"],
    default: ["みんな！よろしく！！ 최선 다할게요", "리더 MIZYU 여기 있어요!! 기대해줘요~", "이번 정말 자신 있어요. 연습하면서 진짜 힘들었지만 그만큼 완성도가 높아요!! みんな絶対見てね！！🌟"],
  },
  rin: {
    concert: [
      "랩 파트 진짜 열심히 했어요. 들려요?",
      "안무 마스터했어요. 힙합 베이스라 이런 건 자신 있어요",
    ],
    comeback: [
      "이 노래 비트 진짜 좋아요. 랩 쓰고 싶어졌어요",
      "가사 분석 끝. 내 스타일이에요 ㅎ",
    ],
    food: [
      "이거 제가 집에서 만들 수 있어요. 레시피 알아요",
      "요리하면서 이 노래 들었는데 완전 찰떡이에요",
    ],
    dance: [
      "힙합 베이스로 이 안무 분석해봤는데 잘 만들었어요",
      "이 동작 배울 때 제가 젤 먼저 마스터했어요. 사실이에요",
    ],
    default: ["괜찮아요. 기대해요", "잘 됐어요 ㅎ", "이 곡 연습하면서 요리도 같이 했어요. 효율적이죠 ㅋㅋ"],
  },
  suzuka: {
    concert: [
      "ほんまに楽しみやで！！ 무대 박살낼 준비 됐어요!!",
      "관서 출신 파워 보여줄게요!! なめんなよ～！！",
      "무대 끝나고 오코노미야키 먹을 거예요 그게 낙이에요",
    ],
    comeback: [
      "ほんまにええ曲やわ！！ 진짜 좋은 곡이에요!!",
      "이 노래 오사카에서도 뜰 거예요!! 보장해요!!",
    ],
    food: [
      "오코노미야키 먹고 싶다... 관서 음식 최고예요",
      "이 음식 맛있겠다!! でも오코노미야키는 못 이겨요 ㅎㅎ",
    ],
    japan: [
      "大阪帰ってきた！！！ほんまに嬉しいわ！！",
      "일본 투어！！오코노미야키 먹으러 가야지ー！！",
    ],
    cute: ["귀엽긴 한데... 저도 귀엽거든요!! ほんまに可愛いやろ！！"],
    default: ["ほんまに頑張るで！！ 열심히 할게요!!", "오사카 파워로 간다!!", "みんな！！ほんまにおおきに！！ 다들 응원해줘서 진짜 힘이 나요!! 최선 다할게요!!"],
  },
  kanon: {
    concert: [
      "클래식 댄스 훈련 받아서 무대 체력은 걱정 없어요 ㅎ",
      "이 안무 제가 제일 먼저 완성했어요. 클래식 베이스거든요",
    ],
    comeback: [
      "이 곡 어떤 애니 오프닝이랑 비슷한 느낌이에요!! 좋아요!!",
      "뮤비 분위기가 제가 좋아하는 애니랑 비슷해요!! 최고!!",
    ],
    dance: [
      "발레 동작 섞여 있는 거 보였어요?? 제가 제안했거든요 ㅎ",
      "클래식 댄스와 현대 댄스의 조화예요. 제 파트 집중해서 봐주세요",
    ],
    cute: [
      "귀엽다!! 어떤 애니 캐릭터랑 비슷해요!! 최고!!",
      "저도 이렇게 귀여운 캐릭터 코스프레 하고 싶어요!!",
    ],
    food: ["맛있겠다!! 어떤 애니에서 본 거랑 똑같이 생겼어요!! ㅎㅎ"],
    default: ["기대해줘요!! 클래식+현대 댄스의 완벽한 조화!!  最高!!", "춤 열심히 연습했어요~", "이 곡 받았을 때 제가 좋아하는 애니 OST 느낌이어서 진짜 좋았어요!! 안무도 제가 가장 빨리 외웠어요!! 다들 꼭 봐주세요!!"],
  },
  nako: {
    concert: [
      "오늘도 최선을 다할게요!! 응원해줘서 고마워요 😊",
      "무대 위에서만큼은 걱정 없어요. 경험이 있거든요 ㅎ",
      "팬 여러분 만나면 항상 힘이 나요!! 감사해요!!",
    ],
    comeback: [
      "이 곡 준비하면서 정말 열심히 했어요!! 들어줘서 고마워요",
      "새 노래 좋아해줘서 기뻐요~ 계속 응원해줘 😊",
    ],
    food: ["이거 맛있어 보인다! 같이 먹으러 가자~~", "밥은 혼자 먹는 것보다 같이 먹는 게 더 맛있어요 ㅎ"],
    japan: ["日本のみんな～！！また来たよ！会えて嬉しい！！", "일본 공연 항상 설레요!! 팬 여러분 만나는 게 최고예요!!"],
    default: ["応援ありがとう！！ 항상 감사해요~", "열심히 할게요!! 기대해줘도 돼요 😊", "이 일 하면서 이렇게 많은 분들이 응원해주시는 게 제일 감사해요!! 오늘도 최선을 다할게요!!"],
  },
  nana: {
    concert: [
      "やばい！！！楽しみすぎる！！！무대 완전 기대돼!!!",
      "무대에서 넘어질 것 같아요 기대감에 ㅋㅋㅋ",
      "오늘 최고의 엔터테이너가 되겠습니다！！！",
    ],
    comeback: [
      "이거 진짜 좋아!!! 들을수록 귀에 꽂혀!!!",
      "신곡!!!! やったー！！！！ 기다렸다!!!",
    ],
    food: [
      "맛있겠다~~ 배고프다 ㅋㅋ 지금 당장 먹고 싶어!!",
      "이거 먹으면서 버라이어티 찍으면 완전 재밌겠다!!",
    ],
    japan: ["日本ただいまー！！！みんな元気だった？！！！", "일본 팬 여러분 만나서 기뻐요!!! 笑顔全開です！！！"],
    cute: ["귀여워!!! 저도 귀엽죠?? 귀엽다고 해줘요!!!! ㅋㅋ"],
    default: ["ノリノリで行くよー！！ 같이 신나게 즐겨요!!", "すごい！！！최고!!! 기대해줘요!!", "みんなー！！楽しみすぎてやばいです！！！ 진짜 이번에 진짜 최고의 무대 보여줄게요!! 笑顔で見てね！！！"],
  },
  taiyo: {
    concert: [
      "멋진 무대 기대해요. 최선 다하겠습니다",
      "이런 에너지 좋아요. 나도 지지 않을 거야",
    ],
    comeback: [
      "이 곡 음악적으로 좋아요. 잘 만든 것 같아요",
      "새 노래 나왔네. 들어봤어요 좋더라고요",
    ],
    food: ["맛있어 보이는데. 나중에 먹어봐야겠어요", "먹방은 항상 보는 사람 배고프게 만들어요 ㅋ"],
    japan: ["日本か。また来れてよかった", "일본 무대는 뭔가 달라요. 좋은 의미로요"],
    default: ["잘 될 것 같아요. 기대해줘요", "열심히 준비했습니다", "이 일 오래 하면서 느끼는 건데 준비하는 과정이 제일 중요한 것 같아요. 그 과정 열심히 했으니까 결과는 자신 있어요."],
  },
  yoshiaki: {
    photo: [
      "이 비주얼 진짜 패션 센스 있어요!! 코디 어디서 했어요??",
      "사진 완전 좋아요. 스타일링 칭찬합니다",
      "이 옷 어디 거예요?? 저도 입어보고 싶어요",
    ],
    concert: [
      "이번 스타일링 진짜 기대됩니다. 패션도 퍼포먼스예요!!",
      "무대 패션 직접 제안했어요. 기대해줘요~",
    ],
    comeback: [
      "뮤비 의상 완전 마음에 들었어요!! 트렌디함 인정!!",
      "이 비주얼... 누가 스타일링했어요?? 잘했어요",
    ],
    cute: ["패션 감각 있으면 더 귀여워 보여요~ 이것도 스타일이에요 ㅎ"],
    default: ["スタイルで魅せますよ！ 비주얼도 퍼포먼스예요~", "패션이 곧 아이덴티티!! 기대해줘요", "Z세대 패션 아이콘으로서 이번에 진짜 비주얼 담당 제대로 할게요. 스타일링 직접 많이 참여했어요!! 봐줘요~"],
  },
  michi: {
    photo: [
      "이 비주얼 완전 좋아요. 스타일 있다",
      "이 분위기... 제가 좋아하는 스타일이에요",
    ],
    concert: [
      "It GIRL 등장합니다. 기대해줘요~",
      "무대 위에서 제일 빛나는 사람이 되겠습니다",
    ],
    comeback: [
      "이 곡 트렌디해요. 제 감각에 맞아요",
      "뮤비 비주얼 완전 내 스타일이다",
    ],
    cute: ["귀여운 거 좋아요. 트렌디하게 귀엽게 ㅎ"],
    japan: ["日本！また来たよ！스타일리시하게 일본도 접수!", "일본 팬 여러분 만나러 왔어요~"],
    default: ["それがミチスタイル！ 기대해줘요", "트렌드 세터로서 이번에 뭔가 보여줄게요", "It GIRL이라는 말이 부담스럽기도 한데요, 그냥 저답게 하면 된다고 생각해요. 이번에도 미치답게 하겠습니다. 기대해줘요~"],
  },
};

// ── 대화 스레드 (chemistry pairs) ──────────────────────────────
interface Thread {
  ctx: Ctx;
  comments: { memberId: string; content: string }[];
  replyChain: { memberId: string; content: string }[];
}

const THREADS: Thread[] = [
  // MIZYU 리더십
  { ctx: 'concert', comments: [{ memberId: 'mizyu', content: '리더로서 이번 무대 진짜 책임감 느껴요. 다들 믿어줘요!!' }],
    replyChain: [
      { memberId: 'rin', content: 'MIZYU 믿는다. 다들 잘 하자' },
      { memberId: 'suzuka', content: 'リーダー頼んだで！！ MIZYU 파이팅!!' },
      { memberId: 'kanon', content: 'MIZYU언니 최고예요!! 같이 잘 해봐요!!' },
    ],
  },
  // RIN 요리+랩
  { ctx: 'food', comments: [{ memberId: 'rin', content: '이거 제가 만들 수 있어요. 집에서 더 맛있게 만들거든요' }],
    replyChain: [
      { memberId: 'suzuka', content: 'ほんまに？？ 만들어줘!! 먹고 싶다!!' },
      { memberId: 'rin', content: '오코노미야키는 못 이길 것 같지만 ㅋㅋ' },
      { memberId: 'suzuka', content: '오코노미야키는 내 거거든요!! ㅋㅋ' },
    ],
  },
  // SUZUKA 오코노미야키
  { ctx: 'japan', comments: [{ memberId: 'suzuka', content: '大阪帰ってきた！！오코노미야키 먹으러 가야지~!!' }],
    replyChain: [
      { memberId: 'nana', content: '스즈카 오코노미야키만 생각하는 거야?? ㅋㅋ 나도 먹고 싶어!!' },
      { memberId: 'suzuka', content: 'ほんまに最高やねん！！오코노미야키 없으면 일본 투어 못 해요 ㅋ' },
      { memberId: 'mizyu', content: '스즈카... 무대도 생각해요 ㅋㅋ' },
    ],
  },
  // KANON 애니 비교
  { ctx: 'comeback', comments: [{ memberId: 'kanon', content: '이 곡 어떤 애니 오프닝이랑 비슷한 느낌이에요!! 진짜 좋아요!!' }],
    replyChain: [
      { memberId: 'mizyu', content: '카논... 무슨 애니?? ㅋㅋ' },
      { memberId: 'kanon', content: '비밀이에요 ㅎㅎ 아는 사람만 알아요!' },
      { memberId: 'nana', content: '나 알 것 같아!! 나도 그 생각 했어!!' },
    ],
  },
  // NAKO 경험담
  { ctx: 'concert', comments: [{ memberId: 'nako', content: '무대 위에서 팬분들 표정 보는 게 제일 좋아요. 그래서 이 일 하는 것 같아요 😊' }],
    replyChain: [
      { memberId: 'nana', content: '나코짱!! 그 말에 나도 울컥했어!!' },
      { memberId: 'nako', content: '나나~ ㅋㅋ 같이 열심히 하자!!　😊' },
      { memberId: 'taiyo', content: '멋있는 말이에요. 나도 그래요' },
    ],
  },
  // NANA 버라이어티 에너지
  { ctx: 'food', comments: [{ memberId: 'nana', content: '먹방 버라이어티 하고 싶다!! 이 음식 먹으면서 게임하면 재밌겠는데!!' }],
    replyChain: [
      { memberId: 'taiyo', content: '나나 또 기획하는 거야?? ㅋㅋ' },
      { memberId: 'nana', content: '기획력 있잖아요!! 어때요 재밌겠죠?!!' },
      { memberId: 'yoshiaki', content: '저도 참여하고 싶어요!! 스타일리시하게 먹방 할게요~' },
    ],
  },
  // TAIYO+MICHI 쿨가이
  { ctx: 'comeback', comments: [{ memberId: 'taiyo', content: '이 곡 음악적으로 잘 만든 것 같아요. 들을수록 좋아지는 타입이에요' }],
    replyChain: [
      { memberId: 'michi', content: '오빠도 그렇게 생각했어요? 저도 처음엔 몰랐는데 반복할수록 좋아지더라고요' },
      { memberId: 'nana', content: '두 분 역시 쿨하게 말해요!! 저는 처음부터 좋았어요!!!' },
    ],
  },
  // YOSHIAKI+MICHI 남매 패션 토크
  { ctx: 'photo', comments: [{ memberId: 'yoshiaki', content: '이 사진 스타일링 진짜 좋은데요. 어디 거예요??' }],
    replyChain: [
      { memberId: 'michi', content: '요시아키 또 패션 이야기 ㅋㅋ 근데 나도 궁금하긴 해요 ㅎ' },
      { memberId: 'yoshiaki', content: '누나도 궁금한 거잖아요 ㅋㅋ' },
      { memberId: 'kanon', content: '이 코디 제가 좋아하는 애니 캐릭터 스타일이에요!!' },
    ],
  },
  // AG! 일본 투어
  { ctx: 'japan', comments: [{ memberId: 'mizyu', content: '日本ツアー最高！！みんなに会えて嬉しい！！ 진짜 에너지 받았어요!!' }],
    replyChain: [
      { memberId: 'rin', content: '역시 일본 팬분들 열정이 다르네요. 좋았어요' },
      { memberId: 'suzuka', content: 'ほんまやで！！ 오코노미야키도 먹었고 완벽했어요!!' },
      { memberId: 'kanon', content: '日本最高！！！또 오고 싶어요!!!!!' },
    ],
  },
  // RIN 댄스 배틀
  { ctx: 'dance', comments: [{ memberId: 'rin', content: '이 안무 힙합 베이스가 있어서 제가 제일 빨리 습득했어요. 사실이에요' }],
    replyChain: [
      { memberId: 'mizyu', content: '린... 나도 빨리 배웠는데 ㅋㅋ' },
      { memberId: 'rin', content: 'MIZYU 리더니까 빨리 배우는 게 당연하죠 ㅋㅋ' },
      { memberId: 'kanon', content: '저는 클래식 배이스라 클래식 동작은 제가 제일 빠르거든요!! ㅎ' },
    ],
  },
];

// ── 정병기 대표 댓글 ──────────────────────────────────────────
const JBK_REPLIES = [
  "멤버들 고생했어요 🙏",
  "다들 잘하고 있어요! 자랑스럽습니다",
  "ㅋㅋㅋ 이런 거 올려도 되나요",
  "맞아요 맞아요",
  "열심히 준비했습니다. 많이 봐주세요!",
  "멤버들이 진짜 열심히 했어요. 잘 부탁드립니다 🙇",
  "이런 반응 보면 힘이 나네요 감사합니다",
  "ㅋㅋ 맞는 말이에요",
];

// ── Like 친화도 ──────────────────────────────────────────────
const LIKE_AFFINITY: [string, string[]][] = [
  ['mizyu',    ['rin', 'suzuka', 'kanon']],
  ['rin',      ['mizyu', 'suzuka']],
  ['suzuka',   ['mizyu', 'rin', 'kanon', 'nana']],
  ['kanon',    ['mizyu', 'rin', 'suzuka']],
  ['nako',     ['nana', 'taiyo', 'michi']],
  ['nana',     ['nako', 'taiyo', 'yoshiaki', 'michi']],
  ['taiyo',    ['nako', 'nana', 'michi']],
  ['yoshiaki', ['michi', 'nana', 'kanon']],
  ['michi',    ['yoshiaki', 'nako', 'nana', 'taiyo']],
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

  const baseCount = 2;
  const maxCount = 5;
  const targetCount = Math.max(forcedMin || 0, baseCount + Math.floor(rng() * (maxCount - baseCount + 1)));

  const affinityLikers = affinityMap.get(commenterId) || [];
  const likes: CommentLike[] = [];
  const used = new Set<string>([commenterId]);

  // Add affinity likers first
  for (const l of affinityLikers) {
    if (!used.has(l) && likes.length < targetCount) {
      if (rng() < 0.7) {
        likes.push({ memberId: l });
        used.add(l);
      }
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
  if (tags.hasJapan) p.push('mizyu', 'rin', 'suzuka', 'kanon');
  if (tags.hasConcert || tags.hasDance) p.push('mizyu', 'rin', 'suzuka', 'kanon');
  if (tags.hasComeback) p.push('nako', 'nana', 'michi');
  if (tags.hasFood) p.push('nana', 'taiyo', 'nako');
  if (tags.hasPhoto) p.push('yoshiaki', 'michi', 'kanon');
  if (tags.hasCute) p.push('kanon', 'nako', 'yoshiaki');
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

    // Occasional nako encouragement reply
    if (memberId !== 'nako' && rng() < 0.15) {
      replies.push({
        memberId: 'nako',
        content: '응원할게요!! 화이팅!! 😊',
        likes: buildLikes('nako', hashStr(postId + 'nako-reply-' + memberId)),
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
      const isSelf = entry.expanded.includes('x.com/ATARASHIIGAKKO') || entry.expanded.includes('twitter.com/ATARASHIIGAKKO');

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
            ATARASHII GAKKO! official 님이 재게시함
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
            {timeAgo(post.timestamp)} · {`TWIN PLANET · ${S_NUMBERS[post.posterId] || ''}`}
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
          const isSelfLink = u.expanded.includes('x.com/ATARASHIIGAKKO') || u.expanded.includes('twitter.com/ATARASHIIGAKKO');
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

    const processInstagram = (posts: { id: string; timestamp?: number; caption?: string; thumbnail?: string; url?: string; likes?: number; videoUrl?: string; memberId?: string | null; username?: string }[]) => {
      posts.forEach(p => {
        // memberId가 명시된 경우 우선 사용, 없으면 캡션 키워드 감지 → seed fallback
        const igPosterId = p.memberId || detectPoster(p.caption || '', hashStr(`ig-${p.id}`));
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
    { id: 'mizyu',    name: 'MIZYU',   sNumber: 1 },
    { id: 'rin',      name: 'RIN',     sNumber: 2 },
    { id: 'suzuka',   name: 'SUZUKA',  sNumber: 3 },
    { id: 'kanon',    name: 'KANON',   sNumber: 4 },
    { id: 'nako',     name: '奈子',    sNumber: 5 },
    { id: 'nana',     name: '奈々',    sNumber: 6 },
    { id: 'taiyo',    name: '太陽',    sNumber: 7 },
    { id: 'yoshiaki', name: 'よしあき', sNumber: 8 },
    { id: 'michi',    name: 'ミチ',    sNumber: 9 },
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
          <h1 className="text-sm font-normal text-gray-900 shrink-0">팬 피드 🌐</h1>
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
