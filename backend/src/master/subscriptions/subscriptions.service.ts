import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Family } from '../families/family.entity';
import { Subscription } from './subscription.entity';
import { TenantRoutingService } from '../tenant/tenant-routing.service';
import { EmailService } from '../../email/email.service';

const DAY = 86_400_000;
const GRACE_DAYS = 30;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
    @InjectRepository(Subscription, 'master') private readonly subRepo: Repository<Subscription>,
    private readonly tenantRouting: TenantRoutingService,
    private readonly email: EmailService,
  ) {}

  async getForFamily(familyId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { familyId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  /**
   * Converts a trial (or reactivates a deactivated family) into a paid year once
   * payment is confirmed (PayPal webhook or mock checkout).
   */
  async confirmPayment(familyId: string, paypalSubscriptionId: string): Promise<Subscription> {
    const sub = await this.getForFamily(familyId);
    if (sub.state === 'deleted') {
      throw new BadRequestException('Subscription is already deleted');
    }
    const from = sub.activeUntil && sub.activeUntil.getTime() > Date.now() ? sub.activeUntil.getTime() : Date.now();
    sub.state = 'active';
    sub.paypalSubscriptionId = paypalSubscriptionId;
    sub.activeUntil = new Date(from + 365 * DAY);
    sub.graceEndsAt = null;
    await this.subRepo.save(sub);

    await this.familyRepo.update({ id: familyId }, { status: 'active' });
    this.logger.log(`Family ${familyId} activated until ${sub.activeUntil.toISOString()}`);
    return sub;
  }

  // ----- Reminders (08:00 daily) -----

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'subscriptions.reminders' })
  async sendReminders(): Promise<void> {
    const now = Date.now();
    const subs = await this.subRepo.find();
    for (const sub of subs) {
      const family = await this.familyRepo.findOne({ where: { id: sub.familyId } });
      if (!family || family.status === 'deleted') continue;
      // End date depends on state: trial → trialEndsAt, active → activeUntil, grace → graceEndsAt.
      const end =
        sub.state === 'trial' ? sub.trialEndsAt :
        sub.state === 'active' ? sub.activeUntil :
        sub.graceEndsAt;
      if (!end) continue;
      const daysLeft = Math.ceil((end.getTime() - now) / DAY);
      if (![14, 7, 3, 1].includes(daysLeft)) continue;
      try {
        if (sub.state === 'past_due') {
          await this.email.sendDeactivated(family.adminEmail, family.identifier, end);
        } else {
          await this.email.sendTrialReminder(family.adminEmail, family.identifier, daysLeft);
        }
      } catch (e) {
        this.logger.error(`Reminder failed for ${family.identifier}: ${(e as Error).message}`);
      }
    }
  }

  // ----- Lifecycle (03:00 daily): deactivate then delete -----

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'subscriptions.lifecycle' })
  async runLifecycle(): Promise<void> {
    const now = new Date();

    // 1. Trials past end without payment → deactivate (1-month grace).
    const endedTrials = await this.subRepo.find({ where: { state: 'trial', trialEndsAt: LessThan(now) } });
    for (const sub of endedTrials) {
      await this.deactivate(sub, sub.trialEndsAt);
    }

    // 2. Active subscriptions past renewal → deactivate (1-month grace).
    const lapsed = await this.subRepo
      .createQueryBuilder('s')
      .where('s.state = :st', { st: 'active' })
      .andWhere('s.active_until IS NOT NULL AND s.active_until < :now', { now })
      .getMany();
    for (const sub of lapsed) {
      await this.deactivate(sub, sub.activeUntil ?? now);
    }

    // 3. Grace elapsed without payment → permanent deletion.
    const toDelete = await this.subRepo
      .createQueryBuilder('s')
      .where('s.state = :st', { st: 'past_due' })
      .andWhere('s.grace_ends_at IS NOT NULL AND s.grace_ends_at < :now', { now })
      .getMany();
    for (const sub of toDelete) {
      await this.purge(sub);
    }
  }

  private async deactivate(sub: Subscription, fromDate: Date): Promise<void> {
    const family = await this.familyRepo.findOne({ where: { id: sub.familyId } });
    if (!family || family.status === 'deleted') return;
    const graceEndsAt = new Date(fromDate.getTime() + GRACE_DAYS * DAY);
    sub.state = 'past_due';
    sub.graceEndsAt = graceEndsAt;
    await this.subRepo.save(sub);
    family.status = 'expired';
    await this.familyRepo.save(family);
    try {
      await this.email.sendDeactivated(family.adminEmail, family.identifier, graceEndsAt);
    } catch {
      /* email best-effort */
    }
    this.logger.warn(`Family ${family.identifier} deactivated — grace until ${graceEndsAt.toISOString()}`);
  }

  private async purge(sub: Subscription): Promise<void> {
    const family = await this.familyRepo.findOne({ where: { id: sub.familyId } });
    if (!family) return;
    try {
      await this.tenantRouting.dropTenantDatabase(family.identifier);
      sub.state = 'deleted';
      await this.subRepo.save(sub);
      family.status = 'deleted';
      await this.familyRepo.save(family);
      this.logger.warn(`Family ${family.identifier} permanently deleted after grace`);
    } catch (e) {
      this.logger.error(`Failed to purge family ${family.identifier}: ${(e as Error).message}`);
    }
  }
}
