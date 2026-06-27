import { IImageProvider } from '../interfaces';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderUsage,
} from '../types';
import { IMAGE_PRICING } from '../pricing';

export class OpenAiImageProvider implements IImageProvider {
  readonly key = 'openai-images';

  constructor(private readonly apiKey: string) {}

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const quality = request.quality ?? 'standard';
    const size = request.size ?? '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.COST_SAVER_MODE === 'true' ? 'dall-e-2' : 'dall-e-3',
        prompt: request.prompt,
        n: 1,
        size: process.env.COST_SAVER_MODE === 'true' ? '1024x1024' : size,
        ...(process.env.COST_SAVER_MODE === 'true'
          ? { response_format: 'b64_json' }
          : { quality, response_format: 'b64_json' }),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Images error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as {
      data: Array<{ b64_json: string; revised_prompt?: string }>;
    };

    const b64 = data.data[0]?.b64_json;
    if (!b64) throw new Error('No image returned from OpenAI');

    const usage: ProviderUsage = {
      units: 1,
      unitType: 'images',
      costUsd:
        process.env.COST_SAVER_MODE === 'true'
          ? IMAGE_PRICING['dall-e-2']
          : quality === 'hd'
            ? IMAGE_PRICING['dall-e-3-hd']
            : IMAGE_PRICING['dall-e-3-standard'],
    };

    return {
      image: Buffer.from(b64, 'base64'),
      mimeType: 'image/png',
      revisedPrompt: data.data[0]?.revised_prompt,
      usage,
    };
  }
}
