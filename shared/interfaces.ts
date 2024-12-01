export declare enum QueryOrder {
  ASC = 'ASC',
  ASC_NULLS_LAST = 'ASC NULLS LAST',
  ASC_NULLS_FIRST = 'ASC NULLS FIRST',
  DESC = 'DESC',
  DESC_NULLS_LAST = 'DESC NULLS LAST',
  DESC_NULLS_FIRST = 'DESC NULLS FIRST',
  asc = 'asc',
  asc_nulls_last = 'asc nulls last',
  asc_nulls_first = 'asc nulls first',
  desc = 'desc',
  desc_nulls_last = 'desc nulls last',
  desc_nulls_first = 'desc nulls first',
}
export declare enum QueryOrderNumeric {
  ASC = 1,
  DESC = -1,
}
export type QueryOrderKeysFlat =
  | QueryOrder
  | QueryOrderNumeric
  | keyof typeof QueryOrder;
type SubOrderByType<T> = Partial<Record<keyof T, QueryOrderKeysFlat>>;
export type OrderByType<T> = SubOrderByType<T>[] | SubOrderByType<T>;
export interface ICrudOptions<T = any> {
  populate?: string[];
  mockRole?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  cached?: boolean;
  allowIdOverride?: boolean;

  orderBy?: OrderByType<T>;

  returnUpdatedEntity?: boolean;

  /**
   * Used by the client to indicate to the server that the JWT should be stored in a cookie.
   * @usageNotes Do not set manually.
   */
  jwtCookie?: boolean;

  skipServiceHooks?: boolean;
}

export interface ICrudQuery {
  service?: string;
  options?: ICrudOptions;
  query?: any;
  cmd?: string;
}

export interface FindResponseDto<T = any> {
  data: T[];
  total?: number;
  limit?: number;
}

export interface PatchResponseDto<T = any> {
  count: number;
  updated?: T;
}
export interface DeleteResponseDto<T = any> {
  count: number;
  deleted?: T;
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
