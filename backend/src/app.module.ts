import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MasterDatabaseModule } from './master/master-database.module';
import { TenantModule } from './tenant/tenant.module';
import { FamiliesModule } from './master/families/families.module';
import { SubscriptionsModule } from './master/subscriptions/subscriptions.module';
import { TenantRoutingModule } from './master/tenant/tenant-routing.module';
import { PaypalModule } from './paypal/paypal.module';
import { PaymentModule } from './payments/payment.module';
import { MockCheckoutModule } from './payments/mock-checkout.module';
import { JwtConfigModule } from './common/jwt-config.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    JwtConfigModule,
    EmailModule,
    MasterDatabaseModule,
    TenantRoutingModule,
    PaypalModule,
    PaymentModule,
    FamiliesModule,
    SubscriptionsModule,
    TenantModule,
    MockCheckoutModule,
  ],
})
export class AppModule {}
