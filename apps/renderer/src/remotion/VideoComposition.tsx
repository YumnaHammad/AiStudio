import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { VideoTimeline, TimelineScene } from '@acs/rendering';

export interface VideoCompositionProps {
  timeline: VideoTimeline;
}

const SceneBlock: React.FC<{ scene: TimelineScene; theme: VideoTimeline['theme'] }> = ({
  scene,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.ceil((scene.durationMs / 1000) * fps);

  const zoom = interpolate(frame, [0, durationFrames], [1, 1.15], {
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 15, durationFrames - 15, durationFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentCue = scene.subtitleCues.find((cue) => {
    const start = Math.floor((cue.startMs / 1000) * fps);
    const end = Math.floor((cue.endMs / 1000) * fps);
    return frame >= start && frame < end;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.primary, opacity }}>
      {scene.assetUrl && (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, overflow: 'hidden' }}>
          {scene.assetType === 'video' ? (
            <OffthreadVideo
              src={scene.assetUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
            />
          ) : (
            <Img
              src={scene.assetUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background: `linear-gradient(transparent 50%, ${theme.primary}CC 100%)`,
        }}
      />
      {currentCue && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          <span
            style={{
              fontFamily: theme.fontBody,
              fontSize: 42,
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              backgroundColor: `${theme.accent}99`,
              padding: '12px 24px',
              borderRadius: 8,
            }}
          >
            {currentCue.text}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const VideoComposition: React.FC<VideoCompositionProps> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  let frameOffset = 0;
  const introFrames = 90;

  return (
    <AbsoluteFill style={{ backgroundColor: timeline.theme.primary }}>
      <Sequence durationInFrames={introFrames}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${timeline.theme.primary}, ${timeline.theme.secondary})`,
          }}
        >
          <h1
            style={{
              fontFamily: timeline.theme.fontHeading,
              fontSize: 72,
              color: timeline.theme.accent,
              textAlign: 'center',
              padding: '0 80px',
            }}
          >
            {timeline.title}
          </h1>
        </AbsoluteFill>
      </Sequence>

      {timeline.scenes.map((scene) => {
        const durationFrames = Math.ceil((scene.durationMs / 1000) * fps);
        const from = introFrames + frameOffset;
        frameOffset += durationFrames;
        return (
          <Sequence key={scene.orderIndex} from={from} durationInFrames={durationFrames}>
            <SceneBlock scene={scene} theme={timeline.theme} />
          </Sequence>
        );
      })}

      {timeline.voiceAudioUrl && <Audio src={timeline.voiceAudioUrl} />}
    </AbsoluteFill>
  );
};
