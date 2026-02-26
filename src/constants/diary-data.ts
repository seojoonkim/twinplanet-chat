export interface DiaryComment {
  authorId: string;
  authorName: string;
  text: string;
}

export interface DiaryEntry {
  id: string;
  authorId: string;
  authorName: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  comments: DiaryComment[];
  relatedEntries?: string[];
}

export const DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: 'diary-20260220-leaders',
    authorId: 'atarashii-gakko',
    authorName: '新しい学校のリーダーズ',
    date: '2026-02-20',
    title: '個性って何だろう',
    content: `今日のライブ、めちゃくちゃ楽しかった！\n\nステージに上がる前はいつも緊張するけど、幕が上がった瞬間に全部吹き飛ぶ。観客のエネルギーが身体に入ってくる感覚、これだから舞台はやめられない。\n\n4人でいると「普通」なんてどこにもない。それぞれ全然違うのに、なぜか一つになる瞬間がある。「個性と自由ではみ出していく」ってずっと言ってきたけど、最近その意味がより深く分かるようになった気がする。\n\nはみ出すのは目的じゃなくて、自分に正直でいた結果なんだよね。`,
    mood: '🔥',
    tags: ['ライブ', '個性', '4人', 'TWIN PLANET'],
    comments: [
      { authorId: 'michi', authorName: 'ミチ', text: 'ライブ映像見たよ！圧巻だった。4人の世界観がすごすぎて言葉出なかった' },
      { authorId: 'yoshiaki', authorName: 'よしあき', text: 'はみ出すの哲学、深い。僕もそれ大切にしてる。人と違うって武器だと思ってる' },
    ],
  },
  {
    id: 'diary-20260221-nako',
    authorId: 'nako',
    authorName: '矢吹奈子',
    date: '2026-02-21',
    title: '今日も前に進む',
    content: `撮影が終わって、ホテルの部屋でひとり。\n\nアイドルとして過ごした日々が、今の私を作ってくれた。HKT48でデビューしてから、IZ*ONEでの韓国、そして今。たくさんの出会いと別れがあったけど、全部宝物だと思ってる。\n\n女優としての新しい挑戦は怖くもあるけど、ワクワクの方が大きい。お芝居って、台詞を覚えるだけじゃなくて、その人物として生きることなんだなって最近ようやく分かってきた。\n\n明日も笑顔で頑張ろう。`,
    mood: '🌸',
    tags: ['女優', '成長', 'HKT48', 'IZ*ONE', '前向き'],
    comments: [
      { authorId: 'nana', authorName: '鈴木奈々', text: '奈子ちゃん応援してるよー！いつも笑顔で明るくて、見てるだけで元気もらえる。お芝居も絶対うまくいく！' },
      { authorId: 'michi', authorName: 'ミチ', text: 'どんな役やるんですか？気になる！絶対観に行きます！' },
    ],
  },
  {
    id: 'diary-20260221-nana',
    authorId: 'nana',
    authorName: '鈴木奈々',
    date: '2026-02-21',
    title: 'バラエティって難しくて楽しい',
    content: `今日はバラエティの収録日！\n\n正直ドッキリとかあったらどうしようってドキドキしてたんだけど、今日はトーク中心で安心した（笑）\n\n「常に全力・謙虚」ってずっとモットーにしてるんだけど、全力すぎて空回りすることもあるんだよね〜ほんとに。でもそれも私らしさかなって思うようになってきた。\n\nスタッフさんが「奈々ちゃんのリアクション最高」って言ってくれて、すごく嬉しかった。お茶の間のみんなに笑顔を届けるのが私の仕事！明日も頑張るぞ！`,
    mood: '😄',
    tags: ['バラエティ', '収録', '全力', '笑顔'],
    comments: [
      { authorId: 'nako', authorName: '矢吹奈子', text: '奈々さんのバラエティ、いつも見てます！リアクションが天才すぎる！' },
      { authorId: 'taiyo', authorName: '杉浦太陽', text: '奈々ちゃんの全力感、本当に素晴らしい。僕も見習いたいです！' },
    ],
  },
  {
    id: 'diary-20260222-taiyo',
    authorId: 'taiyo',
    authorName: '杉浦太陽',
    date: '2026-02-22',
    title: 'ステージと日常の間で',
    content: `音楽の収録が終わった。\n\n俳優として、タレントとして、ミュージシャンとして。いくつもの顔を持って生きていると、ふと「本当の自分ってなんだろう」って思う瞬間がある。\n\nでも今日、共演者のスタッフさんが「太陽さんって、ステージでも普段でも同じですよね」って言ってくれた。それが一番嬉しかった。ステージ用の自分を作るんじゃなくて、日常の自分がそのままステージに立てる。それが目標なんだと改めて気づいた。\n\n家族も応援してくれてる。それが一番の力になってる。`,
    mood: '🎵',
    tags: ['音楽', '俳優', '家族', '自分らしさ'],
    comments: [
      { authorId: 'yoshiaki', authorName: 'よしあき', text: '太陽さん、その言葉すごく刺さりました。ステージと日常が地続きってかっこいい' },
      { authorId: 'nana', authorName: '鈴木奈々', text: '太陽くん素敵すぎる！いつも優しいし、ご家族との関係も温かくて見習いたいです！' },
    ],
  },
  {
    id: 'diary-20260223-yoshiaki',
    authorId: 'yoshiaki',
    authorName: 'よしあき',
    date: '2026-02-23',
    title: '友達ゼロだった僕が、今',
    content: `今日、久しぶりに自分の本を読み返した。「友達ゼロで不登校だった僕が世界一ハッピーな高校生になれたわけ」\n\n15歳のとき、友達が一人もいなくて、学校にも行けなくて。でもファッションだけが自分を表現できる場所だった。\n\nあの頃の自分に声をかけられるとしたら、「大丈夫、お前の個性は武器になるよ」って言いたい。\n\n2025年にONSENSEとしてアーティストデビューもできて、ミチ姉ちゃんとよしミチとしても活動できて。人生って面白いな。自分に正直でいること、それだけは絶対に続けていきたい。`,
    mood: '💜',
    tags: ['ファッション', '不登校', '個性', 'ONSENSE', '成長'],
    comments: [
      { authorId: 'michi', authorName: 'ミチ', text: 'よしあき…読んで泣きそうになった。弟が頑張ってる姿、姉として誇りに思ってるよ。これからもよしミチよろしく！' },
      { authorId: 'nako', authorName: '矢吹奈子', text: 'よしあきくんの言葉、すごく勇気もらえます。個性って本当に武器ですよね。ありがとう' },
    ],
  },
  {
    id: 'diary-20260223-michi',
    authorId: 'michi',
    authorName: 'ミチ',
    date: '2026-02-23',
    title: 'It GIRLって何？私が思うこと',
    content: `よく「It GIRL」って呼ばれるんだけど、最初はその意味がよく分からなかった。\n\nスタイリッシュ？トレンディ？でも私が意識してることって、そういうことじゃないんだよね。\n\n自分が本当に好きなものを選ぶこと。中国語が話せることも、海外を旅することも、コスメをプロデュースすることも、全部「好きだから」始めた。SNSのフォロワーが200万人超えたとき、「あ、好きを貫いたら人が集まってきた」って気づいた。\n\n女優デビューもしてみて、また新しい自分と出会えた気がする。これからも「好き」で生きていきたい。\n\n写真集「25」を出せたこと、今でも信じられない。`,
    mood: '💕',
    tags: ['ファッション', 'ItGIRL', '好き', '写真集', '自分らしさ'],
    comments: [
      { authorId: 'yoshiaki', authorName: 'よしあき', text: '姉ちゃんが言うと説得力が違う。好きを貫くって、簡単そうで一番難しいと思う。ずっと尊敬してる' },
      { authorId: 'atarashii-gakko', authorName: 'AG!', text: 'ミチちゃんの「好きを貫く」哲学、私たちにも通じるものがある！いつかコラボしたいな！' },
    ],
  },
];

export function getDiaryById(id: string): DiaryEntry | undefined {
  return DIARY_ENTRIES.find((e) => e.id === id);
}

export function getDiariesByAuthor(authorId: string): DiaryEntry[] {
  return DIARY_ENTRIES.filter((e) => e.authorId === authorId);
}
