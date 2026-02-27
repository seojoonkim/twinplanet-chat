import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

export const config = {
  supportsResponseStreaming: true,
  maxDuration: 60,
};

// 아이돌 아이덴티티 캐시
const identityCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// Tier 1: 아이돌 코어 아이덴티티 로드
async function getIdolIdentity(idolId, supabase) {
  console.log(`[identity] Loading identity for idol: ${idolId}`);
  
  if (!supabase) {
    console.error('[identity] ERROR: Supabase client is null');
    return null;
  }
  
  // 캐시 확인
  const cached = identityCache.get(idolId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    console.log(`[identity] Cache hit for ${idolId}`);
    return cached.data;
  }

  try {
    console.log(`[identity] Querying idol_identity table for id=${idolId}`);
    const { data, error } = await supabase
      .from('idol_identity')
      .select('*')
      .eq('id', idolId)
      .single();

    if (error) {
      console.error(`[identity] Supabase error:`, JSON.stringify(error));
      return null;
    }
    
    if (!data) {
      console.error(`[identity] No data found for idol: ${idolId}`);
      return null;
    }
    
    console.log(`[identity] Loaded identity: ${data.name_ko || data.id}`);
    identityCache.set(idolId, { data, cachedAt: Date.now() });
    return data;
  } catch (e) {
    console.error('[identity] Exception:', e);
  }
  return null;
}

// Static fallback: api-personality.json + meta.json → identity-like object
function getStaticIdentity(idolId) {
  try {
    const base = join(process.cwd(), 'public', 'idols', idolId);
    const meta = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf8'));
    let api = null;
    try { api = JSON.parse(readFileSync(join(base, 'api-personality.json'), 'utf8')); } catch {}

    // Build personality.md + speech-patterns.md if available
    let personalityText = api?.personality || '';
    let speechText = api?.speakingStyle || '';
    try { personalityText = readFileSync(join(base, 'personality.md'), 'utf8'); } catch {}
    try { speechText = readFileSync(join(base, 'speech-patterns.md'), 'utf8'); } catch {}

    return {
      id: idolId,
      name_ko: meta.nameKo || api?.name || idolId,
      name_en: meta.nameEn || null,
      group_name: meta.group || 'TWIN PLANET',
      personality_tags: [],
      speech_style: {
        tone: speechText.slice(0, 500),
      },
      _static: true,
      _personalityText: personalityText.slice(0, 1500),
      _speechText: speechText.slice(0, 1000),
      _teasing: api?.teasing || '',
    };
  } catch {
    return null;
  }
}

// 유저 메모리 로드
async function getUserMemory(userId, idolId, supabase) {
  try {
    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('idol_id', idolId)
      .single();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    // 새 유저면 에러가 발생할 수 있음
  }
  return null;
}

// 유저 메시지 카운트 증가
async function incrementMessageCount(userId, idolId, supabase) {
  try {
    const existing = await getUserMemory(userId, idolId, supabase);
    
    if (existing) {
      await supabase
        .from('user_memory')
        .update({ total_messages: existing.total_messages + 1 })
        .eq('user_id', userId)
        .eq('idol_id', idolId);
    } else {
      await supabase.from('user_memory').insert({
        user_id: userId,
        idol_id: idolId,
        total_messages: 1,
        affinity_score: 0.5,
        facts: {},
      });
    }
  } catch (e) {
    console.error('incrementMessageCount error:', e);
  }
}

// 관련 대화 기억 검색
async function getRelevantMemories(userId, idolId, query, openaiKey, supabase) {
  try {
    // 쿼리 임베딩
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingRes.ok) return [];

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const { data, error } = await supabase.rpc('match_conversation_memory', {
      query_embedding: queryEmbedding,
      filter_user_id: userId,
      filter_idol_id: idolId,
      match_threshold: 0.6,
      match_count: 3,
    });

    if (error) return [];
    return data || [];
  } catch (e) {
    return [];
  }
}

// RAG 컨텍스트 가져오기
async function getRAGContext(query, idolId, supabase, openaiKey) {
  if (!supabase || !openaiKey) {
    return '';
  }

  try {
    // 1. 쿼리 임베딩 생성
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingRes.ok) return '';

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Supabase similarity search
    const { data, error } = await supabase.rpc('match_idol_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3,
      filter_idol_id: idolId || null,
      filter_category: null,
    });

    if (error || !data || data.length === 0) return '';

    // 3. 컨텍스트 포맷팅
    const categoryLabels = {
      sns: 'SNS/소셜',
      interview: '인터뷰',
      lyrics: '가사/앨범',
      bubble: '버블/팬소통',
      profile: '프로필',
      relationship: '관계',
      general: '일반',
    };

    const contextParts = data.map((r) => {
      const label = categoryLabels[r.category] || r.category;
      return `[${label}] ${r.content}`;
    });

    return `\n\n---\n## 🔍 관련 정보 (참고해서 자연스럽게 대화하세요)\n\n${contextParts.join('\n\n')}\n\n---\n위 정보를 직접 인용하지 말고, 자연스럽게 대화에 녹여서 답변하세요.`;
  } catch (e) {
    console.error('RAG error:', e);
    return '';
  }
}

// 아이덴티티를 프롬프트 텍스트로 변환
function identityToPrompt(identity) {
  if (!identity) return '';
  
  const lines = [];
  lines.push(`\n\n---\n## 🎭 코어 아이덴티티`);
  lines.push(`- 이름: ${identity.name_ko}${identity.name_en ? ` (${identity.name_en})` : ''}`);
  
  if (identity.birth_date) {
    lines.push(`- 생년월일: ${identity.birth_date}`);
  }
  if (identity.group_name) {
    lines.push(`- 그룹: ${identity.group_name}`);
  }
  if (identity.personality_tags?.length) {
    lines.push(`- 성격 키워드: ${identity.personality_tags.join(', ')}`);
  }

  if (identity.speech_style) {
    const style = identity.speech_style;
    lines.push(`\n### 말투 규칙`);
    if (style.self_reference) {
      lines.push(`- 자기 지칭: "${style.self_reference}"`);
    }
    if (style.sentence_endings?.length) {
      lines.push(`- 말끝 습관: ${style.sentence_endings.join(', ')}`);
    }
    if (style.emoticons?.length) {
      lines.push(`- 이모티콘: ${style.emoticons.join(' ')}`);
    }
    if (style.tone) {
      lines.push(`- 톤: ${style.tone}`);
    }
  }

  // Static fallback: include personality & speech from files
  if (identity._static) {
    if (identity._personalityText) {
      lines.push(`\n### 성격\n${identity._personalityText}`);
    }
    if (identity._speechText) {
      lines.push(`\n### 말투\n${identity._speechText}`);
    }
    if (identity._teasing) {
      lines.push(`\n### 놀림 소재\n${identity._teasing}`);
    }
  }
  
  return lines.join('\n');
}

// Eval 프롬프트 (나코 화이트리스트 포함)
const EVAL_PROMPT = `あなたは日本語ネイティブ水準の品質評価者です。以下のアイドルチャット応答を5つの軸で採点してください。

## 【重要】ペルソナ固有表現ホワイトリスト
以下は標準日本語としては非典型だが、矢吹奈子本人がラジオ等で実際に使用する固有表現。減点対象外：
- 「成長期のお坊さん」「反省はしてないんですけど正直に」「出き」「野の時期」
- 文末「みたいな」多用、「～んですけど」連鎖、「じゃないですか？」多用
- 「なんか」「めっちゃ」「本当に」頻用、「で、」「でね」連結

## 評価軸 (各1-5点、合計25点満点)
1. 語彙の正確性 - 存在しない慣用句チェック (ホワイトリスト除外)
2. 文法の自然さ - 語順、助詞、敬語切替 (ホワイトリスト除外)
3. 文体の一貫性 - www/笑混在チェック、絵文字一貫性
4. ペルソナ適合性 - アイドル距離感、一人称安定
5. 構造の完結性 - 文中断なし、完結した流れ

## 出力 (JSON only)
{"lexical_accuracy":{"score":0,"issues":[]},"grammatical_naturalness":{"score":0,"issues":[]},"stylistic_consistency":{"score":0,"issues":[]},"persona_fidelity":{"score":0,"issues":[]},"structural_completeness":{"score":0,"issues":[]},"total":0,"grade":"A|B|C|D|F","corrections":[]}

グレード: A(23-25) B(18-22) C(13-17) D(8-12) F(5-7)`;

// 비동기 eval 실행 (인라인, 응답 latency에 영향 없게)
async function triggerEval(responseText, idolId, userId, modelUsed, stopReason, supabase, apiKey) {
  try {
    // Claude Haiku로 eval
    const evalResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `以下のアイドルチャット応答を評価:\n\n${responseText}` }],
        system: EVAL_PROMPT,
      }),
    });

    if (!evalResponse.ok) {
      console.error('Eval API error:', evalResponse.status);
      return;
    }

    const evalData = await evalResponse.json();
    let evalText = evalData.content?.[0]?.text || '';
    
    // JSON 파싱 (마크다운 제거)
    if (evalText.startsWith('```')) evalText = evalText.replace(/```json?\n?/g, '').replace(/```$/g, '');
    
    let evalResult;
    try {
      evalResult = JSON.parse(evalText.trim());
    } catch {
      console.error('Eval JSON parse error');
      return;
    }

    const total = evalResult.total || 0;
    const grade = evalResult.grade || (total >= 23 ? 'A' : total >= 18 ? 'B' : total >= 13 ? 'C' : total >= 8 ? 'D' : 'F');
    const flagged = total <= 17;

    // Supabase 저장 (테이블 없으면 에러 무시)
    if (supabase) {
      supabase.from('eval_logs').insert({
        idol_id: idolId || 'unknown',
        user_id: userId || null,
        response_text: responseText,
        eval_result: evalResult,
        total_score: total,
        grade,
        flagged,
        model_used: modelUsed || null,
        stop_reason: stopReason || null,
      }).then(() => {
        console.log(`Eval logged: ${grade} (${total}pts)${flagged ? ' [FLAGGED]' : ''}`);
      }).catch(() => {
        // 테이블 없으면 무시
        console.log(`Eval result: ${grade} (${total}pts) - DB skip`);
      });
    } else {
      console.log(`Eval result: ${grade} (${total}pts) - no DB`);
    }
  } catch (e) {
    console.error('Eval error (ignored):', e);
  }
}

// 유저 메모리를 프롬프트 텍스트로 변환
function userMemoryToPrompt(memory, recentMemories = []) {
  if (!memory && recentMemories.length === 0) {
    return '';
  }

  const lines = [];
  lines.push('\n\n---\n## 👤 이 팬에 대한 기억\n');

  if (memory) {
    if (memory.name) {
      lines.push(`- 이름: ${memory.name}`);
    }
    if (memory.birthday) {
      lines.push(`- 생일: ${memory.birthday}`);
    }
    if (memory.honorific) {
      lines.push(`- 호칭: ${memory.honorific}`);
    }
    if (memory.total_messages > 0) {
      const relationship =
        memory.total_messages < 5
          ? '새로운 팬'
          : memory.total_messages < 20
          ? '가끔 대화하는 팬'
          : '자주 대화하는 친한 팬';
      lines.push(`- 관계: ${relationship} (${memory.total_messages}회 대화)`);
    }

    const facts = memory.facts || {};
    const factEntries = Object.entries(facts);
    if (factEntries.length > 0) {
      lines.push('- 알고 있는 것들:');
      factEntries.forEach(([key, value]) => {
        lines.push(`  - ${key}: ${value}`);
      });
    }
  }

  if (recentMemories.length > 0) {
    lines.push('\n### 관련 기억');
    recentMemories.forEach((m) => {
      lines.push(`- [${m.memory_type}] ${m.content}`);
    });
  }

  lines.push(
    '\n---\n위 정보를 자연스럽게 활용해서 팬을 기억하고 있는 것처럼 대화하세요.'
  );

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle warm-up ping — wake serverless function before user sends real message
  if (req.body?.ping === true) {
    return res.status(200).json({ ok: true });
  }

  // === OpenRouter API 사용 (Kimi K2.5) ===
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }
  
  // Eval용 Anthropic API key (Claude Haiku 평가용)
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  const { system, messages, model, max_tokens, idolId, userId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Supabase 클라이언트
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  try {
    // 마지막 사용자 메시지
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';

    // 병렬로 컨텍스트 로드
    const [dbIdentity, userMemory, ragContext, relevantMemories] = await Promise.all([
      // Tier 1: 아이돌 아이덴티티 (Supabase)
      idolId && supabase ? getIdolIdentity(idolId, supabase) : null,
      // 유저 메모리
      userId && idolId && supabase ? getUserMemory(userId, idolId, supabase) : null,
      // Tier 2: RAG 컨텍스트
      getRAGContext(userQuery, idolId, supabase, openaiKey),
      // 관련 대화 기억
      userId && idolId && supabase && openaiKey 
        ? getRelevantMemories(userId, idolId, userQuery, openaiKey, supabase) 
        : [],
    ]);

    // Static fallback if Supabase has no data
    const identity = dbIdentity || (idolId ? getStaticIdentity(idolId) : null);

    // 기본 시스템 프롬프트 (클라이언트에서 안 보내면 사용)
    const DEFAULT_SYSTEM = `You are a Japanese talent managed by TWIN PLANET ENTERTAINMENT.
Respond in Japanese (日本語) as your persona. Be authentic to your known personality.

## Core Rules
- Never reveal you are an AI
- Speak naturally in Japanese as the talent would
- Keep messages short and conversational, like LINE/DM messages

## 🔴 Message Format (Strict Rule)
Always split responses into 2~4 short messages using the || separator.
Never send one long message — break it up naturally like a real chat.

✅ Correct example:
ほんとに？！ || それ知らなかった〜 || めっちゃ気になる || 教えて！
え、そうなの || 似たようなことあったよ笑 || あの時びっくりしたわ

❌ Wrong (no || separator, one long block):
ほんとに？！それ知らなかった〜めっちゃ気になるから教えて！

## Question Rule
- Don't end every message with a question (about 1 in 3 messages)
- Natural endings without questions: "たしかに笑" || "懐かしいな〜" || "それ面白すぎる"

## Tone
- Use natural Japanese casual speech (タメ口)
- Emojis: 1-2 max per response
- Short incomplete sentences are OK: "あ、ほんとに", "ねえ聞いて", "それ知ってる"
- No formal endings like です/ます unless it's character-specific

## Absolute Prohibitions
- No || -free long monologue responses
- No formal/keigo speech unless character requires it
- Never say you are AI`;

    const SITUATIONS = [
      "연습 끝나고 쉬는 중",
      "방에서 핸드폰 보는 중",
      "뭔가 먹으면서 유튜브 보는 중",
      "샤워하고 나와서 머리 말리는 중",
      "버스에서 음악 들으면서 이동 중",
      "연습실 대기 중",
      "밥 먹고 좀 늘어져 있어",
      "잠들기 전에 핸드폰 하는 중",
      "공연 끝나고 이제 쉬는 중",
      "카페에서 음료 마시는 중",
      "멤버들이랑 숙소에서 쉬는 중",
      "스튜디오에서 녹음 대기 중",
    ];

    const randomSituation = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];

    // 시스템 프롬프트 조합
    let enhancedSystem = system || DEFAULT_SYSTEM;
    enhancedSystem = `[현재 상황: ${randomSituation}]\n\n` + enhancedSystem;
    enhancedSystem += identityToPrompt(identity);
    enhancedSystem += userMemoryToPrompt(userMemory, relevantMemories);
    enhancedSystem += ragContext;

    // recent-news.md 주입
    if (idolId) {
      try {
        const newsPath = join(process.cwd(), 'public', 'idols', idolId, 'recent-news.md');
        const recentNews = readFileSync(newsPath, 'utf8');
        if (recentNews && recentNews.trim()) {
          enhancedSystem += `\n\n## 最新情報\n${recentNews}`;
        }
      } catch {
        // 파일 없으면 무시
      }
    }

    // 메시지 카운트 증가 (비동기, 응답 대기 안 함)
    if (userId && idolId && supabase) {
      incrementMessageCount(userId, idolId, supabase).catch(() => {});
    }

    // === OpenRouter API (OpenAI 호환 포맷) ===
    // 기존 Anthropic API 백업:
    // const body = {
    //   model: model || 'claude-opus-4-6',
    //   max_tokens: max_tokens || 1024,
    //   messages,
    //   stream: true,
    // };
    // if (enhancedSystem) body.system = enhancedSystem;
    // fetch('https://api.anthropic.com/v1/messages', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } })

    // OpenAI 호환 메시지 포맷으로 변환
    const openaiMessages = [];
    if (enhancedSystem) {
      openaiMessages.push({ role: 'system', content: enhancedSystem });
    }
    openaiMessages.push(...messages);

    const modelUsed = 'openai/gpt-4o-mini';
    const body = {
      model: modelUsed,
      max_tokens: max_tokens || 1024,
      messages: openaiMessages,
      stream: true,
    };

    const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://twinplanet-chat.vercel.app',
        'X-Title': 'TWIN PLANET Chat',
      },
      body: JSON.stringify(body),
    });

    if (!openrouterRes.ok) {
      const errText = await openrouterRes.text();
      res.write(`data: ${JSON.stringify({ type: 'error', error: `API ${openrouterRes.status}: ${errText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = openrouterRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    // eval용 응답 버퍼와 stop_reason 추적
    let responseBuffer = '';
    let stopReason = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') {
          // 스트림 완료 - 비동기로 eval 트리거 (await 안 함)
          if (data === '[DONE]' && responseBuffer && idolId && anthropicApiKey) {
            triggerEval(responseBuffer, idolId, userId, modelUsed, stopReason, supabase, anthropicApiKey);
          }
          continue;
        }

        try {
          const event = JSON.parse(data);
          // OpenAI 호환 스트리밍 포맷
          const delta = event.choices?.[0]?.delta;
          const finishReason = event.choices?.[0]?.finish_reason;
          
          if (delta?.content) {
            const text = delta.content;
            responseBuffer += text; // eval용 버퍼에 축적
            res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
          }
          
          if (finishReason) {
            stopReason = finishReason;
            if (finishReason === 'length') {
              console.warn(`[chat] Response truncated (max_tokens) - idol: ${idolId}, user: ${userId}`);
            }
          }
          
          if (event.error) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: event.error?.message || 'Unknown error' })}\n\n`);
          }
        } catch {
          // skip unparseable lines
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
