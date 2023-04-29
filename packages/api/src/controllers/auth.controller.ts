import { Response, Request } from 'express';
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
  QueryParam,
  Redirect,
  CurrentUser,
} from 'routing-controllers';

import { logger } from '@/utils/logger';
import { HttpException } from '@/exceptions/HttpException';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';
import { REFRESH_TOKEN_SECRET, DOMAIN, MAILDOMAINS, CLID, OPENID_CONFIG_URL, CLIS, ORIGIN } from '@config';
import { Like } from 'typeorm';
import { IUserRole } from '@sharedtypes';
import { UserDataEntity } from '@/entities/userdata.entity';
import crypto from 'crypto';
import cache from '@/utils/cache';
import axios from 'axios';
import qs from 'qs';
import authMiddleware from '@/middlewares/auth.middleware';
import { RequestWithUser } from '@/interfaces/auth.interface';

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

const base64URLEncode = str => str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest();

const getDomainRoot = host => {
  const parts = host.split('.');
  if (parts.length < 3) return;
  return `${parts[1]}.${parts[2]}`;
};

let OAuthConfig;
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

    // Save accessToken to the user list
    foundUser.accessTokens = [...(foundUser.accessTokens || '').split(','), accessToken].filter(t => t).join(',');
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

    // Save accessToken to the user list
    user.accessTokens = [...(user.accessTokens || '').split(','), accessToken].filter(t => t).join(',');
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

  @Get('/logout')
  @UseBefore(authMiddleware)
  async logout(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @CurrentUser() currentUser: UserEntity,
    @CookieParam(REFRESHTOKENCOOKIE) cjwt?: string,
  ) {
    const userRepo = AppDataSource.getRepository(UserEntity);

    const existingTokens = (currentUser.refreshTokens || '').split(',');
    let newRefreshTokenArray = !cjwt ? existingTokens : existingTokens.filter(rt => rt !== cjwt);
    const newAccessTokenArray = req.accessToken ? (currentUser.accessTokens || '').split(',').filter(at => at !== req.accessToken) : [];

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

    // save the accessTokens
    currentUser.accessTokens = newAccessTokenArray.join(',');
    // Saving refreshToken with current user
    currentUser.refreshTokens = newRefreshTokenArray.join(',');
    // currentUser.adtokens = null;
    await currentUser.save();
    // const redirect_uri = returnUrl || req.protocol + '://' + req.headers['host'] + '/';
    // return redirect_uri;
    return 'Ok';
  }

  @Get('/login')
  @Redirect('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  async Login(@Req() req: Request, @Res() res: Response, @QueryParam('scopes') qscopes: string, @QueryParam('redirect_url') redirect_url?: string) {
    return this.LoginHelper(req, res, 'callback', qscopes, redirect_url);
  }

  @Get('/ssologin')
  @Redirect('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  async ssoLogin(
    @Req() req: Request,
    @Res() res: Response,
    @QueryParam('scopes') qscopes: string,
    @QueryParam('redirect_url') redirect_url?: string,
  ) {
    return this.LoginHelper(req, res, 'ssocallback', qscopes, redirect_url);
  }

  async LoginHelper(
    @Req() req: Request,
    @Res() res: Response,
    callbackType: string,
    @QueryParam('scopes') qscopes: string,
    @QueryParam('redirect_url') redirect_url?: string,
  ) {
    if (redirect_url && redirect_url.toLowerCase().startsWith('http')) {
      const whitelist = [];
      ORIGIN.split(',').forEach(sd => whitelist.push(new URL(sd).hostname));
      const rurl = new URL(redirect_url);
      if (whitelist.indexOf(rurl.hostname) === -1) {
        throw new HttpError(400, 'Invalid redirect url');
      }
    }
    const state = base64URLEncode(crypto.randomBytes(16));
    const code_verifier = base64URLEncode(crypto.randomBytes(32));
    cache.set(state, JSON.stringify({ code_verifier, redirect_url: redirect_url || '/' }));

    const client_id = CLID;
    // const client_secret = CLIS;

    await getOAuthConfig();
    const scopes = [...(qscopes || '').split(','), ...OAuthConfig.scopes_supported].join('%20');
    logger.info(`login for scopes: ${scopes}`);

    res.clearCookie(REFRESHTOKENCOOKIE, { httpOnly: true, sameSite: 'none', secure: true, domain: DOMAIN });
    const code_challenge = base64URLEncode(sha256(code_verifier));
    const url = [
      `${OAuthConfig.authorization_endpoint}?`,
      `client_id=${client_id}&`,
      `scope=${scopes}&`,
      `response_type=code&`,
      `redirect_uri=${(req.headers.host.startsWith('localhost') ? 'http' : 'https') + '://' + req.headers['host'] + '/auth/' + callbackType}&`,
      `code_challenge=${code_challenge}&`,
      `code_challenge_method=S256&`,
      `state=${state}`,
    ].join('');
    logger.debug(url);
    // https://www.npmjs.com/package/routing-controllers#set-redirect
    return url;
  }

  @Get('/callback')
  @Redirect('/')
  async loginCallback(@Req() req: Request, @Res() res: Response) {
    return this.callback(req, res, 'callback');
  }
  @Get('/ssocallback')
  @Redirect('/')
  async ssoCallback(@Req() req: Request, @Res() res: Response) {
    return this.callback(req, res, 'ssocallback');
  }

  async callback(@Req() req: Request, @Res() res: Response, callbackType: string) {
    const { code, state, error, error_description } = req.query;
    if (error) {
      logger.error({ error, error_description });
      return res.json({ error, error_description });
    }
    try {
      const stateData = JSON.parse(await cache.get(state as string));
      const code_verifier = stateData.code_verifier;
      cache.del(state as string);
      const redirect_uri = `${(req.headers.host.startsWith('localhost') ? 'http' : 'https') + '://' + req.headers.host + '/auth/' + callbackType}`;
      const tokenResponse = await axios.post(
        `${OAuthConfig.token_endpoint}`,
        qs.stringify({
          grant_type: 'authorization_code',
          client_id: CLID,
          redirect_uri,
          // client_secret: CLIS,
          code_verifier,
          code,
        }),
      );

      if (tokenResponse.status !== 200) {
        console.error({ status: tokenResponse.status, data: tokenResponse.data });
        return res.status(tokenResponse.status).json({ error: 'Invalid response from the selected login provider.' });
      }

      const tokenData = tokenResponse.data;
      tokenData.expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      logger.debug(tokenResponse.data);

      const userInfoResponse = await axios.get(OAuthConfig.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userInfoResponse.status !== 200) {
        console.error({ status: userInfoResponse.status, data: userInfoResponse.data });
        return '/';
      }
      // logger.debug(userInfoResponse.data);
      const email = userInfoResponse.data.email.toLocaleLowerCase().trim();

      const emailParts = email.split('@');

      if (emailParts.length < 2) {
        throw new HttpException(400, 'Invalid email');
      }

      if (MAILDOMAINS.split(',').includes(emailParts[1]) === false) {
        res.clearCookie(REFRESHTOKENCOOKIE, { httpOnly: true, sameSite: 'none', secure: true });
        return (stateData.redirect_url || '/') + `?error=Unsupported Domain: (${emailParts[1]})`;
      }

      const user = await UserEntity.CreateUser(email, false);
      user.adtokens = JSON.stringify(tokenData);

      try {
        const graphResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/photos/48x48/$value`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          responseType: 'arraybuffer',
        });

        if (graphResponse.status === 200) {
          const photo = graphResponse.data;
          //const photoBuffer = Buffer.from(photo, 'binary');
          const photoBase64 = photo.toString('base64');
          user.photo = `data:${graphResponse.headers['content-type']};base64,${photoBase64}`;
        }
      } catch (ex) {
        logger.error('Unable to get the photo');
        logger.debug(ex);
      }

      // create JWTs
      const accessToken = user.createAccessToken();
      const newRefreshToken = user.createRefeshToken();

      const existingTokens = (user.refreshTokens || '').split(',');
      // const newRefreshTokenArray = !cjwt ? existingTokens : existingTokens.filter(rt => rt !== cjwt);

      // Saving accessTokens with current user
      user.accessTokens = [...(user.accessTokens || '').split(','), accessToken].filter(t => t).join(',');
      // Saving refreshToken with current user
      user.refreshTokens = [...existingTokens, newRefreshToken].filter(t => t).join(',');
      await UserDataEntity.Add(user.id, 's-:login', { value: new Date().toISOString() }, new Date());
      await user.save();

      // Creates Secure Cookie with refresh token
      res.cookie(REFRESHTOKENCOOKIE, newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: DOMAIN,
        maxAge: 24 * 60 * 60 * 1000,
      });

      const roleMap = new Map<string, IUserRole>();
      for await (const role of user.roles) {
        roleMap.set(role.name, { id: role.id, name: role.name, permissions: role.permissions });
        const includedRoles = await role.loadChildren();
        includedRoles.forEach(prole => {
          roleMap.set(prole.name, { id: prole.id, name: prole.name, permissions: prole.permissions });
        });
      }
      // return { accessToken, user: { id: user.id, email: user.email, roles: Array.from(roleMap.values()).map(r => ({ id: r.id, name: r.name })) } };

      const rurl = new URL(stateData.redirect_url || '/');
      rurl.searchParams.append('status', 'success');
      logger.debug(rurl.href);
      return rurl.href;
    } catch (ex) {
      console.error(ex);
      throw new HttpError(500, 'Unable to authenticate.');
    }
  }
}

export async function checkADTokens(user: UserEntity) {
  const adtokens: any = JSON.stringify(user.adtokens) || {};
  if (!adtokens.access_token) return false;

  if (new Date(adtokens.expires_at) > new Date()) return true;

  // try {
  //   const graphResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/photos/48x48/$value`, {
  //     headers: {
  //       Authorization: `Bearer ${adtokens.access_token}`,
  //     },
  //     responseType: 'arraybuffer',
  //   });
  //   if (graphResponse.status === 200) {
  //     const photo = graphResponse.data;
  //     const photoBase64 = photo.toString('base64');
  //     user.photo = `data:${graphResponse.headers['content-type']};base64,${photoBase64}`;
  //     await user.save();
  //     return true;
  //   }
  // } catch (ex) {
  //   logger.debug(ex);
  // }
  user.adtokens = JSON.stringify(await refreshADTokens(adtokens));
  await user.save();
  return true;
}

export async function refreshADTokens(adtokens: any) {
  if (!OAuthConfig) {
    await getOAuthConfig();
  }
  const scopes = [...OAuthConfig.scopes_supported].join('%20');
  const tokenResponse = await axios.post(
    `${OAuthConfig.token_endpoint}`,
    qs.stringify({
      client_id: CLID,
      grant_type: 'refresh_token',
      scope: scopes,
      refresh_token: adtokens.refresh_token,
      // client_secret: CLIS,
    }),
  );

  if (tokenResponse.status !== 200) {
    logger.error({ status: tokenResponse.status, data: tokenResponse.data });
    throw new Error('Invalid response from the token endpoint.');
  }

  const tokenData = tokenResponse.data;
  logger.debug(tokenResponse.data);
  return tokenData;
}

export async function getOAuthConfig() {
  try {
    const or = await axios.get(OPENID_CONFIG_URL);
    console.log(or.data);
    if (or.status !== 200) {
      console.error(`unable to get openid configuration from ${OPENID_CONFIG_URL} \n ${or.status} - ${or.data}`);
      throw new HttpError(500, `Unable to get openid configuration from ${OPENID_CONFIG_URL}`);
    }

    OAuthConfig = or.data;
    logger.debug(`fetched openid config from ${OPENID_CONFIG_URL}`);
    return OAuthConfig;
  } catch (ex) {
    logger.error(`unable to get openid configuration from ${OPENID_CONFIG_URL} \n ${ex}`);
    throw new HttpError(500, `Unable to get openid configuration from ${OPENID_CONFIG_URL}`);
  }
}
// {
//   token_endpoint: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/oauth2/v2.0/token',
//   token_endpoint_auth_methods_supported: [ 'client_secret_post', 'private_key_jwt', 'client_secret_basic' ],
//   jwks_uri: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/discovery/v2.0/keys',
//   response_modes_supported: [ 'query', 'fragment', 'form_post' ],
//   subject_types_supported: [ 'pairwise' ],
//   id_token_signing_alg_values_supported: [ 'RS256' ],
//   response_types_supported: [ 'code', 'id_token', 'code id_token', 'id_token token' ],
//   scopes_supported: [ 'openid', 'profile', 'email', 'offline_access' ],
//   issuer: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/v2.0',
//   request_uri_parameter_supported: false,
//   userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
//   authorization_endpoint: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/oauth2/v2.0/authorize',
//   device_authorization_endpoint: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/oauth2/v2.0/devicecode',
//   http_logout_supported: true,
//   frontchannel_logout_supported: true,
//   end_session_endpoint: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/oauth2/v2.0/logout',
//   claims_supported: [
//     'sub',
//     'iss',
//     'cloud_instance_name',
//     'cloud_instance_host_name',
//     'cloud_graph_host_name',
//     'msgraph_host',
//     'aud',
//     'exp',
//     'iat',
//     'auth_time',
//     'acr',
//     'nonce',
//     'preferred_username',
//     'name',
//     'tid',
//     'ver',
//     'at_hash',
//     'c_hash',
//     'email'
//   ],
//   kerberos_endpoint: 'https://login.microsoftonline.com/d52c9ea1-7c21-47b1-82a3-33a74b1f74b8/kerberos',
//   tenant_region_scope: 'NA',
//   cloud_instance_name: 'microsoftonline.com',
//   cloud_graph_host_name: 'graph.windows.net',
//   msgraph_host: 'graph.microsoft.com',
//   rbac_url: 'https://pas.windows.net'
// }
