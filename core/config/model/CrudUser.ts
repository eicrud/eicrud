import { CrudEntity } from '../../crud/model/CrudEntity';

// This should be a real class/interface representing a user entity

/**
 * User entity base interface.
 * @interface
 * @public
 */
export interface CrudUser extends CrudEntity {
  saltRounds: number;

  email: string;
  password: string;

  lastLoginAttempt: Date;
  failedLoginCount: number;

  lastResetEmailSent: Date;

  role: string;

  revokedCount: number;

  nextEmail: string;
  verifiedEmail: boolean;
  emailVerificationToken: string;
  lastEmailVerificationSent: Date;
  verifiedEmailAttempCount: number;

  lastPasswordResetSent: Date;
  passwordResetToken: string;
  passwordResetAttempCount: number;

  crudUserCountMap?: Record<string, number> | string;
  cmdUserCountMap?: Record<string, number> | string;

  cmdUserLastUseMap?: Record<string, Date> | string;

  errorCount: number;
  incidentCount: number;
  highTrafficCount: number;

  /**
   * Computed trust score for a user
   * @type {number}
   * @public
   */
  trust: number;
  lastComputedTrust: Date;

  timeout: Date;
  timeoutCount: number;

  didCaptcha: boolean;
  captchaRequested: boolean;

  twoFA: boolean;
  lastTwoFACode: string;
  lastTwoFACodeSent: Date;
  twoFACodeCount: number;

  noTokenRefresh?: boolean;
}
