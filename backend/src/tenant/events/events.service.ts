import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Event } from './event.entity';
import { EventVote, VoteValue } from './event-vote.entity';
import { Allocation } from '../allocations/allocation.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../payments/payment-provider.interface';
import { Family } from '../../master/families/family.entity';
import { Member } from '../members/member.entity';

export interface VoteTally {
  yes: number;
  no: number;
  voters: number;
  totalMembers: number;
  quorumNeeded: number;
  majorityNeeded: number;
  quorumReached: boolean;
  passed: boolean;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly tenantRouting: TenantRoutingService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
  ) {}

  // ---------- Creation (always a proposal; admin can force-activate after) ----------

  async create(fam: FamilyContext, dto: CreateEventDto): Promise<Event> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Event);
    const decisionDeadline = dto.decisionDeadline
      ? new Date(dto.decisionDeadline)
      : new Date(Date.now() + 7 * 86_400_000);
    const event = repo.create({
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      targetAmount: dto.targetAmount.toFixed(2),
      eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      deadline: new Date(dto.deadline),
      decisionDeadline,
      responsibleId: dto.responsibleId,
      createdById: fam.memberId,
      status: 'proposed',
    });
    await repo.save(event);

    await this.notifications.broadcast(fam, 'event_created', {
      title: '🗳️ Nouvel évènement à voter',
      body: `${event.title} — votez avant le ${decisionDeadline.toLocaleDateString('fr-FR')}`,
      payload: { eventId: event.id, action: 'vote' },
    });
    return event;
  }

  // ---------- Reads ----------

  async list(fam: FamilyContext) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const events = await ds.getRepository(Event).find({
      relations: ['responsible'],
      order: { status: 'ASC', deadline: 'ASC' },
    });
    return Promise.all(events.map((e) => this.decorate(ds, fam, e)));
  }

  async findOne(fam: FamilyContext, id: string) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const event = await ds
      .getRepository(Event)
      .findOne({ where: { id }, relations: ['responsible'] });
    if (!event) throw new NotFoundException('Event not found');
    return this.decorate(ds, fam, event);
  }

  private async decorate(ds: DataSource, fam: FamilyContext, e: Event) {
    const responsibleName = e.responsible
      ? `${e.responsible.firstName} ${e.responsible.lastName}`
      : null;
    const base = {
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      targetAmount: e.targetAmount,
      eventDate: e.eventDate,
      deadline: e.deadline,
      decisionDeadline: e.decisionDeadline,
      responsibleId: e.responsibleId,
      responsibleName,
      status: e.status,
      createdAt: e.createdAt,
      closedAt: e.closedAt,
      totalCollected: await this.totalCollectedForEvent(ds, e.id),
      myAllocation: await this.myAllocationForEvent(ds, e.id, fam.memberId),
    };
    if (e.status === 'proposed') {
      return { ...base, tally: await this.tally(ds, e.id), myVote: await this.myVote(ds, e.id, fam.memberId) };
    }
    return { ...base, tally: null, myVote: null };
  }

  private async totalCollectedForEvent(ds: DataSource, eventId: string): Promise<string> {
    const row = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.event_id = :id', { id: eventId })
      .getRawOne();
    return Number(row?.total ?? 0).toFixed(2);
  }

  private async myAllocationForEvent(ds: DataSource, eventId: string, memberId: string): Promise<string> {
    const row = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.event_id = :id AND a.member_id = :m', { id: eventId, m: memberId })
      .getRawOne();
    return Number(row?.total ?? 0).toFixed(2);
  }

  // ---------- Voting ----------

  async vote(fam: FamilyContext, eventId: string, value: VoteValue) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const eventRepo = ds.getRepository(Event);
    const event = await eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'proposed') {
      throw new BadRequestException('Cet évènement n\'est plus ouvert au vote');
    }
    if (event.decisionDeadline && new Date() > endOfDay(event.decisionDeadline)) {
      throw new BadRequestException('La date limite de vote est dépassée');
    }

    const voteRepo = ds.getRepository(EventVote);
    let vote = await voteRepo.findOne({ where: { eventId, memberId: fam.memberId } });
    if (vote) {
      vote.value = value;
    } else {
      vote = voteRepo.create({ eventId, memberId: fam.memberId, value });
    }
    await voteRepo.save(vote);

    // Re-evaluate; auto-activate if the proposal already passes.
    const tally = await this.tally(ds, eventId);
    if (tally.passed) {
      await this.activateEvent(ds, fam, event, 'vote');
    }
    return { myVote: value, tally };
  }

  async myVoteFor(fam: FamilyContext, eventId: string) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return { value: await this.myVote(ds, eventId, fam.memberId) };
  }

  async tallyFor(fam: FamilyContext, eventId: string) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return this.tally(ds, eventId);
  }

  private async myVote(ds: DataSource, eventId: string, memberId: string): Promise<VoteValue | null> {
    const v = await ds.getRepository(EventVote).findOne({ where: { eventId, memberId } });
    return v?.value ?? null;
  }

  private async tally(ds: DataSource, eventId: string): Promise<VoteTally> {
    const votes = await ds.getRepository(EventVote).find({ where: { eventId } });
    const yes = votes.filter((v) => v.value === 'yes').length;
    const no = votes.filter((v) => v.value === 'no').length;
    const voters = yes + no;
    const totalMembers = await ds.getRepository(Member).count({ where: { isActive: true } });
    const quorumNeeded = Math.ceil((totalMembers * 2) / 3);
    const majorityNeeded = Math.ceil((voters * 2) / 3);
    const quorumReached = voters >= quorumNeeded && totalMembers > 0;
    const passed = voters > 0 && quorumReached && yes >= majorityNeeded;
    return { yes, no, voters, totalMembers, quorumNeeded, majorityNeeded, quorumReached, passed };
  }

  // ---------- Admin overrides ----------

  async adminActivate(fam: FamilyContext, eventId: string) {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const event = await ds.getRepository(Event).findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'proposed') {
      throw new BadRequestException('Seule une proposition peut être activée');
    }
    await this.activateEvent(ds, fam, event, 'admin');
    return { status: 'active' };
  }

  async adminReject(fam: FamilyContext, eventId: string) {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Event);
    const event = await repo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    event.status = 'rejected';
    await repo.save(event);
    await this.notifications.broadcast(fam, 'event_created', {
      title: 'Évènement rejeté',
      body: `La proposition "${event.title}" a été rejetée.`,
      payload: { eventId: event.id },
    });
    return { status: 'rejected' };
  }

  private async activateEvent(
    ds: DataSource,
    fam: FamilyContext,
    event: Event,
    via: 'vote' | 'admin',
  ) {
    event.status = 'active';
    await ds.getRepository(Event).save(event);
    await this.notifications.broadcast(fam, 'event_created', {
      title: '✅ Évènement activé',
      body:
        via === 'admin'
          ? `"${event.title}" a été activé par l'administrateur. Vous pouvez allouer.`
          : `"${event.title}" a obtenu la majorité. Vous pouvez allouer.`,
      payload: { eventId: event.id, action: 'allocate' },
    });
    this.logger.log(`Event ${event.id} activated via ${via}`);
  }

  // ---------- Cron: finalize proposals at decision deadline ----------

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'events.finalize-proposals' })
  async finalizeProposals(): Promise<void> {
    const families = await this.familyRepo.find({
      where: [{ status: 'active' }, { status: 'trial' }],
    });
    for (const family of families) {
      try {
        const ds = await this.tenantRouting.getDataSourceFor(family.identifier);
        const repo = ds.getRepository(Event);
        const due = await repo.find({
          where: { status: 'proposed', decisionDeadline: LessThan(new Date()) },
        });
        const ctx = { identifier: family.identifier, memberId: '', familyId: family.id, isAdmin: false } as FamilyContext;
        for (const event of due) {
          const tally = await this.tally(ds, event.id);
          if (tally.passed) {
            await this.activateEvent(ds, ctx, event, 'vote');
          } else {
            event.status = 'rejected';
            await repo.save(event);
            await this.notifications.broadcast(ctx, 'event_created', {
              title: 'Proposition non retenue',
              body: `"${event.title}" n'a pas atteint la majorité requise.`,
              payload: { eventId: event.id },
            });
          }
        }
      } catch (e) {
        this.logger.error(`finalizeProposals failed for ${family.identifier}: ${(e as Error).message}`);
      }
    }
  }

  // ---------- Cron: auto-close active events at deadline + payout ----------

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'events.auto-close' })
  async autoCloseDueEvents(): Promise<void> {
    const families = await this.familyRepo.find({
      where: [{ status: 'active' }, { status: 'trial' }],
    });
    for (const family of families) {
      try {
        await this.closeFamilyDueEvents(family);
      } catch (e) {
        this.logger.error(`Auto-close failed for ${family.identifier}: ${(e as Error).message}`);
      }
    }
  }

  private async closeFamilyDueEvents(family: Family) {
    const ds = await this.tenantRouting.getDataSourceFor(family.identifier);
    const repo = ds.getRepository(Event);
    const due = await repo.find({
      where: { status: 'active', deadline: LessThanOrEqual(new Date()) },
    });
    for (const event of due) {
      const total = await this.totalCollectedForEvent(ds, event.id);
      const responsible = await ds.getRepository(Member).findOne({ where: { id: event.responsibleId } });
      if (!responsible) {
        this.logger.warn(`Event ${event.id}: responsible missing, skipping`);
        continue;
      }
      const receiverEmail = responsible.paypalEmail ?? responsible.email;
      if (!receiverEmail) {
        // Responsible has no payout target (e.g. created without email). Skip the
        // auto-payout so funds aren't lost; an admin can settle it manually.
        this.logger.warn(`Event ${event.id}: responsible has no email/PayPal, skipping auto-payout`);
        continue;
      }
      const payoutTx = await this.payments.payout({
        receiverEmail,
        amountEur: Number(total),
        note: `FACAM event "${event.title}"`,
      });
      event.status = 'closed';
      event.closedAt = new Date();
      event.payoutPaypalTx = payoutTx;
      await repo.save(event);
      this.logger.log(`Event ${event.id} closed and ${total}€ paid to ${receiverEmail}`);
    }
  }
}

/** Treats a stored date (midnight) as inclusive of the whole day. */
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
