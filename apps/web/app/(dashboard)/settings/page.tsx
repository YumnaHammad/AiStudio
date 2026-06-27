'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, User, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PageHeader } from '@/components/PageHeader';
import { Input, Label, Select } from '@/components/ui/Input';
import { apiClient, ApiRequestError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import type { UserRole } from '@/lib/types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [keyProvider, setKeyProvider] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyError, setKeyError] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('EDITOR');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => apiClient.users.me(),
  });

  const { data: members } = useQuery({
    queryKey: ['users', 'members'],
    queryFn: () => apiClient.users.members(),
    enabled: isAdmin,
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.apiKeys.list(),
    enabled: isAdmin,
  });

  const passwordMutation = useMutation({
    mutationFn: () => apiClient.auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordMessage('Password updated successfully');
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err) => {
      setPasswordError(
        err instanceof ApiRequestError ? err.message : 'Failed to change password',
      );
      setPasswordMessage('');
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: () =>
      apiClient.apiKeys.create({
        provider: keyProvider,
        label: keyLabel,
        key: keyValue,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreatedKey('maskedKey' in data ? String(data.maskedKey) : null);
      setKeyProvider('');
      setKeyLabel('');
      setKeyValue('');
      setKeyError('');
    },
    onError: (err) => {
      setKeyError(err instanceof ApiRequestError ? err.message : 'Failed to create API key');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => apiClient.apiKeys.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const inviteMutation = useMutation({
    mutationFn: () => apiClient.auth.invite(inviteEmail, inviteRole),
    onSuccess: () => {
      setInviteMessage(`Invitation sent to ${inviteEmail}`);
      setInviteError('');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['users', 'members'] });
    },
    onError: (err) => {
      setInviteError(err instanceof ApiRequestError ? err.message : 'Failed to send invite');
      setInviteMessage('');
    },
  });

  const workspace = profile?.memberships?.[0]?.workspace;

  return (
    <div className="page-stack sm:space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your profile, team, and integrations"
      />

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            Profile
          </CardTitle>
        </CardHeader>
        {profile && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Name</dt>
              <dd className="text-zinc-200">
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-zinc-200">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Role</dt>
              <dd className="text-zinc-200">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Workspace</dt>
              <dd className="text-zinc-200">{workspace?.name ?? '—'}</dd>
            </div>
            {profile.lastLoginAt && (
              <div>
                <dt className="text-zinc-500">Last login</dt>
                <dd className="text-zinc-200">{formatDate(profile.lastLoginAt)}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            Change password
          </CardTitle>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            passwordMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <Label required>Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {passwordMessage && (
            <p className="text-sm text-emerald-400">{passwordMessage}</p>
          )}
          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          <Button type="submit" loading={passwordMutation.isPending}>
            Update password
          </Button>
        </form>
      </Card>

      {isAdmin && (
        <>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Team members
              </CardTitle>
              <CardDescription>
                Invite collaborators to {workspace?.name ?? 'your workspace'}
              </CardDescription>
            </CardHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
              className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            >
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="min-w-0 flex-1"
                required
              />
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full sm:w-32"
              >
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </Select>
              <Button type="submit" loading={inviteMutation.isPending} className="w-full sm:w-auto">
                Invite
              </Button>
            </form>
            {inviteMessage && (
              <p className="mb-4 text-sm text-emerald-400">{inviteMessage}</p>
            )}
            {inviteError && <p className="mb-4 text-sm text-red-400">{inviteError}</p>}

            <div className="space-y-2">
              {members?.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-xs text-zinc-500">{member.user.email}</p>
                  </div>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-accent" />
                API keys
              </CardTitle>
              <CardDescription>
                Store provider credentials for AI and media services
              </CardDescription>
            </CardHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createKeyMutation.mutate();
              }}
              className="mb-6 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label required>Provider</Label>
                  <Input
                    placeholder="openai"
                    value={keyProvider}
                    onChange={(e) => setKeyProvider(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label required>Label</Label>
                  <Input
                    placeholder="Production key"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label required>API key</Label>
                <Input
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  required
                />
              </div>
              {keyError && <p className="text-sm text-red-400">{keyError}</p>}
              {createdKey && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                  Key created ({createdKey}). The full key is stored encrypted and cannot be retrieved.
                </p>
              )}
              <Button type="submit" loading={createKeyMutation.isPending}>
                Add API key
              </Button>
            </form>

            <div className="space-y-2">
              {apiKeys?.length === 0 && (
                <p className="text-sm text-zinc-500">No API keys configured.</p>
              )}
              {apiKeys?.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{key.label}</p>
                    <p className="text-xs text-zinc-500">
                      {key.provider} · Added {formatDate(key.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    loading={deleteKeyMutation.isPending}
                    onClick={() => {
                      if (confirm(`Delete API key "${key.label}"?`)) {
                        deleteKeyMutation.mutate(key.id);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
