// /api/claude.js
// 강사 앱이 보내는 요청을 받아 Anthropic API로 전달하는 백엔드.
// API 키는 Vercel 환경변수 ANTHROPIC_API_KEY에서 자동으로 읽어요.

export default async function handler(req, res) {
  // CORS
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
      hint: 'Vercel Settings → Environment Variables 확인',
    });
  }

  const body = req.body || {};
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages 배열이 필요해요' });
  }

  // 강사 앱에서 보내는 값 그대로 Anthropic API로 전달
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

    const data = await upstream.json();

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
