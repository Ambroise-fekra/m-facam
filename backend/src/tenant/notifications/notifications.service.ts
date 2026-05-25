import { Injectable, Logger } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Member } from '../members/member.entity';
import { Notification, NotificationType } from './notification.entity';

interface BroadcastPayload {
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly tenantRouting: TenantRoutingService) {}

  async listForMember(fam: FamilyContext): Promise<Notification[]> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return ds.getRepository(Notification).find({
      where: { memberId: fam.memberId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markRead(fam: FamilyContext, id: string): Promise<void> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    await ds
      .getRepository(Notification)
      .update({ id, memberId: fam.memberId }, { readAt: new Date() });
  }

  /**
   * Persists one notification per family member (excluding the actor) for a
   * given event. FCM push dispatch is delegated to a follow-up worker job.
   */
  async broadcast(
    fam: FamilyContext,
    type: NotificationType,
    payload: BroadcastPayload,
  ): Promise<void> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const members = await ds.getRepository(Member).find({ where: { isActive: true } });
    const repo = ds.getRepository(Notification);
    const rows = members
      .filter((m) => m.id !== fam.memberId)
      .map((m) =>
        repo.create({
          memberId: m.id,
          type,
          title: payload.title,
          body: payload.body,
          payload: payload.payload ?? null,
        }),
      );
    if (rows.length === 0) return;
    await repo.save(rows);
    this.logger.log(`Broadcasted ${rows.length} ${type} notifications in ${fam.identifier}`);
  }
}
