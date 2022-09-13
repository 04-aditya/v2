import { NextFunction, Response } from 'express';
import { TokenExpiredError, verify } from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '@config';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entiies/user.entity';
import { ForbiddenError } from 'routing-controllers';
import { logger } from '@/utils/logger';
import { isInstance } from 'class-validator';

// import userModel from '@models/users.model';

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
    if (Authorization) {
      const secretKey: string = ACCESS_TOKEN_SECRET;
      const verificationResponse = (await verify(Authorization, secretKey)) as DataStoredInToken;
      const userId = verificationResponse.UserInfo.id;
      logger.info(`Token[userId]:${userId}`);
      const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: userId,
        },
        relations: {
          roles: true,
        },
      });

      if (matchedUser) {
        req.user = matchedUser;
        next();
      } else {
        next(new ForbiddenError('Wrong authentication token'));
      }
    } else {
      next(new ForbiddenError('Authentication token missing'));
    }
  } catch (error) {
    console.dir(error);
    if (isInstance(error, TokenExpiredError)) {
      return next(new ForbiddenError('Token Expired'));
    }

    next(new ForbiddenError('Invalid token'));
  }
};

export default authMiddleware;
