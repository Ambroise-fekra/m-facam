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
      // Convertit le montant saisi (potentiellement XAF) en EUR canonique.
      const cur = dto.currency ?? 'EUR';
      const cols = originalToCols(dto.amount, cur);
      const amountEur = Number(cols.amount);
      const balance = await this.contributions.myBalance(fam);
      if (Number(balance.balance) < amountEur) {
        throw new ConflictException(
          `Insufficient personal balance: ${balance.balance} € available, ${cols.amount} € requested`,
        );
      }
      const repo = manager.getRepository(Allocation);
      const existing = await repo.findOne({
        where: { eventId: dto.eventId, memberId: fam.memberId },
      });
      const alloc =
        existing ??
        repo.create({
          eventId: dto.eventId,
          memberId: fam.memberId,
          amount: '0',
          originalAmount: '0',
          originalCurrency: cur,
        });
      alloc.amount = (Number(alloc.amount) + amountEur).toFixed(2);
      // Note : si le membre ajoute plusieurs fois avec des devises différentes,
      // on perd la devise d'origine sur l'agrégat (la dernière l'emporte). On
      // privilégie la lisibilité (un seul libellé) sur l'exactitude historique
      // — l'historique individuel reste tracé dans les transactions du membre.
      if (cur === 'XAF' || alloc.originalCurrency === 'XAF') {
        // Si l'un des deux côtés est en XAF, on agrège en XAF.
        const prevXaf =
          alloc.originalCurrency === 'XAF' ? Number(alloc.originalAmount ?? '0') : 0;
        const addXaf = cur === 'XAF' ? dto.amount : Math.round(dto.amount * 655.957);
        alloc.originalAmount = (prevXaf + addXaf).toFixed(2);
        alloc.originalCurrency = 'XAF';
      } else {
        alloc.originalAmount = (Number(alloc.originalAmount ?? '0') + dto.amount).toFixed(2);
        alloc.originalCurrency = 'EUR';
      }
      await repo.save(alloc);

      const unit = cur === 'XAF' ? 'FCFA' : '€';
      await this.notifications.broadcast(fam, 'allocation_recorded', {
        title: 'Allocation enregistrée',
        body: `Un membre a alloué ${dto.amount} ${unit} à "${event.title}".`,
        payload: { eventId: event.id, amount: cols.amount, currency: cur },
      });
      return alloc;
    });
  }
}
