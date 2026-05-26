import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated member' })
  me(@CurrentFamily() fam: FamilyContext) {
    return this.members.me(fam);
  }

  @Get('family-info')
  @ApiOperation({ summary: 'Non-sensitive family info (WhatsApp link, identifier) for any member' })
  familyInfo(@CurrentFamily() fam: FamilyContext) {
    return this.members.familyInfo(fam);
  }

  @Get('birthdays')
  @ApiOperation({ summary: 'Members with a birthday this month or next' })
  birthdays(@CurrentFamily() fam: FamilyContext) {
    return this.members.birthdays(fam);
  }

  @Get()
  @ApiOperation({ summary: 'List all family members' })
  list(@CurrentFamily() fam: FamilyContext) {
    return this.members.list(fam);
  }

  @Get(':id')
  findOne(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.members.findOne(fam, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a member profile (self or admin)' })
  update(@CurrentFamily() fam: FamilyContext, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.members.update(fam, id, dto);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Add a new member (admin only)' })
  create(@CurrentFamily() fam: FamilyContext, @Body() dto: CreateMemberDto) {
    return this.members.create(fam, dto);
  }

  @Post(':id/photo')
  @ApiOperation({ summary: 'Set a member photo (self or admin)' })
  setPhoto(@CurrentFamily() fam: FamilyContext, @Param('id') id: string, @Body() body: { photo: string }) {
    return this.members.setPhoto(fam, id, body.photo ?? '');
  }

  @Post(':id/enable-login')
  @ApiOperation({ summary: 'Activer la connexion d\'un membre (admin ou chef de famille)' })
  enableLogin(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.members.enableLogin(fam, id);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Bloquer un membre (admin) — empêche votes/évènements/prêts' })
  block(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.members.setBlocked(fam, id, true);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un membre (admin)' })
  unblock(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.members.setBlocked(fam, id, false);
  }
}
