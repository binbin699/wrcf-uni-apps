import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { BrandConfig, Channel, SquareLanguageFilterStyle } from '../brand/lib/config.ts';
import { loadBrandConfig } from '../brand/lib/config.ts';
import {
  getRequiredIconSizes,
  getConfigValue,
  isMissingRequiredValue,
  isAllowedChannelField,
  isChannel,
  isChannelOnlyField,
  isRootOnlyField,
  listLeafPaths,
  COMMON_REQUIRED_ASSET_FILES,
  COMMON_REQUIRED_SUBDIRS,
  REQUIRED_OBJECT_FIELDS,
  REQUIRED_FIELDS,
  SUPPORTED_CHANNELS,
  validateIconFilename
} from './rules.ts';

const SQUARE_LANGUAGE_FILTER_STYLES = new Set<SquareLanguageFilterStyle>(['navbar', 'horizontal_bar']);

interface ValidateArgs {
  input: string;
  channel?: Channel | undefined;
}

interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  resolvedRoot: string;
}

export const PROFILE_ENTRY_GROUP_IDS = [
  'device_management',
  'qrcode_setup',
  'bluetooth_setup',
  'voice',
  'instructions_tutorials',
  'legal',
  'feedback'
] as const;

export type ProfileEntryGroupId = (typeof PROFILE_ENTRY_GROUP_IDS)[number];

export function parseValidateArgs(argv: string[]): ValidateArgs {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const input = normalizedArgv[0];
  if (!input) {
    throw new Error(
      'Missing required input. Usage: pnpm run config:validate -- <config-dir-or-zip> [--channel <channel>]\n' +
        '（--channel 可选：省略时先校验 channels/ 下已存在的合法目录；若一个都没有则对全部支持的 channel 做合并校验）'
    );
  }

  let channel: Channel | undefined;
  for (let index = 1; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === '--channel' && normalizedArgv[index + 1]) {
      const candidate = normalizedArgv[index + 1];
      if (!isChannel(candidate)) {
        throw new Error(`Invalid channel: ${candidate}`);
      }
      channel = candidate;
      index += 1;
    }
  }

  return { input, channel };
}

export function validateConfigPackage(inputPath: string, channel?: Channel): ValidationResult {
  const issues: ValidationIssue[] = [];
  const context = resolveInputToDir(inputPath);

  try {
    validateDirectoryStructure(context.configRoot, issues);
    const rootConfig = readJsonIfExists<BrandConfig>(resolve(context.configRoot, 'config.json'));
    if (!rootConfig) {
      issues.push(issue('E_ROOT_CONFIG_MISSING', 'config.json', '缺少根配置文件 config.json'));
    }

    validateCommonLayer(context.configRoot, rootConfig, issues);
    validateRootLayer(rootConfig, issues);
    validateChannelsLayer(context.configRoot, issues);
    validateResourceFiles(context.configRoot, issues);
    validateConditionalRules(context.configRoot, rootConfig, channel, issues);

    return {
      ok: issues.length === 0,
      issues,
      resolvedRoot: context.configRoot
    };
  } finally {
    if (context.cleanup) {
      context.cleanup();
    }
  }
}

function validateDirectoryStructure(configRoot: string, issues: ValidationIssue[]): void {
  const requiredPaths = ['config.json', 'common', 'channels'];
  for (const relativePath of requiredPaths) {
    const abs = resolve(configRoot, relativePath);
    if (!existsSync(abs)) {
      issues.push(issue('E_STRUCTURE_MISSING', relativePath, `缺少目录或文件: ${relativePath}`));
    }
  }
}

function validateCommonLayer(configRoot: string, rootConfig: BrandConfig | null, issues: ValidationIssue[]): void {
  const commonRoot = resolve(configRoot, 'common');
  if (!existsSync(commonRoot)) {
    return;
  }

  for (const sub of COMMON_REQUIRED_SUBDIRS) {
    const abs = resolve(commonRoot, sub);
    if (!existsSync(abs)) {
      issues.push(issue('E_COMMON_STRUCTURE', `common/${sub}`, `缺少 common 子目录: common/${sub}`));
    } else if (!statSync(abs).isDirectory()) {
      issues.push(issue('E_COMMON_STRUCTURE', `common/${sub}`, `common/${sub} 必须为目录`));
    }
  }

  const optionalThemeDir = resolve(commonRoot, 'theme');
  if (existsSync(optionalThemeDir) && !statSync(optionalThemeDir).isDirectory()) {
    issues.push(issue('E_COMMON_STRUCTURE', 'common/theme', 'common/theme 必须为目录'));
  }

  const assetsDir = resolve(commonRoot, 'assets');
  if (existsSync(assetsDir) && statSync(assetsDir).isDirectory()) {
    for (const fileName of COMMON_REQUIRED_ASSET_FILES) {
      const assetPath = resolve(assetsDir, fileName);
      if (!existsSync(assetPath)) {
        issues.push(
          issue('E_COMMON_ASSET_MISSING', `common/assets/${fileName}`, `缺少常用资源: common/assets/${fileName}`)
        );
      }
    }
  }

  const referencedCommonPaths = new Set<string>();
  if (rootConfig) {
    collectCommonPathStringValues(rootConfig as Record<string, unknown>, referencedCommonPaths);
  }
  const channelsDir = resolve(configRoot, 'channels');
  if (existsSync(channelsDir)) {
    for (const dirName of readdirSync(channelsDir)) {
      if (isIgnoredFilesystemEntry(dirName)) {
        continue;
      }
      if (!isChannel(dirName)) {
        continue;
      }
      const channelConfig = readJsonIfExists<BrandConfig>(resolve(channelsDir, dirName, 'config.json'));
      if (channelConfig) {
        collectCommonPathStringValues(channelConfig as Record<string, unknown>, referencedCommonPaths);
      }
    }
  }
  for (const ref of referencedCommonPaths) {
    const abs = resolve(configRoot, ref);
    if (!existsSync(abs)) {
      issues.push(issue('E_COMMON_REF_MISSING', ref, `config 引用的 common 路径不存在: ${ref}`));
    }
  }
}

function collectCommonPathStringValues(input: Record<string, unknown>, out: Set<string>): void {
  for (const value of Object.values(input)) {
    if (typeof value === 'string') {
      maybeAddCommonReference(value, out);
      continue;
    }
    if (!value || typeof value !== 'object') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          maybeAddCommonReference(item, out);
        } else if (item && typeof item === 'object' && !Array.isArray(item)) {
          collectCommonPathStringValues(item as Record<string, unknown>, out);
        }
      }
      continue;
    }
    collectCommonPathStringValues(value as Record<string, unknown>, out);
  }
}

function maybeAddCommonReference(raw: string, out: Set<string>): void {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('common/') && !trimmed.startsWith('common\\')) {
    return;
  }
  out.add(trimmed.replace(/\\/g, '/'));
}

function validateRootLayer(rootConfig: BrandConfig | null, issues: ValidationIssue[]): void {
  if (!rootConfig) {
    return;
  }
  const leafPaths = listLeafPaths(rootConfig as Record<string, unknown>);
  for (const path of leafPaths) {
    if (path.startsWith('theme.tokens.')) {
      continue;
    }
    if (isChannelOnlyField(path)) {
      issues.push(
        issue(
          'E_SCHEMA_LAYER',
          `config.json:${path}`,
          'channel 专属字段必须放在 channels/<channel>/config.json'
        )
      );
      continue;
    }
    if (!isRootOnlyField(path) && !isAllowedChannelField(path)) {
      issues.push(issue('E_SCHEMA_UNKNOWN_FIELD', `config.json:${path}`, `字段未在 schema 允许列表中: ${path}`));
    }
  }
  validateProfileEntryGroupOrder(rootConfig, 'config.json', issues);
}

function validateChannelsLayer(configRoot: string, issues: ValidationIssue[]): void {
  const channelsDir = resolve(configRoot, 'channels');
  if (!existsSync(channelsDir)) {
    return;
  }

  for (const dirName of readdirSync(channelsDir)) {
    if (isIgnoredFilesystemEntry(dirName)) {
      continue;
    }
    const channelPath = resolve(channelsDir, dirName);
    if (!isChannel(dirName)) {
      issues.push(issue('E_CHANNEL_NAME', `channels/${dirName}`, `不支持的 channel: ${dirName}`));
      continue;
    }

    const channelConfigPath = resolve(channelPath, 'config.json');
    const channelConfig = readJsonIfExists<BrandConfig>(channelConfigPath);
    if (!channelConfig) {
      continue;
    }

    const leafPaths = listLeafPaths(channelConfig as Record<string, unknown>);
    for (const leafPath of leafPaths) {
      if (isRootOnlyField(leafPath)) {
        issues.push(issue('E_SCHEMA_LAYER', `channels/${dirName}/config.json:${leafPath}`, '根专属字段不能在 channel 配置中出现'));
        continue;
      }
      if (!isAllowedChannelField(leafPath)) {
        issues.push(issue('E_SCHEMA_UNKNOWN_FIELD', `channels/${dirName}/config.json:${leafPath}`, `字段不允许出现在 channel 配置中: ${leafPath}`));
      }
    }
    validateProfileEntryGroupOrder(channelConfig, `channels/${dirName}/config.json`, issues);
  }
}

function validateResourceFiles(configRoot: string, issues: ValidationIssue[]): void {
  const channelsDir = resolve(configRoot, 'channels');
  if (!existsSync(channelsDir)) {
    return;
  }

  for (const dirName of readdirSync(channelsDir)) {
    if (isIgnoredFilesystemEntry(dirName)) {
      continue;
    }
    if (!isChannel(dirName)) {
      continue;
    }
    const channel = dirName;
    const iconsDir = resolve(channelsDir, channel, 'assets', 'icons');
    if (existsSync(iconsDir)) {
      const iconSizes = new Set<string>();
      for (const fileName of readdirSync(iconsDir)) {
        if (isIgnoredFilesystemEntry(fileName)) {
          continue;
        }
        const invalid = validateIconFilename(channel, fileName);
        if (invalid) {
          issues.push(issue('E_ICON_RULE', `channels/${channel}/assets/icons/${fileName}`, invalid));
        }
        if (fileName.endsWith('.png')) {
          iconSizes.add(fileName.replace(/\.png$/, ''));
        }
      }
      const requiredSizes = getRequiredIconSizes(channel);
      for (const size of requiredSizes) {
        if (!iconSizes.has(size)) {
          issues.push(issue('E_ICON_RULE', `channels/${channel}/assets/icons/${size}.png`, `缺少必需 icon 尺寸: ${size}.png`));
        }
      }
    }
  }
}

function resolveChannelsForValidation(configRoot: string, inputChannel: Channel | undefined): Channel[] {
  if (inputChannel) {
    return [inputChannel];
  }
  const present = collectChannels(configRoot);
  if (present.length > 0) {
    return present;
  }
  return [...SUPPORTED_CHANNELS];
}

function validateConditionalRules(
  configRoot: string,
  rootConfig: BrandConfig | null,
  inputChannel: Channel | undefined,
  issues: ValidationIssue[]
): void {
  const channels = resolveChannelsForValidation(configRoot, inputChannel);
  if (channels.length === 0 || !rootConfig) {
    return;
  }

  for (const channel of channels) {
    let resolved: ReturnType<typeof loadBrandConfig>;
    try {
      resolved = loadBrandConfig({
        channel,
        cwd: configRoot,
        env: {
          ...process.env,
          CHANNEL: channel
        }
      });
    } catch (error) {
      issues.push(issue('E_CONFIG_RESOLVE', `channels/${channel}`, `配置合并失败: ${(error as Error).message}`));
      continue;
    }

    if (resolved.features.login.supportGoogle) {
      if (!resolved.thirdParty.google.oauthClientIdWeb) {
        issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, '启用 Google 登录时必须配置 thirdParty.google.oauthClientIdWeb'));
      }
      if (channel.startsWith('app-android') && !resolved.thirdParty.google.oauthClientIdNative) {
        issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'app-android 渠道启用 Google 登录时必须配置 thirdParty.google.oauthClientIdNative'));
      }
    }

    if (channel.startsWith('app-ios') && resolved.features.login.supportApple && !resolved.thirdParty.apple.universalLinks) {
      issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'app-ios 渠道启用 Apple 登录时必须配置 thirdParty.apple.universalLinks'));
    }

    if (channel.startsWith('app-android') && !resolved.identity.packageName) {
      issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'app-android 渠道必须配置 identity.packageName'));
    }
    if (channel.startsWith('app-ios') && !resolved.identity.iosBundleId) {
      issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'app-ios 渠道必须配置 identity.iosBundleId'));
    }
    if (channel.startsWith('app-harmony') && !resolved.identity.harmonyBundleName) {
      issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'app-harmony 渠道必须配置 identity.harmonyBundleName'));
    }
    if (channel.startsWith('mp-weixin')) {
      if (!resolved.thirdParty.weixin.mpAppId) {
        issues.push(issue('E_CONDITIONAL_REQUIRED', `channels/${channel}`, 'mp-weixin 渠道必须配置 thirdParty.weixin.mpAppId'));
      }
    }

    validateRequiredRules(channel, resolved, issues);

    const langFilterStyle = resolved.ui.squareLanguageFilterStyle;
    if (!SQUARE_LANGUAGE_FILTER_STYLES.has(langFilterStyle)) {
      issues.push(
        issue(
          'E_INVALID_VALUE',
          `channels/${channel}:ui.squareLanguageFilterStyle`,
          `ui.squareLanguageFilterStyle 必须为 navbar 或 horizontal_bar，当前为: ${String(langFilterStyle)}`
        )
      );
    }

    validateSigningFileReference(configRoot, channel, resolved, issues);
  }
}

function validateRequiredRules(
  channel: Channel,
  resolved: ReturnType<typeof loadBrandConfig>,
  issues: ValidationIssue[]
): void {
  for (const fieldPath of REQUIRED_FIELDS) {
    const value = getConfigValue(resolved, fieldPath);
    if (isMissingRequiredValue(value)) {
      issues.push(issue('E_REQUIRED_FIELD_MISSING', `channels/${channel}:${fieldPath}`, `必填字段缺失: ${fieldPath}`));
    }
  }
  for (const [objectPath, requiredKeys] of Object.entries(REQUIRED_OBJECT_FIELDS)) {
    const objectValue = getConfigValue(resolved, objectPath);
    if (!objectValue || typeof objectValue !== 'object' || Array.isArray(objectValue)) {
      issues.push(
        issue(
          'E_REQUIRED_FIELD_MISSING',
          `channels/${channel}:${objectPath}`,
          `必填对象缺失: ${objectPath}`
        )
      );
      continue;
    }
    const typedObject = objectValue as Record<string, unknown>;
    for (const key of requiredKeys) {
      const keyValue = typedObject[key];
      if (isMissingRequiredValue(keyValue)) {
        issues.push(
          issue(
            'E_REQUIRED_FIELD_MISSING',
            `channels/${channel}:${objectPath}.${key}`,
            `必填字段缺失: ${objectPath}.${key}`
          )
        );
      }
    }
  }
}

function validateSigningFileReference(
  configRoot: string,
  channel: Channel,
  resolved: ReturnType<typeof loadBrandConfig>,
  issues: ValidationIssue[]
): void {
  if (!channel.startsWith('app-harmony')) {
    return;
  }

  const values = [
    resolved.signing.harmony.profile,
    resolved.signing.harmony.keystore,
    resolved.signing.harmony.material
  ].filter(Boolean);

  for (const relativePath of values) {
    const sourcePath = resolve(configRoot, 'channels', channel, relativePath);
    if (!existsSync(sourcePath)) {
      issues.push(issue('E_SIGNING_FILE_MISSING', `channels/${channel}/${relativePath}`, 'signing.harmony 指向的文件不存在'));
    }
  }
}

function collectChannels(configRoot: string): Channel[] {
  const channelsDir = resolve(configRoot, 'channels');
  if (!existsSync(channelsDir)) {
    return [];
  }
  return readdirSync(channelsDir).filter(
    (item): item is Channel => !isIgnoredFilesystemEntry(item) && isChannel(item)
  );
}

function isIgnoredFilesystemEntry(name: string): boolean {
  return name.startsWith('.');
}

function validateProfileEntryGroupOrder(
  config: BrandConfig,
  configPath: string,
  issues: ValidationIssue[]
): void {
  const value = config.ui?.profileEntryGroupOrder;
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push(
      issue(
        'E_SCHEMA_INVALID_VALUE',
        `${configPath}:ui.profileEntryGroupOrder`,
        'ui.profileEntryGroupOrder 必须为字符串数组'
      )
    );
    return;
  }

  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const itemPath = `${configPath}:ui.profileEntryGroupOrder[${index}]`;
    if (typeof item !== 'string') {
      issues.push(issue('E_SCHEMA_INVALID_VALUE', itemPath, 'group id 必须为字符串'));
      continue;
    }
    if (!isProfileEntryGroupId(item)) {
      issues.push(
        issue(
          'E_SCHEMA_INVALID_VALUE',
          itemPath,
          `不支持的 group id: ${item}`
        )
      );
      continue;
    }
    if (seen.has(item)) {
      issues.push(issue('E_SCHEMA_INVALID_VALUE', itemPath, `group id 重复: ${item}`));
      continue;
    }
    seen.add(item);
  }
}

function isProfileEntryGroupId(value: string): value is ProfileEntryGroupId {
  return (PROFILE_ENTRY_GROUP_IDS as readonly string[]).includes(value);
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const content = readFileSync(filePath, 'utf-8').trim();
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
}

function resolveInputToDir(inputPath: string): { configRoot: string; cleanup?: (() => void) | undefined } {
  const absoluteInput = resolve(process.cwd(), inputPath);
  if (!existsSync(absoluteInput)) {
    throw new Error(`Input not found: ${absoluteInput}`);
  }

  if (absoluteInput.endsWith('.zip')) {
    const tempDir = mkdtempSync(resolve(tmpdir(), 'linx-config-'));
    const unzipResult = spawnSync('unzip', ['-q', absoluteInput, '-d', tempDir], {
      stdio: 'pipe'
    });
    if (unzipResult.status !== 0) {
      throw new Error(`Unzip failed: ${unzipResult.stderr.toString('utf-8')}`);
    }
    const nestedRoot = resolve(tempDir, basename(absoluteInput, '.zip'));
    const configRoot = existsSync(resolve(nestedRoot, 'config.json')) ? nestedRoot : tempDir;
    return {
      configRoot,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true })
    };
  }

  return { configRoot: absoluteInput };
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function printResult(result: ValidationResult): void {
  if (result.ok) {
    console.log(`[config-validate] OK ${result.resolvedRoot}`);
    return;
  }

  console.error(`[config-validate] FAILED ${result.resolvedRoot}`);
  for (const item of result.issues) {
    console.error(`- [${item.code}] ${item.path} -> ${item.message}`);
  }
}

function main(): void {
  const args = parseValidateArgs(process.argv.slice(2));
  const result = validateConfigPackage(args.input, args.channel);
  printResult(result);
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main();
}

export type { ValidationIssue, ValidationResult };
