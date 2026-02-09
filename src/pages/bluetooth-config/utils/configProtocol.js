/**
 * 蓝牙配网协议实现
 * 基于net-config的蓝牙配网协议，适配Vue 2项目
 */

import { bluetoothService } from './bluetooth.js';
import { bluetoothConfigManager } from '../store/bluetoothConfigStore.js';

// 配网状态码
export const CONFIG_STATUS = {
  START: 0x00, // 开始配网
  SUCCESS: 0x01, // 配网成功
  FAIL_PASSWORD: 0x02, // 配网失败：密码错误
  FAIL_SSID: 0x03, // 配网失败：SSID错误
  FAIL_NETWORK: 0x04, // 配网失败：不支持的网络
  FAIL_OTHER: 0x05, // 配网失败：其他错误
  REGISTER_SUCCESS: 0x0b, // 设备注册成功
  REGISTER_FAIL: 0x0c, // 设备注册失败
  SERVICE_CONFIG_SUCCESS: 0xa1, // 服务配置写入成功
  SERVICE_CONFIG_FAIL: 0xa2 // 服务配置写入失败
};

// 配网步骤
export const CONFIG_STEPS = {
  SCAN: 'scan', // 扫描设备
  CONNECT: 'connect', // 连接设备
  READ_INFO: 'read_info', // 读取设备信息
  WIFI_SCAN: 'wifi_scan', // WiFi扫描
  WIFI_CONFIG: 'wifi_config', // WiFi配置
  SERVICE_CONFIG: 'service_config', // 服务配置
  WAIT_RESULT: 'wait_result', // 等待配网结果
  COMPLETED: 'completed' // 配网完成
};

/**
 * 对WiFi列表去重，保留信号最强的
 * @param {Array} wifiList - WiFi列表
 * @returns {Array} 去重后的WiFi列表
 */
function dedupeWifiList(wifiList) {
  const wifiMap = new Map();
  wifiList.forEach((wifi) => {
    const existingWifi = wifiMap.get(wifi.SSID);
    // 如果是新的SSID或者信号比已存在的强，则更新
    if (!existingWifi || wifi.signalStrength > existingWifi.signalStrength) {
      wifiMap.set(wifi.SSID, wifi);
    }
  });
  return Array.from(wifiMap.values());
}

/**
 * 解析WiFi列表数据
 * @param {Uint8Array} data - 原始数据
 * @returns {Array} 解析后的WiFi列表
 */
function parseWifiList(data) {
  const wifiList = [];
  let offset = 0;

  // 辅助函数：将UTF-8字节数组转换为字符串
  function utf8BytesToString(bytes) {
    const chars = [];
    let i = 0;
    while (i < bytes.length) {
      const byte = bytes[i];
      if (byte < 0x80) {
        // ASCII字符
        chars.push(byte);
        i++;
      } else if (byte < 0xe0 && i + 1 < bytes.length) {
        // 双字节UTF-8
        chars.push(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else if (byte < 0xf0 && i + 2 < bytes.length) {
        // 三字节UTF-8
        chars.push(((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
        i += 3;
      } else {
        // 跳过无效字节
        i++;
      }
    }
    return String.fromCharCode(...chars);
  }

  // 从日志数据分析：每个WiFi信息的格式为：
  // [length(总长度 1字节), RSSI(1字节), SSID(length-1字节)]
  while (offset < data.length) {
    if (offset >= data.length) break;

    const length = data[offset]; // 总长度
    console.log(
      `解析WiFi数据 - offset: ${offset}, length: ${length}, 剩余数据: ${data.length - offset}`
    );

    // 检查数据完整性
    if (length === 0 || offset + length >= data.length) {
      console.log('数据不完整，跳过');
      break;
    }

    const rssi = data[offset + 1]; // RSSI值
    const ssidBytes = data.slice(offset + 2, offset + length + 1); // SSID内容

    console.log(`RSSI: ${rssi}, SSID字节数: ${ssidBytes.length}`);

    // 解析SSID
    const ssid = utf8BytesToString(ssidBytes);
    console.log(`解析到SSID: "${ssid}"`);

    // 处理rssi，转成strength
    let signalStrength = rssi > 127 ? rssi - 256 : rssi; // 补码转负数
    // RSSI 通常在 -100 到 0 之间，转换为 0-100 的信号强度
    if (signalStrength > 0) signalStrength = 0; // 限制最大值
    if (signalStrength < -100) signalStrength = -100; // 限制最小值

    // 获取设备信息判断平台
    const deviceInfo = uni.getDeviceInfo();
    // 将 -100～0 映射到 0～100
    signalStrength =
      deviceInfo.platform === 'ios' ? (signalStrength + 100) / 100 : signalStrength + 100;

    // 过滤掉空SSID和非法字符
    if (ssid && ssid.trim()) {
      wifiList.push({
        SSID: ssid.trim(),
        BSSID: '',
        secure: true,
        signalStrength,
        frequency: 0
      });
      console.log(`添加WiFi: ${ssid.trim()}, 信号强度: ${signalStrength}`);
    }

    // 移动到下一个WiFi信息
    offset += length + 1;
  }

  return dedupeWifiList(wifiList);
}

/**
 * 蓝牙配网协议类
 */
export class ConfigProtocol {
  constructor() {
    this.currentStep = null;
    this.deviceInfo = null;
    this.configResult = null;
    this.listeners = new Map();

    // WiFi扫描相关
    this.wifiScanPromise = null;
    this.wifiScanTimeoutId = null;
    this.receivedData = [];
    this.isListenerSetup = false;
    this.deviceId = null;
    this._dataListenerRegistered = false;
  }

  /**
   * 初始化配网协议
   * @param {string} deviceId - 蓝牙设备ID
   */
  async init(deviceId) {
    console.log('初始化蓝牙配网协议');

    // 如果设备ID变化了，需要重新设置监听器
    if (this.deviceId !== deviceId) {
      console.log('设备ID变化，重置监听器状态');
      this.isListenerSetup = false;
    }

    this.deviceId = deviceId;
    // 重置序列号，确保与设备同步
    bluetoothConfigManager.resetSequence();
    console.log('序列号已重置为0');

    // 清理之前的数据
    this.receivedData = [];
    if (this.wifiScanTimeoutId) {
      clearTimeout(this.wifiScanTimeoutId);
      this.wifiScanTimeoutId = null;
    }
    this.wifiScanPromise = null;

    // 设置蓝牙数据监听（如果未设置或需要重新设置）
    await this.setupBLEDataListener(deviceId);
    this.setupBLEConnectionListener(deviceId);
  }

  /**
   * 重置配网协议状态
   */
  reset() {
    console.log('重置配网协议状态');
    this.currentStep = null;
    this.deviceInfo = null;
    this.configResult = null;
    this.wifiScanPromise = null;
    if (this.wifiScanTimeoutId) {
      clearTimeout(this.wifiScanTimeoutId);
      this.wifiScanTimeoutId = null;
    }
    this.receivedData = [];
    this.isListenerSetup = false;
    this.deviceId = null;
  }

  /**
   * 设置蓝牙连接状态监听
   * @param {string} deviceId - 设备ID
   */
  setupBLEConnectionListener(deviceId) {
    // 监听蓝牙连接状态变化
    uni.onBLEConnectionStateChange((res) => {
      if (res.deviceId === deviceId) {
        if (!res.connected) {
          console.log('蓝牙连接断开，设备ID:', deviceId);
          // 连接断开时重置监听器状态，以便重新连接时可以重新设置
          this.isListenerSetup = false;
          this.emit('connection_lost', { deviceId });

          // 如果有正在进行的操作，尝试重连
          if (this.wifiScanPromise || this.configResultPromise) {
            console.log('检测到操作进行中，尝试自动重连...');
            this.reconnectBLEDevice(deviceId).catch((err) => {
              console.error('自动重连失败:', err);
              this.emit('reconnect_failed', { deviceId, error: err });
              this.emit('connectionLost', {
                reason: '蓝牙连接断开',
                message: `蓝牙连接已断开，请重新开始配网: ${err}`
              });
            });
          } else {
            this.emit('connectionLost', {
              reason: '蓝牙连接断开',
              message: `蓝牙连接已断开，请重新开始配网`
            });
          }
        } else {
          console.log('蓝牙连接已建立，设备ID:', deviceId);
          this.emit('connection_restored', { deviceId });
        }
      }
    });
  }

  /**
   * 设置蓝牙数据监听
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 设置完成的Promise
   */
  setupBLEDataListener(deviceId) {
    return new Promise((resolve, reject) => {
      if (this.isListenerSetup) {
        console.log('蓝牙监听器已设置，跳过重复设置');
        resolve();
        return;
      }

      console.log('开始设置蓝牙数据监听器，设备ID:', deviceId);

      // 先注册特征值变化通知
      uni.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId: bluetoothService.PRIMARY_SERVICE_UUID,
        characteristicId: bluetoothService.RECEIVE_CHARACTERISTIC_UUID,
        state: true,
        success: () => {
          console.log('蓝牙特征值变化通知注册成功');
          this.isListenerSetup = true;
          resolve();
        },
        fail: (error) => {
          console.error('蓝牙特征值变化通知注册失败:', error);
          this.isListenerSetup = false;
          reject(error);
        }
      });

      // 只注册一次数据监听器（这个监听器是全局的，不需要每次都注册）
      if (!this._dataListenerRegistered) {
        this._dataListenerRegistered = true;
        const dataListener = (res) => {
          // 检查是否是当前设备的数据
          if (res.deviceId !== this.deviceId) {
            return;
          }

          const value = new Uint8Array(res.value);
          console.log(
            '收到数据:',
            Array.from(value)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ')
          );

          try {
            const type = value[0];
            const frameCtrl = value[1];
            const sequence = value[2];
            const curDataLen = value[3];

            // 处理ACK响应
            if ((type & 0x03) === 0 && type >> 2 === 0) {
              console.log('收到ACK响应，序列号:', sequence);
              return;
            }

            // 解析类型
            const mainType = type & 0x03; // 低2位是主类型
            const subType = type >> 2; // 高6位是子类型

            console.log('帧类型解析 - Type:', '0x' + type.toString(16), 'MainType:', mainType, 'SubType:', '0x' + subType.toString(16));

            // Wi-Fi 连接状态报告数据包 (subType=0x0f)
            // 注意：ESP32 BluFi 可能使用控制帧(mainType=0)或数据帧(mainType=1)发送状态报告
            if (subType === 0x0f) {
              // 提取payload数据
              const payloadData =
                frameCtrl & 0x10 ? value.slice(6, 6 + curDataLen) : value.slice(4, 4 + curDataLen);

              // 解析状态数据
              // 格式可能是: [opmode, sta_conn_status, softap_conn_num] 或 [opmode, sta_status]
              const opmode = payloadData[0];
              const sta_status = payloadData[1];
              const softap_conn_num = payloadData.length > 2 ? payloadData[2] : 0;

              console.log('解析配网状态 - opmode:', opmode, 'sta_status:', sta_status, 'softap_conn_num:', softap_conn_num);
              console.log('Payload原始数据:', Array.from(payloadData).map(b => '0x' + b.toString(16)).join(' '));

              let result = null;
              
              // ESP32 BluFi sta_status 定义（根据ESP-IDF文档）:
              // 0x00 = ESP_BLUFI_STA_CONN_SUCCESS (连接成功)
              // 0x01 = ESP_BLUFI_STA_CONN_FAIL (连接失败)
              // 0x02 = ESP_BLUFI_STA_CONNECTING (正在连接) - 某些版本可能表示成功
              // 0x03 = ESP_BLUFI_STA_NO_IP (无IP)
              //
              // 注意：不同版本的ESP-IDF可能有不同的定义
              // 某些开发板的sta_status=0x02可能表示连接成功
              
              // 判断配网成功的条件：
              // 1. sta_status === 0x00 (标准成功状态)
              // 2. sta_status === 0x02 且设备随后断开蓝牙连接（某些开发板的行为）
              if (sta_status === 0x00 || sta_status === 0x02) {
                // sta_status为0或2表示WiFi连接成功
                result = {
                  success: true,
                  message: '配网成功',
                  deviceInfo: this.deviceInfo
                };
                console.log('配网成功！sta_status=' + sta_status);
              } else {
                // sta_status其他值表示连接失败或进行中
                let errorMsg = '无法连接到 WiFi';
                switch(sta_status) {
                  case 0x01:
                    errorMsg = 'WiFi连接失败';
                    break;
                  case 0x03:
                    errorMsg = '未获取到IP地址';
                    break;
                  case 0x04:
                    errorMsg = 'WiFi连接超时';
                    break;
                  default:
                    errorMsg = `WiFi连接状态异常(状态码:${sta_status})`;
                }
                result = {
                  success: false,
                  error: errorMsg,
                  code: 'FAIL_CONNECT'
                };
                console.log('配网失败:', errorMsg);
              }

              if (result) {
                this.configResult = result;
                this.emit('config-result', result);
              }
              return;
            }

            // 错误帧 (subType 0x12) - 设备报告协议错误
            if (mainType === 0x01 && subType === 0x12) {
              const errorData = frameCtrl & 0x10 ? value.slice(6, 6 + curDataLen) : value.slice(4, 4 + curDataLen);
              const errorCode = errorData.length > 0 ? errorData[0] : -1;
              const errorMessages = {
                0x00: '序列号错误(SEQUENCE_ERROR)',
                0x01: '校验和错误(CHECKSUM_ERROR)',
                0x02: '解密错误(DECRYPT_ERROR)',
                0x03: '加密错误(ENCRYPT_ERROR)',
                0x04: '安全初始化错误(INIT_SECURITY_ERROR)',
                0x05: 'DH内存分配错误(DH_MALLOC_ERROR)',
                0x06: 'DH参数错误(DH_PARAM_ERROR)',
                0x07: '读取参数错误(READ_PARAM_ERROR)',
                0x08: '公钥生成错误(MAKE_PUBLIC_ERROR)'
              };
              const errorMsg = errorMessages[errorCode] || `未知错误(code: 0x${errorCode.toString(16)})`;
              console.error('设备报告BluFi协议错误:', errorMsg);

              // 如果有等待中的配网结果，通知失败
              const errorResult = {
                success: false,
                error: `设备协议错误: ${errorMsg}`,
                code: 'PROTOCOL_ERROR'
              };
              this.configResult = errorResult;
              this.emit('config-result', errorResult);
              return;
            }

            // WiFi列表数据包 (0x45 = 数据帧类型1 + 子类型17)
            if (mainType === 0x01 && subType === 0x11) {
              // WiFi列表数据包
              // 如果是分片帧
              const data =
                frameCtrl & 0x10 ? value.slice(6, 6 + curDataLen) : value.slice(4, 4 + curDataLen);
              this.receivedData.push({
                sequence,
                data: Array.from(data)
              });

              // 检查是否是最后一个包
              if (frameCtrl === 0x04) {
                // 按序列号排序并合并数据
                const sortedData = this.receivedData
                  .sort((a, b) => a.sequence - b.sequence)
                  .flatMap((item) => item.data);
                // 解析WiFi列表
                const localWifiList = parseWifiList(new Uint8Array(sortedData));

                // 处理WiFi扫描结果
                this.handleWifiListData(localWifiList);

                // 重置接收缓冲区
                this.receivedData = [];
              }
            }
          } catch (error) {
            console.error('数据解析错误:', error);
            // 如果有等待中的Promise，reject它
            if (this.wifiScanPromise) {
              this.wifiScanPromise.reject(error);
              this.wifiScanPromise = null;
            }
            // 重置接收缓冲区
            this.receivedData = [];
          }
        };

        uni.onBLECharacteristicValueChange(dataListener);
      }
    });
  }

  /**
   * 处理WiFi列表数据
   * @param {Array} wifiList - 解析后的WiFi列表
   */
  handleWifiListData(wifiList) {
    try {
      console.log('解析到的WiFi列表:', wifiList);
      console.log('WiFi列表数量:', wifiList.length);

      // 清除超时定时器
      if (this.wifiScanTimeoutId) {
        clearTimeout(this.wifiScanTimeoutId);
        this.wifiScanTimeoutId = null;
      }

      // 如果有等待中的Promise，resolve它
      if (this.wifiScanPromise) {
        this.wifiScanPromise.resolve(wifiList);
        this.wifiScanPromise = null;
      }
    } catch (error) {
      console.error('WiFi列表处理失败:', error);

      // 清除超时定时器
      if (this.wifiScanTimeoutId) {
        clearTimeout(this.wifiScanTimeoutId);
        this.wifiScanTimeoutId = null;
      }

      // 如果有等待中的Promise，reject它
      if (this.wifiScanPromise) {
        this.wifiScanPromise.reject(error);
        this.wifiScanPromise = null;
      }
    }
  }

  /**
   * 获取WiFi列表
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Array>} WiFi列表
   */
  async getWifiList(deviceId) {
    return new Promise((resolve, reject) => {
      // 如果已有正在进行的扫描，先取消它
      if (this.wifiScanPromise) {
        console.log('取消之前的WiFi扫描请求');
        if (this.wifiScanTimeoutId) {
          clearTimeout(this.wifiScanTimeoutId);
          this.wifiScanTimeoutId = null;
        }
        this.wifiScanPromise.reject(new Error('新的扫描请求已开始'));
        this.wifiScanPromise = null;
        this.receivedData = [];
      }

      this.wifiScanPromise = { resolve, reject };

      // 设置超时时间（15秒，增加超时时间）
      this.wifiScanTimeoutId = setTimeout(() => {
        if (this.wifiScanPromise) {
          console.log('WiFi扫描超时，接收到的数据包数量:', this.receivedData.length);
          this.wifiScanPromise.reject(new Error('获取WiFi列表超时，请检查设备连接'));
          this.wifiScanPromise = null;
          this.wifiScanTimeoutId = null;
          // 重置接收缓冲区
          this.receivedData = [];
        }
      }, 15000); // 15秒超时

      // 获取序列号
      const sequence = bluetoothConfigManager.getNextSequence();

      // 帧控制位设置
      const frameControl =
        0x00 | // bit 0: 不加密（控制帧不加密），不包含校验位
        0x00 | // bit 2: 方向从手机到ESP设备（0）
        0x00 | // bit 3: 不要求回复ACK
        0x00; // bit 4: 无分片

      const cmd = new Uint8Array([
        (0x09 << 2) | 0x00, // 类型：控制帧(0x0)和子类型(0x9)合并
        frameControl, // 帧控制
        sequence, // 序列号
        0x00 // 数据长度：0
      ]);

      console.log(
        '发送WiFi扫描命令:',
        Array.from(cmd)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
      );
      console.log('使用序列号:', sequence);

      const sendCmd = () => {
        uni.writeBLECharacteristicValue({
          deviceId,
          serviceId: bluetoothService.PRIMARY_SERVICE_UUID,
          characteristicId: bluetoothService.SEND_CHARACTERISTIC_UUID,
          value: cmd.buffer,
          success: () => {
            console.log('WiFi扫描命令发送成功');
          },
          fail: (err) => {
            console.log('WiFi扫描命令发送失败:', err);

            // 检测蓝牙连接断开错误
            if (err.errMsg && err.errMsg.includes('no connection')) {
              console.log('检测到蓝牙连接断开，发送connectionLost事件');
              // 发送自定义事件通知主页面
              uni.$emit('connectionLost', {
                reason: '蓝牙连接断开',
                message: '蓝牙连接已断开，请重新开始配网'
              });
            }

            // 清除超时定时器
            if (this.wifiScanTimeoutId) {
              clearTimeout(this.wifiScanTimeoutId);
              this.wifiScanTimeoutId = null;
            }
            if (this.wifiScanPromise) {
              this.wifiScanPromise.reject(err);
              this.wifiScanPromise = null;
            }
          }
        });
      };

      // 延迟一会再写入特征值，否则可能报10007错误
      setTimeout(() => {
        sendCmd();
      }, 1000);
    });
  }

  /**
   * 构造 BluFi 数据帧
   * @param {number} type - 帧类型
   * @param {Uint8Array} payload - 数据载荷
   * @param {number} sequence - 序列号
   * @returns {ArrayBuffer} 构造的数据帧
   */
  buildBluFiFrame(type, payload, sequence) {
    const dataLength = (type & 0x03) === 0x00 ? 0 : payload.length; // 控制帧无数据

    // 帧控制位设置
    const frameControl =
      0x00 | // bit 0: 不加密
      0x00 | // bit 2: 方向从手机到ESP
      0x00 | // bit 3: 不要求回复ACK
      0x00; // bit 4: 无分片

    const cmd = new Uint8Array(4 + dataLength);
    cmd[0] = type;
    cmd[1] = frameControl;
    cmd[2] = sequence;
    cmd[3] = dataLength;
    if (dataLength > 0) {
      cmd.set(payload, 4);
    }
    return cmd.buffer;
  }

  /**
   * 检查蓝牙连接状态
   * @param {string} deviceId - 设备ID
   * @returns {Promise<boolean>} 连接状态
   */
  async checkBLEConnection(deviceId) {
    return new Promise((resolve) => {
      uni.getBLEDeviceServices({
        deviceId,
        success: () => {
          resolve(true);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 重新连接蓝牙设备
   * @param {string} deviceId - 设备ID
   * @returns {Promise} 连接结果
   */
  async reconnectBLEDevice(deviceId) {
    console.log('尝试重新连接蓝牙设备:', deviceId);

    return new Promise((resolve, reject) => {
      uni.createBLEConnection({
        deviceId,
        success: () => {
          console.log('蓝牙设备重连成功');
          // 重新设置数据监听
          setTimeout(() => {
            this.setupBLEDataListener(deviceId);
            resolve();
          }, 1000);
        },
        fail: (err) => {
          console.log('蓝牙设备重连失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 发送 BluFi 数据帧（带重试机制）
   * @param {string} deviceId - 设备ID
   * @param {ArrayBuffer} frame - 数据帧
   * @param {number} retries - 重试次数，默认3次
   * @returns {Promise} 发送结果
   */
  async sendBluFiFrame(deviceId, frame, retries = 3) {
    // 检查连接状态
    const isConnected = await this.checkBLEConnection(deviceId);
    if (!isConnected) {
      console.log('蓝牙连接已断开，尝试重连...');
      try {
        await this.reconnectBLEDevice(deviceId);
      } catch (err) {
        throw new Error('蓝牙重连失败: ' + (err.errMsg || err.message));
      }
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          uni.writeBLECharacteristicValue({
            deviceId,
            serviceId: bluetoothService.PRIMARY_SERVICE_UUID,
            characteristicId: bluetoothService.SEND_CHARACTERISTIC_UUID,
            value: frame,
            success: () => {
              console.log('BluFi帧发送成功');
              resolve();
            },
            fail: (err) => {
              console.log('BluFi帧发送失败:', err);
              reject(err);
            }
          });
        });
        // 发送成功，直接返回
        return;
      } catch (err) {
        // 如果是 "property not support" 错误，等待后重试
        if (err.code === 10007 && attempt < retries) {
          console.log(`发送失败(code 10007)，等待后重试 (${attempt}/${retries})...`);
          await delay(300 * attempt); // 递增延时：300ms, 600ms, 900ms
          continue;
        }

        // 检测蓝牙连接断开错误
        if (
          err.errMsg &&
          (err.errMsg.includes('no connection') ||
            err.errMsg.includes('time out') ||
            err.errMsg.includes('GATT ERROR'))
        ) {
          console.log('检测到蓝牙连接断开，发送connectionLost事件');
          try {
            this.close();
          } catch (e) {
            console.log('关闭蓝牙连接失败:', e);
          }
          // 发送自定义事件通知主页面
          uni.$emit('connectionLost', {
            reason: '蓝牙连接断开',
            message: '蓝牙连接已断开，请重新开始配网'
          });
        }

        throw err;
      }
    }
  }

  /**
   * 将字符串转换为UTF-8字节数组（小程序兼容版本）
   * @param {string} str - 要转换的字符串
   * @returns {Uint8Array} UTF-8字节数组
   */
  stringToUtf8Bytes(str) {
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(
          0xe0 | (charcode >> 12),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      } else {
        // surrogate pair
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }
    return new Uint8Array(utf8);
  }

  /**
   * 发送WiFi配置
   * @param {string} deviceId - 设备ID
   * @param {string} ssid - WiFi名称
   * @param {string} password - WiFi密码
   * @returns {Promise} 配置结果
   */
  async sendWifiConfig(deviceId, ssid, password = '') {
    try {
      // 参数验证
      if (!ssid || typeof ssid !== 'string') {
        throw new Error(`无效的SSID参数: ${ssid}`);
      }

      this.setCurrentStep(CONFIG_STEPS.WIFI_CONFIG);
      this.emit('progress', {
        step: CONFIG_STEPS.WIFI_CONFIG,
        message: '正在发送WiFi配置...'
      });

      console.log('开始发送WiFi配置:', { ssid, password: '***' });

      // 延时函数
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // 使用标准 BluFi 协议格式
      // 1. 发送 SSID
      const ssidBytes = this.stringToUtf8Bytes(ssid);
      const ssidFrame = this.buildBluFiFrame(
        0x09,
        ssidBytes,
        bluetoothConfigManager.getNextSequence()
      ); // BLUFI_TYPE_SSID = (0x02 << 2) | 0x01 = 0x09
      await this.sendBluFiFrame(deviceId, ssidFrame);

      // 等待一段时间再发送下一个帧，避免 BLE 写入冲突
      await delay(300);

      // 2. 发送 Password
      const passwordBytes = this.stringToUtf8Bytes(password);
      const passwordFrame = this.buildBluFiFrame(
        0x0d,
        passwordBytes,
        bluetoothConfigManager.getNextSequence()
      ); // BLUFI_TYPE_PASSWORD = (0x03 << 2) | 0x01 = 0x0D
      await this.sendBluFiFrame(deviceId, passwordFrame);

      // 等待一段时间再发送下一个帧
      await delay(300);

      // 3. 发送控制帧（连接AP）
      const connectFrame = this.buildBluFiFrame(
        0x0c,
        new Uint8Array([]),
        bluetoothConfigManager.getNextSequence()
      ); // BLUFI_TYPE_CTRL_CONNECT = (0x03 << 2) | 0x00 = 0x0C
      await this.sendBluFiFrame(deviceId, connectFrame);

      console.log('WiFi配置发送完成，等待设备连接...');

      this.emit('progress', {
        step: CONFIG_STEPS.WIFI_CONFIG,
        message: 'WiFi配置发送成功'
      });

      return Promise.resolve();
    } catch (error) {
      console.error('发送WiFi配置失败:', error);
      this.emit('error', {
        step: CONFIG_STEPS.WIFI_CONFIG,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 设置当前步骤
   * @param {string} step - 步骤名称
   */
  setCurrentStep(step) {
    this.currentStep = step;
    console.log('当前配网步骤:', step);
  }

  /**
   * 获取当前步骤
   * @returns {string} 当前步骤
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * 获取设备信息
   * @returns {Object} 设备信息
   */
  getDeviceInfo() {
    return this.deviceInfo;
  }

  /**
   * 获取配网结果
   * @returns {Object} 配网结果
   */
  getConfigResult() {
    return this.configResult;
  }

  /**
   * 等待配网结果
   * @param {string} deviceId - 设备ID
   * @param {number} timeout - 超时时间（毫秒），默认30秒
   * @returns {Promise<Object>} 配网结果
   */
  async waitForConfigResult(deviceId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      let timeoutId = null;
      let progressTimer = null;
      let backupTimeoutId = null; // 备用超时计时器ID

      // 设置超时
      timeoutId = setTimeout(() => {
        if (progressTimer) {
          clearInterval(progressTimer);
        }
        if (backupTimeoutId) {
          clearTimeout(backupTimeoutId);
        }
        reject(new Error('等待配网结果超时'));
      }, timeout);

      // 监听配网结果事件
      const resultListener = (result) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (progressTimer) {
          clearInterval(progressTimer);
        }
        if (backupTimeoutId) {
          clearTimeout(backupTimeoutId);
        }

        // 移除监听器
        this.off('config-result', resultListener);

        resolve(result);
      };

      // 添加结果监听器
      this.on('config-result', resultListener);

      // WiFi配置已在 WifiConfig.vue 中发送，这里只需等待设备反馈
      console.log('WiFi配置已发送，等待设备反馈...');
      // 设置当前步骤
      this.setCurrentStep(CONFIG_STEPS.WAIT_RESULT);

      // 配网状态监听已在 setupCharacteristicListener 的 dataListener 中处理
      // 这里只需要设置备用超时机制（如果设备长时间无响应）
      backupTimeoutId = setTimeout(() => {
        if (!this.configResult) {
          console.log('设备长时间无响应，返回超时结果');
          const timeoutResult = {
            success: false,
            error: '设备响应超时，请检查设备状态',
            code: 'DEVICE_TIMEOUT'
          };
          this.configResult = timeoutResult;
          this.emit('config-result', timeoutResult);
        }
      }, 25000); // 25秒后如果还没有结果就超时
    });
  }

  /**
   * 断开连接
   */
  async disconnect() {
    try {
      // 清理定时器和Promise
      if (this.wifiScanTimeoutId) {
        clearTimeout(this.wifiScanTimeoutId);
        this.wifiScanTimeoutId = null;
      }
      if (this.wifiScanPromise) {
        this.wifiScanPromise.reject(new Error('连接已断开'));
        this.wifiScanPromise = null;
      }

      console.log('蓝牙配网协议断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  }

  /**
   * 关闭协议
   */
  async close() {
    await this.disconnect();

    // 清理监听器状态
    this.isListenerSetup = false;

    // 关闭蓝牙特征值变化通知
    if (this.deviceId) {
      try {
        uni.notifyBLECharacteristicValueChange({
          deviceId: this.deviceId,
          serviceId: bluetoothService.PRIMARY_SERVICE_UUID,
          characteristicId: bluetoothService.RECEIVE_CHARACTERISTIC_UUID,
          state: false
        });
        // 移除数据监听器
        uni.offBLECharacteristicValueChange();
        // 移除连接状态监听器
        uni.offBLEConnectionStateChange();
      } catch (error) {
        console.error('关闭蓝牙通知失败:', error);
      }
    }

    this.listeners.clear();
    this.deviceId = null;
    console.log('蓝牙配网协议已关闭');
  }

  // 事件系统
  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error('事件监听器执行错误:', error);
        }
      });
    }
  }
}

// 创建全局实例
export const configProtocol = new ConfigProtocol();

// 默认导出
export default configProtocol;