import { AppInfo } from '@/const';
// @ts-ignore
import { BleLib } from '@/uni_modules/android-ble';

type AnyFn = (...args: any[]) => void;

type HarmonyScanResult = {
  type?: number;
  message?: string;
  data?: {
    rssi?: number;
    scanRecord?: {
      deviceName?: string | null;
    } | null;
    device?: {
      name?: string | null;
      alias?: string | null;
      iosLocalName?: string | null;
      address?: string;
    };
  };
};

export interface BleScanOptions {
  allowDuplicatesKey?: boolean;
}

export interface BleNotifyOptions {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  state: boolean;
}

export interface BleWriteOptions {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  value: ArrayBuffer;
}

export interface BleCharacteristicChange {
  deviceId: string;
  serviceId?: string;
  characteristicId?: string;
  value: ArrayBuffer;
}

export interface BleConnectionChange {
  deviceId: string;
  connected: boolean;
}

export interface BleServiceAdapter {
  platform: 'uni' | 'harmony-plugin';
  openAdapter(): Promise<any>;
  closeAdapter(): Promise<any>;
  startScan(options?: BleScanOptions): Promise<any>;
  stopScan(): Promise<any>;
  getDevices(): Promise<{ devices?: any[] }>;
  getConnectedDevices(serviceUuids: string[]): Promise<{ devices?: any[] }>;
  onDeviceFound(listener: AnyFn): void;
  offDeviceFound(listener?: AnyFn): void;
  connect(deviceId: string): Promise<any>;
  disconnect(deviceId: string): Promise<any>;
  getServices(deviceId: string): Promise<{ services?: any[] }>;
  getCharacteristics(deviceId: string, serviceId: string): Promise<any>;
  setMtu(deviceId: string, mtu: number): Promise<any>;
  getMtu(deviceId: string, writeType?: 'write' | 'read'): Promise<any>;
  enableNotify(options: BleNotifyOptions): Promise<any>;
  write(options: BleWriteOptions): Promise<any>;
  onConnectionChange(listener: (payload: BleConnectionChange) => void): void;
  offConnectionChange(listener?: (payload: BleConnectionChange) => void): void;
  onCharacteristicValueChange(listener: (payload: BleCharacteristicChange) => void): void;
  offCharacteristicValueChange(listener?: (payload: BleCharacteristicChange) => void): void;
}

function promiseFromUni<T = any>(fn: (options: any) => void, options: Record<string, any> = {}) {
  return new Promise<T>((resolve, reject) => {
    fn({
      ...options,
      success: (res: T) => resolve(res),
      fail: (err: any) => reject(err)
    });
  });
}

function createArrayBufferFromBytes(bytes: number[] = []) {
  return new Uint8Array(bytes).buffer;
}

function arrayBufferToBytes(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer));
}

function normalizeHarmonyDeviceResult(res: HarmonyScanResult) {
  const rawDevice = res?.data?.device || {};
  const deviceId = String(rawDevice.address || '');
  return {
    deviceId,
    name: String(rawDevice.name || rawDevice.alias || ''),
    localName: String(rawDevice.iosLocalName || res?.data?.scanRecord?.deviceName || ''),
    RSSI: Number(res?.data?.rssi ?? -999)
  };
}

function normalizeHarmonyError(
  res: { type?: number; message?: string } | undefined,
  context: 'permission' | 'gatt' = 'gatt'
) {
  const type = res?.type;
  const message = res?.message || '';

  // 插件中 10001 既可能表示权限问题，也可能表示 GATT 读写失败
  if (type === 10001) {
    if (context === 'permission') {
      return { errCode: 10001, errMsg: 'auth deny' };
    }
    return {
      errCode: 10001,
      errMsg: message || 'GATT operation failed'
    };
  }
  if (type === 10002) {
    return { errCode: 10001, errMsg: 'not available' };
  }
  if (type === 10005) {
    return { errCode: 10002, errMsg: 'invalid device id' };
  }
  if (type === 1001) {
    return { errCode: 1001, errMsg: message || 'notify subscribe failed' };
  }

  return {
    errCode: type || -1,
    errMsg: message || 'Harmony BLE plugin error'
  };
}

const uniBleService: BleServiceAdapter = {
  platform: 'uni',

  openAdapter() {
    return promiseFromUni(uni.openBluetoothAdapter);
  },

  closeAdapter() {
    return promiseFromUni(uni.closeBluetoothAdapter);
  },

  startScan(options = {}) {
    return promiseFromUni(uni.startBluetoothDevicesDiscovery, options);
  },

  stopScan() {
    return promiseFromUni(uni.stopBluetoothDevicesDiscovery);
  },

  getDevices() {
    return promiseFromUni(uni.getBluetoothDevices);
  },

  getConnectedDevices(serviceUuids: string[]) {
    return promiseFromUni(uni.getConnectedBluetoothDevices, { services: serviceUuids });
  },

  onDeviceFound(listener: AnyFn) {
    uni.onBluetoothDeviceFound(listener);
  },

  offDeviceFound(listener?: AnyFn) {
    if (typeof uni.offBluetoothDeviceFound === 'function') {
      const off = uni.offBluetoothDeviceFound as unknown as (callback?: AnyFn) => void;
      off(listener);
    }
  },

  connect(deviceId: string) {
    return promiseFromUni(uni.createBLEConnection, { deviceId });
  },

  disconnect(deviceId: string) {
    return promiseFromUni(uni.closeBLEConnection, { deviceId });
  },

  getServices(deviceId: string) {
    return promiseFromUni(uni.getBLEDeviceServices, { deviceId });
  },

  getCharacteristics(deviceId: string, serviceId: string) {
    return promiseFromUni(uni.getBLEDeviceCharacteristics, { deviceId, serviceId });
  },

  setMtu(deviceId: string, mtu: number) {
    return promiseFromUni(uni.setBLEMTU, { deviceId, mtu });
  },

  getMtu(deviceId: string, writeType: 'write' | 'read' = 'write') {
    if (typeof uni.getBLEMTU !== 'function') {
      return Promise.reject(new Error('uni.getBLEMTU API 不存在'));
    }
    return promiseFromUni(uni.getBLEMTU, { deviceId, writeType });
  },

  enableNotify(options: BleNotifyOptions) {
    return promiseFromUni(uni.notifyBLECharacteristicValueChange, options);
  },

  write(options: BleWriteOptions) {
    return promiseFromUni(uni.writeBLECharacteristicValue, options);
  },

  onConnectionChange(listener: (payload: BleConnectionChange) => void) {
    uni.onBLEConnectionStateChange(listener);
  },

  offConnectionChange(listener?: (payload: BleConnectionChange) => void) {
    if (typeof uni.offBLEConnectionStateChange === 'function') {
      const off = uni.offBLEConnectionStateChange as unknown as (callback?: (payload: BleConnectionChange) => void) => void;
      off(listener);
    }
  },

  onCharacteristicValueChange(listener: (payload: BleCharacteristicChange) => void) {
    uni.onBLECharacteristicValueChange((result) => {
      listener({
        deviceId: result.deviceId,
        serviceId: result.serviceId,
        characteristicId: result.characteristicId,
        value: result.value as unknown as ArrayBuffer
      });
    });
  },

  offCharacteristicValueChange(listener?: (payload: BleCharacteristicChange) => void) {
    if (typeof uni.offBLECharacteristicValueChange === 'function') {
      const off = uni.offBLECharacteristicValueChange as unknown as (callback?: (payload: BleCharacteristicChange) => void) => void;
      off(listener);
    }
  }
};

const harmonyDeviceListeners = new Set<AnyFn>();
const harmonyConnectionListeners = new Set<(payload: BleConnectionChange) => void>();
const harmonyValueListeners = new Set<(payload: BleCharacteristicChange) => void>();
const harmonyDevices = new Map<string, any>();
let harmonyLib: any = null;
let harmonyConnectedDeviceId = '';
let harmonyServices: any[] = [];
let harmonyScanActive = false;

function getHarmonyLib() {
  if (!harmonyLib) {
    harmonyLib = new BleLib();
  }
  return harmonyLib;
}

function normalizeUuid(uuid?: string | null) {
  return String(uuid || '').trim().toUpperCase();
}

function findHarmonyUuidSelectionIndex(serviceId: string, characteristicId?: string) {
  const targetServiceId = normalizeUuid(serviceId);
  const targetCharacteristicId = normalizeUuid(characteristicId);
  let wnIndex = -1;

  for (const service of harmonyServices) {
    const characteristics = Array.isArray(service?.characteristics) ? service.characteristics : [];
    const notifyChar = characteristics.find((item: any) => item?.properties?.NOTIFY || item?.properties?.INDICATE);
    const writeChar = characteristics.find((item: any) => item?.properties?.WRITE);

    if (!notifyChar || !writeChar) {
      continue;
    }

    wnIndex += 1;

    const serviceMatched = normalizeUuid(service?.uuid) === targetServiceId;
    const characteristicMatched = !targetCharacteristicId || characteristics.some((item: any) => normalizeUuid(item?.uuid) === targetCharacteristicId);

    if (serviceMatched && characteristicMatched) {
      return wnIndex;
    }
  }

  return -1;
}

function resolveHarmonyServiceId(fallback: string) {
  console.log('[bleService:harmony] 直接使用业务侧 service UUID', { serviceId: fallback });
  return fallback;
}

function resolveHarmonyNotifyId(fallback: string, serviceId = '') {
  console.log('[bleService:harmony] 直接使用业务侧 notify UUID', {
    serviceId,
    characteristicId: fallback
  });
  return fallback;
}

function resolveHarmonyWriteId(fallback: string, serviceId = '') {
  console.log('[bleService:harmony] 直接使用业务侧 write UUID', {
    serviceId,
    characteristicId: fallback
  });
  return fallback;
}

function emitHarmonyDevice(device: any) {
  harmonyDeviceListeners.forEach((listener) => listener({ devices: [device] }));
}

function emitHarmonyConnection(payload: BleConnectionChange) {
  harmonyConnectionListeners.forEach((listener) => listener(payload));
}

function emitHarmonyValue(payload: BleCharacteristicChange) {
  harmonyValueListeners.forEach((listener) => listener(payload));
}

const harmonyBleService: BleServiceAdapter = {
  platform: 'harmony-plugin',

  openAdapter() {
    const lib = getHarmonyLib();
    return new Promise((resolve, reject) => {
      lib.reqBtPer((granted: boolean) => {
        if (!granted) {
          reject(normalizeHarmonyError({ type: 10001, message: 'auth deny' }, 'permission'));
          reject({ errCode: 10001, errMsg: 'auth deny' });
          return;
        }
        if (!lib.isEnabled()) {
          reject(normalizeHarmonyError({ type: 10002, message: 'not available' }, 'permission'));
          reject({ errCode: 10001, errMsg: 'not available' });
          return;
        }
        resolve({ ok: true });
      });
    });
  },

  closeAdapter() {
    const lib = getHarmonyLib();
    return Promise.resolve().then(() => {
      const connected = typeof lib.isConnected === 'function' && lib.isConnected();
      if (harmonyScanActive) {
        try {
          lib.stopScanBle?.();
        } catch {}
      }
      try {
        if (connected) {
          lib.close?.();
        } else {
          lib.disposePassive?.();
        }
      } catch {}
      if (harmonyConnectedDeviceId) {
        emitHarmonyConnection({ deviceId: harmonyConnectedDeviceId, connected: false });
      }
      harmonyConnectedDeviceId = '';
      harmonyServices = [];
      harmonyScanActive = false;
      harmonyLib = null;
      return { ok: true };
    });
  },

  startScan(options = {}) {
    const lib = getHarmonyLib();
    harmonyDevices.clear();
    harmonyScanActive = true;
    return new Promise((resolve, reject) => {
      let settled = false;
      lib.onStartScanBle({
        scantime: 10 * 1000,
        showEmptyName: options.allowDuplicatesKey ? 1 : 1,
        onScanResult: (res: HarmonyScanResult) => {
          if (res?.type !== 0) {
            harmonyScanActive = false;
            if (!settled) {
              settled = true;
              reject(normalizeHarmonyError(res));
            }
            return;
          }

          const device = normalizeHarmonyDeviceResult(res);
          if (!device.deviceId) {
            return;
          }

          harmonyDevices.set(device.deviceId, device);
          emitHarmonyDevice(device);

          if (!settled) {
            settled = true;
            resolve({ ok: true });
          }
        },
        scanComplate: () => {
          harmonyScanActive = false;
          if (!settled) {
            settled = true;
            resolve({ ok: true });
          }
        }
      });
    });
  },

  stopScan() {
    const lib = getHarmonyLib();
    return Promise.resolve().then(() => {
      if (!harmonyScanActive) {
        return { ok: true, skipped: true };
      }
      lib.stopScanBle();
      harmonyScanActive = false;
      return { ok: true };
    });
  },

  getDevices() {
    return Promise.resolve({
      devices: Array.from(harmonyDevices.values())
    });
  },

  getConnectedDevices() {
    if (!harmonyConnectedDeviceId) {
      return Promise.resolve({ devices: [] });
    }
    const device = harmonyDevices.get(harmonyConnectedDeviceId) || {
      deviceId: harmonyConnectedDeviceId,
      name: '',
      localName: '',
      RSSI: 0
    };
    return Promise.resolve({ devices: [device] });
  },

  onDeviceFound(listener: AnyFn) {
    harmonyDeviceListeners.add(listener);
  },

  offDeviceFound(listener?: AnyFn) {
    if (listener) {
      harmonyDeviceListeners.delete(listener);
      return;
    }
    harmonyDeviceListeners.clear();
  },

  connect(deviceId: string) {
    const lib = getHarmonyLib();
    console.log('[bleService:harmony] 开始连接设备', { deviceId });
    return new Promise((resolve, reject) => {
      let settled = false;
      lib.connect(deviceId, false, (res: any) => {
        console.log('[bleService:harmony] 连接回调', res);
        if (res?.type === 0 || res?.type === 10004) {
          harmonyConnectedDeviceId = deviceId;
          emitHarmonyConnection({ deviceId, connected: true });
          if (!settled) {
            settled = true;
            resolve(res);
          }
          return;
        }

        if (res?.type === 10001) {
          emitHarmonyConnection({ deviceId, connected: false });
          if (!settled) {
            settled = true;
            reject(normalizeHarmonyError(res));
          }
          return;
        }

        if (!settled) {
          settled = true;
          reject(normalizeHarmonyError(res));
        }
      });
    });
  },

  disconnect(deviceId: string) {
    const lib = getHarmonyLib();
    return Promise.resolve().then(() => {
      const connected = typeof lib.isConnected === 'function' && lib.isConnected();
      if (connected) {
        lib.close();
      } else {
        if (harmonyScanActive) {
          lib.stopScanBle?.();
        }
        lib.disposePassive?.();
      }
      if (harmonyConnectedDeviceId || deviceId) {
        emitHarmonyConnection({ deviceId: harmonyConnectedDeviceId || deviceId, connected: false });
      }
      harmonyConnectedDeviceId = '';
      harmonyScanActive = false;
      harmonyLib = null;
      harmonyServices = [];
      return { ok: true };
    });
  },

  getServices() {
    const lib = getHarmonyLib();
    return new Promise((resolve, reject) => {
      lib.scanServices((res: any) => {
        console.log('[bleService:harmony] 扫描服务结果', res);
        if (res?.type !== 0) {
          reject(normalizeHarmonyError(res));
          return;
        }
        const services = Array.isArray(res?.data)
          ? res.data.map((service: any) => ({
              ...service,
              isPrimary: true
            }))
          : [];
        harmonyServices = services;
        console.log('[bleService:harmony] 当前服务列表', services.map((service: any) => ({
          uuid: service?.uuid,
          characteristics: Array.isArray(service?.characteristics)
            ? service.characteristics.map((item: any) => ({ uuid: item?.uuid, properties: item?.properties }))
            : []
        })));
        resolve({ services });
      });
    });
  },

  getCharacteristics(deviceId: string, serviceId: string) {
    const service = harmonyServices.find((item) => item.uuid === serviceId);
    return Promise.resolve({
      deviceId,
      serviceId,
      characteristics: service?.characteristics || []
    });
  },

  setMtu(deviceId: string, mtu: number) {
    const lib = getHarmonyLib();
    if (typeof lib.setMtu !== 'function') {
      return Promise.resolve({ deviceId, mtu, unsupported: true });
    }
    return new Promise((resolve) => {
      lib.setMtu(mtu, (res: any) => resolve(res));
    });
  },

  getMtu(deviceId: string, writeType: 'write' | 'read' = 'write') {
    return Promise.resolve({ deviceId, writeType, unsupported: true });
  },

  enableNotify(options: BleNotifyOptions) {
    const lib = getHarmonyLib();
    const signature = `${options.serviceId}:${options.characteristicId}:${options.state}`;
    const serviceId = resolveHarmonyServiceId(options.serviceId);
    const characteristicId = resolveHarmonyNotifyId(options.characteristicId, options.serviceId);

    if (!options.state) {
      return new Promise((resolve) => {
        try {
          if (typeof lib.onNotityBleData === 'function') {
            lib.onNotityBleData(serviceId, characteristicId, false, () => {});
          }
        } catch {}
        resolve({ ok: true });
      });
    }

    return new Promise((resolve, reject) => {
      console.log('[bleService:harmony] 注册通知', {
        requestedServiceId: options.serviceId,
        requestedCharacteristicId: options.characteristicId,
        actualServiceId: serviceId,
        actualCharacteristicId: characteristicId,
        deviceId: options.deviceId
      });
      let settled = false;
      const resolveOnce = (payload: { ok: true }) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(payload);
      };
      const rejectOnce = (error: { errCode: number; errMsg: string }) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      };

      const timeoutId = setTimeout(() => {
        rejectOnce({ errCode: 10012, errMsg: 'notify subscribe timeout' });
      }, 8000);

      lib.onNotityBleData(
        serviceId,
        characteristicId,
        true,
        (res: { type?: number; message?: string; data?: { data?: number[]; serviceId?: string; characteristicsId?: string } }) => {
          console.log('[bleService:harmony] 通知回调', res);
          if (res?.type === 1000) {
            resolveOnce({ ok: true });
            return;
          }

          if (res?.type === 0) {
            const payload = res?.data || {};
            emitHarmonyValue({
              deviceId: harmonyConnectedDeviceId || options.deviceId,
              serviceId: payload.serviceId || serviceId,
              characteristicId: payload.characteristicsId || characteristicId,
              value: createArrayBufferFromBytes(payload.data || [])
            });
            return;
          }

          if (res?.type === 1001) {
            rejectOnce(normalizeHarmonyError(res));
          }
        }
      );

      resolveOnce({ ok: true, implicit: true });
    });
  },

  write(options: BleWriteOptions) {
    const lib = getHarmonyLib();
    const serviceId = resolveHarmonyServiceId(options.serviceId);
    const characteristicId = resolveHarmonyWriteId(options.characteristicId, options.serviceId);
    const data = arrayBufferToBytes(options.value);

    const attemptWrite = (writeType?: number) =>
      new Promise((resolve, reject) => {
        console.log('[bleService:harmony] 写入数据', {
          requestedServiceId: options.serviceId,
          requestedCharacteristicId: options.characteristicId,
          actualServiceId: serviceId,
          actualCharacteristicId: characteristicId,
          deviceId: options.deviceId,
          writeType,
          bytes: data.map((item) => item.toString(16).padStart(2, '0')).join(' ')
        });
        lib.sendData(
          {
            serviceId,
            characteristicId,
            fenbao: false,
            data,
            writeType
          },
          (res: { type?: number; message?: string }) => {
            console.log('[bleService:harmony] 写入回调', res);
            if (res?.type === 0 || res?.type === undefined) {
              resolve(res || { ok: true });
              return;
            }
            reject(normalizeHarmonyError(res));
          }
        );
      });

    return attemptWrite()
      .catch((firstError: { errCode?: number }) => {
        if (firstError?.errCode !== 10001) {
          throw firstError;
        }
        console.warn('[bleService:harmony] 默认写入失败，尝试 WRITE_NO_RESPONSE');
        return attemptWrite(1);
      });
  },

  onConnectionChange(listener: (payload: BleConnectionChange) => void) {
    harmonyConnectionListeners.add(listener);
  },

  offConnectionChange(listener?: (payload: BleConnectionChange) => void) {
    if (listener) {
      harmonyConnectionListeners.delete(listener);
      return;
    }
    harmonyConnectionListeners.clear();
  },

  onCharacteristicValueChange(listener: (payload: BleCharacteristicChange) => void) {
    harmonyValueListeners.add(listener);
  },

  offCharacteristicValueChange(listener?: (payload: BleCharacteristicChange) => void) {
    if (listener) {
      harmonyValueListeners.delete(listener);
      return;
    }
    harmonyValueListeners.clear();
  }
};

function resolveBleService(): BleServiceAdapter {
  return AppInfo.isHarmonyApp() ? harmonyBleService : uniBleService;
}

export const bleService = resolveBleService();

/**
 * Harmony BLE 插件在页面 onUnload 阶段做 native close/dispose 容易把上一页交互拖死。
 * 这里采用“全局单例 + 页面不销毁插件”的策略，只在 App 退后台时做一次温和收口。
 */
export async function handleBleAppHide() {
  if (!AppInfo.isHarmonyApp()) {
    return;
  }

  if (harmonyScanActive) {
    try {
      await harmonyBleService.stopScan();
    } catch (error) {
      console.log('[bleService:harmony] App 退后台时停止扫描失败:', error);
    }
  }

  harmonyDeviceListeners.clear();
}
