// scripts/onair-script-generator.mjs
// GitHub Actions 13분마다 실행
// LLM으로 15턴 배치 대화 생성 → 10초마다 1개씩 DB INSERT

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const FALLBACK_MEMBERS = ['mizyu', 'rin', 'suzuka'];

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

// 1. 현재 활성 세션 조회
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
    if (msg.author_name === '[TOPIC]') break;
    if (msg.author_name?.startsWith('[MEMBER:')) count++;
  }
  return count;
}

// 3. LLM으로 15턴 배치 대화 생성 (3회 retry, 2초 간격)
async function generateScript(activeMembers, recentMessages, shouldChangeTopic = false) {
  const memberDescriptions = activeMembers.map(m => {
    const persona = MEMBER_PERSONA[m.member_id] || '';
    return `- ${m.member_name}(id:${m.member_id}): ${persona}`;
  }).join('\n');

  const authorIds = activeMembers.map(m => m.member_id);

  const recentConvo = recentMessages.slice(-15).map(m => {
    const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
    if (!match) return null;
    return `${match[2]}: ${m.content}`;
  }).filter(Boolean).join('\n');

  const lastMsg = recentMessages[recentMessages.length - 1];
  const lastAuthorMatch = lastMsg?.author_name?.match(/^\[MEMBER:(\w+)\]/);
  const lastAuthorId = lastAuthorMatch ? lastAuthorMatch[1] : null;
  const lastAuthorName = lastAuthorId ? MEMBER_NAME[lastAuthorId] : null;

  const memberNameList = activeMembers.map(m => m.member_name).join('、');
  const memberIdList = activeMembers.map(m => m.member_id).join(', ');

  const systemPrompt = `あなたはTWIN PLANETタレントのラジオ番組台本ライターです。本物のバラエティラジオのように面白く自然な会話を書いてください。

🚨 絶対ルール（1つでも違反したら全体無効）:
1. 連続発話 ZERO TOLERANCE: 配列 index[N].author == index[N-1].author は絶対NG。
2. 最初の発言者: "${lastAuthorName || 'なし'}"(${lastAuthorId || '?'}) 以外の人。この人がindex[0]に来たら無効。
3. すべてのセリフ100% 日本語。外国語単語の挿入絶対禁止。
4. 必ず前の会話の内容を受けて続けること。唐突に新しい話を始めるのは禁止。

👥 出演メンバー厳守:
- 現在ON AIRのメンバーは【${memberNameList}】(id: ${memberIdList}) のみ。
- この15ターン中、上記メンバー以外の人物（不在メンバー含む）を一切言及・呼びかけ・話題にしてはいけない。
- 不在メンバーへの「〜いたらよかったのに」「〜はどう思う？」なども完全禁止。

🔄 自然な会話ルール:
- 同じ単語・フレーズを3回以上繰り返してはいけない（特定の食べ物・物の名前など）。
- 「笑」は本当に面白いと感じた瞬間にだけ使用。毎文末への機械的な「笑」付加は禁止。
- 10ターン以上同じ主題が続いていると感じたら、自然な形で話題を切り替えること（ただし topic_change ルールに従う）。
- 各メッセージは新しい角度からアプローチし、前のターンの繰り返しにならないこと。

🎭 面白さ要素（必須 — なければクオリティ不足）:
- メンバーの名前を呼んでいじる: "え、[名前]それどういうこと？", "[名前]さんまたそれ言ってる〜"
- 大げさなリアクション: "えっ本当に！？", "もう信じられない〜", "笑いすぎてやばい"
- 受け継ぎ: "[名前]が言ったみたいに〜", "さっき[名前]が言ってたじゃないですか"
- リスナー巻き込み: "みなさんはどうですか？", "コメントで教えてください！"
- 押し引き: Aが言ったらBがツッコミ、Cが仲裁する流れ

🎙️ ラジオ話し方:
- 各メンバーの個性ある話し方を維持（ペルソナ参照）
- 1ターン3〜5文（短すぎると面白くない。必ず3文以上書くこと）
- 前の発言を直接引用: "さっきの[内容]の話ですけど"

出演メンバー:
${memberDescriptions}

現在の時間帯: ${TIME_CTX}
ケミ: yoshiaki↔michi 姉弟コンビ; nako↔nana 前向きコンビ; mizyu/rin/suzuka/kanon AG!4人ケミ; taiyo 落ち着き担当`;

  const topicChangeRule = shouldChangeTopic
    ? `⚠️ 話題転換必須（10〜12ターン目の中で正確に1回）:
- 自然に「[名前]ちゃん、そういえば[新トピック]の話しない？」みたいに
- そのターンのみ: "topic_change": true, "new_topic": "新トピック(8文字以内)" を追加
- 転換後の残りのターンは完全に新しいトピックのみ、前のトピックへの言及禁止`
    : `話題転換なし: 今のトピックをより深く面白く掘り下げること。topic_change使用禁止。`;

  const userPrompt = `[直前の会話 — 必ず続けること]:
${recentConvo || '(放送開始直後)'}

[最後の発言者]: ${lastAuthorName || 'なし'}(${lastAuthorId || '?'}) → index[0]に来てはいけない！

上記の会話に続けて、さらに面白く15ターン生成。前に出た内容をメンバーが覚えて言及すること。

構成ルール:
- 出演: ${authorIds.join(', ')} のみ使用。これ以外のメンバーは発言も言及も絶対禁止。
- ${activeMembers.length}人がそれぞれ均等に発言
- ❌ 連続発話絶対禁止 ❌（再度: index[N].author ≠ index[N-1].author）
- 1ターン3〜5文（必ず3文以上。短すぎたらNG）
- お互いの名前を呼んでいじる/ツッコミ/相槌必須（3ターンごとに1回以上）
- 前に出たエピソード/発言を直接言及（5ターンごとに1回）
- すべて日本語のみ
- 同じ単語を3回以上使わない。「笑」は文末への機械的付加禁止、自然な場面のみ。
${topicChangeRule}

JSON配列のみ出力（他のテキストなし）:
[{"author":"メンバーid","content":"セリフ..."},...]`;

  // 3회 retry, 2초 간격
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
        console.error(`[ScriptGen] [attempt ${attempt}] API error: ${res.status} ${res.statusText}`);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log(`[ScriptGen] [attempt ${attempt}] 파싱 성공`);
      return parsed;

    } catch (e) {
      console.error(`[ScriptGen] [attempt ${attempt}] 실패: ${e.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); }
    }
  }
  console.error('[ScriptGen] 3회 시도 모두 실패');
  return null;
}

// fallback용 1개 메시지 생성
async function generateFallbackMessage(memberId) {
  const persona = MEMBER_PERSONA[memberId] || '';
  const memberName = MEMBER_NAME[memberId] || memberId;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          max_tokens: 200,
          temperature: 0.9,
          messages: [
            { role: 'system', content: `あなたは${memberName}です。ペルソナ: ${persona} ラジオ放送中にひと言だけ日本語でつぶやいてください。3〜4文。` },
            { role: 'user', content: `現在の時間帯: ${TIME_CTX} ひと言つぶやく（JSON不要、テキストのみ）:` }
          ]
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (e) {
      console.error(`[ScriptGen] fallback attempt ${attempt} 실패: ${e.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); }
    }
  }
  return null;
}

// 4. 메시지 INSERT (10초 timeout)
async function insertMessage(content, memberId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        content,
        author_name: `[MEMBER:${memberId}]${MEMBER_NAME[memberId]}`
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    clearTimeout(timer);
    console.error(`[ScriptGen] INSERT timeout/error: ${e.message} → skip`);
    return false;
  }
}

// ─── 메인 실행 ───────────────────────────────────────────────

console.log('[ScriptGen] 시작', new Date().toISOString());

// 1. 현재 활성 멤버 조회
const activeSessions = await getActiveSessions();

// ── FALLBACK: 활성 세션이 0명이면 랜덤 멤버로 즉시 메시지 1개 생성 후 종료
if (!Array.isArray(activeSessions) || activeSessions.length === 0) {
  console.log('[ScriptGen] 활성 멤버 없음. Fallback 모드 진입...');
  const fallbackId = FALLBACK_MEMBERS[Math.floor(Math.random() * FALLBACK_MEMBERS.length)];
  console.log(`[ScriptGen] Fallback 멤버: ${fallbackId}`);
  const fallbackMsg = await generateFallbackMessage(fallbackId);
  if (fallbackMsg) {
    const ok = await insertMessage(fallbackMsg, fallbackId);
    console.log(`[ScriptGen] Fallback INSERT ${ok ? '성공' : '실패'}: ${fallbackMsg.substring(0, 50)}`);
    console.log('[ScriptGen] 완료', 1, '개 (fallback)');
  } else {
    console.log('[ScriptGen] Fallback 메시지 생성 실패');
    console.log('[ScriptGen] 완료', 0, '개 (fallback 실패)');
  }
  process.exit(0);
}

console.log(`[ScriptGen] 활성 멤버: ${activeSessions.map(s => s.member_name).join(', ')}`);

// 2. 최근 메시지 40개 조회
const recentMessages = await getRecentMessages(40);
console.log(`[ScriptGen] 최근 메시지 ${recentMessages.length}개 로드`);

// 2-b. 마지막 토픽 이후 메시지 수 확인 → 77개 이상이면 화제 전환
const msgCountSinceTopic = await getMessageCountSinceLastTopic();
const shouldChangeTopic = msgCountSinceTopic >= 77;
console.log(`[ScriptGen] 마지막 토픽 이후 멤버 메시지: ${msgCountSinceTopic}개 → 화제전환: ${shouldChangeTopic}`);

// 3. 15턴 배치 대화 생성 (단 1회 LLM 호출, 실패 시 retry)
console.log('[ScriptGen] 15턴 배치 대화 생성 중...');
const script = await generateScript(activeSessions, recentMessages, shouldChangeTopic);

if (!script || !Array.isArray(script) || script.length === 0) {
  console.log('[ScriptGen] 스크립트 생성 실패. 종료.');
  console.log('[ScriptGen] 완료', 0, '개');
  process.exit(1);
}

console.log(`[ScriptGen] ${script.length}턴 생성 완료`);

// 4. 10초마다 1개씩 INSERT (각 INSERT에 10초 timeout)
const activeMemberIds = new Set(activeSessions.map(s => s.member_id));
const lastMsg = recentMessages[recentMessages.length - 1];
const lastMsgMatch = lastMsg?.author_name?.match(/^\[MEMBER:(\w+)\]/);
let lastInsertedAuthor = lastMsgMatch ? lastMsgMatch[1] : null;
let insertCount = 0;

for (let i = 0; i < script.length; i++) {
  const turn = script[i];

  if (!turn.author || !activeMemberIds.has(turn.author)) {
    console.log(`[ScriptGen] 스킵 (유효하지 않은 멤버: ${turn.author})`);
    continue;
  }

  if (!turn.content || turn.content.trim() === '') {
    console.log(`[ScriptGen] 스킵 (빈 content, turn ${i + 1})`);
    continue;
  }

  // 외국어 문자 포함 시 스킵 (아랍어/태국어/러시아어 등 - 단, 일본어·한자는 허용)
  const foreignLangRegex = /[\u0600-\u06FF\u0750-\u077F\u0E00-\u0E7F\u0400-\u04FF]/;
  if (foreignLangRegex.test(turn.content)) {
    console.log(`[ScriptGen] 스킵 (외국어 감지, turn ${i + 1}): ${turn.content.substring(0, 40)}`);
    continue;
  }

  // 연속 발화 방지
  if (turn.author === lastInsertedAuthor) {
    console.log(`[ScriptGen] 스킵 (연속 발화 방지: ${turn.author}, turn ${i + 1})`);
    continue;
  }

  // 화제 전환 턴이면 [TOPIC] 메시지 먼저 INSERT
  if (turn.topic_change && turn.new_topic) {
    const ctrl = new AbortController();
    const topicTimer = setTimeout(() => ctrl.abort(), 10000);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ author_name: '[TOPIC]', content: turn.new_topic.slice(0, 10) }),
        signal: ctrl.signal,
      });
      clearTimeout(topicTimer);
      console.log(`[ScriptGen] 화제 전환: ${turn.new_topic}`);
    } catch (e) {
      clearTimeout(topicTimer);
      console.error(`[ScriptGen] TOPIC INSERT timeout/error: ${e.message}`);
    }
  }

  const ok = await insertMessage(turn.content.trim(), turn.author);
  console.log(`[ScriptGen] [${i + 1}/${script.length}] ${MEMBER_NAME[turn.author] || turn.author}: ${turn.content.substring(0, 50)}...`);

  if (ok) {
    lastInsertedAuthor = turn.author;
    insertCount++;
  } else {
    console.log(`[ScriptGen] INSERT 실패 (turn ${i + 1})`);
  }

  if (i < script.length - 1) {
    await new Promise(r => setTimeout(r, 10000));
  }
}

console.log('[ScriptGen] 완료', insertCount, '개');
