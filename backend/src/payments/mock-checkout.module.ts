import { Module } from '@nestjs/common';
import { MockPaymentController } from './mock-payment.controller';
import { ContributionsModule } from '../tenant/contributions/contributions.module';
import { SubscriptionsModule } from '../master/subscriptions/subscriptions.module';

/**
 * Hosts the local fake-checkout endpoints. Kept separate from PaymentModule to
 * avoid a circular dependency (ContributionsModule depends on PaymentModule).
 */
@Module({
  imports: [ContributionsModule, SubscriptionsModule],
  controllers: [MockPaymentController],
})
export class MockCheckoutModule {}
