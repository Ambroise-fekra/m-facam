import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { Member } from '../members/member.entity';
import { LoginDto } from './dto/login.dto';
import { Family } from '../../master/families/family.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantRouting: TenantRoutingService,
    private readonly jwtService: JwtService,
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
  ) {}

  /**
   * Recovers the family identifier(s) tied to an email. In production this would
   * email the result; here it is returned so the demo flow is testable.
   */
  async recoverIdentifier(email: string): Promise<{ identifiers: string[] }> {
    const rows = await this.familyRepo.manager.query(
      `SELECT DISTINCT family_identifier FROM member_directory WHERE lower(email) = lower($1)`,
      [email],
    );
    return { identifiers: rows.map((r: { family_identifier: string }) => r.family_identifier) };
  }

  /** Greeting info shown on the "set your password" invite page. */
  async inviteInfo(identifier: string, token: string) {
    const ds = await this.tenantRouting.getDataSourceFor(identifier);
    const m = await ds.getRepository(Member).findOne({ where: { inviteToken: token, isActive: true } });
    if (!m) throw new NotFoundException('Invitation invalide ou expirée');
    return {
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      familyId: identifier,
      // True when the member must provide an email at accept time (invited
      // via WhatsApp / phone only — email is needed afterwards to log in).
      needsEmail: !m.email,
    };
  }

  /**
   * Member accepts the invite, sets their own password (and an email if missing),
   * and is logged in.
   */
  async acceptInvite(identifier: string, token: string, password: string, email?: string) {
    const family = await this.tenantRouting.resolveFamily(identifier);
    const ds = await this.tenantRouting.getDataSourceFor(identifier);
    const repo = ds.getRepository(Member);
    const member = await repo.findOne({ where: { inviteToken: token, isActive: true } });
    if (!member) throw new NotFoundException('Invitation invalide ou expirée');
    // If the member was invited via WhatsApp (no email on file), they must
    // provide one now so they can sign in afterwards.
    if (!member.email) {
      const e = (email ?? '').trim().toLowerCase();
      if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        throw new NotFoundException('Un email valide est requis pour finaliser votre inscription.');
      }
      member.email = e;
      // Keep the master directory in sync so this new email can recover the
      // family identifier later (idempotent — no UNIQUE constraint, so guard).
      const existing = await this.familyRepo.manager.query(
        `SELECT 1 FROM member_directory WHERE lower(email) = lower($1) AND family_id = $2`,
        [e, family.id],
      );
      if (!existing.length) {
        await this.familyRepo.manager.query(
          `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
          [e, family.id, family.identifier],
        );
      }
    }
    member.passwordHash = await bcrypt.hash(password, 10);
    member.inviteToken = null;
    await repo.save(member);

    const jwt = this.jwtService.sign({
      sub: member.id,
      identifier: family.identifier,
      familyId: family.id,
      isAdmin: member.role === 'admin',
    });
    return {
      token: jwt,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
      },
      family: { id: family.id, identifier: family.identifier, name: family.name, status: family.status },
    };
  }

  async login(dto: LoginDto) {
    const family = await this.tenantRouting.resolveFamily(dto.identifier);
    // 'expired' families can still log in (during the 1-month grace) so the
    // admin can renew; only 'deleted' is fully locked out.
    if (family.status === 'deleted') {
      throw new UnauthorizedException('Cette famille a été supprimée');
    }
    const ds = await this.tenantRouting.getDataSourceFor(family.identifier);
    const memberRepo = ds.getRepository(Member);
    const member = await memberRepo.findOne({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });
    if (!member?.passwordHash || !(await bcrypt.compare(dto.password, member.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: member.id,
      identifier: family.identifier,
      familyId: family.id,
      isAdmin: member.role === 'admin',
    });

    return {
      token,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
      },
      family: {
        id: family.id,
        identifier: family.identifier,
        name: family.name,
        status: family.status,
      },
    };
  }
}
