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


const getService = (name) => {
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
      userAgent,
      clientIp,
      attribution
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

    console.log("[exchange] tokenValue", tokenValue);

    if (!tokenRecord) {
      ctx.throw(401, 'Invalid or expired login credentials.');
    }

    const emailValue = tokenRecord.email;
    const name =  tokenRecord.email.split('@')[0];

    console.log("[exchange] email & name", emailValue, name);

    const existUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: {
        email: emailValue,
      },
    });

    // 注册新用户
    if (!existUser) {
      const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
      const settings: Record<string, any> = await pluginStore.get({ key: 'advanced' });
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: settings.default_role } });

      if (!role) {
        throw new ApplicationError('Impossible to find the default role');
      }

      const newUser = {
        role: role.id,
        email: emailValue.toLowerCase(),
        username: emailValue.toLowerCase(),
        name,
        avatar: null,
        provider: 'magiclink',
        confirmed: true,
        userAgent,
        clientIp,
        attribution
      };

      const user = await getService('user').add(newUser);
      const sanitizedUser = await sanitizeUser(user, ctx);
      const jwt = getService('jwt').issue(_.pick(user, ['id']));

      return ctx.send({
        jwt,
        user: {
          ...sanitizeUser,
          isNew: true
        },
      });
    } else {
      // 更新用户
      const user = await getService('user').edit(existUser.id, {
        confirmed: true,
      })
      const sanitizedUser = await sanitizeUser(user, ctx);
      const jwt = getService('jwt').issue(_.pick(user, ['id']));
      return ctx.send({
        jwt,
        user: {
          ...sanitizeUser,
          isNew: false
        },
      });
    }

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
