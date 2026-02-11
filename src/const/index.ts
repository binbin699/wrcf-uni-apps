/**
 * 应用信息管理
 *
 * 导出平台相关信息：
 * - platform: 运行平台 (mp-weixin, app-plus 等)
 * - os: 操作系统 (ios, android, windows 等)
 * - osVersion: 操作系统版本
 * - androidApiLevel: Android API 级别（仅 Android）
 */

import {
  OsType,
  PLATFORM,
  detectOsType,
  detectOsVersion,
  getAndroidApiLevel,
  isHarmonyRom
} from './env';

export const AppInfo = {
  platform: PLATFORM,

  // 添加这些属性作为 getter
  get os(): OsType {
    return detectOsType();
  },

  get osVersion(): string {
    return detectOsVersion();
  },

  get androidApiLevel(): number | undefined {
    return getAndroidApiLevel();
  },

  /**
   * 判断是否为 App 平台
   */
  isApp: (): boolean => {
    return PLATFORM === 'app';
  },

  /**
   * 判断是否为 Android App 平台（包括 HarmonyOS 4.x 等运行在 Android 内核上的设备）
   */
  isAndroidApp: (): boolean => {
    return PLATFORM === 'app' && detectOsType() === 'android';
  },

  /**
   * 判断是否为 iOS App 平台
   */
  isIOSApp: (): boolean => {
    return PLATFORM === 'app' && detectOsType() === 'ios';
  },

  /**
   * 判断是否为鸿蒙 NEXT App 平台（通过 APP-HARMONY 编译）
   * 注意：HarmonyOS 4.x 及更早版本运行在 Android 内核上，isAndroidApp() 返回 true
   */
  isHarmonyApp: (): boolean => {
    return PLATFORM === 'app' && detectOsType() === 'harmony';
  },

  /**
   * 判断是否运行在鸿蒙 ROM 上（包括 HarmonyOS on Android 和 HarmonyOS NEXT）
   * 仅用于日志、调试、UI 显示等场景
   * 注意：功能性判断请使用 isAndroidApp() 或 isHarmonyApp()
   */
  isHarmonyRom: (): boolean => {
    return isHarmonyRom();
  },

  /**
   * 判断是否为小程序平台
   */
  isMP: (): boolean => {
    return PLATFORM === 'mp';
  },

  /**
   * 判断是否为微信小程序平台
   */
  isWeixinMP: (): boolean => {
    if (PLATFORM !== 'mp') {
      return false;
    }

    try {
      const sysInfo = uni.getSystemInfoSync();
      // @ts-ignore
      return sysInfo?.platform === 'mp-weixin' || typeof wx !== 'undefined';
    } catch {
      // @ts-ignore
      return typeof wx !== 'undefined';
    }
  }
};
