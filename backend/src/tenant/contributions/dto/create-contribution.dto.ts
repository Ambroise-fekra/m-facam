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

  /**
   * Devise dans laquelle l'utilisateur a saisi le montant. EUR par défaut.
   * XAF = Franc CFA BEAC (parité fixe 1 EUR = 655,957 XAF). Le backend
   * convertit en EUR pour `amount` (canonique) et conserve la valeur
   * originelle pour l'historique.
   */
  @IsOptional()
  @IsEnum(['EUR', 'XAF'])
  currency?: 'EUR' | 'XAF';
}
