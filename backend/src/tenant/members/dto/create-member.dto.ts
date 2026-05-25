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

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

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
}
