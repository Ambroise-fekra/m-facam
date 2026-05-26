import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { Member, MemberGender } from './member.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
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
      isBlocked: m.isBlocked,
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

  /** Updates a member's profile. Allowed for the member themselves or an admin. */
  async update(fam: FamilyContext, id: string, dto: UpdateMemberDto) {
    if (id !== fam.memberId && !fam.isAdmin) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
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
      .filter((m) => !!m.birthDate)
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
