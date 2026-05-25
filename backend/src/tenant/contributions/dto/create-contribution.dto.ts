import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContributionDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  paypalReturnUrl?: string;
}
