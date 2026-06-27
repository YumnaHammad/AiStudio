'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { apiClient, ApiRequestError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Campaign } from '@/lib/types';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.campaigns.list(1, 100),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.campaigns.create({ name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      resetForm();
    },
    onError: (err) => {
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to create campaign');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient.campaigns.update(editing!.id, {
        name,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      resetForm();
    },
    onError: (err) => {
      setFormError(err instanceof ApiRequestError ? err.message : 'Failed to update campaign');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.campaigns.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setName('');
    setDescription('');
    setFormError('');
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setName(campaign.name);
    setDescription(campaign.description ?? '');
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const campaigns = data?.data ?? [];

  return (
    <div className="page-stack">
      <PageHeader
        title="Campaigns"
        description="Organize content projects into thematic campaigns"
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        }
      />

      {showForm && (
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>{editing ? 'Edit campaign' : 'New campaign'}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Save changes' : 'Create campaign'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
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
          Failed to load campaigns: {(error as Error).message}
        </div>
      )}

      {campaigns.length === 0 && !isLoading && (
        <Card className="flex flex-col items-center py-16 text-center">
          <Megaphone className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-300">No campaigns yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create a campaign to group related content projects
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="flex flex-col">
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-100">{campaign.name}</h3>
              {campaign.description && (
                <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                  {campaign.description}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                Created {formatDate(campaign.createdAt)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
              <Link href={`/projects/new?campaignId=${campaign.id}`}>
                <Button size="sm" variant="secondary">
                  <Plus className="h-3.5 w-3.5" />
                  Add project
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => openEdit(campaign)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete campaign "${campaign.name}"?`)) {
                    deleteMutation.mutate(campaign.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
