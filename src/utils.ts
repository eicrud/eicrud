import * as bcrypt from 'bcrypt';  


export class _utils {

    static generateRandomString(length: number) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    static diffBetweenDatesMs(date1: Date, date2: Date) {
        return date1.getTime() - date2.getTime();
    }

    static async hashPassword(password, saltRounds: number) {
        const salt = await bcrypt.genSalt(saltRounds || 10);
        return await bcrypt.hash(password, salt);
    }

    
}