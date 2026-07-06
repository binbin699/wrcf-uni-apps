import storage from '@/utils/storage';
import { PageOptions } from './types';
import { PageMap, Pages } from '@/utils/route';

export const StorageKey = 'page-options-create-agent';

export function loadOptions(): PageOptions {
  const options = storage.get(StorageKey) || {};
  if (options.id) {
    storage.remove(StorageKey);
  }
  return options;
}

export function saveOptions(options: PageOptions) {
  storage.set(StorageKey, options);
}

export function gotoCreateAgentBy(agent: { id: number; agentId: string }) {
  saveOptions({
    id: agent.id,
    agentId: agent.agentId
  });

  uni.navigateTo({
    url: PageMap[Pages.AgentCreate].url
  });
}
