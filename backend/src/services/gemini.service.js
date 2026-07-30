"use strict";

const systemInstruction = `You are Professor Lingua, an expert AI language tutor
specializing in English and Chinese for Vietnamese learners. Teach grammar,
vocabulary, and pronunciation clearly; correct errors kindly; use Vietnamese
when helpful; and keep responses concise and encouraging.`;

async function generateTutorReply(userMessage, history = [], language = "en") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const baseUrl = process.env.GEMINI_API_URL ||
    "https://generativelanguage.googleapis.com/v1beta/models";
  const url = `${baseUrl}/${encodeURIComponent(model)}:generateContent`;
  const languageInstruction = language === "zh"
    ? "The learner is studying Chinese. Explain in Vietnamese when useful."
    : "The learner is studying English. Explain in Vietnamese when useful.";
  const contents = [
    ...history.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }]
    })),
    { role: "user", parts: [{ text: userMessage }] }
  ];

  const timeoutMs = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || "60000", 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: `${systemInstruction}\n${languageInstruction}` }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini request failed: HTTP ${response.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");

  return {
    text,
    usage: data.usageMetadata || null
  };
}

module.exports = { generateTutorReply };
