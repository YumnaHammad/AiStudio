export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  units?: number;
  unitType: 'tokens' | 'characters' | 'images' | 'requests';
  costUsd: number;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionRequest {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmCompletionResponse {
  content: string;
  model: string;
  usage: ProviderUsage;
}

export interface TtsRequest {
  text: string;
  voiceId?: string;
  model?: string;
}

export interface TtsResponse {
  audio: Buffer;
  mimeType: string;
  durationMs?: number;
  usage: ProviderUsage;
}

export interface StockSearchRequest {
  query: string;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface StockAsset {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer?: string;
  source: string;
  type: 'image' | 'video';
}

export interface StockSearchResponse {
  assets: StockAsset[];
  usage: ProviderUsage;
}

export interface ImageGenerationRequest {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}

export interface ImageGenerationResponse {
  image: Buffer;
  mimeType: string;
  revisedPrompt?: string;
  usage: ProviderUsage;
}
