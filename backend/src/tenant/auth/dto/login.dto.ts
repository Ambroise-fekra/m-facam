import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(2, 64)
  identifier: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
