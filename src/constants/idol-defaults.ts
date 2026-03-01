export const APP_SUBTITLE = "TWIN PLANET タレントと AI チャット ✨";

export const BUILT_IN_IDOL_IDS = [
  'mizyu',
  'rin',
  'suzuka',
  'kanon',
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
  'mizyu': {
    id: 'mizyu',
    name: 'MIZYU',
    nameKr: '미즈유',
    nameEn: 'MIZYU',
    description: '新しい学校のリーダーズ リーダー。ミジュコプターで魅せる',
    profileImage: '/idols/mizyu/profile.jpg',
    language: 'ja',
    color: '#FF6B9D',
  },
  'rin': {
    id: 'rin',
    name: 'RIN',
    nameKr: '린',
    nameEn: 'RIN',
    description: '新しい学校のリーダーズ。ヒップホップ&ラップ担当',
    profileImage: '/idols/rin/profile.jpg',
    language: 'ja',
    color: '#9B59B6',
  },
  'suzuka': {
    id: 'suzuka',
    name: 'SUZUKA',
    nameKr: '스즈카',
    nameEn: 'SUZUKA',
    description: '新しい学校のリーダーズ。関西弁×パワフルボイス×MC',
    profileImage: '/idols/suzuka/profile.jpg',
    language: 'ja',
    color: '#E67E22',
  },
  'kanon': {
    id: 'kanon',
    name: 'KANON',
    nameKr: '카논',
    nameEn: 'KANON',
    description: '新しい学校のリーダーズ 末っ子。クラシックダンス×アニオタ',
    profileImage: '/idols/kanon/profile.jpg',
    language: 'ja',
    color: '#3498DB',
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
