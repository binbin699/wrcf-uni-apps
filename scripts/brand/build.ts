import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHANNELS, isChannel, type Channel } from './lib/config.ts';

interface BuildArgs {
  channel: Channel;
  platform: string;
  extraArgs: string[];
  skipSync: boolean;
}

function parseArgs(argv: string[]): BuildArgs {
  let channelValue = process.env.CHANNEL;
  let platform = '';
  const extraArgs: string[] = [];
  let skipSync = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--channel' && argv[index + 1]) {
      channelValue = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--platform' && argv[index + 1]) {
      platform = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--skip-sync') {
      skipSync = true;
      continue;
    }
    extraArgs.push(arg);
  }

  if (!channelValue || !isChannel(channelValue)) {
    throw new Error(`Missing or invalid --channel. Supported channels: ${CHANNELS.join(', ')}`);
  }

  if (!platform) {
    throw new Error('Missing required --platform');
  }

  return {
    channel: channelValue,
    platform,
    extraArgs,
    skipSync
  };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireChannelConfig(channel: Channel): void {
  const configPath = resolve(process.cwd(), 'channels', channel, 'config.json');
  if (existsSync(configPath)) {
    return;
  }
  throw new Error(
    `Missing channel config: channels/${channel}/config.json. Apply a brand config package before building this channel.`
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    CHANNEL: args.channel
  };

  requireChannelConfig(args.channel);
  if (!args.skipSync) {
    run('pnpm', ['brand:sync', '--', '--channel', args.channel], env);
  }
  run('pnpm', ['exec', 'uni', 'build', '-p', args.platform, ...args.extraArgs], env);
}

main();
