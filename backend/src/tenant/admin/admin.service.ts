import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../master/families/family.entity';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { TenantRoutingService } from '../../master/tenant/tenant-routing.service';
import { Member } from '../members/member.entity';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
    private readonly tenantRouting: TenantRoutingService,
  ) {}

  async getFamily(fam: FamilyContext): Promise<Family> {
    const family = await this.familyRepo.findOne({
      where: { id: fam.familyId },
      relations: ['subscription'],
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async updateFamily(fam: FamilyContext, dto: UpdateFamilyDto): Promise<Family> {
    // Validate the chief is a real, active member of THIS family (cross-DB check).
    if (dto.chiefMemberId !== undefined && dto.chiefMemberId !== null) {
      const ds = await this.tenantRouting.getDataSourceFor(fam.identifier);
      const m = await ds
        .getRepository(Member)
        .findOne({ where: { id: dto.chiefMemberId, isActive: true } });
      if (!m) {
        throw new BadRequestException('Le chef de famille doit être un membre actif de la famille.');
      }
    }
    // Build a partial update so `null` is preserved (clearing the chief) and
    // omitted fields are left alone.
    const updates: Partial<Family> = {};
    if (dto.paypalEmail !== undefined) updates.paypalEmail = dto.paypalEmail;
    if (dto.whatsappUrl !== undefined) updates.whatsappUrl = dto.whatsappUrl;
    if (dto.photo !== undefined) updates.photo = dto.photo;
    if (dto.chiefMemberId !== undefined) updates.chiefMemberId = dto.chiefMemberId;
    if (dto.mobileMoneyNumber !== undefined) {
      // Normalise (supprime espaces, tirets…) — conserve un éventuel "+" initial.
      const raw = String(dto.mobileMoneyNumber ?? '').trim();
      if (!raw) {
        updates.mobileMoneyNumber = null;
      } else {
        const plus = raw.startsWith('+');
        const digits = raw.replace(/[^0-9]/g, '');
        updates.mobileMoneyNumber = digits ? (plus ? '+' : '') + digits : null;
      }
    }
    if (dto.mobileMoneyOperator !== undefined) updates.mobileMoneyOperator = dto.mobileMoneyOperator || null;
    if (Object.keys(updates).length > 0) {
      await this.familyRepo.update({ id: fam.familyId }, updates);
    }
    return this.getFamily(fam);
  }
}
