import { ILlmProvider } from '../interfaces';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  ProviderUsage,
} from '../types';
import { calculateLlmCost } from '../pricing';

export class OpenAiLlmProvider implements ILlmProvider {
  readonly key = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  ) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const model = request.model ?? this.defaultModel;
    const defaultMaxTokens = parseInt(process.env.OPENAI_MAX_TOKENS ?? '2048', 10);

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? defaultMaxTokens,
    };

    if (request.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
      model: string;
    };

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;

    const usage: ProviderUsage = {
      inputTokens,
      outputTokens,
      unitType: 'tokens',
      costUsd: calculateLlmCost(model, inputTokens, outputTokens),
    };

    return {
      content: data.choices[0]?.message.content ?? '',
      model: data.model,
      usage,
    };
  }
}
