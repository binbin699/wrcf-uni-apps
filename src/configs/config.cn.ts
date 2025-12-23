import { RawEditionConfig } from './types';

export const configCn = {
  BASE_URLS: 'http://111.62.241.103:8001',
  // BASE_URLS: 'https://lingxiwmp.qiniu.com/user',//小程序服务器配置
  login: {
    enableWxMpPhone: true, // 微信手机号登录（仅 mp 平台下显示）
    enableGuest_APP: false,
    enableGuest_MP: true,
    enableGoogle: false, // 国内版禁用 Google 登录
    enablePassword: false,
    enableWeChatOAuth: true,
    enableEmail: true,
    enableApple: true,
    enableSms:true
  }
} as RawEditionConfig;
