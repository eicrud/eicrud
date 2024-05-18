import {  Collection, Entity, Index, OneToMany, OneToOne, PrimaryKey, Property, Unique } from "@mikro-orm/core";
import { CrudUser } from "../../user/model/CrudUser";
import { Equals, IsBoolean, IsDate, IsEmail, IsInt, IsMongoId, IsOptional, IsString } from "class-validator";
import { UserProfile } from "./UserProfile";
import { Melon } from "./Melon";
import { Exclude } from "class-transformer";
import { $ToLowerCase, $Trim } from "../../crud/transform/decorators";

@Entity()
export class MyUser implements CrudUser {

    @OneToMany(() => Melon, mel => mel.owner)
    @Equals(undefined)
    melons = new Collection<Melon>(this);

    @OneToOne(() => UserProfile, profile => profile.user)
    @Equals(undefined)
    profile: UserProfile;

    /////////////

    @PrimaryKey({ name: '_id'})
    id: string;

    @Unique()
    @Property()
    email: string;

    @Property()
    password: string;

    @Property()
    role: string;

    @Property({ nullable: true })
    lastLoginAttempt: Date;

    @Property({ nullable: true })
    failedLoginCount: number;

    @Property({ nullable: true })
    lastResetEmailSent: Date;


    @Property({ nullable: true })
    revokedCount: number;

    @Property({ nullable: true })
    nextEmail: string;

    @Property({ nullable: true })
    verifiedEmail: boolean;

    @Property({ nullable: true })
    emailVerificationToken: string;

    @Property({ nullable: true })
    lastEmailVerificationSent: Date;

    @Property({ nullable: true })
    verifiedEmailAttempCount: number;

    @Property({ nullable: true })
    lastPasswordResetSent: Date;

    @Property({ nullable: true })
    passwordResetToken: string;

    @Property({ nullable: true })
    passwordResetAttempCount: number;

    @Property({ nullable: true })
    crudUserCountMap: Record<string, number>;

    @Property({ nullable: true })
    cmdUserCountMap: Record<string, number>

    @Property({ nullable: true })
    errorCount: number;

    @Property({ nullable: true })
    incidentCount: number;

    @Property({ nullable: true })
    highTrafficCount: number;

    @Property({ nullable: true })
    trust: number;

    @Property({ nullable: true })
    lastComputedTrust: Date;

    @Property({ nullable: true })
    timeout: Date;

    @Property({ nullable: true })
    timeoutCount: number;

    @Property({ nullable: true })
    didCaptcha: boolean;
    
    @Property({ nullable: true })
    captchaRequested: boolean;
   
    @Property({ nullable: true })
    twoFA: boolean;

    @Property({ nullable: true })
    lastTwoFACode: string;

    @Property({ nullable: true })
    lastTwoFACodeSent: Date;

    @Property({ nullable: true })
    twoFACodeCount: number;    
    
    @Property({ nullable: true })
    saltRounds: number;

    @Property({ nullable: true })
    createdAt: Date;

    @Property({ nullable: true })
    updatedAt: Date;

}