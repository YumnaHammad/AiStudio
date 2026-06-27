export function interpolatePrompt(
  template: string,
  variables: Record<string, unknown>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const str =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value ?? '');
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), str);
  }

  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, content: string) => {
      const val = variables[varName];
      return val !== undefined && val !== null && val !== '' ? content : '';
    },
  );

  return result;
}

export function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : trimmed;
  return JSON.parse(jsonStr) as T;
}

export async function llmJson<T>(
  ctx: import('./types').WorkerContext,
  userPrompt: string,
): Promise<{ data: T; usage: import('@acs/providers').ProviderUsage; model: string }> {
  // Text/JSON steps always use OpenAI — providerKey may be tts/stock/image for the same worker
  const llm = ctx.providers.getLlm('openai');
  const response = await llm.complete({
    messages: [
      { role: 'system', content: 'You are a professional AI assistant. Always respond with valid JSON only.' },
      { role: 'user', content: userPrompt },
    ],
    jsonMode: ctx.providerKey === 'openai',
  });
  return {
    data: parseJsonResponse<T>(response.content),
    usage: response.usage,
    model: response.model,
  };
}
