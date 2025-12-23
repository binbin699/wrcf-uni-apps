/**
 * 应用配置管理
 * 作用：
 * - 通过 EDITION 切换版本：'full' | 'cn' | 'intl'
 * - 导出 AppConfig/current、LoginConfig、getBaseUrl()、getGoogleClientId()
 * 用法：
 * - 修改 EDITION 即可切换版本；如需环境驱动可改为读取 import.meta.env
 */

import { PLATFORM, OS, OS_VERSION, ANDROID_API_LEVEL, ENV } from '../const/env';
import { configCn } from './config.cn';
import { configFull } from './config.full';
import { configIntl } from './config.intl';
import { EditionKind, EditionKinds, RawEditionConfig, resolveEditionConfig } from './types';

// 只改这一处即可切换国内版/海外版/完整版
export const EDITION: EditionKind = (() => {
  // 从环境变量读取 EDITION，若无效则默认 'full'
  if (ENV.VITE_APP_EDITION) {
    const edition = ENV.VITE_APP_EDITION as EditionKind;
    if (EditionKinds.includes(edition)) {
      return edition;
    }
    console.warn(`Invalid EDITION: ${edition}, fallback to 'full'`);
  }
  return 'full';
})();

const EDITION_CONFIG: Record<EditionKind, RawEditionConfig> = {
  full: configFull,
  cn: configCn,
  intl: configIntl
};

export const AppConfig = {
  platform: PLATFORM,
  os: OS,
  osVersion: OS_VERSION,
  androidApiLevel: ANDROID_API_LEVEL,
  edition: EDITION,
  current: resolveEditionConfig(EDITION_CONFIG[EDITION], ENV)
};

export function getBaseUrl(): string {
  const scannedURL = uni.getStorageSync('scannedBaseURL');
  return scannedURL || AppConfig.current.BASE_URLS;
}

export function getGoogleClientId(): string {
  return AppConfig.current.GOOGLE_OAUTH_CLIENT_ID_WEB || '';
}

console.log('=== 配置调试信息 ===');
console.log('ENV.VITE_TERMS_URL:', ENV.VITE_TERMS_URL);
console.log('ENV.VITE_PRIVACY_URL:', ENV.VITE_PRIVACY_URL);
console.log('ENV.VITE_APP_EDITION:', ENV.VITE_APP_EDITION);
console.log('AppConfig.current.TERMS_URL:', AppConfig.current.TERMS_URL);
console.log('AppConfig.current.PRIVACY_URL:', AppConfig.current.PRIVACY_URL);
console.log('AppConfig', JSON.stringify(AppConfig));
console.log('===================');

export const LoginConfig = AppConfig.current.login;
