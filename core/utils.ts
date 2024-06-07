import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import hkdf from '@panva/hkdf';

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

    while (token.length > length) {
      token = token.slice(0, -1);
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
