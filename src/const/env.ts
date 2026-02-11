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

    // 重要：HarmonyOS 4.x 及更早版本运行在 Android 内核上，通过 APP-PLUS 编译为 APK
    // 这些设备使用 Android 权限模型和 plus.android.* API，应视为 'android'
    // 只有通过 APP-HARMONY 编译的鸿蒙 NEXT (5.0+) 才应视为 'harmony'
    // APP-HARMONY 已在上方条件编译中处理，此处不再将 romName 含 harmony 的设备标记为 'harmony'

    if (osName === 'ios') cachedOsType = 'ios';
    else if (osName === 'android') cachedOsType = 'android';
    else if (osName === 'windows') cachedOsType = 'windows';
    else if (osName === 'mac') cachedOsType = 'mac';
    else if (osName === 'linux') cachedOsType = 'linux';
  } catch (e) {}
  return cachedOsType || 'unknown';
}

/**
 * 检测是否为鸿蒙 ROM（运行在 Android 内核上的 HarmonyOS 4.x 及更早版本）
 * 注意：这些设备在功能上等同于 Android，使用 Android 权限模型和 API
 * 此函数仅用于日志/调试/UI 显示场景
 */
export function isHarmonyRom(): boolean {
  try {
    const sys: any = getSystemInfoSafe();
    const romName = String(sys?.romName || '').toLowerCase();
    return romName.includes('harmony') || romName.includes('hongmeng');
  } catch {
    return false;
  }
}

// 系统版本号获取：
// - HarmonyOS NEXT (APP-HARMONY): 使用 romVersion
// - HarmonyOS on Android (APP-PLUS): 使用 osVersion（Android 内核版本，用于 API level 判断）
// - iOS/Android: 使用 osVersion
let cachedOsVersion: string | null = null;

export function detectOsVersion(): string {
  if (cachedOsVersion) return cachedOsVersion;

  const sys: any = getSystemInfoSafe();
  const osVersion = String(sys?.osVersion || '');

  // 仅在 APP-HARMONY 编译模式下使用 romVersion
  // APP-PLUS 下的 HarmonyOS 设备应使用 osVersion（Android 版本号），
  // 以保证 API Level 相关的版本判断逻辑正确
  // #ifdef APP-HARMONY || MP-HARMONY
  const romVersion = String(sys?.romVersion || '');
  cachedOsVersion = romVersion || osVersion;
  return cachedOsVersion;
  // #endif

  cachedOsVersion = osVersion;
  return cachedOsVersion!;
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
