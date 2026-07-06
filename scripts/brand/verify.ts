import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getEffectiveAndroidExcludePermissions,
  getEffectiveAndroidPermissions,
  getEffectiveAppPlusModules,
  loadBrandConfig,
  resolveChannel,
  type Channel,
  type ManifestJson
} from './lib/config.ts';

interface VerifyArgs {
  channel: Channel;
}

function parseArgs(argv: string[]): VerifyArgs {
  let channelValue = process.env.CHANNEL;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--channel' && argv[index + 1]) {
      channelValue = argv[index + 1];
      index += 1;
    }
  }

  const channel = resolveChannel({
    ...process.env,
    CHANNEL: channelValue
  });

  return { channel };
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function deepGet(record: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = record;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function readJsonRecord(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, 'utf-8').trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

function flattenLocaleRecord(
  value: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(out, flattenLocaleRecord(child as Record<string, unknown>, fullKey));
      continue;
    }
    if (typeof child === 'string') {
      out[fullKey] = child;
    }
  }
  return out;
}

function hasChildFlatKeys(flat: Record<string, string>, prefix: string): boolean {
  const dotPrefix = `${prefix}.`;
  return Object.keys(flat).some((key) => key.startsWith(dotPrefix));
}

function collectLeafEntries(
  value: Record<string, unknown>,
  prefix: string[] = []
): Array<{ path: string[]; value: unknown }> {
  if (prefix.length === 0 && Object.keys(value).some((key) => key.includes('.'))) {
    const flat = flattenLocaleRecord(value);
    return Object.entries(flat)
      .filter(([key]) => !hasChildFlatKeys(flat, key))
      .map(([key, leafValue]) => ({
        path: key.split('.'),
        value: leafValue
      }));
  }

  const entries: Array<{ path: string[]; value: unknown }> = [];

  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...prefix, key];
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      entries.push(...collectLeafEntries(child as Record<string, unknown>, nextPath));
      continue;
    }
    entries.push({ path: nextPath, value: child });
  }

  return entries;
}

function verifyManifest(channel: Channel, rootDir: string, resolvedConfig: ReturnType<typeof loadBrandConfig>): void {
  const manifestPath = resolve(rootDir, 'src', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ManifestJson;

  assert(manifest.appid === resolvedConfig.identity.dcloudAppId, 'manifest appid mismatch');
  assert(manifest.versionName === resolvedConfig.identity.versionName, 'manifest versionName mismatch');
  assert(manifest.versionCode === resolvedConfig.identity.versionCode, 'manifest versionCode mismatch');
  assert(
    manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.google?.clientid ===
      resolvedConfig.thirdParty.google.oauthClientIdNative,
    'manifest google clientid mismatch'
  );
  assert(
    manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.weixin?.appid ===
      resolvedConfig.thirdParty.weixin.oauthAppId,
    'manifest weixin appid mismatch'
  );
  if (resolvedConfig.features.login.supportApple) {
    assert(
      manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.apple?.UniversalLinks ===
        resolvedConfig.thirdParty.apple.universalLinks,
      'manifest apple UniversalLinks mismatch'
    );
  } else {
    assert(!manifest['app-plus']?.distribute?.sdkConfigs?.oauth?.apple, 'manifest apple oauth should be absent');
  }
  assert(
    manifest['app-plus']?.distribute?.ios?.urlschemewhitelist?.join(',') ===
      resolvedConfig.identity.urlSchemeWhitelist.join(','),
    'manifest urlschemewhitelist mismatch'
  );
  assert(
    Object.keys(manifest['app-plus']?.modules || {}).join(',') ===
      getEffectiveAppPlusModules(resolvedConfig).join(','),
    'manifest app-plus modules mismatch'
  );
  assert(
    (manifest['app-plus']?.distribute?.android?.permissions || []).join('\n') ===
      getEffectiveAndroidPermissions(resolvedConfig).join('\n'),
    'manifest android permissions mismatch'
  );
  assert(
    (manifest['app-plus']?.distribute?.android?.excludePermissions || []).join('\n') ===
      getEffectiveAndroidExcludePermissions(resolvedConfig).join('\n'),
    'manifest android excludePermissions mismatch'
  );
  assert(
    (manifest['app-android']?.distribute?.excludePermissions || []).join('\n') ===
      getEffectiveAndroidExcludePermissions(resolvedConfig).join('\n'),
    'manifest app-android excludePermissions mismatch'
  );
  assert(
    (manifest['app-plus']?.distribute?.android?.abiFilters || []).join(',') ===
      resolvedConfig.platform.android.abiFilters.join(','),
    'manifest android abiFilters mismatch'
  );
  assert(
    manifest['app-plus']?.distribute?.android?.minSdkVersion ===
      resolvedConfig.platform.android.minSdkVersion,
    'manifest android minSdkVersion mismatch'
  );
  assert(
    manifest['mp-weixin']?.setting?.urlCheck === resolvedConfig.platform.mpWeixin.setting.urlCheck,
    'mp-weixin setting urlCheck mismatch'
  );
  assert(
    manifest['mp-weixin']?.setting?.es6 === resolvedConfig.platform.mpWeixin.setting.es6,
    'mp-weixin setting es6 mismatch'
  );
  assert(
    manifest['mp-weixin']?.setting?.minified === resolvedConfig.platform.mpWeixin.setting.minified,
    'mp-weixin setting minified mismatch'
  );

  if (channel === 'mp-weixin-cn') {
    assert(manifest['mp-weixin']?.appid === resolvedConfig.thirdParty.weixin.mpAppId, 'mp-weixin appid mismatch');
    assert(
      manifest['mp-weixin']?.permission?.['scope.userLocation']?.desc === resolvedConfig.thirdParty.weixin.mpLocationDesc,
      'mp-weixin location desc mismatch'
    );
  }

}

function verifyTheme(rootDir: string, resolvedConfig: ReturnType<typeof loadBrandConfig>): void {
  const themeContent = readFileSync(resolve(rootDir, 'src', 'styles', 'theme.css'), 'utf-8');
  for (const [token, value] of Object.entries(resolvedConfig.theme.tokens)) {
    assert(themeContent.includes(`${token}: ${value};`), `theme token mismatch: ${token}`);
  }
}

function verifyLocales(rootDir: string): void {
  const sourceDir = resolve(rootDir, 'common', 'locale');
  for (const file of readdirSync(sourceDir)) {
    const sourcePath = resolve(sourceDir, file);
    const targetPath = resolve(rootDir, 'src', 'locale', file);
    if (!existsSync(targetPath)) {
      continue;
    }
    const sourceLocale = readJsonRecord(sourcePath);
    const targetLocale = readJsonRecord(targetPath);
    for (const entry of collectLeafEntries(sourceLocale)) {
      assert(
        deepGet(targetLocale, entry.path) === entry.value,
        `locale override mismatch: ${file} -> ${entry.path.join('.')}`
      );
    }
  }
}

function verifyAssets(rootDir: string, channel: Channel): void {
  const commonAssetsDir = resolve(rootDir, 'common', 'assets');
  const targetStaticDir = resolve(rootDir, 'src', 'static');
  for (const file of readdirSync(commonAssetsDir)) {
    const sourcePath = resolve(commonAssetsDir, file);
    const targetPath = resolve(targetStaticDir, file);
    assert(existsSync(targetPath), `missing synced common asset: ${file}`);
    assert(statSync(sourcePath).size === statSync(targetPath).size, `common asset size mismatch: ${file}`);
  }

  const channelIconsDir = resolve(rootDir, 'channels', channel, 'assets', 'icons');
  if (!existsSync(channelIconsDir)) {
    return;
  }

  const targetIconsDir = resolve(rootDir, 'unpackage', 'res', 'icons');
  for (const file of readdirSync(channelIconsDir)) {
    const sourcePath = resolve(channelIconsDir, file);
    const targetPath = resolve(targetIconsDir, file);
    assert(existsSync(targetPath), `missing synced icon: ${file}`);
    assert(statSync(sourcePath).size === statSync(targetPath).size, `icon size mismatch: ${file}`);
  }

}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const resolvedConfig = loadBrandConfig({
    channel: args.channel,
    cwd: rootDir,
    env: {
      ...process.env,
      CHANNEL: args.channel
    }
  });

  verifyManifest(args.channel, rootDir, resolvedConfig);
  verifyTheme(rootDir, resolvedConfig);
  verifyLocales(rootDir);
  verifyAssets(rootDir, args.channel);

  console.log(`[brand-verify] channel=${args.channel} passed`);
}

main();

function toHarmonyManifestAssetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^assets[\\/]/, '').replace(/\\/g, '/');
  return `unpackage/res/${normalized}`;
}
