const predictionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE = 200;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'predict') {
    handlePrediction(message.text, message.context)
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'getSettings') {
    chrome.storage.sync.get({
      apiKey: '',
      enabled: true,
      cloudEnabled: true,
      language: 'auto',
      localDebounceMs: 50,
      cloudDebounceMs: 400,
    }).then(sendResponse);
    return true;
  }
});

async function handlePrediction(text, context) {
  const cacheKey = text.substring(text.length - 100);
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.result;
  }

  const settings = await chrome.storage.sync.get({ apiKey: '', language: 'auto' });
  if (!settings.apiKey) return null;

  try {
    const result = await callClaudeAPI(settings.apiKey, text, context, settings.language);

    if (predictionCache.size > MAX_CACHE) {
      const oldest = [...predictionCache.entries()]
        .sort((a, b) => a[1].time - b[1].time)[0];
      predictionCache.delete(oldest[0]);
    }
    predictionCache.set(cacheKey, { result, time: Date.now() });

    return result;
  } catch (e) {
    console.error('AI Tastatur: Cloud prediction failed', e);
    return null;
  }
}

async function callClaudeAPI(apiKey, text, context, language) {
  const langHint = language === 'auto'
    ? 'Detect the language automatically and respond in the same language.'
    : `Respond in ${language}.`;

  const contextHint = context.fieldType !== 'text'
    ? `The user is writing in a ${context.fieldType} field on ${context.url}.`
    : `The user is writing on ${context.url}.`;

  const systemPrompt = `You are an intelligent text prediction engine. Your task is to complete the user's text naturally.

Rules:
- Complete the current sentence or thought
- Match the user's writing style, tone, and formality
- ${langHint}
- ${contextHint}
- Return ONLY the completion text, not the original text
- Keep completions concise (1-2 sentences max)
- If the text ends mid-word, complete the word first
- Provide 1 main completion and up to 2 alternatives
- Return JSON: {"prediction": "main completion", "alternatives": [{"text": "alt1"}, {"text": "alt2"}]}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Complete this text:\n\n${text.substring(text.length - 500)}`
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    const parsed = JSON.parse(content);
    return {
      prediction: parsed.prediction || '',
      alternatives: (parsed.alternatives || []).map(a => ({ text: a.text, score: 50 }))
    };
  } catch {
    return {
      prediction: content.trim(),
      alternatives: []
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    enabled: true,
    cloudEnabled: true,
    language: 'auto',
    localDebounceMs: 50,
    cloudDebounceMs: 400,
  });
});
