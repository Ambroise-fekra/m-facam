import { IsEnum, IsOptional, IsString, Length, IsEmail } from 'class-validator';

/**
 * Any active member can declare their own children (genealogy). The parent
 * link is inferred from the caller's gender: father if M, mother if F.
 * Created members start out **inactive** — admin or chef de famille will
 * later activate them (enable login + count in quorum).
 */
export class DeclareDescendantDto {
  @IsString()
  @Length(2, 80)
  firstName: string;

  @IsString()
  @Length(2, 80)
  lastName: string;

  @IsEnum(['M', 'F', 'O'])
  gender: 'M' | 'F' | 'O';

  @IsOptional()
  @IsString()
  birthDate?: string; // 'YYYY-MM-DD' or ''

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
