/**
 * 版本配置管理（const/config.ts）
 * 作用：
 * - 通过 EDITION 切换版本：'full' | 'cn' | 'intl'
 * - 导出 AppConfig/current、LoginConfig、getBaseUrl()、getGoogleClientId()
 * 用法：
 * - 修改 EDITION 即可切换版本；如需环境驱动可改为读取 import.meta.env
 */

export type EditionKind = 'full' | 'cn' | 'intl';

export const EditionKinds = ['full', 'cn', 'intl'] as const;

export type LoginMethod = 'phone' | 'guest' | 'google' | 'password' | 'email';

type LoginConfigGoogleOn = {
  enableWxMpPhone: boolean;
  enableGuest_APP: boolean;
  enableGuest_MP: boolean;
  enableGoogle: true;
  enablePassword: boolean;
  enableWeChatOAuth: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  enableApple: boolean;
};

type LoginConfigGoogleOff = {
  enableWxMpPhone: boolean;
  enableGuest_APP: boolean;
  enableGuest_MP: boolean;
  enableGoogle: false;
  enablePassword: boolean;
  enableWeChatOAuth: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  enableApple: boolean;
};

export type PlatformLoginConfig = LoginConfigGoogleOn | LoginConfigGoogleOff;

type EditionConfigGoogleOn = {
  BASE_URLS: string;
  login: LoginConfigGoogleOn;
  GOOGLE_OAUTH_CLIENT_ID_WEB: string;
  TERMS_URL: string;
  PRIVACY_URL: string;
};

type EditionConfigGoogleOff = {
  BASE_URLS: string;
  login: LoginConfigGoogleOff;
  GOOGLE_OAUTH_CLIENT_ID_WEB?: undefined;
  TERMS_URL: string;
  PRIVACY_URL: string;
};

export type EditionConfig = EditionConfigGoogleOn | EditionConfigGoogleOff;

// 允许在 EDITION_CONFIG 中部分填写，未填写项用默认值兜底
type LoginOptions = {
  enableWxMpPhone?: boolean;
  enableGuest_APP?: boolean;
  enableGuest_MP?: boolean;
  enableGoogle?: boolean;
  enablePassword?: boolean;
  enableWeChatOAuth?: boolean;
  enableEmail?: boolean;
  enableSms?: boolean;
  enableApple?: boolean;
};

export type RawEditionConfig = {
  BASE_URLS?: string;
  login?: LoginOptions;
  GOOGLE_OAUTH_CLIENT_ID_WEB?: string;
  TERMS_URL?: string;
  PRIVACY_URL?: string;
};

export function resolveEditionConfig(
  raw?: RawEditionConfig,
  env?: Record<string, string | undefined>
): EditionConfig {
  // 优先使用环境变量，其次使用配置文件，最后使用默认值
  const base = env?.VITE_BASE_URL || raw?.BASE_URLS || DEFAULT_CONFIG.BASE_URLS;
  const termsUrl = env?.VITE_TERMS_URL || raw?.TERMS_URL || DEFAULT_CONFIG.TERMS_URL;
  const privacyUrl = env?.VITE_PRIVACY_URL || raw?.PRIVACY_URL || DEFAULT_CONFIG.PRIVACY_URL;

  const loginRaw = raw?.login ?? {};

  const enableGoogle = (loginRaw.enableGoogle ?? DEFAULT_CONFIG.login.enableGoogle) === true;
  const loginBase = {
    enableWxMpPhone: loginRaw.enableWxMpPhone ?? DEFAULT_CONFIG.login.enableWxMpPhone,
    enableGuest_APP: loginRaw.enableGuest_APP ?? DEFAULT_CONFIG.login.enableGuest_APP,
    enableGuest_MP: loginRaw.enableGuest_MP ?? DEFAULT_CONFIG.login.enableGuest_MP,
    enablePassword: loginRaw.enablePassword ?? DEFAULT_CONFIG.login.enablePassword,
    enableWeChatOAuth: loginRaw.enableWeChatOAuth ?? DEFAULT_CONFIG.login.enableWeChatOAuth,
    enableEmail: loginRaw.enableEmail ?? DEFAULT_CONFIG.login.enableEmail,
    enableSms: loginRaw.enableSms ?? DEFAULT_CONFIG.login.enableSms,
    enableApple: loginRaw.enableApple ?? DEFAULT_CONFIG.login.enableApple
  };

  if (enableGoogle) {
    const googleId = raw?.GOOGLE_OAUTH_CLIENT_ID_WEB ?? '';
    return {
      BASE_URLS: base,
      login: { ...loginBase, enableGoogle: true },
      GOOGLE_OAUTH_CLIENT_ID_WEB: googleId,
      TERMS_URL: termsUrl,
      PRIVACY_URL: privacyUrl
    };
  }
  return {
    BASE_URLS: base,
    login: { ...loginBase, enableGoogle: false },
    GOOGLE_OAUTH_CLIENT_ID_WEB: undefined,
    TERMS_URL: termsUrl,
    PRIVACY_URL: privacyUrl
  };
}

export const DEFAULT_CONFIG: EditionConfig = {
  BASE_URLS: 'http://localhost:8001',
  login: {
    enableWxMpPhone: false,
    enableGuest_APP: true,
    enableGuest_MP: true,
    enableGoogle: false,
    enablePassword: false,
    enableWeChatOAuth: true,
    enableEmail: false,
    enableSms: false,
    enableApple: true
  },
  TERMS_URL: 'https://your.domain/user-agreement',
  PRIVACY_URL: 'https://your.domain/privacy-right'
};
