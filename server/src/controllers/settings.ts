import type { Context } from 'koa';

const getSettingsService = () => strapi.plugin('strapi-plugin-nextauth').service('settings');

export default {
  async find(ctx: Context) {
    const settings = await getSettingsService().getSettings();
    ctx.body = settings;
  },

  async update(ctx: Context) {
    const settings = await getSettingsService().updateSettings(ctx.request.body ?? {});
    ctx.body = settings;
  },
};
