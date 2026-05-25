import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';

@ApiTags('master/families')
@Controller('master/families')
export class FamiliesController {
  constructor(private readonly families: FamiliesService) {}

  @Post()
  @ApiOperation({ summary: 'Sign up a new family — starts a 30-day free trial' })
  async create(@Body() dto: CreateFamilyDto) {
    const { family, subscription } = await this.families.createFamily(dto);
    return {
      identifier: family.identifier,
      name: family.name,
      adminEmail: family.adminEmail,
      emailVerificationSent: true,
      trial: {
        startedAt: subscription.trialStartedAt,
        endsAt: subscription.trialEndsAt,
      },
    };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify the admin email from the token sent at sign-up' })
  verifyEmail(@Body() body: { token: string }) {
    return this.families.verifyEmail(body.token ?? '');
  }
}
