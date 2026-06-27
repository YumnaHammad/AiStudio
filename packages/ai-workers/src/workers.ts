import { WorkerKey } from '@acs/shared';
import { IWorker, WorkerContext, WorkerResult } from './types';
import { interpolatePrompt, llmJson } from './utils';

function zeroUsage(): import('@acs/providers').ProviderUsage {
  return { units: 0, unitType: 'tokens', costUsd: 0 };
}

function splitCustomScriptIntoScenes(
  script: string,
  voiceDurationMs: number,
): Array<Record<string, unknown>> {
  const paragraphs = script
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks =
    paragraphs.length > 1
      ? paragraphs
      : script.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

  const safeChunks = chunks.length > 0 ? chunks : [script.trim()];
  const totalMs = voiceDurationMs > 0 ? voiceDurationMs : safeChunks.length * 5000;
  const durationMs = Math.max(3000, Math.floor(totalMs / safeChunks.length));

  return safeChunks.map((narration, orderIndex) => ({
    orderIndex,
    narration,
    durationMs,
    subtitle: { cues: [] },
    animation: 'fade',
    transition: 'crossfade',
    layout: 'centered',
    cameraEffect: 'ken-burns',
    background: { type: 'gradient' },
  }));
}

function baseResult(
  ctx: WorkerContext,
  artifact: Record<string, unknown>,
  usage: import('@acs/providers').ProviderUsage,
  model?: string,
): WorkerResult {
  return {
    success: true,
    artifact,
    usage,
    provider: ctx.providerKey,
    model,
    logs: [{ level: 'INFO', message: `${ctx.workerKey} completed` }],
  };
}

export class ResearchWorker implements IWorker {
  readonly key = WorkerKey.RESEARCH;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      language: ctx.project.language,
      duration_target: ctx.project.durationTarget,
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, { content: data, summary: data.summary }, usage, model);
  }
}

export class FactCheckerWorker implements IWorker {
  readonly key = WorkerKey.FACT_CHECKER;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const research = ctx.artifacts.research;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      research: JSON.stringify(research),
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, { verifiedResearch: data.verifiedResearch ?? data, score: data.overallScore, approved: data.approved }, usage, model);
  }
}

export class ScriptWorker implements IWorker {
  readonly key = WorkerKey.SCRIPT;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      language: ctx.project.language,
      video_style: ctx.project.videoStyle,
      duration_target: ctx.project.durationTarget,
      verified_research: ctx.artifacts.verifiedResearch ?? ctx.artifacts.research,
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    const fullScript = (data.fullScript as string) ?? '';
    return baseResult(ctx, {
      title: data.title,
      hook: data.hook,
      sections: data.sections,
      content: fullScript,
      wordCount: data.wordCount ?? fullScript.split(/\s+/).length,
      estimatedDurationSeconds: data.estimatedDurationSeconds,
    }, usage, model);
  }
}

export class TranslationWorker implements IWorker {
  readonly key = WorkerKey.TRANSLATION;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      script: script.content,
      source_language: ctx.project.language,
      target_language: ctx.project.language,
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, {
      content: data.translatedScript ?? script.content,
      language: data.language ?? ctx.project.language,
      notes: data.notes,
    }, usage, model);
  }
}

export class VoiceWorker implements IWorker {
  readonly key = WorkerKey.VOICE;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.translation as Record<string, unknown> | undefined;
    const scriptContent = (script?.content ?? (ctx.artifacts.script as Record<string, unknown>)?.content) as string;

    let text: string;
    let model: string | undefined;

    if (process.env.COST_SAVER_MODE === 'true') {
      // Skip extra LLM call — use script directly (saves ~1 API call per video)
      const maxChars = parseInt(process.env.COST_SAVER_MAX_VOICE_CHARS ?? '2500', 10);
      text = scriptContent.slice(0, maxChars);
    } else {
      const prompt = interpolatePrompt(ctx.prompt.content, {
        script: scriptContent,
        language: ctx.project.language,
        video_style: ctx.project.videoStyle,
      });
      const llmResult = await llmJson<{ text: string }>(ctx, prompt);
      text = llmResult.data.text ?? scriptContent;
      model = llmResult.model;
    }

    const tts = ctx.providers.resolveForWorker(WorkerKey.VOICE, ctx.providerKey) as import('@acs/providers').ITtsProvider;
    const audio = await tts.synthesize({ text });

    return {
      success: true,
      artifact: {
        text,
        mimeType: audio.mimeType,
        audioBase64: audio.audio.toString('base64'),
        durationMs: audio.durationMs ?? Math.ceil(text.split(/\s+/).length / 150 * 60 * 1000),
        wordTimings: [],
      },
      usage: audio.usage,
      provider: ctx.providerKey,
      model,
      logs: [{ level: 'INFO', message: 'Voice synthesis completed' }],
    };
  }
}

export class ScenePlannerWorker implements IWorker {
  readonly key = WorkerKey.SCENE_PLANNER;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    if (ctx.project.customScript?.trim()) {
      const voice = ctx.artifacts.voice as { durationMs?: number } | undefined;
      const scenes = splitCustomScriptIntoScenes(
        ctx.project.customScript.trim(),
        voice?.durationMs ?? 0,
      );
      const totalDurationMs = scenes.reduce(
        (sum, scene) => sum + ((scene.durationMs as number) ?? 0),
        0,
      );
      return baseResult(
        ctx,
        { scenes, totalDurationMs },
        zeroUsage(),
      );
    }

    const script = ctx.artifacts.script as Record<string, unknown>;
    const voice = ctx.artifacts.voice as Record<string, unknown>;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      video_style: ctx.project.videoStyle,
      script: script.content,
      word_timings: voice.wordTimings ?? [],
    });
    const { data, usage, model } = await llmJson<{ scenes: unknown[]; totalDurationMs?: number }>(ctx, prompt);
    return baseResult(ctx, { scenes: data.scenes, totalDurationMs: data.totalDurationMs }, usage, model);
  }
}

interface AssetSearchPlan {
  sceneIndex: number;
  imageQueries?: string[];
  videoQueries?: string[];
  preferredType?: string;
}

function isCinematicStyle(videoStyle?: string | null): boolean {
  return ['DOCUMENTARY', 'STORYTELLING', 'MOTIVATIONAL'].includes(videoStyle ?? '');
}

async function resolveStockAsset(
  stock: import('@acs/providers').IStockProvider,
  search: AssetSearchPlan,
  topic: string,
  cinematic: boolean,
): Promise<import('@acs/providers').StockAsset | undefined> {
  const preferVideo = cinematic || search.preferredType?.toUpperCase() !== 'IMAGE';
  const videoQueries = search.videoQueries?.length
    ? search.videoQueries
    : search.imageQueries?.length
      ? search.imageQueries
      : [topic];
  const imageQueries = search.imageQueries?.length ? search.imageQueries : [topic];
  const cinematicTerms = cinematic ? ' cinematic film' : '';

  const searchOpts = { perPage: 5, orientation: 'landscape' as const };

  if (preferVideo) {
    for (const query of videoQueries) {
      try {
        const result = await stock.searchVideos({
          query: `${query}${cinematicTerms}`.trim(),
          ...searchOpts,
        });
        if (result.assets[0]) return result.assets[0];
      } catch {
        // try next query
      }
    }
  }

  for (const query of imageQueries) {
    try {
      const result = await stock.searchImages({ query, ...searchOpts });
      if (result.assets[0]) return result.assets[0];
    } catch {
      // try next query
    }
  }

  return undefined;
}

export class AssetFinderWorker implements IWorker {
  readonly key = WorkerKey.ASSET_FINDER;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const scenes = ctx.artifacts.scenes as { scenes: Array<{ assetKeywords?: string[]; visualDescription?: string }> };
    const cinematic = isCinematicStyle(ctx.project.videoStyle);
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      video_style: ctx.project.videoStyle ?? 'cinematic',
      scenes: JSON.stringify(scenes.scenes),
    });
    const { data, usage, model } = await llmJson<{ assetSearches: AssetSearchPlan[] }>(ctx, prompt);

    const assets: unknown[] = [];
    try {
      const stock = ctx.providers.resolveForWorker(WorkerKey.ASSET_FINDER, ctx.providerKey) as import('@acs/providers').IStockProvider;
      for (const search of data.assetSearches ?? []) {
        const asset = await resolveStockAsset(stock, search, ctx.project.topic, cinematic);
        if (asset) {
          assets.push({ sceneIndex: search.sceneIndex, asset });
        }
      }
    } catch {
      // Free testing: continue without stock API keys (Pexels/Pixabay are optional)
    }

    return baseResult(ctx, { assetSearches: data.assetSearches, resolvedAssets: assets }, usage, model);
  }
}

export class ThumbnailWorker implements IWorker {
  readonly key = WorkerKey.THUMBNAIL;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      title: script.title ?? ctx.project.topic,
      video_style: ctx.project.videoStyle,
    });
    const { data, usage, model } = await llmJson<{ imagePrompt: string }>(ctx, prompt);

    if (process.env.COST_SAVER_SKIP_THUMBNAIL === 'true') {
      return {
        success: true,
        artifact: {
          promptUsed: data.imagePrompt,
          skipped: true,
          note: 'Thumbnail image skipped in cost-saver mode',
        },
        usage,
        provider: ctx.providerKey,
        model,
        logs: [{ level: 'INFO', message: 'Thumbnail skipped (cost-saver mode)' }],
      };
    }

    const images = ctx.providers.resolveForWorker(WorkerKey.THUMBNAIL, ctx.providerKey) as import('@acs/providers').IImageProvider;
    const image = await images.generate({
      prompt: data.imagePrompt,
      size: process.env.COST_SAVER_MODE === 'true' ? '1024x1024' : '1792x1024',
    });

    return {
      success: true,
      artifact: {
        imageBase64: image.image.toString('base64'),
        mimeType: image.mimeType,
        promptUsed: data.imagePrompt,
        revisedPrompt: image.revisedPrompt,
      },
      usage: {
        unitType: 'images',
        units: 1,
        costUsd: image.usage.costUsd + usage.costUsd,
      },
      provider: ctx.providerKey,
      model,
      logs: [{ level: 'INFO', message: 'Thumbnail generated' }],
    };
  }
}

export class SeoWorker implements IWorker {
  readonly key = WorkerKey.SEO;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      title: script.title,
      platform: ctx.project.platform,
      script: (script.content as string).slice(0, 2000),
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, data, usage, model);
  }
}

export class PodcastWorker implements IWorker {
  readonly key = WorkerKey.PODCAST;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      title: script.title,
      script: script.content,
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, data, usage, model);
  }
}

export class SocialMediaWorker implements IWorker {
  readonly key = WorkerKey.SOCIAL_MEDIA;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const seo = ctx.artifacts.seo;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      title: script.title,
      platforms: ['youtube', 'instagram', 'tiktok', 'x', 'linkedin'],
      seo,
    });
    const { data, usage, model } = await llmJson<{ posts: unknown[] }>(ctx, prompt);
    return baseResult(ctx, { posts: data.posts }, usage, model);
  }
}

export class QualityCheckWorker implements IWorker {
  readonly key = WorkerKey.QUALITY_CHECK;

  async execute(ctx: WorkerContext): Promise<WorkerResult> {
    const script = ctx.artifacts.script as Record<string, unknown>;
    const scenes = ctx.artifacts.scenes;
    const prompt = interpolatePrompt(ctx.prompt.content, {
      topic: ctx.project.topic,
      script: script.content,
      scenes,
      seo: ctx.artifacts.seo,
    });
    const { data, usage, model } = await llmJson<Record<string, unknown>>(ctx, prompt);
    return baseResult(ctx, data, usage, model);
  }
}
