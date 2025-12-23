import { RawEditionConfig } from './types';

export const configIntl: RawEditionConfig = {
  BASE_URLS: 'http://204.141.229.218:8001',
  login: {
    enableWxMpPhone: false, // 海外版通常不走微信手机号
    enableGuest_APP: false,
    enableGuest_MP: false,
    enableGoogle: true,
    enablePassword: false,
    enableWeChatOAuth: false,
    enableEmail: true,
    enableApple: true,
    enableSms:false
  },
  // 海外版需要配置 Google Client ID
  GOOGLE_OAUTH_CLIENT_ID_WEB:
    '668197306109-2glguqobqtbm92rt9upnot9rrt0t7bmf.apps.googleusercontent.com'
};
