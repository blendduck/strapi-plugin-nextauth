import crypto from 'crypto';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import pluginConfig from '../config';
import type { EmailTemplateSettings } from './settings';

const { ApplicationError } = errors;

const PLUGIN_ID = 'strapi-plugin-nextauth';
const TOKEN_UID = `plugin::${PLUGIN_ID}.token`;
const MAX_GENERATION_ATTEMPTS = 5;
const DEFAULT_EMAIL_SUBJECT = 'Your sign-in link';

type TokenRecord = {
  id: number | string;
  email: string;
  token: string;
  code: string;
  expires_at: string | Date;
  is_active: boolean;
  context?: Record<string, unknown>;
  user_agent?: string | null;
  ip_address?: string | null;
  last_used_at?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CreateTokenOptions = {
  context?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  invalidateExisting?: boolean;
};

type SendMagicLinkOptions = CreateTokenOptions & {
  url?: string;
};

const now = () => new Date();

const toDate = (value: string | Date | undefined | null) => {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

const renderTemplate = (template: string | undefined, variables: Record<string, string>) => {
  if (!template) {
    return undefined;
  }

  return template.replace(/{{\s*([A-Z_]+)\s*}}/gi, (_, key: string) => {
    const normalizedKey = key.toUpperCase();
    return variables[normalizedKey] ?? '';
  });
};

const buildMagicLink = (baseUrl: string | undefined, token: string) => {
  if (!baseUrl) {
    return undefined;
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch (error) {
    // Fallback to naive concatenation when URL constructor cannot parse the value.
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
};

const sanitizeTokenRecord = (record: TokenRecord | null) => {
  if (!record) {
    return null;
  }

  const {
    token: _token,
    code: _code,
    ...rest
  } = record;

  return rest;
};

type TokenConfig = {
  ttl?: number;
  tokenLength?: number;
  codeLength?: number;
};

type RuntimeConfig = {
  token: TokenConfig;
  email: EmailTemplateSettings;
};

const tokenService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getConfig = async (): Promise<RuntimeConfig> => {
    const defaultConfig = (pluginConfig.default ?? {}) as { token?: TokenConfig };
    const projectConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`, {}) ?? {}) as {
      token?: TokenConfig;
    };

    const tokenConfig: TokenConfig = {
      ...(defaultConfig.token ?? {}),
      ...(projectConfig.token ?? {}),
    };

    const emailSettings = await strapi
      .plugin('strapi-plugin-nextauth')
      .service('settings')
      .getSettings();

    return {
      token: tokenConfig,
      email: emailSettings,
    };
  };

  const generateRandomToken = (length: number) => {
    const byteLength = Math.max(16, Math.ceil(length / 2));
    return crypto.randomBytes(byteLength).toString('hex').slice(0, length);
  };

  const generateRandomCode = (length: number) => {
    const max = 10 ** length;
    const value = crypto.randomInt(0, max);
    return value.toString().padStart(length, '0');
  };

  const generateUniqueToken = async (length: number) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = generateRandomToken(length);
      const existing = await strapi.db.query(TOKEN_UID).findOne({
        where: { token: candidate },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ApplicationError('Unable to generate a unique login token. Please try again.');
  };

  const generateUniqueCode = async (email: string, length: number) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = generateRandomCode(length);
      const existing = await strapi.db.query(TOKEN_UID).findOne({
        where: {
          email,
          code: candidate,
          is_active: true,
        },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ApplicationError('Unable to generate a unique verification code. Please try again.');
  };

  const deactivateToken = async (id: number | string) => {
    await strapi.db.query(TOKEN_UID).update({
      where: { id },
      data: {
        is_active: false,
      },
    });
  };

  const markTokenAsUsed = async (id: number | string, usedAt: Date) => {
    await strapi.db.query(TOKEN_UID).update({
      where: { id },
      data: {
        is_active: false,
        last_used_at: usedAt,
      },
    });
  };

  const isExpired = (record: TokenRecord) => {
    const expiresAt = toDate(record.expires_at);
    return !expiresAt || expiresAt.getTime() <= Date.now();
  };

  return {
    async createToken(email: string, options: CreateTokenOptions = {}) {
      const config = await getConfig();
      const tokenConfig = config.token ?? {};
      const {
        context = {},
        ipAddress = null,
        userAgent = null,
        invalidateExisting = true,
      } = options;

      const normalizedEmail = email.toLowerCase();

      if (invalidateExisting) {
        await strapi.db.query(TOKEN_UID).updateMany({
          where: {
            email: normalizedEmail,
            is_active: true,
          },
          data: {
            is_active: false,
          },
        });
      }

      const tokenLength = Number(tokenConfig.tokenLength) || 32;
      const codeLength = Number(tokenConfig.codeLength) || 6;
      const ttlMinutes = Number(tokenConfig.ttl) || 15;

      const tokenValue = await generateUniqueToken(tokenLength);
      const codeValue = await generateUniqueCode(normalizedEmail, codeLength);

      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      const record = (await strapi.db.query(TOKEN_UID).create({
        data: {
          email: normalizedEmail,
          token: tokenValue,
          code: codeValue,
          expires_at: expiresAt,
          is_active: true,
          context,
          user_agent: userAgent,
          ip_address: ipAddress,
        },
      })) as TokenRecord;

      return {
        ...sanitizeTokenRecord(record),
        token: tokenValue,
        code: codeValue,
      };
    },

    async consumeToken(tokenValue: string) {
      if (!tokenValue) {
        return null;
      }

      const record = (await strapi.db.query(TOKEN_UID).findOne({
        where: {
          token: tokenValue,
          is_active: true,
        },
      })) as TokenRecord | null;

      if (!record) {
        return null;
      }

      if (isExpired(record)) {
        await deactivateToken(record.id);
        return null;
      }

      const usedAt = now();
      await markTokenAsUsed(record.id, usedAt);

      return sanitizeTokenRecord({
        ...record,
        is_active: false,
        last_used_at: usedAt,
      });
    },

    async consumeEmailCode(email: string, code: string) {
      if (!email || !code) {
        return null;
      }

      const normalizedEmail = email.toLowerCase();

      const record = (await strapi.db.query(TOKEN_UID).findOne({
        where: {
          email: normalizedEmail,
          code,
          is_active: true,
        },
        orderBy: { createdAt: 'desc' },
      })) as TokenRecord | null;

      if (!record) {
        return null;
      }

      if (isExpired(record)) {
        await deactivateToken(record.id);
        return null;
      }

      const usedAt = now();
      await markTokenAsUsed(record.id, usedAt);

      return sanitizeTokenRecord({
        ...record,
        is_active: false,
        last_used_at: usedAt,
      });
    },

    async sendMagicLinkEmail(email: string, options: SendMagicLinkOptions = {}) {
      const { url, ...rest } = options;
      const tokenResult = await this.createToken(email, rest);
      const config = await getConfig();
      const emailConfig = config.email;

      const magicLink = buildMagicLink(url, tokenResult.token);
      const variables = {
        TOKEN: tokenResult.token,
        CODE: tokenResult.code,
        EMAIL: tokenResult.email,
        EXPIRES_AT: tokenResult.expires_at instanceof Date ? tokenResult.expires_at.toISOString() : String(tokenResult.expires_at),
        URL: url,
        MAGIC_LINK: magicLink ?? '',
      };

      const emailService = strapi.plugin('email')?.service('email');

      if (!emailService?.send) {
        throw new ApplicationError('Email plugin is not configured. Please enable the email plugin to send messages.');
      }

      await emailService.send({
        to: tokenResult.email,
        from: emailConfig.defaultFrom || undefined,
        replyTo: emailConfig.defaultReplyTo || undefined,
        subject: emailConfig.subject || DEFAULT_EMAIL_SUBJECT,
        text: renderTemplate(emailConfig.text, variables),
        html: renderTemplate(emailConfig.html, variables),
      });

      return {
        token: tokenResult.token,
        code: tokenResult.code,
        magicLink,
        expires_at: tokenResult.expires_at,
        email: tokenResult.email,
      };
    },
  };
};

export default tokenService;
