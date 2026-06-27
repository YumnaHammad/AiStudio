'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input, Label, Select, Textarea, Badge } from '@/components/ui/Input';
import { apiClient, ApiRequestError } from '@/lib/api';
import { formatDate, workerLabel } from '@/lib/utils';
import { WORKER_PIPELINE_ORDER } from '@/lib/types';
import type { Prompt } from '@/lib/types';

export default function PromptsPage() {
  const queryClient = useQueryClient();
  const [workerFilter, setWorkerFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkerKey, setNewWorkerKey] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [versionContent, setVersionContent] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['prompts', workerFilter],
    queryFn: () => apiClient.prompts.list(workerFilter || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.prompts.create({
        workerKey: newWorkerKey,
        purpose: newPurpose,
        description: newDescription || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setShowCreate(false);
      setNewWorkerKey('');
      setNewPurpose('');
      setNewDescription('');
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to create prompt');
    },
  });

  const versionMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiClient.prompts.createVersion(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setVersionContent({});
    },
  });

  const activateMutation = useMutation({
    mutationFn: ({ promptId, versionId }: { promptId: string; versionId: string }) =>
      apiClient.prompts.activateVersion(promptId, versionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompts'] }),
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Prompts"
        description="Manage AI prompt templates for each worker stage"
        action={
          <Button className="w-full sm:w-auto" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            New prompt
          </Button>
        }
      />

      <Select
        className="w-full max-w-none sm:max-w-xs"
        value={workerFilter}
        onChange={(e) => setWorkerFilter(e.target.value)}
      >
        <option value="">All workers</option>
        {WORKER_PIPELINE_ORDER.map((key) => (
          <option key={key} value={key}>
            {workerLabel(key)}
          </option>
        ))}
      </Select>

      {showCreate && (
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Create prompt</CardTitle>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label required>Worker</Label>
              <Select
                value={newWorkerKey}
                onChange={(e) => setNewWorkerKey(e.target.value)}
                required
              >
                <option value="">Select worker…</option>
                {WORKER_PIPELINE_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {workerLabel(key)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>Purpose</Label>
              <Input
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={createMutation.isPending}>
                Create
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load prompts: {(error as Error).message}
        </div>
      )}

      {prompts && prompts.length === 0 && (
        <Card className="flex flex-col items-center py-16 text-center">
          <MessageSquareText className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-300">No prompts configured</p>
        </Card>
      )}

      <div className="space-y-3">
        {prompts?.map((prompt: Prompt) => {
          const expanded = expandedId === prompt.id;
          const activeVersion = prompt.versions?.find((v) => v.isActive);

          return (
            <Card key={prompt.id} padding="none" className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(prompt.id)}
                className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-surface/50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-100">{prompt.purpose}</span>
                    <Badge className="text-violet-400 bg-violet-400/10 border-violet-400/20">
                      {workerLabel(prompt.workerKey)}
                    </Badge>
                  </div>
                  {prompt.description && (
                    <p className="mt-0.5 text-sm text-zinc-500">{prompt.description}</p>
                  )}
                </div>
                {expanded ? (
                  <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
                ) : (
                  <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
                )}
              </button>

              {expanded && (
                <div className="border-t border-zinc-800 px-4 py-4 sm:px-6">
                  <CardDescription className="mb-3">
                    {prompt.versions?.length ?? 0} version(s)
                    {activeVersion && ` · Active: v${activeVersion.version}`}
                  </CardDescription>

                  <div className="space-y-2">
                    {prompt.versions?.map((version) => (
                      <div
                        key={version.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-surface px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-medium text-zinc-200">
                            Version {version.version}
                          </span>
                          {version.isActive && (
                            <Badge className="ml-2 text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                              Active
                            </Badge>
                          )}
                          <p className="text-xs text-zinc-500">
                            {formatDate(version.createdAt)}
                          </p>
                        </div>
                        {!version.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={activateMutation.isPending}
                            onClick={() =>
                              activateMutation.mutate({
                                promptId: prompt.id,
                                versionId: version.id,
                              })
                            }
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>New version content</Label>
                    <Textarea
                      placeholder="Enter prompt template with {{variables}}…"
                      value={versionContent[prompt.id] ?? ''}
                      onChange={(e) =>
                        setVersionContent((prev) => ({
                          ...prev,
                          [prompt.id]: e.target.value,
                        }))
                      }
                      className="min-h-[120px] font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={!versionContent[prompt.id]?.trim()}
                      loading={versionMutation.isPending}
                      onClick={() =>
                        versionMutation.mutate({
                          id: prompt.id,
                          content: versionContent[prompt.id]!,
                        })
                      }
                    >
                      Save new version
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
