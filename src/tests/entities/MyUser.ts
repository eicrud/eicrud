import {  Collection, Entity, Index, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { CrudData, CrudUser } from "../../user/model/CrudUser";
import { Equals, IsBoolean, IsDate, IsEmail, IsInt, IsMongoId, IsOptional, IsString } from "class-validator";
import { UserProfile } from "./UserProfile";
import { Melon } from "./Melon";
import { Exclude } from "class-transformer";


@Entity()
export class MyUser implements CrudUser {

    @OneToMany(() => Melon, mel => mel.owner)
    @Equals(undefined)
    @Exclude({ toPlainOnly: true })
    melons = new Collection<Melon>(this);

    @OneToOne({ entity: () => UserProfile })
    @Equals(undefined)
    @Exclude({ toPlainOnly: true })
    profile: UserProfile;

    /////////////

    @PrimaryKey()
    @IsMongoId()
    _id: string;

    @Property()
    email: string;

    @Property()
    password: string;

    @Property()
    lastLoginAttempt: Date;

    @Property()
    failedLoginCount: number;

    @Property()
    lastResetEmailSent: Date;

    @Property()
    role: string;

    @Property()
    revokedCount: number;

    @Property()
    nextEmail: string;

    @Property()
    verifiedEmail: boolean;

    @Property()
    emailVerificationToken: string;

    @Property()
    lastEmailVerificationSent: Date;

    @Property()
    verifiedEmailAttempCount: number;

    @Property()
    lastPasswordResetSent: Date;

    @Property()
    passwordResetToken: string;

    @Property()
    passwordResetAttempCount: number;

    @Property()
    crudUserDataMap: Record<string, CrudData>;

    @Property()
    errorCount: number;

    @Property()
    incidentCount: number;

    @Property()
    highTrafficCount: number;

    @Property()
    trust: number;

    @Property()
    lastComputedTrust: Date;

    @Property()
    timeout: Date;

    @Property()
    timeoutCount: number;

    @Property()
    didCaptcha: boolean;
    
    @Property()
    captchaRequested: boolean;
   
    @Property()
    twoFA: boolean;

    @Property()
    lastTwoFACode: string;

    @Property()
    lastTwoFACodeSent: Date;

    @Property()
    twoFACodeCount: number;

    @Property()
    createdAt: Date;

    @Property()
    updatedAt: Date;

}