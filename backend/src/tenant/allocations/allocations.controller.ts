import { Controller, Delete, Get, Param, Body, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';

@ApiTags('allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Allocate part of my personal balance to an event' })
  allocate(@CurrentFamily() fam: FamilyContext, @Body() dto: CreateAllocationDto) {
    return this.allocations.allocate(fam, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des allocations pour un évènement (admin)' })
  list(@CurrentFamily() fam: FamilyContext, @Query('eventId') eventId: string) {
    return this.allocations.listForEvent(fam, eventId);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer une allocation (admin) — saisie erronée" })
  remove(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.allocations.remove(fam, id);
  }
}
