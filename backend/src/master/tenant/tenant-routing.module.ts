import { Global, Module } from '@nestjs/common';
import { TenantRoutingService } from './tenant-routing.service';

@Global()
@Module({
  providers: [TenantRoutingService],
  exports: [TenantRoutingService],
})
export class TenantRoutingModule {}
