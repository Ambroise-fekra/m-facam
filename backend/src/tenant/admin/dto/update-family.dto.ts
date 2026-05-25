import { IsEmail, IsOptional, IsString } from 'class-validator';

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
}
