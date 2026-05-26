import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Event } from '../events/event.entity';
import { Member } from '../members/member.entity';
import { ExternalContribution } from './external-contribution.entity';
import { CreateExternalContributionDto } from './dto/create-external-contribution.dto';

@Injectable()
export class ExternalService {
  constructor(private readonly tenantRouting: TenantRoutingService) {}

  /** Sum of earmarked contributions for one external event. */
  async total(fam: FamilyContext, eventId: string): Promise<number> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const row = await ds
      .getRepository(ExternalContribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.event_id = :id', { id: eventId })
      .getRawOne();
    return Number(row?.total ?? 0);
  }

  /** Sum of one member's own earmarked contributions for one external event. */
  async myTotal(fam: FamilyContext, eventId: string): Promise<number> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const row = await ds
      .getRepository(ExternalContribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.event_id = :id AND c.member_id = :m', { id: eventId, m: fam.memberId })
      .getRawOne();
    return Number(row?.total ?? 0);
  }

  /** History (newest first) — visible to any member of the family. */
  async list(fam: FamilyContext, eventId: string) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return ds.getRepository(ExternalContribution).find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Records a member's earmarked contribution to an external event. The caller
   * (the contributing member) must be active, not blocked, not deceased.
   * Money is NOT added to the caisse nor to the member's share.
   */
  async contribute(fam: FamilyContext, eventId: string, dto: CreateExternalContributionDto) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const event = await ds.getRepository(Event).findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.type !== 'external') {
      throw new BadRequestException('Cet évènement n\'est pas un évènement externe');
    }
    if (event.status !== 'active') {
      throw new BadRequestException('Les contributions ne sont possibles que lorsque l\'évènement est actif');
    }
    const me = await ds.getRepository(Member).findOne({ where: { id: fam.memberId } });
    if (!me || !me.isActive) throw new ForbiddenException('Membre inactif');
    if (me.deceasedAt) throw new ForbiddenException('Membre décédé');
    if (me.isBlocked) throw new ForbiddenException('Compte bloqué');

    const repo = ds.getRepository(ExternalContribution);
    const c = repo.create({
      eventId,
      memberId: fam.memberId,
      amount: dto.amount.toFixed(2),
      method: dto.method ?? null,
      note: dto.note ?? null,
      recordedById: fam.memberId,
    });
    return repo.save(c);
  }
}
