import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @Length(2, 128)
  name: string;

  /**
   * 3-10 free alphanumeric characters chosen by the admin. The full unique
   * family identifier is generated as FAM-<CODE>-<SEQ> by the server.
   */
  @IsString()
  @Length(3, 10)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'code must be alphanumeric, no spaces or special characters' })
  code: string;

  @IsString()
  @Length(2, 80)
  adminFirstName: string;

  @IsString()
  @Length(2, 80)
  adminLastName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  @IsOptional()
  @IsEmail()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  whatsappUrl?: string;
}
