import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

/**
 * Saisie d'une cotisation à la caisse familiale par l'admin pour le compte
 * d'un membre. Utilisé pour les versements hors-app (espèces, virement direct,
 * chèque, etc.) qui ne passent pas par le checkout in-app.
 */
export class RecordManualContributionDto {
  /** Membre à créditer. */
  @IsUUID()
  memberId: string;

  /** Montant en EUR. */
  @IsNumber()
  @Min(0.01)
  amount: number;

  /** Mode de versement réellement utilisé. */
  @IsEnum(['transfer', 'cash', 'cheque', 'paypal', 'mobile_money', 'other'])
  method: 'transfer' | 'cash' | 'cheque' | 'paypal' | 'mobile_money' | 'other';

  /**
   * Date du versement (YYYY-MM-DD ou ISO complet). Permet de backdater une
   * cotisation reçue il y a quelques jours. Par défaut : maintenant.
   */
  @IsOptional()
  @IsString()
  dateContributed?: string;

  /** Note libre (référence virement, contexte du versement, etc.). */
  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;

  /** Devise du `amount` saisi (EUR par défaut). XAF = FCFA BEAC. */
  @IsOptional()
  @IsEnum(['EUR', 'XAF'])
  currency?: 'EUR' | 'XAF';
}
