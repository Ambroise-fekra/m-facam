import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaypalService } from './paypal.service';

/**
 * PayPal webhook receiver. Signature verification (PAYPAL-CERT-URL etc.) lives
 * in a guard not shown in this scaffold — see PaypalService for the full flow.
 */
@ApiTags('paypal')
@Controller('paypal')
export class PaypalController {
  private readonly logger = new Logger(PaypalController.name);

  constructor(private readonly paypal: PaypalService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'PayPal webhook (orders, subscriptions, payouts)' })
  async webhook(
    @Headers('paypal-transmission-id') transmissionId: string,
    @Body() payload: any,
  ) {
    this.logger.log(`PayPal webhook ${transmissionId} ${payload.event_type ?? '?'}`);
    // TODO: dispatch by payload.event_type:
    //  - CHECKOUT.ORDER.APPROVED → ContributionsService.confirmContribution
    //  - BILLING.SUBSCRIPTION.ACTIVATED → SubscriptionsService.confirmPayment
    //  - PAYMENT.PAYOUTS-ITEM.SUCCEEDED → mark event payout
    return { received: true };
  }
}
