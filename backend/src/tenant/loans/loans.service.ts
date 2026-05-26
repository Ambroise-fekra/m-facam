import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Event } from '../events/event.entity';
import { Member } from '../members/member.entity';
import { LoanRepayment } from './loan-repayment.entity';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Injectable()
export class LoansService {
  constructor(private readonly tenantRouting: TenantRoutingService) {}

  /** Sum of repayments for a given loan event. */
  async totalRepaid(fam: FamilyContext, eventId: string): Promise<number> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const row = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.event_id = :id', { id: eventId })
      .getRawOne();
    return Number(row?.total ?? 0);
  }

  /** Repayments history (newest first) — visible only to the borrower and admins. */
  async list(fam: FamilyContext, eventId: string) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const event = await ds.getRepository(Event).findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.type !== 'loan') throw new BadRequestException('Not a loan event');
    if (!fam.isAdmin && fam.memberId !== event.borrowerId) {
      throw new ForbiddenException('Réservé à l\'emprunteur et aux administrateurs');
    }
    return ds.getRepository(LoanRepayment).find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Records a loan repayment. Only the borrower (or an admin) may record one.
   * If the running total reaches the loan amount, the loan event is closed and
   * the borrower is automatically unblocked (any past-due block clears).
   */
  async record(fam: FamilyContext, eventId: string, dto: CreateRepaymentDto) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const eventRepo = ds.getRepository(Event);
    const memberRepo = ds.getRepository(Member);
    const repaymentRepo = ds.getRepository(LoanRepayment);

    const event = await eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.type !== 'loan') throw new BadRequestException('Cet évènement n\'est pas un prêt');
    if (event.status === 'closed') throw new BadRequestException('Le prêt est déjà soldé');
    if (event.status !== 'active') throw new BadRequestException('Le prêt n\'est pas encore actif');
    if (event.payoutStatus !== 'done') {
      throw new BadRequestException('Les fonds n\'ont pas encore été remis à l\'emprunteur');
    }
    if (!fam.isAdmin && fam.memberId !== event.borrowerId) {
      throw new ForbiddenException('Seul l\'emprunteur (ou un administrateur) peut enregistrer un remboursement');
    }

    const already = await this.totalRepaid(fam, eventId);
    const target = Number(event.targetAmount);
    const remaining = Math.max(0, target - already);
    if (dto.amount > remaining + 0.005) {
      throw new BadRequestException(
        `Montant trop élevé. Reste dû : ${remaining.toFixed(2)} €`,
      );
    }

    const r = repaymentRepo.create({
      eventId,
      memberId: event.borrowerId!,
      amount: dto.amount.toFixed(2),
      method: dto.method ?? null,
      note: dto.note ?? null,
      recordedById: fam.memberId,
    });
    await repaymentRepo.save(r);

    const newTotal = already + dto.amount;
    if (newTotal + 0.005 >= target) {
      // Loan fully repaid → close + unblock borrower if previously blocked.
      event.status = 'closed';
      event.closedAt = new Date();
      await eventRepo.save(event);
      if (event.borrowerId) {
        await memberRepo.update({ id: event.borrowerId }, { isBlocked: false });
      }
    }
    return r;
  }
}
