import { IsEmail, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateFamilyDto {
  @IsOptional()
  @IsEmail()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  whatsappUrl?: string;

  /** Family logo as a resized data URL. */
  @IsOptional()
  @IsString()
  photo?: string;

  /** Chef de famille (uuid d'un membre actif). Envoyer `null` pour retirer la désignation. */
  @IsOptional()
  @ValidateIf((o) => o.chiefMemberId !== null)
  @IsUUID()
  chiefMemberId?: string | null;

  /** Numéro Mobile Money central de la famille. */
  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;

  /** Opérateur Mobile Money : mtn | orange | airtel | moov | other. */
  @IsOptional()
  @IsString()
  mobileMoneyOperator?: string;
}
