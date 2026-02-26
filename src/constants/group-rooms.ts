export interface RoomMember {
  id: string;
  name: string;
  fullName: string;
  sNumber?: number;
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
  mizyu: {
    id: 'mizyu',
    name: 'MIZYU',
    fullName: 'MIZYU',
    color: '#FF6B9D',
    bg: 'from-pink-400 to-pink-600',
    role: 'リーダー。ミジュコプターで魅せる',
    initials: 'M',
  },
  rin: {
    id: 'rin',
    name: 'RIN',
    fullName: 'RIN',
    color: '#9B59B6',
    bg: 'from-violet-400 to-violet-600',
    role: 'ヒップホップ&ラップ担当。料理が趣味',
    initials: 'R',
  },
  suzuka: {
    id: 'suzuka',
    name: 'SUZUKA',
    fullName: 'SUZUKA',
    color: '#E67E22',
    bg: 'from-orange-400 to-orange-600',
    role: '関西弁×パワフルボイス×MC',
    initials: 'S',
  },
  kanon: {
    id: 'kanon',
    name: 'KANON',
    fullName: 'KANON',
    color: '#3498DB',
    bg: 'from-sky-400 to-sky-600',
    role: 'クラシックダンス×アニオタ',
    initials: 'K',
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
    subtitle: 'MIZYU・RIN・SUZUKA・KANON・奈子・奈々・太陽・よしあき・ミチ 全員集合',
    gradient: 'linear-gradient(135deg, #FF6B9D, #3498DB)',
    memberIds: ['mizyu', 'rin', 'suzuka', 'kanon', 'nako', 'nana', 'taiyo', 'yoshiaki', 'michi'],
    topics: [
      { id: 'all_intro', emoji: '👋', label: '自己紹介タイム', starter: 'みんな自己紹介してみて！それぞれの個性が爆発する自己紹介、期待してます！' },
      { id: 'all_collab', emoji: '🎵', label: 'コラボしたい！', starter: 'TWIN PLANET タレント同士でコラボするとしたら誰と何をやってみたい？' },
      { id: 'all_fav', emoji: '⭐', label: '最近のお気に入り', starter: '最近ハマってること、好きなもの、なんでもシェアして！' },
      { id: 'all_japan', emoji: '🇯🇵', label: '日本の好きなところ', starter: '日本のどんなところが好き？食べ物・文化・場所、なんでも！' },
      { id: 'all_dream', emoji: '🌟', label: '夢・目標', starter: 'これからやりたいこと、夢、目標を教えて！みんなで応援し合おう！' },
    ],
  },
  {
    id: 'ag',
    title: 'AG! メンバーでトーク',
    subtitle: 'MIZYU・RIN・SUZUKA・KANON 4人でトーク',
    gradient: 'linear-gradient(135deg, #FF6B9D, #E67E22, #9B59B6, #3498DB)',
    memberIds: ['mizyu', 'rin', 'suzuka', 'kanon'],
    topics: [
      { id: 'ag_energy', emoji: '🔥', label: 'AG!エネルギー爆発', starter: '今一番テンションが上がってることを教えて！みんなのパワー見せて！' },
      { id: 'ag_dance', emoji: '💃', label: 'ダンス・パフォーマンス', starter: '最近のライブやパフォーマンスで一番興奮したシーンは？' },
      { id: 'ag_hamidaseru', emoji: '✨', label: 'はみ出そう！', starter: '「はみ出す」って自分にとってどういう意味？今日どんなふうにはみ出した？' },
      { id: 'ag_music', emoji: '🎵', label: '音楽・アート', starter: '今聴いてる曲や影響を受けたアーティストは？AG!の音楽の原点も聞きたい！' },
      { id: 'ag_4nin', emoji: '🤝', label: '4人のケミ', starter: 'MIZYU・RIN・SUZUKA・KANON 4人の中で一番おもしろいエピソードを教えて！' },
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
