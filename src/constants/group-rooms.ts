export interface RoomMember {
  id: string;
  name: string;
  fullName: string;
  color: string;
  bg: string;
  role: string;
  initials: string;
  actions?: string[];
}

export interface GroupTopic {
  id: string;
  emoji: string;
  label: string;
  starter: string;
}

export interface GroupRoom {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  memberIds: string[];
  topics: GroupTopic[];
}

// TWIN PLANET タレント メンバーデータ
export const ALL_MEMBERS: Record<string, RoomMember> = {
  'atarashii-gakko': {
    id: 'atarashii-gakko',
    name: 'AG!',
    fullName: '新しい学校のリーダーズ',
    color: '#dcff00',
    bg: 'from-yellow-300 to-lime-400',
    role: '個性と自由ではみ出していく4人組',
    initials: 'AG',
  },
  nako: {
    id: 'nako',
    name: '奈子',
    fullName: '矢吹奈子',
    color: '#ff9eb5',
    bg: 'from-pink-300 to-pink-500',
    role: '元HKT48/IZ*ONE。アイドル×女優',
    initials: '奈',
  },
  nana: {
    id: 'nana',
    name: '奈々',
    fullName: '鈴木奈々',
    color: '#ffe66d',
    bg: 'from-yellow-300 to-amber-400',
    role: 'バラエティを笑顔にするエンターテイナー',
    initials: '奈々',
  },
  taiyo: {
    id: 'taiyo',
    name: '太陽',
    fullName: '杉浦太陽',
    color: '#4fc3f7',
    bg: 'from-sky-300 to-sky-500',
    role: '俳優・タレント・ミュージシャン',
    initials: '太',
  },
  yoshiaki: {
    id: 'yoshiaki',
    name: 'よしあき',
    fullName: 'よしあき',
    color: '#a78bfa',
    bg: 'from-violet-300 to-violet-500',
    role: 'Z世代ファッションアイコン。ミチの弟',
    initials: 'よ',
  },
  michi: {
    id: 'michi',
    name: 'ミチ',
    fullName: 'ミチ',
    color: '#f472b6',
    bg: 'from-pink-400 to-fuchsia-500',
    role: 'Z世代が注目するIt GIRL。よしあきの姉',
    initials: 'ミ',
  },
};

// TWIN PLANET グループ チャットルーム
export const GROUP_ROOMS: GroupRoom[] = [
  {
    id: 'all',
    title: 'TWIN PLANET みんなで',
    subtitle: 'AG!・奈子・奈々・太陽・よしあき・ミチ 全員集合',
    gradient: 'linear-gradient(135deg, #dcff00, #ff9eb5)',
    memberIds: ['atarashii-gakko', 'nako', 'nana', 'taiyo', 'yoshiaki', 'michi'],
    topics: [
      { id: 'all_intro', emoji: '👋', label: '自己紹介タイム', starter: 'みんな自己紹介してみて！それぞれの個性が爆発する自己紹介、期待してます！' },
      { id: 'all_collab', emoji: '🎵', label: 'コラボしたい！', starter: 'TWIN PLANET タレント同士でコラボするとしたら誰と何をやってみたい？' },
      { id: 'all_fav', emoji: '⭐', label: '最近のお気に入り', starter: '最近ハマってること、好きなもの、なんでもシェアして！' },
      { id: 'all_japan', emoji: '🇯🇵', label: '日本の好きなところ', starter: '日本のどんなところが好き？食べ物・文化・場所、なんでも！' },
      { id: 'all_dream', emoji: '🌟', label: '夢・目標', starter: 'これからやりたいこと、夢、目標を教えて！みんなで応援し合おう！' },
    ],
  },
  {
    id: 'fashion',
    title: 'ファッション部',
    subtitle: 'よしあき＆ミチのZ世代スタイル研究室',
    gradient: 'linear-gradient(135deg, #a78bfa, #f472b6)',
    memberIds: ['yoshiaki', 'michi'],
    topics: [
      { id: 'fashion_style', emoji: '👗', label: 'マイスタイル', starter: '今のファッションの個人的なテーマやこだわりを教えて！' },
      { id: 'fashion_inspo', emoji: '📸', label: 'インスピレーション', starter: 'ファッションのインスピレーションはどこから？人・映画・アート・街？' },
      { id: 'fashion_brand', emoji: '🛍️', label: '好きなブランド', starter: '最近気になってるブランドやアイテムは？Z世代トレンド教えて！' },
      { id: 'fashion_sibling', emoji: '👫', label: '兄妹ファッション', starter: 'よしあきとミチが姉弟でコーデしたら？どんなスタイルになりそう？' },
      { id: 'fashion_tips', emoji: '💡', label: 'おしゃれになるコツ', starter: 'おしゃれ初心者にアドバイスするとしたら？まず何から始めるべき？' },
    ],
  },
];

export const DEFAULT_ROOM_ID = 'all';

// ─── ヘルパー関数 ────────────────────────────────────────────────

export function getRoomById(roomId: string): GroupRoom | undefined {
  return GROUP_ROOMS.find((r) => r.id === roomId);
}

export function getRoomMembers(room: GroupRoom): Record<string, RoomMember> {
  const result: Record<string, RoomMember> = {};
  for (const id of room.memberIds) {
    const m = ALL_MEMBERS[id];
    if (m) result[id] = m;
  }
  return result;
}

export function getRoomMemberOrder(room: GroupRoom): string[] {
  return room.memberIds.filter((id) => id in ALL_MEMBERS);
}
