import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRepaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(['transfer', 'cash', 'cheque', 'paypal', 'mobile_money', 'other'])
  method?: 'transfer' | 'cash' | 'cheque' | 'paypal' | 'mobile_money' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  /** Date du remboursement (YYYY-MM-DD ou ISO complet). Admin only — backdating. */
  @IsOptional()
  @IsString()
  dateContributed?: string;

  /** Devise du `amount` saisi (EUR par défaut). XAF = FCFA BEAC. */
  @IsOptional()
  @IsEnum(['EUR', 'XAF'])
  currency?: 'EUR' | 'XAF';
}
