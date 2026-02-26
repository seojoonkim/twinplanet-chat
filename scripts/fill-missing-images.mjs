import fs from 'fs';
import path from 'path';
import https from 'https';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }

const diaryPath = './public/diary-generated.json';
const diary = JSON.parse(fs.readFileSync(diaryPath, 'utf-8'));

// タレント名前マッピング
const MEMBER_NAMES = {
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

async function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' }
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GEMINI_API_KEY}`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const imgDir = './public/diary';
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  let updated = false;
  for (const entry of diary) {
    // imagePath가 이미 있고 파일도 존재하면 스킵
    if (entry.imagePath) {
      const fullPath = './public' + entry.imagePath;
      if (fs.existsSync(fullPath)) {
        console.log(`✅ 이미 있음: ${entry.date} ${entry.authorId}`);
        continue;
      }
    }
    // authorId.png fallback도 있으면 스킵
    const fallback = `${imgDir}/${entry.authorId}.png`;
    if (fs.existsSync(fallback) && !entry.imagePath) {
      console.log(`✅ fallback 있음: ${entry.authorId}.png`);
      continue;
    }

    console.log(`🎨 이미지 생성 중: ${entry.date} ${entry.authorId} - ${entry.title}`);
    const memberName = MEMBER_NAMES[entry.authorId] || entry.authorName || entry.authorId;
    const prompt = `Watercolor diary illustration for Korean idol ${memberName}. Soft pastel colors, hand-drawn sketch style, cute and delicate. Scene: ${entry.title}. White background, minimal line art, diary page illustration style. No text, no characters, objects and scenery only.`;

    try {
      const result = await generateImage(prompt);
      const b64 = result.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) { console.error('이미지 없음:', JSON.stringify(result).slice(0,200)); continue; }

      const filename = `${entry.date}-${entry.authorId}.png`;
      const filePath = path.join(imgDir, filename);
      fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
      entry.imagePath = `/diary/${filename}`;
      updated = true;
      console.log(`✅ 생성 완료: ${filePath}`);
    } catch(e) {
      console.error(`❌ 실패: ${entry.authorId}`, e.message);
    }
    // rate limit 방지
    await new Promise(r => setTimeout(r, 2000));
  }

  if (updated) {
    fs.writeFileSync(diaryPath, JSON.stringify(diary, null, 2));
    console.log('✅ diary-generated.json 업데이트 완료');
  }
}

main().catch(console.error);
