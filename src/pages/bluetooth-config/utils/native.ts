/**
 * 蓝牙配网模块 — uni API 封装 + UI 工具
 * 统一使用 Result 模式替代 try/catch，扁平化调用流程
 */

// ===================== 蓝牙错误码 =====================

/** 蓝牙 API 标准错误码 */
export const BLE_ERROR_CODE = {
  NOT_INIT: 10000,
  NOT_AVAILABLE: 10001,
  NO_DEVICE: 10002,
  CONNECTION_FAIL: 10003,
  NO_SERVICE: 10004,
  NO_CHARACTERISTIC: 10005,
  NO_CONNECTION: 10006,
  PROPERTY_NOT_SUPPORT: 10007,
  SYSTEM_ERROR: 10008,
  OPERATE_TIMEOUT: 10012
} as const;

// ===================== Result 类型 =====================

/** 通用 Result 类型 */
export interface NativeResult<T = undefined> {
  ok: boolean;
  data?: T;
  errCode?: number;
  errMsg?: string;
}

// ===================== 工具函数 =====================

/**
 * 从蓝牙错误对象中提取标准错误码（兼容不同平台的 code / errCode / errMsg）
 */
export function getBLEErrorCode(err: unknown): number | undefined {
  const e = err as Record<string, unknown>;
  if (typeof e.code === 'number') return e.code;
  if (typeof e.errCode === 'number') return e.errCode;
  // 兜底：从 errMsg 反推 code
  const msg = String(e.errMsg || e.message || '');
  if (msg.includes('not available') || msg.includes('not turned on'))
    return BLE_ERROR_CODE.NOT_AVAILABLE;
  if (msg.includes('no connection')) return BLE_ERROR_CODE.NO_CONNECTION;
  if (msg.includes('not init')) return BLE_ERROR_CODE.NOT_INIT;
  if (msg.includes('property not support')) return BLE_ERROR_CODE.PROPERTY_NOT_SUPPORT;
  return undefined;
}

/**
 * 将可能抛异常的异步操作包装为 Result 模式
 * 用于包装未改造的第三方/底层 API（如 configProtocol 的方法）
 */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<NativeResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    return {
      ok: false,
      errCode: getBLEErrorCode(err),
      errMsg: String(e.message || e.errMsg || err)
    };
  }
}

// ===================== 蓝牙 API 封装 =====================

/** 开启蓝牙适配器 */
export function openBluetoothAdapter(): Promise<NativeResult> {
  return new Promise((resolve) => {
    uni.openBluetoothAdapter({
      success: () => resolve({ ok: true }),
      fail: (err) => {
        console.error('[native] 蓝牙适配器开启失败:', err);
        resolve({
          ok: false,
          errCode: getBLEErrorCode(err),
          errMsg: err.errMsg
        });
      }
    });
  });
}

// ===================== UI 工具 =====================

/** i18n 翻译函数类型 */
type TranslateFunction = (key: string) => string;

/** 统一 toast（默认 3s, icon: none） */
export function toast(title: string, duration = 3000) {
  uni.showToast({ title, icon: 'none', duration });
}

/** 统一 loading（mask: true） */
export function showLoading(title: string) {
  uni.showLoading({ title, mask: true });
}

/** 隐藏 loading */
export function hideLoading() {
  uni.hideLoading();
}

/** 蓝牙未开启弹窗（多处复用） */
export function showBluetoothDisabledModal($t: TranslateFunction) {
  uni.showModal({
    title: $t('bluetooth.bluetooth_disabled_title'),
    content: $t('bluetooth.bluetooth_disabled_content'),
    showCancel: false,
    confirmText: $t('common.confirm')
  });
}
