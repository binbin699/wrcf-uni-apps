/**
 * 环境与系统探测
 * 
 * 功能：
 * 1. 平台探测
 *    - PLATFORM: 'mp' | 'app' - 运行平台类型
 *    - isApp: boolean - 是否为 App 端
 *    - isMp: boolean - 是否为小程序端
 * 
 * 2. 操作系统信息
 *    - OS: 'android' | 'ios' | 'harmony' | 'windows' | 'mac' | 'linux' | 'unknown'
 *    - isHarmony: boolean - 是否为鸿蒙系统
 *    - OS_VERSION: string - 操作系统版本号
 *    - ANDROID_API_LEVEL: number | undefined - Android API 级别（仅 Android 平台）
 * 
 * 实现说明：
 * - 平台类型通过条件编译宏（#ifdef APP-PLUS/APP-HARMONY/MP）在编译时确定
 * - 系统信息通过 uni.getSystemInfoSync() 获取
 * - 鸿蒙设备通过 romName 识别（部分鸿蒙设备 osName 仍为 android）
 * - 所有获取操作均有错误兜底，避免运行时崩溃
 */

export type PlatformKind = 'mp' | 'app';

let PLATFORM: PlatformKind = 'app';

// #ifdef APP-PLUS || APP-HARMONY
PLATFORM = 'app';
// #endif

// #ifdef MP
PLATFORM = 'mp';
// #endif

export { PLATFORM };

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

let cachedOsType: OsType | undefined = undefined;

export function detectOsType(): OsType {
  if (cachedOsType !== undefined) return cachedOsType;

  // #ifdef APP-HARMONY || MP-HARMONY
  cachedOsType = 'harmony';
  return cachedOsType;
  // #endif

  try {
    const sys: any = getSystemInfoSafe();
    const osName = String(sys?.osName || '').toLowerCase();
    const romName = String(sys?.romName || '').toLowerCase();

    // 华为鸿蒙设备在部分场景下 osName 可能仍为 android，可通过 romName 识别
    if (romName.includes('harmony') || romName.includes('hongmeng')) {
      cachedOsType = 'harmony';
      return cachedOsType!;
    }

    if (osName === 'ios') cachedOsType = 'ios';
    if (osName === 'android') cachedOsType = 'android';
    if (osName === 'windows') cachedOsType = 'windows';
    if (osName === 'mac') cachedOsType = 'mac';
    if (osName === 'linux') cachedOsType = 'linux';
    // 未识别的情况
    cachedOsType = 'unknown';
  } catch (e) {
    // 兜底：无法获取系统信息时默认 unknown
    cachedOsType = 'unknown';
  }
  return cachedOsType!;
}


// 系统版本号获取：
// - Harmony 优先使用 romVersion
// - iOS/Android 使用 osVersion
let cachedOsVersion: string | null = null;

export function detectOsVersion(): string {
  if (cachedOsVersion) return cachedOsVersion;

  const sys: any = getSystemInfoSafe();
  const osVersion = String(sys?.osVersion || '');
  const romName = String(sys?.romName || '').toLowerCase();
  const romVersion = String(sys?.romVersion || '');

  if (romName.includes('harmony') || romName.includes('hongmeng')) {
    cachedOsVersion = romVersion || osVersion;
    return cachedOsVersion;
  }
  cachedOsVersion = osVersion;
  return cachedOsVersion;
}

let cachedAndroidApiLevel: number | undefined = undefined;
export function getAndroidApiLevel(): number | undefined {
  if (cachedAndroidApiLevel !== undefined) return cachedAndroidApiLevel;
  if (detectOsType() !== 'android') return undefined;

  const sys: any = getSystemInfoSafe();
  const level = sys?.osAndroidAPILevel;
  cachedAndroidApiLevel = typeof level === 'number' ? level : undefined;

  return cachedAndroidApiLevel;
}
