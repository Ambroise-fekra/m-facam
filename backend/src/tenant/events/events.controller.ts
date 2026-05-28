import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { VoteDto } from './dto/vote.dto';
import { SettleEventDto } from './dto/settle-event.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentFamily() fam: FamilyContext) {
    return this.events.list(fam);
  }

  @Get(':id')
  findOne(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.findOne(fam, id);
  }

  @Post()
  @ApiOperation({ summary: 'Proposer un évènement (soumis au vote de la famille)' })
  create(@CurrentFamily() fam: FamilyContext, @Body() dto: CreateEventDto) {
    return this.events.create(fam, dto);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Voter (oui/non) sur une proposition — modifiable avant échéance' })
  vote(@CurrentFamily() fam: FamilyContext, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.events.vote(fam, id, dto.value);
  }

  @Get(':id/vote/me')
  @ApiOperation({ summary: 'Mon vote actuel sur cette proposition' })
  myVote(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.myVoteFor(fam, id);
  }

  @Get(':id/tally')
  @ApiOperation({ summary: 'Décompte anonyme des votes' })
  tally(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.tallyFor(fam, id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: "Activer directement une proposition (admin)" })
  activate(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.adminActivate(fam, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeter une proposition (admin)' })
  reject(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.adminReject(fam, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Clôturer un évènement actif avant échéance (admin)' })
  close(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.events.adminClose(fam, id);
  }

  @Post(':id/extend')
  @ApiOperation({
    summary:
      'Prolonger un évènement (admin/chef) — étend la date limite et éventuellement la date prévue. ' +
      'Rouvre l\'évènement si il a été clos automatiquement et que le versement n\'a pas encore été fait.',
  })
  extend(
    @CurrentFamily() fam: FamilyContext,
    @Param('id') id: string,
    @Body() dto: { deadline?: string; eventDate?: string | null },
  ) {
    return this.events.extend(fam, id, dto);
  }

  @Post(':id/settle')
  @ApiOperation({ summary: 'Enregistrer le versement au responsable (admin)' })
  settle(@CurrentFamily() fam: FamilyContext, @Param('id') id: string, @Body() dto: SettleEventDto) {
    return this.events.settle(fam, id, dto);
  }
}
