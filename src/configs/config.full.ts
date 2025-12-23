import { RawEditionConfig } from './types';

export const configFull: RawEditionConfig = {
  BASE_URLS: 'http://204.141.229.149:8001',
  login: {
    enableWxMpPhone: true,
    enableGuest_MP: true,
    enableGuest_APP: true,
    enableGoogle: true,
    enablePassword: true,
    enableWeChatOAuth: true,
    enableEmail: true,
    enableApple: true,
    enableSms:true
  },
  GOOGLE_OAUTH_CLIENT_ID_WEB:
    '668197306109-2glguqobqtbm92rt9upnot9rrt0t7bmf.apps.googleusercontent.com' // 需填入有效的 Web 客户端 ID
};
