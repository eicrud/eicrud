import { IsString, IsOptional } from "class-validator";
import { $Transform } from "../core/crud/transform/decorators";


export class UserIdDto {
    @IsString()
    userId: string;
}
export class LoginDto {
    @IsString()
    @$Transform((value) => {
       return value.toLowerCase().trim()
    })
    email: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    twoFA_code?: string;

    @IsOptional()
    @IsString()
    expiresIn?: string;
}

export class LoginResponseDto {
    userId: string;
    accessToken?: string;
    refreshTokenSec?: number;
}

export interface ICrudRightsFieldInfo {
    maxSize?: number;
    maxLength?: number;
    type?: Record<string, ICrudRightsFieldInfo>;
}
export interface ICrudRightsInfo {
    maxItemsPerUser: number;
    userItemsInDb: number;
    userCmdCount: Record<string, {max: number, performed: number}>;
    fields: Record<string, ICrudRightsFieldInfo>;
}

