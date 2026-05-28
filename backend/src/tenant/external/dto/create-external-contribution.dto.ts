import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateExternalContributionDto {
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

  /**
   * Optionnel : id du membre pour qui on enregistre la contribution. Réservé
   * à l'admin (versement hors-app à crediter à un autre membre). Sans cette
   * valeur, on agit au nom du membre authentifié.
   */
  @IsOptional()
  @IsUUID()
  memberId?: string;

  /** Date du versement (YYYY-MM-DD ou ISO complet). Admin only — par défaut maintenant. */
  @IsOptional()
  @IsString()
  dateContributed?: string;

  /** Devise du `amount` saisi (EUR par défaut). XAF = FCFA BEAC. */
  @IsOptional()
  @IsEnum(['EUR', 'XAF'])
  currency?: 'EUR' | 'XAF';
}
