/** 配网步骤常量 */
export declare const CONFIG_STEPS: {
  readonly SELECT_DEVICE: 'select-device';
  readonly SELECT_WIFI: 'select-wifi';
  readonly MANUAL_CONFIG: 'manual-config';
  readonly SUBMIT_CONFIG: 'submit-config';
};

/** 主流程步骤数组（线性顺序，不包含分支步骤 manual-config） */
export declare const configSteps: string[];

/** 密码状态 */
export interface PasswordState {
  password: string;
  isVisible: boolean;
}

/** 序列号控制 */
export interface SequenceControl {
  current: number;
}

/** 默认智能体绑定结果 */
export interface DefaultAgentBindState {
  bound?: boolean;
  agentName?: string;
  reason?: string;
  [key: string]: unknown;
}

/** 蓝牙配网状态 */
export interface BluetoothConfigState {
  currentStep: string;
  selectedDevice: { deviceId: string; name?: string; [key: string]: unknown } | null;
  selectedWifi: { SSID: string; secure: boolean; signalStrength: number } | null;
  passwordState: PasswordState;
  useLocalName: boolean;
  sequenceControl: SequenceControl;
  sequenceNumber: number;
  isRestarting: boolean;
  restartReason: string | null;
  configOnly: boolean;
  defaultAgentBind: DefaultAgentBindState | null;
  configCompleted: boolean;
}

/** 状态监听器 */
export type StateListener = (state: BluetoothConfigState) => void;

/** 蓝牙配网状态管理器 */
export declare class BluetoothConfigManager {
  state: BluetoothConfigState;
  getState(): BluetoothConfigState;
  updateState(updates: Partial<BluetoothConfigState>): void;
  resetState(): void;
  restartConfig(reason?: string): void;
  isRestartingConfig(): boolean;
  getRestartReason(): string | null;
  resetSequence(): void;
  getNextSequence(): number;
  getCurrentSequence(): number;
  reset(): void;
  addStateListener(listener: StateListener): void;
  addListener(listener: StateListener): void;
  removeStateListener(listener: StateListener): void;
  removeListener(listener: StateListener): void;
  setCurrentStep(step: string): void;
  setSelectedDevice(device: BluetoothConfigState['selectedDevice']): void;
  setSelectedWifi(wifi: BluetoothConfigState['selectedWifi']): void;
  setPasswordState(passwordState: Partial<PasswordState>): void;
  setUseLocalName(useLocalName: boolean): void;
  setConfigOnly(configOnly: boolean): void;
  setDefaultAgentBind(defaultAgentBind: BluetoothConfigState['defaultAgentBind']): void;
  setConfigCompleted(completed: boolean): void;
  isConfigCompleted(): boolean;
  nextStep(): void;
  prevStep(): void;
  setSequenceControl(sequenceControl: SequenceControl): void;
  getSequenceControl(): SequenceControl;
}

/** 全局实例 */
export declare const bluetoothConfigManager: BluetoothConfigManager;
export default bluetoothConfigManager;
