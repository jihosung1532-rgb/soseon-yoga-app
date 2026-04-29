// /api/claude.js
// Node 24 호환 + body 직접 파싱 버전

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') return req.body;
    if (typeof req.body === 'object') return JSON.stringify(req.body);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[api/claude] ANTHROPIC_API_KEY 환경변수 없음');
    return res.status(500).json({
      error: 'API 키가 설정되지 않았어요',
    });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    console.error('[api/claude] body 파싱 실패:', e);
    return res.status(400).json({ error: 'JSON 파싱 실패: ' + e.message });
  }

  if (!body || !body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages 배열이 필요해요' });
  }

  const payload = {
    model: body.model || 'claude-sonnet-4-20250514',
    max_tokens: body.max_tokens || 1800,
    messages: body.messages,
  };
  if (body.system) payload.system = body.system;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[api/claude] Anthropic 응답이 JSON 아님:', text.slice(0, 500));
      return res.status(502).json({
        error: 'Anthropic API가 비정상 응답을 보냈어요',
        detail: text.slice(0, 500),
      });
    }

    if (!upstream.ok) {
      console.error('[api/claude] Anthropic API 에러:', data);
      return res.status(upstream.status).json({
        error: data.error?.message || 'Anthropic API 호출 실패',
        type: data.error?.type,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[api/claude] 네트워크 에러:', err);
    return res.status(500).json({
      error: '서버 에러가 발생했어요',
      detail: err.message,
    });
  }
}
