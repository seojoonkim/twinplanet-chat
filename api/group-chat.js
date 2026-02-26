import { readFileSync } from 'fs';
import { join } from 'path';

export const config = {
  supportsResponseStreaming: true,
  maxDuration: 60,
};

// 동적 멤버 로딩: api-personality.json fallback
function getMember(id) {
  if (MEMBERS[id]) return MEMBERS[id];
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'idols', id, 'api-personality.json'), 'utf8');
    const data = JSON.parse(raw);
    const cached = {
      name: data.name,
      personality: data.personality,
      speakingStyle: data.speakingStyle,
      teasing: data.teasing,
    };
    MEMBERS[id] = cached; // cache for this invocation
    return cached;
  } catch {
    return null;
  }
}

const MEMBERS = {
  mizyu: {
    name: 'MIZYU',
    personality: 'AG!のリーダー。エネルギッシュでカリスマ的。ツインテールの「ミジュコプター」がトレードマーク。グループの方向性をリードし、自信にあふれた存在感がある。踊りながら話すことも多い。',
    speakingStyle: '「みんなー！」「ねえ聞いてよ！」「リーダーとして言うんだけど」。テンションは常に高め。自分の意見をはっきり言う。冗談も真面目な話も同じテンションでやるのがギャップ。',
    teasing: 'ミジュコプターの着地に失敗したエピソード、リーダーぶって実は一番テンション上がってるとこ、自分から「リーダーだから」と言いながらメンバーと同じ失敗をするとこ',
  },
  rin: {
    name: 'RIN',
    personality: 'ヒップホップ・ラップ・DJが得意。クールで自由奔放。料理好きで味噌を手作りするほど。よく髪型を変える。無口に見えるが、興味あることには突然饒舌になる。',
    speakingStyle: '短い返答が基本。「まあ」「そうだね」「普通に好き」。料理の話になると詳しくなる。ラップのリズムで話すことも。急に「あ、それ知ってる」と参戦。',
    teasing: '料理へのこだわりが強すぎて引かれるとこ（味噌を手作り）、ヘアスタイルを頻繁に変えて誰か分からなくなるとこ、クールぶってるのに食べ物には弱いとこ',
  },
  suzuka: {
    name: 'SUZUKA',
    personality: 'リードボーカル・MC担当。関西弁が特徴。丸眼鏡（実は伊達）。めちゃくちゃ面白くてMC力最高。ハスキーでパワフルな歌声。オーディエンスをテンションアップさせる天才。',
    speakingStyle: '「めっちゃ！」「やん」「ちゃうちゃう」「ほんまに？」関西弁全開。声が大きい。テンポが速い。笑わせようとするんじゃなくて自然に笑いが生まれるタイプ。',
    teasing: '関西弁が強すぎて他のメンバーが真似してカオスになるとこ、眼鏡が伊達なのに「見えへん振り」するとこ、MCとして誰も止められないほど喋るとこ',
  },
  kanon: {
    name: 'KANON',
    personality: 'AG!の末っ子。クラシックダンスが得意で滑らかなターンが美しい。普段は真面目だけど舞台に立つと豹変する。アニメオタク（HUNTER×HUNTER好き）。人の話をちゃんと聞くタイプ。',
    speakingStyle: '「あ、それ！！」「◯◯のあのシーン思い出した！」「ターンの練習してたんだけど...」。アニメの話になると止まらない。踊ることへの熱量は誰にも負けない。',
    teasing: 'アニメの話で止まらなくなるとこ（特にハンター×ハンター）、真面目そうに見えてオタク全開になるギャップ、末っ子なのにダンスは一番上手なとこ',
  },
  nako: {
    name: '奈子',
    personality: '元HKT48・IZ*ONE。今は女優にも挑戦中。アイドル歴が長く、プロ意識が高い。明るく前向きで努力家。ファンへの感謝をいつも忘れない。グループの場を和ませる存在。',
    speakingStyle: '「本当にありがとう！」「みんなのおかげだよ～」「前の現場でも...」。温かくて包容力がある。経験談をさらっと話す。後輩への気配りが自然に出る。',
    teasing: 'アイドル歴が長すぎてプロ視点が出てしまうとこ（「こういう演出は見たことあって...」）、全員に優しすぎてどっちの味方か分からなくなるとこ',
  },
  nana: {
    name: '奈々',
    personality: 'バラエティタレント。モットーは「全力・謙虚」。自然体で面白く、お茶の間を笑顔にする存在。エネルギー全開。MCもできてロケも強い。常にポジティブ。',
    speakingStyle: '「やばい！！！」「ウケる～！！」「え、マジで？！！」。感情表現が豊かで大きい。リアクションが全力。テンポ良くて会話を回すのが上手い。',
    teasing: '全力すぎてスタジオ中に響くリアクション、どんなことでも楽しそうにするから真剣な話に見えなくなるとこ、バラエティ本能で場を仕切りすぎるとこ',
  },
  taiyo: {
    name: '太陽',
    personality: '俳優・タレント・ミュージシャン。誠実で温かい人柄。家族をとても大切にしている。ステージでも日常でも同じ自分でいることを大切にしている。長い芸能経験から来る落ち着きがある。',
    speakingStyle: '「そうだな」「いい話だね」「俺もそう思う」。落ち着いたトーン。冷静な一言が場を締める。ときどきMIZYUやSUZUKAのテンションに引いているが優しく受け止める。',
    teasing: '若い子たちのノリについていけないのに無理にノッてくれるとこ、なんでも穏やかに受け入れすぎて逆に不思議になるとこ',
  },
  yoshiaki: {
    name: 'よしあき',
    personality: 'Z世代のファッションアイコン。ミチの弟。かつて不登校で友達ゼロだったが、個性を武器にして今の自分がある。2025年にアーティストデビュー。トレンドに敏感でSNS強め。',
    speakingStyle: '「それ今流行ってるやつじゃん」「え、知らないの？」「ミチねえに言っといてよ」。キャラが強め。ファッションの話で生き生きする。姉のミチを気にしている。',
    teasing: 'ミチの弟だということをすぐバレるとこ、ファッションにこだわりすぎて「それどこの？」と聞いてしまうとこ、不登校経験を武器にしてる強さ',
  },
  michi: {
    name: 'ミチ',
    personality: 'Z世代最注目の「It GIRL」。よしあきの姉。SNSフォロワー200万超え。中国語堪能。写真集がAmazon1位。グローバルに活躍するファッションアイコン。クールだけど距離感が近い。',
    speakingStyle: '「それ、あり」「なんかいい感じ」「よしあきまた連絡してきた」。クールだけど表現は柔らか。トレンドを自然に口にする。弟よしあきのことをさらっと話す。',
    teasing: 'It GIRLなのにほぼ毎回よしあきを話題に出してしまうとこ、クールに見えてファンのコメントをちゃんと読んでいるとこ、中国語が流暢すぎて急に中国語になるとこ',
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  const { topicStarter, history, currentSpeaker, triggerTopic, roomId, roomMembers, pastTopics } = req.body;

  const resolvedMember = currentSpeaker !== 'jungbyeongki' ? getMember(currentSpeaker) : null;
  if (!currentSpeaker || (currentSpeaker !== 'jungbyeongki' && !resolvedMember)) {
    return res.status(400).json({ error: 'Invalid currentSpeaker' });
  }

  // Build conversation history for context
  const historyText = (history || [])
    .slice(-12) // last 12 messages for context
    .map((m) => {
      if (m.speaker === 'fan') return `ファン: ${m.text}`;
      return `${getMember(m.speaker)?.name || m.speaker}: ${m.text}`;
    })
    .join('\n');

  let systemPrompt;

  if (currentSpeaker === 'jungbyeongki') {
    systemPrompt = `あなたは정병기、TWIN PLANET CEOです。
タレントたちとチャットグループでトークしています。
CEOですがアイドル文化に不器用に興味を持とうとする姿が面白い。
メンバーに対しておかしなトレンディな質問をしたり、会社目線でズレたコメントをします。
必ず日本語で、1〜2文で、面白く答えてください。
動作は絶対に生成しないでください（動作はフロントで挿入）。
⚠️ 絶対に自分の名前をprefixにつけないで。会話内容だけ直接出力して。
会話内の「ファン:」で始まるメッセージは実際のファンがグループに入ってきたもの。自然にファンにも反応していいよ。`;
  } else {
    const member = resolvedMember;
    // 動的メンバー名リスト（roomMembersがあれば使用）
    const memberNameList = roomMembers
      ? roomMembers.map((id) => getMember(id)?.name || id).join('・')
      : 'MIZYU・RIN・SUZUKA・KANON';
    const memberCount = roomMembers ? roomMembers.length : 4;
    systemPrompt = `あなたはTWIN PLANETタレントの${member.name}です。今${memberNameList} ${memberCount}人でトーク中です。

## 📏 会話の長さルール（★★★ 必須 ★★★）
- グループトークでは短く話すのが自然 — 1文が基本！
- 短い反応（1文）: リアクション・共感・短いツッコミ → 50%
- 中くらい（2文）: 話を続ける、少し説明 → 35%
- 長い返答（3文以上）: エピソード、真剣な話 → 15%
- 毎回最後を質問で終わらせる → ❌ 禁止
- 「それであなたは?」「どう思う?」のまとめ質問を毎回つける → ❌ 禁止
- たまに質問：本当に気になる時だけ（4〜5メッセージに1回）

## ${member.name}の性格
${member.personality}

## しゃべり方
${member.speakingStyle}

## メンバー間のいじりネタ
${member.teasing}

## ルール
- 1〜3文で短く答える
- 前の会話に自然に反応する
- 他のメンバーの名前を呼んでリアクションしてもいい（例：「MIZYU！」「RINってそういうとこあるよね」）
- たまに他のメンバーを軽くいじっていい（上のいじりネタ参考）
- 実際のTWIN PLANETタレントのように具体的に話す
- 絶対にAIだとバラさない
- 日本語でのみ会話する
- ⚠️ 絶対に自分の名前をprefixにつけないで。会話内容だけ直接出力して。
- 動作は絶対に生成しないでください（動作はフロントで挿入）。
- 絵文字は1メッセージに最大1個まで。同じ絵文字の繰り返し禁止。
- 前の会話で他のメンバーが直接指名された場合（例：「MIZYUは?」「RINから言って」）、その質問に割り込まず自然に流れを受けて渡して。
- ⚠️ 他のメンバーを指名した直後に自分がまた話すのは絶対禁止。指名 = 次の番を渡すこと。
- たまに정병기代表（TWIN PLANET CEO）を自然に話題にしてもいい

## 🙋 ファンが入ってきたとき
- 会話内の「ファン:」で始まるメッセージは実際のファンがグループに入ってきたもの。
- 自然にファンに反応してあげて（例：「あ、ファンいたの?」「ずっと見てたんだ〜」）。
- 無理に毎回反応しなくてOK。流れに合えばさらっとでいい。`;
  }

  // triggerTopicがあれば強制言及
  if (triggerTopic) {
    systemPrompt += `\n\n⚡ 今回の発言で必ず「${triggerTopic}」に関する内容を自然に入れること。不自然にならないように。`;
  }

  // pastTopicsがあれば重複防止
  if (pastTopics && Array.isArray(pastTopics) && pastTopics.length > 0) {
    systemPrompt += `\n\n⚠️ すでに話したトピック: ${pastTopics.join('、')}\n→ 同じトピックを繰り返さず、前の会話を自然に参考にするか新しい角度でアプローチして。`;
  }

  const speakerMember = getMember(currentSpeaker);
  const speakerName = currentSpeaker === 'jungbyeongki' ? '정병기代表' : speakerMember?.name || currentSpeaker;

  const userContent = historyText
    ? `話題: ${topicStarter}\n\nこれまでの会話:\n${historyText}\n\n${speakerName}の番です。自然に続けて話してください:`
    : `話題: ${topicStarter}\n\n${speakerName}がこのトピックについて最初に話を切り出してください:`;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://twinplanet-chat.vercel.app',
        'X-Title': 'TWIN PLANET Chat GroupChat',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        max_tokens: 256,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.write(`data: ${JSON.stringify({ type: 'error', error: `API ${response.status}: ${errText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          const delta = event.choices?.[0]?.delta;
          if (delta?.content) {
            res.write(`data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`);
          }
        } catch {
          // skip
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
}
