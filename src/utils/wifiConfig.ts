import i18n from '@/locale';
import storage from './storage';
const $t = i18n.global.t;

export type SecurityType = 'WPA' | 'WEP' | 'WPA3';

export const WIFI_CONFIG_STORAGE_KEY = 'net-config-wifiConfig';

export type WiFiConfig = {
  ssid: string;
  password: string;
  security: SecurityType;
  hidden: boolean;
};

export type WiFiConfigStr = string;

export const DEFAULT_WIFI_CONFIG: WiFiConfig = {
  ssid: '',
  password: '',
  security: 'WPA',
  hidden: false
};

export const securityOptions: { value: SecurityType; label: string }[] = [
  { value: 'WPA', label: 'WPA/WPA2' },
  { value: 'WPA3', label: 'WPA3' },
  { value: 'WEP', label: 'WEP' }
];

function normalizeSecurity(value: unknown): SecurityType {
  const candidate = typeof value === 'string' ? value.toUpperCase() : '';
  if (candidate === 'WPA3') return 'WPA3';
  if (candidate === 'WEP') return 'WEP';
  return 'WPA';
}

/**
 * 生成WiFi配置字符串
 * @param wifiConfig WiFi配置对象
 * @param save 是否保存配置到本地存储，默认值为true
 * @returns 生成的WiFi配置字符串
 */
export function genWiFiStr(wifiConfig: WiFiConfig, save?: boolean): WiFiConfigStr {
  // 生成WIFI配置字符串
  let wifiString = `WIFI:S:${wifiConfig.ssid};`;

  // 设置加密类型
  const security = (() => {
    if (wifiConfig.security === 'WPA3') return 'T:WPA;R:1;';
    return `T:${wifiConfig.security};`;
  })();
  wifiString += security;

  // 添加密码（如果有）
  const password = wifiConfig.password;
  if (password) wifiString += `P:${password};`;

  // 设置隐藏网络
  const hidden = wifiConfig.hidden ? 'true' : 'false';
  wifiString += `H:${hidden};`;

  wifiString += ';';

  if (save ?? true) {
    storage.set(WIFI_CONFIG_STORAGE_KEY, wifiConfig);
  }
  return wifiString;
}

export function getWiFiConfig(): WiFiConfig {
  const rawConfig = storage.get(WIFI_CONFIG_STORAGE_KEY, DEFAULT_WIFI_CONFIG) as Partial<WiFiConfig> & {
    security?: unknown;
  };

  return {
    ssid: typeof rawConfig.ssid === 'string' ? rawConfig.ssid : DEFAULT_WIFI_CONFIG.ssid,
    password:
      typeof rawConfig.password === 'string' ? rawConfig.password : DEFAULT_WIFI_CONFIG.password,
    security: normalizeSecurity(rawConfig.security),
    hidden: typeof rawConfig.hidden === 'boolean' ? rawConfig.hidden : DEFAULT_WIFI_CONFIG.hidden
  };
}

export function clearWiFiConfig() {
  storage.remove(WIFI_CONFIG_STORAGE_KEY);
}

/**
 * 简单的哈希函数，用于生成配置字符串的唯一标识
 * @param {WiFiConfigStr} wifiConfigStr - WiFi配置字符串
 * @returns {string} 哈希值
 */
export function generateConfigHash(wifiConfigStr: WiFiConfigStr) {
  let hash = 0;
  if (wifiConfigStr.length === 0) return hash.toString();

  for (let i = 0; i < wifiConfigStr.length; i++) {
    const char = wifiConfigStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  return Math.abs(hash).toString(16);
}
