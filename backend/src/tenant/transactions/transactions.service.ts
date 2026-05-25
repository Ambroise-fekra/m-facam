import { Injectable } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Contribution } from '../contributions/contribution.entity';
import { Allocation } from '../allocations/allocation.entity';
import { Event } from '../events/event.entity';

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  label: string;
  amount: string;
  createdAt: Date;
  reference: string;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly tenantRouting: TenantRoutingService) {}

  /**
   * Aggregates contributions (credits) and allocations (debits) of the current
   * member into a chronological list. Other members' rows are never returned.
   */
  async myTransactions(fam: FamilyContext): Promise<Transaction[]> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const credits = await ds.getRepository(Contribution).find({
      where: { memberId: fam.memberId, status: 'completed' },
      order: { createdAt: 'DESC' },
    });
    const debits = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .leftJoin(Event, 'e', 'e.id = a.event_id')
      .select(['a.id AS id', 'a.amount AS amount', 'a.created_at AS createdAt', 'e.title AS title'])
      .where('a.member_id = :m', { m: fam.memberId })
      .orderBy('a.created_at', 'DESC')
      .getRawMany();

    const all: Transaction[] = [
      ...credits.map((c) => ({
        id: c.id,
        type: 'credit' as const,
        label: 'Cotisation',
        amount: c.amount,
        createdAt: c.completedAt ?? c.createdAt,
        reference: c.paypalTxId ?? c.id,
      })),
      ...debits.map((d) => ({
        id: d.id,
        type: 'debit' as const,
        label: `Allocation — ${d.title ?? 'évènement'}`,
        amount: d.amount,
        createdAt: d.createdat,
        reference: d.id,
      })),
    ];
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
