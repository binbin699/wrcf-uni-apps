import { Ref, ref } from 'vue';
import { checkPermissionStatus, PermissionType, PermissionStatus } from './permission';
import { AppInfo } from '@/const';

export const wifiList = ref<UniApp.WifiInfo[]>([]);
export const isLoadingWifiList = ref(false);

/**
 * WiFi 扫描错误类型枚举
 */
export enum WifiScanErrorType {
  SCAN_NOT_SUPPORTED = 'SCAN_NOT_SUPPORTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',           // 权限被拒绝
  PERMISSION_DENIED_ALWAYS = 'PERMISSION_DENIED_ALWAYS', // 权限被永久拒绝
  LOCATION_DISABLED = 'LOCATION_DISABLED',           // 定位服务未开启
  WIFI_DISABLED = 'WIFI_DISABLED',                   // WLAN 服务未开启
  WIFI_MODULE_FAIL = 'WIFI_MODULE_FAIL',
  SCAN_FAILED = 'SCAN_FAILED',
  SCAN_EMPTY = 'SCAN_EMPTY'
}

/**
 * WiFi 扫描错误类
 */
export class WifiScanError extends Error {
  type: WifiScanErrorType;
  constructor(type: WifiScanErrorType, message?: string) {
    super(message || type);
    this.type = type;
    this.name = 'WifiScanError';
  }
}

/**
 * 获取并更新 Wi-Fi 列表（跨平台兼容）。
 * - 在支持扫描的平台上，使用 startWifi + getWifiList + onGetWifiList。
 * - 在 iOS App 不支持扫描时，回退为获取当前连接 Wi-Fi（partialInfo）。
 * - 在不支持的平台上，返回空列表。
 */
export async function getWifiList(options: {
  no24G?: boolean;
  no5G?: boolean;
}): Promise<UniApp.WifiInfo[]> {
  await loadWifiList(wifiList, options);
  console.log('get wifi list', wifiList.value);
  return [...wifiList.value];
}

/**
 * 触发 Wi-Fi 扫描并将结果写入传入的 ref。
 * 注意：onGetWifiList 才会返回列表数据，getWifiList 仅触发扫描。
 * iOS 平台不支持扫描时，会尝试获取当前连接的 WiFi 作为回退方案。
 */
export async function loadWifiList(
  target: Ref<UniApp.WifiInfo[]>,
  options: { no24G?: boolean; no5G?: boolean }
) {
  target.value = [];
  isLoadingWifiList.value = true;

  const canScan = isScanSupported();
  if (!canScan) {
    // iOS 等不支持扫描的平台，尝试获取当前连接的 WiFi 作为回退
    console.log('平台不支持 WiFi 扫描，尝试获取当前连接的 WiFi');
    try {
      const started = await startWifiSafe();
      if (!started) {
        isLoadingWifiList.value = false;
        throw new WifiScanError(WifiScanErrorType.WIFI_MODULE_FAIL);
      }

      const connectedWifi = await getConnectedWifiBestEffort();
      await stopWifiSafe();

      if (connectedWifi) {
        let list = [connectedWifi];
        // 应用频段过滤
        if (options.no24G) {
          list = list.filter((info) => !is24GHz(info));
        }
        if (options.no5G) {
          list = list.filter((info) => !is5GHz(info));
        }
        isLoadingWifiList.value = false;
        target.value = list;
        return;
      } else {
        isLoadingWifiList.value = false;
        throw new WifiScanError(WifiScanErrorType.SCAN_EMPTY);
      }
    } catch (error) {
      isLoadingWifiList.value = false;
      if (error instanceof WifiScanError) {
        throw error;
      }
      throw new WifiScanError(WifiScanErrorType.SCAN_NOT_SUPPORTED);
    }
  }

  // Android App: 先检查 WLAN 服务
  if (AppInfo.isAndroidApp()) {
    const wifiEnabled = await ensureAndroidWifiEnabled();
    if (!wifiEnabled) {
      isLoadingWifiList.value = false;
      throw new WifiScanError(WifiScanErrorType.WIFI_DISABLED);
    }
  }

  // Android App: 检查定位服务
  if (AppInfo.isAndroidApp()) {
    const locOk = await ensureAndroidLocationEnabled();
    if (!locOk) {
      isLoadingWifiList.value = false;
      throw new WifiScanError(WifiScanErrorType.LOCATION_DISABLED);
    }
  }

  // Android App: 检查权限
  if (AppInfo.isAndroidApp()) {
    const permResult = await ensureAndroidScanPermissions();
    if (!permResult.success) {
      // 即使权限检查失败，也尝试继续扫描（容错机制）
      // 因为在实际测试中，即使 NEARBY_WIFI_DEVICES 被永久拒绝，如果位置权限已授予，WiFi 扫描仍然可能工作
      // 如果扫描真的失败，会在后续的 scanWifiListWithTimeout 中抛出错误
      console.warn('[WiFi扫描] 权限检查失败，但将尝试继续扫描（容错机制）');
      // 不直接抛出错误，而是继续尝试扫描
      // 如果扫描真的失败，会在后续流程中抛出相应的错误
    } else if (permResult.deniedAlways) {
      // 权限被永久拒绝，但位置权限已授予，记录警告但继续尝试
      console.warn('[WiFi扫描] 部分权限被永久拒绝，但位置权限已授予，将尝试继续扫描');
    }
  }

  // 微信小程序: 检查定位权限
  if (AppInfo.isWeixinMP()) {
    const weixinLocOk = await ensureWeixinLocationAuthorized();
    if (!weixinLocOk) {
      isLoadingWifiList.value = false;
      throw new WifiScanError(WifiScanErrorType.PERMISSION_DENIED);
    }
  }

  const started = await startWifiSafe();
  if (!started) {
    isLoadingWifiList.value = false;
    throw new WifiScanError(WifiScanErrorType.WIFI_MODULE_FAIL);
  }

  let list: UniApp.WifiInfo[] = [];
  try {
    // Android 上若系统定位未开启，Wi‑Fi 扫描可能返回空列表。
    // 这里尽量延长等待时间以提升成功率。
    list = await scanWifiListWithTimeout(5000);
  } catch (_) {
    await stopWifiSafe();
    // iOS 扫描失败时，尝试回退到获取当前连接的 WiFi
    if (AppInfo.isIOSApp()) {
      console.log('iOS WiFi 扫描失败，尝试获取当前连接的 WiFi');
      const fallbackList = await tryGetConnectedWifiFallback(options);
      if (fallbackList.length > 0) {
        isLoadingWifiList.value = false;
        target.value = fallbackList;
        return;
      }
    }
    isLoadingWifiList.value = false;
    throw new WifiScanError(WifiScanErrorType.SCAN_FAILED);
  }

  // 关闭 Wi-Fi 模块（若已成功开启）
  await stopWifiSafe();

  if (!list || list.length === 0) {
    // iOS 扫描为空时，尝试回退到获取当前连接的 WiFi
    if (AppInfo.isIOSApp()) {
      console.log('iOS WiFi 扫描为空，尝试获取当前连接的 WiFi');
      const fallbackList = await tryGetConnectedWifiFallback(options);
      if (fallbackList.length > 0) {
        isLoadingWifiList.value = false;
        target.value = fallbackList;
        return;
      }
    }
    isLoadingWifiList.value = false;
    throw new WifiScanError(WifiScanErrorType.SCAN_EMPTY);
  }

  // 按信号强度降序排序（未提供 signalStrength 的项靠后）
  list = sortWifiListBySignal(list);
  if (options.no24G) {
    list = list.filter((info) => !is24GHz(info));
  }
  if (options.no5G) {
    list = list.filter((info) => !is5GHz(info));
  }
  isLoadingWifiList.value = false;
  target.value = list;
}

/**
 * 判断是否支持扫描 Wi-Fi 列表。
 * - Android App、微信小程序：支持
 * - iOS App、鸿蒙 App：不支持（退化为 getConnectedWifi）
 */
function isScanSupported(): boolean {
  // 使用运行时平台判断，而不是编译时条件编译
  // Android App 平台支持扫描
  if (AppInfo.isAndroidApp()) {
    return true;
  }

  // 微信小程序平台支持扫描
  if (AppInfo.isMP()) {
    return true;
  }

  // iOS App、鸿蒙 App 等其他平台不支持扫描
  return false;
}

// 微信小程序：确保地理位置权限授权（小程序 Wi‑Fi 列表扫描依赖定位授权）
async function ensureWeixinLocationAuthorized(): Promise<boolean> {
  if (!AppInfo.isWeixinMP()) {
    return true;
  }

  try {
    const setting = await new Promise<any>((resolve) => {
      uni.getSetting({
        success: (res: any) => resolve(res),
        fail: () => resolve({})
      });
    });
    const authed = !!setting?.authSetting?.['scope.userLocation'];
    if (authed) return true;
    return await new Promise<boolean>((resolve) => {
      uni.authorize({
        scope: 'scope.userLocation',
        success: () => resolve(true),
        fail: () => resolve(false)
      });
    });
  } catch (_) {
    return false;
  }
}

// 在 Android App 上检查 WLAN 服务是否开启
// 仅在 Android App 平台生效；其它平台直接返回 true。
async function ensureAndroidWifiEnabled(): Promise<boolean> {
  if (!AppInfo.isAndroidApp()) {
    return true;
  }

  try {
    // @ts-ignore
    const main = plus.android.runtimeMainActivity();
    // @ts-ignore
    const Context = plus.android.importClass('android.content.Context');
    // @ts-ignore
    const WifiManager = plus.android.importClass('android.net.wifi.WifiManager');
    // @ts-ignore
    const wm = main.getSystemService(Context.WIFI_SERVICE);

    // 使用 plus.android.invoke 确保更广泛的兼容性
    // @ts-ignore
    const enabled = plus.android.invoke(wm, 'isWifiEnabled');

    if (!enabled) {
      console.warn('[WiFi扫描] Android WLAN 服务未开启');
    } else {
      console.log('[WiFi扫描] Android WLAN 服务已开启');
    }
    return !!enabled;
  } catch (e) {
    // 环境不支持或异常时，不阻塞流程
    console.error('[WiFi扫描] 检查 Android WLAN 状态失败:', e);
    return true;
  }
}

// 在 Android App 上尽量确保系统定位服务开启（否则 Wi‑Fi 扫描常为空）
// 仅在 Android App 平台生效；其它平台直接返回 true。
async function ensureAndroidLocationEnabled(): Promise<boolean> {
  if (!AppInfo.isAndroidApp()) {
    return true;
  }

  try {
    // 使用 plus.android 检查系统定位服务开关状态
    // 若运行环境不可用，直接返回 true 以不阻塞流程。
    // @ts-ignore
    const main = plus.android.runtimeMainActivity();
    // @ts-ignore
    const Context = plus.android.importClass('android.content.Context');
    // @ts-ignore
    const LocationManager = plus.android.importClass('android.location.LocationManager');
    // @ts-ignore
    const lm = main.getSystemService(Context.LOCATION_SERVICE);

    // 使用 plus.android.invoke 确保兼容性
    // @ts-ignore
    const gpsOn = plus.android.invoke(lm, 'isProviderEnabled', LocationManager.GPS_PROVIDER);
    // @ts-ignore
    const networkOn = plus.android.invoke(lm, 'isProviderEnabled', LocationManager.NETWORK_PROVIDER);

    const enabled = !!(gpsOn || networkOn);
    if (!enabled) {
      console.warn('[WiFi扫描] Android 定位服务未开启，Wi‑Fi 扫描可能为空');
    } else {
      console.log('[WiFi扫描] Android 定位服务已开启');
    }
    return enabled;
  } catch (e) {
    // 环境不支持或异常时，不阻塞流程
    console.error('[WiFi扫描] 检查 Android 定位状态失败:', e);
    return true;
  }
}

// 请求 Android 13+ 所需的 Wi‑Fi 相关运行时权限（NEARBY_WIFI_DEVICES）以及定位权限
// 若运行环境不支持或调用异常，返回 { success: true, deniedAlways: false } 以不阻塞流程。
async function ensureAndroidScanPermissions(): Promise<{ success: boolean, deniedAlways: boolean }> {
  if (!AppInfo.isAndroidApp()) {
    return { success: true, deniedAlways: false };
  }

  try {
    console.log('[WiFi扫描] 开始检查Android WiFi扫描权限');

    // 先检查位置权限状态（可能已经在 net-config.vue 中请求过了）
    const locationStatus = await checkPermissionStatus(PermissionType.LOCATION);
    console.log('[WiFi扫描] 位置权限状态:', locationStatus);

    // 确定需要请求的权限列表
    const permissionsToRequest: string[] = [];

    // 如果位置权限未授权，需要请求位置权限
    if (locationStatus !== PermissionStatus.AUTHORIZED) {
      console.log('[WiFi扫描] 位置权限未授权，需要请求位置权限');
      permissionsToRequest.push('android.permission.ACCESS_FINE_LOCATION');
    } else {
      console.log('[WiFi扫描] 位置权限已授权，跳过位置权限请求');
    }

    // Android 13+ (API Level 33+) 需要请求附近设备权限
    const needNearbyPermission = AppInfo.androidApiLevel !== undefined
      ? AppInfo.androidApiLevel >= 33
      : (AppInfo.osVersion ? parseFloat(AppInfo.osVersion) >= 13 : false);

    if (needNearbyPermission) {
      console.log('[WiFi扫描] Android 13+ 需要请求附近设备权限');
      permissionsToRequest.push('android.permission.NEARBY_WIFI_DEVICES');
    }

    // 如果没有需要请求的权限，直接返回成功
    if (permissionsToRequest.length === 0) {
      console.log('[WiFi扫描] 所有权限已授权，无需请求');
      return { success: true, deniedAlways: false };
    }

    console.log('[WiFi扫描] 需要请求的权限:', permissionsToRequest);

    // @ts-ignore
    return await new Promise<{ success: boolean, deniedAlways: boolean }>((resolve) => {
      try {
        // @ts-ignore
        plus.android.requestPermissions(
          permissionsToRequest,
          (res: any) => {
            console.log('[WiFi扫描] Android权限请求回调结果:', res);
            const grantedList = Array.isArray(res?.granted) ? res.granted : [];
            const deniedAlways = Array.isArray(res?.deniedAlways) ? res.deniedAlways : [];
            const deniedPresent = Array.isArray(res?.deniedPresent) ? res.deniedPresent : [];

            console.log('[WiFi扫描] 已授予的权限:', grantedList);
            console.log('[WiFi扫描] 永久拒绝的权限:', deniedAlways);
            console.log('[WiFi扫描] 本次拒绝的权限:', deniedPresent);

            // 判断权限状态
            const isDeniedAlways = deniedAlways.length > 0;

            // 优化判断逻辑：
            // 1. 如果位置权限已授予（在 grantedList 中或之前已授权），即使 NEARBY_WIFI_DEVICES 被永久拒绝，也允许尝试扫描
            // 2. 因为在实际测试中，即使 NEARBY_WIFI_DEVICES 被拒绝，如果位置权限已授予，WiFi 扫描仍然可能工作
            // 3. 如果位置权限也在 deniedAlways 中，则真正失败
            const hasLocationPermission =
              grantedList.includes('android.permission.ACCESS_FINE_LOCATION') ||
              grantedList.includes('android.permission.ACCESS_COARSE_LOCATION') ||
              locationStatus === PermissionStatus.AUTHORIZED;

            const hasLocationDeniedAlways =
              deniedAlways.includes('android.permission.ACCESS_FINE_LOCATION') ||
              deniedAlways.includes('android.permission.ACCESS_COARSE_LOCATION');

            // 如果位置权限已授予，即使 NEARBY_WIFI_DEVICES 被永久拒绝，也允许尝试扫描
            // 如果位置权限被永久拒绝，则真正失败
            const ok = hasLocationPermission && !hasLocationDeniedAlways;

            if (!ok) {
              console.warn('[WiFi扫描] WiFi扫描权限未完全授予:', res);
              if (hasLocationDeniedAlways) {
                console.warn('[WiFi扫描] 位置权限被永久拒绝，WiFi扫描无法进行');
              } else if (!hasLocationPermission) {
                console.warn('[WiFi扫描] 位置权限未授予，WiFi扫描无法进行');
              }
            } else {
              if (isDeniedAlways) {
                console.warn('[WiFi扫描] 附近设备权限被永久拒绝，但位置权限已授予，将尝试继续扫描');
              } else {
                console.log('[WiFi扫描] WiFi扫描权限请求成功');
              }
            }

            resolve({ success: ok, deniedAlways: isDeniedAlways });
          },
          (err: any) => {
            console.error('[WiFi扫描] Android权限请求错误:', err);
            resolve({ success: false, deniedAlways: false });
          }
        );
      } catch (error) {
        console.error('[WiFi扫描] Android权限请求异常:', error);
        resolve({ success: true, deniedAlways: false });
      }
    });
  } catch (error) {
    console.error('[WiFi扫描] ensureAndroidScanPermissions 异常:', error);
    return { success: true, deniedAlways: false };
  }
}

// 安全封装：初始化/关闭 Wi-Fi 模块
export async function startWifiSafe(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      console.log('[WiFi扫描] 调用 uni.startWifi');
      uni.startWifi({
        success: () => {
          console.log('[WiFi扫描] uni.startWifi 成功');
          resolve(true);
        },
        fail: (err) => {
          console.error('[WiFi扫描] uni.startWifi 失败:', err);
          resolve(false);
        }
      });
    } catch (e) {
      console.error('[WiFi扫描] uni.startWifi 异常:', e);
      resolve(false);
    }
  });
}

export async function stopWifiSafe(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      uni.stopWifi({
        complete: () => resolve()
      });
    } catch (_) {
      resolve();
    }
  });
}

// 统一封装：取消 Wi‑Fi 列表监听（兼容 App‑Plus 与微信小程序）
function offGetWifiListCompat(handler: Function) {
  try {
    if (AppInfo.isWeixinMP()) {
      // 微信小程序需要传入相同的回调以解除监听
      uni.offGetWifiList(handler as any);
    } else if (AppInfo.isApp()) {
      // App平台(Android/iOS)不需要传参；传参会导致类型不匹配异常
      uni.offGetWifiList();
    }
  } catch (_) {
    // 防御性处理：清理失败不影响主流程
  }
}

// 事件驱动的扫描封装，含超时与监听清理
function scanWifiListWithTimeout(timeoutMs: number): Promise<UniApp.WifiInfo[]> {
  return new Promise<UniApp.WifiInfo[]>((resolve, reject) => {
    let timeoutHandle: any;
    const handler = (res: any) => {
      clearTimeout(timeoutHandle);
      offGetWifiListCompat(handler);
      resolve((res?.wifiList as UniApp.WifiInfo[]) ?? []);
    };

    try {
      uni.onGetWifiList(handler);

      // 在调用 getWifiList 之前就开始计时，防止 getWifiList 本身挂起导致永久等待
      timeoutHandle = setTimeout(() => {
        offGetWifiListCompat(handler);
        console.error(`[WiFi扫描] getWifiList 超时 (${timeoutMs}ms)`);
        reject(new Error('getWifiList timeout'));
      }, timeoutMs);

      uni.getWifiList({
        success: () => {
          console.log('[WiFi扫描] getWifiList 成功开始');
        },
        fail: (err: any) => {
          clearTimeout(timeoutHandle);
          offGetWifiListCompat(handler);
          console.error('[WiFi扫描] getWifiList 失败:', err);
          reject(err);
        }
      });
    } catch (e) {
      clearTimeout(timeoutHandle);
      offGetWifiListCompat(handler);
      console.error('[WiFi扫描] getWifiList 异常:', e);
      reject(e as any);
    }
  });
}

// 尝试获取当前连接的 WiFi 作为回退方案（用于 iOS 等不支持扫描的平台）
async function tryGetConnectedWifiFallback(options: { no24G?: boolean; no5G?: boolean }): Promise<UniApp.WifiInfo[]> {
  try {
    const started = await startWifiSafe();
    if (!started) {
      return [];
    }

    const connectedWifi = await getConnectedWifiBestEffort();
    await stopWifiSafe();

    if (connectedWifi) {
      let list = [connectedWifi];
      // 应用频段过滤
      if (options.no24G) {
        list = list.filter((info) => !is24GHz(info));
      }
      if (options.no5G) {
        list = list.filter((info) => !is5GHz(info));
      }
      return list;
    }
    return [];
  } catch (_) {
    return [];
  }
}

// 获取当前连接 Wi‑Fi：优先尝试完整信息，失败再尝试 partialInfo
export async function getConnectedWifiBestEffort(): Promise<UniApp.WifiInfo | null> {
  const full = await getConnectedWifiInternal(false);
  if (full) return full;
  return await getConnectedWifiInternal(true);
}

function getConnectedWifiInternal(partialInfo: boolean): Promise<UniApp.WifiInfo | null> {
  return new Promise<UniApp.WifiInfo | null>((resolve) => {
    try {
      uni.getConnectedWifi({
        partialInfo,
        success: (res: any) => resolve(res?.wifi ?? null),
        fail: () => resolve(null),
        complete: () => { }
      });
    } catch (_) {
      resolve(null);
    }
  });
}

// 根据 signalStrength（越大越强）降序排序；缺失值置后
function sortWifiListBySignal(list: UniApp.WifiInfo[]): UniApp.WifiInfo[] {
  return [...list].sort((a, b) => {
    const sa = (a as any).signalStrength ?? -Infinity;
    const sb = (b as any).signalStrength ?? -Infinity;
    return sb - sa;
  });
}

// 频段过滤：2.4G 与 5G
function is24GHz(info: UniApp.WifiInfo): boolean {
  const f = (info as any).frequency;
  return typeof f === 'number' && f >= 2400 && f < 2500;
}

function is5GHz(info: UniApp.WifiInfo): boolean {
  const f = (info as any).frequency;
  return typeof f === 'number' && f >= 5000 && f < 6000;
}

export function filterWifi24G(list: UniApp.WifiInfo[]): UniApp.WifiInfo[] {
  return list.filter(is24GHz);
}

export function filterWifi5G(list: UniApp.WifiInfo[]): UniApp.WifiInfo[] {
  return list.filter(is5GHz);
}
