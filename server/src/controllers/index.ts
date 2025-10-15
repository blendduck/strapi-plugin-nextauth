import controller from './controller';
import oauth from './oauth';
import token from './token';
import settings from './settings';

const controllers: Record<string, unknown> = {
  controller,
  oauth,
  token,
  settings,
};

export default controllers;
