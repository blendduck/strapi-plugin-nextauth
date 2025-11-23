import type { OAuthLoginRequest } from '../types';


/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import { errors } from '@strapi/utils';

const { ValidationError, ApplicationError } = errors;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};


const getService = (name) => {
  return strapi.plugin('users-permissions').service(name);
};


export default {
  async login(ctx) {
    const { email, password } = ctx.request.body as OAuthLoginRequest;

    if (!email || !password) {
      return ctx.badRequest?.('Missing required parameters.');
    }

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });

    // Check if the user exists.
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: {
        email: email.toLowerCase()
      },
    });

    if (!user) {
      throw new ValidationError('Invalid identifier or password');
    }

    if (!user.password) {
      throw new ValidationError('Invalid identifier or password');
    }

    const validPassword = await getService('user').validatePassword(
      password,
      user.password
    );


    if (!validPassword) {
      throw new ValidationError('Invalid identifier or password');
    }

    const advancedSettings = await store.get({ key: 'advanced' });
    const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

    if (requiresConfirmation && user.confirmed !== true) {
      throw new ApplicationError('Your account email is not confirmed');
    }

    if (user.blocked === true) {
      throw new ApplicationError('Your account has been blocked by an administrator');
    }

    return ctx.send({
      jwt: getService('jwt').issue({ id: user.id }),
      user: await sanitizeUser(user, ctx),
    });
  },

  async sync(ctx) {
    const {
      email,
      name,
      avatar,
      provider,
      userAgent,
      clientIp,
      clientId,
      fbclid,
    } = ctx.request.body;

    if (!email || !name) {
      return ctx.badRequest?.('Missing required parameters.');
    }

    const existUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: {
        email,
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
        email: email.toLowerCase(),
        username: email.toLowerCase(),
        name,
        avatar,
        provider,
        confirmed: true,
        userAgent,
        clientIp,
        clientId,
        fbclid,
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
        avatar,
        name,
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
  }
};
