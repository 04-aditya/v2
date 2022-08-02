import { sign } from 'jsonwebtoken';
import { JWT_SECRET_KEY } from '@config';
import { IUser } from 'sharedtypes';

export class JwtUtils {
  static generateToken(user: IUser) {
    const data: any = { id: user.id.toString() };
    return sign(data, JWT_SECRET_KEY, {
      expiresIn: '8h', // in seconds 8 hours
    });
  }
}
