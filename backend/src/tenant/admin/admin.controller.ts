import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentFamily, FamilyContext } from '../../common/decorators/family-context.decorator';
import { AdminService } from './admin.service';
import { UpdateFamilyDto } from './dto/update-family.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/family')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  getFamily(@CurrentFamily() fam: FamilyContext) {
    return this.admin.getFamily(fam);
  }

  @Patch()
  updateFamily(@CurrentFamily() fam: FamilyContext, @Body() dto: UpdateFamilyDto) {
    return this.admin.updateFamily(fam, dto);
  }
}
