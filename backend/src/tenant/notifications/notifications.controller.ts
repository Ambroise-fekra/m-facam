import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentFamily() fam: FamilyContext) {
    return this.notifications.listForMember(fam);
  }

  @Patch(':id/read')
  markRead(@CurrentFamily() fam: FamilyContext, @Param('id') id: string) {
    return this.notifications.markRead(fam, id);
  }
}
