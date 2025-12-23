/**
 * Promise 工具函数
 * 将微信小程序的回调式 API 转换为 Promise
 */

/**
 * 将微信小程序 API 转换为 Promise
 * @param api 微信小程序 API 函数
 * @returns 返回 Promise 化的函数
 */
export function promisify(api) {
  return (arg = {}) => {
    const promise = new Promise((resolve, reject) => {
      const promisifyArg = arg;

      api({
        ...promisifyArg,
        success: (res) => {
          if (promisifyArg && typeof promisifyArg.success === 'function') {
            promisifyArg.success(res);
          }
          resolve(res);
        },
        fail: (res) => {
          if (promisifyArg && typeof promisifyArg.fail === 'function') {
            promisifyArg.fail(res);
          }
          reject(res);
        }
      });
    });
    return promise;
  };
}

/**
 * 判断是否为 Promise 对象
 * @param obj 要判断的对象
 * @returns 是否为 Promise
 */
export function isPromise(obj) {
  if (!obj) {
    return false;
  }

  return (
    typeof obj === 'object' && typeof obj.then === 'function' && typeof obj.catch === 'function'
  );
}

/**
 * 预定义的 Promise 化 API
 */
export const promisifiedApis = {
  // 存储相关
  getStorage: promisify(uni.getStorage),
  setStorage: promisify(uni.setStorage),
  removeStorage: promisify(uni.removeStorage),
  clearStorage: promisify(uni.clearStorage),

  // WiFi 相关
  startWifi: promisify(uni.startWifi),
  stopWifi: promisify(uni.stopWifi),
  getWifiList: promisify(uni.getWifiList),
  getConnectedWifi: promisify(uni.getConnectedWifi),
  connectWifi: promisify(uni.connectWifi),

  // 权限相关
  getSetting: promisify(uni.getSetting),
  authorize: promisify(uni.authorize),

  // 蓝牙相关
  openBluetoothAdapter: promisify(uni.openBluetoothAdapter),
  closeBluetoothAdapter: promisify(uni.closeBluetoothAdapter),
  startBluetoothDevicesDiscovery: promisify(uni.startBluetoothDevicesDiscovery),
  stopBluetoothDevicesDiscovery: promisify(uni.stopBluetoothDevicesDiscovery),
  getBluetoothDevices: promisify(uni.getBluetoothDevices),
  getConnectedBluetoothDevices: promisify(uni.getConnectedBluetoothDevices),
  createBLEConnection: promisify(uni.createBLEConnection),
  closeBLEConnection: promisify(uni.closeBLEConnection),
  getBLEDeviceServices: promisify(uni.getBLEDeviceServices),
  getBLEDeviceCharacteristics: promisify(uni.getBLEDeviceCharacteristics),
  readBLECharacteristicValue: promisify(uni.readBLECharacteristicValue),
  writeBLECharacteristicValue: promisify(uni.writeBLECharacteristicValue),
  notifyBLECharacteristicValueChange: promisify(uni.notifyBLECharacteristicValueChange)
};
