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
import { Contribution } from '../contributions/contribution.entity';
import { LoanRepayment } from '../loans/loan-repayment.entity';
import { ExternalContribution } from '../external/external-contribution.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { SettleEventDto } from './dto/settle-event.dto';
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
    const eventRepo = ds.getRepository(Event);
    const memberRepo = ds.getRepository(Member);

    // Block: no one whose account is blocked / deceased / inactive can post an event.
    const me = await memberRepo.findOne({ where: { id: fam.memberId } });
    if (!me || !me.isActive) throw new ForbiddenException('Membre inactif');
    if (me.deceasedAt) throw new ForbiddenException('Membre décédé');
    if (me.isBlocked) {
      throw new ForbiddenException('Votre compte est bloqué (prêt impayé). Contactez l\'administrateur.');
    }

    let borrowerId: string | null = null;
    let responsibleId = dto.responsibleId;

    if (dto.type === 'loan') {
      // Loan-specific rules. Target amount IS required.
      if (!dto.targetAmount || dto.targetAmount <= 0) {
        throw new BadRequestException('Le montant du prêt est obligatoire');
      }
      if (!dto.borrowerId) throw new BadRequestException('L\'emprunteur est obligatoire pour un prêt');
      if (dto.borrowerId !== fam.memberId) {
        throw new BadRequestException('Seul l\'emprunteur lui-même peut demander son prêt');
      }
      // Caisse cap: loan ≤ 1/5 of the current global cash.
      const cash = await this.globalCashForLoan(ds);
      const cap = cash / 5;
      if (dto.targetAmount > cap + 0.005) {
        throw new BadRequestException(
          `Montant maximum d'un prêt : ${cap.toFixed(2)} € (1/5 de la caisse ${cash.toFixed(2)} €).`,
        );
      }
      // At most 2 active loans concurrently across the family.
      const active = await eventRepo.count({ where: { type: 'loan', status: 'active' } });
      const proposed = await eventRepo.count({ where: { type: 'loan', status: 'proposed' } });
      if (active + proposed >= 2) {
        throw new BadRequestException('La caisse a déjà 2 prêts en cours ou en cours de vote.');
      }
      borrowerId = dto.borrowerId;
      responsibleId = dto.borrowerId; // borrower receives the funds
    }

    const decisionDeadline = dto.decisionDeadline
      ? new Date(dto.decisionDeadline)
      : new Date(Date.now() + 7 * 86_400_000);
    // Target amount: required for loan, optional otherwise. 0 / undefined ⇒ null.
    const targetAmount = dto.targetAmount && dto.targetAmount > 0 ? dto.targetAmount.toFixed(2) : null;
    // Per-member suggestion (non-loan).
    const suggestedPerMember =
      dto.type !== 'loan' && dto.suggestedPerMember && dto.suggestedPerMember > 0
        ? dto.suggestedPerMember.toFixed(2)
        : null;
    const event = eventRepo.create({
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      targetAmount,
      suggestedPerMember,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      deadline: new Date(dto.deadline),
      decisionDeadline,
      responsibleId,
      borrowerId,
      createdById: fam.memberId,
      status: 'proposed',
    });
    await eventRepo.save(event);

    const titleNotif = dto.type === 'loan' ? '💰 Demande de prêt à voter' : '🗳️ Nouvel évènement à voter';
    await this.notifications.broadcast(fam, 'event_created', {
      title: titleNotif,
      body: `${event.title} — votez avant le ${decisionDeadline.toLocaleDateString('fr-FR')}`,
      payload: { eventId: event.id, action: 'vote' },
    });
    return event;
  }

  /** Inline cash computation used to enforce the 1/5 loan cap. Returns 0 if any
   * component is missing. */
  private async globalCashForLoan(ds: DataSource): Promise<number> {
    const contributed = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where("c.status = 'completed'")
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .getRawOne();
    const loansOut = await ds
      .getRepository(Event)
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.target_amount), 0)', 'total')
      .where("e.type = 'loan' AND e.payout_status = 'done'")
      .getRawOne();
    const repaid = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .getRawOne();
    return (
      Number(contributed?.total ?? 0) -
      Number(allocated?.total ?? 0) -
      Number(loansOut?.total ?? 0) +
      Number(repaid?.total ?? 0)
    );
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
    // For loan events: progress = repayments (not allocations) and there are no
    // member allocations to track.
    let totalCollected: string;
    let myAllocation: string;
    let borrowerName: string | null = null;
    if (e.type === 'loan') {
      totalCollected = await this.totalRepaidForLoan(ds, e.id);
      myAllocation = '0.00';
      if (e.borrowerId) {
        const b = await ds.getRepository(Member).findOne({ where: { id: e.borrowerId } });
        if (b) borrowerName = `${b.firstName} ${b.lastName}`;
      }
    } else if (e.type === 'external') {
      // Targeted contributions only — NOT from the member's share.
      totalCollected = await this.totalExternalForEvent(ds, e.id);
      myAllocation = await this.myExternalForEvent(ds, e.id, fam.memberId);
    } else {
      totalCollected = await this.totalCollectedForEvent(ds, e.id);
      myAllocation = await this.myAllocationForEvent(ds, e.id, fam.memberId);
    }
    // Count of distinct participants in the event's main flow:
    //   classical → distinct members who allocated
    //   external  → distinct members who contributed (earmarked)
    //   loan      → distinct members who repaid (typically 0 or 1)
    let participantsCount = 0;
    if (e.type === 'external') {
      const row = await ds
        .getRepository(ExternalContribution)
        .createQueryBuilder('c')
        .select('COUNT(DISTINCT c.member_id)', 'cnt')
        .where('c.event_id = :id', { id: e.id })
        .getRawOne();
      participantsCount = Number(row?.cnt ?? 0);
    } else if (e.type === 'loan') {
      const row = await ds
        .getRepository(LoanRepayment)
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.member_id)', 'cnt')
        .where('r.event_id = :id', { id: e.id })
        .getRawOne();
      participantsCount = Number(row?.cnt ?? 0);
    } else {
      const row = await ds
        .getRepository(Allocation)
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.member_id)', 'cnt')
        .where('a.event_id = :id', { id: e.id })
        .getRawOne();
      participantsCount = Number(row?.cnt ?? 0);
    }
    const base = {
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      targetAmount: e.targetAmount,
      suggestedPerMember: e.suggestedPerMember,
      eventDate: e.eventDate,
      deadline: e.deadline,
      decisionDeadline: e.decisionDeadline,
      responsibleId: e.responsibleId,
      responsibleName,
      borrowerId: e.borrowerId,
      borrowerName,
      status: e.status,
      createdAt: e.createdAt,
      closedAt: e.closedAt,
      totalCollected,
      myAllocation,
      participantsCount,
    };
    const withPayout = {
      ...base,
      payoutStatus: e.payoutStatus,
      payoutMethod: e.payoutMethod,
      payoutNote: e.payoutNote,
      payoutAt: e.payoutAt,
    };
    if (e.status === 'proposed') {
      return { ...withPayout, tally: await this.tally(ds, e.id), myVote: await this.myVote(ds, e.id, fam.memberId) };
    }
    return { ...withPayout, tally: null, myVote: null };
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

  private async totalRepaidForLoan(ds: DataSource, eventId: string): Promise<string> {
    const row = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where('r.event_id = :id', { id: eventId })
      .getRawOne();
    return Number(row?.total ?? 0).toFixed(2);
  }

  private async totalExternalForEvent(ds: DataSource, eventId: string): Promise<string> {
    const row = await ds
      .getRepository(ExternalContribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.event_id = :id', { id: eventId })
      .getRawOne();
    return Number(row?.total ?? 0).toFixed(2);
  }

  private async myExternalForEvent(ds: DataSource, eventId: string, memberId: string): Promise<string> {
    const row = await ds
      .getRepository(ExternalContribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.event_id = :id AND c.member_id = :m', { id: eventId, m: memberId })
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
    // Blocked / deceased / inactive members can't vote.
    const me = await ds.getRepository(Member).findOne({ where: { id: fam.memberId } });
    if (me?.deceasedAt) throw new ForbiddenException('Membre décédé — vote impossible');
    if (me && !me.isActive) throw new ForbiddenException('Membre inactif — vote impossible');
    if (me?.isBlocked) {
      throw new ForbiddenException('Votre compte est bloqué (prêt impayé).');
    }
    // The borrower can't vote on their own loan.
    if (event.type === 'loan' && event.borrowerId === fam.memberId) {
      throw new ForbiddenException('L\'emprunteur ne peut pas voter sur sa propre demande de prêt');
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
    const event = await ds.getRepository(Event).findOne({ where: { id: eventId } });
    const votes = await ds.getRepository(EventVote).find({ where: { eventId } });
    const yes = votes.filter((v) => v.value === 'yes').length;
    const no = votes.filter((v) => v.value === 'no').length;
    const voters = yes + no;
    // Defensive: a deceased member is never an active member, even if some
    // historical row had is_active=true. Quorum strictly counts members alive
    // AND active.
    let totalMembers = await ds
      .getRepository(Member)
      .createQueryBuilder('m')
      .where('m.is_active = true AND m.deceased_at IS NULL')
      .getCount();
    if (event?.type === 'loan' && event.borrowerId) totalMembers = Math.max(0, totalMembers - 1);
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
    const memberRepo = ds.getRepository(Member);
    const due = await repo.find({
      where: { status: 'active', deadline: LessThanOrEqual(new Date()) },
    });
    const ctx = { identifier: family.identifier, memberId: '', familyId: family.id, isAdmin: false } as FamilyContext;
    for (const event of due) {
      if (event.type === 'loan') {
        // Loan past deadline: if fully repaid → close, else block the borrower.
        const repaid = Number(await this.totalRepaidForLoan(ds, event.id));
        const target = Number(event.targetAmount);
        if (repaid + 0.005 >= target) {
          event.status = 'closed';
          event.closedAt = new Date();
          await repo.save(event);
          this.logger.log(`Loan ${event.id} closed (fully repaid).`);
        } else if (event.borrowerId) {
          await memberRepo.update({ id: event.borrowerId }, { isBlocked: true });
          const b = await memberRepo.findOne({ where: { id: event.borrowerId } });
          await this.notifications.broadcast(ctx, 'event_closed_payout', {
            title: '⚠️ Prêt impayé à l\'échéance',
            body: `${b ? b.firstName + ' ' + b.lastName : 'L\'emprunteur'} n'a pas remboursé "${event.title}" (reste dû ${(target - repaid).toFixed(2)} €). Son compte est bloqué jusqu\'à régularisation par l\'admin.`,
            payload: { eventId: event.id, action: 'overdue' },
          });
          this.logger.warn(`Loan ${event.id} overdue, borrower ${event.borrowerId} blocked.`);
        }
        continue;
      }
      // Non-loan: close + leave payout pending.
      const total = await this.totalCollectedForEvent(ds, event.id);
      const responsible = await memberRepo.findOne({ where: { id: event.responsibleId } });
      event.status = 'closed';
      event.closedAt = new Date();
      await repo.save(event);
      const who = responsible ? `${responsible.firstName} ${responsible.lastName}` : 'au responsable';
      await this.notifications.broadcast(ctx, 'event_closed_payout', {
        title: '🏁 Évènement clôturé',
        body: `"${event.title}" est clôturé. ${total}€ à remettre à ${who} — l'administrateur enregistrera le versement.`,
        payload: { eventId: event.id, action: 'settle' },
      });
      this.logger.log(`Event ${event.id} closed; ${total}€ awaiting manual payout`);
    }
  }

  // ---------- Closure & manual payout ----------

  /** Admin closes an active event before its deadline (funds ready early). */
  async adminClose(fam: FamilyContext, eventId: string) {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Event);
    const event = await repo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'active') throw new BadRequestException('Seul un évènement actif peut être clôturé');
    event.status = 'closed';
    event.closedAt = new Date();
    await repo.save(event);
    return this.findOne(fam, eventId);
  }

  /** Admin records the manual hand-over of the funds to the responsible. */
  async settle(fam: FamilyContext, eventId: string, dto: SettleEventDto) {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Event);
    const event = await repo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'closed') {
      throw new BadRequestException('Seul un évènement clôturé peut être marqué comme versé');
    }
    if (event.payoutStatus === 'done') {
      throw new BadRequestException('Ce versement est déjà enregistré');
    }
    event.payoutStatus = 'done';
    event.payoutMethod = dto.method;
    event.payoutNote = dto.note ?? null;
    event.payoutAt = new Date();
    event.payoutById = fam.memberId;
    await repo.save(event);
    return this.findOne(fam, eventId);
  }
}

/** Treats a stored date (midnight) as inclusive of the whole day. */
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
