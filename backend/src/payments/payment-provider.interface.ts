/**
 * Abstraction over the payment backend so the rest of the app never depends on
 * PayPal directly. Two implementations are provided:
 *   - MockPaymentService   (PAYMENT_PROVIDER=mock, default) — fully local, no PayPal
 *   - PaypalPaymentService (PAYMENT_PROVIDER=paypal)        — real PayPal REST API
 */
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface CheckoutResult {
  reference: string;
  approveUrl: string;
}

export interface ContributionCheckoutArgs {
  identifier: string;
  contributionId: string;
  amountEur: number;
}

export interface SubscriptionCheckoutArgs {
  identifier: string;
  familyId: string;
  amountEur: number;
}

export interface PayoutArgs {
  receiverEmail: string;
  amountEur: number;
  note: string;
}

export interface PaymentProvider {
  readonly name: 'mock' | 'paypal';
  createContributionCheckout(args: ContributionCheckoutArgs): Promise<CheckoutResult>;
  createSubscriptionCheckout(args: SubscriptionCheckoutArgs): Promise<CheckoutResult>;
  payout(args: PayoutArgs): Promise<string>;
}
