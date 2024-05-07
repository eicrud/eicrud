import { IsString, IsOptional } from "class-validator";

export class LoginDto {
    @IsString()
    email: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    twoFA_code: string;

    @IsOptional()
    @IsString()
    expiresIn: string;
}
