// ─── TWIN PLANET タレント 짤방 메타데이터 ──────────────────────────────────
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
  // ─── ATARASHII GAKKO! 짤방 ────────────────────────────────────
  {
    id: 'leaders_live_1',
    filename: 'leaders_live_1.jpg',
    member: 'mizyu',
    sentBy: 'mizyu',
    description: 'AG! ライブパフォーマンス',
    caption: 'これがAG!の世界観！はみ出してこ🔥',
    triggers: ['ライブ', 'はみ出す', '個性', 'パフォーマンス', '舞台'],
    chance: 0.7,
  },
  {
    id: 'leaders_outfit_1',
    filename: 'leaders_outfit_1.jpg',
    member: 'suzuka',
    sentBy: 'suzuka',
    description: 'AG! 衣装コーデ',
    caption: '今日の衣装どう？ 普通じゃないでしょ😎',
    triggers: ['衣装', 'コーデ', 'ファッション', 'スタイル'],
    chance: 0.65,
  },

  // ─── ミチ 짤방 ─────────────────────────────────────────────
  {
    id: 'michi_fashion_1',
    filename: 'michi_fashion_1.jpg',
    member: 'michi',
    sentBy: 'michi',
    description: 'ミチ ファッションショット',
    caption: '好きを貫いていたら、ここまで来れた💕',
    triggers: ['ファッション', 'It GIRL', 'スタイル', 'おしゃれ', '好き'],
    chance: 0.7,
  },
  {
    id: 'michi_yoshimichi_1',
    filename: 'michi_yoshimichi_1.jpg',
    member: 'michi',
    sentBy: 'yoshiaki',
    description: 'よしミチ 姉弟ショット',
    caption: '姉ちゃんと！よしミチ最強✌️',
    triggers: ['よしミチ', '姉弟', '兄妹', 'ミチ', 'よしあき'],
    chance: 0.7,
  },

  // ─── よしあき 짤방 ─────────────────────────────────────────
  {
    id: 'yoshiaki_fashion_1',
    filename: 'yoshiaki_fashion_1.jpg',
    member: 'yoshiaki',
    sentBy: 'yoshiaki',
    description: 'よしあき ファッションポーズ',
    caption: '個性って武器だと思う。ずっとそう信じてる💜',
    triggers: ['ファッション', '個性', 'スタイル', 'モデル', 'Z世代'],
    chance: 0.7,
  },
  {
    id: 'yoshiaki_onsense_1',
    filename: 'yoshiaki_onsense_1.jpg',
    member: 'yoshiaki',
    sentBy: 'yoshiaki',
    description: 'よしあき ONSENSE アーティスト',
    caption: 'ONSENSEとしてデビューできた日、忘れられない',
    triggers: ['ONSENSE', 'アーティスト', 'デビュー', '音楽'],
    chance: 0.65,
  },

  // ─── 矢吹奈子 짤방 ─────────────────────────────────────────
  {
    id: 'nako_smile_1',
    filename: 'nako_smile_1.jpg',
    member: 'nako',
    sentBy: 'nako',
    description: '奈子 笑顔ショット',
    caption: '笑顔でいれば何でも乗り越えられる！🌸',
    triggers: ['笑顔', '元気', '前向き', 'ポジティブ', '頑張'],
    chance: 0.7,
  },
  {
    id: 'nako_acting_1',
    filename: 'nako_acting_1.jpg',
    member: 'nako',
    sentBy: 'nako',
    description: '奈子 女優ショット',
    caption: '演技、まだまだ頑張ります！見ててください🎬',
    triggers: ['女優', '演技', 'お芝居', '撮影', 'ドラマ'],
    chance: 0.65,
  },

  // ─── 鈴木奈々 짤방 ─────────────────────────────────────────
  {
    id: 'nana_variety_1',
    filename: 'nana_variety_1.jpg',
    member: 'nana',
    sentBy: 'nana',
    description: '奈々 バラエティリアクション',
    caption: '全力でやります！😄',
    triggers: ['バラエティ', '全力', 'リアクション', '収録', '笑'],
    chance: 0.75,
  },
  {
    id: 'nana_model_1',
    filename: 'nana_model_1.jpg',
    member: 'nana',
    sentBy: 'nana',
    description: '奈々 モデルショット',
    caption: '謙虚に、でも全力で！これが私のモットー✨',
    triggers: ['モデル', '謙虚', 'かわいい', 'ポーズ'],
    chance: 0.6,
  },

  // ─── 杉浦太陽 짤방 ─────────────────────────────────────────
  {
    id: 'taiyo_music_1',
    filename: 'taiyo_music_1.jpg',
    member: 'taiyo',
    sentBy: 'taiyo',
    description: '太陽 音楽ショット',
    caption: '音楽ってやっぱりいいな🎵',
    triggers: ['音楽', 'ギター', '演奏', 'ミュージシャン'],
    chance: 0.7,
  },
  {
    id: 'taiyo_family_1',
    filename: 'taiyo_family_1.jpg',
    member: 'taiyo',
    sentBy: 'taiyo',
    description: '太陽 ファミリー',
    caption: '家族がいちばんの力！',
    triggers: ['家族', '子供', 'パパ', '日常'],
    chance: 0.65,
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

    return true;
  });

  if (candidates.length === 0) return null;

  // 확률 기반 선택
  const lucky = candidates.filter((m) => Math.random() < (m.chance ?? 0.6));
  if (lucky.length === 0) return null;

  // 랜덤 하나 선택
  return lucky[Math.floor(Math.random() * lucky.length)] ?? null;
}
