import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WS_ROOM } from '@acs/shared';
import { resolveCorsOrigins } from '../config/cors.util';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: resolveCorsOrigins(),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(client: Socket, payload: { projectId: string }): void {
    if (payload?.projectId) {
      client.join(`${WS_ROOM.PROJECT}:${payload.projectId}`);
    }
  }

  @SubscribeMessage('subscribe:workspace')
  handleSubscribeWorkspace(client: Socket, payload: { workspaceId: string }): void {
    if (payload?.workspaceId) {
      client.join(`${WS_ROOM.WORKSPACE}:${payload.workspaceId}`);
    }
  }

  @SubscribeMessage('unsubscribe:project')
  handleUnsubscribeProject(client: Socket, payload: { projectId: string }): void {
    if (payload?.projectId) {
      client.leave(`${WS_ROOM.PROJECT}:${payload.projectId}`);
    }
  }

  emitWorkerStatus(
    projectId: string,
    data: { workerKey: string; status: string; workerExecutionId?: string; progress?: number },
  ): void {
    this.server.to(`${WS_ROOM.PROJECT}:${projectId}`).emit('worker:status', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkflowUpdate(
    projectId: string,
    data: { status: string; currentStep?: string; error?: string },
  ): void {
    this.server.to(`${WS_ROOM.PROJECT}:${projectId}`).emit('workflow:step', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitRenderProgress(
    projectId: string,
    data: { progress: number; scene?: number; totalScenes?: number },
  ): void {
    this.server.to(`${WS_ROOM.PROJECT}:${projectId}`).emit('render:progress', {
      projectId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitQueueUpdate(workspaceId: string, queues: unknown[]): void {
    this.server.to(`${WS_ROOM.WORKSPACE}:${workspaceId}`).emit('queue:update', {
      workspaceId,
      queues,
      timestamp: new Date().toISOString(),
    });
  }

  emitCostUpdate(workspaceId: string, todayCost: number): void {
    this.server.to(`${WS_ROOM.WORKSPACE}:${workspaceId}`).emit('cost:update', {
      workspaceId,
      todayCost,
      timestamp: new Date().toISOString(),
    });
  }

  emitNotification(userId: string, notification: unknown): void {
    this.server.to(`${WS_ROOM.USER}:${userId}`).emit('notification', notification);
  }
}
