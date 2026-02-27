import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const config = {
  maxDuration: 300,
};

const MEMBER_IDS = [
  'mizyu', 'rin', 'suzuka', 'kanon', 'nako',
  'nana', 'taiyo', 'yoshiaki', 'michi'
];

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://frlrowwjvapdnrcgotca.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZybHJvd3dqdmFwZG5yY2dvdGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDMzMzksImV4cCI6MjA4NzcxOTMzOX0.tlk5l1K4tqkd4fG17J7Wr9swOkQb1QWK1q8xpMVs_yM';

async function fetchMemberFeedData(memberId, supabase) {
  const results = {};

  // community_comments 조회
  try {
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('idol_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && comments) {
      results.comments = comments;
    }
  } catch (e) {
    console.error(`[${memberId}] community_comments error:`, e.message);
  }

  // 최신 posts 조회
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('idol_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && posts) {
      results.posts = posts;
    }
  } catch (e) {
    console.error(`[${memberId}] posts error:`, e.message);
  }

  // radar_feeds 조회 (있으면)
  try {
    const { data: feeds, error } = await supabase
      .from('radar_feeds')
      .select('*')
      .eq('idol_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && feeds) {
      results.feeds = feeds;
    }
  } catch (e) {
    // 테이블 없으면 무시
  }

  return results;
}

async function extractNewsWithAI(memberId, feedData) {
  const feedText = JSON.stringify(feedData, null, 2).slice(0, 4000);

  const prompt = `あなたは日本のアイドル情報アナリストです。
以下は${memberId}メンバーのSNS/ファンコミュニティデータです。

このデータから、そのメンバーに関する重要な最新イベント3〜5件を抽出してください。

データ:
${feedText}

以下のマークダウン形式で出力してください：

# ${memberId} - 最新ニュース
最終更新: ${new Date().toISOString().split('T')[0]}

## 最近の出来事
- [날짜] イベント内容
- [날짜] イベント内容
（データが少ない場合は「最新情報なし」と記入）

## ファンの反応
- ファンの最近の反応/話題
（データが少ない場合は「情報なし」と記入）

データが全くない場合は、テンプレートのみ出力してください。`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://twinplanet-chat.vercel.app',
        'X-Title': 'TWIN PLANET Recent News Updater',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[${memberId}] OpenRouter error:`, err);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error(`[${memberId}] AI extraction error:`, e.message);
    return null;
  }
}

function getEmptyTemplate(memberId) {
  return `# ${memberId} - 最新ニュース
最終更新: ${new Date().toISOString().split('T')[0]}

## 最近の出来事
- 最新情報なし

## ファンの反応
- 情報なし
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 간단한 인증 (선택적)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const members = MEMBER_IDS.slice(0, 9);
  const results = [];

  for (const memberId of members) {
    try {
      console.log(`[update-recent-news] Processing: ${memberId}`);

      // 피드 데이터 조회
      const feedData = await fetchMemberFeedData(memberId, supabase);
      const hasData = Object.values(feedData).some(arr => arr && arr.length > 0);

      let newsContent;
      if (hasData) {
        newsContent = await extractNewsWithAI(memberId, feedData);
      }

      if (!newsContent) {
        newsContent = getEmptyTemplate(memberId);
      }

      // 파일 저장
      const filePath = join(process.cwd(), 'public', 'idols', memberId, 'recent-news.md');
      try {
        mkdirSync(join(process.cwd(), 'public', 'idols', memberId), { recursive: true });
        writeFileSync(filePath, newsContent, 'utf8');
        console.log(`[update-recent-news] Saved: ${filePath}`);
        results.push({ memberId, status: 'ok', hasData });
      } catch (writeErr) {
        console.error(`[${memberId}] Write error:`, writeErr.message);
        results.push({ memberId, status: 'write_error', error: writeErr.message });
      }

      // Rate limit 방지
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`[${memberId}] Error:`, e.message);
      results.push({ memberId, status: 'error', error: e.message });
    }
  }

  return res.status(200).json({
    ok: true,
    updated: results.filter(r => r.status === 'ok').length,
    results,
  });
}
