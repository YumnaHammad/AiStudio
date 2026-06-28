import { Injectable } from '@nestjs/common';

/** No-op realtime gateway for Vercel serverless (WebSockets unsupported). */
@Injectable()
export class RealtimeGatewayStub {
  emitWorkerStatus(): void {}

  emitWorkflowUpdate(): void {}

  emitRenderProgress(): void {}

  emitQueueUpdate(): void {}

  emitCostUpdate(): void {}

  emitNotification(): void {}
}
