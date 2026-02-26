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
  imagePath?: string;
  svgDrawing?: string;
  themeLineColor?: string;
  secretNote?: string;
}

export const DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: 'diary-20260220-mizyu',
    authorId: 'mizyu',
    authorName: 'MIZYU',
    date: '2026-02-20',
    title: 'リーダーとして思うこと',
    content: `今日のライブ、最高だった！！\n\nステージに立つ瞬間、いつもと体が変わる感覚がある。ミジュコプターを決めた瞬間の歓声、あれがたまらない。\n\n小さい頃、きゃりーぱみゅぱみゅさんのバックダンサーをやってた私が今ここに立ってる。ちゃんみなとは保育園から一緒で、今でも一番の親友。彼女が頑張ってる姿を見ると私も頑張れる。\n\nリーダーって難しいけど、RIN、SUZUKA、KANON の3人がいるから大丈夫。4人で作る空間は特別。これからも「はみ出して」いこう！`,
    mood: '🔥',
    tags: ['ライブ', 'リーダー', 'AG!', 'ミジュコプター'],
    comments: [
      { authorId: 'kanon', authorName: 'KANON', text: 'MIZYUのミジュコプター、今日も鳥肌でした！リーダーとして引っ張ってくれてありがとう' },
      { authorId: 'michi', authorName: 'ミチ', text: 'ライブ映像見たよ！MIZYUのオーラすごすぎて目が離せなかった！' },
    ],
  },
  {
    id: 'diary-20260220-rin',
    authorId: 'rin',
    authorName: 'RIN',
    date: '2026-02-20',
    title: '味噌を仕込んだ日',
    content: `ライブの翌日は毎回キッチンに立ちたくなる。今日は味噌を仕込んだ。\n\n大豆を煮て、麹と塩を混ぜて、丸めて容器に詰める。単純な作業なんだけど、手を動かしながら昨日のステージのことを思い返す。\n\nDJセットで流した曲が反応よかった。ヒップホップって体で感じるものだから、観客の揺れを見てるとこっちも上がる。\n\n半年後に完成する味噌、絶対うまい。料理もラップも、時間かけた分だけ深みが出る。そういうもんよ。`,
    mood: '😌',
    tags: ['料理', '味噌', 'ヒップホップ', 'DJ'],
    comments: [
      { authorId: 'suzuka', authorName: 'SUZUKA', text: 'RINの手作り味噌、絶対食べさせてや！料理センスほんまに尊敬する〜' },
      { authorId: 'yoshiaki', authorName: 'よしあき', text: 'DJセット最高でした！いつかコラボしてほしいです' },
    ],
  },
  {
    id: 'diary-20260220-suzuka',
    authorId: 'suzuka',
    authorName: 'SUZUKA',
    date: '2026-02-20',
    title: 'ジャパネットSUZUKA、復活？！',
    content: `今日スタッフに「コロナのジャパネットSUZUKA覚えてますか」って言われて爆笑した笑\n\nあん時はほんまに暇やったから自分で謎のホームショッピング番組始めたんよ。眼鏡かけてんけど、私実は視力2.0で全然見えてるし！笑\n\n大阪出身やから漫才師憧れてたのは本当で、MCってある意味それに近い気がする。舞台の上で空気読んで、観客の反応見て、即興で返す。ライブのMCが一番楽しい時間やわ。\n\nエレカシのライブまた行きたいな。宮本さんの魂、ほんまにやばい。`,
    mood: '😂',
    tags: ['関西弁', 'MC', 'ジャパネット', 'エレカシ'],
    comments: [
      { authorId: 'mizyu', authorName: 'MIZYU', text: 'SUZUKAのMC、今日も神すぎた！場の空気を作れるのSUZUKAだけだと思う' },
      { authorId: 'nana', authorName: '鈴木奈々', text: 'ジャパネットSUZUKA見たかった笑！SUZUKAさんの関西弁大好きです！' },
    ],
  },
  {
    id: 'diary-20260220-kanon',
    authorId: 'kanon',
    authorName: 'KANON',
    date: '2026-02-20',
    title: 'ステージの上の私',
    content: `今日のライブが終わって、一人で静かに振り返っている。\n\n日常の私は、わりと静かだと思う。クラスで委員長だったし、あまり目立つタイプじゃない。でもステージに上がると何かが変わる。\n\nクラシックダンスで培った軸の強さが、今のパフォーマンスの土台になってる。あと脚力には自信がある。SUZUKAをかついでも余裕だし。\n\nHUNTER×HUNTERを兄弟に勧められて見始めたのが最近のハマりもの。ゴンの真っ直ぐさがなんか好き。ステージの上の私も、ああいう真っ直ぐさがあるといいな。`,
    mood: '💙',
    tags: ['ダンス', 'クラシック', 'アニメ', '内省'],
    comments: [
      { authorId: 'rin', authorName: 'RIN', text: 'KANONのターン、今日も完璧だった。あの軸のぶれなさ、本当にすごい' },
      { authorId: 'michi', authorName: 'ミチ', text: 'KANONちゃんの「静から動」への変換、毎回鳥肌もの。HxHもいいよね！' },
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
      { authorId: 'mizyu', authorName: 'MIZYU', text: 'ミチちゃんの「好きを貫く」哲学、AG!にも通じるものがある！いつかコラボしたいな！' },
    ],
  },
];

export function getDiaryById(id: string): DiaryEntry | undefined {
  return DIARY_ENTRIES.find((e) => e.id === id);
}

export function getDiariesByAuthor(authorId: string): DiaryEntry[] {
  return DIARY_ENTRIES.filter((e) => e.authorId === authorId);
}
