import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadBrandConfig, resolveChannel } from './lib/config.ts';
import { syncBrandArtifacts } from './lib/sync.ts';

function parseArgs(argv: string[]): { channel: string | undefined; dryRun: boolean } {
  const result = {
    channel: process.env.CHANNEL,
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--channel' && argv[index + 1]) {
      result.channel = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

function requireChannelConfig(channel: string): void {
  const configPath = resolve(process.cwd(), 'channels', channel, 'config.json');
  if (existsSync(configPath)) {
    return;
  }
  throw new Error(
    `Missing channel config: channels/${channel}/config.json. Apply a brand config package before syncing this channel.`
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    CHANNEL: args.channel || process.env.CHANNEL
  };
  const channel = resolveChannel(env);
  requireChannelConfig(channel);
  const resolvedConfig = loadBrandConfig({
    channel,
    cwd: process.cwd(),
    env
  });

  const updates = syncBrandArtifacts(resolvedConfig, {
    channel,
    dryRun: args.dryRun
  });

  console.log(
    `[brand-sync] channel=${resolvedConfig.meta.channel} dryRun=${String(args.dryRun)}`
  );
  updates.forEach((update) => console.log(`[brand-sync] ${update}`));
}

main();
