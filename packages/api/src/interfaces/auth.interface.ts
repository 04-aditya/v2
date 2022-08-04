import { Request } from 'express';
import { UserEntity } from '@/entiies/user.entity';

export interface DataStoredInToken {
  UserInfo: {
    id: number;
    roles: string[];
  };
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface RequestWithUser extends Request {
  user: UserEntity;
}
