import { NextFunction, Response } from 'express';
import { TokenExpiredError, verify } from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '@config';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { logger } from '@/utils/logger';
import { isInstance } from 'class-validator';
import { UserRoleEntity } from '@/entities/userrole.entity';

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
    if (!Authorization) {
      return res.status(403).send('Authentication token missing');
    }
    const secretKey: string = ACCESS_TOKEN_SECRET;
    const verificationResponse = (await verify(Authorization, secretKey)) as DataStoredInToken;
    const userId = verificationResponse.UserInfo.id;
    logger.info(`Token[userId]:${userId}`);
    const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
      where: {
        id: userId,
      },
      relations: {
        roles: {
          permissions: true,
        },
      },
      cache: {
        id: `user_${userId}`,
        milliseconds: 5 * 60 * 1000, // 5 minutes
      },
    });

    if (!matchedUser) {
      return res.status(403).send('Wrong authentication token');
    }

    for await (const role of matchedUser.roles) {
      role.children = await AppDataSource.getTreeRepository(UserRoleEntity).findDescendants(role, { relations: ['permissions'] });
    }
    req.user = matchedUser;
    next();
  } catch (error) {
    if (isInstance(error, TokenExpiredError)) {
      return res.status(403).send('Token Expired');
    }

    return res.status(403).send('Invalid token');
  }
};

export default authMiddleware;
