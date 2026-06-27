/** Per-model pricing in USD (approximate, update as needed) */
export const LLM_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
};

export const TTS_PRICING = {
  elevenlabs: 0.00003,
  'openai-tts': 0.000015,
};

export const IMAGE_PRICING = {
  'dall-e-2': 0.02,
  'dall-e-3-standard': 0.04,
  'dall-e-3-hd': 0.08,
};

export function calculateLlmCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = LLM_PRICING[model] ?? LLM_PRICING['gpt-4o-mini']!;
  return inputTokens * pricing.input + outputTokens * pricing.output;
}
