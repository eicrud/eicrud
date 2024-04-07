import * as bcrypt from 'bcrypt';  


export class _utils {

    static diffBetweenDatesMs(date1: Date, date2: Date) {
        return date1.getTime() - date2.getTime();
    }

    static async hashPassword(password) {
        const salt = await bcrypt.genSalt();
        return await bcrypt.hash(password, salt);
      }

}