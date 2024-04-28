


export interface EmailService {

    sendVerificationEmail(to: string, token: string): Promise<any>;

    sendTwoFactorEmail(to: string, code: string): Promise<any>;

}