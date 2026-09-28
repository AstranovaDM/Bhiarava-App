import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class PasswordResetRequestDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class GoogleContinueDto {
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}

export class CompleteCustomerProfileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  mobile!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  preferredProjectId?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  referralNote?: string;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}

export class CompleteAgentProfileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsBoolean()
  termsAccepted!: boolean;
}
