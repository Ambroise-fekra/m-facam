import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRepaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(['transfer', 'cash', 'cheque', 'paypal', 'other'])
  method?: 'transfer' | 'cash' | 'cheque' | 'paypal' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
