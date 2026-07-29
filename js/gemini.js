/**
 * gemini-test.js — Standalone Gemini API Live Test
 * Opens in browser to test real LLM API calls from the repo
 */

const GeminiTest = (() => {

  // Read from .env-equivalent config (hardcoded for browser test)
  // In production these would be injected by a build tool or server
  const CONFIG = {
    API_KEY: '',   // Will be filled from the input field
    MODEL: 'gemini-2.0-flash',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
  };

  let chatHistory = [];

  async function callGemini(userMessage) {
    const apiKey = CONFIG.API_KEY || document.getElementById('api-key-input').value.trim();
    if (!apiKey) throw new Error('API Key is required');

    const url = `${CONFIG.BASE_URL}/${CONFIG.MODEL}:generateContent?key=${apiKey}`;

    // Maintain conversation history
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    const body = {
      contents: chatHistory,
      systemInstruction: {
        parts: [{
          text: `You are Professor Lingua, an expert AI language tutor specializing in English and Chinese for Vietnamese learners.
Your role:
- Teach grammar, vocabulary, and pronunciation clearly
- Correct errors kindly with explanations
- Use Vietnamese explanations when helpful
- Keep responses concise and educational
- Always encourage the learner`
        }]
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.candidates[0].content.parts[0].text;

    // Add assistant reply to history
    chatHistory.push({ role: 'model', parts: [{ text: assistantText }] });

    return {
      text: assistantText,
      usage: data.usageMetadata
    };
  }

  return { callGemini, chatHistory };
})();
