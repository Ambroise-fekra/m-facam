import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';

/**
 * Partial update of a member's own profile (or any member, if admin).
 * Empty strings clear a value; omitted fields are left unchanged.
 * Parents and dates are validated loosely on purpose so the UI can send
 * '' to detach a parent or clear a birth date.
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthDate?: string; // 'YYYY-MM-DD' or '' to clear

  @IsOptional()
  @IsEnum(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

  @IsOptional()
  @IsString()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  fatherId?: string; // uuid or '' to detach

  @IsOptional()
  @IsString()
  motherId?: string; // uuid or '' to detach

  /** Membre décédé (case à cocher du profil). Réservé à l'admin/chef. */
  @IsOptional()
  @IsBoolean()
  isDeceased?: boolean;

  /** Date du décès (YYYY-MM-DD) ou '' pour effacer. Facultatif (ancêtres). */
  @IsOptional()
  @IsString()
  deceasedAt?: string;

  /** Indicateur "membre actif" (peut voter, est compté dans le quorum). Réservé à l'admin/chef. */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Numéro Mobile Money personnel (pour recevoir un versement). */
  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;

  /** Opérateur Mobile Money personnel : mtn | orange | airtel | moov | other. */
  @IsOptional()
  @IsString()
  mobileMoneyOperator?: string;

  /** Canal préféré : 'paypal' | 'mobile_money' | '' (efface). */
  @IsOptional()
  @IsEnum(['paypal', 'mobile_money', ''])
  preferredChannel?: 'paypal' | 'mobile_money' | '';
}
