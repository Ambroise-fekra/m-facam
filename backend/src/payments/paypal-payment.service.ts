import { Injectable } from '@nestjs/common';
import {
  ContributionCheckoutArgs,
  CheckoutResult,
  PaymentProvider,
  PayoutArgs,
  SubscriptionCheckoutArgs,
} from './payment-provider.interface';
import { PaypalService } from '../paypal/paypal.service';

/**
 * Real PayPal-backed provider. Delegates to PaypalService (Orders v2, Payouts,
 * Subscriptions). Enabled with PAYMENT_PROVIDER=paypal once PayPal credentials
 * and the live wiring are in place — see docs/paypal.md.
 */
@Injectable()
export class PaypalPaymentService implements PaymentProvider {
  readonly name = 'paypal' as const;

  constructor(private readonly paypal: PaypalService) {}

  async createContributionCheckout(a: ContributionCheckoutArgs): Promise<CheckoutResult> {
    const order = await this.paypal.createOrder(a.amountEur, `Cotisation ${a.contributionId}`);
    return { reference: a.contributionId, approveUrl: order.approveUrl };
  }

  async createSubscriptionCheckout(a: SubscriptionCheckoutArgs): Promise<CheckoutResult> {
    // A real implementation creates a PayPal subscription against
    // PAYPAL_SUBSCRIPTION_PLAN_ID and returns its approval link.
    const order = await this.paypal.createOrder(a.amountEur, `Abonnement ${a.familyId}`);
    return { reference: a.familyId, approveUrl: order.approveUrl };
  }

  payout(a: PayoutArgs): Promise<string> {
    return this.paypal.payout(a);
  }
}
