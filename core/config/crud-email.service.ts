import { CrudContext } from '../crud';

export interface EmailService {
  sendVerificationEmail(
    to: string,
    token: string,
    ctx: CrudContext,
  ): Promise<any>;

  sendTwoFactorEmail(to: string, code: string, ctx: CrudContext): Promise<any>;

  sendPasswordResetEmail(
    to: string,
    token: string,
    ctx: CrudContext,
  ): Promise<any>;
}
