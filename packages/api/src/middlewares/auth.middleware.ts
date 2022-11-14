import { NextFunction, Response } from 'express';
import { TokenExpiredError, verify } from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '@config';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
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
        return res.status(403).send('Wrong authentication token');
      }
    } else {
      return res.status(403).send('Authentication token missing');
    }
  } catch (error) {
    //console.dir(error);
    if (isInstance(error, TokenExpiredError)) {
      return res.status(403).send('Token Expired');
    }

    return res.status(403).send('Invalid token');
  }
};

export default authMiddleware;
