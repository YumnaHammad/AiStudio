import { IStockProvider } from '../interfaces';
import { StockSearchRequest, StockSearchResponse, StockAsset } from '../types';

export class PexelsStockProvider implements IStockProvider {
  readonly key = 'pexels';

  constructor(private readonly apiKey: string) {}

  async searchImages(request: StockSearchRequest): Promise<StockSearchResponse> {
    const params = new URLSearchParams({
      query: request.query,
      per_page: String(request.perPage ?? 5),
      ...(request.orientation ? { orientation: request.orientation } : {}),
    });

    const response = await fetch(
      `https://api.pexels.com/v1/search?${params}`,
      { headers: { Authorization: this.apiKey } },
    );

    if (!response.ok) {
      throw new Error(`Pexels API error (${response.status})`);
    }

    const data = (await response.json()) as {
      photos: Array<{
        id: number;
        width: number;
        height: number;
        photographer: string;
        src: { large: string; medium: string };
      }>;
    };

    const assets: StockAsset[] = data.photos.map((p) => ({
      id: String(p.id),
      url: p.src.large,
      thumbnailUrl: p.src.medium,
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      source: 'pexels',
      type: 'image' as const,
    }));

    return {
      assets,
      usage: { unitType: 'requests', units: 1, costUsd: 0 },
    };
  }

  async searchVideos(request: StockSearchRequest): Promise<StockSearchResponse> {
    const params = new URLSearchParams({
      query: request.query,
      per_page: String(request.perPage ?? 3),
    });

    const response = await fetch(
      `https://api.pexels.com/videos/search?${params}`,
      { headers: { Authorization: this.apiKey } },
    );

    if (!response.ok) {
      throw new Error(`Pexels Videos API error (${response.status})`);
    }

    const data = (await response.json()) as {
      videos: Array<{
        id: number;
        width: number;
        height: number;
        user: { name: string };
        video_files: Array<{ link: string; width: number }>;
        image: string;
      }>;
    };

    const assets: StockAsset[] = data.videos.map((v) => {
      const best = v.video_files.sort((a, b) => b.width - a.width)[0];
      return {
        id: String(v.id),
        url: best?.link ?? '',
        thumbnailUrl: v.image,
        width: v.width,
        height: v.height,
        photographer: v.user.name,
        source: 'pexels',
        type: 'video' as const,
      };
    });

    return {
      assets,
      usage: { unitType: 'requests', units: 1, costUsd: 0 },
    };
  }
}
