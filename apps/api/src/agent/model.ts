import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// The ghost has one address. Laptop (Ollama), DigitalOcean (vLLM) and the relic
// (llama.cpp) all speak the OpenAI chat API, so moving the ghost is an env change.
export function ghostModel() {
  const baseURL = process.env.MODEL_BASE_URL ?? "http://127.0.0.1:11434/v1";
  const modelId = process.env.MODEL_ID ?? "gemma4:e4b";
  const provider = createOpenAICompatible({
    name: "ghost",
    baseURL,
    apiKey: process.env.MODEL_API_KEY ?? "local",
    includeUsage: true,
  });
  return { baseURL, modelId, model: provider(modelId) };
}

// Gemma 4 thinks by default and can spend its whole budget doing it (Morning
// Sloth's first lesson). Each server takes the off switch in its own field;
// the others ignore what they don't know.
export const noThinking = {
  ghost: {
    chat_template_kwargs: { enable_thinking: false }, // vLLM, llama.cpp
    reasoning_effort: "none", // Ollama
  },
};
