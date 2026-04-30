// /api/claude.js - 디버그 강화 버전

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

// base64 검증 - 유효하면 true, 문제 있으면 에러 정보 반환
function validateBase64(str) {
  if (!str || typeof str !== 'string') return { valid: false, reason: 'empty or not string' };
  if (str.length < 100) return { valid: false, reason: `too short (${str.length})` };
  // base64 표준 문자만 허용 (A-Z, a-z, 0-9, +, /, =)
  const invalidMatch = str.match(/[^A-Za-z0-9+/=]/);
  if (invalidMatch) {
    return {
      valid: false,
      reason: 'invalid chars',
      invalidChar: invalidMatch[0],
      invalidCharCode: invalidMatch[0].charCodeAt(0),
      invalidPosition: invalidMatch.index,
    };
  }
  return { valid: true, length: str.length };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 진단 모드 (GET)
  if (req.method === 'GET') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return res.status(200).json({
      diagnostic: true,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyPrefix: apiKey ? apiKey.slice(0, 10) : null,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았어요' });
  }

  let body;
  try {
    const raw = await readBody(req);
    body = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return res.status(400).json({ error: 'JSON 파싱 실패: ' + e.message });
  }

  if (!body || !body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'messages 배열이 필요해요' });
  }

  // === base64 이미지 검증 ===
  const imageInfo = [];
  for (const msg of body.messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const part of msg.content) {
      if (part.type === 'image' && part.source?.type === 'base64') {
        const validation = validateBase64(part.source.data);
        imageInfo.push({
          media_type: part.source.media_type,
          ...validation,
        });
        if (!validation.valid) {
          return res.status(400).json({
            error: '이미지 데이터가 올바르지 않아요',
            detail: validation,
            imageInfo,
          });
        }
      }
    }
  }

  const payload = {
    model: body.model || 'claude-sonnet-4-5',
    max_tokens: body.max_tokens || 4096,
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
      return res.status(502).json({
        error: 'Anthropic API가 비정상 응답',
        detail: text.slice(0, 500),
      });
    }

    if (!upstream.ok) {
      console.error('[api/claude] Anthropic 에러:', data);
      return res.status(upstream.status).json({
        error: data.error?.message || 'Anthropic API 호출 실패',
        type: data.error?.type,
        anthropicStatus: upstream.status,
        imageInfo, // 디버그용 - 이미지 정보 같이 반환
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[api/claude] 네트워크 에러:', err);
    return res.status(500).json({
      error: '서버 에러: ' + err.message,
    });
  }
}
