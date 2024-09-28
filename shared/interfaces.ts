export interface ICrudOptions {
  populate?: string[];
  mockRole?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  cached?: boolean;
  allowIdOverride?: boolean;

  /**
   * Used by the client to indicate to the server that the JWT should be stored in a cookie.
   * @usageNotes Do not set manually.
   */
  jwtCookie?: boolean;
}

export interface ICrudQuery {
  service?: string;
  options?: ICrudOptions;
  query?: any;
  cmd?: string;
}

export interface FindResponseDto<T> {
  data: T[];
  total?: number;
  limit?: number;
}

export interface ILoginDto {
  email: string;
  password: string;
  twoFA_code?: string;
  expiresInSec?: number;
}

export interface LoginResponseDto {
  userId: string;
  accessToken?: string;
  refreshTokenSec?: number;
}

export interface IResetPasswordDto {
  token_id: string;
  newPassword: string;
  logMeIn: boolean;
}

export interface ICreateAccountDto {
  email: string;
  password: string;
  role: string;
  /**
   * Only use if username_field is configured.
   */
  username?: string;
  logMeIn?: boolean;
}

export interface ITimeoutUserDto {
  userId: string;
  timeoutDurationMinutes: number;
  allowedRoles: string[];
}
export interface IChangePasswordDto {
  oldPassword: string;
  newPassword: string;
  logMeIn: boolean;
}
export class ISendVerificationEmailDto {
  newEmail?: string;
  password?: string;
}
export interface ISendPasswordResetEmailDto {
  email: string;
}

export interface IUserIdDto {
  userId: string;
}

export interface IVerifyTokenDto {
  token_id: string;
  logMeIn: boolean;
}
