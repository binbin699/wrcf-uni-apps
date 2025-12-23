import { DEFAULT_WIFI_CONFIG, type CnfigPageOptions, type ConfigWifiMethod } from './types';
import { ref } from 'vue';

// 基本配置选项
export const pageOptions = ref<CnfigPageOptions>({
  ...DEFAULT_WIFI_CONFIG
});
// 其他状态
export const isPlaying = ref(false);

export function onMethodChange(
  { value }: { value: ConfigWifiMethod },
  callback?: (newMethod: ConfigWifiMethod, oldMethod: ConfigWifiMethod) => void
) {
  const oldMethod = pageOptions.value.method;
  pageOptions.value.method = value;
  callback?.(value, oldMethod);
}

export const StorageKey = 'page-options-cnfig';

export function loadOptions() {
  const options = uni.getStorageSync(StorageKey) as CnfigPageOptions | null;
  if (options) {
    pageOptions.value = options;
    // 强制使用声波配网，防止旧缓存中存在 'qrcode'
    pageOptions.value.method = DEFAULT_WIFI_CONFIG.method;
  }
}

export function saveOptions() {
  uni.setStorageSync(StorageKey, pageOptions.value);
}

export function callOnLoad() {
  loadOptions();
}
export function callOnUnload() {
  saveOptions();
}
