import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { type Channel, isChannel, loadBrandConfig } from '../brand/lib/config.ts';
import { syncBrandArtifacts } from '../brand/lib/sync.ts';
import { validateConfigPackage } from './validate.ts';

interface ApplyArgs {
  input: string;
  channel: Channel;
  backupDir?: string | undefined;
  force: boolean;
}

function parseApplyArgs(argv: string[]): ApplyArgs {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const input = normalizedArgv[0];
  if (!input) {
    throw new Error('Missing required input. Usage: pnpm run config:apply -- <config-dir-or-zip> --channel <channel>');
  }

  let channelValue = process.env.CHANNEL;
  let backupDir: string | undefined;
  let force = false;
  for (let index = 1; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === '--force') {
      force = true;
      continue;
    }
    if (arg === '--channel' && normalizedArgv[index + 1]) {
      channelValue = normalizedArgv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--backup-dir' && normalizedArgv[index + 1]) {
      backupDir = normalizedArgv[index + 1];
      index += 1;
    }
  }

  if (!channelValue || !isChannel(channelValue)) {
    throw new Error('Missing or invalid --channel');
  }

  return {
    input,
    channel: channelValue,
    backupDir,
    force
  };
}

function main(): void {
  const args = parseApplyArgs(process.argv.slice(2));
  const sourceContext = resolveInputToDir(args.input);
  const workspaceRoot = process.cwd();
  const backupRoot = args.backupDir
    ? resolve(workspaceRoot, args.backupDir)
    : resolve(workspaceRoot, '.linx-config', 'backups', Date.now().toString());
  const backupSnapshotDir = resolve(backupRoot, 'snapshot');

  try {
    const validation = validateConfigPackage(sourceContext.configRoot, args.channel);
    if (!validation.ok) {
      throw new Error(
        `配置校验失败:\n${validation.issues
          .map((item) => `- [${item.code}] ${item.path}: ${item.message}`)
          .join('\n')}`
      );
    }

    assertControlledOutputsClean(workspaceRoot, args.force);
    createBackup(workspaceRoot, backupSnapshotDir);
    applyConfigSource(sourceContext.configRoot, workspaceRoot, args.channel);
    resetControlledOutputsFromHead(workspaceRoot);

    const resolvedConfig = loadBrandConfig({
      channel: args.channel,
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CHANNEL: args.channel
      }
    });

    const updates = syncBrandArtifacts(resolvedConfig, {
      channel: args.channel
    });
    updates.forEach((line) => console.log(`[config-apply] ${line}`));

    runBrandVerify(workspaceRoot, args.channel);
    console.log(`[config-apply] success channel=${args.channel}`);
    console.log(`[config-apply] backup=${backupRoot}`);
  } catch (error) {
    if (existsSync(backupSnapshotDir)) {
      restoreBackup(workspaceRoot, backupSnapshotDir);
      console.error('[config-apply] apply 失败，已回滚到备份快照');
    }
    throw error;
  } finally {
    if (sourceContext.cleanup) {
      sourceContext.cleanup();
    }
  }
}

function createBackup(workspaceRoot: string, backupSnapshotDir: string): void {
  const backupTargets = [
    'config.json',
    'common',
    'channels',
    'src/manifest.json',
    'src/styles/theme.css',
    'src/locale',
    'src/static',
    'unpackage/res'
  ];

  mkdirSync(backupSnapshotDir, { recursive: true });
  for (const relativePath of backupTargets) {
    const sourcePath = resolve(workspaceRoot, relativePath);
    if (!existsSync(sourcePath)) {
      continue;
    }
    const backupPath = resolve(backupSnapshotDir, relativePath);
    mkdirSync(resolve(backupPath, '..'), { recursive: true });
    cpSync(sourcePath, backupPath, { recursive: true });
  }
}

function resetControlledOutputsFromHead(workspaceRoot: string): void {
  for (const target of getControlledOutputTargets()) {
    const destination = resolve(workspaceRoot, target);
    rmSync(destination, { recursive: true, force: true });

    if (!gitPathExistsAtHead(workspaceRoot, target)) {
      continue;
    }

    runGit(workspaceRoot, ['restore', '--source', 'HEAD', '--worktree', '--', target]);
  }
}

function getControlledOutputTargets(): readonly string[] {
  return [
    'src/manifest.json',
    'src/styles/theme.css',
    'src/locale',
    'src/static',
    'unpackage/res'
  ] as const;
}

function assertControlledOutputsClean(workspaceRoot: string, force: boolean): void {
  const statusLines = getGitStatusLines(workspaceRoot, getControlledOutputTargets());
  if (statusLines.length === 0) {
    return;
  }

  const stagedLines = statusLines.filter((line) => line[0] !== ' ' && line[0] !== '?');
  if (stagedLines.length > 0) {
    throw new Error(
      [
        '受控产物存在已暂存改动，请先提交或取消暂存后再 apply:',
        ...stagedLines.map((line) => `- ${line}`)
      ].join('\n')
    );
  }

  if (force) {
    console.warn('[config-apply] --force 已启用，将覆盖受控产物的未暂存改动，并在覆盖前写入 backup');
    return;
  }

  throw new Error(
    [
      '受控产物存在未暂存改动，config:apply 会用当前 Git HEAD 作为干净基座重新生成这些文件。',
      '请先提交、恢复这些改动，或确认可以覆盖后加 --force:',
      ...statusLines.map((line) => `- ${line}`)
    ].join('\n')
  );
}

function getGitStatusLines(workspaceRoot: string, targets: readonly string[]): string[] {
  const result = spawnSync('git', ['status', '--porcelain', '--', ...targets], {
    cwd: workspaceRoot,
    encoding: 'utf-8'
  });
  if (result.status !== 0) {
    throw new Error(`git status failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split('\n').filter(Boolean);
}

function gitPathExistsAtHead(workspaceRoot: string, target: string): boolean {
  const result = spawnSync('git', ['cat-file', '-e', `HEAD:${target}`], {
    cwd: workspaceRoot,
    stdio: 'ignore'
  });
  return result.status === 0;
}

function runGit(workspaceRoot: string, args: string[]): void {
  const result = spawnSync('git', args, {
    cwd: workspaceRoot,
    encoding: 'utf-8'
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
}

function applyConfigSource(configRoot: string, workspaceRoot: string, channel: Channel): void {
  copyConfigPath(configRoot, workspaceRoot, 'config.json');
  copyConfigPath(configRoot, workspaceRoot, 'common');

  const sourceChannelPath = resolve(configRoot, 'channels', channel);
  const destinationChannelsPath = resolve(workspaceRoot, 'channels');
  const destinationChannelPath = resolve(destinationChannelsPath, channel);
  rmSync(destinationChannelsPath, { recursive: true, force: true });
  if (!existsSync(sourceChannelPath)) {
    return;
  }
  mkdirSync(destinationChannelsPath, { recursive: true });
  cpSync(sourceChannelPath, destinationChannelPath, {
    recursive: true,
    filter: shouldCopyConfigEntry
  });
}

function copyConfigPath(configRoot: string, workspaceRoot: string, target: string): void {
  const sourcePath = resolve(configRoot, target);
  const destinationPath = resolve(workspaceRoot, target);
  if (sourcePath === destinationPath) {
    return;
  }
  if (!existsSync(sourcePath)) {
    return;
  }
  rmSync(destinationPath, { recursive: true, force: true });
  cpSync(sourcePath, destinationPath, {
    recursive: true,
    filter: shouldCopyConfigEntry
  });
}

function shouldCopyConfigEntry(sourcePath: string): boolean {
  return !basename(sourcePath).startsWith('.');
}

function restoreBackup(workspaceRoot: string, backupSnapshotDir: string): void {
  const restoreTargets = [
    'config.json',
    'common',
    'channels',
    'src/manifest.json',
    'src/styles/theme.css',
    'src/locale',
    'src/static',
    'unpackage/res'
  ];

  for (const target of restoreTargets) {
    const restoreSource = resolve(backupSnapshotDir, target);
    const restoreDestination = resolve(workspaceRoot, target);
    rmSync(restoreDestination, { recursive: true, force: true });
    if (!existsSync(restoreSource)) {
      continue;
    }
    mkdirSync(resolve(restoreDestination, '..'), { recursive: true });
    cpSync(restoreSource, restoreDestination, { recursive: true });
  }
}

function runBrandVerify(workspaceRoot: string, channel: Channel): void {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'tsx',
      './scripts/brand/verify.ts',
      '--channel',
      channel
    ],
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CHANNEL: channel
      }
    }
  );

  if (result.status !== 0) {
    throw new Error(`[config-apply] brand:verify failed for channel=${channel}`);
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
