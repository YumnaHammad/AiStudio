import { RenderVariationSelections, SubtitleCue } from '@acs/shared';

export interface TimelineScene {
  orderIndex: number;
  narration: string;
  durationMs: number;
  subtitleCues: SubtitleCue[];
  animation: string;
  transition: string;
  layout: string;
  cameraEffect: string;
  background: Record<string, unknown>;
  assetUrl?: string;
  assetType?: 'image' | 'video';
}

export interface VideoTimeline {
  projectId: string;
  videoId: string;
  title: string;
  totalDurationMs: number;
  fps: number;
  width: number;
  height: number;
  voiceAudioUrl: string;
  musicTrack?: string;
  selections: RenderVariationSelections;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    fontHeading: string;
    fontBody: string;
  };
  scenes: TimelineScene[];
  intro: string;
  outro: string;
}

export interface TimelineBuildInput {
  projectId: string;
  videoId: string;
  title: string;
  voiceAudioUrl: string;
  voiceDurationMs: number;
  selections: RenderVariationSelections;
  scenes: Array<{
    orderIndex: number;
    narration: string;
    durationMs: number;
    subtitle?: { cues?: SubtitleCue[] };
    animation?: string | null;
    transition?: string | null;
    layout?: string | null;
    cameraEffect?: string | null;
    background?: Record<string, unknown>;
    asset?: { externalUrl?: string | null; r2Path?: string | null; type?: string };
  }>;
  colorPalette?: { primary: string; secondary: string; accent: string };
}

const PALETTE_MAP: Record<string, { primary: string; secondary: string; accent: string }> = {
  'sepia-classic': { primary: '#2C1810', secondary: '#8B7355', accent: '#D4A574' },
  'navy-gold': { primary: '#1A1A2E', secondary: '#16213E', accent: '#C9A227' },
  'earth-tone': { primary: '#3E2723', secondary: '#5D4037', accent: '#A1887F' },
  'news-blue': { primary: '#0D47A1', secondary: '#1565C0', accent: '#FFC107' },
  'edu-blue': { primary: '#1E88E5', secondary: '#E3F2FD', accent: '#FF6F00' },
  default: { primary: '#1A1A2E', secondary: '#16213E', accent: '#C9A227' },
};

export function buildTimeline(input: TimelineBuildInput): VideoTimeline {
  const palette = PALETTE_MAP[input.selections.colorPalette] ?? PALETTE_MAP.default!;

  const scenes: TimelineScene[] = input.scenes.map((scene) => ({
    orderIndex: scene.orderIndex,
    narration: scene.narration,
    durationMs: scene.durationMs,
    subtitleCues: scene.subtitle?.cues ?? generateCuesFromNarration(scene.narration, scene.durationMs),
    animation: scene.animation ?? input.selections.animation,
    transition: scene.transition ?? input.selections.transition,
    layout: scene.layout ?? input.selections.layout,
    cameraEffect: scene.cameraEffect ?? input.selections.cameraEffect,
    background: scene.background ?? { type: input.selections.background },
    assetUrl: scene.asset?.externalUrl ?? scene.asset?.r2Path ?? undefined,
    assetType: scene.asset?.type?.toLowerCase() === 'video' ? 'video' : 'image',
  }));

  const totalDurationMs = scenes.reduce((sum, s) => sum + s.durationMs, 0) + 6000;

  return {
    projectId: input.projectId,
    videoId: input.videoId,
    title: input.title,
    totalDurationMs: Math.max(totalDurationMs, input.voiceDurationMs + 4000),
    fps: 30,
    width: 1920,
    height: 1080,
    voiceAudioUrl: input.voiceAudioUrl,
    musicTrack: input.selections.musicTrack,
    selections: input.selections,
    theme: {
      ...palette,
      fontHeading: input.selections.fontHeading,
      fontBody: input.selections.fontBody,
    },
    scenes,
    intro: input.selections.intro,
    outro: input.selections.outro,
  };
}

function generateCuesFromNarration(narration: string, durationMs: number): SubtitleCue[] {
  const words = narration.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const msPerWord = durationMs / words.length;
  const chunkSize = 6;
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    cues.push({
      startMs: Math.floor(i * msPerWord),
      endMs: Math.floor(Math.min((i + chunkSize) * msPerWord, durationMs)),
      text: chunk,
    });
  }
  return cues;
}
