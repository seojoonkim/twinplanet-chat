import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// S1→S2→...→S24→jbk 순서
const MEMBER_CYCLE = [
  { id: 'seoyeon',  name: '서연',   sNum: 'S1'  },
  { id: 'hyerin',   name: '혜린',   sNum: 'S2'  },
  { id: 'jiwoo',    name: '지우',   sNum: 'S3'  },
  { id: 'chaeyeon', name: '채연',   sNum: 'S4'  },
  { id: 'yooyeon',  name: '유연',   sNum: 'S5'  },
  { id: 'sumin',    name: '수민',   sNum: 'S6'  },
  { id: 'naekyung', name: '나경',   sNum: 'S7'  },
  { id: 'yubin',    name: '유빈',   sNum: 'S8'  },
  { id: 'kaede',    name: '카에데', sNum: 'S9'  },
  { id: 'dahyun',   name: '다현',   sNum: 'S10' },
  { id: 'kotone',   name: '코토네', sNum: 'S11' },
  { id: 'yeonji',   name: '연지',   sNum: 'S12' },
  { id: 'nien',     name: '니엔',   sNum: 'S13' },
  { id: 'sohyun',   name: '소현',   sNum: 'S14' },
  { id: 'shinwi',   name: '신위',   sNum: 'S15' },
  { id: 'mayu',     name: '마유',   sNum: 'S16' },
  { id: 'rin',      name: '린',     sNum: 'S17' },
  { id: 'jubin',    name: '주빈',   sNum: 'S18' },
  { id: 'hayeon',   name: '하연',   sNum: 'S19' },
  { id: 'sion',     name: '시온',   sNum: 'S20' },
  { id: 'chaewon',  name: '채원',   sNum: 'S21' },
  { id: 'seollin',  name: '설린',   sNum: 'S22' },
  { id: 'seoa',     name: '서아',   sNum: 'S23' },
  { id: 'jiyeon',   name: '지연',   sNum: 'S24' },
  { id: 'jbk',      name: '정병기', sNum: 'JBK' },
];

// 1. 날짜 결정 (DATE_OVERRIDE 환경변수 지원)
const dateOverride = process.env.DATE_OVERRIDE;
let dateStr;
if (dateOverride) {
  dateStr = dateOverride;
} else {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  dateStr = kst.toISOString().slice(0, 10);
}

// 2. 기존 생성된 일기 로드
const generatedPath = 'public/diary-generated.json';
const existing = JSON.parse(fs.readFileSync(generatedPath, 'utf8') || '[]');

// 이미 오늘 일기 있으면 스킵
if (existing.some(e => e.date === dateStr)) {
  console.log('오늘 일기 이미 생성됨, 스킵');
  process.exit(0);
}

// 3. 멤버 순번 결정 (날짜 기반 순환)
// diary-data.ts의 기존 S1~S6(서연~수민) 6개 고정 엔트리 이후부터 순환
const BASE_OFFSET = 6; // S1~S6(서연~수민)은 고정 엔트리
const totalEntries = BASE_OFFSET + existing.length;
const memberIdx = totalEntries % MEMBER_CYCLE.length;
const member = MEMBER_CYCLE[memberIdx];

console.log(`📝 오늘의 멤버: ${member.name} (${member.id}), 인덱스: ${memberIdx}`);

// 4. feed-data.json에서 해당 멤버 관련 최근 트윗 수집
let recentTweets = [];
try {
  const feedData = JSON.parse(fs.readFileSync('public/feed-data.json', 'utf8'));
  recentTweets = (feedData.twitter || [])
    .filter(t => t.text.toLowerCase().includes(member.name) || (t.memberIds || []).includes(member.id))
    .slice(0, 5)
    .map(t => t.text);
} catch {
  console.log('feed-data.json 읽기 실패, 소식 없이 진행');
}

// 5. Anthropic API로 일기 텍스트 생성
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const diaryPrompt = `당신은 tripleS의 아이돌 멤버 ${member.name}입니다.
오늘 날짜: ${dateStr}
최근 관련 소식: ${recentTweets.join(' | ') || '특별한 소식 없음'}

다음 형식으로 일기를 작성해주세요:
- 제목: 오늘 하루를 표현하는 짧고 감각적인 제목 (15자 이내)
- 내용: 300-400자의 일기. ${member.name}의 목소리와 개성으로 쓰기. 시적이고 감각적인 묘사, 구체적인 일상 디테일 포함.
- 무드 이모지: 오늘 하루를 표현하는 이모지 1개

JSON 형식으로 응답:
{"title": "...", "content": "...", "mood": "🌸"}`;

const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: diaryPrompt }],
});

const rawText = response.content[0].text;
const jsonMatch = rawText.match(/\{.*\}/s);
if (!jsonMatch) {
  console.error('JSON 파싱 실패:', rawText);
  process.exit(1);
}
const diaryData = JSON.parse(jsonMatch[0]);
console.log(`✍️ 일기 생성: "${diaryData.title}"`);

// 6. Gemini Imagen API로 일기 드로잉 생성
const imagePrompt = `Elementary school child's handmade diary drawing. Crayon and colored marker on crumpled white paper. Big-headed Korean girl character with dot eyes, curved smile, rosy circle cheeks. Topic: "${diaryData.title}" for idol ${member.name}. Include: simple objects related to the topic (sun, moon, hearts, stars, flowers, food, etc), scattered doodles filling empty spaces, wobbly handwritten mood words, pink and purple color palette with accent colors. Style: naive 7-year-old art, imperfect wobbly lines, authentic child's drawing, no digital polish, crumpled paper texture taped to wall. Aspect ratio 16:9.`;

const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

async function callImagenAPI() {
  const geminiRes = await fetch(GEMINI_IMAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });
  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Gemini Image API HTTP ${geminiRes.status}: ${errText.slice(0, 300)}`);
  }
  const geminiData = await geminiRes.json();
  const parts = geminiData.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    throw new Error(`이미지 데이터 없음: ${JSON.stringify(geminiData).slice(0, 200)}`);
  }
  return imagePart.inlineData.data;
}

let imagePath = null;
try {
  let imageBase64 = null;
  try {
    imageBase64 = await callImagenAPI();
  } catch (firstErr) {
    console.warn(`⚠️ 이미지 생성 1차 실패: ${firstErr.message}`);
    console.log('🔄 2초 후 재시도...');
    await new Promise(r => setTimeout(r, 2000));
    imageBase64 = await callImagenAPI();
  }

  // 7. 이미지 저장
  const imgDir = 'public/diary';
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  const imgFilePath = `${imgDir}/${dateStr}-${member.id}.png`;
  fs.writeFileSync(imgFilePath, Buffer.from(imageBase64, 'base64'));
  imagePath = `/diary/${dateStr}-${member.id}.png`;
  console.log(`🖼️ 이미지 저장: ${imgFilePath}`);
} catch (err) {
  console.warn(`❌ 이미지 생성 최종 실패, 이미지 없이 진행: ${err.message}`);
}

// 8. diary-generated.json에 새 엔트리 추가
const newEntry = {
  id: `diary-${dateStr.replace(/-/g, '')}-${member.id}`,
  authorId: member.id,
  authorName: member.name,
  date: dateStr,
  title: diaryData.title,
  content: diaryData.content,
  mood: diaryData.mood,
  svgDrawing: imagePath ? '' : '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"></svg>',
  imagePath: imagePath,
  comments: [],
};

existing.unshift(newEntry); // 최신 순으로 앞에 추가

// 최대 30개 유지
const trimmed = existing.slice(0, 30);
fs.writeFileSync(generatedPath, JSON.stringify(trimmed, null, 2));
console.log(`✅ 일기 생성 완료: ${member.name} (${dateStr})`);
