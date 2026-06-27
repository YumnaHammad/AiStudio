import { ILlmProvider } from '../interfaces';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  ProviderUsage,
} from '../types';
import { calculateLlmCost } from '../pricing';

export class AnthropicLlmProvider implements ILlmProvider {
  readonly key = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = 'claude-sonnet-4-20250514',
  ) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const model = request.model ?? this.defaultModel;

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      messages: nonSystemMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
      model: string;
    };

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;

    const usage: ProviderUsage = {
      inputTokens,
      outputTokens,
      unitType: 'tokens',
      costUsd: calculateLlmCost(model, inputTokens, outputTokens),
    };

    const content = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return { content, model: data.model, usage };
  }
}
