import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import { Initializer } from './components/Initializer';
import pluginPermissions from './permissions';
import getTrad from './utils/getTrad';

const name = pluginPkg.strapi?.name || pluginPkg.name;

export default {
  register(app: any) {
    const SettingsComponent = async () => {
      const component = await import(
        /* webpackChunkName: "next-auth-settings-page" */ './pages/Settings'
      );

      return component;
    }
    app.createSettingSection(
      {
        id: pluginId,
        intlLabel: {
          id: getTrad('settings.section.title'),
          defaultMessage: 'NextAuth',
        },
      },
      [
        {
          intlLabel: {
            id: getTrad('settings.page.title'),
            defaultMessage: 'Magic Link settings',
          },
          id: 'magic-link-settings',
          to: `/settings/${pluginId}`,
          Component: SettingsComponent,
          permissions: pluginPermissions.readSettings,
        },
      ],
    );

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap() {
    // Nothing to bootstrap
  },
};
