import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { EventsModule } from './events/events.module';
import { ContributionsModule } from './contributions/contributions.module';
import { AllocationsModule } from './allocations/allocations.module';
import { TransactionsModule } from './transactions/transactions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GenealogyModule } from './genealogy/genealogy.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    EventsModule,
    ContributionsModule,
    AllocationsModule,
    TransactionsModule,
    NotificationsModule,
    GenealogyModule,
    AdminModule,
  ],
})
export class TenantModule {}
