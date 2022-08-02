import { NextFunction, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET_KEY } from '@config';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entiies/user.entity';
import { ForbiddenError } from 'routing-controllers';
import { logger } from '@/utils/logger';

// import userModel from '@models/users.model';

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
    logger.info(Authorization);
    if (Authorization) {
      const secretKey: string = JWT_SECRET_KEY;
      const verificationResponse = (await verify(Authorization, secretKey)) as DataStoredInToken;
      const userId = verificationResponse.id;

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
    next(new ForbiddenError('Wrong authentication token'));
  }
};

export default authMiddleware;
