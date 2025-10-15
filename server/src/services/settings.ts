import type { Core } from '@strapi/strapi';
import pluginConfig from '../config';

const PLUGIN_ID = 'strapi-plugin-nextauth';
const STORE_KEY = 'settings';

export type EmailTemplateSettings = {
  defaultFrom: string;
  defaultReplyTo: string;
  subject: string;
  text: string;
  html: string;
};

const sanitizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value;
};

const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getPluginStore = () =>
    strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });

  const getDefaultEmailSettings = () => {
    const pluginDefaults = (pluginConfig?.default?.email ?? {}) as Partial<EmailTemplateSettings>;
    const projectOverrides = (strapi.config.get(`plugin::${PLUGIN_ID}`, {}) ?? {}) as {
      email?: Partial<EmailTemplateSettings>;
    };
    const configEmail = projectOverrides.email ?? {};

    const base = {
      defaultFrom: sanitizeString(pluginDefaults.defaultFrom),
      defaultReplyTo: sanitizeString(pluginDefaults.defaultReplyTo),
      subject: sanitizeString(pluginDefaults.subject),
      text: sanitizeString(pluginDefaults.text),
      html: sanitizeString(pluginDefaults.html),
    };

    return {
      ...base,
      defaultFrom: sanitizeString(configEmail.defaultFrom) || base.defaultFrom,
      defaultReplyTo: sanitizeString(configEmail.defaultReplyTo) || base.defaultReplyTo,
      subject: sanitizeString(configEmail.subject) || base.subject,
      text: sanitizeString(configEmail.text) || base.text,
      html: sanitizeString(configEmail.html) || base.html,
    };
  };

  return {
    async getSettings(): Promise<EmailTemplateSettings> {
      const store = getPluginStore();
      const storedSettings = ((await store.get({ key: STORE_KEY })) ?? {}) as Partial<EmailTemplateSettings>;

      const defaults = getDefaultEmailSettings();

      return {
        ...defaults,
        defaultFrom: sanitizeString(storedSettings.defaultFrom) || defaults.defaultFrom,
        defaultReplyTo: sanitizeString(storedSettings.defaultReplyTo) || defaults.defaultReplyTo,
        subject: sanitizeString(storedSettings.subject) || defaults.subject,
        text: sanitizeString(storedSettings.text) || defaults.text,
        html: sanitizeString(storedSettings.html) || defaults.html,
      };
    },

    async updateSettings(payload: Partial<EmailTemplateSettings>): Promise<EmailTemplateSettings> {
      const settings: EmailTemplateSettings = {
        defaultFrom: sanitizeString(payload.defaultFrom),
        defaultReplyTo: sanitizeString(payload.defaultReplyTo),
        subject: sanitizeString(payload.subject),
        text: sanitizeString(payload.text),
        html: sanitizeString(payload.html),
      };

      const store = getPluginStore();
      await store.set({
        key: STORE_KEY,
        value: settings,
      });

      return settings;
    },
  };
};

export default settingsService;
