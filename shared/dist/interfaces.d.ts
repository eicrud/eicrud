export interface ICrudOptions {
    populate?: string[];
    mockRole?: string;
    fields?: string[];
    limit?: number;
    offset?: number;
}
export interface ICrudQuery {
    service: string;
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
    expiresIn?: string;
}
export interface LoginResponseDto {
    userId: string;
    accessToken?: string;
    refreshTokenSec?: number;
}
