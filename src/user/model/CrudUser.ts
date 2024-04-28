import { CrudEntity } from "../../crud/model/CrudEntity";

// This should be a real class/interface representing a user entity

export interface CrudData {
  cmdMap: Record<string, number>;
  itemsCreated: number;
}

export interface CrudUser extends CrudEntity{
    email: string;
    password: string;

    lastLoginAttempt: Date;
    failedLoginCount: number;

    lastResetEmailSent: Date;
    
    role: string;
  
    revokedCount: number;

    nextEmail: string;
    verifiedEmail: boolean;
    lastVerificationToken: string;
    lastVerificationSent: Date;
    verifiedEmailCount: number;

    crudUserDataMap: Record<string, CrudData>

    errorCount: number;
    incidentCount: number;
    highTrafficCount: number;

    trust: number;
    lastComputedTrust: Date;

    timeout: Date;
    timeoutCount: number;

    didCaptcha: boolean;
    captchaRequested: boolean;

    twoFA: boolean;
    lastTwoFACode: string;
    lastTwoFACodeSent: Date;

  };