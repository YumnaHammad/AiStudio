import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  TtsRequest,
  TtsResponse,
  StockSearchRequest,
  StockSearchResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from './types';

export interface ILlmProvider {
  readonly key: string;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

export interface ITtsProvider {
  readonly key: string;
  synthesize(request: TtsRequest): Promise<TtsResponse>;
}

export interface IStockProvider {
  readonly key: string;
  searchImages(request: StockSearchRequest): Promise<StockSearchResponse>;
  searchVideos(request: StockSearchRequest): Promise<StockSearchResponse>;
}

export interface IImageProvider {
  readonly key: string;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}
