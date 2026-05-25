import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

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
}
