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
} from 'routing-controllers';

import { logger } from '@/utils/logger';
import { HttpException } from '@/exceptions/HttpException';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, DOMAIN, MAILDOMAINS } from '@config';
import { Like } from 'typeorm';
import { UserRoleEntity } from '@/entities/userrole.entity';

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

function createRefeshToken(user: UserEntity) {
  return jwt.sign({ username: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '1d' });
}

function createAccessToken(user: UserEntity) {
  return jwt.sign(
    {
      UserInfo: {
        id: user.id,
        roles: user.roles,
      },
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' },
  );
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
    const usersRepo = AppDataSource.getRepository(UserEntity);
    const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
    let user = await usersRepo.findOne({ where: { email } });

    if (!user) {
      user = new UserEntity();
      user.email = email.toLocaleLowerCase();
      const defaultRole = await rolesRepo.findOne({ where: { name: 'default' } });
      user.roles = [defaultRole];
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
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      sgMail.send(msg);
    }

    await user.save();

    return { message: 'verification code sent to the email.' };
  }

  @Get('/refreshtoken')
  async refreshToken(@Res() res: Response, @CookieParam(REFRESHTOKENCOOKIE) cRT?: string) {
    logger.info('cookie: ' + cRT);
    const userRepo = AppDataSource.getRepository(UserEntity);
    if (!cRT) throw new HttpException(403, 'Unauthorized');

    res.clearCookie(REFRESHTOKENCOOKIE, { httpOnly: true, sameSite: 'none', secure: true, domain: DOMAIN });

    const foundUser = await userRepo.findOne({ where: { refreshTokens: Like(`%${cRT}%`) }, relations: { roles: true } });
    // Detected refresh token reuse!
    if (!foundUser) {
      try {
        const decoded: any = jwt.verify(cRT, REFRESH_TOKEN_SECRET);
        // Delete refresh tokens of hacked user
        const hackedUser = await userRepo.findOne({ where: { id: decoded.id } });
        hackedUser.refreshTokens = null;
        await hackedUser.save();
      } catch (err) {
        throw new ForbiddenError();
      }
    }
    const existingTokens = (foundUser.refreshTokens || '').split(',');
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
    const accessToken = createAccessToken(foundUser);

    const newRefreshToken = createRefeshToken(foundUser);
    // Saving refreshToken with current user
    foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken].filter(t => t).join(',');
    await foundUser.save();

    // Creates Secure Cookie with refresh token
    res.cookie(REFRESHTOKENCOOKIE, newRefreshToken, { httpOnly: true, secure: true, sameSite: 'none', domain: DOMAIN, maxAge: 24 * 60 * 60 * 1000 });

    return { accessToken, user: { id: foundUser.id, email: foundUser.email, roles: foundUser.roles.map(r => ({ id: r.id, name: r.name })) } };
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
    const accessToken = createAccessToken(user);
    const newRefreshToken = createRefeshToken(user);

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
    await user.save();
    // Creates Secure Cookie with refresh token
    res.cookie(REFRESHTOKENCOOKIE, newRefreshToken, { httpOnly: true, secure: true, sameSite: 'none', domain: DOMAIN, maxAge: 24 * 60 * 60 * 1000 });

    return { accessToken, user: { id: user.id, email: user.email, roles: user.roles.map(r => ({ id: r.id, name: r.name })) } };
  }
}
