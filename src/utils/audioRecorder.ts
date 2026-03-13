/**
 * 录音管理工具类
 * 提供录音功能的基础操作，采用单例模式
 */

import i18n from '@/locale';
const $t = i18n.global.t;

/**
 * 录音管理工具类选项
 */
export interface RecorderOptions {
  duration?: number; // 录音时长限制（毫秒）
  sampleRate?: number; // 采样率
  numberOfChannels?: number; // 声道数
  encodeBitRate?: number; // 编码比特率
  format?: string; // 录音格式
}

export interface RecorderEvents {
  onStart?: () => void;
  onStop?: (result: RecorderResult) => void;
  onError?: (error: any) => void;
  onDurationUpdate?: (duration: number) => void;
}

export interface RecorderResult {
  tempFilePath: string;
  duration: number;
  fileSize: number;
  fileExtension?: string;
}

export class AudioRecorderManager {
  private static instance: AudioRecorderManager | null = null;
  private recorderManager: UniNamespace.RecorderManager | null = null;
  private _isRecording: boolean = false;
  private _recordDuration: number = 0;
  private recordTimer: any = null;
  private options: RecorderOptions;
  private events: RecorderEvents;
  private _currentRecordResult: RecorderResult | null = null;

  private constructor(options: RecorderOptions = {}, events: RecorderEvents = {}) {
    this.options = {
      duration: 60000, // 默认60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      ...options
    };
    this.events = events;
    this.initRecorder();
  }

  /**
   * 获取录音状态（只读）
   */
  public get isRecording(): boolean {
    return this._isRecording;
  }

  /**
   * 获取录音时长（只读）
   */
  public get recordDuration(): number {
    return this._recordDuration;
  }

  /**
   * 获取当前录音结果（只读）
   */
  public get currentRecordResult(): RecorderResult | null {
    return this._currentRecordResult;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    options?: RecorderOptions,
    events?: RecorderEvents
  ): AudioRecorderManager {
    if (!AudioRecorderManager.instance) {
      AudioRecorderManager.instance = new AudioRecorderManager(options, events);
    } else if (options || events) {
      // 如果实例已存在但传入了新的配置，更新配置
      if (options) {
        AudioRecorderManager.instance.updateOptions(options);
      }
      if (events) {
        AudioRecorderManager.instance.updateEvents(events);
      }
    }
    return AudioRecorderManager.instance;
  }

  /**
   * 重置单例实例（主要用于测试或特殊情况）
   */
  public static resetInstance(): void {
    if (AudioRecorderManager.instance) {
      AudioRecorderManager.instance.cleanup();
      AudioRecorderManager.instance = null;
    }
  }

  /**
   * 初始化录音管理器
   */
  private initRecorder(): void {
    if (!this.recorderManager) {
      this.recorderManager = uni.getRecorderManager();
      this.setupRecorderEvents();
    }
  }

  /**
   * 设置录音事件监听
   */
  private setupRecorderEvents(): void {
    if (!this.recorderManager) return;

    this.recorderManager.onStart(() => {
      console.log('录音开始');
      this._isRecording = true;
      this._recordDuration = 0;
      this.startRecordTimer();
      this.events.onStart?.();
    });

    this.recorderManager.onStop((res: any) => {
      console.log('录音结束', res);
      this._isRecording = false;
      this.stopRecordTimer();

      // 使用 uni.getFileInfo 获取准确的文件大小（res.fileSize 在某些平台可能不返回）
      uni.getFileInfo({
        filePath: res.tempFilePath,
        success: (fileInfo) => {
          console.log('获取文件信息成功:', fileInfo);
          const result: RecorderResult = {
            tempFilePath: res.tempFilePath,
            duration: this._recordDuration,
            fileSize: fileInfo.size || res.fileSize || 0,
            fileExtension: res.fileExtension || this.options.format
          };
          this._currentRecordResult = result;
          this.events.onStop?.(result);
        },
        fail: (err) => {
          console.warn('获取文件信息失败:', err);
          // 失败时使用原始返回
          const result: RecorderResult = {
            tempFilePath: res.tempFilePath,
            duration: this._recordDuration,
            fileSize: res.fileSize || 0,
            fileExtension: res.fileExtension || this.options.format
          };
          this._currentRecordResult = result;
          this.events.onStop?.(result);
        }
      });
    });

    this.recorderManager.onError((err: any) => {
      console.error('录音错误', err);
      this._isRecording = false;
      this.stopRecordTimer();
      this.events.onError?.(err);

      uni.showToast({
        title: $t('common.record_failed'),
        icon: 'none'
      });
    });
  }

  /**
   * 开始录音
   */
  start(): boolean {
    try {
      if (this._isRecording) {
        console.warn('录音已在进行中');
        return false;
      }

      const recordOptions = {
        duration: this.options.duration,
        sampleRate: this.options.sampleRate,
        numberOfChannels: this.options.numberOfChannels,
        encodeBitRate: this.options.encodeBitRate,
        format: this.options.format
      };

      console.log('开始录音，参数:', recordOptions);
      this.recorderManager!.start(recordOptions);

      return true;
    } catch (error) {
      console.error('开始录音失败:', error);
      this.events.onError?.(error);
      return false;
    }
  }

  /**
   * 停止录音
   */
  stop(): void {
    if (this._isRecording && this.recorderManager) {
      // 立即标记为停止，防止重复调用
      this._isRecording = false;
      try {
        console.log('停止录音');
        this.recorderManager.stop();
      } catch (error) {
        console.error('停止录音失败:', error);
        this.events.onError?.(error);
      }
    }
  }

  /**
   * 切换录音状态
   */
  toggle(): void {
    if (this._isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * 开始录音计时
   */
  private startRecordTimer(): void {
    this.recordTimer = setInterval(() => {
      this._recordDuration += 1;
      this.events.onDurationUpdate?.(this._recordDuration);
    }, 1000);
  }

  /**
   * 停止录音计时
   */
  private stopRecordTimer(): void {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = null;
    }
  }

  /**
   * 获取录音状态
   * @returns 包含录音状态、时长和当前录音结果的对象
   */
  getRecordState(): {
    isRecording: boolean;
    duration: number;
    currentResult: RecorderResult | null;
  } {
    return {
      isRecording: this._isRecording,
      duration: this._recordDuration,
      currentResult: this._currentRecordResult
    };
  }

  /**
   * 获取最后一次录音结果
   */
  getLastRecordResult(): RecorderResult | null {
    return this._currentRecordResult;
  }

  /**
   * 清除录音结果
   */
  clearRecordResult(): void {
    this._currentRecordResult = null;
  }

  /**
   * 更新事件处理器
   */
  updateEvents(events: RecorderEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * 更新选项
   */
  updateOptions(options: RecorderOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 清理录音资源
   */
  cleanup(): void {
    // 停止录音
    if (this._isRecording) {
      this.stop();
    }

    // 清理计时器
    this.stopRecordTimer();

    // 清理录音结果
    this._currentRecordResult = null;
    this._recordDuration = 0;

    // 注意：不销毁 recorderManager，因为它是系统提供的全局对象
    console.log('录音资源已清理');
  }

  /**
   * 格式化录音时长
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * 获取全局录音管理器实例
 */
export function getGlobalRecorder(): AudioRecorderManager {
  return AudioRecorderManager.getInstance();
}

// 导出默认实例
export default AudioRecorderManager;
