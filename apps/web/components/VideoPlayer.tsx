'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface VideoPlayerProps {
  projectId: string;
  videoId: string;
  topic: string;
}

export function VideoPlayer({ projectId, videoId, topic }: VideoPlayerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadVideo() {
      try {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(
          `${BASE_URL}/projects/${projectId}/videos/${videoId}/stream`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(
            (json as { message?: string })?.message ?? 'Failed to load video',
          );
        }

        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load video');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVideo();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, videoId]);

  const handleDownload = () => {
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${topic.replace(/[^\w\- ]+/g, '').trim() || 'video'}.mp4`;
    anchor.click();
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-zinc-800 bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? 'Video unavailable'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <video
        controls
        playsInline
        className="w-full rounded-lg border border-zinc-800 bg-black"
        src={url}
      />
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-4 w-4" />
        Download MP4
      </Button>
    </div>
  );
}
