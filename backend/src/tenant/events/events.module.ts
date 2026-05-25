import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Family } from '../../master/families/family.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Family], 'master'), NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
