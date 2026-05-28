import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Event } from '../events/event.entity';
import { Member } from '../members/member.entity';
import { LoanRepayment } from './loan-repayment.entity';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { originalToCols } from '../../common/currency';

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

  /**
   * Admin supprime un remboursement (saisie erronée, mauvaise devise, doublon).
   * Si la suppression fait repasser le prêt sous le seuil "remboursé en
   * totalité", on rouvre le prêt (status closed -> active).
   */
  async remove(fam: FamilyContext, eventId: string, repaymentId: string) {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const eventRepo = ds.getRepository(Event);
    const repaymentRepo = ds.getRepository(LoanRepayment);
    const r = await repaymentRepo.findOne({ where: { id: repaymentId, eventId } });
    if (!r) throw new NotFoundException('Remboursement introuvable');
    await repaymentRepo.delete(r.id);
    // Si le prêt avait été clos suite à ce remboursement, on le rouvre.
    const event = await eventRepo.findOne({ where: { id: eventId } });
    if (event && event.status === 'closed' && event.type === 'loan') {
      const newTotal = await this.totalRepaid(fam, eventId);
      if (newTotal + 0.005 < Number(event.targetAmount)) {
        event.status = 'active';
        event.closedAt = null;
        await eventRepo.save(event);
      }
    }
    return { id: repaymentId, deleted: true };
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
    // dto.amount est dans dto.currency (EUR par défaut). On convertit en EUR
    // canonique pour comparer au reste dû (lui aussi en EUR).
    const cols = originalToCols(dto.amount, dto.currency ?? 'EUR');
    const amountEur = Number(cols.amount);
    if (amountEur > remaining + 0.005) {
      throw new BadRequestException(
        `Montant trop élevé. Reste dû : ${remaining.toFixed(2)} €`,
      );
    }

    const r = repaymentRepo.create({
      eventId,
      memberId: event.borrowerId!,
      amount: cols.amount,
      originalAmount: cols.originalAmount,
      originalCurrency: cols.originalCurrency,
      method: dto.method ?? null,
      note: dto.note ?? null,
      recordedById: fam.memberId,
    });
    // Backdating éventuel par l'admin (versement reçu il y a quelques jours).
    if (fam.isAdmin && dto.dateContributed) {
      const d = new Date(dto.dateContributed);
      if (!isNaN(d.getTime())) r.createdAt = d;
    }
    await repaymentRepo.save(r);

    const newTotal = already + amountEur;
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
