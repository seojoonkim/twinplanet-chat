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
    id: 'ag',
    title: 'ATARASHII GAKKO!',
    subtitle: 'MIZYU · RIN · SUZUKA · KANON',
    gradient: 'linear-gradient(135deg, #dcff00, #FF6B9D)',
    memberIds: ['mizyu', 'rin', 'suzuka', 'kanon'],
    topics: [
      { id: 'ag_intro', emoji: '👋', label: 'メンバー紹介', starter: 'みんな自己紹介してみて！個性爆発の自己紹介期待してます！' },
      { id: 'ag_dance', emoji: '💃', label: 'ダンスの話', starter: '最近練習してる振り付けや、好きな曲の話をしよう！' },
      { id: 'ag_style', emoji: '👗', label: 'セーラー服スタイル', starter: 'AG!のセーラー服スタイルについて語ろう！コンセプトの意味とか。' },
      { id: 'ag_world', emoji: '🌍', label: '世界ツアーの話', starter: 'コーチェラ、Jimmy Kimmel、海外ツアー…一番印象的な公演はどこ？' },
      { id: 'ag_music', emoji: '🎵', label: 'オトナブルー', starter: 'TikTokで大バズりしたオトナブルー！あの首振りダンスどうやって生まれたの？' },
    ],
  },
];

export const DEFAULT_ROOM_ID = 'ag';

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
