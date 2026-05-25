import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { Member } from './member.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { Family } from '../../master/families/family.entity';

@Injectable()
export class MembersService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
  ) {}

  /** Non-sensitive family info any member can see (WhatsApp link, identifier...). */
  async familyInfo(fam: FamilyContext) {
    const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
    if (!family) throw new NotFoundException('Family not found');
    return {
      name: family.name,
      identifier: family.identifier,
      whatsappUrl: family.whatsappUrl,
      paypalEmail: family.paypalEmail,
      photo: family.photo,
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
      children,
    };
  }

  async create(fam: FamilyContext, dto: CreateMemberDto): Promise<{ id: string; inviteToken: string | null }> {
    const repo = await this.repo(fam.identifier);
    // If the member may log in but no password is set by the admin, generate an
    // invite token so they can choose their own password via an invite link.
    const passwordHash = dto.canLogin && dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const inviteToken = dto.canLogin && !dto.password ? randomUUID() : null;

    const member = repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
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
    // identifier by email later.
    const family = await this.familyRepo.findOne({ where: { id: fam.familyId } });
    if (family) {
      await this.familyRepo.manager.query(
        `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
        [saved.email, family.id, family.identifier],
      );
    }
    return { id: saved.id, inviteToken };
  }

  async me(fam: FamilyContext) {
    return this.findOne(fam, fam.memberId);
  }
}
