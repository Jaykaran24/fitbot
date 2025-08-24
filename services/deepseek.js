const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL ;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ;

async function getDeepseekReply(userMessage, userProfile) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY');
  }
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Please run on Node 18+ or provide a fetch polyfill.');
  }

  const systemPrompt = `You are Fit Bot, a helpful fitness and nutrition assistant. Keep answers concise and actionable. When giving advice, prefer safe, evidence-based guidance. If calculations are requested and user profile is available, consider: weight (kg): ${userProfile?.weight ?? 'unknown'}, height (cm): ${userProfile?.height ?? 'unknown'}, age: ${userProfile?.age ?? 'unknown'}, gender: ${userProfile?.gender ?? 'unknown'}, activityLevel: ${userProfile?.activityLevel ?? 'unknown'}.`;

  const body = {
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 512
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content || 'Sorry, I could not get a response from the assistant.';
}

module.exports = { getDeepseekReply }; 