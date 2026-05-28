import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { RecordManualContributionDto } from './dto/record-manual-contribution.dto';

@ApiTags('contributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a PayPal contribution — returns the approval URL' })
  start(@CurrentFamily() fam: FamilyContext, @Body() dto: CreateContributionDto) {
    return this.contributions.startContribution(fam, dto);
  }

  @Post('manual')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary:
      'Enregistrer manuellement une cotisation à la caisse pour un membre (admin) — versement hors-app (espèces, virement, etc.).',
  })
  recordManual(@CurrentFamily() fam: FamilyContext, @Body() dto: RecordManualContributionDto) {
    return this.contributions.recordManual(fam, dto);
  }

  @Get('me/balance')
  @ApiOperation({ summary: 'My own balance (private — others cannot see this)' })
  myBalance(@CurrentFamily() fam: FamilyContext) {
    return this.contributions.myBalance(fam);
  }

  @Get('cash')
  @ApiOperation({ summary: 'Aggregated cash level — no per-member detail' })
  cash(@CurrentFamily() fam: FamilyContext) {
    return this.contributions.globalCash(fam);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Liste des cotisations d'un membre (admin)" })
  list(@CurrentFamily() fam: FamilyContext, @Query('memberId') memberId: string) {
    return this.contributions.listForMember(fam, memberId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Supprimer une cotisation (admin) — saisie erronée" })
  remove(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.contributions.remove(fam, id);
  }
}
