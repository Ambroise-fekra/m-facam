import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Personal transaction history (credits + debits)' })
  myTransactions(@CurrentFamily() fam: FamilyContext) {
    return this.transactions.myTransactions(fam);
  }
}
