import { CrudEntity } from '@eicrud/core/crud';
import { Melon } from '../melon/melon.entity';
import { UserProfile } from '../userprofile/userprofile.entity';

export class MyUser implements CrudEntity {
  @OneToMany(() => Melon, (mel) => mel.owner)
  melons = new Collection<Melon>(this);

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  id: string;

  email: string;

  password: string;

  role: string;

  lastLoginAttempt: Date;

  failedLoginCount: number;

  lastResetEmailSent: Date;

  rvkd: number;

  nextEmail: string;

  verifiedEmail: boolean;

  emailVerificationToken: string;

  lastEmailVerificationSent: Date;

  verifiedEmailAttempCount: number;

  lastPasswordResetSent: Date;

  passwordResetToken: string;

  passwordResetAttempCount: number;

  crudUserCountMap: Record<string, number> | string;

  cmdUserCountMap: Record<string, number> | string;

  cmdUserLastUseMap: Record<string, Date> | string;

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

  twoFACodeCount: number;

  saltRounds: number;

  createdAt: Date;

  updatedAt: Date;

  noTokenRefresh: boolean;
}
