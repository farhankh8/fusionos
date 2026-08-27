import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** Optional MFA TOTP code when MFA is enabled */
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  mfaCode?: string;
}
