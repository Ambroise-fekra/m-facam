import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { GenealogyService } from './genealogy.service';

@ApiTags('genealogy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('genealogy')
export class GenealogyController {
  constructor(private readonly genealogy: GenealogyService) {}

  @Get('tree')
  tree(@CurrentFamily() fam: FamilyContext) {
    return this.genealogy.fullTree(fam);
  }
}
