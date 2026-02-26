export const BUILT_IN_IDOL_IDS = [
  'atarashii-gakko',
  'nako',
  'nana',
  'taiyo',
  'yoshiaki',
  'michi',
] as const;

export type BuiltInIdolId = typeof BUILT_IN_IDOL_IDS[number];

export const IDOL_DEFAULTS: Record<BuiltInIdolId, {
  id: string;
  name: string;
  nameKr: string;
  nameEn: string;
  description: string;
  profileImage: string;
  language: 'ja' | 'ko' | 'en';
  color: string;
}> = {
  'atarashii-gakko': {
    id: 'atarashii-gakko',
    name: '新しい学校のリーダーズ',
    nameKr: '아타라시이 각코',
    nameEn: 'ATARASHII GAKKO!',
    description: '個性と自由ではみ出していく4人組',
    profileImage: '/idols/atarashii-gakko/profile.jpg',
    language: 'ja',
    color: '#dcff00',
  },
  'nako': {
    id: 'nako',
    name: '矢吹奈子',
    nameKr: '야부키 나코',
    nameEn: 'Nako Yabuki',
    description: '元HKT48/IZ*ONE。アイドル×女優',
    profileImage: '/idols/nako/profile.jpg',
    language: 'ja',
    color: '#ff9eb5',
  },
  'nana': {
    id: 'nana',
    name: '鈴木奈々',
    nameKr: '스즈키 나나',
    nameEn: 'Nana Suzuki',
    description: 'バラエティを笑顔にするエンターテイナー',
    profileImage: '/idols/nana/profile.jpg',
    language: 'ja',
    color: '#ffe66d',
  },
  'taiyo': {
    id: 'taiyo',
    name: '杉浦太陽',
    nameKr: '스기우라 타이요',
    nameEn: 'Taiyo Sugiura',
    description: '俳優・タレント・ミュージシャン',
    profileImage: '/idols/taiyo/profile.jpg',
    language: 'ja',
    color: '#4fc3f7',
  },
  'yoshiaki': {
    id: 'yoshiaki',
    name: 'よしあき',
    nameKr: '요시아키',
    nameEn: 'Yoshiaki',
    description: 'Z世代ファッションアイコン。ミチの弟',
    profileImage: '/idols/yoshiaki/profile.jpg',
    language: 'ja',
    color: '#a78bfa',
  },
  'michi': {
    id: 'michi',
    name: 'ミチ',
    nameKr: '미치',
    nameEn: 'Michi',
    description: 'Z世代が注目するIt GIRL。よしあきの姉',
    profileImage: '/idols/michi/profile.jpg',
    language: 'ja',
    color: '#f472b6',
  },
};
