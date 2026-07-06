import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import getAppConfig from '../../../app.config.ts';

export const CHANNELS = [
  'app-android-cn',
  'app-android-intl',
  'app-ios-cn',
  'app-ios-intl',
  'app-harmony-cn',
  'mp-weixin-cn'
] as const;

export type Channel = (typeof CHANNELS)[number];
type RuntimePlatform = 'app-android' | 'app-ios' | 'app-harmony' | 'mp-weixin';
type LegacyEdition = 'full' | 'cn' | 'intl';
type LocaleCode = 'zh-Hans' | 'en' | 'ja' | 'ko' | 'ru' | 'ar' | 'kk' | 'th' | 'es' | 'fr';
export type QrcodeScanSource = 'camera_only' | 'camera_and_album';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends ReadonlyArray<infer V>
      ? ReadonlyArray<DeepPartial<V>>
      : T[K] extends Record<string, unknown>
        ? DeepPartial<T[K]>
        : T[K];
};

interface BrandEndpoints {
  baseApiUrl: string;
  armsPid: string;
  armsEndpoint: string;
  armsEnv: 'prod' | 'gray' | 'pre' | 'daily' | 'local';
}

interface BrandLoginFeatures {
  supportWxMpPhone: boolean;
  supportGuest: boolean;
  supportGuestMp: boolean;
  supportGoogle: boolean;
  supportPassword: boolean;
  supportWechatOauth: boolean;
  supportEmail: boolean;
  supportApple: boolean;
  supportSms: boolean;
}

interface BrandDeviceFeatures {
  bleFilterEnabled: boolean;
  setupMode: 'qrcode' | 'bluetooth' | 'both';
  primarySetupMode: 'qrcode' | 'bluetooth' | 'none';
  qrcodeScanSource: QrcodeScanSource;
  useVoiceprint: boolean;
  useVoiceClone: boolean;
}

interface BrandLegal {
  termsUrl: string;
  privacyUrl: string;
  feedbackEmail: string;
  privacyDescription: Record<string, string>;
}

/** 智能体广场语言筛选呈现方式：navbar 为导航栏左上角下拉；horizontal_bar 为搜索框下方下拉选择框 */
export type SquareLanguageFilterStyle = 'navbar' | 'horizontal_bar';

interface BrandUi {
  showInstructionsTutorials: boolean;
  profileEntryGroupOrder: string[];
  squareLanguageFilterStyle: SquareLanguageFilterStyle;
}

interface BrandGoogle {
  oauthClientIdWeb: string;
  oauthClientIdNative: string;
}

interface BrandWeixin {
  oauthAppId: string;
  universalLinks: string;
  mpAppId: string;
  mpLocationDesc: string;
}

interface BrandApple {
  universalLinks: string;
}

interface BrandIdentity {
  dcloudAppId: string;
  name: Record<LocaleCode, string>;
  description: string;
  versionName: string;
  versionCode: number;
  packageName: string;
  iosBundleId: string;
  harmonyBundleName: string;
  urlSchemeWhitelist: string[];
}

interface BrandTheme {
  tokens: Record<string, string>;
}

interface BrandContent {
  manuals: Record<string, string>;
}

interface BrandHarmony {
  icons: {
    foreground: string;
    background: string;
  };
  splash: {
    startWindowIcon: string;
  };
}

interface BrandSigning {
  harmony: {
    profile: string;
    keystore: string;
    material: string;
  };
}

interface BrandPlatform {
  appPlus: {
    modules: string[];
  };
  android: {
    permissions: string[];
    abiFilters: string[];
    minSdkVersion: number;
  };
  mpWeixin: {
    setting: {
      urlCheck: boolean;
      es6: boolean;
      minified: boolean;
    };
  };
}

export interface BrandConfigShape {
  endpoints: BrandEndpoints;
  features: {
    login: BrandLoginFeatures;
    device: BrandDeviceFeatures;
  };
  legal: BrandLegal;
  ui: BrandUi;
  thirdParty: {
    google: BrandGoogle;
    weixin: BrandWeixin;
    apple: BrandApple;
  };
  identity: BrandIdentity;
  content: BrandContent;
  harmony: BrandHarmony;
  signing: BrandSigning;
  platform: BrandPlatform;
  theme: BrandTheme;
}

export type BrandConfig = DeepPartial<BrandConfigShape>;

export interface ResolvedBrandConfig extends BrandConfigShape {
  meta: {
    channel: Channel;
    rootDir: string;
    paths: {
      rootConfigPath: string;
      commonLocaleDir: string;
      commonAssetsDir: string;
      channelDir: string;
      channelConfigPath: string;
      channelAssetsDir: string;
      channelCertsDir: string;
    };
    legacy: {
      platform: RuntimePlatform;
      edition: LegacyEdition;
    };
  };
}

export interface LegacyAppConfig {
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
  APP_PRIMARY_SETUP_MODE: 'qrcode' | 'bluetooth' | 'none';
  APP_QRCODE_SCAN_SOURCE: QrcodeScanSource;
  APP_USE_VOICEPRINT: boolean;
  APP_USE_VOICE_CLONE: boolean;
  TERMS_URL: string;
  PRIVACY_URL: string;
  FEEDBACK_EMAIL: string;
  SHOW_INSTRUCTIONS_TUTORIALS: boolean;
  PROFILE_ENTRY_GROUP_ORDER: string[];
  /** @see SquareLanguageFilterStyle */
  SQUARE_LANGUAGE_FILTER_STYLE: SquareLanguageFilterStyle;
  GOOGLE_OAUTH_CLIENT_ID_WEB: string;
  ARMS_PID: string;
  ARMS_ENDPOINT: string;
  ARMS_ENV: 'prod' | 'gray' | 'pre' | 'daily' | 'local';
  MANUALS: Record<string, string>;
}

interface ManifestLocaleEntry {
  name?: string;
  ios?: {
    privacyDescription?: Record<string, string>;
  };
}

export interface ManifestJson {
  name?: string;
  appid?: string;
  description?: string;
  versionName?: string;
  versionCode?: number;
  'app-plus'?: {
    modules?: Record<string, Record<string, never>>;
    locales?: Record<string, ManifestLocaleEntry>;
    distribute?: {
      android?: {
        permissions?: string[];
        excludePermissions?: string[];
        abiFilters?: string[];
        minSdkVersion?: number;
      };
      ios?: {
        privacyDescription?: Record<string, string>;
        urlschemewhitelist?: string[];
      };
      icons?: {
        android?: Record<string, string>;
        ios?: Record<string, unknown>;
      };
      sdkConfigs?: {
        oauth?: {
          google?: {
            clientid?: string;
          };
          weixin?: {
            appid?: string;
            UniversalLinks?: string;
          };
          apple?: {
            UniversalLinks?: string;
          };
        };
      };
    };
  };
  'app-android'?: {
    distribute?: {
      excludePermissions?: string[];
    };
  };
  'mp-weixin'?: {
    appid?: string;
    setting?: {
      urlCheck?: boolean;
      es6?: boolean;
      minified?: boolean;
    };
    permission?: {
      'scope.userLocation'?: {
        desc?: string;
      };
    };
  };
  'app-harmony'?: {
    distribute?: {
      bundleName?: string;
      icons?: {
        foreground?: string;
        background?: string;
      };
      splashScreens?: {
        startWindowIcon?: string;
      };
    };
  };
}

interface ConfigLoadOptions {
  brand?: string | undefined;
  channel: Channel;
  cwd?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
}

interface LegacyContext {
  platform: RuntimePlatform;
  edition: LegacyEdition;
}

const SUPPORTED_LOCALES: readonly LocaleCode[] = [
  'zh-Hans',
  'en',
  'ja',
  'ko',
  'ru',
  'ar',
  'kk',
  'th',
  'es',
  'fr'
];

const CHANNEL_TO_CONTEXT: Record<Channel, LegacyContext> = {
  'app-android-cn': { platform: 'app-android', edition: 'cn' },
  'app-android-intl': { platform: 'app-android', edition: 'intl' },
  'app-ios-cn': { platform: 'app-ios', edition: 'cn' },
  'app-ios-intl': { platform: 'app-ios', edition: 'intl' },
  'app-harmony-cn': { platform: 'app-harmony', edition: 'cn' },
  'mp-weixin-cn': { platform: 'mp-weixin', edition: 'cn' }
};

const MANIFEST_LOCALE_TO_SCHEMA: Record<string, LocaleCode> = {
  zh: 'zh-Hans',
  'zh-Hans': 'zh-Hans',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  ru: 'ru',
  ar: 'ar',
  kk: 'kk',
  th: 'th',
  es: 'es',
  fr: 'fr'
};

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

export function resolveBrandRoot(cwd: string = process.cwd()): string {
  return cwd;
}

export function resolveChannel(env: Record<string, string | undefined>, cwd: string = process.cwd()): Channel {
  const explicitChannel = env.CHANNEL?.trim();
  if (explicitChannel) {
    if (isChannel(explicitChannel)) {
      return explicitChannel;
    }
    throw new Error(`Invalid CHANNEL "${explicitChannel}". Supported channels: ${CHANNELS.join(', ')}`);
  }

  const rawPlatform = env.UNI_UTS_PLATFORM || env.UNI_PLATFORM || 'app-android';
  const edition = normalizeEdition(env.VITE_APP_EDITION || 'cn');

  if (isGenericAppPlatform(rawPlatform)) {
    const appliedChannel = inferAppliedAppChannel(edition, cwd);
    if (appliedChannel) {
      return appliedChannel;
    }
    return edition === 'intl' ? 'app-android-intl' : 'app-android-cn';
  }

  const platform = normalizePlatform(rawPlatform);

  if (platform === 'mp-weixin') {
    return 'mp-weixin-cn';
  }

  const appliedChannel = inferAppliedAppChannel(edition, cwd, platform);
  if (appliedChannel) {
    return appliedChannel;
  }

  if (platform === 'app-android') {
    return edition === 'intl' ? 'app-android-intl' : 'app-android-cn';
  }

  if (platform === 'app-ios') {
    return edition === 'intl' ? 'app-ios-intl' : 'app-ios-cn';
  }

  if (platform === 'app-harmony') {
    if (edition === 'intl') {
      throw new Error(
        `Harmony intl is not a supported channel yet. Set CHANNEL=app-harmony-cn explicitly, or use VITE_APP_EDITION=cn. Supported channels: ${CHANNELS.join(', ')}`
      );
    }
    return 'app-harmony-cn';
  }

  throw new Error(
    `Unable to infer CHANNEL from UNI_UTS_PLATFORM="${env.UNI_UTS_PLATFORM || ''}" and VITE_APP_EDITION="${env.VITE_APP_EDITION || ''}". Supported channels: ${CHANNELS.join(', ')}`
  );
}

export function toLegacyAppConfig(resolvedConfig: ResolvedBrandConfig): LegacyAppConfig {
  return {
    BASE_API_URL: resolvedConfig.endpoints.baseApiUrl,
    SUPPORT_LOGIN_TYPE_WX_MP_PHONE: resolvedConfig.features.login.supportWxMpPhone,
    SUPPORT_LOGIN_TYPE_GUEST: resolvedConfig.features.login.supportGuest,
    SUPPORT_LOGIN_TYPE_GUEST_MP: resolvedConfig.features.login.supportGuestMp,
    SUPPORT_LOGIN_TYPE_GOOGLE: resolvedConfig.features.login.supportGoogle,
    SUPPORT_LOGIN_TYPE_PASSWORD: resolvedConfig.features.login.supportPassword,
    SUPPORT_LOGIN_TYPE_WECHAT_OAUTH: resolvedConfig.features.login.supportWechatOauth,
    SUPPORT_LOGIN_TYPE_EMAIL: resolvedConfig.features.login.supportEmail,
    SUPPORT_LOGIN_TYPE_APPLE: resolvedConfig.features.login.supportApple,
    SUPPORT_LOGIN_TYPE_SMS: resolvedConfig.features.login.supportSms,
    BLE_FILTER_ENABLED: resolvedConfig.features.device.bleFilterEnabled,
    APP_SETUP_MODE: resolvedConfig.features.device.setupMode,
    APP_PRIMARY_SETUP_MODE: resolvedConfig.features.device.primarySetupMode,
    APP_QRCODE_SCAN_SOURCE: resolvedConfig.features.device.qrcodeScanSource,
    APP_USE_VOICEPRINT: resolvedConfig.features.device.useVoiceprint,
    APP_USE_VOICE_CLONE: resolvedConfig.features.device.useVoiceClone,
    TERMS_URL: resolvedConfig.legal.termsUrl,
    PRIVACY_URL: resolvedConfig.legal.privacyUrl,
    FEEDBACK_EMAIL: resolvedConfig.legal.feedbackEmail,
    SHOW_INSTRUCTIONS_TUTORIALS: resolvedConfig.ui.showInstructionsTutorials,
    PROFILE_ENTRY_GROUP_ORDER: [...resolvedConfig.ui.profileEntryGroupOrder],
    SQUARE_LANGUAGE_FILTER_STYLE: resolvedConfig.ui.squareLanguageFilterStyle,
    GOOGLE_OAUTH_CLIENT_ID_WEB: resolvedConfig.thirdParty.google.oauthClientIdWeb,
    ARMS_PID: resolvedConfig.endpoints.armsPid,
    ARMS_ENDPOINT: resolvedConfig.endpoints.armsEndpoint,
    ARMS_ENV: resolvedConfig.endpoints.armsEnv,
    MANUALS: resolvedConfig.content.manuals
  };
}

export function loadBrandConfig(options: ConfigLoadOptions): ResolvedBrandConfig {
  const cwd = options.cwd || process.cwd();
  const brandRoot = resolveBrandRoot(cwd);
  const channel = options.channel;
  const legacyContext = resolveLegacyContext(channel, options.env || {});
  const fallbackConfig = loadFallbackBrandConfig(brandRoot, channel, legacyContext);

  const paths = {
    rootConfigPath: resolve(brandRoot, 'config.json'),
    commonLocaleDir: resolve(brandRoot, 'common', 'locale'),
    commonAssetsDir: resolve(brandRoot, 'common', 'assets'),
    channelDir: resolve(brandRoot, 'channels', channel),
    channelConfigPath: resolve(brandRoot, 'channels', channel, 'config.json'),
    channelAssetsDir: resolve(brandRoot, 'channels', channel, 'assets'),
    channelCertsDir: resolve(brandRoot, 'channels', channel, 'certs')
  };

  const rootConfig = readJsonIfExists<BrandConfig>(paths.rootConfigPath) || {};
  const channelConfig = readJsonIfExists<BrandConfig>(paths.channelConfigPath) || {};

  const mergedConfig = deepMerge(deepMerge(fallbackConfig, rootConfig), channelConfig) as BrandConfigShape;
  mergedConfig.features.device.qrcodeScanSource = normalizeQrcodeScanSource(
    mergedConfig.features.device.qrcodeScanSource
  );

  return {
    ...mergedConfig,
    meta: {
      channel,
      rootDir: brandRoot,
      paths,
      legacy: legacyContext
    }
  };
}

function normalizeHarmonyConfigPath(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('unpackage/res/')) {
    return `assets/${normalized.slice('unpackage/res/'.length)}`;
  }
  if (normalized.startsWith('assets/')) {
    return normalized;
  }
  return `assets/${normalized.replace(/^\/+/, '')}`;
}

function resolveLegacyContext(
  channel: Channel,
  env: Record<string, string | undefined>
): LegacyContext {
  const base = CHANNEL_TO_CONTEXT[channel];
  const platform = isGenericAppPlatform(env.UNI_UTS_PLATFORM || '')
    ? base.platform
    : normalizePlatform(env.UNI_UTS_PLATFORM || base.platform);
  const edition = normalizeEdition(env.VITE_APP_EDITION || base.edition);

  if (platform === 'mp-weixin') {
    return { platform: 'mp-weixin', edition: 'cn' };
  }

  if (platform === 'app-harmony') {
    return { platform: 'app-harmony', edition: edition === 'intl' ? 'cn' : edition };
  }

  return { platform, edition };
}

function loadFallbackBrandConfig(
  brandRoot: string,
  channel: Channel,
  legacyContext: LegacyContext
): BrandConfig {
  const manifestPath = resolve(brandRoot, 'src', 'manifest.json');
  const themePath = resolve(brandRoot, 'src', 'styles', 'theme.css');
  const manifest = readJsonIfExists<ManifestJson>(manifestPath) || {};
  const legacyAppConfig = getAppConfig(legacyContext.platform, legacyContext.edition);
  const themeTokens = readThemeTokens(themePath);

  return {
    endpoints: {
      baseApiUrl: requiredString(legacyAppConfig.BASE_API_URL),
      armsPid: requiredString(legacyAppConfig.ARMS_PID),
      armsEndpoint: requiredString(legacyAppConfig.ARMS_ENDPOINT),
      armsEnv: legacyAppConfig.ARMS_ENV
    },
    features: {
      login: {
        supportWxMpPhone: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_WX_MP_PHONE),
        supportGuest: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_GUEST),
        supportGuestMp: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_GUEST_MP),
        supportGoogle: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_GOOGLE),
        supportPassword: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_PASSWORD),
        supportWechatOauth: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_WECHAT_OAUTH),
        supportEmail: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_EMAIL),
        supportApple: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_APPLE),
        supportSms: requiredBoolean(legacyAppConfig.SUPPORT_LOGIN_TYPE_SMS)
      },
      device: {
        bleFilterEnabled: requiredBoolean(legacyAppConfig.BLE_FILTER_ENABLED),
        setupMode: legacyAppConfig.APP_SETUP_MODE,
        primarySetupMode: legacyAppConfig.APP_PRIMARY_SETUP_MODE,
        qrcodeScanSource: normalizeQrcodeScanSource(legacyAppConfig.APP_QRCODE_SCAN_SOURCE),
        useVoiceprint: requiredBoolean(legacyAppConfig.APP_USE_VOICEPRINT),
        useVoiceClone: requiredBoolean(legacyAppConfig.APP_USE_VOICE_CLONE)
      }
    },
    legal: {
      termsUrl: requiredString(legacyAppConfig.TERMS_URL),
      privacyUrl: requiredString(legacyAppConfig.PRIVACY_URL),
      feedbackEmail: requiredString(legacyAppConfig.FEEDBACK_EMAIL),
      privacyDescription:
        manifest['app-plus']?.distribute?.ios?.privacyDescription || {}
    },
    ui: {
      showInstructionsTutorials: requiredBoolean(legacyAppConfig.SHOW_INSTRUCTIONS_TUTORIALS),
      profileEntryGroupOrder: requiredStringArray(legacyAppConfig.PROFILE_ENTRY_GROUP_ORDER),
      squareLanguageFilterStyle: normalizeSquareLanguageFilterStyle(
        legacyAppConfig.SQUARE_LANGUAGE_FILTER_STYLE
      )
    },
    thirdParty: {
      google: {
        oauthClientIdWeb: requiredString(legacyAppConfig.GOOGLE_OAUTH_CLIENT_ID_WEB),
        oauthClientIdNative:
          manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.google?.clientid || ''
      },
      weixin: {
        oauthAppId: manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.weixin?.appid || '',
        universalLinks:
          manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.weixin?.UniversalLinks || '',
        mpAppId: manifest['mp-weixin']?.appid || '',
        mpLocationDesc:
          manifest['mp-weixin']?.permission?.['scope.userLocation']?.desc || ''
      },
      apple: {
        universalLinks:
          manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.apple?.UniversalLinks || ''
      }
    },
    identity: {
      dcloudAppId: manifest.appid || '',
      name: buildIdentityNames(manifest),
      description: manifest.description || '',
      versionName: manifest.versionName || '',
      versionCode: manifest.versionCode || 0,
      packageName: '',
      iosBundleId: '',
      harmonyBundleName: manifest['app-harmony']?.distribute?.bundleName || '',
      urlSchemeWhitelist:
        manifest['app-plus']?.distribute?.ios?.urlschemewhitelist || []
    },
    content: {
      manuals: {}
    },
    harmony: {
      icons: {
        foreground: normalizeHarmonyConfigPath(
          manifest['app-harmony']?.distribute?.icons?.foreground
        ),
        background: normalizeHarmonyConfigPath(
          manifest['app-harmony']?.distribute?.icons?.background
        )
      },
      splash: {
        startWindowIcon: normalizeHarmonyConfigPath(
          manifest['app-harmony']?.distribute?.splashScreens?.startWindowIcon
        )
      }
    },
    signing: {
      harmony: {
        profile: '',
        keystore: '',
        material: ''
      }
    },
    platform: {
      appPlus: {
        modules: Object.keys(manifest['app-plus']?.modules || {})
      },
      android: {
        permissions: manifest['app-plus']?.distribute?.android?.permissions || [],
        abiFilters: manifest['app-plus']?.distribute?.android?.abiFilters || [],
        minSdkVersion: manifest['app-plus']?.distribute?.android?.minSdkVersion || 0
      },
      mpWeixin: {
        setting: {
          urlCheck: manifest['mp-weixin']?.setting?.urlCheck ?? false,
          es6: manifest['mp-weixin']?.setting?.es6 ?? false,
          minified: manifest['mp-weixin']?.setting?.minified ?? false
        }
      }
    },
    theme: {
      tokens: themeTokens
    }
  };
}

function buildIdentityNames(manifest: ManifestJson): Record<LocaleCode, string> {
  const defaultName = manifest.name || '';
  const localeNames: Record<LocaleCode, string> = {
    'zh-Hans': defaultName,
    en: defaultName,
    ja: defaultName,
    ko: defaultName,
    ru: defaultName,
    ar: defaultName,
    kk: defaultName,
    th: defaultName,
    es: defaultName,
    fr: defaultName
  };

  for (const [manifestLocale, localeConfig] of Object.entries(manifest['app-plus']?.locales || {})) {
    const locale = MANIFEST_LOCALE_TO_SCHEMA[manifestLocale];
    if (locale && localeConfig.name) {
      localeNames[locale] = localeConfig.name;
    }
  }

  return localeNames;
}

function readThemeTokens(themePath: string): Record<string, string> {
  if (!existsSync(themePath)) {
    return {};
  }

  const fileContent = readFileSync(themePath, 'utf-8');
  const tokenRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  const tokens: Record<string, string> = {};

  for (const match of fileContent.matchAll(tokenRegex)) {
    const [, token, value] = match;
    tokens[token] = value.trim();
  }

  return tokens;
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const fileContent = readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent) as T;
}

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  if (!isRecord(base) || !isRecord(override)) {
    return (override === undefined ? base : override) as T;
  }

  const output: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const baseValue = output[key];
    if (isRecord(baseValue) && isRecord(value)) {
      output[key] = deepMerge(baseValue, value);
      continue;
    }

    if (Array.isArray(value)) {
      output[key] = [...value];
      continue;
    }

    output[key] = value;
  }

  return output as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inferAppliedAppChannel(
  edition: LegacyEdition,
  cwd: string,
  platform?: RuntimePlatform
): Channel | undefined {
  const channelsDir = resolve(cwd, 'channels');
  if (!existsSync(channelsDir)) {
    return undefined;
  }

  const packChannels = CHANNELS.filter((channel) =>
    platform ? channel.startsWith(platform) : channel.startsWith('app-')
  );
  const appliedChannels = packChannels.filter((channel) =>
    existsSync(resolve(channelsDir, channel, 'config.json'))
  );

  if (appliedChannels.length === 1) {
    return appliedChannels[0];
  }

  const editionChannels = appliedChannels.filter((channel) => channel.endsWith(`-${edition}`));
  if (editionChannels.length === 1) {
    return editionChannels[0];
  }

  return undefined;
}

function isGenericAppPlatform(platform: string): boolean {
  const normalized = platform.trim();
  return normalized === 'app' || normalized === 'app-plus';
}

function normalizePlatform(platform: string): RuntimePlatform {
  const normalized = platform.trim() as RuntimePlatform;
  if (
    normalized === 'app-android' ||
    normalized === 'app-ios' ||
    normalized === 'app-harmony' ||
    normalized === 'mp-weixin'
  ) {
    return normalized;
  }
  throw new Error(`Unsupported UNI_UTS_PLATFORM "${platform}"`);
}

function normalizeEdition(edition: string): LegacyEdition {
  const normalized = edition.trim() as LegacyEdition;
  if (normalized === 'cn' || normalized === 'intl' || normalized === 'full') {
    return normalized;
  }
  throw new Error(`Unsupported VITE_APP_EDITION "${edition}"`);
}

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function requiredBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function requiredStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeSquareLanguageFilterStyle(value: unknown): SquareLanguageFilterStyle {
  return value === 'horizontal_bar' ? 'horizontal_bar' : 'navbar';
}

export const ANDROID_QRCODE_ALBUM_PERMISSION_DECLARATIONS = [
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>',
  '<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED"/>',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>'
] as const;

const ANDROID_QRCODE_ALBUM_PERMISSION_NAMES = new Set([
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE'
]);

function normalizeQrcodeScanSource(value: unknown): QrcodeScanSource {
  return value === 'camera_only' ? 'camera_only' : 'camera_and_album';
}

function getAndroidPermissionName(permissionDeclaration: string): string | undefined {
  return permissionDeclaration.match(/android:name="([^"]+)"/)?.[1];
}

export function getEffectiveAppPlusModules(resolvedConfig: ResolvedBrandConfig): string[] {
  if (resolvedConfig.features.device.qrcodeScanSource !== 'camera_only') {
    return [...resolvedConfig.platform.appPlus.modules];
  }

  return resolvedConfig.platform.appPlus.modules.filter((moduleName) => moduleName !== 'Camera');
}

export function getEffectiveAndroidPermissions(resolvedConfig: ResolvedBrandConfig): string[] {
  if (resolvedConfig.features.device.qrcodeScanSource !== 'camera_only') {
    return [...resolvedConfig.platform.android.permissions];
  }

  return resolvedConfig.platform.android.permissions.filter((permissionDeclaration) => {
    const permissionName = getAndroidPermissionName(permissionDeclaration);
    return !permissionName || !ANDROID_QRCODE_ALBUM_PERMISSION_NAMES.has(permissionName);
  });
}

export function getEffectiveAndroidExcludePermissions(
  resolvedConfig: ResolvedBrandConfig
): string[] {
  if (resolvedConfig.features.device.qrcodeScanSource !== 'camera_only') {
    return [];
  }

  return [...ANDROID_QRCODE_ALBUM_PERMISSION_DECLARATIONS];
}

export { SUPPORTED_LOCALES };
