import { Injectable, Logger } from '@nestjs/common';

interface PayoutArgs {
  receiverEmail: string;
  amountEur: number;
  note: string;
}

/**
 * Thin wrapper around the PayPal REST API. The real implementation should use
 * `@paypal/paypal-server-sdk` for Orders v2 and Payouts. Kept minimal here so
 * the rest of the codebase has a stable interface to call.
 */
@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  get mode(): 'sandbox' | 'live' {
    return (process.env.PAYPAL_MODE as 'sandbox' | 'live') ?? 'sandbox';
  }

  /**
   * Creates a one-off PayPal order. Returns the approval URL that the mobile
   * client should open in an in-app browser.
   */
  async createOrder(amountEur: number, description: string): Promise<{ orderId: string; approveUrl: string }> {
    this.logger.log(`[paypal:${this.mode}] createOrder ${amountEur}€ — ${description}`);
    // TODO: call PayPal /v2/checkout/orders
    const orderId = `ORDER-${Date.now()}`;
    return {
      orderId,
      approveUrl: `https://www.${this.mode === 'live' ? '' : 'sandbox.'}paypal.com/checkoutnow?token=${orderId}`,
    };
  }

  async capture(orderId: string): Promise<{ captureId: string; payerEmail: string }> {
    this.logger.log(`[paypal:${this.mode}] capture ${orderId}`);
    // TODO: call PayPal /v2/checkout/orders/{id}/capture
    return { captureId: `CAP-${orderId}`, payerEmail: 'payer@example.com' };
  }

  /**
   * Issues a payout via PayPal Payouts API to a verified email address.
   */
  async payout(args: PayoutArgs): Promise<string> {
    this.logger.log(
      `[paypal:${this.mode}] payout ${args.amountEur}€ to ${args.receiverEmail} (${args.note})`,
    );
    // TODO: call PayPal /v1/payments/payouts
    return `PAYOUT-${Date.now()}`;
  }
}
