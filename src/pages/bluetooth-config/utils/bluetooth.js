/**
 * 蓝牙配网核心逻辑
 * 基于 Remax 版本重写，适配 uni-app
 */

/**
 * 蓝牙服务配置
 */
export const bluetoothService = {
  PRIMARY_SERVICE_UUID: '0000FFFF-0000-1000-8000-00805F9B34FB',
  SEND_CHARACTERISTIC_UUID: '0000FF01-0000-1000-8000-00805F9B34FB',
  RECEIVE_CHARACTERISTIC_UUID: '0000FF02-0000-1000-8000-00805F9B34FB'
};

/**
 * 设备名称正则表达式
 * 通过 APP_CONFIG.BLE_FILTER_ENABLED 控制是否启用筛选，默认启用
 * 
 * 调试提示：如果扫描不到设备，可以临时将 deviceNameReg 改为 deviceNameRegAll
 */
const deviceNameRegFiltered = /^(DTXZ|BLUFI_DEVICE|ESP_|aichat_)/i;
const deviceNameRegAll = /.*/; // 匹配所有设备

// 🔧 临时禁用设备过滤，用于调试
// const deviceNameReg = APP_CONFIG.BLE_FILTER_ENABLED ? deviceNameRegFiltered : deviceNameRegAll;
const deviceNameReg = deviceNameRegAll; // 暂时显示所有设备

/**
 * Android 12+ 蓝牙权限请求
 * 必须在调用任何蓝牙 API 之前请求权限
 */
async function requestAndroid12BluetoothPermissions() {
  // 使用新的 API 替代已废弃的 getSystemInfoSync
  const deviceInfo = uni.getDeviceInfo();
  const appBaseInfo = uni.getAppBaseInfo();

  // 只在 Android 12+ 上需要
  if (deviceInfo.platform !== 'android') {
    return true;
  }

  const osVersion = parseFloat(deviceInfo.osVersion || '0');
  if (osVersion < 12) {
    console.log('[蓝牙] Android', osVersion, '不需要新权限');
    return true;
  }

  // 检查 plus.android 是否可用
  if (typeof plus === 'undefined' || !plus.android) {
    console.warn('[蓝牙] plus.android 不可用');
    return true;
  }

  console.log('[蓝牙] Android 12+，请求蓝牙权限...');

  return new Promise((resolve) => {
    plus.android.requestPermissions(
      [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION'
      ],
      (result) => {
        console.log('[蓝牙] 权限请求结果:', JSON.stringify(result));

        if (result.granted && result.granted.length > 0) {
          console.log('[蓝牙] 已授予权限:', result.granted);
          resolve(true);
        } else if (result.deniedAlways && result.deniedAlways.length > 0) {
          console.warn('[蓝牙] 永久拒绝的权限:', result.deniedAlways);
          uni.showModal({
            title: '需要蓝牙权限',
            content: '请在系统设置中授予蓝牙和位置权限，否则无法扫描设备',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                plus.runtime.openURL('app-settings:');
              }
            }
          });
          resolve(false);
        } else if (result.deniedPresent && result.deniedPresent.length > 0) {
          console.warn('[蓝牙] 本次拒绝的权限:', result.deniedPresent);
          resolve(false);
        } else {
          // 可能已经有权限了
          resolve(true);
        }
      },
      (error) => {
        console.error('[蓝牙] 权限请求错误:', error);
        resolve(true); // 出错时不阻断流程
      }
    );
  });
}

/**
 * 初始化蓝牙模块
 */
export async function initBluetooth() {
  try {
    console.log('[蓝牙] 初始化蓝牙模块');

    // Android 12+ 必须先请求权限
    const permissionGranted = await requestAndroid12BluetoothPermissions();
    if (!permissionGranted) {
      throw new Error('蓝牙权限未授予，请授予权限后重试');
    }

    await uni.openBluetoothAdapter();
    console.log('[蓝牙] 蓝牙模块初始化成功');
  } catch (error) {
    console.error('[蓝牙] 蓝牙模块初始化失败:', error);

    // 处理 "already opened" 错误 - 蓝牙适配器已经打开，不是真正的错误
    const errMsg = error?.errMsg || error?.message || String(error);
    if (errMsg.includes('already opened') || errMsg.includes('already open')) {
      console.log('[蓝牙] 蓝牙适配器已经打开，继续执行');
      return; // 直接返回，不抛出错误
    }

    // 处理蓝牙未开启的情况
    if (errMsg.includes('not available') || errMsg.includes('not turned on') || errMsg.includes('未开启')) {
      throw new Error('请开启手机蓝牙后重试');
    }

    // 处理权限问题
    if (errMsg.includes('auth deny') || errMsg.includes('permission') || errMsg.includes('authorize')) {
      throw new Error('请授权蓝牙权限后重试');
    }

    // 其他未知错误
    throw new Error(`蓝牙初始化失败: ${errMsg}`);
  }
}

/**
 * 重置蓝牙模块
 * 注意：某些情况下蓝牙适配器可能已经关闭，stopBluetoothDevicesDiscovery 和 closeBluetoothAdapter 
 * 会失败，这些错误应该被安全忽略
 */
export async function resetBluetooth() {
  try {
    console.log('[蓝牙] 重置蓝牙模块');

    // 尝试停止设备发现，忽略可能的错误
    try {
      await uni.stopBluetoothDevicesDiscovery();
      console.log('[蓝牙] 已停止设备发现');
    } catch (e) {
      console.log('[蓝牙] 停止设备发现失败（可忽略）:', e?.errMsg || e);
    }

    // 尝试关闭蓝牙适配器，忽略可能的错误
    try {
      await uni.closeBluetoothAdapter();
      console.log('[蓝牙] 已关闭蓝牙适配器');
    } catch (e) {
      console.log('[蓝牙] 关闭蓝牙适配器失败（可忽略）:', e?.errMsg || e);
    }

    // 等待一段时间确保蓝牙模块完全关闭
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 重新初始化
    await initBluetooth();
    console.log('[蓝牙] 蓝牙模块重置成功');
  } catch (error) {
    console.error('蓝牙模块重置失败:', error);
    throw error;
  }
}

/**
 * 搜索蓝牙设备
 * @returns {Promise<Array>} 设备列表
 */
export async function searchBluetoothDevices() {
  try {
    console.log('===== 开始搜索蓝牙设备 =====');

    // 使用新的 API 替代已废弃的 getSystemInfoSync
    const deviceInfo = uni.getDeviceInfo();
    console.log('[蓝牙扫描] 系统:', deviceInfo.platform, deviceInfo.osVersion);

    // 先尝试停止之前的搜索（忽略错误）
    try {
      await uni.stopBluetoothDevicesDiscovery();
      console.log('[蓝牙扫描] 已停止之前的设备发现');
    } catch (e) {
      // 忽略错误，可能之前没有在搜索
    }

    // 开始搜索
    console.log('[蓝牙扫描] 调用 startBluetoothDevicesDiscovery...');
    try {
      await uni.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false
      });
      console.log('[蓝牙扫描] startBluetoothDevicesDiscovery 成功');
    } catch (discoverError) {
      const errMsg = discoverError?.errMsg || String(discoverError);
      // 如果已经在搜索中，忽略错误继续执行
      if (errMsg.includes('already discovering')) {
        console.log('[蓝牙扫描] 设备发现已在进行中，继续获取设备列表');
      } else {
        throw discoverError;
      }
    }

    // 等待一段时间以收集设备（增加到3秒）
    console.log('[蓝牙扫描] 等待 3 秒收集设备...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 获取搜索到的设备
    console.log('[蓝牙扫描] 调用 getBluetoothDevices...');
    const result = await uni.getBluetoothDevices();
    const devices = result.devices || [];

    console.log('[蓝牙扫描] ===== 扫描结果 =====');
    console.log('[蓝牙扫描] 原始设备数量:', devices.length);

    // 打印每个设备的信息
    devices.forEach((device, index) => {
      console.log(`[蓝牙扫描] 设备${index + 1}: name=${device.name || '无名称'}, localName=${device.localName || '无'}, deviceId=${device.deviceId}, RSSI=${device.RSSI}`);
    });

    console.log('蓝牙-搜索到的设备:', devices);
    return devices;
  } catch (error) {
    console.error('搜索蓝牙设备失败:', error);

    // 🔧 错误弹窗
    uni.showModal({
      title: '蓝牙扫描失败',
      content: `错误: ${error.message || error.errMsg || JSON.stringify(error)}`,
      showCancel: false
    });

    throw error;
  }
}

/*处理设置失败安卓协商低功耗最大传输单元*/
function setAndroidMTU(deviceId) {
  console.log('处理安卓协商低功耗最大传输单元失败的方法');
  console.log('开始循环设置MTU值');
  let retryCount = 0;
  const maxRetries = 5;

  const mtuTimer = setInterval(() => {
    retryCount++;
    if (retryCount > maxRetries) {
      console.log('MTU设置重试次数已达上限，停止重试');
      clearInterval(mtuTimer);
      return;
    }

    uni.setBLEMTU({
      deviceId: deviceId,
      mtu: 247,
      success(res) {
        console.log('设置mtu成功', res);
        clearInterval(mtuTimer);
      },
      fail(err) {
        console.error('设置MTU失败:', err);
      },
      complete() {
        // 检查 getBLEMTU API 是否存在
        if (typeof uni.getBLEMTU === 'function') {
          uni.getBLEMTU({
            deviceId: deviceId,
            writeType: 'write',
            success(res) {
              console.log('获取MTU成功:', res);
              clearInterval(mtuTimer);
            },
            fail(err) {
              console.log('获取MTU失败:', err);
            }
          });
        } else {
          // API 不存在时，直接在成功后停止
          console.log('uni.getBLEMTU API 不存在');
        }
      }
    });
  }, 1500);
}

/**
 * 连接蓝牙设备
 * @param {string} deviceId - 设备ID
 */
export async function connectBluetoothDevice(deviceId) {
  try {
    console.log('连接蓝牙设备:', deviceId);

    // 创建连接
    await uni.createBLEConnection({ deviceId });
    console.log('蓝牙设备连接成功');

    // 获取设备服务
    const servicesResult = await uni.getBLEDeviceServices({ deviceId });
    console.log('获取到的服务:', servicesResult.services);

    // 存储所有特性处理的 Promise
    const characteristicPromises = servicesResult.services
      .filter((service) => service.isPrimary) // 只处理主服务
      .map(async (service) => {
        // 使用固定的UUID配置，不再动态获取
        // bluetoothService.PRIMARY_SERVICE_UUID = service.uuid

        await uni.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid
        });
      });

    // 使用新的 API 替代已废弃的 getSystemInfoSync
    const deviceInfo = uni.getDeviceInfo();
    if (deviceInfo.platform === 'android')
      uni.setBLEMTU({
        deviceId: deviceId,
        mtu: 247,
        success: (res) => {
          console.log('设置mtu成功');
          // 检查 getBLEMTU API 是否存在（某些 uni-app 版本不支持）
          if (typeof uni.getBLEMTU === 'function') {
            uni.getBLEMTU({
              deviceId: deviceId,
              writeType: 'write',
              success(res) {
                console.log('获取MTU成功:', res);
              },
              fail(err) {
                console.log('获取MTU失败:', err);
              }
            });
          } else {
            console.log('uni.getBLEMTU API 不存在，跳过');
          }
        },
        fail: (err) => {
          console.log('设置mtu失败:', err);
          setAndroidMTU(deviceId);
        }
      });

    // 等待所有特性处理完成
    await Promise.all(characteristicPromises);

    console.log('蓝牙设备连接并配置完成');
  } catch (error) {
    console.error('连接蓝牙设备失败:', error);
    throw error;
  }
}

/**
 * 获取已连接的蓝牙设备
 * @returns {Promise<Array>} 已连接的设备列表
 */
export async function getConnectedBluetoothDevices() {
  try {
    if (!bluetoothService.PRIMARY_SERVICE_UUID) {
      console.log('蓝牙设备未连接');
      return [];
    }

    const result = await uni.getConnectedBluetoothDevices({
      services: [bluetoothService.PRIMARY_SERVICE_UUID] // 指定特定服务
    });

    console.log('已连接的设备:', result.devices);
    return result.devices || [];
  } catch (error) {
    console.error('获取已连接设备失败:', error);
    return [];
  }
}

/**
 * 对设备列表去重，保留信号最强的
 * @param {Array} deviceList - 设备列表
 * @returns {Array} 去重后的设备列表
 */
export function dedupeDeviceList(deviceList) {
  const deviceMap = new Map();

  deviceList.forEach((device) => {
    const existingDevice = deviceMap.get(device.deviceId);
    // 如果是新的设备或者信号比已存在的强，则更新
    if (!existingDevice || device.RSSI > existingDevice.RSSI) {
      deviceMap.set(device.deviceId, device);
    }
  });

  return Array.from(deviceMap.values());
}

/**
 * 过滤有效设备
 * @param {Array} devices - 设备列表
 * @param {boolean} isIOS - 是否为iOS设备
 * @returns {Array} 过滤后的设备列表
 */
export function filterValidDevices(devices, isIOS = false) {
  if (isIOS) {
    // iOS设备根据localName或name过滤，有一项符合条件即可
    return devices.filter(
      (item) =>
        (item.localName && deviceNameReg.test(item.localName)) ||
        (item.name && deviceNameReg.test(item.name))
    );
  } else {
    // Android设备只根据name过滤
    return devices.filter((item) => item.name && deviceNameReg.test(item.name));
  }
}

/**
 * 对设备列表规范化MAC地址
 *
 * 依次对设备的`localName`, `name`, `deviceId`进行正则匹配，
 * 匹配成功则提取MAC地址。
 * - 在 Android 上，将 deviceId 替换为 MAC 地址
 * - 在 iOS 上，保留原始 deviceId（UUID 格式，用于连接），将 MAC 地址存储在 macAddress 字段
 *
 * @param {Array} deviceList - 设备列表
 * @param {boolean} isIOS - 是否为 iOS 平台
 * @returns {[Array, Array]} 规范化后的设备列表与无法规范化的设备列表
 */
export function normalizeDeviceList(deviceList, isIOS = false) {
  // AA:BB:CC:DD:EE:FF格式 或 AA-BB-CC-DD-EE-FF格式 或 AABBCCDDEEFF格式
  const macPattern1 = /[0-9A-Fa-f]{2}([-:]?)[0-9A-Fa-f]{2}(?:\1[0-9A-Fa-f]{2}){4}$/;

  const validDevices = [];
  const invalidDevices = [];

  // 遍历设备列表
  for (const device of deviceList) {
    let macAddress = null;
    let macSource = null; // 记录 MAC 来源，用于调试
    // 优先从设备名称中提取 MAC 地址（固件写入的真实 WiFi MAC）
    // 这个 MAC 用于后端注册和灵矽平台绑定
    // deviceId 放在最后作为兜底，但可能是蓝牙 MAC 而非 WiFi MAC
    const fields = ['name', 'localName', 'deviceId'];

    for (const field of fields) {
      const value = device[field];

      // 如果字段不存在或不是字符串，跳过
      if (!value || typeof value !== 'string') {
        continue;
      }

      const match1 = value.match(macPattern1);
      if (match1) {
        macSource = field; // 记录 MAC 来源
        if (match1[0].length === 12) {
          // 将12位字符格式化为冒号分隔的MAC地址
          macAddress = match1[0]
            .match(/.{1,2}/g)
            .join(':')
            .toUpperCase();
        } else {
          // 将分隔符统一为冒号，并转为大写
          macAddress = match1[0].replace(/[-:]/g, ':').toUpperCase();
        }
        break;
      }
    }

    if (macAddress) {
      // 调试日志：显示 MAC 来源
      if (macSource === 'deviceId') {
        console.warn(`[蓝牙] 设备 ${device.name || '未知'} 的 MAC 来自 deviceId（可能是蓝牙MAC而非WiFi MAC）`);
      } else {
        console.log(`[蓝牙] 设备 ${device.name || '未知'} 的 WiFi MAC 来自 ${macSource}: ${macAddress}`);
      }

      // 创建新设备对象，避免修改原对象
      const validDevice = {
        ...device,
        // 始终保留原始 deviceId 用于蓝牙连接
        // iOS 上是 UUID 格式，Android 上是蓝牙 MAC
        deviceId: device.deviceId,
        // macAddress 存储从设备名称提取的真实 WiFi MAC
        // 用于后端设备注册和灵矽平台绑定
        macAddress: macAddress,
        // 记录 MAC 来源，便于调试
        _macSource: macSource
      };
      validDevices.push(validDevice);
    } else {
      invalidDevices.push(device);
    }
  }

  return [validDevices, invalidDevices];
}

/**
 * 将蓝牙信号强度标准化到0-4的范围
 * @param {number} rssi - 信号强度
 * @returns {number} 标准化后的信号强度
 */
export function normalizeSignalStrength(rssi) {
  // RSSI通常在-100到0之间，越接近0信号越强
  if (rssi >= -50) return 4;
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

/**
 * 获取信号强度对应的颜色
 * @param {number} strength - 信号强度 (0-4)
 * @returns {string} 颜色值
 */
export function getSignalColor(strength) {
  // 将0-4转换为0-100的范围
  const percentage = (strength / 4) * 100;
  if (percentage > 75) {
    return '#34C759'; // 绿色
  }
  if (percentage > 50) {
    return '#335CFF'; // 蓝色
  }
  if (percentage > 25) {
    return '#FF9500'; // 橙色
  }
  return '#FF3B30'; // 红色
}

/**
 * 检查蓝牙权限
 * @returns {Promise<boolean>} 是否有蓝牙权限
 * 
 * 注意：Android 12+ 上不能在权限请求前调用 uni.getSystemSetting()，
 * 因为 DCloud SDK 内部会检查旧的 BLUETOOTH 权限，会导致异常。
 */
export async function checkBluetoothPermission() {
  try {
    // 使用新的 API 替代已废弃的 getSystemInfoSync
    const deviceInfo = uni.getDeviceInfo();

    // Android 12+ 特殊处理：跳过 getSystemSetting 检查
    if (deviceInfo.platform === 'android') {
      const osVersion = parseFloat(deviceInfo.osVersion || '0');
      const apiLevel = deviceInfo.osAndroidAPILevel || 0;

      if (apiLevel >= 31 || osVersion >= 12) {
        console.log('[蓝牙检查] Android 12+，跳过 getSystemSetting 检查');
        // Android 12+ 上，假设蓝牙已开启（后续扫描失败时再处理）
        return true;
      }
    }

    // Android 11 及以下或其他平台
    const systemSetting = uni.getSystemSetting();
    console.log('系统设置:', systemSetting);

    if (!systemSetting.bluetoothEnabled) {
      console.log('蓝牙未打开');
      return false;
    }

    return true;
  } catch (error) {
    console.error('检查蓝牙权限失败:', error);
    return false;
  }
}
