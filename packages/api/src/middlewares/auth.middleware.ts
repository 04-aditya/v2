import { NextFunction, Response } from 'express';
import { TokenExpiredError, verify } from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '@config';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { logger } from '@/utils/logger';
import { isInstance } from 'class-validator';
import { IPermission, IUserRole } from 'sharedtypes';
import { UserPATEntity } from '@/entities/userpat.entity';

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
    if (!Authorization) return res.status(403).send('Authentication token missing');

    const secretKey: string = ACCESS_TOKEN_SECRET;
    const verificationResponse = (await verify(Authorization, secretKey)) as DataStoredInToken;
    const userId = verificationResponse.UserInfo.id;
    const patid = verificationResponse.UserInfo.patid;
    let userPAT: UserPATEntity;
    let matchedUser: UserEntity;

    if (patid) {
      logger.info(`Token[patID]: ${patid}`);
      userPAT = await AppDataSource.getRepository(UserPATEntity).findOne({
        where: {
          id: patid,
        },
        relations: {
          user: true,
        },
        cache: {
          id: `userpat_${patid}`,
          milliseconds: 30 * 60 * 1000, // 30 minutes
        },
      });
      if (userPAT.user.id !== userId) return res.status(403).send('Invalid token');
      matchedUser = userPAT.user;
      userPAT.lastUsedAt = new Date();
      userPAT.save();
    } else {
      // logger.info(`Token[userId]: ${userId}`);
      matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: userId,
        },
        relations: {
          roles: true,
        },
        cache: {
          id: `user_${userId}`,
          milliseconds: 10 * 60 * 1000, // 10 minutes
        },
      });

      if (!matchedUser) return res.status(403).send('Wrong authentication token');
    }

    req.user = matchedUser;
    if (userPAT) {
      req.permissions = userPAT.permissions;
    } else {
      req.permissions = [...(await matchedUser.getAllPermissions()).keys()];
    }

    // req.permissions.forEach(p => console.log(p));

    next();
  } catch (error) {
    if (isInstance(error, TokenExpiredError)) {
      return res.status(403).send('Token Expired');
    }
    console.log(error);
    return res.status(403).send('Invalid token');
  }
};

export default authMiddleware;
