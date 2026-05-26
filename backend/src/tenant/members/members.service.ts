import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { Member, MemberGender } from './member.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { DeclareDescendantDto } from './dto/declare-descendant.dto';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Family } from '../../master/families/family.entity';

@Injectable()
export class MembersService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
  ) {}

  /**
   * Non-sensitive family info any member can see (WhatsApp link, identifier,
   * plus the admin and chef-de-famille names+phones for the dashboard header).
   */
  async familyInfo(fam: FamilyContext) {
    const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
    if (!family) throw new NotFoundException('Family not found');
    const repo = await this.repo(fam.identifier);
    const adminM = await repo.findOne({ where: { role: 'admin' } });
    const chiefM = family.chiefMemberId
      ? await repo.findOne({ where: { id: family.chiefMemberId } })
      : null;
    const mini = (m: Member | null) =>
      m ? { id: m.id, firstName: m.firstName, lastName: m.lastName, phone: m.phone } : null;
    return {
      name: family.name,
      identifier: family.identifier,
      whatsappUrl: family.whatsappUrl,
      paypalEmail: family.paypalEmail,
      photo: family.photo,
      admin: mini(adminM),
      chief: mini(chiefM),
    };
  }

  /** Sets a member's photo (data URL). Allowed for the member themselves or an admin. */
  async setPhoto(fam: FamilyContext, memberId: string, photo: string) {
    if (memberId !== fam.memberId && !fam.isAdmin) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre photo');
    }
    const repo = await this.repo(fam.identifier);
    const m = await repo.findOne({ where: { id: memberId } });
    if (!m) throw new NotFoundException('Member not found');
    m.photo = photo || null;
    await repo.save(m);
    return { ok: true };
  }

  private async repo(identifier: string) {
    const ds = await this.tenantRouting.getDataSourceFor(identifier);
    return ds.getRepository(Member);
  }

  async list(fam: FamilyContext) {
    const repo = await this.repo(fam.identifier);
    const members = await repo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
    return members.map((m) => this.enrich(m, members));
  }

  async findOne(fam: FamilyContext, id: string) {
    const repo = await this.repo(fam.identifier);
    const members = await repo.find();
    const m = members.find((x) => x.id === id);
    if (!m) throw new NotFoundException('Member not found');
    return this.enrich(m, members);
  }

  /** Adds parent names and immediate descendants (children) derived from filiation. */
  private enrich(m: Member, all: Member[]) {
    const nameOf = (id: string | null) => {
      const p = id ? all.find((x) => x.id === id) : null;
      return p ? `${p.firstName} ${p.lastName}` : null;
    };
    const children = all
      .filter((x) => x.fatherId === m.id || x.motherId === m.id)
      .map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }));
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      birthDate: m.birthDate,
      gender: m.gender,
      paypalEmail: m.paypalEmail,
      role: m.role,
      fatherId: m.fatherId,
      motherId: m.motherId,
      fatherName: nameOf(m.fatherId),
      motherName: nameOf(m.motherId),
      photo: m.photo,
      isActive: m.isActive,
      isBlocked: m.isBlocked,
      deceasedAt: m.deceasedAt ? String(m.deceasedAt).substring(0, 10) : null,
      // True if this member has any way to log in (already has a password OR
      // an outstanding invite link). Used by the UI to offer "Activer la
      // connexion" only when needed.
      canLogin: !!(m.passwordHash || m.inviteToken),
      children,
    };
  }

  async create(fam: FamilyContext, dto: CreateMemberDto): Promise<{ id: string; inviteToken: string | null }> {
    const repo = await this.repo(fam.identifier);
    // A member who can log in must have an email (used to sign in / invite).
    if (dto.canLogin && !dto.email) {
      throw new BadRequestException('Un membre qui peut se connecter doit avoir un email.');
    }
    // If the member may log in but no password is set by the admin, generate an
    // invite token so they can choose their own password via an invite link.
    const passwordHash = dto.canLogin && dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const inviteToken = dto.canLogin && !dto.password ? randomUUID() : null;
    const email = dto.email ? dto.email.toLowerCase() : null;

    const member = repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      phone: dto.phone ?? null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      gender: dto.gender ?? null,
      paypalEmail: dto.paypalEmail ?? null,
      fatherId: dto.fatherId ?? null,
      motherId: dto.motherId ?? null,
      role: 'member',
      isActive: true,
      passwordHash,
      inviteToken,
    });
    const saved = await repo.save(member);

    // Keep the master directory in sync so this member can recover the family
    // identifier by email later (only meaningful for members with an email).
    if (email) {
      const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
      if (family) {
        await this.familyRepo.manager.query(
          `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
          [email, family.id, family.identifier],
        );
      }
    }
    return { id: saved.id, inviteToken };
  }

  async me(fam: FamilyContext) {
    return this.findOne(fam, fam.memberId);
  }

  /** True if the caller is the admin OR the designated chef de famille. */
  private async isAdminOrChief(fam: FamilyContext): Promise<boolean> {
    if (fam.isAdmin) return true;
    const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
    return !!family && family.chiefMemberId === fam.memberId;
  }

  /**
   * Enables login for a member who was created without an access (typically
   * a child or an ancestor added to the genealogy). Generates an invite token
   * if none exists; the member opens the link, picks a password and joins.
   * Reserved to the admin or the chef de famille.
   */
  async enableLogin(fam: FamilyContext, id: string): Promise<{ id: string; inviteToken: string }> {
    if (!(await this.isAdminOrChief(fam))) {
      throw new ForbiddenException('Réservé à l\'administrateur ou au chef de famille');
    }
    const repo = await this.repo(fam.identifier);
    const m = await repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    if (m.deceasedAt) {
      throw new BadRequestException('Ce membre est marqué comme décédé — la connexion ne peut pas être activée.');
    }
    if (!m.email) {
      throw new BadRequestException(
        'Ajoutez d\'abord un email à ce membre (via « Modifier le profil ») avant d\'activer la connexion.',
      );
    }
    if (m.passwordHash) {
      // Already able to log in; just make sure they're active too.
      if (!m.isActive) {
        m.isActive = true;
        await repo.save(m);
      }
      throw new BadRequestException('Ce membre peut déjà se connecter (un mot de passe est défini).');
    }
    // Activation = active member + invite link to set password.
    let changed = false;
    if (!m.isActive) { m.isActive = true; changed = true; }
    if (!m.inviteToken) { m.inviteToken = randomUUID(); changed = true; }
    if (changed) await repo.save(m);

    // If they're added to the master directory and didn't have an entry yet
    // (e.g. created inactive without email then email added), sync it now.
    const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
    if (family) {
      const exists = await this.familyRepo.manager.query(
        `SELECT 1 FROM member_directory WHERE email = $1 AND family_id = $2`,
        [m.email, family.id],
      );
      if (!exists.length) {
        await this.familyRepo.manager.query(
          `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
          [m.email, family.id, family.identifier],
        );
      }
    }
    return { id: m.id, inviteToken: m.inviteToken! };
  }

  /**
   * Any active, non-blocked member can declare one of their own children.
   * The parent link is inferred from the caller's gender (father if M,
   * mother if F). The created member is INACTIVE — admin or chef de famille
   * activates them later via "Activer la connexion".
   */
  async declareDescendant(fam: FamilyContext, dto: DeclareDescendantDto): Promise<{ id: string }> {
    const repo = await this.repo(fam.identifier);
    const me = await repo.findOne({ where: { id: fam.memberId } });
    if (!me || !me.isActive) throw new ForbiddenException('Membre inactif');
    if (me.isBlocked) throw new ForbiddenException('Votre compte est bloqué');
    if (me.gender !== 'M' && me.gender !== 'F') {
      throw new BadRequestException(
        'Renseignez d\'abord votre sexe (Masculin ou Féminin) dans votre profil avant de déclarer un descendant.',
      );
    }
    const member = repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      phone: dto.phone || null,
      email: dto.email ? dto.email.toLowerCase() : null,
      fatherId: me.gender === 'M' ? me.id : null,
      motherId: me.gender === 'F' ? me.id : null,
      role: 'member',
      // Created INACTIVE — admin / chef de famille activates later.
      isActive: false,
      passwordHash: null,
      inviteToken: null,
    });
    const saved = await repo.save(member);
    return { id: saved.id };
  }

  /** Admin only: toggle the is_blocked flag (e.g. after a loan is settled). */
  async setBlocked(fam: FamilyContext, id: string, blocked: boolean) {
    if (!fam.isAdmin) {
      throw new ForbiddenException('Réservé à l\'administrateur');
    }
    const repo = await this.repo(fam.identifier);
    const m = await repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    m.isBlocked = blocked;
    await repo.save(m);
    return { id: m.id, isBlocked: m.isBlocked };
  }

  /** Updates a member's profile. Self / admin / chef de famille. The `deceasedAt`
   * field requires admin or chef explicitly (a member can't mark themselves dead).
   */
  async update(fam: FamilyContext, id: string, dto: UpdateMemberDto) {
    const isSelf = id === fam.memberId;
    const isAdminOrChief = await this.isAdminOrChief(fam);
    if (!isSelf && !isAdminOrChief) {
      throw new ForbiddenException('Réservé au membre lui-même, à l\'administrateur ou au chef de famille');
    }
    if (dto.deceasedAt !== undefined && !isAdminOrChief) {
      throw new ForbiddenException('Seul l\'administrateur ou le chef de famille peut enregistrer un décès');
    }
    const repo = await this.repo(fam.identifier);
    const m = await repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');

    if (dto.firstName !== undefined) m.firstName = dto.firstName;
    if (dto.lastName !== undefined) m.lastName = dto.lastName;
    if (dto.phone !== undefined) m.phone = dto.phone || null;
    if (dto.gender !== undefined) m.gender = (dto.gender || null) as MemberGender | null;
    if (dto.paypalEmail !== undefined) m.paypalEmail = dto.paypalEmail || null;
    if (dto.birthDate !== undefined) m.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.fatherId !== undefined) {
      if (dto.fatherId === id) throw new BadRequestException('Un membre ne peut pas être son propre parent');
      m.fatherId = dto.fatherId || null;
    }
    if (dto.motherId !== undefined) {
      if (dto.motherId === id) throw new BadRequestException('Un membre ne peut pas être son propre parent');
      m.motherId = dto.motherId || null;
    }
    if (dto.deceasedAt !== undefined) {
      if (dto.deceasedAt) {
        m.deceasedAt = new Date(dto.deceasedAt);
        // A deceased member is no longer counted in quorum, can't be a parent
        // selected as responsible/borrower, etc.
        m.isActive = false;
      } else {
        m.deceasedAt = null;
        // Clearing the death date does NOT automatically re-activate — admin
        // may choose to re-activate via "Activer la connexion".
      }
    }
    await repo.save(m);
    const all = await repo.find();
    return this.enrich(m, all);
  }

  /**
   * Members whose birthday falls in the current or next calendar month, sorted
   * (this month first, then by day). Birthdays are shared within the family —
   * no money information is exposed.
   */
  async birthdays(fam: FamilyContext) {
    const repo = await this.repo(fam.identifier);
    const members = await repo.find();
    const now = new Date();
    const curYear = now.getFullYear();
    const cur = now.getMonth() + 1;
    const nxt = cur === 12 ? 1 : cur + 1;
    return members
      .filter((m) => !!m.birthDate && !m.deceasedAt)
      .map((m) => {
        const [by, bm, bd] = String(m.birthDate).substring(0, 10).split('-').map(Number);
        return { m, by, bm, bd };
      })
      .filter((x) => x.bm === cur || x.bm === nxt)
      .map(({ m, by, bm, bd }) => {
        const isThisMonth = bm === cur;
        const occYear = isThisMonth ? curYear : cur === 12 ? curYear + 1 : curYear;
        return {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          photo: m.photo,
          birthDate: String(m.birthDate).substring(0, 10),
          day: bd,
          month: bm,
          turningAge: occYear - by,
          isThisMonth,
        };
      })
      .sort((a, b) => (a.isThisMonth === b.isThisMonth ? a.day - b.day : a.isThisMonth ? -1 : 1));
  }
}
