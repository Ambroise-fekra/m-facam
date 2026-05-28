import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContributionDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  paypalReturnUrl?: string;

  /** Canal choisi par le membre : 'paypal' (Europe) ou 'mobile_money' (Congo). */
  @IsOptional()
  @IsEnum(['paypal', 'mobile_money'])
  channel?: 'paypal' | 'mobile_money';
}
