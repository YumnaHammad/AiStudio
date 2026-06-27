import { Composition } from 'remotion';
import { VideoComposition, VideoCompositionProps } from './VideoComposition';
import type { VideoTimeline } from '@acs/rendering';

const defaultTimeline: VideoTimeline = {
  projectId: 'preview',
  videoId: 'preview',
  title: 'Preview',
  totalDurationMs: 30000,
  fps: 30,
  width: 1920,
  height: 1080,
  voiceAudioUrl: '',
  selections: {
    templateKey: 'history-documentary',
    layout: 'full-bleed',
    animation: 'ken-burns-zoom-in',
    transition: 'dissolve-500',
    subtitleStyle: 'cinematic-bottom',
    fontHeading: 'Playfair Display',
    fontBody: 'Source Sans Pro',
    intro: 'title-fade',
    outro: 'fade-to-black',
    background: 'dark-gradient',
    imagePosition: 'center',
    cameraEffect: 'slow-zoom-in',
    musicTrack: 'ambient-cinematic',
    colorPalette: 'navy-gold',
  },
  theme: {
    primary: '#1A1A2E',
    secondary: '#16213E',
    accent: '#C9A227',
    fontHeading: 'Playfair Display',
    fontBody: 'Source Sans Pro',
  },
  scenes: [],
  intro: 'title-fade',
  outro: 'fade-to-black',
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ timeline: defaultTimeline }}
        calculateMetadata={({ props }) => {
          const timeline = (props as unknown as VideoCompositionProps).timeline;
          return {
            durationInFrames: Math.ceil((timeline.totalDurationMs / 1000) * 30),
          };
        }}
      />
    </>
  );
};
