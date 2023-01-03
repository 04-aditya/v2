import { Request } from 'express';
import { UserEntity } from '@/entities/user.entity';

export interface DataStoredInToken {
  UserInfo: {
    id: number;
    roles: string[];
    patid?: string;
  };
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface RequestWithUser extends Request {
  user: UserEntity;
  permissions: string[];
}
