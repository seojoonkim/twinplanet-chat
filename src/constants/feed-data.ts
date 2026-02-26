export interface FeedSource {
  id: string;
  talentId: string;
  platform: 'youtube' | 'twitter' | 'instagram';
  channelId?: string;   // YouTube channel ID
  handle?: string;      // Twitter/Instagram handle
  displayName: string;
}

export const FEED_SOURCES: FeedSource[] = [
  // ATARASHII GAKKO!
  { id: 'leaders-yt', talentId: 'atarashii-gakko', platform: 'youtube', channelId: 'UCRa4EDGJEMpUfMRBRJKXbIg', displayName: 'ATARASHII GAKKO! Official' },
  { id: 'leaders-tw', talentId: 'atarashii-gakko', platform: 'twitter', handle: 'ATARASHIIGAKKO', displayName: '新しい学校のリーダーズ' },
  // Nako Yabuki
  { id: 'nako-tw', talentId: 'nako', platform: 'twitter', handle: 'yabuki_nako', displayName: '矢吹奈子' },
  // Nana Suzuki
  { id: 'nana-tw', talentId: 'nana', platform: 'twitter', handle: 'suzukinana_info', displayName: '鈴木奈々' },
  // Yoshiaki
  { id: 'yoshiaki-tw', talentId: 'yoshiaki', platform: 'twitter', handle: 'yoshiaki_0827', displayName: 'よしあき' },
  // Michi
  { id: 'michi-tw', talentId: 'michi', platform: 'twitter', handle: 'michimichi_1998', displayName: 'ミチ' },
  // Taiyo Sugiura
  { id: 'taiyo-tw', talentId: 'taiyo', platform: 'twitter', handle: 'sugiura_taiyo', displayName: '杉浦太陽' },
];

export const DEFAULT_FEED_TALENT_ID = 'atarashii-gakko';
