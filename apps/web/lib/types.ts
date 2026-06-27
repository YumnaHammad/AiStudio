export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type ProjectStatus =
  | 'DRAFT'
  | 'RUNNING'
  | 'AWAITING_APPROVAL'
  | 'RENDERING'
  | 'PUBLISHING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type WorkflowStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'AWAITING_WORKER'
  | 'AWAITING_APPROVAL'
  | 'RENDERING'
  | 'PUBLISHING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type WorkerStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export type VideoPlatform =
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'LINKEDIN'
  | 'PINTEREST'
  | 'X'
  | 'GENERIC';

export type VideoStyle =
  | 'DOCUMENTARY'
  | 'NEWS'
  | 'EDUCATIONAL'
  | 'STORYTELLING'
  | 'MOTIVATIONAL'
  | 'PODCAST';

export const WORKER_PIPELINE_ORDER = [
  'RESEARCH',
  'FACT_CHECKER',
  'SCRIPT',
  'TRANSLATION',
  'VOICE',
  'SCENE_PLANNER',
  'ASSET_FINDER',
  'THUMBNAIL',
  'SEO',
  'PODCAST',
  'SOCIAL_MEDIA',
  'QUALITY_CHECK',
] as const;

export type WorkerKey = (typeof WORKER_PIPELINE_ORDER)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  workspaceId: string;
  organizationId: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthenticatedUser;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  correlationId?: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
}

export interface ProjectSummary {
  id: string;
  topic: string;
  status: ProjectStatus;
  language: string;
  platform: VideoPlatform;
  videoStyle: VideoStyle | null;
  createdAt: string;
  updatedAt: string;
  campaign?: { id: string; name: string };
  workflowExecutions?: Array<{
    id: string;
    status: WorkflowStatus;
    currentStep: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

export interface ProjectDetail extends ProjectSummary {
  durationTarget: number | null;
  settings?: { autoApprove: boolean } | null;
  campaign: Campaign;
  workflowExecutions: Array<{
    id: string;
    status: WorkflowStatus;
    currentStep: string | null;
    startedAt: string | null;
    completedAt: string | null;
    workerExecutions: WorkerExecution[];
  }>;
  videos?: Array<{
    id: string;
    status: string;
    version: number;
    r2PathRaw: string | null;
    r2PathOptimized: string | null;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    sizeBytes: string | null;
  }>;
  scriptArtifacts?: Array<{
    id: string;
    content: string;
    wordCount: number;
    version: number;
  }>;
}

export interface WorkerExecution {
  id: string;
  workerKey: string;
  status: WorkerStatus;
  provider: string | null;
  costUsd: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  promptVersion?: { id: string; version: number; promptId: string } | null;
  _count?: { logs: number };
}

export interface WorkflowExecution {
  id: string;
  status: WorkflowStatus;
  currentStep: string | null;
  startedAt: string | null;
  completedAt: string | null;
  workerExecutions: WorkerExecution[];
}

export interface DashboardSummary {
  todayCost: number;
  activeAiJobs: number;
  renderingQueue: { waiting: number; active: number; name?: string };
  uploadQueue: { waiting: number; active: number; name?: string };
  queues: Array<{ name: string; waiting: number; active: number; failed?: number }>;
  recentProjects: Array<{
    id: string;
    topic: string;
    status: ProjectStatus;
    updatedAt: string;
  }>;
  projectCounts: Record<string, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string;
    timestamp: string;
    user?: { email: string; firstName: string | null; lastName: string | null };
  }>;
}

export interface Prompt {
  id: string;
  workerKey: string;
  purpose: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: PromptVersion[];
  activeVersion?: PromptVersion | null;
}

export interface PromptVersion {
  id: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  variables?: unknown[];
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  failed?: number;
  completed?: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: Record<string, unknown>;
  progress: number | object;
  attemptsMade: number;
  timestamp: number;
  state: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  label: string;
  isActive?: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: Array<{
    role: UserRole;
    workspace: {
      id: string;
      name: string;
      slug: string;
      organizationId: string;
    };
  }>;
}

export interface WorkspaceMember {
  id: string;
  role: UserRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    lastLoginAt: string | null;
  };
}

export interface WorkerStatusEvent {
  projectId: string;
  workerKey: string;
  status: string;
  workerExecutionId?: string;
  progress?: number;
  timestamp: string;
}

export interface WorkflowStepEvent {
  projectId: string;
  status: string;
  currentStep?: string;
  error?: string;
  timestamp: string;
}

export interface RenderProgressEvent {
  projectId: string;
  progress: number;
  scene?: number;
  totalScenes?: number;
  timestamp: string;
}
