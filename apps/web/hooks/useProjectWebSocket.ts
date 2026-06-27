'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/auth-store';
import { getWsBaseUrl } from '@/lib/utils';
import type {
  RenderProgressEvent,
  WorkerStatusEvent,
  WorkflowStepEvent,
} from '@/lib/types';

interface ProjectWebSocketState {
  connected: boolean;
  workerUpdates: Record<string, WorkerStatusEvent>;
  workflowUpdate: WorkflowStepEvent | null;
  renderProgress: RenderProgressEvent | null;
}

export function useProjectWebSocket(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ProjectWebSocketState>({
    connected: false,
    workerUpdates: {},
    workflowUpdate: null,
    renderProgress: null,
  });

  const reset = useCallback(() => {
    setState({
      connected: false,
      workerUpdates: {},
      workflowUpdate: null,
      renderProgress: null,
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const wsUrl = getWsBaseUrl();
    const socket = io(`${wsUrl}/realtime`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connected: true }));
      socket.emit('subscribe:project', { projectId });
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, connected: false }));
    });

    socket.on('worker:status', (data: WorkerStatusEvent) => {
      if (data.projectId !== projectId) return;
      setState((prev) => ({
        ...prev,
        workerUpdates: {
          ...prev.workerUpdates,
          [data.workerKey]: data,
        },
      }));
    });

    socket.on('workflow:step', (data: WorkflowStepEvent) => {
      if (data.projectId !== projectId) return;
      setState((prev) => ({ ...prev, workflowUpdate: data }));
    });

    socket.on('render:progress', (data: RenderProgressEvent) => {
      if (data.projectId !== projectId) return;
      setState((prev) => ({ ...prev, renderProgress: data }));
    });

    return () => {
      socket.emit('unsubscribe:project', { projectId });
      socket.disconnect();
      socketRef.current = null;
      reset();
    };
  }, [projectId, reset]);

  return state;
}

export function useWorkspaceWebSocket() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [queueUpdate, setQueueUpdate] = useState<unknown[] | null>(null);
  const [todayCost, setTodayCost] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    const wsUrl = getWsBaseUrl();
    const socket = io(`${wsUrl}/realtime`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe:workspace', { workspaceId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queue:update', (data: { queues: unknown[] }) => {
      setQueueUpdate(data.queues);
    });

    socket.on('cost:update', (data: { todayCost: number }) => {
      setTodayCost(data.todayCost);
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [workspaceId]);

  return { connected, queueUpdate, todayCost };
}
