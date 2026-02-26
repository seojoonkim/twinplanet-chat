export interface FeedComment {
  memberId: string;
  memberName: string;
  sNumber: string;
  content: string;
  emoji?: string;
}

export interface FeedPost {
  id: string;
  type: 'concert' | 'release' | 'broadcast' | 'event' | 'notice';
  title: string;
  content: string;
  date: string; // ISO string
  location?: string;
  tags: string[]; // 관련 멤버 IDs
  comments: FeedComment[];
  likes: number;
}

export const SAMPLE_FEED: FeedPost[] = [
  {
    id: 'feed-001',
    type: 'concert',
    title: '2026 tripleS OT24 콘서트 <My Secret New Zone> 아시아 투어',
    content: '우리 코스모스 여러분! 2026년 OT24 아시아 투어 일정을 발표합니다. 24명 전원이 함께하는 특별한 무대로 찾아갑니다. 🌌',
    date: '2026-03-15T18:00:00+09:00',
    location: '서울올림픽공원 KSPO돔',
    tags: ['seoyeon', 'hyerin', 'jiwoo', 'chaeyeon', 'yooyeon', 'sumin', 'naekyung', 'yubin', 'kaede', 'dahyun', 'kotone', 'yeonji', 'nien', 'sohyun', 'shinwi', 'mayu', 'rin', 'jubin', 'hayeon', 'sion', 'chaewon', 'seollin', 'seoa', 'jiyeon'],
    likes: 12847,
    comments: [
      { memberId: 'seoyeon', memberName: '서연', sNumber: 'S1', content: '드디어 발표됐다!! 코스모스 여러분 기다려요 🌙', emoji: '🌙' },
      { memberId: 'chaewon', memberName: '채원', sNumber: 'S21', content: '와 24명 다 같이!! 저 엄청 열심히 연습할게요 ㅠㅠ', emoji: '🥺' },
      { memberId: 'kaede', memberName: '카에데', sNumber: 'S9', content: 'とっても楽しみにしています！コスモスの皆さん会いましょう🌸', emoji: '🌸' },
      { memberId: 'yooyeon', memberName: '유연', sNumber: 'S5', content: '저 이번엔 진짜 안 울 거예요... 아마도...', emoji: '😭' },
      { memberId: 'naekyung', memberName: '나경', sNumber: 'S7', content: '무대 진짜 열심히 준비할게요!! 기대해주세요 🔥', emoji: '🔥' },
    ]
  },
  {
    id: 'feed-002',
    type: 'release',
    title: "Assemble26 'Love&Pop' 발매",
    content: '새 앨범 Assemble26 "Love&Pop"이 2월 23일 오전 9시에 전 세계 음원 사이트에서 발매됩니다! 많은 관심과 사랑 부탁드립니다 💕',
    date: '2026-02-23T09:00:00+09:00',
    tags: ['seoyeon', 'hyerin', 'chaeyeon', 'sumin', 'dahyun', 'sohyun', 'mayu', 'hayeon'],
    likes: 8923,
    comments: [
      { memberId: 'hyerin', memberName: '혜린', sNumber: 'S2', content: '드디어!!! 이번 앨범 진짜 자신 있어요 💪', emoji: '💪' },
      { memberId: 'dahyun', memberName: '다현', sNumber: 'S10', content: '많이 들어주세요!! 저 이번 노래 너무 좋아요 🎵', emoji: '🎵' },
      { memberId: 'mayu', memberName: '마유', sNumber: 'S16', content: 'みんなたくさん聴いてね！💗', emoji: '💗' },
      { memberId: 'sohyun', memberName: '소현', sNumber: 'S14', content: '코스모스 여러분 기대해도 좋아요 😊', emoji: '😊' },
    ]
  },
  {
    id: 'feed-003',
    type: 'broadcast',
    title: '뮤직뱅크 출연',
    content: '이번 주 금요일 뮤직뱅크에서 만나요! KBS2 저녁 5시 방송입니다 📺',
    date: '2026-02-28T17:00:00+09:00',
    tags: ['seoyeon', 'hyerin', 'jiwoo', 'chaeyeon', 'yubin'],
    likes: 4521,
    comments: [
      { memberId: 'jiwoo', memberName: '지우', sNumber: 'S3', content: '뮤방!! 진짜 열심히 할게요 ㅎㅎ 봐주세요~', emoji: '📺' },
      { memberId: 'yubin', memberName: '유빈', sNumber: 'S8', content: '무대 너무 기대돼요!! 잘 보고 계세요 😆', emoji: '✨' },
      { memberId: 'chaeyeon', memberName: '채연', sNumber: 'S4', content: '에너지 폭발 무대 보여드릴게요 💥', emoji: '💥' },
    ]
  },
  {
    id: 'feed-004',
    type: 'event',
    title: '팬싸인회 — 코엑스 아셈볼룸',
    content: '2월 24일 코엑스 아셈볼룸에서 팬싸인회를 진행합니다. 코스모스 여러분과 직접 만날 수 있는 소중한 시간! 많은 참여 부탁드립니다 💌',
    date: '2026-02-24T11:30:00+09:00',
    location: '코엑스 아셈볼룸',
    tags: ['seoyeon', 'hyerin', 'jiwoo', 'chaeyeon', 'yooyeon', 'sumin'],
    likes: 6234,
    comments: [
      { memberId: 'sumin', memberName: '수민', sNumber: 'S6', content: '팬싸!!! 저 이번엔 진짜 많이 얘기하고 싶어요 🗣️', emoji: '🗣️' },
      { memberId: 'yooyeon', memberName: '유연', sNumber: 'S5', content: '오자마자 울 것 같은데... 그래도 꼭 와요 ㅠㅠ', emoji: '🫂' },
      { memberId: 'seoyeon', memberName: '서연', sNumber: 'S1', content: '코스모스 만나러 가요~! 기대해요 💙', emoji: '💙' },
    ]
  },
];
