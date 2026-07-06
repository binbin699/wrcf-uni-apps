import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import type { BrandConfigShape, Channel, ManifestJson, ResolvedBrandConfig } from './config.ts';
import {
  getEffectiveAndroidExcludePermissions,
  getEffectiveAndroidPermissions,
  getEffectiveAppPlusModules,
  SUPPORTED_LOCALES
} from './config.ts';

export interface SyncOptions {
  channel: Channel;
  dryRun?: boolean | undefined;
}

const IOS_LOCALE_TO_MANIFEST: Record<string, string> = {
  'zh-Hans': 'zh',
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

const ANDROID_ICON_MAP: Record<string, string> = {
  '72x72.png': 'hdpi',
  '96x96.png': 'xhdpi',
  '144x144.png': 'xxhdpi',
  '192x192.png': 'xxxhdpi'
};

const IOS_ICON_MAP: Record<string, string> = {
  '1024x1024.png': 'appstore',
  '76x76.png': 'ipad.app',
  '152x152.png': 'ipad.app@2x',
  '20x20.png': 'ipad.notification',
  '40x40.png': 'ipad.notification@2x',
  '167x167.png': 'ipad.proapp@2x',
  '29x29.png': 'ipad.settings',
  '58x58.png': 'ipad.settings@2x',
  '80x80.png': 'ipad.spotlight@2x',
  '120x120.png': 'iphone.app@2x',
  '180x180.png': 'iphone.app@3x',
  '60x60.png': 'iphone.notification@3x',
  '87x87.png': 'iphone.settings@3x'
};

export function syncBrandArtifacts(
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions
): string[] {
  const updates: string[] = [];
  syncManifest(resolvedConfig, options, updates);
  syncTheme(resolvedConfig, options, updates);
  syncLocales(resolvedConfig, options, updates);
  syncAssets(resolvedConfig, options, updates);
  return updates;
}

function syncManifest(
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions,
  updates: string[]
): void {
  const manifestPath = resolve(resolvedConfig.meta.rootDir, 'src', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ManifestJson;

  manifest.name = resolvedConfig.identity.name['zh-Hans'] || manifest.name;
  manifest.appid = resolvedConfig.identity.dcloudAppId || manifest.appid;
  manifest.description = resolvedConfig.identity.description || manifest.description;
  manifest.versionName = resolvedConfig.identity.versionName || manifest.versionName;
  manifest.versionCode = resolvedConfig.identity.versionCode || manifest.versionCode;

  manifest['app-plus'] ??= {};
  manifest['app-plus'].modules = toManifestModules(getEffectiveAppPlusModules(resolvedConfig));
  manifest['app-plus'].locales ??= {};
  manifest['app-plus'].distribute ??= {};
  manifest['app-plus'].distribute.android ??= {};
  manifest['app-plus'].distribute.ios ??= {};
  manifest['app-plus'].distribute.sdkConfigs ??= {};
  manifest['app-plus'].distribute.sdkConfigs.oauth ??= {};
  manifest['app-plus'].distribute.sdkConfigs.oauth.google ??= {};
  manifest['app-plus'].distribute.sdkConfigs.oauth.weixin ??= {};

  manifest['app-plus'].distribute.ios.privacyDescription = {
    ...resolvedConfig.legal.privacyDescription
  };
  manifest['app-plus'].distribute.ios.urlschemewhitelist = [
    ...resolvedConfig.identity.urlSchemeWhitelist
  ];
  manifest['app-plus'].distribute.android.permissions = [
    ...getEffectiveAndroidPermissions(resolvedConfig)
  ];
  syncAndroidExcludePermissions(manifest, getEffectiveAndroidExcludePermissions(resolvedConfig));
  manifest['app-plus'].distribute.android.abiFilters = [
    ...resolvedConfig.platform.android.abiFilters
  ];
  manifest['app-plus'].distribute.android.minSdkVersion =
    resolvedConfig.platform.android.minSdkVersion;
  manifest['app-plus'].distribute.sdkConfigs.oauth.google.clientid =
    resolvedConfig.thirdParty.google.oauthClientIdNative;
  manifest['app-plus'].distribute.sdkConfigs.oauth.weixin.appid =
    resolvedConfig.thirdParty.weixin.oauthAppId;
  manifest['app-plus'].distribute.sdkConfigs.oauth.weixin.UniversalLinks =
    resolvedConfig.thirdParty.weixin.universalLinks;
  syncAppleOauthConfig(resolvedConfig, manifest);

  for (const locale of SUPPORTED_LOCALES) {
    const manifestLocale = IOS_LOCALE_TO_MANIFEST[locale];
    manifest['app-plus'].locales[manifestLocale] ??= {};
    manifest['app-plus'].locales[manifestLocale].name = resolvedConfig.identity.name[locale];
  }

  manifest['mp-weixin'] ??= {};
  manifest['mp-weixin'].appid = resolvedConfig.thirdParty.weixin.mpAppId;
  manifest['mp-weixin'].setting = {
    ...resolvedConfig.platform.mpWeixin.setting
  };
  manifest['mp-weixin'].permission ??= {};
  manifest['mp-weixin'].permission['scope.userLocation'] ??= {};
  manifest['mp-weixin'].permission['scope.userLocation'].desc =
    resolvedConfig.thirdParty.weixin.mpLocationDesc;

  if (resolvedConfig.meta.channel.startsWith('app-harmony')) {
    manifest['app-harmony'] ??= {};
    manifest['app-harmony'].distribute ??= {};
    manifest['app-harmony'].distribute.bundleName = resolvedConfig.identity.harmonyBundleName;
    syncHarmonyManifest(resolvedConfig, manifest, updates, options);
  }

  syncManifestIcons(manifest, resolvedConfig, options, updates);
  writeJson(manifestPath, manifest, options, updates, 'manifest');
}

function syncAppleOauthConfig(
  resolvedConfig: ResolvedBrandConfig,
  manifest: ManifestJson
): void {
  const oauth = manifest['app-plus']?.distribute?.sdkConfigs?.oauth;
  if (!oauth) {
    return;
  }

  if (!resolvedConfig.features.login.supportApple) {
    delete oauth.apple;
    return;
  }

  if (!resolvedConfig.thirdParty.apple.universalLinks) {
    throw new Error(
      `${resolvedConfig.meta.channel} 启用 Apple 登录时必须配置 thirdParty.apple.universalLinks`
    );
  }

  oauth.apple ??= {};
  oauth.apple.UniversalLinks = resolvedConfig.thirdParty.apple.universalLinks;
}

function toManifestModules(modules: string[]): Record<string, Record<string, never>> {
  const manifestModules: Record<string, Record<string, never>> = {};
  for (const moduleName of modules) {
    manifestModules[moduleName] = {};
  }
  return manifestModules;
}

function syncAndroidExcludePermissions(
  manifest: ManifestJson,
  excludePermissions: string[]
): void {
  if (excludePermissions.length === 0) {
    delete manifest['app-plus']?.distribute?.android?.excludePermissions;
    delete manifest['app-android']?.distribute?.excludePermissions;
    return;
  }

  manifest['app-plus'] ??= {};
  manifest['app-plus'].distribute ??= {};
  manifest['app-plus'].distribute.android ??= {};
  manifest['app-plus'].distribute.android.excludePermissions = [...excludePermissions];

  manifest['app-android'] ??= {};
  manifest['app-android'].distribute ??= {};
  manifest['app-android'].distribute.excludePermissions = [...excludePermissions];
}

function syncHarmonyManifest(
  resolvedConfig: ResolvedBrandConfig,
  manifest: ManifestJson,
  updates: string[],
  options: SyncOptions
): void {
  const { foreground, background } = resolvedConfig.harmony.icons;
  const { startWindowIcon } = resolvedConfig.harmony.splash;

  if (!foreground && !background && !startWindowIcon) {
    return;
  }

  manifest['app-harmony'] ??= {};
  manifest['app-harmony'].distribute ??= {};

  if (foreground || background) {
    manifest['app-harmony'].distribute.icons ??= {};
    if (foreground) {
      manifest['app-harmony'].distribute.icons.foreground = toHarmonyManifestAssetPath(foreground);
    }
    if (background) {
      manifest['app-harmony'].distribute.icons.background = toHarmonyManifestAssetPath(background);
    }
  }

  if (startWindowIcon) {
    manifest['app-harmony'].distribute.splashScreens ??= {};
    manifest['app-harmony'].distribute.splashScreens.startWindowIcon =
      toHarmonyManifestAssetPath(startWindowIcon);
  }

  updates.push(`harmony manifest <- ${resolvedConfig.meta.channel}${options.dryRun ? ' (dry-run)' : ''}`);
}

function syncManifestIcons(
  manifest: ManifestJson,
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions,
  updates: string[]
): void {
  const iconsDir = resolve(resolvedConfig.meta.paths.channelAssetsDir, 'icons');
  if (!existsSync(iconsDir)) {
    return;
  }

  manifest['app-plus'] ??= {};
  manifest['app-plus'].distribute ??= {};
  manifest['app-plus'].distribute.icons ??= {};
  manifest['app-plus'].distribute.icons.android ??= {};
  manifest['app-plus'].distribute.icons.ios ??= {};
  manifest['app-plus'].distribute.icons.ios.ipad ??= {};
  manifest['app-plus'].distribute.icons.ios.iphone ??= {};

  const files = readdirSync(iconsDir).filter((file) => extname(file) === '.png');
  for (const file of files) {
    const androidKey = ANDROID_ICON_MAP[file];
    if (androidKey) {
      manifest['app-plus'].distribute.icons.android[androidKey] = `unpackage/res/icons/${file}`;
    }

    const iosKey = IOS_ICON_MAP[file];
    if (iosKey) {
      assignNestedIcon(manifest['app-plus'].distribute.icons.ios, iosKey, `unpackage/res/icons/${file}`);
    }
  }

  updates.push(`manifest icons <- ${iconsDir}${options.dryRun ? ' (dry-run)' : ''}`);
}

function syncTheme(
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions,
  updates: string[]
): void {
  const themePath = resolve(resolvedConfig.meta.rootDir, 'src', 'styles', 'theme.css');
  const currentTheme = readFileSync(themePath, 'utf-8');
  const updatedTheme = applyThemeTokens(currentTheme, resolvedConfig.theme.tokens);

  if (updatedTheme !== currentTheme) {
    writeText(themePath, updatedTheme, options, updates, 'theme');
  }
}

function syncLocales(
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions,
  updates: string[]
): void {
  for (const locale of SUPPORTED_LOCALES) {
    const sourcePath = resolve(resolvedConfig.meta.paths.commonLocaleDir, `${locale}.json`);
    const targetPath = resolve(resolvedConfig.meta.rootDir, 'src', 'locale', `${locale}.json`);
    if (!existsSync(targetPath)) {
      continue;
    }

    const targetLocale = JSON.parse(readFileSync(targetPath, 'utf-8')) as Record<string, unknown>;
    const sourceLocale = existsSync(sourcePath)
      ? (JSON.parse(readFileSync(sourcePath, 'utf-8')) as Record<string, unknown>)
      : {};
    const mergedLocale = mergeLocaleRecords(targetLocale, sourceLocale);
    writeJson(targetPath, mergedLocale, options, updates, `locale:${locale}`);
  }
}

function syncAssets(
  resolvedConfig: ResolvedBrandConfig,
  options: SyncOptions,
  updates: string[]
): void {
  copyDirectoryContents(
    resolvedConfig.meta.paths.commonAssetsDir,
    resolve(resolvedConfig.meta.rootDir, 'src', 'static'),
    options,
    updates,
    'common assets'
  );

  const channelAssetsDir = resolvedConfig.meta.paths.channelAssetsDir;
  if (!existsSync(channelAssetsDir)) {
    return;
  }

  const channelFiles = readdirSync(channelAssetsDir);
  for (const entry of channelFiles) {
    const sourcePath = resolve(channelAssetsDir, entry);
    if (entry === 'icons') {
      copyDirectoryContents(
        sourcePath,
        resolve(resolvedConfig.meta.rootDir, 'unpackage', 'res', 'icons'),
        options,
        updates,
        `channel icons:${resolvedConfig.meta.channel}`
      );
      continue;
    }

    const destination = resolve(resolvedConfig.meta.rootDir, 'unpackage', 'res', entry);
    copyFile(sourcePath, destination, options, updates);
  }
}

function applyThemeTokens(themeCss: string, tokens: BrandConfigShape['theme']['tokens']): string {
  let nextTheme = themeCss;
  const missingEntries: string[] = [];

  for (const [token, value] of Object.entries(tokens)) {
    const tokenPattern = new RegExp(`(${escapeRegExp(token)}\\s*:\\s*)([^;]+)(;)`);
    if (tokenPattern.test(nextTheme)) {
      nextTheme = nextTheme.replace(tokenPattern, `$1${value}$3`);
    } else {
      missingEntries.push(`  ${token}: ${value};`);
    }
  }

  if (missingEntries.length === 0) {
    return nextTheme;
  }

  const rootBlockPattern = /(:root,\s*page\s*\{)([\s\S]*?)(\n\})/;
  return nextTheme.replace(rootBlockPattern, (_match, start, body, end) => {
    return `${start}${body}\n${missingEntries.join('\n')}${end}`;
  });
}

function assignNestedIcon(target: Record<string, unknown>, keyPath: string, value: string): void {
  const segments = keyPath.split('.');
  let current: Record<string, unknown> = target;

  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment];
    if (!isRecord(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function copyDirectoryContents(
  sourceDir: string,
  targetDir: string,
  options: SyncOptions,
  updates: string[],
  label: string
): void {
  if (!existsSync(sourceDir)) {
    return;
  }

  mkdirIfNeeded(targetDir, options, updates);
  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = resolve(sourceDir, entry);
    const targetPath = resolve(targetDir, entry);
    copyFile(sourcePath, targetPath, options, updates);
  }
  updates.push(`${label} <- ${sourceDir}${options.dryRun ? ' (dry-run)' : ''}`);
}

function copyFile(
  sourcePath: string,
  targetPath: string,
  options: SyncOptions,
  updates: string[]
): void {
  mkdirIfNeeded(dirname(targetPath), options, updates);
  if (!options.dryRun) {
    copyFileSync(sourcePath, targetPath);
  }
  updates.push(`copy ${sourcePath} -> ${targetPath}${options.dryRun ? ' (dry-run)' : ''}`);
}

function writeJson(
  filePath: string,
  data: unknown,
  options: SyncOptions,
  updates: string[],
  label: string
): void {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`, options, updates, label);
}

function writeText(
  filePath: string,
  data: string,
  options: SyncOptions,
  updates: string[],
  label: string
): void {
  mkdirIfNeeded(dirname(filePath), options, updates);
  if (!options.dryRun) {
    writeFileSync(filePath, data, 'utf-8');
  }
  updates.push(`${label} -> ${filePath}${options.dryRun ? ' (dry-run)' : ''}`);
}

function mkdirIfNeeded(targetDir: string, options: SyncOptions, updates: string[]): void {
  if (existsSync(targetDir)) {
    return;
  }
  if (!options.dryRun) {
    mkdirSync(targetDir, { recursive: true });
  }
  updates.push(`mkdir ${targetDir}${options.dryRun ? ' (dry-run)' : ''}`);
}

function deepMergeRecord(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = output[key];
    if (isRecord(current) && isRecord(value)) {
      output[key] = deepMergeRecord(current, value);
      continue;
    }
    output[key] = value;
  }

  return output;
}

function flattenLocale(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) {
      Object.assign(out, flattenLocale(value, fullKey));
      continue;
    }
    if (typeof value === 'string') {
      out[fullKey] = value;
    }
  }
  return out;
}

function isFlatLocale(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((key) => key.includes('.'));
}

function hasChildFlatKeys(flat: Record<string, string>, prefix: string): boolean {
  const dotPrefix = `${prefix}.`;
  return Object.keys(flat).some((key) => key.startsWith(dotPrefix));
}

function unflattenLocale(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!key.includes('.') && hasChildFlatKeys(flat, key)) {
      continue;
    }
    const parts = key.split('.');
    let current: Record<string, unknown> = root;
    for (let index = 0; index < parts.length - 1; index++) {
      const segment = parts[index];
      const existing = current[segment];
      if (!isRecord(existing)) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return root;
}

/** Flatten both sides, merge overrides, write nested JSON (vue-i18n compatible). */
function mergeLocaleRecords(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const baseFlat = isFlatLocale(base) ? { ...base } : flattenLocale(base);
  const overrideFlat = isFlatLocale(override) ? { ...override } : flattenLocale(override);
  return unflattenLocale({ ...baseFlat, ...overrideFlat } as Record<string, string>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toHarmonyManifestAssetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^assets[\\/]/, '').replace(/\\/g, '/');
  return `unpackage/res/${normalized}`;
}
