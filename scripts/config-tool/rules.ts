import { CHANNELS, SUPPORTED_LOCALES, type BrandConfig, type Channel } from '../brand/lib/config.ts';

export const SUPPORTED_CHANNELS: readonly Channel[] = CHANNELS;
export const REQUIRED_FIELDS = ['endpoints.baseApiUrl', 'identity.dcloudAppId'] as const;

export const COMMON_REQUIRED_SUBDIRS = ['assets', 'locale'] as const;

export const COMMON_REQUIRED_ASSET_FILES = ['logo.png'] as const;
export const REQUIRED_OBJECT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  'identity.name': SUPPORTED_LOCALES
};

export const ROOT_ONLY_PATHS = new Set<string>([
  'endpoints.armsPid',
  'endpoints.armsEndpoint',
  'endpoints.armsEnv',
  'identity.dcloudAppId',
  'identity.description',
  'identity.urlSchemeWhitelist',
  'theme.tokens'
]);

export const CHANNEL_ONLY_PATHS = new Set<string>([
  'thirdParty.weixin.mpAppId',
  'thirdParty.weixin.mpLocationDesc',
  'thirdParty.apple.universalLinks',
  'identity.packageName',
  'identity.iosBundleId',
  'identity.harmonyBundleName',
  'harmony.icons.foreground',
  'harmony.icons.background',
  'harmony.splash.startWindowIcon',
  'signing.harmony.profile',
  'signing.harmony.keystore',
  'signing.harmony.material'
]);

export const CHANNEL_OVERRIDE_PATH_PREFIXES = [
  'endpoints.baseApiUrl',
  'features.login',
  'features.device',
  'legal',
  'ui.showInstructionsTutorials',
  'ui.profileEntryGroupOrder',
  'ui.squareLanguageFilterStyle',
  'thirdParty.google',
  'thirdParty.weixin.oauthAppId',
  'thirdParty.weixin.universalLinks',
  'identity.name',
  'identity.versionName',
  'identity.versionCode',
  'content',
  'platform'
] as const;

const REQUIRED_ANDROID_ICON_SIZES = new Set(['72x72', '96x96', '144x144', '192x192']);
const REQUIRED_IOS_ICON_SIZES = new Set([
  '20x20',
  '29x29',
  '40x40',
  '58x58',
  '60x60',
  '76x76',
  '80x80',
  '87x87',
  '120x120',
  '152x152',
  '167x167',
  '180x180',
  '1024x1024'
]);

export function isChannel(value: string): value is Channel {
  return (SUPPORTED_CHANNELS as readonly string[]).includes(value);
}

export function isAllowedChannelField(path: string): boolean {
  if (CHANNEL_ONLY_PATHS.has(path)) {
    return true;
  }
  return CHANNEL_OVERRIDE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}.`));
}

export function isChannelOnlyField(path: string): boolean {
  return CHANNEL_ONLY_PATHS.has(path);
}

export function isRootOnlyField(path: string): boolean {
  return ROOT_ONLY_PATHS.has(path);
}

export function listLeafPaths(input: Record<string, unknown>, prefix: string[] = []): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    const current = [...prefix, key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...listLeafPaths(value as Record<string, unknown>, current));
      continue;
    }
    paths.push(current.join('.'));
  }
  return paths;
}

export function getConfigValue(config: BrandConfig, path: string): unknown {
  let current: unknown = config;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function isMissingRequiredValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

export function validateIconFilename(channel: Channel, fileName: string): string | null {
  if (!fileName.endsWith('.png')) {
    return `icons 文件仅支持 .png: ${fileName}`;
  }
  return null;
}

export function getRequiredIconSizes(channel: Channel): Set<string> {
  if (channel.startsWith('app-android')) {
    return REQUIRED_ANDROID_ICON_SIZES;
  }
  if (channel.startsWith('app-ios')) {
    return REQUIRED_IOS_ICON_SIZES;
  }
  return new Set<string>();
}
