import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Records how the collected funds were handed over to the event responsible. */
export class SettleEventDto {
  @IsEnum(['transfer', 'cash', 'cheque', 'paypal', 'mobile_money', 'other'])
  method: 'transfer' | 'cash' | 'cheque' | 'paypal' | 'mobile_money' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
