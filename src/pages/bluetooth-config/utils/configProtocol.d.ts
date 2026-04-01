/** 配网状态码 */
export declare const CONFIG_STATUS: {
  readonly START: 0x00;
  readonly SUCCESS: 0x01;
  readonly FAIL_PASSWORD: 0x02;
  readonly FAIL_SSID: 0x03;
  readonly FAIL_NETWORK: 0x04;
  readonly FAIL_OTHER: 0x05;
  readonly REGISTER_SUCCESS: 0x0b;
  readonly REGISTER_FAIL: 0x0c;
  readonly SERVICE_CONFIG_SUCCESS: 0xa1;
  readonly SERVICE_CONFIG_FAIL: 0xa2;
};

/** 配网步骤 */
export declare const CONFIG_STEPS: {
  readonly SCAN: 'scan';
  readonly CONNECT: 'connect';
  readonly READ_INFO: 'read_info';
  readonly WIFI_SCAN: 'wifi_scan';
  readonly WIFI_CONFIG: 'wifi_config';
  readonly SERVICE_CONFIG: 'service_config';
  readonly WAIT_RESULT: 'wait_result';
  readonly COMPLETED: 'completed';
};

/** WiFi 项 */
export interface WifiListItem {
  SSID: string;
  secure: boolean;
  signalStrength: number;
}

/** 配网协议类 */
export declare class ConfigProtocol {
  init(deviceId: string): Promise<void>;
  reset(): void;
  getWifiList(deviceId: string): Promise<WifiListItem[]>;
  checkBLEConnection(deviceId: string): Promise<boolean>;
  reconnectBLEDevice(deviceId: string): Promise<void>;
  sendWifiConfig(deviceId: string, ssid: string, password?: string): Promise<void>;
}

/** 全局实例 */
export declare const configProtocol: ConfigProtocol;
export default configProtocol;
