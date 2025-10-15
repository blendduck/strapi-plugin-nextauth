const DEFAULT_EMAIL_SUBJECT = 'Your sign-in link';
const DEFAULT_EMAIL_TEXT = [
  'Hello,',
  '',
  'Use the magic link below to finish signing in:',
  '{{MAGIC_LINK}}',
  '',
  'Or enter the one-time code:',
  '{{CODE}}',
  '',
  'If you did not request this email, you can safely ignore it.',
].join('\n');

const DEFAULT_EMAIL_HTML = `
  <p>Hello,</p>
  <p>
    Use the magic link below to finish signing in:<br />
    <a href="{{MAGIC_LINK}}">{{MAGIC_LINK}}</a>
  </p>
  <p>
    Or enter the one-time code: <strong>{{CODE}}</strong>
  </p>
  <p>If you did not request this email, you can safely ignore it.</p>
`;

export default {
  default: {
    token: {
      ttl: 15, // minutes
      tokenLength: 32,
      codeLength: 6,
    },
    email: {
      defaultFrom: '',
      defaultReplyTo: '',
      subject: DEFAULT_EMAIL_SUBJECT,
      text: DEFAULT_EMAIL_TEXT,
      html: DEFAULT_EMAIL_HTML,
    },
  },
  validator(config: Record<string, any> = {}) {
    const tokenConfig = config.token ?? {};
    const emailConfig = config.email ?? {};

    if (tokenConfig.ttl !== undefined && (typeof tokenConfig.ttl !== 'number' || tokenConfig.ttl <= 0)) {
      throw new Error('[strapi-plugin-nextauth] token.ttl must be a positive number (minutes).');
    }

    if (emailConfig.subject !== undefined && typeof emailConfig.subject !== 'string') {
      throw new Error('[strapi-plugin-nextauth] email.subject must be a string.');
    }

    if (tokenConfig.tokenLength !== undefined && (!Number.isInteger(tokenConfig.tokenLength) || tokenConfig.tokenLength < 16)) {
      throw new Error('[strapi-plugin-nextauth] token.tokenLength must be an integer >= 16.');
    }

    if (tokenConfig.codeLength !== undefined && (!Number.isInteger(tokenConfig.codeLength) || tokenConfig.codeLength < 4)) {
      throw new Error('[strapi-plugin-nextauth] token.codeLength must be an integer >= 4.');
    }

    if (emailConfig.defaultFrom !== undefined && typeof emailConfig.defaultFrom !== 'string') {
      throw new Error('[strapi-plugin-nextauth] email.defaultFrom must be a string.');
    }

    if (emailConfig.defaultReplyTo !== undefined && typeof emailConfig.defaultReplyTo !== 'string') {
      throw new Error('[strapi-plugin-nextauth] email.defaultReplyTo must be a string.');
    }

    if (emailConfig.text !== undefined && typeof emailConfig.text !== 'string') {
      throw new Error('[strapi-plugin-nextauth] email.text must be a string.');
    }

    if (emailConfig.html !== undefined && typeof emailConfig.html !== 'string') {
      throw new Error('[strapi-plugin-nextauth] email.html must be a string.');
    }
  },
};
