import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import hkdf from '@panva/hkdf';

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];
export class _utils {
  static async deriveSecretKey(key, message) {
    return Buffer.from(await hkdf('sha256', key, '', message, 256)).toString(
      'base64',
    );
  }

  static async generateRandomString(length: number) {
    let token: string = await new Promise((resolve, reject) => {
      crypto.randomBytes(length, function (err, buffer) {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString('base64').replace(/[^a-zA-Z0-9]/g, ''));
        }
      });
    });

    if (token.length > length) {
      token = token.slice(0, length);
    }

    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    while (token.length < length) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  }

  static makeArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
  }

  static parseIfString(obj) {
    if (typeof obj === 'string') {
      return JSON.parse(obj);
    }
    return obj;
  }

  static diffBetweenDatesMs(date1: Date, date2: Date) {
    const res = date1.getTime() - date2.getTime();
    return res;
  }

  static async hashPassword(password, saltRounds: number) {
    const salt = await bcrypt.genSalt(saltRounds || 10);
    return await bcrypt.hash(password, salt);
  }
}

// // ts-node core/utils.ts
// import { performance } from 'perf_hooks';

// async function calculateSpeed(input: number) {
//     const start = performance.now();
//     const str = await _utils.generateRandomString(input);
//     await crypto
//     .createHmac('sha256', '4oR5XrhkDEdNG1W19ncy8lNwr6utojpbKTMKBGktbZBEQjmh3Sha9WhyracR4eMmg3/mo9wwRwCbaOUCHRdMgS0YNc/yepWjT2XBUOpQqKDGpIyp/iVsqnWZbHXLhfhjlMr7vA2cYnERStTZbV6HV0Tl3wxE5yesqIZWj6nHgXlCcsOQ630DKRqd+027B+GMXpq3C3jw7IU7blF4s7e/yBdcKvDcQZ0S/vIZYx0vYyaw+sE25R042kRUWDhjqvX23/Z3fw0x6pAuu0Atsy4P8NLZFTpajnNc7k+BUkRUjVGtwT2XWNxCyxVqrtw+65dUbw2isVbJnZQYaOgUzK5R0w==')
//     .update(str)
//     .digest('hex');
//     const end = performance.now();

//     const duration = end - start;
//     console.log(`${input} : ${duration} ms ${str}`);
//     return duration;
// }

// let total = 0;
// let count = 0;
// let max = 64;

// const recurseCalculateSpeed = async (input, max, total, count) => {
//   if(input >= max) {
//       console.log(`Total: ${total/count}`);
//       return;
//   }
//   const res = await calculateSpeed(input);
//   if(input > 1){
//     total += res;
//     count++;
//   }
//   return await recurseCalculateSpeed(input*2, max, total, count);
// }

// recurseCalculateSpeed(1, max, total, count);
