import { Global, Module } from '@nestjs/common';
import { MockPaymentService } from './mock-payment.service';
import { PaypalPaymentService } from './paypal-payment.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

/**
 * Picks the active payment provider from PAYMENT_PROVIDER (default: mock).
 * Global so any service can inject PAYMENT_PROVIDER without extra wiring.
 */
@Global()
@Module({
  providers: [
    MockPaymentService,
    PaypalPaymentService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [MockPaymentService, PaypalPaymentService],
      useFactory: (mock: MockPaymentService, paypal: PaypalPaymentService) =>
        (process.env.PAYMENT_PROVIDER ?? 'mock') === 'paypal' ? paypal : mock,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
