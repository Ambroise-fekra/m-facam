import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  eventId: string;

  /** Montant à allouer, dans la devise `currency` (EUR par défaut). */
  @IsNumber()
  @Min(1)
  amount: number;

  /** Devise du montant saisi (EUR par défaut). XAF = FCFA BEAC. */
  @IsOptional()
  @IsEnum(['EUR', 'XAF'])
  currency?: 'EUR' | 'XAF';
}
