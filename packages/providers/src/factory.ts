import { WorkerKey } from '@acs/shared';
import { ILlmProvider, ITtsProvider, IStockProvider, IImageProvider } from './interfaces';
import { OpenAiLlmProvider } from './llm/openai.provider';
import { AnthropicLlmProvider } from './llm/anthropic.provider';
import { ElevenLabsTtsProvider } from './tts/elevenlabs.provider';
import { OpenAiTtsProvider } from './tts/openai-tts.provider';
import { PexelsStockProvider } from './stock/pexels.provider';
import { PixabayStockProvider } from './stock/pixabay.provider';
import { OpenAiImageProvider } from './images/openai-images.provider';

export interface ProviderCredentials {
  openai?: string;
  anthropic?: string;
  elevenlabs?: string;
  pexels?: string;
  pixabay?: string;
}

export class ProviderFactory {
  private readonly llmProviders = new Map<string, ILlmProvider>();
  private readonly ttsProviders = new Map<string, ITtsProvider>();
  private readonly stockProviders = new Map<string, IStockProvider>();
  private readonly imageProviders = new Map<string, IImageProvider>();

  constructor(credentials: ProviderCredentials) {
    if (credentials.openai) {
      this.llmProviders.set('openai', new OpenAiLlmProvider(credentials.openai));
      this.ttsProviders.set('openai-tts', new OpenAiTtsProvider(credentials.openai));
      this.imageProviders.set('openai-images', new OpenAiImageProvider(credentials.openai));
    }
    if (credentials.anthropic) {
      this.llmProviders.set('anthropic', new AnthropicLlmProvider(credentials.anthropic));
    }
    if (credentials.elevenlabs) {
      this.ttsProviders.set('elevenlabs', new ElevenLabsTtsProvider(credentials.elevenlabs));
    }
    if (credentials.pexels) {
      this.stockProviders.set('pexels', new PexelsStockProvider(credentials.pexels));
    }
    if (credentials.pixabay) {
      this.stockProviders.set('pixabay', new PixabayStockProvider(credentials.pixabay));
    }
  }

  getLlm(providerKey: string): ILlmProvider {
    const provider = this.llmProviders.get(providerKey);
    if (!provider) throw new Error(`LLM provider not configured: ${providerKey}`);
    return provider;
  }

  getTts(providerKey: string): ITtsProvider {
    const provider = this.ttsProviders.get(providerKey);
    if (!provider) throw new Error(`TTS provider not configured: ${providerKey}`);
    return provider;
  }

  getStock(providerKey: string): IStockProvider {
    const provider = this.stockProviders.get(providerKey);
    if (!provider) throw new Error(`Stock provider not configured: ${providerKey}`);
    return provider;
  }

  getImage(providerKey: string): IImageProvider {
    const provider = this.imageProviders.get(providerKey);
    if (!provider) throw new Error(`Image provider not configured: ${providerKey}`);
    return provider;
  }

  resolveForWorker(workerKey: WorkerKey, providerKey: string): ILlmProvider | ITtsProvider | IStockProvider | IImageProvider {
    switch (workerKey) {
      case WorkerKey.VOICE:
        return this.getTts(providerKey === 'openai' ? 'openai-tts' : providerKey);
      case WorkerKey.ASSET_FINDER:
        return this.getStock(providerKey === 'openai' ? 'pexels' : providerKey);
      case WorkerKey.THUMBNAIL:
        return this.getImage(providerKey === 'openai' ? 'openai-images' : providerKey);
      default:
        return this.getLlm(providerKey);
    }
  }
}
