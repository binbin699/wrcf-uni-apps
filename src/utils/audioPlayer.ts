/**
 * 音频播放工具类
 * 提供音频播放的基础功能，可以在任何地方使用
 */

import i18n from '@/locale';
import { AppInfo } from '@/const';

const $t = i18n.global.t;

export interface AudioItem {
  id?: string;
  src: string;
  name?: string;
  [key: string]: any;
}

export interface AudioPlayerOptions {
  /**
   * 是否自动停止之前的播放
   */
  autoStop?: boolean;
  /**
   * 是否自动播放
   */
  autoplay?: boolean;
  /**
   * 是否循环播放
   */
  loop?: boolean;
  /**
   * 音量 (0-1)
   */
  volume?: number;
}

export interface AudioPlayerEvents {
  onPlay?: (audio: AudioItem) => void;
  onStop?: (audio: AudioItem) => void;
  onEnded?: (audio: AudioItem) => void;
  onError?: (error: any, audio: AudioItem) => void;
  onPause?: (audio: AudioItem) => void;
}

export class AudioPlayerManager {
  private static instance: AudioPlayerManager | null = null;
  private audioContext: UniNamespace.InnerAudioContext | null = null;
  private currentAudio: AudioItem | null = null;
  private isPlaying: boolean = false;
  private options: AudioPlayerOptions;
  private events: AudioPlayerEvents;

  private constructor(options: AudioPlayerOptions = {}, events: AudioPlayerEvents = {}) {
    this.options = {
      autoStop: true,
      loop: false,
      volume: 1,
      ...options
    };
    this.events = events;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    options?: AudioPlayerOptions,
    events?: AudioPlayerEvents
  ): AudioPlayerManager {
    if (!AudioPlayerManager.instance) {
      AudioPlayerManager.instance = new AudioPlayerManager(options, events);
    } else if (options || events) {
      // 如果实例已存在但传入了新的配置，更新配置
      if (options) {
        AudioPlayerManager.instance.updateOptions(options);
      }
      if (events) {
        AudioPlayerManager.instance.updateEvents(events);
      }
    }
    return AudioPlayerManager.instance;
  }

  /**
   * 重置单例实例（主要用于测试或特殊情况）
   */
  public static resetInstance(): void {
    if (AudioPlayerManager.instance) {
      AudioPlayerManager.instance.cleanup();
      AudioPlayerManager.instance = null;
    }
  }

  /**
   * 标记音频选项是否已初始化（避免重复设置）
   */
  private audioOptionInitialized: boolean = false;

  /**
   * 初始化音频上下文
   * @returns Promise，确保音频选项设置完成后再解决
   */
  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = uni.createInnerAudioContext();
      this.setupAudioEvents();
    }

    // 如果音频选项已初始化，直接返回
    if (this.audioOptionInitialized) {
      return;
    }

    // 检查 API 是否存在（某些平台可能不支持）
    if (typeof uni.setInnerAudioOption === 'function') {
      // 设置 iOS 在静音模式下也能播放声音，并确保从扬声器输出
      // 使用 Promise 包装，确保设置完成后再继续
      await new Promise<void>((resolve) => {
        uni.setInnerAudioOption({
          obeyMuteSwitch: false,
          speakerOn: true,
          success: () => {
            console.log('设置音频选项成功');
            resolve();
          },
          fail: (err) => {
            console.warn('设置音频选项失败:', err);
            resolve();
          }
        });
      });
    }

    this.audioOptionInitialized = true;
  }

  /**
   * 设置音频事件监听
   */
  private setupAudioEvents(): void {
    if (!this.audioContext) return;

    this.audioContext.onPlay(() => {
      this.isPlaying = true;
      this.events.onPlay?.(this.currentAudio!);
      console.log('音频开始播放:', this.currentAudio?.name || this.currentAudio?.src);
    });

    this.audioContext.onEnded(() => {
      this.isPlaying = false;
      this.events.onEnded?.(this.currentAudio!);
      console.log('音频播放结束:', this.currentAudio?.name || this.currentAudio?.src);
      this.cleanupCurrentAudio();
    });

    this.audioContext.onError((error: any) => {
      this.isPlaying = false;
      this.events.onError?.(error, this.currentAudio!);
      console.error('音频播放失败:', error);
      this.cleanupCurrentAudio();

      uni.showToast({
        title: $t('common.play_failed'),
        icon: 'none'
      });
    });

    this.audioContext.onStop(() => {
      this.isPlaying = false;
      this.events.onStop?.(this.currentAudio!);
      console.log('音频播放停止:', this.currentAudio?.name || this.currentAudio?.src);
      this.cleanupCurrentAudio();
    });

    this.audioContext.onPause(() => {
      this.isPlaying = false;
      this.events.onPause?.(this.currentAudio!);
    });
  }

  /**
   * 播放音频
   * @param audio 音频对象或音频URL
   */
  async play(audio: AudioItem | string): Promise<boolean> {
    try {
      if (!audio) {
        throw new Error('音频参数不能为空');
      }

      // 标准化音频对象
      const audioObj: AudioItem = typeof audio === 'string' ? { src: audio } : audio;

      if (!audioObj.src) {
        throw new Error('音频源不能为空');
      }

      // iOS 平台处理：如果路径是本地绝对路径且不含协议，补充 file://
      // 这在某些 iOS 版本的小程序/APP 环境下对事件触发至关重要
      // 本地绝对路径补充 file://（iOS / 鸿蒙 InnerAudioContext 需要）
      let finalSrc = audioObj.src;
      // #ifdef APP-PLUS || APP-HARMONY
      if (
        uni.getSystemInfoSync().platform === 'ios' &&
      const needsFileProtocol =
        (uni.getSystemInfoSync().platform === 'ios' || AppInfo.isHarmonyApp()) &&
        finalSrc.startsWith('/') &&
        !finalSrc.startsWith('file://')
      ) {
        finalSrc = 'file://' + finalSrc;
        !finalSrc.startsWith('file://');
      if (needsFileProtocol) {
        finalSrc = `file://${finalSrc}`;
      }
      // #endif

      // 如果设置了自动停止，先停止当前播放
      if (this.options.autoStop && this.isPlaying) {
        this.stop();
      }

      // 初始化音频上下文（等待音频选项设置完成）
      await this.initAudioContext();

      // 设置音频参数
      this.audioContext!.src = finalSrc;
      this.audioContext!.loop = this.options.loop || false;
      this.audioContext!.volume = this.options.volume || 1;

      // 更新当前状态
      this.currentAudio = { ...audioObj, src: finalSrc };
      this.isPlaying = true; // 提前设置状态，防止连续点击导致的 toggle 逻辑错误

      // 开始播放 - 使用 setTimeout 确保 src 设置生效，提高 iOS 兼容性
      setTimeout(() => {
        if (this.audioContext) {
          this.audioContext.play();
          // 手动补丁：由于 iOS 某些环境下 onPlay 极其不准，我们在这里主动触发一次播放事件
          this.events.onPlay?.(this.currentAudio!);
        }
      }, 50);

      return true;
    } catch (error) {
      console.error('播放音频失败:', error);
      this.isPlaying = false;
      this.events.onError?.(error, audio as AudioItem);

      uni.showToast({
        title: $t('common.play_failed'),
        icon: 'none'
      });

      return false;
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.audioContext) {
      try {
        this.audioContext.stop();
        this.isPlaying = false; // 显式重置

        // 主动同步 UI 状态，不等待系统 onStop 事件
        if (this.currentAudio) {
          this.events.onStop?.(this.currentAudio);
        }

        this.cleanupCurrentAudio();
      } catch (error) {
        console.error('停止音频失败:', error);
      }
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.audioContext) {
      try {
        this.audioContext.pause();
        this.isPlaying = false;
        if (this.currentAudio) {
          this.events.onPause?.(this.currentAudio);
        }
      } catch (error) {
        console.error('暂停音频失败:', error);
      }
    }
  }

  /**
   * 继续播放
   */
  resume(): void {
    if (this.audioContext && !this.isPlaying && this.currentAudio) {
      try {
        this.audioContext.play();
      } catch (error) {
        console.error('继续播放失败:', error);
      }
    }
  }

  /**
   * 切换播放状态
   * @param audio 音频对象或音频URL（可选）
   */
  toggle(audio?: AudioItem | string): void {
    // 如果传入了音频参数
    if (audio) {
      const audioObj: AudioItem = typeof audio === 'string' ? { src: audio } : audio;

      // 同样进行路径标准化，确保比较时的准确性
      let normalizedSrc = audioObj.src;
      // #ifdef APP-PLUS || APP-HARMONY
      const needsFileProtocol =
        (uni.getSystemInfoSync().platform === 'ios' || AppInfo.isHarmonyApp()) &&
        normalizedSrc.startsWith('/') &&
        !normalizedSrc.startsWith('file://');
      if (needsFileProtocol) {
        normalizedSrc = `file://${normalizedSrc}`;
      }
      // #endif

      // 如果当前正在播放相同的音频，则停止
      if (
        this.isPlaying &&
        this.currentAudio &&
        ((audioObj.id && this.currentAudio.id === audioObj.id) ||
          this.currentAudio.src === normalizedSrc)
      ) {
        this.stop();
      } else {
        // 否则播放新音频
        this.play(audio);
      }
    } else {
      // 没有传入音频参数，切换当前音频的播放状态
      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    }
  }

  /**
   * 设置音量
   * @param volume 音量值 (0-1)
   */
  setVolume(volume: number): void {
    if (this.audioContext && volume >= 0 && volume <= 1) {
      this.audioContext.volume = volume;
      this.options.volume = volume;
    }
  }

  /**
   * 设置循环播放
   * @param loop 是否循环
   */
  setLoop(loop: boolean): void {
    if (this.audioContext) {
      this.audioContext.loop = loop;
      this.options.loop = loop;
    }
  }

  /**
   * 设置自动播放
   * @param autoplay 是否自动播放
   */
  setAutoplay(autoplay: boolean): void {
    if (this.audioContext) {
      this.audioContext.autoplay = autoplay;
      this.options.autoplay = autoplay;
    }
  }

  /**
   * 获取当前播放状态
   */
  getPlayState(): {
    isPlaying: boolean;
    currentAudio: AudioItem | null;
    volume: number;
    loop: boolean;
  } {
    return {
      isPlaying: this.isPlaying,
      currentAudio: this.currentAudio,
      volume: this.options.volume || 0,
      loop: this.options.loop || false
    };
  }

  /**
   * 获取播放进度信息
   */
  getPlayProgress(): {
    currentTime: number;
    duration: number;
    progress: number;
  } {
    if (this.audioContext) {
      const currentTime = this.audioContext.currentTime || 0;
      const duration = this.audioContext.duration || 0;
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      return {
        currentTime,
        duration,
        progress
      };
    }

    return {
      currentTime: 0,
      duration: 0,
      progress: 0
    };
  }

  /**
   * 清理当前音频信息
   */
  private cleanupCurrentAudio(): void {
    this.currentAudio = null;
    this.isPlaying = false;
  }

  /**
   * 清理音频资源
   */
  cleanup(): void {
    if (this.audioContext) {
      try {
        // 停止播放
        if (this.isPlaying) {
          this.audioContext.stop();
        }

        const emptyCallback = () => {};

        // 移除所有事件监听器
        this.audioContext.offPlay(emptyCallback);
        this.audioContext.offEnded(emptyCallback);
        this.audioContext.offError(emptyCallback);
        this.audioContext.offStop(emptyCallback);
        this.audioContext.offPause(emptyCallback);

        // 销毁音频上下文
        this.audioContext.destroy();
      } catch (error) {
        console.error('清理音频资源失败:', error);
      } finally {
        this.audioContext = null;
        this.audioOptionInitialized = false; // 重置音频选项初始化标志
        this.cleanupCurrentAudio();
      }
    }
  }

  /**
   * 更新事件处理器
   */
  updateEvents(events: AudioPlayerEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * 更新选项
   */
  updateOptions(options: AudioPlayerOptions): void {
    this.options = { ...this.options, ...options };

    // 如果音频上下文存在，更新相关设置
    if (this.audioContext) {
      if (options.volume !== undefined) {
        this.audioContext.volume = options.volume;
      }
      if (options.loop !== undefined) {
        this.audioContext.loop = options.loop;
      }
      if (options.autoplay !== undefined) {
        this.audioContext.autoplay = options.autoplay;
      }
    }
  }
}

/**
 * 获取全局音频播放器实例
 */
export function getGlobalAudioPlayer(): AudioPlayerManager {
  return AudioPlayerManager.getInstance();
}

// 导出默认实例
export default AudioPlayerManager;
