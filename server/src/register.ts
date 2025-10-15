import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read settings',
      uid: 'settings.read',
      subCategory: 'settings',
      pluginName: 'strapi-plugin-nextauth',
    },
    {
      section: 'plugins',
      displayName: 'Update settings',
      uid: 'settings.update',
      subCategory: 'settings',
      pluginName: 'strapi-plugin-nextauth',
    },
  ];

  const actionProvider = strapi.service('admin::permission').actionProvider;

  actions.forEach((action) => {
    actionProvider.register(action);
  });
};

export default register;
