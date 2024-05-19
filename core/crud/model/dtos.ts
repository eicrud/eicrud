import { Transform } from "class-transformer";
import { IsString, IsOptional } from "class-validator";

export class LoginDto {
    @IsString()
    @Transform(({ value, key, obj, type }) => value.toLowerCase().trim())
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

