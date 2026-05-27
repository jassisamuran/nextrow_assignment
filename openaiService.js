const { response } = require("express");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_ADMIN_KEY });
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

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
  });

  const inputTokens = completion.usage.prompt_tokens;
  const outputTokens = completion.usage.completion_tokens;
  const costUSD =
    (inputTokens / 1000) * COST_INPUT + (outputTokens / 1000) * COST_OUTPUT;
  return {
    response: completion.choices[0].message.content,
    inputTokens,
    outputTokens,
    costUSD,
    model: CHAT_MODEL,
  };
}

async function chatStream(userMessage, conversationHistory = [], onChunk) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];
 
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
    stream_options: { include_usage: true },
  });
 
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
 
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onChunk(delta);
    }
 
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
  }
 
  const costUSD =
    (inputTokens / 1000) * COST_INPUT + (outputTokens / 1000) * COST_OUTPUT;
 
  return { fullText, inputTokens, outputTokens, costUSD, model: CHAT_MODEL };
}

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
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

module.exports = { getEmbedding,chatStream, chat };
