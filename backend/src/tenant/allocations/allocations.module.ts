import { Module } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { AllocationsController } from './allocations.controller';
import { ContributionsModule } from '../contributions/contributions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ContributionsModule, NotificationsModule],
  controllers: [AllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
