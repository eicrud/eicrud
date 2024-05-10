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
function ToLowerCase(): (target: LoginDto, propertyKey: "password") => void {
    throw new Error("Function not implemented.");
}

