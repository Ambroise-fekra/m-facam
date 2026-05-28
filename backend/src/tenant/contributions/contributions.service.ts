import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Contribution } from './contribution.entity';
import { Allocation } from '../allocations/allocation.entity';
import { Event } from '../events/event.entity';
import { LoanRepayment } from '../loans/loan-repayment.entity';
import { Member } from '../members/member.entity';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { RecordManualContributionDto } from './dto/record-manual-contribution.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../payments/payment-provider.interface';
import { originalToCols } from '../../common/currency';

export interface MemberBalance {
  memberId: string;
  totalContributed: string;
  totalAllocated: string;
  balance: string;
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  async startContribution(fam: FamilyContext, dto: CreateContributionDto) {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Contribution);
    // dto.amount est saisi dans dto.currency (EUR par défaut). On stocke
    // l'EUR canonique en `amount` ET les valeurs originelles pour l'affichage
    // fidèle (10 000 FCFA reste 10 000 FCFA dans l'historique).
    const cols = originalToCols(dto.amount, dto.currency ?? 'EUR');
    const contribution = repo.create({
      memberId: fam.memberId,
      amount: cols.amount,
      originalAmount: cols.originalAmount,
      originalCurrency: cols.originalCurrency,
      status: 'pending',
      channel: dto.channel ?? null,
    });
    await repo.save(contribution);

    // Le checkout reçoit le montant dans la devise locale du provider :
    //  - PayPal accepte uniquement EUR -> on envoie amount EUR
    //  - CinetPay (phase 2, Congo) acceptera XAF -> on enverra original_amount
    // Pour Phase 1, tous les checkouts passent par le mock qui s'en moque.
    const checkout = await this.payments.createContributionCheckout({
      identifier: fam.identifier,
      contributionId: contribution.id,
      amountEur: Number(cols.amount),
    });
    return { contributionId: contribution.id, approveUrl: checkout.approveUrl };
  }

  /**
   * Admin / chef de famille enregistre manuellement une cotisation reçue
   * hors-app (espèces, virement direct, chèque) au profit d'un membre. La
   * cotisation est créée directement en status='completed', avec method,
   * note et date renseignés. Le membre est notifié.
   */
  async recordManual(fam: FamilyContext, dto: RecordManualContributionDto): Promise<Contribution> {
    if (!fam.isAdmin) {
      throw new ForbiddenException('Réservé à l\'administrateur');
    }
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const memberRepo = ds.getRepository(Member);
    const target = await memberRepo.findOne({ where: { id: dto.memberId } });
    if (!target) throw new NotFoundException('Membre introuvable');
    // Pas de cotisation pour un décédé : l'admin doit utiliser la fiche
    // d'un membre vivant pour les versements hors-app.
    if (target.isDeceased) {
      throw new BadRequestException('Impossible d\'enregistrer une cotisation pour un membre décédé');
    }
    const repo = ds.getRepository(Contribution);
    const cols = originalToCols(dto.amount, dto.currency ?? 'EUR');
    const c = repo.create({
      memberId: target.id,
      amount: cols.amount,
      originalAmount: cols.originalAmount,
      originalCurrency: cols.originalCurrency,
      status: 'completed',
      method: dto.method,
      channel: null,
      recordedById: fam.memberId,
      completedAt: new Date(),
    });
    // Backdating éventuel : on autorise l'admin à dater le versement dans le
    // passé. TypeORM permet de surcharger @CreateDateColumn si on fournit
    // explicitement createdAt à la création.
    if (dto.dateContributed) {
      const d = new Date(dto.dateContributed);
      if (!isNaN(d.getTime())) {
        c.createdAt = d;
        c.completedAt = d;
      }
    }
    const saved = await repo.save(c);

    // Notifier UNIQUEMENT le membre crédité (notification personnelle, pas
    // un broadcast à toute la famille).
    await this.notifications.notifyOne(fam, target.id, 'contribution_recorded', {
      title: 'Cotisation enregistrée pour vous',
      body: `L'administrateur a enregistré votre versement de ${saved.amount} € (${dto.method})${dto.note ? ' — ' + dto.note : ''}.`,
      payload: { contributionId: saved.id, amount: saved.amount, method: dto.method },
    });
    return saved;
  }

  /**
   * Admin supprime une cotisation à la caisse (saisie erronée, doublon,
   * mauvaise devise, etc.). Garde-fou : si le membre a déjà utilisé une
   * partie de ce crédit (allocations faites depuis), on refuse la
   * suppression — sinon son solde deviendrait négatif.
   */
  async remove(fam: FamilyContext, id: string): Promise<{ id: string; deleted: boolean }> {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const repo = ds.getRepository(Contribution);
    const c = await repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cotisation introuvable');

    // Vérifie que le solde du membre reste >= 0 après suppression.
    // Solde = contributions completed - allocations.
    const contributed = await repo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.member_id = :id AND c.status = :s', { id: c.memberId, s: 'completed' })
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.member_id = :id', { id: c.memberId })
      .getRawOne();
    const balance = Number(contributed?.total ?? 0) - Number(allocated?.total ?? 0);
    const willGoNegative = c.status === 'completed' && balance - Number(c.amount) < -0.005;
    if (willGoNegative) {
      throw new BadRequestException(
        `Suppression impossible : le membre a déjà utilisé une partie de ce crédit pour des allocations. Son solde serait négatif. Supprimez d'abord les allocations concernées.`,
      );
    }
    await repo.delete(c.id);
    return { id, deleted: true };
  }

  /**
   * Called when payment is captured — by the PayPal webhook, or by the local
   * mock checkout. No JWT here: the contributing member is derived from the
   * contribution row itself, so notifications still exclude the actor.
   */
  async confirmContribution(
    identifier: string,
    contributionId: string,
    paymentTxId: string,
    payerEmail: string,
  ): Promise<Contribution> {
    const ds = await this.tenantRouting.getDataSourceFor(identifier);
    const repo = ds.getRepository(Contribution);
    const c = await repo.findOne({ where: { id: contributionId } });
    if (!c) throw new NotFoundException('Contribution not found');
    c.status = 'completed';
    c.paypalTxId = paymentTxId;
    c.paypalPayerEmail = payerEmail;
    c.completedAt = new Date();
    await repo.save(c);

    const actor: FamilyContext = {
      identifier,
      familyId: '',
      memberId: c.memberId,
      isAdmin: false,
    };
    await this.notifications.broadcast(actor, 'contribution_received', {
      title: 'Nouvelle cotisation',
      body: `Un membre a versé ${c.amount} € à la caisse.`,
      payload: { contributionId: c.id, amount: c.amount },
    });
    return c;
  }

  /**
   * Admin liste les cotisations d'un membre (pour pouvoir en supprimer une
   * saisie erronée). Ordonné du plus récent au plus ancien.
   */
  async listForMember(fam: FamilyContext, memberId: string): Promise<Contribution[]> {
    if (!fam.isAdmin) throw new ForbiddenException('Réservé à l\'administrateur');
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    return ds.getRepository(Contribution).find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Returns the *own* balance of the authenticated member only — never the
   * breakdown for others.
   */
  async myBalance(fam: FamilyContext): Promise<MemberBalance> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const contributed = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.member_id = :id AND c.status = :s', { id: fam.memberId, s: 'completed' })
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .where('a.member_id = :id', { id: fam.memberId })
      .getRawOne();
    const totalContributed = Number(contributed?.total ?? 0);
    const totalAllocated = Number(allocated?.total ?? 0);
    return {
      memberId: fam.memberId,
      totalContributed: totalContributed.toFixed(2),
      totalAllocated: totalAllocated.toFixed(2),
      balance: (totalContributed - totalAllocated).toFixed(2),
    };
  }

  /**
   * Caisse globale — montant total collecté toutes contributions confondues.
   * Visible par tous mais sans détail par membre.
   */
  async globalCash(fam: FamilyContext): Promise<{
    totalCash: string;
    totalAllocated: string;
    loansOutstanding: string;
    loansActiveCount: number;
    contributorsCount: number;
  }> {
    const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
    const contributed = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.status = :s', { s: 'completed' })
      .getRawOne();
    const allocated = await ds
      .getRepository(Allocation)
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)', 'total')
      .getRawOne();
    // All disbursed loans (whether still active or already closed) and all
    // repayments — the difference is what's effectively "out" of the caisse.
    const loansOutAll = await ds
      .getRepository(Event)
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.target_amount), 0)', 'total')
      .where("e.type = 'loan' AND e.payout_status = 'done'")
      .getRawOne();
    const repaidAll = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .getRawOne();
    // "Outstanding to be repaid" considers ONLY loans still active (closed
    // loans are either fully repaid or written off).
    const loansOutActive = await ds
      .getRepository(Event)
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.target_amount), 0)', 'total')
      .addSelect('COUNT(e.id)', 'cnt')
      .where("e.type = 'loan' AND e.payout_status = 'done' AND e.status <> 'closed'")
      .getRawOne();
    const repaidActive = await ds
      .getRepository(LoanRepayment)
      .createQueryBuilder('r')
      .innerJoin(Event, 'e', 'e.id = r.event_id')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .where("e.type = 'loan' AND e.payout_status = 'done' AND e.status <> 'closed'")
      .getRawOne();
    const totalCash =
      Number(contributed?.total ?? 0) -
      Number(allocated?.total ?? 0) -
      Number(loansOutAll?.total ?? 0) +
      Number(repaidAll?.total ?? 0);
    const loansOutstanding = Math.max(
      0,
      Number(loansOutActive?.total ?? 0) - Number(repaidActive?.total ?? 0),
    );
    const contributors = await ds
      .getRepository(Contribution)
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.member_id)', 'cnt')
      .where('c.status = :s', { s: 'completed' })
      .getRawOne();
    return {
      totalCash: totalCash.toFixed(2),
      totalAllocated: Number(allocated?.total ?? 0).toFixed(2),
      loansOutstanding: loansOutstanding.toFixed(2),
      loansActiveCount: Number(loansOutActive?.cnt ?? 0),
      contributorsCount: Number(contributors?.cnt ?? 0),
    };
  }
}
