import _ from 'lodash';
import { errors } from '@strapi/utils';
import type { Context } from 'koa';
import type { MagicLinkExchangeRequest, SendMagicLinkRequest } from '../types';

const { ValidationError, ApplicationError } = errors;
const USERS_PERMISSIONS_USER_UID = 'plugin::users-permissions.user';

const sanitizeUser = async (user, ctx: Context) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel(USERS_PERMISSIONS_USER_UID);

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};

const getUsersPermissionsService = (name: string) => {
  return strapi.plugin('users-permissions').service(name);
};

const ensureUserIsActive = async (user) => {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advancedSettings = await store.get({ key: 'advanced' });
  const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

  if (requiresConfirmation && user.confirmed !== true) {
    throw new ApplicationError('Your account email is not confirmed');
  }

  if (user.blocked === true) {
    throw new ApplicationError('Your account has been blocked by an administrator');
  }
};

export default {
  async exchange(ctx: Context) {
    const {
      token,
      loginToken,
      email,
      code,
    } = ctx.request.body as MagicLinkExchangeRequest;

    const tokenService = strapi.plugin('strapi-plugin-nextauth').service('token');

    if (!tokenService) {
      throw new ApplicationError('Token service is not available.');
    }

    const tokenValue = loginToken ?? token;

    if (!tokenValue && !(email && code)) {
      ctx.throw(400, 'Either login token or email + code must be provided.');
    }

    let tokenRecord = null;

    if (tokenValue) {
      tokenRecord = await tokenService.consumeToken(tokenValue);
    } else if (email && code) {
      tokenRecord = await tokenService.consumeEmailCode(email, code);
    }

    if (!tokenRecord) {
      ctx.throw(401, 'Invalid or expired login credentials.');
    }

    const user = await strapi.db.query(USERS_PERMISSIONS_USER_UID).findOne({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      throw new ValidationError('User not found.');
    }

    await ensureUserIsActive(user);

    const sanitizedUser = await sanitizeUser(user, ctx);
    const jwt = getUsersPermissionsService('jwt').issue({ id: user.id });

    ctx.body = {
      jwt,
      user: sanitizedUser,
    };
  },

  async sendMail(ctx: Context) {
    const {
      email,
      url,
      context = {},
    } = ctx.request.body as SendMagicLinkRequest;

    if (!email) {
      ctx.throw(400, 'Email is required.');
    }

    const tokenService = strapi.plugin('strapi-plugin-nextauth').service('token');

    if (!tokenService) {
      throw new ApplicationError('Token service is not available.');
    }

    try {
      await tokenService.sendMagicLinkEmail(email, {
        url,
        context,
        ipAddress: ctx.ip,
        userAgent: ctx.get('user-agent'),
      });

      ctx.body = { success: true };
    } catch (error) {
      strapi.log.error('Failed to send magic link email', error);
      throw error;
    }
  },
};
