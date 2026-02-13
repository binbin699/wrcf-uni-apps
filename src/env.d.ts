/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 全局配置类型定义
declare const APP_CONFIG: {
  BASE_API_URL: string;
  SUPPORT_LOGIN_TYPE_WX_MP_PHONE: boolean;
  SUPPORT_LOGIN_TYPE_GUEST: boolean;
  SUPPORT_LOGIN_TYPE_GUEST_MP: boolean;
  SUPPORT_LOGIN_TYPE_GOOGLE: boolean;
  SUPPORT_LOGIN_TYPE_PASSWORD: boolean;
  SUPPORT_LOGIN_TYPE_WECHAT_OAUTH: boolean;
  SUPPORT_LOGIN_TYPE_EMAIL: boolean;
  SUPPORT_LOGIN_TYPE_APPLE: boolean;
  SUPPORT_LOGIN_TYPE_SMS: boolean;
  BLE_FILTER_ENABLED: boolean;
  APP_SETUP_MODE: 'qrcode' | 'bluetooth' | 'both';
  APP_USE_VOICEPRINT: boolean;
  TERMS_URL: string;
  PRIVACY_URL: string;
  FEEDBACK_EMAIL: string;
  SHOW_INSTRUCTIONS_TUTORIALS: boolean;
  MANUAL_ZH_URL: string;
  MANUAL_EN_URL: string;
  MANUAL_JA_URL: string;
  MANUAL_KO_URL: string;
  MANUAL_RU_URL: string;
  MANUAL_AR_URL: string;
  TUTORIAL_VIDEO_URL: string;
  TUTORIAL_VIDEO_EN_URL: string;
  GOOGLE_OAUTH_CLIENT_ID_WEB: string;
  ARMS_PID: string;
  ARMS_ENDPOINT: string;
  ARMS_ENV: 'prod' | 'gray' | 'pre' | 'daily' | 'local';
};

// 应用版本号（从 manifest.json 读取）
declare const APP_VERSION: string;
