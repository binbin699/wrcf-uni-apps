/**
 * WiFi 配置共享工具函数
 * 抽取 WifiConfig 和 ManualConfig 中重复的逻辑
 * 全部使用 Result 模式，不抛异常
 */
import { configProtocol } from './configProtocol';

/** WiFi 配置错误码常量 */
export const WIFI_CONFIG_ERROR = {
  TIMEOUT: 'WIFI_CONFIG_TIMEOUT',
  BLE_RECONNECT_TIMEOUT: 'BLE_RECONNECT_TIMEOUT'
} as const;

/** i18n 翻译函数类型 */
type TranslateFunction = (key: string) => string;

// ===================== WiFi 凭据校验 =====================

/** WiFi 凭据校验结果 */
interface WifiValidationResult {
  valid: boolean;
  message?: string;
}

/** WiFi 名称/密码格式校验正则 */
const WIFI_CREDENTIAL_REGEX = /^[a-zA-Z0-9_\-\s!@#$%^&*()+=.\[\]{}|\\:;"'<>,?/~`\u4e00-\u9fa5]+$/;

/**
 * 校验 WiFi 名称和密码格式
 */
export function validateWifiCredentials(
  ssid: string,
  password: string,
  $t: TranslateFunction
): WifiValidationResult {
  if (!WIFI_CREDENTIAL_REGEX.test(ssid)) {
    return { valid: false, message: $t('net_config.invalid_ssid_format') };
  }
  if (password && !WIFI_CREDENTIAL_REGEX.test(password)) {
    return { valid: false, message: $t('net_config.invalid_password_format') };
  }
  return { valid: true };
}

// ===================== BLE 连接检查 =====================

/** BLE 连接检查结果 */
interface BLEConnectionResult {
  ok: boolean;
  didReconnect?: boolean;
  errCode?: string;
}

/**
 * 检查蓝牙连接并在断开时尝试重连（Result 模式，不抛异常）
 */
export async function ensureBLEConnection(
  deviceId: string,
  timeoutMs = 10000
): Promise<BLEConnectionResult> {
  const isConnected = await configProtocol.checkBLEConnection(deviceId);

  if (isConnected) {
    return { ok: true, didReconnect: false };
  }

  console.log('[WifiConfigHelper] 蓝牙已断开，尝试重新连接');
  try {
    const reconnectPromise = configProtocol.reconnectBLEDevice(deviceId);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('BLE_RECONNECT_TIMEOUT')), timeoutMs);
    });

    await Promise.race([reconnectPromise, timeoutPromise]);
    console.log('[WifiConfigHelper] 蓝牙重连成功');
    return { ok: true, didReconnect: true };
  } catch (err: unknown) {
    const errMsg = (err as Error).message || '';
    console.error('[WifiConfigHelper] 蓝牙重连失败:', err);
    return {
      ok: false,
      errCode:
        errMsg === 'BLE_RECONNECT_TIMEOUT' ? WIFI_CONFIG_ERROR.BLE_RECONNECT_TIMEOUT : undefined
    };
  }
}

// ===================== WiFi 配置发送 =====================

/** WiFi 配置发送结果 */
interface WifiConfigSendResult {
  ok: boolean;
  errCode?: string | number;
  errMsg?: string;
}

/**
 * 通过蓝牙发送 WiFi 配置（Result 模式，带超时，不抛异常）
 */
export async function sendWifiConfig(
  deviceId: string,
  ssid: string,
  password: string,
  timeoutMs = 30000
): Promise<WifiConfigSendResult> {
  try {
    const sendPromise = configProtocol.sendWifiConfig(deviceId, ssid, password);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(WIFI_CONFIG_ERROR.TIMEOUT)), timeoutMs);
    });

    await Promise.race([sendPromise, timeoutPromise]);
    return { ok: true };
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string | number };
    const errMsg = error.message || '';
    console.error('[WifiConfigHelper] WiFi配置发送失败:', err);
    return {
      ok: false,
      errCode: errMsg === WIFI_CONFIG_ERROR.TIMEOUT ? WIFI_CONFIG_ERROR.TIMEOUT : error.code,
      errMsg
    };
  }
}

/**
 * 根据发送结果获取 i18n 错误提示消息
 */
export function getWifiSendErrorMessage(
  result: WifiConfigSendResult,
  $t: TranslateFunction
): string {
  if (result.errCode === WIFI_CONFIG_ERROR.TIMEOUT) {
    return $t('bluetooth.wifi.config_timeout');
  }
  if (
    result.errMsg &&
    (result.errMsg.includes('蓝牙') || result.errMsg.includes('no connection'))
  ) {
    return $t('bluetooth.connection_lost');
  }
  if (result.errCode === 10004 || result.errCode === 10006) {
    return $t('bluetooth.connection_lost');
  }
  return $t('bluetooth.wifi_config_failed');
}
