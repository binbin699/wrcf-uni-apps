/**
 * 应用信息管理
 * 
 * 导出平台相关信息：
 * - platform: 运行平台 (mp-weixin, app-plus 等)
 * - os: 操作系统 (ios, android, windows 等)
 * - osVersion: 操作系统版本
 * - androidApiLevel: Android API 级别（仅 Android）
 */

import { OsType, PLATFORM, detectOsType, detectOsVersion, getAndroidApiLevel } from './env';

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
   * 判断是否为 Android App 平台
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
   * 判断是否为鸿蒙 App 平台
   */
  isHarmonyApp: (): boolean => {
    return PLATFORM === 'app' && detectOsType() === 'harmony';
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
  },
};
