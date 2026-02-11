/**
 * 蓝牙配网状态管理
 * 基于 Vue 2 响应式系统的状态管理器
 */

// 配网步骤常量 - 三段式流程
export const CONFIG_STEPS = {
  SELECT_DEVICE: 'select-device',
  SELECT_WIFI: 'select-wifi',
  MANUAL_CONFIG: 'manual-config',
  SUBMIT_CONFIG: 'submit-config'
};

// 主流程步骤数组（线性顺序，不包含分支步骤 manual-config）
export const configSteps = ['select-device', 'select-wifi', 'submit-config'];

// 初始状态
const initialState = {
  currentStep: CONFIG_STEPS.SELECT_DEVICE,
  selectedDevice: null,
  selectedWifi: null,
  passwordState: {
    password: '',
    isVisible: false
  },
  isIOS: false,
  sequenceControl: { current: 0 },
  // 序列号管理
  sequenceNumber: 0,
  // 重新开始相关状态
  isRestarting: false,
  restartReason: null,
  // 仅配网模式（不绑定设备）
  configOnly: false,
  // 配网是否已完成
  configCompleted: false
};

/**
 * 蓝牙配网状态管理器
 */
class BluetoothConfigManager {
  constructor() {
    this.state = { ...initialState };
    this.listeners = [];
  }

  /**
   * 获取当前状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 更新状态
   * @param {Object} updates - 要更新的状态
   */
  updateState(updates) {
    console.log('更新状态:', updates);

    // 合并状态
    this.state = {
      ...this.state,
      ...updates
    };

    // 通知所有监听器
    this.notifyListeners();
  }

  /**
   * 重置状态
   */
  resetState() {
    console.log('重置状态');
    this.state = { ...initialState };
    this.notifyListeners();
  }

  /**
   * 重新开始配网流程
   * @param {string} reason - 重新开始的原因
   */
  restartConfig(reason = '用户手动重新开始') {
    console.log('重新开始配网流程:', reason);

    this.resetSequence();

    // 设置重新开始状态
    this.updateState({
      isRestarting: true,
      restartReason: reason
    });

    // 延迟重置状态，给UI时间显示重新开始提示
    setTimeout(() => {
      this.state = {
        ...initialState,
        isRestarting: false,
        restartReason: null
      };
      this.notifyListeners();
    }, 500);
  }

  /**
   * 检查是否正在重新开始
   */
  isRestartingConfig() {
    return this.state.isRestarting;
  }

  /**
   * 获取重新开始的原因
   */
  getRestartReason() {
    return this.state.restartReason;
  }

  /**
   * 重置序列号
   */
  resetSequence() {
    console.log('重置序列号');
    this.updateState({ sequenceNumber: 0 });
  }

  /**
   * 获取下一个序列号
   * @returns {number} 序列号
   */
  getNextSequence() {
    const current = this.state.sequenceNumber;
    const next = (current + 1) % 256;
    this.updateState({ sequenceNumber: next });
    console.log('获取序列号:', current, '下一个序列号:', next);
    return current;
  }

  /**
   * 获取当前序列号
   * @returns {number} 当前序列号
   */
  getCurrentSequence() {
    return this.state.sequenceNumber;
  }

  /**
   * 重置（别名方法）
   */
  reset() {
    return this.resetState();
  }

  /**
   * 添加状态监听器
   * @param {Function} listener - 监听器函数
   */
  addStateListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      console.log('添加状态监听器，当前监听器数量:', this.listeners.length);
    }
  }

  /**
   * 添加监听器（别名方法）
   * @param {Function} listener - 监听器函数
   */
  addListener(listener) {
    return this.addStateListener(listener);
  }

  /**
   * 移除状态监听器
   * @param {Function} listener - 要移除的监听器函数
   */
  removeStateListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log('移除状态监听器，当前监听器数量:', this.listeners.length);
    }
  }

  /**
   * 移除监听器（别名方法）
   * @param {Function} listener - 要移除的监听器函数
   */
  removeListener(listener) {
    return this.removeStateListener(listener);
  }

  /**
   * 通知所有监听器
   */
  notifyListeners() {
    const currentState = this.getState();
    console.log('通知监听器，当前状态:', currentState);

    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('监听器执行错误:', error);
      }
    });
  }

  // 便捷方法

  /**
   * 设置当前步骤
   * @param {string} step - 步骤名称
   */
  setCurrentStep(step) {
    this.updateState({ currentStep: step });
  }

  /**
   * 设置选中的设备
   * @param {Object} device - 设备信息
   */
  setSelectedDevice(device) {
    this.updateState({ selectedDevice: device });
  }

  /**
   * 设置选中的WiFi
   * @param {Object} wifi - WiFi信息
   */
  setSelectedWifi(wifi) {
    this.updateState({ selectedWifi: wifi });
  }

  /**
   * 设置密码状态
   * @param {Object} passwordState - 密码状态
   */
  setPasswordState(passwordState) {
    this.updateState({
      passwordState: {
        ...this.state.passwordState,
        ...passwordState
      }
    });
  }

  /**
   * 设置设备类型
   * @param {boolean} isIOS - 是否为iOS设备
   */
  setIsIOS(isIOS) {
    this.updateState({ isIOS });
  }

  /**
   * 设置仅配网模式（不绑定设备）
   * @param {boolean} configOnly - 是否仅配网
   */
  setConfigOnly(configOnly) {
    this.updateState({ configOnly });
  }

  /**
   * 设置配网完成状态
   * @param {boolean} completed - 是否已完成配网
   */
  setConfigCompleted(completed) {
    this.updateState({ configCompleted: completed });
  }

  /**
   * 检查配网是否已完成
   * @returns {boolean} 是否已完成
   */
  isConfigCompleted() {
    return this.state.configCompleted;
  }

  /**
   * 进入下一步（仅在主流程步骤间导航，分支步骤如 manual-config 需使用 setCurrentStep）
   */
  nextStep() {
    const currentIndex = configSteps.indexOf(this.state.currentStep);

    if (currentIndex >= 0 && currentIndex < configSteps.length - 1) {
      this.setCurrentStep(configSteps[currentIndex + 1]);
    }
  }

  /**
   * 返回上一步（仅在主流程步骤间导航，分支步骤如 manual-config 需使用 setCurrentStep）
   */
  prevStep() {
    const currentIndex = configSteps.indexOf(this.state.currentStep);

    if (currentIndex > 0) {
      this.setCurrentStep(configSteps[currentIndex - 1]);
    }
  }

  /**
   * 设置序列号控制
   * @param {Object} sequenceControl - 序列号控制对象
   */
  setSequenceControl(sequenceControl) {
    this.updateState({ sequenceControl });
  }

  /**
   * 获取序列号控制
   * @returns {Object} 序列号控制对象
   */
  getSequenceControl() {
    return this.state.sequenceControl;
  }
}

// 创建全局实例
export const bluetoothConfigManager = new BluetoothConfigManager();

// 默认导出
export default bluetoothConfigManager;
