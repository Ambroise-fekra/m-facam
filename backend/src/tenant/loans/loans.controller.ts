import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { LoansService } from './loans.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@ApiTags('loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:id/repayments')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'Historique des remboursements (emprunteur + admins)' })
  list(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.loans.list(fam, id);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer un remboursement (emprunteur ou admin)' })
  record(
    @CurrentFamily() fam: FamilyContext,
    @Param('id') id: string,
    @Body() dto: CreateRepaymentDto,
  ) {
    return this.loans.record(fam, id, dto);
  }

  @Delete(':repayId')
  @ApiOperation({ summary: 'Supprimer un remboursement (admin) — saisie erronée' })
  remove(
    @CurrentFamily() fam: FamilyContext,
    @Param('id') id: string,
    @Param('repayId') repayId: string,
  ) {
    return this.loans.remove(fam, id, repayId);
  }
}
