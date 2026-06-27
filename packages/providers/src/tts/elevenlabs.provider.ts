import { ITtsProvider } from '../interfaces';
import { TtsRequest, TtsResponse, ProviderUsage } from '../types';
import { TTS_PRICING } from '../pricing';

export class ElevenLabsTtsProvider implements ITtsProvider {
  readonly key = 'elevenlabs';

  constructor(
    private readonly apiKey: string,
    private readonly defaultVoiceId = '21m00Tcm4TlvDq8ikWAM',
  ) {}

  async synthesize(request: TtsRequest): Promise<TtsResponse> {
    const voiceId = request.voiceId ?? this.defaultVoiceId;
    const charCount = request.text.length;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model ?? 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    const usage: ProviderUsage = {
      units: charCount,
      unitType: 'characters',
      costUsd: charCount * TTS_PRICING.elevenlabs,
    };

    return { audio, mimeType: 'audio/mpeg', usage };
  }
}
