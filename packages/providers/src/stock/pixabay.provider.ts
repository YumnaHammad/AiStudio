import { IStockProvider } from '../interfaces';
import { StockSearchRequest, StockSearchResponse, StockAsset } from '../types';

export class PixabayStockProvider implements IStockProvider {
  readonly key = 'pixabay';

  constructor(private readonly apiKey: string) {}

  async searchImages(request: StockSearchRequest): Promise<StockSearchResponse> {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: request.query,
      per_page: String(request.perPage ?? 5),
      image_type: 'photo',
    });

    const response = await fetch(`https://pixabay.com/api/?${params}`);
    if (!response.ok) throw new Error(`Pixabay API error (${response.status})`);

    const data = (await response.json()) as {
      hits: Array<{
        id: number;
        largeImageURL: string;
        previewURL: string;
        imageWidth: number;
        imageHeight: number;
        user: string;
      }>;
    };

    const assets: StockAsset[] = data.hits.map((h) => ({
      id: String(h.id),
      url: h.largeImageURL,
      thumbnailUrl: h.previewURL,
      width: h.imageWidth,
      height: h.imageHeight,
      photographer: h.user,
      source: 'pixabay',
      type: 'image' as const,
    }));

    return {
      assets,
      usage: { unitType: 'requests', units: 1, costUsd: 0 },
    };
  }

  async searchVideos(request: StockSearchRequest): Promise<StockSearchResponse> {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: request.query,
      per_page: String(request.perPage ?? 3),
    });

    const response = await fetch(`https://pixabay.com/api/videos/?${params}`);
    if (!response.ok) throw new Error(`Pixabay Videos API error (${response.status})`);

    const data = (await response.json()) as {
      hits: Array<{
        id: number;
        videos: { large: { url: string; width: number; height: number } };
        user: string;
        picture_id: string;
      }>;
    };

    const assets: StockAsset[] = data.hits.map((h) => ({
      id: String(h.id),
      url: h.videos.large.url,
      thumbnailUrl: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`,
      width: h.videos.large.width,
      height: h.videos.large.height,
      photographer: h.user,
      source: 'pixabay',
      type: 'video' as const,
    }));

    return {
      assets,
      usage: { unitType: 'requests', units: 1, costUsd: 0 },
    };
  }
}
