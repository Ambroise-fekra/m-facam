import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../master/families/family.entity';
import { FamilyContext } from '../../common/decorators/family-context.decorator';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Family, 'master') private readonly familyRepo: Repository<Family>,
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
    await this.familyRepo.update(
      { id: fam.familyId },
      {
        paypalEmail: dto.paypalEmail ?? undefined,
        whatsappUrl: dto.whatsappUrl ?? undefined,
        photo: dto.photo ?? undefined,
      },
    );
    return this.getFamily(fam);
  }
}
