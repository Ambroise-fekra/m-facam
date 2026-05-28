import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { ExternalService } from './external.service';
import { CreateExternalContributionDto } from './dto/create-external-contribution.dto';

@ApiTags('external')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:id/external-contributions')
export class ExternalController {
  constructor(private readonly external: ExternalService) {}

  @Get()
  @ApiOperation({ summary: 'Historique des contributions externes pour cet évènement' })
  list(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.external.list(fam, id);
  }

  @Post()
  @ApiOperation({ summary: 'Contribuer (cotisation ciblée) à un évènement externe' })
  contribute(
    @CurrentFamily() fam: FamilyContext,
    @Param('id') id: string,
    @Body() dto: CreateExternalContributionDto,
  ) {
    return this.external.contribute(fam, id, dto);
  }

  @Delete(':contribId')
  @ApiOperation({ summary: 'Supprimer une contribution externe (admin) — saisie erronée' })
  remove(
    @CurrentFamily() fam: FamilyContext,
    @Param('id') id: string,
    @Param('contribId') contribId: string,
  ) {
    return this.external.remove(fam, id, contribId);
  }
}
