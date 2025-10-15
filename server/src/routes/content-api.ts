export default [
  {
    method: 'GET',
    path: '/',
    handler: 'controller.index',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/oauth/login',
    handler: 'oauth.login',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/oauth/sync',
    handler: 'oauth.sync',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/oauth/token',
    handler: 'token.exchange',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/send-mail',
    handler: 'token.sendMail',
    config: {
      auth: false,
      policies: [],
    },
  },
];
