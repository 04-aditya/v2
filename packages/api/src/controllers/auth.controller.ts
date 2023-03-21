import { Response } from 'express';
import {
  Controller,
  Req,
  Body,
  Post,
  UseBefore,
  HttpCode,
  Res,
  BodyParam,
  CookieParam,
  Get,
  UnauthorizedError,
  ForbiddenError,
  HttpError,
} from 'routing-controllers';

import { logger } from '@/utils/logger';
import { HttpException } from '@/exceptions/HttpException';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, DOMAIN, MAILDOMAINS } from '@config';
import { Like } from 'typeorm';
import { IUserRole } from '@sharedtypes';
import { UserDataEntity } from '@/entities/userdata.entity';

const REFRESHTOKENCOOKIE = 'rt';

function generateCODE(count: number): string {
  // Declare a digits variable
  // which stores all digits
  const digits = '0123456789';
  let CODE = '';
  for (let i = 0; i < count; i++) {
    CODE += digits[Math.floor(Math.random() * 10)];
  }
  return CODE;
}

@Controller('/auth')
export class AuthController {
  @Post('/requestaccess')
  async requestAccess(@BodyParam('email') emailValue: String) {
    const email = emailValue.toLocaleLowerCase().trim();

    const emailParts = email.split('@');

    if (emailParts.length < 2) {
      throw new HttpException(400, 'Invalid email');
    }

    if (MAILDOMAINS.split(',').includes(emailParts[1]) === false) {
      throw new HttpException(400, 'Unsupported email domain.');
    }

    let user = await AppDataSource.getRepository(UserEntity).findOne({
      where: { email },
    });
    if (!user) {
      user = await UserEntity.CreateUser(email, true);
    }

    const code = generateCODE(6);
    await user.setCode(code);

    //send mail
    const msg = {
      to: email,
      from: `${process.env.MAIL_FROM}`,
      subject: `Access code for ${DOMAIN}`,
      text: `Your PS Next access code is ${code}`,
      html: `Your <strong>PS Next</strong> access code is <h3>${code}</h3>`,
    };

    if (process.env.SKIP_MAIL) {
      logger.info('skipped mail');
      logger.info(msg);
    } else {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        sgMail.send(msg);
      } catch (ex) {
        logger.error('Unable to send mail');
        logger.error(ex.toString());
        throw new HttpException(500, 'Unable to send mail');
      }
    }

    await user.save();

    return { message: 'verification code sent to the email.' };
  }

  @Get('/refreshtoken')
  async refreshToken(@Res() res: Response, @CookieParam(REFRESHTOKENCOOKIE) cRT?: string) {
    logger.debug('cookie: ' + cRT);
    const userRepo = AppDataSource.getRepository(UserEntity);
    if (!cRT) throw new HttpException(401, 'Unauthenticated');

    res.clearCookie(REFRESHTOKENCOOKIE, { httpOnly: true, sameSite: 'none', secure: true, domain: DOMAIN });

    const foundUser = await userRepo.findOne({ where: { refreshTokens: Like(`%${cRT}%`) }, relations: { roles: true } });
    // Detected refresh token reuse!
    if (!foundUser) {
      try {
        const decoded: any = jwt.verify(cRT, REFRESH_TOKEN_SECRET);
        // Delete refresh tokens of hacked user
        const hackedUser = await userRepo.findOne({ where: { id: decoded.id } });
        if (hackedUser) {
          hackedUser.refreshTokens = null;
          await hackedUser.save();
        }
      } catch (err) {
        throw new HttpError(401);
      }
      throw new ForbiddenError();
    }
    const existingTokens = (foundUser?.refreshTokens || '').split(',');
    const newRefreshTokenArray = existingTokens.filter(rt => rt !== cRT);

    try {
      // evaluate jwt
      const decoded: any = jwt.verify(cRT, REFRESH_TOKEN_SECRET);
      if (foundUser.id !== decoded.id) throw new ForbiddenError();
    } catch (err) {
      // expired refresh token
      foundUser.refreshTokens = [...newRefreshTokenArray].join(',');
      await foundUser.save();
    }

    // Refresh token was still valid
    const accessToken = foundUser.createAccessToken();

    const newRefreshToken = foundUser.createRefeshToken();

    // Saving refreshToken with current user
    foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken].filter(t => t).join(',');
    await foundUser.save();

    // Creates Secure Cookie with refresh token
    res.cookie(REFRESHTOKENCOOKIE, newRefreshToken, { httpOnly: true, secure: true, sameSite: 'none', domain: DOMAIN, maxAge: 24 * 60 * 60 * 1000 });

    const roleMap = new Map<string, IUserRole>();
    for await (const role of foundUser.roles) {
      roleMap.set(role.name, { id: role.id, name: role.name, permissions: role.permissions });
      const includedRoles = await role.loadChildren();
      includedRoles.forEach((prole: IUserRole) => {
        roleMap.set(prole.name, { id: prole.id, name: prole.name, permissions: prole.permissions });
      });
    }
    return {
      accessToken,
      user: { id: foundUser.id, email: foundUser.email, roles: Array.from(roleMap.values()).map(r => ({ id: r.id, name: r.name })) },
    };
  }

  @Post('/gettoken')
  async gettoken(
    @BodyParam('email') emailValue: String,
    @BodyParam('code') codeValue: String,
    @Res() res: Response,
    @CookieParam(REFRESHTOKENCOOKIE) cjwt?: string,
  ) {
    const email = emailValue.toLocaleLowerCase().trim();
    const code = codeValue.trim();
    const userRepo = AppDataSource.getRepository(UserEntity);

    const user = await userRepo.findOne({ where: { email }, relations: { roles: true } });

    if (user === null) {
      throw new ForbiddenError('Invalid email or code');
    }

    const isValid = await user.validateCode(code);

    if (!isValid) {
      throw new ForbiddenError('Invalid email or code');
    }

    await user.setCode(generateCODE(6)); // reset the code

    // create JWTs
    const accessToken = user.createAccessToken();
    const newRefreshToken = user.createRefeshToken();

    const existingTokens = (user.refreshTokens || '').split(',');
    let newRefreshTokenArray = !cjwt ? existingTokens : existingTokens.filter(rt => rt !== cjwt);

    if (cjwt) {
      /*
      Scenario added here:
          1) User logs in but never uses RT and does not logout
          2) RT is stolen
          3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
      */
      const foundToken = await userRepo.findOne({ where: { refreshTokens: Like(`%${cjwt}%`) } });

      // Detected refresh token reuse!
      if (!foundToken) {
        // clear out ALL previous refresh tokens
        newRefreshTokenArray = [];
      }
      res.clearCookie(REFRESHTOKENCOOKIE, { httpOnly: true, sameSite: 'none', secure: true });
    }

    // Saving refreshToken with current user
    user.refreshTokens = [...newRefreshTokenArray, newRefreshToken].filter(t => t).join(',');
    await UserDataEntity.Add(user.id, 's-:login', { value: new Date().toISOString() }, new Date());
    await user.save();
    // Creates Secure Cookie with refresh token
    res.cookie(REFRESHTOKENCOOKIE, newRefreshToken, { httpOnly: true, secure: true, sameSite: 'none', domain: DOMAIN, maxAge: 24 * 60 * 60 * 1000 });

    const roleMap = new Map<string, IUserRole>();
    for await (const role of user.roles) {
      roleMap.set(role.name, { id: role.id, name: role.name, permissions: role.permissions });
      const includedRoles = await role.loadChildren();
      includedRoles.forEach(prole => {
        roleMap.set(prole.name, { id: prole.id, name: prole.name, permissions: prole.permissions });
      });
    }
    return { accessToken, user: { id: user.id, email: user.email, roles: Array.from(roleMap.values()).map(r => ({ id: r.id, name: r.name })) } };
  }
}
