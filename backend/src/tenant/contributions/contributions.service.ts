import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Contribution } from './contribution.entity';
import { Allocation } from '../allocations/allocation.entity';
import { Event } from '../events/event.entity';
import { LoanRepayment } from '../loans/loan-repayment.entity';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../payments/payment-provider.interface';

export interface MemberBalance {
  memberId: string;
  totalContributed: string;
  totalAllocated: string;
  balance: string;
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  async startContribution(fam: FamilyContext, dto: CreateContributionDto) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Contribution);
    const contribution = repo.create({
      memberId: fam.memberId,
      amount: dto.amount.toFixed(2),
      status: 'pending',
    });
    await repo.save(contribution);

    const checkout = await this.payments.createContributionCheckout({
      identifier: fam.identifier,
      contributionId: contribution.id,
      amountEur: dto.amount,
    });
    return { contributionId: contribution.id, approveUrl: checkout.approveUrl };
  }

  /**
   * Called when payment is captured — by the PayPal webhook, or by the local
   * mock checkout. No JWT here: the contributing member is derived from the
   * contribution row itself, so notifications still exclude the actor.
   */
  async confirmContribution(
    identifier: string,
    contributionId: string,
    paymentTxId: string,
    payerEmail: string,
  ): Promise<Contribution> {
    const ds = await this.tenantRouting.getDataSourceFor(identifier);
    const repo = ds.getRepository(Contribution);
    const c = await repo.findOne({ where: { id: contributionId } });
    if (!c) throw new NotFoundException('Contribution not found');
    c.status = 'completed';
    c.paypalTxId = paymentTxId;
    c.paypalPayerEmail = payerEmail;
    c.completedAt = new Date();
    await repo.save(c);

    const actor: FamilyContext = {
      identifier,
      familyId: '',
      memberId: c.memberId,
      isAdmin: false,
    };
    await this.notifications.broadcast(actor, 'contribution_received', {
      title: 'Nouvelle cotisation',
      body: `Un membre a versé ${c.amount} € à la caisse.`,
      payload: { contributionId: c.id, amount: c.amount },
    });
    return c;
  }

  /**
   * Returns the *own* balance of the authenticated member only — never the
   * breakdown for others.
   */
  async myBalance(fam: FamilyContext): Promise<MemberBalance> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const contributed = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.member_id = :id AND c.status = :s', { id: fam.memberId, s: 'completed' })
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.member_id = :id', { id: fam.memberId })
      .getRawOne();
    const totalContributed = Number(contributed?.total ?? 0);
    const totalAllocated = Number(allocated?.total ?? 0);
    return {
      memberId: fam.memberId,
      totalContributed: totalContributed.toFixed(2),
      totalAllocated: totalAllocated.toFixed(2),
      balance: (totalContributed - totalAllocated).toFixed(2),
    };
  }

  /**
   * Caisse globale — montant total collecté toutes contributions confondues.
   * Visible par tous mais sans détail par membre.
   */
  async globalCash(fam: FamilyContext): Promise<{ totalCash: string; totalAllocated: string }> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const contributed = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.status = :s', { s: 'completed' })
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .getRawOne();
    // Loan disbursed = leaves caisse; repayments come back in. Both are
    // separate from regular contributions / allocations.
    const loansOut = await ds
      .getRepository(Event)
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.target_amount), 0)', 'total')
      .where("e.type = 'loan' AND e.payout_status = 'done'")
      .getRawOne();
    const repaid = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .getRawOne();
    const totalCash =
      Number(contributed?.total ?? 0) -
      Number(allocated?.total ?? 0) -
      Number(loansOut?.total ?? 0) +
      Number(repaid?.total ?? 0);
    return {
      totalCash: totalCash.toFixed(2),
      totalAllocated: Number(allocated?.total ?? 0).toFixed(2),
    };
  }
}
