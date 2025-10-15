const pluginPermissions = {
  readSettings: [{ action: 'plugin::strapi-plugin-nextauth.settings.read', subject: null }],
  updateSettings: [{ action: 'plugin::strapi-plugin-nextauth.settings.update', subject: null }],
};

export default pluginPermissions;
