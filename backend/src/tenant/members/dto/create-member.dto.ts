import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @Length(2, 80)
  firstName: string;

  @IsString()
  @Length(2, 80)
  lastName: string;

  // Optional: a member who can't log in (e.g. a deceased relative for the
  // genealogy tree) may have no email. Required only when canLogin is true
  // (enforced in the service).
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  // Required: needed so the member can be picked as father (M) or mother (F)
  // in the genealogy filiation.
  @IsEnum(['M', 'F', 'O'])
  gender: 'M' | 'F' | 'O';

  @IsOptional()
  @IsEmail()
  paypalEmail?: string;

  @IsOptional()
  @IsUUID()
  fatherId?: string;

  @IsOptional()
  @IsUUID()
  motherId?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  canLogin?: boolean;

  /** Surnom / petit nom familier (facultatif). */
  @IsOptional()
  @IsString()
  @Length(0, 80)
  nickname?: string;
}
