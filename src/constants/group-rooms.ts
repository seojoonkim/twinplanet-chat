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

// TWIN PLANET 탤런트 멤버 데이터
export const ALL_MEMBERS: Record<string, RoomMember> = {
  mizyu: {
    id: 'mizyu',
    name: 'MIZYU',
    fullName: 'MIZYU',
    color: '#FF6B9D',
    bg: 'from-pink-400 to-pink-600',
    role: '리더. 미쥬콥터로 매료시키는',
    initials: 'M',
  },
  rin: {
    id: 'rin',
    name: 'RIN',
    fullName: 'RIN',
    color: '#9B59B6',
    bg: 'from-violet-400 to-violet-600',
    role: '힙합&랩 담당. 요리가 취미',
    initials: 'R',
  },
  suzuka: {
    id: 'suzuka',
    name: 'SUZUKA',
    fullName: 'SUZUKA',
    color: '#E67E22',
    bg: 'from-orange-400 to-orange-600',
    role: '간사이 사투리×파워풀 보이스×MC',
    initials: 'S',
  },
  kanon: {
    id: 'kanon',
    name: 'KANON',
    fullName: 'KANON',
    color: '#3498DB',
    bg: 'from-sky-400 to-sky-600',
    role: '클래식 댄스×애니 덕후',
    initials: 'K',
  },
  nako: {
    id: 'nako',
    name: '奈子',
    fullName: '矢吹奈子',
    color: '#ff9eb5',
    bg: 'from-pink-300 to-pink-500',
    role: '전 HKT48/IZ*ONE. 아이돌×배우',
    initials: '奈',
  },
  nana: {
    id: 'nana',
    name: '奈々',
    fullName: '鈴木奈々',
    color: '#ffe66d',
    bg: 'from-yellow-300 to-amber-400',
    role: '버라이어티를 웃음으로 물들이는 엔터테이너',
    initials: '奈々',
  },
  taiyo: {
    id: 'taiyo',
    name: '太陽',
    fullName: '杉浦太陽',
    color: '#4fc3f7',
    bg: 'from-sky-300 to-sky-500',
    role: '배우·탤런트·뮤지션',
    initials: '太',
  },
  yoshiaki: {
    id: 'yoshiaki',
    name: 'よしあき',
    fullName: 'よしあき',
    color: '#a78bfa',
    bg: 'from-violet-300 to-violet-500',
    role: 'Z세대 패션 아이콘. 미치의 남동생',
    initials: 'よ',
  },
  michi: {
    id: 'michi',
    name: 'ミチ',
    fullName: 'ミチ',
    color: '#f472b6',
    bg: 'from-pink-400 to-fuchsia-500',
    role: 'Z세대가 주목하는 It GIRL. 요시아키의 언니',
    initials: 'ミ',
  },
};

// TWIN PLANET 그룹 채팅룸
export const GROUP_ROOMS: GroupRoom[] = [
  {
    id: 'ag',
    title: 'ATARASHII GAKKO!',
    subtitle: 'MIZYU · RIN · SUZUKA · KANON',
    gradient: 'linear-gradient(135deg, #dcff00, #FF6B9D)',
    memberIds: ['mizyu', 'rin', 'suzuka', 'kanon'],
    topics: [
      { id: 'ag_intro', emoji: '👋', label: '멤버 소개', starter: '모두 자기소개 해봐! 개성 넘치는 자기소개 기대할게!' },
      { id: 'ag_dance', emoji: '💃', label: '댄스 이야기', starter: '최근 연습하고 있는 안무나 좋아하는 곡 얘기해봐!' },
      { id: 'ag_style', emoji: '👗', label: '세일러복 스타일', starter: 'AG!의 세일러복 스타일에 대해 이야기해봐! 컨셉의 의미 같은 것도!' },
      { id: 'ag_world', emoji: '🌍', label: '월드 투어 이야기', starter: '코첼라, Jimmy Kimmel, 해외 투어… 가장 인상 깊었던 공연은 어디야?' },
      { id: 'ag_music', emoji: '🎵', label: '오토나 블루', starter: 'TikTok에서 엄청 바이럴된 오토나 블루! 그 고개 흔들기 댄스는 어떻게 탄생했어?' },
    ],
  },
];

export const DEFAULT_ROOM_ID = 'ag';

// ─── 헬퍼 함수 ────────────────────────────────────────────────

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
