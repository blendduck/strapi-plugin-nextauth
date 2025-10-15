import service from './service';
import token from './token';
import settings from './settings';

const services: Record<string, unknown> = {
  service,
  token,
  settings,
};

export default services;
