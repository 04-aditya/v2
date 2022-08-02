import { Response } from 'express';
import { Controller, Req, Body, Post, UseBefore, HttpCode, Res, BodyParam } from 'routing-controllers';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { logger } from '@/utils/logger';
import { HttpException } from '@/exceptions/HttpException';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entiies/user.entity';
import sgMail from '@sendgrid/mail';
import { JwtUtils } from '@/utils/jwtUtils';

function generateCODE(count) {
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

    if (emailParts[1] !== 'publicissapient.com') {
      throw new HttpException(400, 'Unsupported email domain.');
    }

    let user = await AppDataSource.getRepository(UserEntity).findOne({ where: { email } });

    if (!user) {
      user = new UserEntity();
      user.email = email.toLocaleLowerCase();
    }
    const code = generateCODE(6);
    await user.setCode(code);

    //send mail
    const msg = {
      to: email,
      from: `${process.env.MAIL_FROM}`,
      subject: 'Access code for api.v2.psnext.info',
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
  @Post('/gettoken')
  async gettoken(@BodyParam('email') emailValue: String, @BodyParam('code') codeValue: String) {
    const email = emailValue.toLocaleLowerCase().trim();
    const code = codeValue.trim();

    const user = await AppDataSource.getRepository(UserEntity).findOne({ where: { email } });

    if (user === null) {
      throw new HttpException(403, 'Invalid email or code');
    }

    const isValid = await user.validateCode(code);

    if (!isValid) {
      throw new HttpException(403, 'Invalid email or code');
    }

    await user.setCode(generateCODE(6)); // reset the code
    await user.save();

    const jwtToken = JwtUtils.generateToken(user);

    return { jwtToken };
  }
}
