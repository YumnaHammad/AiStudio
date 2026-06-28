import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeGatewayStub } from './realtime.gateway.stub';

const useServerlessStub = process.env.VERCEL === '1';

@Module({
  providers: [
    {
      provide: RealtimeGateway,
      useClass: useServerlessStub ? RealtimeGatewayStub : RealtimeGateway,
    },
  ],
  exports: [RealtimeGateway],
})
export class GatewaysModule {}
