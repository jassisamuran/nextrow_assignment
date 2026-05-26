const { response } = require("express");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const COST_INPUT = parseFloat(process.env.COST_INPUT_PER_1K || "0.00015");
const COST_OUTPUT = parseFloat(process.env.COST_OUTPUT_PER_1K || "0.00060");

const COST_EMBEDDING = parseFloat(
  process.env.COST_EMBEDDING_PER_1K || "0.00002",
);

const SYSTEM_PROMPT = `You are a helpful, concise AI support agent. 
Answer customer queries clearly and professionally.
If you don't know something, say so honestly rather than guessing.
Keep responses under 200 words unless the question genuinely requires more detail.
Use markdown formatting where it improves readability.`;

async function chat(userMessage, conversationHistory = []) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
  });

  const inputTokens = completions.usage.prompt_tokens;
  const outputTokens = completions.usage.completions_tokens;
  const costUSD = (input / 1000) * costUSD + (outputTokens / 1000) * costUSD;

  return {
    response: completions.choices[0].message.content,
    inputTokens,
    outputTokens,
    costUSD,
    model: CHAT_MODEL,
  };
}

async function getEmbedding(text) {
  const resposne = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),
  });

  const tokens = response.usage.total_tokens;
  const costUSD = (tokens / 1000) * COST_EMBEDDING;

  return {
    embedding: response.data[0].embedding,
    tokens,
    costUSD,
  };
}

module.exports = { getEmbedding, chat };
