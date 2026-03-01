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
  const ALL_IDS = ['mizyu', 'rin', 'suzuka', 'kanon', 'nako', 'nana', 'taiyo', 'yoshiaki', 'michi'];
  if (matched.length === 0) return ALL_IDS[Math.abs(seed) % ALL_IDS.length]!;
  if (matched.length === 1) return matched[0]!;
  return matched[Math.abs(seed) % matched.length]!;
}

// ── 댓글 컨텐츠 풀 (멤버별 × 컨텍스트별) ─────────────────────
type Ctx = 'concert' | 'comeback' | 'food' | 'japan' | 'photo' | 'dance' | 'cute' | 'default';

const COMMENT_POOL: Record<string, Partial<Record<Ctx, string[]>>> = {
  mizyu: {
    concert: [
      "ミジュコプター発射準備完了！今回のステージ、絶対最高にするよ!!",
      "リーダーとして、今回のステージは自信あり。みんな見てて!!",
      "めちゃくちゃ練習したんだから。信じてくれなきゃ来て確かめてよ 笑",
    ],
    comeback: [
      "この曲初めて聴いた瞬間『これだ！』って思った。やっぱ私センスあるわ ㅎ",
      "レコーディング、一発OKだったよ。天才かもしれない ㅎ",
    ],
    japan: [
      "日本！！やっとだ！！めちゃくちゃ楽しみ！みんな来てね～！！",
      "日本のファンのみなさん！！待ってたよ！！💕",
    ],
    dance: [
      "振り付けのポイントはやっぱりミジュコプターでしょ。特許申請中だよ ㅋㅋ",
      "このムーブ、私が提案したんだけどめちゃくちゃうまくいった ㅎ",
    ],
    cute: ["可愛いのはわかるけど…私も可愛いよね? リーダーだって可愛くていいじゃない ㅎ"],
    default: ["みんな！よろしく！！全力でいきます", "リーダーMIZYUここにいるよ!! 期待してて~", "今回は本当に自信ある。練習中はしんどかったけど、その分クオリティは高いよ!! みんな絶対見てね！！🌟"],
  },
  rin: {
    concert: [
      "ラップパート、めちゃくちゃ頑張った。聞こえる？",
      "振り付けマスターした。ヒップホップベースだからこういうのは得意",
    ],
    comeback: [
      "この曲のビートがめちゃくちゃ好き。ラップ書きたくなった",
      "歌詞分析終わり。私のスタイルだわ",
    ],
    food: [
      "これ家で作れるよ。レシピ知ってるから",
      "料理しながらこの曲聴いてたんだけど、完璧な組み合わせだった",
    ],
    dance: [
      "ヒップホップベースでこの振り付け分析してみたけど、よくできてる",
      "このムーブ覚えるとき、私が一番最初にマスターしたよ。本当の話",
    ],
    default: ["まあまあ。期待してて", "よかったよ ㅎ", "この曲練習しながら料理もしてた。効率いいでしょ ㅋㅋ"],
  },
  suzuka: {
    concert: [
      "ほんまに楽しみやで！！ステージで爆発させる準備できてるで!!",
      "関西出身のパワー見せたるわ!! なめんなよ～！！",
      "ステージ終わったらお好み焼き食べるねん。それが楽しみやで",
    ],
    comeback: [
      "ほんまにええ曲やわ！！最高やで!!",
      "この曲、大阪でも絶対流行るって!! 保証するわ!!",
    ],
    food: [
      "お好み焼き食べたい…関西の飯が一番やで",
      "この食べ物おいしそうやな!! でもお好み焼きには勝たれへんで ㅎ",
    ],
    japan: [
      "大阪帰ってきた！！！ほんまに嬉しいわ！！",
      "日本ツアー！！お好み焼き食べに行かなあかんでー！！",
    ],
    cute: ["可愛いのはわかるけど…私も可愛いねんで!! ほんまに可愛いやろ！！"],
    default: ["ほんまに頑張るで！！全力でいきます!!", "大阪パワーで行くで!!", "みんな！！ほんまにおおきに！！応援してくれてほんまに力になってます!! 最善を尽くすで!!"],
  },
  kanon: {
    concert: [
      "クラシックダンストレーニング受けてるからステージ体力は問題なし ㅎ",
      "この振り付け、私が一番最初に完成させたよ。クラシックベースだから",
    ],
    comeback: [
      "この曲、なんかアニメのオープニングに似た感じがする!! めちゃくちゃ好き!!",
      "MVの雰囲気が私の好きなアニメと似てる!! 最高!!",
    ],
    dance: [
      "バレエの動き混じってるの気づいた?? 私が提案したんだよ ㅎ",
      "クラシックダンスと現代ダンスの融合だよ。私のパート集中して見てね",
    ],
    cute: [
      "かわいい!! なんかアニメのキャラクターに似てる!! 最高!!",
      "私もこんなかわいいキャラのコスプレしたい!!",
    ],
    food: ["おいしそう!! なんかアニメで見たのと全く同じ見た目!! ㅎ"],
    default: ["期待してて!! クラシック+現代ダンスの完璧な融合!! 最高!!", "踊り、一生懸命練習したよ~", "この曲もらった時、私の好きなアニメのOST感があって本当によかった!! 振り付けも一番早く覚えたよ!! みんな絶対見てね!!"],
  },
  nako: {
    concert: [
      "今日も全力でいくね!! 応援してくれてありがとう 😊",
      "ステージの上では心配ないよ。経験があるから ㅎ",
      "ファンのみなさんに会うといつも元気もらえる!! ありがとう!!",
    ],
    comeback: [
      "この曲準備するのめちゃくちゃ頑張った!! 聴いてくれてありがとう",
      "新しい曲好きって言ってくれて嬉しい~ 引き続き応援よろしくね 😊",
    ],
    food: ["これ美味しそう! 一緒に食べに行こー~~", "ご飯は一人より一緒に食べた方がおいしいよね ㅎ"],
    japan: ["日本のみんな～！！また来たよ！会えて嬉しい！！", "日本の公演はいつもドキドキする!! ファンのみなさんに会えるのが最高!!"],
    default: ["応援ありがとう！！いつも感謝してるよ~", "頑張るね!! 期待しててね 😊", "この仕事してて、こんなにたくさんの人に応援してもらえることが一番ありがたい!! 今日も全力を尽くすね!!"],
  },
  nana: {
    concert: [
      "やばい！！！楽しみすぎる！！！ステージめちゃくちゃ期待してて!!!",
      "期待感でステージで転びそう ㅋㅋㅋ",
      "今日最高のエンターテイナーになります！！！",
    ],
    comeback: [
      "これ本当に好き!!! 聴けば聴くほど耳から離れない!!!",
      "新曲!!!! やったー！！！！待ってた!!!",
    ],
    food: [
      "美味しそう~~ お腹すいた ㅋㅋ 今すぐ食べたい!!",
      "これ食べながらバラエティ撮ったらめちゃくちゃ面白そう!!",
    ],
    japan: ["日本ただいまー！！！みんな元気だった？！！！", "日本のファンのみなさんに会えて嬉しい!!! 笑顔全開です！！！"],
    cute: ["かわいい!!! 私もかわいいよね?? かわいいって言って!!!! ㅋㅋ"],
    default: ["ノリノリで行くよー！！みんなで盛り上がろう!!", "すごい！！！最高!!! 期待してて!!", "みんなー！！楽しみすぎてやばいです！！！今回本当に最高のステージ見せるから!! 笑顔で見てね！！！"],
  },
  taiyo: {
    concert: [
      "いいステージを期待してください。全力で臨みます",
      "このエネルギー好きだよ。自分も負けないつもり",
    ],
    comeback: [
      "この曲、音楽的によくできてると思う。いい仕上がりだよ",
      "新しい曲か。聴いてみたよ、良かった",
    ],
    food: ["美味しそうだな。今度食べてみようかな", "食べ動画は見てる人を必ずお腹すかせるよね ㅋ"],
    japan: ["日本か。また来れてよかった", "日本のステージは何か違う。いい意味でね"],
    default: ["うまくいきそう。期待してて", "しっかり準備しました", "この仕事長くやってて思うのは、準備する過程が一番大事だってこと。その過程は頑張ったから、結果には自信あるよ"],
  },
  yoshiaki: {
    photo: [
      "このビジュアル、ほんとファッションセンスある!! コーデどこでしたの??",
      "写真めちゃくちゃいい。スタイリング褒めます",
      "この服どこの?? 自分も着てみたい",
    ],
    concert: [
      "今回のスタイリング、めちゃくちゃ楽しみです。ファッションもパフォーマンスだから!!",
      "ステージファッション自分で提案したよ。期待してて~",
    ],
    comeback: [
      "MVの衣装めちゃくちゃ気に入った!! トレンド感認める!!",
      "このビジュアル…誰がスタイリングしたの?? よかったよ",
    ],
    cute: ["ファッションセンスあるともっとかわいく見えるよ~ これもスタイルだよね ㅎ"],
    default: ["スタイルで魅せますよ！ビジュアルもパフォーマンスです~", "ファッションこそアイデンティティ!! 期待してて", "Z世代ファッションアイコンとして今回はビジュアル担当ちゃんとやります。スタイリングにも直接たくさん関わったよ!! 見てね~"],
  },
  michi: {
    photo: [
      "このビジュアルめちゃくちゃいい。スタイルある",
      "この雰囲気…私の好きなスタイルだわ",
    ],
    concert: [
      "IT GIRL登場します。期待してて~",
      "ステージの上で一番輝く人になります",
    ],
    comeback: [
      "この曲トレンディ。私のセンスにぴったり",
      "MVのビジュアル完全に私のスタイルだわ",
    ],
    cute: ["かわいいのは好き。トレンディにかわいく ㅎ"],
    japan: ["日本！また来たよ！スタイリッシュに日本も制覇！", "日本のファンのみなさんに会いに来たよ~"],
    default: ["それがミチスタイル！期待してて", "トレンドセッターとして今回何か見せるよ", "IT GIRLって言葉プレッシャーもあるけど、自分らしくやればいいと思ってる。今回もミチらしくやります。期待してて~"],
  },
};

// ── 대화 스레드 (chemistry pairs) ──────────────────────────────
interface Thread {
  ctx: Ctx;
  comments: { memberId: string; content: string }[];
  replyChain: { memberId: string; content: string }[];
}

const THREADS: Thread[] = [
  // MIZYU リーダーシップ
  { ctx: 'concert', comments: [{ memberId: 'mizyu', content: 'リーダーとして今回のステージ、本当に責任感あるよ。みんな信じてて!!' }],
    replyChain: [
      { memberId: 'rin', content: 'MIZYUのこと信じてる。みんな頑張ろ' },
      { memberId: 'suzuka', content: 'リーダー頼んだで！！MIZYU ファイティン!!' },
      { memberId: 'kanon', content: 'MIZYUさん最高!! 一緒に頑張ろ!!' },
    ],
  },
  // RIN 料理+ラップ
  { ctx: 'food', comments: [{ memberId: 'rin', content: 'これ私が作れるよ。家でもっとおいしく作れるから' }],
    replyChain: [
      { memberId: 'suzuka', content: 'ほんまに？？ 作って!! 食べたい!!' },
      { memberId: 'rin', content: 'お好み焼きには勝てなそうだけど ㅋㅋ' },
      { memberId: 'suzuka', content: 'お好み焼きは私のもんやで!! ㅋㅋ' },
    ],
  },
  // SUZUKA お好み焼き
  { ctx: 'japan', comments: [{ memberId: 'suzuka', content: '大阪帰ってきた！！お好み焼き食べに行かなあかん~!!' }],
    replyChain: [
      { memberId: 'nana', content: 'スズカちゃんお好み焼きのことしか考えてないの?? ㅋㅋ 私も食べたい!!' },
      { memberId: 'suzuka', content: 'ほんまに最高やねん！！お好み焼きなしじゃ日本ツアーできへんわ ㅋ' },
      { memberId: 'mizyu', content: 'スズカ…ステージのことも考えてよ ㅋㅋ' },
    ],
  },
  // KANON アニメ比較
  { ctx: 'comeback', comments: [{ memberId: 'kanon', content: 'この曲、なんかアニメのオープニングに似た感じがする!! 本当に好き!!' }],
    replyChain: [
      { memberId: 'mizyu', content: 'かのん…どのアニメ?? ㅋㅋ' },
      { memberId: 'kanon', content: '秘密ですよ ㅎ わかる人にはわかるやつ!' },
      { memberId: 'nana', content: '私わかる気がする!! 私もそう思ってた!!' },
    ],
  },
  // NAKO 経験談
  { ctx: 'concert', comments: [{ memberId: 'nako', content: 'ステージの上でファンのみなさんの表情見るのが一番好き。だからこの仕事してる気がする 😊' }],
    replyChain: [
      { memberId: 'nana', content: '奈子ちゃん!! その言葉に私もじんときた!!' },
      { memberId: 'nako', content: '奈々~ ㅋㅋ 一緒に頑張ろ!! 😊' },
      { memberId: 'taiyo', content: 'かっこいい言葉だよ。俺もそう思う' },
    ],
  },
  // NANA バラエティエネルギー
  { ctx: 'food', comments: [{ memberId: 'nana', content: '食べ歩きバラエティやりたい!! この食べ物食べながらゲームしたら絶対面白い!!' }],
    replyChain: [
      { memberId: 'taiyo', content: '奈々また企画してる?? ㅋㅋ' },
      { memberId: 'nana', content: '企画力あるんだって!! どうですか面白そうでしょ?!!' },
      { memberId: 'yoshiaki', content: '私も参加したい!! スタイリッシュに食レポします~' },
    ],
  },
  // TAIYO+MICHI クールコンビ
  { ctx: 'comeback', comments: [{ memberId: 'taiyo', content: 'この曲、音楽的によくできてると思う。聴けば聴くほど好きになるタイプだよ' }],
    replyChain: [
      { memberId: 'michi', content: '太陽さんもそう思った? 私も最初はわかんなかったけど繰り返すほど好きになってきた' },
      { memberId: 'nana', content: 'お二人やっぱクールに言うよね!! 私は最初から好きだったよ!!!' },
    ],
  },
  // YOSHIAKI+MICHI ファッショントーク
  { ctx: 'photo', comments: [{ memberId: 'yoshiaki', content: 'この写真のスタイリング、めちゃくちゃいいんだけど。どこの??' }],
    replyChain: [
      { memberId: 'michi', content: 'よしあきまたファッションの話 ㅋㅋ でも私も気になるわ ㅎ' },
      { memberId: 'yoshiaki', content: '姉さんも気になってるじゃないですか ㅋㅋ' },
      { memberId: 'kanon', content: 'このコーデ私の好きなアニメキャラのスタイルだ!!' },
    ],
  },
  // AG! 日本ツアー
  { ctx: 'japan', comments: [{ memberId: 'mizyu', content: '日本ツアー最高！！みんなに会えて嬉しい！！本当にエネルギーもらえた!!' }],
    replyChain: [
      { memberId: 'rin', content: 'さすが日本のファンのみなさん、熱量が違うな。よかった' },
      { memberId: 'suzuka', content: 'ほんまやで！！お好み焼きも食べられたし完璧やった!!' },
      { memberId: 'kanon', content: '日本最高！！！また来たい!!!!!' },
    ],
  },
  // RIN ダンスバトル
  { ctx: 'dance', comments: [{ memberId: 'rin', content: 'この振り付けヒップホップベースあるから私が一番早く覚えたよ。本当の話' }],
    replyChain: [
      { memberId: 'mizyu', content: 'RIN…私も早かったんだけど ㅋㅋ' },
      { memberId: 'rin', content: 'MIZYUリーダーだから早いのは当然でしょ ㅋㅋ' },
      { memberId: 'kanon', content: '私はクラシックベースだからクラシックの動きは私が一番早いんだよ!! ㅎ' },
    ],
  },
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
  if (!pool) return '楽しみです！';
  const ctxEntries = [...(pool[ctx] || []), ...(pool.default || [])];
  if (ctxEntries.length === 0) return '楽しみです！';

  const shortOnes = ctxEntries.filter(c => c.length < 25);
  const mediumOnes = ctxEntries.filter(c => c.length >= 25 && c.length < 70);
  const longOnes = ctxEntries.filter(c => c.length >= 70);

  let candidates: string[];
  if (length === 'short') candidates = shortOnes.length > 0 ? shortOnes : ctxEntries;
  else if (length === 'medium') candidates = mediumOnes.length > 0 ? mediumOnes : ctxEntries;
  else candidates = longOnes.length > 0 ? longOnes : ctxEntries;

  return candidates[Math.abs(seed) % candidates.length] || ctxEntries[0] || '楽しみです！';
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
    const replies: Reply[] = thread.replyChain.filter(r => r.memberId !== mainMsg.memberId).map(r => ({
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
        content: '応援してるよ!! ファイティン!! 😊',
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

  return comments;
}

// ── 시간 표시 ────────────────────────────────────────────────
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
              <img src={`/idols/${l.memberId}/profile.jpg?v=2`} alt={lm?.name || ''} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
          );
        })}
      </div>
      <span className="text-[11px] text-gray-400">
        {likes.slice(0, 3).map(l => ALL_MEMBERS[l.memberId]?.name || l.memberId).join(', ')}
        {likes.length > 3 ? ` and ${likes.length - 3} more` : ''}
      </span>
    </div>
  );
}

// ── Reply 렌더 ───────────────────────────────────────────────
function ReplyBubble({ r }: { r: Reply }) {
  const m = ALL_MEMBERS[r.memberId];
  const name = m?.name || r.memberId;
  const sNum = S_NUMBERS[r.memberId] || '';
  const avatarSrc = `/idols/${r.memberId}/profile.jpg?v=2`;

  return (
    <div className="flex items-start gap-2 ml-10 mt-2">
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-100" style={{ background: m?.color || '#ddd' }}>
        <img src={avatarSrc} alt={name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="font-bold text-[12px] text-gray-900">{name}</span>
            {sNum ? (
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
    youtube: '🎬 View on YouTube →',
    twitter: '𝕏 View on Twitter →',
    instagram: '📷 View on Instagram →',
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
            ATARASHII GAKKO! official reposted
            {post.rtAuthorName && (
              <span className="text-gray-400"> · <span className="font-semibold text-gray-600">{post.rtAuthorName}</span> OP</span>
            )}
          </span>
        </div>
      )}
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-200"
          style={{ background: ALL_MEMBERS[post.posterId]?.color || '#ddd' }}>
          <img src={post.source === 'twitter' && post.authorAvatarUrl ? `/api/proxy-image?url=${encodeURIComponent(post.authorAvatarUrl)}` : `/idols/${post.posterId}/profile.jpg?v=2`} alt={ALL_MEMBERS[post.posterId]?.name || post.posterId}
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
        <span className="text-[12px] text-gray-400">{post.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)} comments</span>
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
          {liked ? '❤️' : '🤍'} Like
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          💬 Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          ↗ Share
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
                    src={`/idols/${c.memberId}/profile.jpg?v=2`}
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
            {expanded ? 'Collapse' : `${post.comments.length - 2} more comments`}
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
    { id: 'mizyu',    name: 'MIZYU',    group: 'AG!' },
    { id: 'rin',      name: 'RIN',      group: 'AG!' },
    { id: 'suzuka',   name: 'SUZUKA',   group: 'AG!' },
    { id: 'kanon',    name: 'KANON',    group: 'AG!' },
    { id: 'nako',     name: '奈子',     group: '' },
    { id: 'nana',     name: '奈々',     group: '' },
    { id: 'taiyo',    name: '太陽',     group: '' },
    { id: 'yoshiaki', name: 'よしあき', group: '' },
    { id: 'michi',    name: 'ミチ',     group: '' },
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
        className="px-4 pt-4 pb-3 border-b border-gray-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#f8f9fa' }}
      >
          <h1 className="text-sm font-normal text-gray-900 shrink-0">OFFICIAL FEED 🌐</h1>
        <div className="flex items-center gap-2 shrink-0">
          {/* 출처 드랍다운 */}
          <div ref={sourceDropdownRef} className="relative">
            <button
              onClick={() => setSourceDropdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-normal text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
            >
              {sourceFilter === 'all' ? 'SOURCE' : sourceFilter === 'youtube' ? 'YouTube' : sourceFilter === 'twitter' ? '𝕏' : 'Instagram'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: sourceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {sourceDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-2" style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', minWidth: '130px' }}>
                {([['all', 'ALL'], ['youtube', 'YouTube'], ['twitter', '𝕏'], ['instagram', 'Instagram']] as [FeedSourceFilter, string][]).map(([val, label]) => (
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
                ? (memberOptions.find((m) => m.id === filterMember)?.name ?? 'ALL')
                : 'ALL'}
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
                  ✓ ALL
                </button>
                <div className="grid grid-cols-3 gap-1">
                  {memberOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setFilterMember(m.id); setDropdownOpen(false); }}
                      className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-colors ${filterMember === m.id ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-violet-50'}`}
                    >
                      <span className="text-[10px] text-gray-400 leading-none mb-0.5">{m.group || '\u00a0'}</span>
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
