'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { apiClient, ApiRequestError } from '@/lib/api';
import type { VideoPlatform, VideoStyle } from '@/lib/types';

const createProjectSchema = z.object({
  campaignId: z.string().uuid('Select a campaign'),
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(500),
  language: z.string().max(10).optional(),
  videoStyle: z
    .enum([
      'DOCUMENTARY',
      'NEWS',
      'EDUCATIONAL',
      'STORYTELLING',
      'MOTIVATIONAL',
      'PODCAST',
    ])
    .optional(),
  platform: z
    .enum([
      'YOUTUBE',
      'TIKTOK',
      'INSTAGRAM',
      'FACEBOOK',
      'LINKEDIN',
      'PINTEREST',
      'X',
      'GENERIC',
    ])
    .optional(),
  durationTarget: z.coerce.number().min(30).max(180).optional(),
  autoApprove: z.boolean().optional(),
  customScript: z.string().max(10000).optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface CreateProjectFormProps {
  defaultCampaignId?: string;
}

export function CreateProjectForm({ defaultCampaignId }: CreateProjectFormProps) {
  const router = useRouter();

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => apiClient.campaigns.list(1, 100),
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      campaignId: defaultCampaignId ?? '',
      language: 'en',
      platform: 'GENERIC',
      durationTarget: 120,
      autoApprove: true,
    },
  });

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      const result = await apiClient.projects.create({
        campaignId: data.campaignId,
        topic: data.topic,
        language: data.language,
        videoStyle: data.videoStyle,
        platform: data.platform,
        durationTarget: data.durationTarget,
        autoApprove: data.autoApprove,
        customScript: data.customScript?.trim() || undefined,
      });
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to create project';
      setError('root', { message });
    }
  };

  const campaigns = campaignsData?.data ?? [];

  return (
    <Card className="max-w-2xl w-full">
      <CardHeader>
        <CardTitle>New Project</CardTitle>
        <CardDescription>
          Create a content project and start the AI production pipeline
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="campaignId" required>
            Campaign
          </Label>
          <Select
            id="campaignId"
            disabled={campaignsLoading}
            error={errors.campaignId?.message}
            {...register('campaignId')}
          >
            <option value="">Select campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="topic" required>
            Topic
          </Label>
          <Textarea
            id="topic"
            placeholder="Short title, e.g. Cartoon characters playing in a park"
            error={errors.topic?.message}
            {...register('topic')}
          />
        </div>

        <div>
          <Label htmlFor="customScript">Your script (optional)</Label>
          <Textarea
            id="customScript"
            rows={8}
            placeholder="Paste your full narration script here. When provided, the AI will NOT rewrite it — voice and scenes use your exact words."
            error={errors.customScript?.message}
            {...register('customScript')}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Leave empty to let AI research and write a script from the topic only.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="language">Language</Label>
            <Input id="language" placeholder="en" {...register('language')} />
          </div>
          <div>
            <Label htmlFor="durationTarget">Duration target (seconds)</Label>
            <Input
              id="durationTarget"
              type="number"
              min={30}
              max={180}
              placeholder="120"
              error={errors.durationTarget?.message}
              {...register('durationTarget')}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="videoStyle">Video style</Label>
            <Select id="videoStyle" {...register('videoStyle')}>
              <option value="">Default</option>
              {(
                [
                  'DOCUMENTARY',
                  'NEWS',
                  'EDUCATIONAL',
                  'STORYTELLING',
                  'MOTIVATIONAL',
                  'PODCAST',
                ] as VideoStyle[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select id="platform" {...register('platform')}>
              {(
                [
                  'GENERIC',
                  'YOUTUBE',
                  'TIKTOK',
                  'INSTAGRAM',
                  'FACEBOOK',
                  'LINKEDIN',
                  'PINTEREST',
                  'X',
                ] as VideoPlatform[]
              ).map((p) => (
                <option key={p} value={p}>
                  {p === 'X' ? 'X (Twitter)' : p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-600 bg-surface text-accent focus:ring-accent"
            {...register('autoApprove')}
          />
          <span className="text-sm text-zinc-300">Auto-approve script when ready</span>
        </label>

        {errors.root && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
            Create & start pipeline
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push('/projects')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
