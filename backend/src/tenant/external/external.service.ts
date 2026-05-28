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
   * Records a member's earmarked contribution to an external event.
   *  - Cas 1 (self) : pas de memberId dans le dto → on agit pour le membre
   *    authentifié. Pré-requis : actif, non bloqué, non décédé.
   *  - Cas 2 (admin) : memberId fourni → on enregistre pour un autre membre
   *    (cas du versement hors-app à crediter, par ex. en espèces). L'admin
   *    peut aussi backdater via dateContributed.
   *  Money is NOT added to the caisse nor to the member's share.
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

    const onBehalf = !!dto.memberId && dto.memberId !== fam.memberId;
    if (onBehalf && !fam.isAdmin) {
      throw new ForbiddenException('Seul l\'administrateur peut enregistrer une contribution pour un autre membre');
    }
    const targetId = dto.memberId ?? fam.memberId;
    const target = await ds.getRepository(Member).findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Membre introuvable');
    // Les contraintes "actif / non bloqué / non décédé" ne s'appliquent que
    // lors d'une auto-contribution. L'admin peut crediter n'importe quel membre
    // (utile pour les versements re-tracés a posteriori).
    if (!onBehalf) {
      if (!target.isActive) throw new ForbiddenException('Membre inactif');
      if (target.isDeceased) throw new ForbiddenException('Membre décédé');
      if (target.isBlocked) throw new ForbiddenException('Compte bloqué');
    } else if (target.isDeceased) {
      throw new BadRequestException('Impossible d\'enregistrer une contribution pour un membre décédé');
    }

    const repo = ds.getRepository(ExternalContribution);
    const c = repo.create({
      eventId,
      memberId: targetId,
      amount: dto.amount.toFixed(2),
      method: dto.method ?? null,
      note: dto.note ?? null,
      recordedById: fam.memberId,
    });
    if (onBehalf && dto.dateContributed) {
      const d = new Date(dto.dateContributed);
      if (!isNaN(d.getTime())) c.createdAt = d;
    }
    return repo.save(c);
  }
}
