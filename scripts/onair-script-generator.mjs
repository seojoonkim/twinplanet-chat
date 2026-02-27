// scripts/onair-script-generator.mjs
// GitHub Actions 15분마다 실행
// LLM으로 15턴 배치 대화 생성 → 60초마다 1개씩 DB INSERT

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMBER_NAME = {
  mizyu: 'MIZYU',
  rin: 'RIN',
  suzuka: 'SUZUKA',
  kanon: 'KANON',
  nako: '矢吹奈子',
  nana: '鈴木奈々',
  taiyo: '杉浦太陽',
  yoshiaki: 'よしあき',
  michi: 'ミチ',
};

const MEMBER_PERSONA = {
  mizyu: 'AG!リーダー。ミジュコプターで魅せる。エネルギッシュで頼もしい。「みんな行くよ！」的リーダー気質。',
  rin: 'AG!メンバー。ヒップホップ&DJ担当。クールで自由奔放。料理も好き。たまにラップ調になる。',
  suzuka: 'AG!メンバー。大阪出身、関西弁。MCパワー全開。笑いとリアクション最強。「ほんまに！？」よく言う。',
  kanon: 'AG!末っ子。日常は静かで聡明。ステージでは全力。アニメオタク。「...でも、ステージ上では変わるんです」。',
  nako: '元HKT48/IZ*ONE。温かく前向き。「頑張ります！」よく言う。たまに韓国語が混じる。ファン大好き。',
  nana: '全力・謙虚がモットー。天然で面白い。「全力でやります！」「ありがとうございます！」元気いっぱい。',
  taiyo: '誠実で温かい。「家族が一番」よく言う。音楽と演技への深い愛情。落ち着いた話し方。',
  yoshiaki: 'Z世代ファッションアイコン。「個性って武器だと思う」。ミチ姉ちゃんへの愛。ONSENSEの話になると興奮。',
  michi: 'It GIRL。「好きを貫く」哲学。クールだけど親しみやすい。よしあき弟への愛。ファッション・コスメ話が好き。',
};

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// KST 시간대 컨텍스트
const kstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();
const TIME_CTX = kstHour >= 5  && kstHour < 9  ? '早朝。起きたばかりか朝の準備中。'
  : kstHour >= 9  && kstHour < 12 ? '午前。練習やスケジュール開始前/中。'
  : kstHour >= 12 && kstHour < 14 ? 'お昼。ご飯食べたか食べに行くところ。'
  : kstHour >= 14 && kstHour < 18 ? '午後。練習やスケジュール真っ只中。'
  : kstHour >= 18 && kstHour < 21 ? '夕方。1日の予定を終えて、夕食後か休憩中。'
  : kstHour >= 21                  ? '夜。1日が終わってちょっとチャットに寄った感じ。'
  : '深夜。眠れなかったり夜食食べてたり。';

// 1. 현재 활성 3명 조회
async function getActiveSessions() {
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=*`,
    { headers }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// 2. 최근 메시지 40개 조회
async function getRecentMessages(limit = 40) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=${limit}&select=content,author_name`,
    { headers }
  );
  const data = await res.json();
  return Array.isArray(data) ? data.reverse() : [];
}

// 2-b. 마지막 [TOPIC] 이후 멤버 메시지 수 카운트 (화제 전환 타이밍 판단용)
async function getMessageCountSinceLastTopic() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=120&select=author_name`,
    { headers }
  );
  const data = await res.json();
  if (!Array.isArray(data)) return 0;
  let count = 0;
  for (const msg of data) {
    if (msg.author_name === '[TOPIC]') break; // 마지막 토픽 이후 카운트 종료
    if (msg.author_name?.startsWith('[MEMBER:')) count++;
  }
  return count;
}

// 3. LLM으로 15턴 배치 대화 생성
async function generateScript(activeMembers, recentMessages, shouldChangeTopic = false) {
  const memberDescriptions = activeMembers.map(m => {
    const persona = MEMBER_PERSONA[m.member_id] || '';
    return `- ${m.member_name}(id:${m.member_id}): ${persona}`;
  }).join('\n');

  const authorIds = activeMembers.map(m => m.member_id);

  // 이전 대화를 구조화된 포맷으로 (최근 15개 = 맥락 파악용)
  const recentConvo = recentMessages.slice(-15).map(m => {
    const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
    if (!match) return null;
    return `${match[2]}: ${m.content}`;
  }).filter(Boolean).join('\n');

  // 마지막 발언자 파악 → 첫 턴에서 다른 사람이 말하게
  const lastMsg = recentMessages[recentMessages.length - 1];
  const lastAuthorMatch = lastMsg?.author_name?.match(/^\[MEMBER:(\w+)\]/);
  const lastAuthorId = lastAuthorMatch ? lastAuthorMatch[1] : null;
  const lastAuthorName = lastAuthorId ? MEMBER_NAME[lastAuthorId] : null;

  const systemPrompt = `あなたはTWIN PLANETタレントのラジオ番組台本ライターです。本物のバラエティラジオのように面白く自然な会話を書いてください。

🚨 絶対ルール（1つでも違反したら全体無効）:
1. 連続発話 ZERO TOLERANCE: 配列 index[N].author == index[N-1].author は絶対NG。
2. 最初の発言者: "${lastAuthorName || 'なし'}"(${lastAuthorId || '?'}) 以外の人。この人がindex[0]に来たら無効。
3. すべてのセリフ100% 日本語。外国語単語の挿入絶対禁止。
4. 必ず前の会話の内容を受けて続けること。唐突に新しい話を始めるのは禁止。

🎭 面白さ要素（必須 — なければクオリティ不足）:
- メンバーの名前を呼んでいじる: "え、[名前]それどういうこと？笑", "[名前]さんまたそれ言ってる〜"
- 大げさなリアクション: "えっ本当に！？", "もう信じられない〜", "笑いすぎてやばい"
- 受け継ぎ: "[名前]が言ったみたいに〜", "さっき[名前]が言ってたじゃないですか"
- リスナー巻き込み: "みなさんはどうですか？", "コメントで教えてください！"
- 押し引き: Aが言ったらBがツッコミ、Cが仲裁する流れ

🎙️ ラジオ話し方:
- 各メンバーの個性ある話し方を維持（ペルソナ参照）
- 1ターン2〜4文（短すぎると面白くない）
- 前の発言を直接引用: "さっきの[内容]の話ですけど"

出演メンバー:
${memberDescriptions}

現在の時間帯: ${TIME_CTX}
ケミ: yoshiaki↔michi 姉弟コンビ; nako↔nana 前向きコンビ; mizyu/rin/suzuka/kanon AG!4人ケミ; taiyo 落ち着き担当`;

  const topicChangeRule = shouldChangeTopic
    ? `⚠️ 話題転換必須（7〜9ターン目の中で正確に1回）:
- 自然に「[名前]ちゃん、そういえば[新トピック]の話しない？」みたいに
- そのターンのみ: "topic_change": true, "new_topic": "新トピック(8文字以内)" を追加
- 転換後の残りのターンは完全に新しいトピックのみ、前のトピックへの言及禁止`
    : `話題転換なし: 今のトピックをより深く面白く掘り下げること。topic_change使用禁止。`;

  const userPrompt = `[直前の会話 — 必ず続けること]:
${recentConvo || '(放送開始直後)'}

[最後の発言者]: ${lastAuthorName || 'なし'}(${lastAuthorId || '?'}) → index[0]に来てはいけない！

上記の会話に続けて、さらに面白く15ターン生成。前に出た内容をメンバーが覚えて言及すること。

構成ルール:
- 出演: ${authorIds.join(', ')} のみ使用
- 3人がそれぞれ4〜5回発言（均等に）
- ❌ 連続発話絶対禁止 ❌（再度: index[N].author ≠ index[N-1].author）
- 1ターン2〜4文（短すぎたらNG、十分な長さで）
- お互いの名前を呼んでいじる/ツッコミ/相槌必須（3ターンごとに1回以上）
- 前に出たエピソード/発言を直接言及（5ターンごとに1回）
- すべて日本語のみ
${topicChangeRule}

JSON配列のみ出力（他のテキストなし）:
[{"author":"メンバーid","content":"セリフ..."},...]`;

  // 최대 3회 retry + 25초 timeout per attempt
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          max_tokens: 3000,
          temperature: 0.85,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.error(`[attempt ${attempt}] API error: ${res.status} ${res.statusText}`);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 3000)); continue; }
        return null;
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

      // JSON 파싱 (코드블록 제거 후)
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log(`✅ [attempt ${attempt}] 파싱 성공`);
      return parsed;

    } catch (e) {
      console.error(`[attempt ${attempt}] 실패: ${e.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 3000)); }
    }
  }
  console.error('❌ 3회 시도 모두 실패');
  return null;
}

// 4. 메시지 INSERT
async function insertMessage(content, memberId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${memberId}]${MEMBER_NAME[memberId]}`
    })
  });
  return res.ok;
}

// ─── 메인 실행 ───────────────────────────────────────────────

console.log('🎙️ OnAir Script Generator 시작');

// 1. 현재 활성 멤버 조회
const activeSessions = await getActiveSessions();
if (!Array.isArray(activeSessions) || activeSessions.length === 0) {
  console.log('❌ 활성 멤버 없음. 종료.');
  process.exit(0);
}

console.log(`✅ 활성 멤버: ${activeSessions.map(s => s.member_name).join(', ')}`);

// 2. 최근 메시지 40개 조회
const recentMessages = await getRecentMessages(40);
console.log(`📜 최근 메시지 ${recentMessages.length}개 로드`);

// 2-b. 마지막 토픽 이후 메시지 수 확인 → 50개 이상이면 화제 전환
const msgCountSinceTopic = await getMessageCountSinceLastTopic();
const shouldChangeTopic = msgCountSinceTopic >= 77; // 토픽당 77개 메시지
console.log(`📊 마지막 토픽 이후 멤버 메시지: ${msgCountSinceTopic}개 → 화제전환: ${shouldChangeTopic}`);

// 3. 15턴 배치 대화 생성 (단 1회 LLM 호출)
console.log('🤖 15턴 배치 대화 생성 중...');
const script = await generateScript(activeSessions, recentMessages, shouldChangeTopic);

if (!script || !Array.isArray(script) || script.length === 0) {
  console.log('❌ 스크립트 생성 실패. 종료.');
  process.exit(1);
}

console.log(`✅ ${script.length}턴 생성 완료`);

// 4. 18초마다 1개씩 INSERT
const activeMemberIds = new Set(activeSessions.map(s => s.member_id));
// ⚠️ 이전 배치 마지막 화자로 초기화 — 배치 경계 연속 발화 방지 핵심 수정
const lastMsg = recentMessages[recentMessages.length - 1];
const lastMsgMatch = lastMsg?.author_name?.match(/^\[MEMBER:(\w+)\]/);
let lastInsertedAuthor = lastMsgMatch ? lastMsgMatch[1] : null;

for (let i = 0; i < script.length; i++) {
  const turn = script[i];

  // 유효한 멤버인지 확인
  if (!turn.author || !activeMemberIds.has(turn.author)) {
    console.log(`⚠️ 스킵 (유효하지 않은 멤버: ${turn.author})`);
    continue;
  }

  if (!turn.content || turn.content.trim() === '') {
    console.log(`⚠️ 스킵 (빈 content, turn ${i + 1})`);
    continue;
  }

  // 외국어 문자 포함 시 스킵 (아랍어/태국어/러시아어 등 - 단, 일본어·한자는 허용)
  const foreignLangRegex = /[\u0600-\u06FF\u0750-\u077F\u0E00-\u0E7F\u0400-\u04FF]/;
  if (foreignLangRegex.test(turn.content)) {
    console.log(`⚠️ 스킵 (외국어 감지, turn ${i + 1}): ${turn.content.substring(0, 40)}`);
    continue;
  }

  // 연속 발화 방지: 직전에 같은 멤버가 말했으면 스킵
  if (turn.author === lastInsertedAuthor) {
    console.log(`⚠️ 스킵 (연속 발화 방지: ${turn.author}, turn ${i + 1})`);
    continue;
  }

  // 화제 전환 턴이면 [TOPIC] 메시지 먼저 INSERT
  if (turn.topic_change && turn.new_topic) {
    const topicRes = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ author_name: '[TOPIC]', content: turn.new_topic.slice(0, 10) })
    });
    console.log(`🔄 화제 전환: ${turn.new_topic}`);
  }

  const ok = await insertMessage(turn.content.trim(), turn.author);
  console.log(`📤 [${i + 1}/${script.length}] ${MEMBER_NAME[turn.author] || turn.author}: ${turn.content.substring(0, 50)}...`);

  if (ok) {
    lastInsertedAuthor = turn.author; // 연속 발화 추적 업데이트
  } else {
    console.log(`⚠️ INSERT 실패 (turn ${i + 1})`);
  }

  // 마지막 턴이 아니면 10초 대기 (끊임없이 흐르는 채팅 속도)
  if (i < script.length - 1) {
    await new Promise(r => setTimeout(r, 10000));
  }
}

console.log('🎙️ OnAir Script Generator 완료');
