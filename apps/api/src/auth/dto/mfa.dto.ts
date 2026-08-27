import { IsString, MinLength, MaxLength } from 'class-validator';

export class MfaEnableDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;

  @IsString()
  @MinLength(1)
  secret!: string;
}

export class MfaVerifyDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

export class MfaDisableDto {
  @IsString()
  @MinLength(1)
  code!: string;
}
