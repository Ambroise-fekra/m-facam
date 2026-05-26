import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Family } from './family.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { TenantRoutingService } from '../tenant/tenant-routing.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { tenantDbName } from '../../config/database.config';
import { Member } from '../../tenant/members/member.entity';
import { EmailService } from '../../email/email.service';

@Injectable()
export class FamiliesService {
  private readonly logger = new Logger(FamiliesService.name);

  constructor(
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
    @InjectRepository(Subscription, 'master') private readonly subRepo: Repository<Subscription>,
    private readonly tenantRouting: TenantRoutingService,
    private readonly email: EmailService,
  ) {}

  /**
   * Builds a unique identifier of the form FAM-<CODE>-<SEQ>, where CODE is the
   * admin's free 3-10 char code and SEQ is a sequential, collision-checked
   * number — so every family identifier shares the same format and is unique.
   */
  private async generateIdentifier(code: string): Promise<string> {
    const base = `FAM-${code.toUpperCase()}`;
    let seq = (await this.familyRepo.count()) + 1;
    // Loop guards against races / pre-existing sequence numbers.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${base}-${String(seq).padStart(4, '0')}`;
      const exists = await this.familyRepo.findOne({ where: { identifier: candidate } });
      if (!exists) return candidate;
      seq++;
    }
  }

  /**
   * Creates a family + clones the tenant database + inserts the admin member.
   * Trial starts immediately; conversion happens via subscriptions.service.
   */
  async createFamily(dto: CreateFamilyDto): Promise<{ family: Family; subscription: Subscription }> {
    const identifier = await this.generateIdentifier(dto.code);

    const verifyToken = randomUUID();
    const family = this.familyRepo.create({
      identifier,
      name: dto.name,
      adminEmail: dto.adminEmail.toLowerCase(),
      paypalEmail: dto.paypalEmail ?? null,
      whatsappUrl: dto.whatsappUrl ?? null,
      status: 'trial',
      adminEmailVerified: false,
      emailVerifyToken: verifyToken,
      dbName: tenantDbName(identifier),
    });
    await this.familyRepo.save(family);

    // Directory entry so the admin can later recover the identifier by email.
    await this.familyRepo.manager.query(
      `INSERT INTO member_directory (email, family_id, family_identifier) VALUES ($1, $2, $3)`,
      [dto.adminEmail.toLowerCase(), family.id, family.identifier],
    );

    const trialDays = parseInt(process.env.TRIAL_DAYS ?? '30', 10);
    const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);
    const subscription = this.subRepo.create({
      familyId: family.id,
      state: 'trial',
      trialStartedAt: new Date(),
      trialEndsAt,
      priceEur: process.env.SUBSCRIPTION_PRICE_EUR ?? '20',
    });
    await this.subRepo.save(subscription);

    await this.tenantRouting.createTenantDatabase(family.identifier);

    const ds = await this.tenantRouting.getDataSourceFor(family.identifier);
    const memberRepo = ds.getRepository(Member);
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    await memberRepo.save(
      memberRepo.create({
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        email: dto.adminEmail.toLowerCase(),
        passwordHash,
        role: 'admin',
        isActive: true,
      }),
    );

    await this.email.sendFamilyCreated(family.adminEmail, family.name, family.identifier, verifyToken);

    this.logger.log(`Family ${family.identifier} created with trial until ${trialEndsAt.toISOString()}`);
    return { family, subscription };
  }

  /** Marks the admin email as verified from the token sent at sign-up. */
  async verifyEmail(token: string): Promise<{ verified: boolean; identifier?: string }> {
    if (!token) return { verified: false };
    const family = await this.familyRepo.findOne({ where: { emailVerifyToken: token } });
    if (!family) return { verified: false };
    family.adminEmailVerified = true;
    family.emailVerifyToken = null;
    await this.familyRepo.save(family);
    return { verified: true, identifier: family.identifier };
  }
}
