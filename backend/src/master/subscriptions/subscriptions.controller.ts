import { Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../payments/payment-provider.interface';

@ApiTags('master/subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('master/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: "Get the current family's subscription status" })
  async mine(@CurrentFamily() fam: FamilyContext) {
    const sub = await this.subs.getForFamily(fam.familyId);
    return {
      state: sub.state,
      trialEndsAt: sub.trialEndsAt,
      activeUntil: sub.activeUntil,
      graceEndsAt: sub.graceEndsAt,
      priceEur: sub.priceEur,
    };
  }

  @Post('upgrade')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Returns the approval link to upgrade the trial to a paid plan' })
  async upgrade(@CurrentFamily() fam: FamilyContext) {
    const priceEur = Number(process.env.SUBSCRIPTION_PRICE_EUR ?? '10');
    const checkout = await this.payments.createSubscriptionCheckout({
      identifier: fam.identifier,
      familyId: fam.familyId,
      amountEur: priceEur,
    });
    return { approveUrl: checkout.approveUrl, priceEur: priceEur.toFixed(2) };
  }
}
