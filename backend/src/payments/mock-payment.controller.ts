import { Body, Controller, ForbiddenException, Get, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { ContributionsService } from '../tenant/contributions/contributions.service';
import { SubscriptionsService } from '../master/subscriptions/subscriptions.service';

/**
 * Local "fake PayPal" checkout. Only mounted logically when PAYMENT_PROVIDER=mock.
 * Serves an HTML page that mimics a PayPal approval screen and, on Pay, performs
 * the same side effects a real PayPal webhook would (confirm contribution /
 * activate subscription).
 *
 * NEVER reachable in production: every handler refuses unless PAYMENT_PROVIDER=mock.
 */
@ApiExcludeController()
@Controller('payments/mock')
export class MockPaymentController {
  constructor(
    private readonly contributions: ContributionsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  private ensureMock(): void {
    if ((process.env.PAYMENT_PROVIDER ?? 'mock') !== 'mock') {
      throw new ForbiddenException('Mock payment provider is disabled');
    }
  }

  @Get('checkout')
  checkout(
    @Query('kind') kind: string,
    @Query('family') family: string,
    @Query('ref') ref: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ): void {
    this.ensureMock();
    res.type('html').send(this.renderCheckout(kind, family, ref, amount));
  }

  @Post('confirm')
  async confirm(
    @Body('kind') kind: string,
    @Body('family') family: string,
    @Body('ref') ref: string,
    @Body('amount') amount: string,
    @Body('decision') decision: string,
    @Res() res: Response,
  ): Promise<void> {
    this.ensureMock();
    if (decision !== 'pay') {
      res.type('html').send(this.renderResult(false, amount));
      return;
    }
    if (kind === 'contribution') {
      await this.contributions.confirmContribution(
        family,
        ref,
        `MOCK-${Date.now()}`,
        'payer@mock.test',
      );
    } else if (kind === 'subscription') {
      await this.subscriptions.confirmPayment(ref, `MOCK-SUB-${Date.now()}`);
    }
    res.type('html').send(this.renderResult(true, amount));
  }

  // --- HTML rendering (self-contained, on-brand) ---

  private layout(inner: string): string {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Paiement (simulation)</title>
      <style>
        *{box-sizing:border-box;font-family:'Inter',system-ui,sans-serif}
        body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#667eea,#764ba2);padding:24px}
        .card{background:#fff;border-radius:20px;padding:32px;max-width:380px;width:100%;
          box-shadow:0 30px 80px rgba(0,0,0,.35);text-align:center}
        .badge{display:inline-block;background:#eef2ff;color:#4f46e5;font-weight:700;
          padding:6px 14px;border-radius:999px;font-size:.75rem;letter-spacing:.5px;margin-bottom:18px}
        h1{font-size:1.3rem;margin:0 0 6px;color:#0f172a}
        .amount{font-size:2.6rem;font-weight:800;color:#4f46e5;margin:14px 0}
        p{color:#64748b;font-size:.9rem;line-height:1.5}
        button{width:100%;padding:15px;border:none;border-radius:14px;font-weight:700;
          font-size:1rem;cursor:pointer;margin-top:10px}
        .pay{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
        .cancel{background:#f1f5f9;color:#334155}
        .ok{font-size:3.4rem;margin:6px 0}
      </style></head><body><div class="card">${inner}</div></body></html>`;
  }

  private renderCheckout(kind: string, family: string, ref: string, amount: string): string {
    const label = kind === 'subscription' ? 'Abonnement annuel' : 'Cotisation';
    return this.layout(`
      <div class="badge">SIMULATION — sans PayPal</div>
      <h1>${label}</h1>
      <div class="amount">${amount} €</div>
      <p>Famille <strong>${family}</strong><br/>Réf. ${ref}</p>
      <form method="post" action="/api/payments/mock/confirm">
        <input type="hidden" name="kind" value="${kind}" />
        <input type="hidden" name="family" value="${family}" />
        <input type="hidden" name="ref" value="${ref}" />
        <input type="hidden" name="amount" value="${amount}" />
        <button class="pay"    type="submit" name="decision" value="pay">✅ Payer ${amount} €</button>
        <button class="cancel" type="submit" name="decision" value="cancel">Annuler</button>
      </form>`);
  }

  private renderResult(success: boolean, amount: string): string {
    return success
      ? this.layout(`
          <div class="ok">🎉</div>
          <h1>Paiement confirmé</h1>
          <div class="amount">${amount} €</div>
          <p>Vous pouvez retourner dans l'application et actualiser pour voir le solde mis à jour.</p>`)
      : this.layout(`
          <div class="ok">↩️</div>
          <h1>Paiement annulé</h1>
          <p>Aucun montant n'a été débité. Retournez dans l'application.</p>`);
  }
}
