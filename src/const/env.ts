/**
 * 环境与系统探测（const/env.ts）
 * 作用：
 * - 平台探测：导出 PLATFORM（'mp' | 'app'）、isMp、isApp
 * - 系统信息：导出 OS（'android' | 'ios' | 'harmony' | 'windows' | 'mac' | 'linux' | 'unknown'）、
 *   OS_VERSION、ANDROID_API_LEVEL、isHarmony
 * - 构建期环境变量：导出 ENV（Vite import.meta.env）
 * 说明：
 * - 优先使用条件编译宏（APP-PLUS/APP-HARMONY/MP）设置平台
 * - 系统类型通过 uni.getSystemInfoSync 的 osName/romName 识别，无法识别时为 'unknown'
 * - ANDROID_API_LEVEL 仅在 Android 平台有值
 */
// 运行时/编译时平台探测与导出
// 说明：使用条件编译宏确保值在对应平台下被正确设置

import { EditionKind } from '@/configs/types';

export type PlatformKind = 'mp' | 'app';

let PLATFORM: PlatformKind = 'app';

// #ifdef APP-PLUS || APP-HARMONY
PLATFORM = 'app';
// #endif

// #ifdef MP
PLATFORM = 'mp';
// #endif

export { PLATFORM };

// @ts-ignore
export const isApp = PLATFORM === 'app';
export const isMp = PLATFORM === 'mp';

// 参考：https://en.uniapp.dcloud.io/uni-app-x/api/get-system-info.html
export type OsType = 'android' | 'ios' | 'harmony' | 'windows' | 'mac' | 'linux' | 'unknown';

let cachedSys: any | null = null;

function getSystemInfoSafe(): any {
  if (cachedSys) return cachedSys;
  try {
    // 部分平台可能不存在该 API，需兜底
    cachedSys = uni.getSystemInfoSync ? uni.getSystemInfoSync() : {};
  } catch (e) {
    cachedSys = {};
  }
  return cachedSys;
}

function detectOsType(): OsType {
  // #ifdef APP-HARMONY || MP-HARMONY
  return 'harmony';
  // #endif

  try {
    const sys: any = getSystemInfoSafe();
    const osName = String(sys?.osName || '').toLowerCase();
    const romName = String(sys?.romName || '').toLowerCase();

    // 华为鸿蒙设备在部分场景下 osName 可能仍为 android，可通过 romName 识别
    if (romName.includes('harmony') || romName.includes('hongmeng')) {
      return 'harmony';
    }

    if (osName === 'ios') return 'ios';
    if (osName === 'android') return 'android';
    if (osName === 'windows') return 'windows';
    if (osName === 'mac') return 'mac';
    if (osName === 'linux') return 'linux';
    // 未识别的情况
    return 'unknown';
  } catch (e) {
    // 兜底：无法获取系统信息时默认 unknown
    return 'unknown';
  }
}

export const OS: OsType = detectOsType();
export const isHarmony = OS === 'harmony';

// 系统版本号获取：
// - Harmony 优先使用 romVersion
// - iOS/Android 使用 osVersion
function detectOsVersion(): string {
  const sys: any = getSystemInfoSafe();
  const osVersion = String(sys?.osVersion || '');
  const romName = String(sys?.romName || '').toLowerCase();
  const romVersion = String(sys?.romVersion || '');

  if (romName.includes('harmony') || romName.includes('hongmeng')) {
    return romVersion || osVersion;
  }
  return osVersion;
}

export const OS_VERSION: string = detectOsVersion();

// Android 平台的 API Level（仅 Android 有值）
export const ANDROID_API_LEVEL: number | undefined = (() => {
  if (OS !== 'android') return undefined;
  const sys: any = getSystemInfoSafe();
  const level = sys?.osAndroidAPILevel;
  return typeof level === 'number' ? level : undefined;
})();

// 暴露构建期环境变量（Vite）
export const ENV = import.meta.env as Record<string, string> & {
  VITE_APP_EDITION?: EditionKind;
  VITE_BASE_URL?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
  VITE_BLE_FILTER_ENABLED?: string;
  VITE_TERMS_URL?: string;
  VITE_PRIVACY_URL?: string;
  VITE_APP_SETUP_MODE?: 'qrcode' | 'bluetooth' | 'both';
  VITE_APP_USE_VOICEPRINT?: string;
  VITE_ARMS_PID?: string;
  VITE_ARMS_ENDPOINT?: string;
  VITE_ARMS_ENV?: 'prod' | 'gray' | 'pre' | 'daily' | 'local';
};

// 蓝牙配网是否启用设备名称筛选，默认 true
export const BLE_FILTER_ENABLED = ENV.VITE_BLE_FILTER_ENABLED !== 'false';

// 是否支持声纹，默认 true
export const APP_USE_VOICEPRINT = ENV.VITE_APP_USE_VOICEPRINT !== 'false';
