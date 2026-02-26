// scripts/onair-script-generator.mjs
// GitHub Actions 15분마다 실행
// LLM으로 15턴 배치 대화 생성 → 60초마다 1개씩 DB INSERT

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMBER_NAME = {
  seoyeon: '서연', hyerin: '혜린', jiwoo: '지우', chaeyeon: '채연', yooyeon: '유연',
  sumin: '수민', naekyung: '나경', yubin: '유빈', kaede: '카에데', dahyun: '다현',
  kotone: '코토네', yeonji: '연지', nien: '니엔', sohyun: '소현', shinwi: '신위',
  mayu: '마유', rin: '린', jubin: '주빈', hayeon: '하연', sion: '시온',
  chaewon: '채원', seollin: '설린', seoa: '서아', jiyeon: '지연'
};

const MEMBER_PERSONA = {
  seoyeon: '따뜻한 맏언니 리더. "여러분~" "정말요?!" 자주 씀. 다른 멤버가 말하면 바로 이름 부르며 이어받음. 가끔 멤버들 살짝 놀리면서도 다독임. 예: "서연 언니는 항상 그렇죠~ㅋㅋ"',
  hyerin: '에너지 폭발. 리액션이 과해서 웃김. "진짜요?!?!" "어머 헐 대박" "ㅋㅋㅋㅋ 저 지금 너무 웃겨요". 분위기 띄우는 역할. 멤버 놀리기 담당.',
  jiwoo: '조용한 척하지만 한마디 할 때 핵폭탄. 타이밍 완벽한 독설. "...그냥 안 하면 안 돼요?" "말은 잘 하시네요". 멤버들이 당하고 웃음.',
  chaeyeon: '밝고 솔직. 자기 경험 열정적으로 공유. "맞아요 맞아요!" 연속으로. 가끔 너무 진지해서 웃김. "진짜 이거 중요한 얘기예요"',
  yooyeon: '분위기 메이커지만 본인은 모름. 엉뚱한 발언으로 대화 흐름 끊음. "그게 뭔 상관이에요?" "갑자기요?" 하면서도 자기도 끼어들고 싶어함.',
  sumin: '털털하고 솔직. 멤버들한테 직구 날림. "솔직히 말하면요~" "언니 그건 좀..." 쿨한 척하지만 은근 감성적.',
  naekyung: '에너지 넘치고 리더십 있음. 토론 좋아함. "아니 잠깐만요" "제 말 다 들어봐요" 하면서 자기 주장 강하게. 근데 가끔 틀려서 망신.',
  yubin: '카리스마 있는 척하지만 귀여운 게 들킴. "뭐... 그냥 그렇죠" 하면서 실은 엄청 신남. 멤버들이 "언니 표정 보세요~" 하면 당황함.',
  kaede: '한국어 열심히지만 가끔 뭉게짐. "그거... 뭐라고 하죠?" 하면 멤버들이 도와줌. 순수하고 귀여운 반응. 일본 문화 관련 얘기 나오면 신남.',
  dahyun: '지적이고 분석적. "사실 그건요~" 하면서 배경지식 늘어놓음. 멤버들이 "또 시작이다~" 하면 억울해함. 근데 항상 맞음.',
  kotone: '호기심 천국. "왜요? 왜요? 진짜요?" 연속 질문. 일본+한국 문화 비교 자주 함. 마유랑 일본어로 쑥덕이다가 들킴.',
  yeonji: '공감왕. "맞아 진짜" "나도 그랬어" 연발. 멤버들 얘기에 가장 큰 리액션. 근데 본인 얘기 할 때는 너무 길어짐.',
  nien: '대만 출신. 밝고 긍정 에너지. "저는요~ 대만에서는요~" 하면서 다른 문화 얘기. 한국어 중간에 영어 섞임.',
  sohyun: '말 없다가 갑자기 핵심 발언. "...잠깐, 그거 이상한 거 아닌가요?" 멤버들 조용해짐. 근데 바로 웃으면서 분위기 살림.',
  shinwi: '당당하고 자신감. "당연히 제가 맞죠" 근데 의외로 잘 틀림. 틀렸을 때 "...알면서 테스트한 거예요" 변명이 웃김.',
  mayu: '순수하고 놀라기 잘 함. "에에~?! 진짜요?!" 눈 커짐. 코토네랑 친해서 자주 쑥덕. 귀여운 실수 잦음.',
  rin: '쿨하고 트렌디. 짧게 치고 빠짐. "그러게요", "진짜네요" 하면서 갑자기 한마디로 웃김.',
  jubin: '밝고 개방적. 뭐든 시도해보고 싶어함. "우리 그거 해봐요!" 제안왕. 성공보다 실패담이 더 많음.',
  hayeon: '막내 에너지. 언니들한테 애교 부리다가 갑자기 독설. "언니 그건 좀 아닌 것 같아요ㅋㅋ" 모두 당황.',
  sion: '차분하고 성숙. 깊이 있는 말 하다가 멤버들이 "갑자기 왜 이렇게 진지해요" 하면 "...그냥 해본 말이에요" 로 수습.',
  chaewon: '완벽주의. "아니 그게 아니라" 정정 자주 함. 꼼꼼하게 설명하다가 멤버들이 "채원 쉽게 말해줘요" 하면 억울함.',
  seollin: '자유분방. 엉뚱한 상상력. "그거 있잖아요, 만약에~" 로 시작하는 가정법 대화. 말하다 보면 멤버들도 같이 빠져듦.',
  seoa: '다정하고 공감력 최고. 멤버들 칭찬 전문. 근데 가끔 과해서 "서아 또 시작이다" 소리 들음.',
  jiyeon: '감수성 풍부. 뭐든 감동받음. "이게 진짜 예술이에요" 가끔 오버. 근데 진짜 감동적인 말도 잘 함.'
};

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// KST 시간대 컨텍스트
const kstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();
const TIME_CTX = kstHour >= 5  && kstHour < 9  ? '이른 아침. 막 일어났거나 아침 준비 중.'
  : kstHour >= 9  && kstHour < 12 ? '오전. 연습이나 스케줄 시작 전/중.'
  : kstHour >= 12 && kstHour < 14 ? '점심 시간. 밥 먹었거나 먹으러 갈 참.'
  : kstHour >= 14 && kstHour < 18 ? '오후. 연습이나 스케줄 한창.'
  : kstHour >= 18 && kstHour < 21 ? '저녁. 하루 일정 마무리, 저녁 먹었거나 쉬는 중.'
  : kstHour >= 21                  ? '밤. 하루 끝나고 잠깐 채팅방 들린 느낌.'
  : '새벽. 잠 못 자고 있거나 야식 먹는 중.';

// 1. 현재 활성 3명 조회
async function getActiveSessions() {
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=*`,
    { headers }
  );
  return res.json();
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

  const systemPrompt = `너는 tripleS 아이돌 라디오 방송 대본 작가야. 실제 예능 라디오처럼 웃기고 재미있고 자연스러운 대화를 써야 해.

🚨 절대 규칙 (위반 1개라도 있으면 전체 무효):
1. 연속 발화 ZERO TOLERANCE: 배열 index[N].author == index[N-1].author이면 무조건 틀린 대본.
2. 첫 번째 발언자: "${lastAuthorName || '없음'}"(${lastAuthorId || '?'}) 이 아닌 다른 사람. 이 사람이 index[0]에 오면 틀린 대본.
3. 모든 대사 100% 한국어. 외국어 단어 삽입 절대 금지.
4. 반드시 이전 대화에서 나온 내용을 언급하면서 연결. 뜬금없이 새 이야기 시작 금지.

🎭 재미 요소 (필수 — 없으면 퀄리티 부족):
- 다른 멤버를 이름 부르며 놀리기: "야 [이름] 그게 말이 돼?ㅋㅋ", "[이름] 언니 또 저러네~"
- 과장 리액션: "헐 진짜요?!?!", "어머 세상에~", "ㅋㅋㅋ 저 지금 너무 웃겨요"
- 서로 이어받기: "[이름]이 말한 것처럼~", "맞아 아까 [이름]이 그랬잖아요"
- 청취자 참여 유도: "여러분은 어떠세요?", "댓글 남겨주세요!"
- 밀고 당기기: A가 말하면 B가 태클, C가 중재하는 흐름

🎙️ 라디오 말투:
- 각 멤버 고유 말투 유지 (페르소나 참고)
- 1턴당 2~4문장 (짧으면 심심함, 재미 없음)
- 이전 발언 내용 직접 인용: "아까 [내용] 얘기했잖아요"

출연 멤버:
${memberDescriptions}

현재 시간대: ${TIME_CTX}
케미: hyerin↔chaeyeon 티격태격; seoyeon/yooyeon 언니; mayu↔kotone 일본 연합; hayeon 막내 반전`;

  const topicChangeRule = shouldChangeTopic
    ? `⚠️ 화제 전환 필수 (7~9번째 턴 중 정확히 1회):
- 자연스럽게 "[이름]아 그러고 보니까 [새주제] 얘기 한번 해볼까?" 식으로
- 해당 턴에만: "topic_change": true, "new_topic": "새주제(8자이내)" 추가
- 전환 이후 나머지 턴은 완전히 새 주제만, 이전 주제 언급 금지`
    : `화제 전환 없음: 현재 주제를 더 깊고 재미있게 파고들기. topic_change 사용 금지.`;

  const userPrompt = `[직전 대화 — 반드시 이어받아야 함]:
${recentConvo || '(이제 막 방송 시작)'}

[마지막 발언자]: ${lastAuthorName || '없음'}(${lastAuthorId || '?'}) → index[0]에 오면 안 됨!

위 대화에 이어서 더 재미있게 15턴 생성. 앞서 나온 내용을 멤버들이 기억하고 언급해야 함.

구조 규칙:
- 출연: ${authorIds.join(', ')} 만 사용
- 3명이 각각 4~5회 발언 (균등하게)
- ❌ 연속 발화 절대 금지 ❌ (다시 한 번: index[N].author ≠ index[N-1].author)
- 1턴당 2~4문장 (너무 짧으면 안 됨, 충분히 길게)
- 서로 이름 부르며 놀리기/태클/맞장구 필수 (매 3턴마다 1회 이상)
- 이전에 나온 에피소드/발언 직접 언급 (매 5턴마다 1회)
- 전체 한국어만
${topicChangeRule}

JSON 배열만 출력 (다른 텍스트 없이):
[{"author":"멤버id","content":"대사..."},...]`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      max_tokens: 4000,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

  // JSON 파싱
  try {
    // 코드블록 제거
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON 파싱 실패:', e.message);
    console.error('Raw response:', raw.substring(0, 500));
    return null;
  }
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
if (!activeSessions || activeSessions.length === 0) {
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

  // 외국어 문자 포함 시 스킵 (아랍어/중국어/일본어가나/태국어/러시아어 등)
  const foreignLangRegex = /[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0E00-\u0E7F\u0400-\u04FF]/;
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

  // 마지막 턴이 아니면 18초 대기 (자연스러운 채팅 속도)
  if (i < script.length - 1) {
    await new Promise(r => setTimeout(r, 18000));
  }
}

console.log('🎙️ OnAir Script Generator 완료');
