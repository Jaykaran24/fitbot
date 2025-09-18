const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

async function getOpenRouterReply(userMessage, userProfile) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Please run on Node 18+ or provide a fetch polyfill.');
  }

  // Create a fitness-focused prompt with user context
  const systemPrompt = `You are Fit Bot, a helpful fitness and nutrition assistant. Keep answers concise and actionable. When giving advice, prefer safe, evidence-based guidance. If calculations are requested and user profile is available, consider: weight (kg): ${userProfile?.weight ?? 'unknown'}, height (cm): ${userProfile?.height ?? 'unknown'}, age: ${userProfile?.age ?? 'unknown'}, gender: ${userProfile?.gender ?? 'unknown'}, activityLevel: ${userProfile?.activityLevel ?? 'unknown'}.`;

  const body = {
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 512
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'FitBot'
  };

  // Log the outgoing request
  console.log('🚀 OpenRouter API Request:');
  console.log('URL:', OPENROUTER_API_URL);
  console.log('Headers:', {
    ...headers,
    'Authorization': `Bearer ${OPENROUTER_API_KEY.substring(0, 10)}...` // Mask API key for security
  });
  console.log('Request Body:', JSON.stringify(body, null, 2));
  console.log('Timestamp:', new Date().toISOString());
  console.log('---');

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    // Log response status and headers
    console.log('📥 OpenRouter API Response:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Timestamp:', new Date().toISOString());

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response Body:', errorText);
      console.log('---');
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Log the full response data
    console.log('✅ Success Response Body:', JSON.stringify(data, null, 2));
    console.log('---');
    
    const content = data?.choices?.[0]?.message?.content?.trim();
		
    if (!content) {
      console.log('⚠️ Warning: No content found in response');
      throw new Error('No response content from OpenRouter API');
    }

    // Log the extracted content
    console.log('📝 Extracted Content:', content);
    console.log('Token Usage:', data?.usage || 'No usage data');
    console.log('===');

    return content;
  } catch (error) {
    console.error('❌ OpenRouter API error:', error.message);
    console.error('Error details:', error);
    console.log('===');
    throw error;
  }
}

module.exports = { getOpenRouterReply }; 