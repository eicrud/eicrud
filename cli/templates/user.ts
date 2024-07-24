import {  Entity, PrimaryKey, Property, Unique } from "@mikro-orm/core";
import { CrudUser } from "@eicrud/core/config";

@Entity()
//@eicrud:cli:export:hide
export class User implements CrudUser {

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
    rvkd: number;

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

    @Property({ type: 'json', nullable: true })
    crudUserCountMap: Record<string, number> | string;

    @Property({ type: 'json', nullable: true })
    cmdUserCountMap: Record<string, number> | string;

    @Property({ type: 'json', nullable: true })
    cmdUserLastUseMap: Record<string, Date> | string;

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

    @Property({ nullable: true })
    noTokenRefresh: boolean;

}