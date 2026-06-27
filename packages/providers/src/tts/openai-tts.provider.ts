import { ITtsProvider } from '../interfaces';
import { TtsRequest, TtsResponse, ProviderUsage } from '../types';
import { TTS_PRICING } from '../pricing';

export class OpenAiTtsProvider implements ITtsProvider {
  readonly key = 'openai-tts';

  constructor(
    private readonly apiKey: string,
    private readonly defaultVoice = 'alloy',
  ) {}

  async synthesize(request: TtsRequest): Promise<TtsResponse> {
    const charCount = request.text.length;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model ?? 'tts-1',
        input: request.text,
        voice: request.voiceId ?? this.defaultVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI TTS error (${response.status}): ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    const usage: ProviderUsage = {
      units: charCount,
      unitType: 'characters',
      costUsd: charCount * TTS_PRICING['openai-tts'],
    };

    return { audio, mimeType: 'audio/mpeg', usage };
  }
}
