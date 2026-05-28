import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Allocation } from './allocation.entity';
import { Event } from '../events/event.entity';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ContributionsService } from '../contributions/contributions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { originalToCols } from '../../common/currency';

@Injectable()
export class AllocationsService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    private readonly contributions: ContributionsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Records a new allocation, enforcing that the member's balance never goes
   * negative. Allocation can only target an "active" event.
   */
  async allocate(fam: FamilyContext, dto: CreateAllocationDto): Promise<Allocation> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return ds.transaction(async (manager) => {
      const event = await manager.findOne(Event, { where: { id: dto.eventId } });
      if (!event) throw new NotFoundException('Event not found');
      if (event.status !== 'active') {
        throw new BadRequestException('Event is no longer open for allocations');
      }
      if (event.type === 'loan' || event.type === 'external') {
        throw new BadRequestException(
          'Ce type d\'évènement ne se finance pas depuis votre part : utilisez la contribution dédiée.',
        );
      }
      const balance = await this.contributions.myBalance(fam);
      if (Number(balance.balance) < dto.amount) {
        throw new ConflictException(
          `Insufficient personal balance: ${balance.balance} € available, ${dto.amount} € requested`,
        );
      }
      const repo = manager.getRepository(Allocation);
      const existing = await repo.findOne({
        where: { eventId: dto.eventId, memberId: fam.memberId },
      });
      // Allocation est toujours en EUR (debit de la part personnelle qui est
      // elle-même calculee en EUR). On garde quand même les colonnes
      // original_* renseignees pour la cohérence du schema.
      const cols = originalToCols(dto.amount, 'EUR');
      const alloc =
        existing ??
        repo.create({
          eventId: dto.eventId,
          memberId: fam.memberId,
          amount: '0',
          originalAmount: '0',
          originalCurrency: 'EUR',
        });
      alloc.amount = (Number(alloc.amount) + Number(cols.amount)).toFixed(2);
      alloc.originalAmount = (Number(alloc.originalAmount ?? '0') + Number(cols.originalAmount)).toFixed(2);
      alloc.originalCurrency = 'EUR';
      await repo.save(alloc);

      await this.notifications.broadcast(fam, 'allocation_recorded', {
        title: 'Allocation enregistrée',
        body: `Un membre a alloué ${dto.amount} € à "${event.title}".`,
        payload: { eventId: event.id, amount: dto.amount },
      });
      return alloc;
    });
  }
}
