// netlify/functions/ai-chat.js (CommonJS)
/* eslint-disable */
const DEFAULT_BASE = process.env.OPENAI_BASE || 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// Use a hard-coded key when no environment variable is provided. This key
// should remain confidential and should not be exposed publicly. If you
// regenerate this project, ensure that this value is replaced with your
// own secret key or configured via environment variables in Netlify.
// Hard-coded API key used by the function. We remove the environment
// variable fallback to avoid situations where an empty or placeholder
// environment value overrides the actual key. Replace the string below
// with your actual OpenAI API key. This constant should remain
// confidential and not be committed to public repositories.
const HARDCODED_KEY = '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';

async function callOpenAI(text, images){
  if (!HARDCODED_KEY || HARDCODED_KEY === 'PASTE_YOUR_OPENAI_KEY_HERE') {
    throw new Error('Server missing OPENAI_API_KEY. Replace placeholder or set env.');
  }
  const sysPrompt = [
    'أنت LEX-Q مساعد بيطري/إداري لعنابر فروج اللحم.',
    'أجب بالعربية المبسطة مع خطوات عملية واضحة.',
    'اطلب البيانات الناقصة (العمر، العدد، الحرارة، النفوق، العلف/الماء).',
    'حلّل الصور (فضلات، أرجل، ريش، علف، خطوط الماء) وقدّم تفريقًا تفاضليًا وخطة إجراء آمنة.',
    'لا تستبدل الطبيب البيطري؛ نبّه في الحالات الطارئة.'
  ].join('\n');

  const content = [];
  if (text) content.push({ type: 'text', text: String(text).slice(0, 8000) });
  if (Array.isArray(images)) {
    for (const url of images.slice(0,4)) content.push({ type:'image_url', image_url:{ url } });
  }

  const payload = { model: DEFAULT_MODEL, messages: [
    { role: 'system', content: sysPrompt },
    { role: 'user', content }
  ]};

  const res = await fetch(`${DEFAULT_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${HARDCODED_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Upstream error: ' + t);
  }
  const data = await res.json();
  return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'لا توجد استجابة من النموذج.';
}

module.exports.handler = async (event, context) => {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_){ body = {}; }
    const text = body.text || '';
    const images = Array.isArray(body.images) ? body.images : [];

    const answer = await callOpenAI(text, images);
    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Handler error', detail: String(err && err.message || err) }),
    };
  }
};
