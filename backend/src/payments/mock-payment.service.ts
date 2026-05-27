import { Injectable, Logger } from '@nestjs/common';
import {
  ContributionCheckoutArgs,
  CheckoutResult,
  PaymentProvider,
  PayoutArgs,
  SubscriptionCheckoutArgs,
} from './payment-provider.interface';

/**
 * Local PayPal simulator. Instead of pointing to paypal.com, checkout URLs
 * point to a local "fake checkout" page served by MockPaymentController. The
 * page has a Pay / Cancel button; pressing Pay calls back into the app to
 * confirm the contribution or subscription — exactly what a real PayPal webhook
 * would do, but with zero external dependency.
 */
@Injectable()
export class MockPaymentService implements PaymentProvider {
  readonly name = 'mock' as const;
  private readonly logger = new Logger(MockPaymentService.name);

  private base(): string {
    // Priorité : PUBLIC_API_URL (custom domain Infomaniak en prod), puis
    // RENDER_EXTERNAL_URL (Render l'injecte automatiquement : ex.
    // https://facam-api.onrender.com), puis fallback dev local. Sans ça, en
    // prod l'URL de checkout simulé pointait sur localhost:3000 et la fenêtre
    // PayPal-fake plantait pour l'utilisateur (ne peut pas se résoudre).
    return (
      process.env.PUBLIC_API_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    );
  }

  async createContributionCheckout(a: ContributionCheckoutArgs): Promise<CheckoutResult> {
    const url =
      `${this.base()}/api/payments/mock/checkout` +
      `?kind=contribution&family=${encodeURIComponent(a.identifier)}` +
      `&ref=${encodeURIComponent(a.contributionId)}&amount=${a.amountEur}`;
    this.logger.log(`[mock] contribution checkout ${a.amountEur}€ → ${url}`);
    return { reference: a.contributionId, approveUrl: url };
  }

  async createSubscriptionCheckout(a: SubscriptionCheckoutArgs): Promise<CheckoutResult> {
    const url =
      `${this.base()}/api/payments/mock/checkout` +
      `?kind=subscription&family=${encodeURIComponent(a.identifier)}` +
      `&ref=${encodeURIComponent(a.familyId)}&amount=${a.amountEur}`;
    this.logger.log(`[mock] subscription checkout ${a.amountEur}€ → ${url}`);
    return { reference: a.familyId, approveUrl: url };
  }

  async payout(a: PayoutArgs): Promise<string> {
    const tx = `MOCK-PAYOUT-${Date.now()}`;
    this.logger.log(`[mock] payout ${a.amountEur}€ to ${a.receiverEmail} (${a.note}) → ${tx}`);
    return tx;
  }
}
