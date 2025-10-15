export default [
  {
    method: 'GET',
    path: '/settings',
    handler: 'settings.find',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
      permissions: [{ action: 'plugin::strapi-plugin-nextauth.settings.read', subject: null }],
    },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'settings.update',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
      permissions: [{ action: 'plugin::strapi-plugin-nextauth.settings.update', subject: null }],
    },
  },
];
