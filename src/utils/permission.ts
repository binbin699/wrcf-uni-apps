/**
 * 权限管理工具
 * 统一处理相机、位置、录音、蓝牙、相册等权限请求
 * 集成 wot-ui notify 组件显示权限说明
 *
 * 关于 iOS 追踪权限（App Tracking Transparency）：
 * - 当前 manifest.json 中没有配置 NSUserTrackingUsageDescription，这是正确的做法
 * - 如果应用不需要追踪用户活动，应避免添加此权限描述，以防止不必要的权限请求弹窗
 * - 如果未来需要追踪权限，可以在 manifest.json 的 privacyDescription 中添加：
 *   "NSUserTrackingUsageDescription": "需要您的同意，才能追踪您的活动"
 *
 * 关于 iOS 权限描述多语言：
 * - iOS 云打包支持通过 manifest.json 的 locales 配置实现权限描述的多语言
 * - 在 manifest.json 的 app-plus.locales 节点下配置不同语言的隐私描述信息
 * - 配置结构：
 *   {
 *     "app-plus": {
 *       "locales": {
 *         "zh": {
 *           "name": "应用名称（中文）",
 *           "ios": {
 *             "privacyDescription": {
 *               "NSCameraUsageDescription": "中文权限描述",
 *               ...
 *             }
 *           }
 *         },
 *         "en": {
 *           "name": "App Name (English)",
 *           "ios": {
 *             "privacyDescription": {
 *               "NSCameraUsageDescription": "English permission description",
 *               ...
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * - iOS 系统会根据设备语言自动选择对应的权限描述显示
 * - distribute.ios.privacyDescription 作为默认值，当系统语言不匹配时使用
 * - 此配置方式完全支持云打包，无需原生工程配置
 */

import type { NotifyProps } from '@/uni_modules/wot-design-uni/components/wd-notify/types';
import i18n from '@/locale';
import { AppInfo } from '@/const';
import { AudioRecorderManager } from '@/utils/audioRecorder';

const $t = i18n.global.t;

export const REQUEST_TIMEOUT = 20000;

/**
 * Notify 函数接口，包含 show 和 close 方法
 */
export interface NotifyFunctions {
  show: (option: NotifyProps | string) => void;
  close: () => void;
}

/**
 * Notify 消息类型
 */
enum NotifyMessageType {
  REQUESTING = 'requesting', // 请求权限时
  SUCCESS = 'success', // 授权成功
  DENIED = 'denied', // 被拒绝（不跳转设置）
  DENIED_NAVIGATE = 'denied_nav' // 被拒绝（会跳转设置）
}

/**
 * 权限类型枚举
 */
export enum PermissionType {
  CAMERA = 'camera', // 相机权限
  ALBUM = 'album', // 相册权限
  LOCATION = 'location', // 位置权限
  RECORD = 'record', // 录音权限
  BLUETOOTH = 'bluetooth' // 蓝牙权限
}

/**
 * 权限状态
 */
export enum PermissionStatus {
  AUTHORIZED = 'authorized', // 已授权
  DENIED = 'denied', // 已拒绝
  NOT_DETERMINED = 'not_determined', // 未确定
  UNAVAILABLE = 'unavailable' // 不可用（如蓝牙未开启）
}

/**
 * 鸿蒙平台扫码结果临时存储
 * 用于在权限请求时复用扫码结果，避免用户需要扫两次码
 */
let _lastHarmonyScanResult: string | null = null;

/**
 * 获取并清除上次鸿蒙扫码结果
 * @returns 扫码结果，如果没有则返回 null
 */
export function getLastHarmonyScanResult(): string | null {
  const result = _lastHarmonyScanResult;
  _lastHarmonyScanResult = null;
  return result;
}

/**
 * 权限请求结果
 */
export interface PermissionResult {
  granted: boolean; // 是否已授权
  status: PermissionStatus; // 权限状态
  message?: string; // 错误信息
  scanResult?: string; // 扫码结果（鸿蒙平台相机权限请求时可能返回）
}

/**
 * 权限配置
 */
interface PermissionConfig {
  type: PermissionType;
  scope?: string; // uni.authorize 的 scope（小程序平台）
  title: string; // 权限名称
  description: string; // 权限用途说明
}

/**
 * 权限配置映射
 */
const PERMISSION_CONFIG: Record<PermissionType, PermissionConfig> = {
  [PermissionType.CAMERA]: {
    type: PermissionType.CAMERA,
    scope: 'scope.camera',
    // 允许获得您的{title}权限，以便{description}
    title: 'permission.camera_title',
    description: 'permission.camera_description'
  },
  [PermissionType.ALBUM]: {
    type: PermissionType.ALBUM,
    scope: 'scope.album',
    title: 'permission.album_title',
    description: 'permission.album_description'
  },
  [PermissionType.LOCATION]: {
    type: PermissionType.LOCATION,
    scope: 'scope.userLocation',
    title: 'permission.location_title',
    description: 'permission.location_description'
  },
  [PermissionType.RECORD]: {
    type: PermissionType.RECORD,
    scope: 'scope.record',
    title: 'permission.record_title',
    description: 'permission.record_description'
  },
  [PermissionType.BLUETOOTH]: {
    type: PermissionType.BLUETOOTH,
    title: 'permission.bluetooth_title',
    description: 'permission.bluetooth_description'
  }
};

/**
 * Android 预请求弹窗配置（每种权限类型的说明文案）
 */
const PREREQUEST_CONFIG: Record<PermissionType, { title: string; desc: string }> = {
  [PermissionType.CAMERA]: {
    title: 'permission_prerequest.camera',
    desc: 'permission_prerequest.camera_desc'
  },
  [PermissionType.ALBUM]: {
    title: 'permission_prerequest.album',
    desc: 'permission_prerequest.album_desc'
  },
  [PermissionType.LOCATION]: {
    title: 'permission_prerequest.location',
    desc: 'permission_prerequest.location_desc'
  },
  [PermissionType.RECORD]: {
    title: 'permission_prerequest.record',
    desc: 'permission_prerequest.record_desc'
  },
  [PermissionType.BLUETOOTH]: {
    title: 'permission_prerequest.bluetooth',
    desc: 'permission_prerequest.bluetooth_desc'
  }
};

/**
 * 显示 Android 预请求弹窗
 * 在请求系统权限之前，先向用户说明申请权限的理由
 * 只有在权限未授权时才显示，权限已授权时跳过
 *
 * @param type 权限类型
 * @returns Promise，用户点击确认时 resolve(true)，点击取消时 resolve(false)
 */
async function showAndroidPreRequest(type: PermissionType): Promise<boolean> {
  // 仅在 Android App 上显示
  if (!AppInfo.isAndroidApp()) {
    return true;
  }

  const config = PREREQUEST_CONFIG[type];
  const title = $t(config.title);
  const desc = $t(config.desc);

  return new Promise((resolve) => {
    uni.showModal({
      title: title,
      content: desc,
      showCancel: true,
      cancelText: $t('common.cancel'),
      confirmText: $t('permission_prerequest.confirm'),
      success: (res) => {
        if (res.confirm) {
          console.log(`[权限预请求] 用户确认，继续请求 ${type} 权限`);
          resolve(true);
        } else {
          console.log(`[权限预请求] 用户取消，不请求 ${type} 权限`);
          resolve(false);
        }
      },
      fail: () => {
        // 弹窗失败，默认继续请求权限
        resolve(true);
      }
    });
  });
}

/**
 * 获取权限类型的 i18n 键
 * @param type 权限类型
 * @returns i18n 键前缀（如 "permission.camera"）
 */
function getPermissionI18nKey(type: PermissionType): string {
  return `permission.${type}_title`;
}

/**
 * 获取权限描述的 i18n 键
 * @param type 权限类型
 * @returns i18n 键（如 "permission.camera_description"）
 */
function getPermissionDescriptionI18nKey(type: PermissionType): string {
  return `permission.${type}_description`;
}

/**
 * 替换模板字符串中的占位符
 * @param template 模板字符串，包含 ${variableName} 格式的占位符
 * @param replacements 替换映射对象，键为变量名（不含 ${}），值为替换值
 * @returns 替换后的字符串
 */
function replaceTemplate(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    // 使用正则表达式替换 ${key} 格式的占位符
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * 生成权限相关的 notify 消息配置
 * @param type 权限类型
 * @param messageType 消息类型
 * @returns NotifyProps 配置对象
 */
function generateNotifyMessage(type: PermissionType, messageType: NotifyMessageType): NotifyProps {
  const titleKey = getPermissionI18nKey(type);
  const descriptionKey = getPermissionDescriptionI18nKey(type);
  const title = $t(titleKey);
  const description = $t(descriptionKey);

  // 准备替换映射
  const replacements: Record<string, string> = {
    title,
    description
  };

  switch (messageType) {
    case NotifyMessageType.REQUESTING:
      // 请求时："允许获得您的相机权限，以便扫描二维码，绑定设备"
      return {
        type: 'primary',
        message: replaceTemplate($t('permission.requesting_template'), replacements),
        duration: 0 // 不自动关闭
      };

    case NotifyMessageType.SUCCESS:
      // 成功："相机权限授权成功"
      return {
        type: 'success',
        message: replaceTemplate($t('permission.success_template'), replacements),
        duration: 2000
      };

    case NotifyMessageType.DENIED:
      // 拒绝且不跳转："已拒绝相机权限，若要使用二维码配网服务请进入系统应用设置，允许对应权限"
      return {
        type: 'warning',
        message: replaceTemplate($t('permission.denied_template'), replacements),
        duration: 3000
      };

    case NotifyMessageType.DENIED_NAVIGATE:
      // 拒绝且自动跳转："已拒绝相机权限，即将跳转到设置页面"
      return {
        type: 'warning',
        message: replaceTemplate($t('permission.denied_navigate_template'), replacements),
        duration: 3000
      };

    default:
      return {
        type: 'primary',
        message: '',
        duration: 2000
      };
  }
}

/**
 * Android 权限映射表
 */
const ANDROID_PERMISSIONS: Record<PermissionType, string[]> = {
  [PermissionType.CAMERA]: ['android.permission.CAMERA'],
  [PermissionType.LOCATION]: [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION'
  ],
  [PermissionType.RECORD]: ['android.permission.RECORD_AUDIO'],
  [PermissionType.BLUETOOTH]: [
    'android.permission.BLUETOOTH',
    'android.permission.BLUETOOTH_ADMIN',
    'android.permission.ACCESS_FINE_LOCATION'
  ],
  [PermissionType.ALBUM]: [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES'
  ]
};

/**
 * 获取 Android 蓝牙权限列表（处理 Android 12+ 版本差异）
 * 注意：Android 12+ 必须请求 BLUETOOTH_SCAN 和 BLUETOOTH_CONNECT
 * 注意：位置权限已移至单独请求，以便有独立的预请求弹窗说明
 */
function getAndroidBluetoothPermissions(): string[] {
  // 直接使用 uni.getSystemInfoSync 获取系统信息（更可靠）
  let osVersion = 0;
  let apiLevel = 0;

  try {
    const systemInfo = uni.getSystemInfoSync() as any;
    osVersion = parseFloat(systemInfo.osVersion || '0');
    apiLevel = systemInfo.osAndroidAPILevel || 0;
    console.log('[蓝牙权限] 系统信息 - osVersion:', systemInfo.osVersion, 'apiLevel:', apiLevel);
  } catch (e) {
    console.warn('[蓝牙权限] 获取系统信息失败:', e);
  }

  // 兜底：使用 AppInfo
  if (osVersion === 0 && AppInfo.osVersion) {
    osVersion = parseFloat(AppInfo.osVersion);
  }
  if (apiLevel === 0 && AppInfo.androidApiLevel) {
    apiLevel = AppInfo.androidApiLevel;
  }

  console.log('[蓝牙权限] 最终版本 - osVersion:', osVersion, 'apiLevel:', apiLevel);

  // Android 12+ (API Level 31+) 需要新蓝牙权限
  // 判断条件：API Level >= 31 或 osVersion >= 12
  const needNewPermissions = apiLevel >= 31 || osVersion >= 12;

  console.log('[蓝牙权限] 需要新权限:', needNewPermissions);

  if (needNewPermissions) {
    // Android 12+ 只请求蓝牙权限（位置权限单独请求）
    return ['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT'];
  } else {
    // Android 11 及以下使用旧权限（位置权限单独请求）
    return ['android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN'];
  }
}

/**
 * 获取 Android 相册权限列表（处理 Android 版本差异）
 * - Android 14+ (API 34+): READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_VISUAL_USER_SELECTED, READ_EXTERNAL_STORAGE
 * - Android 13 (API 33): READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE
 * - Android 12及以下: READ_EXTERNAL_STORAGE
 *
 * 注意：Android 13+ 上 READ_EXTERNAL_STORAGE 已被弃用，系统不会弹出请求弹窗，
 * 但 HBuilderX 调试环境的相册选择器需要此权限，所以仍然请求（用户需手动在设置中开启）
 */
function getAndroidAlbumPermissions(): string[] {
  const apiLevel = AppInfo.androidApiLevel || 0;

  // 兜底：通过版本号判断
  let effectiveApiLevel = apiLevel;
  if (effectiveApiLevel === 0) {
    const versionStr = AppInfo.osVersion;
    if (versionStr) {
      const parsed = parseFloat(versionStr);
      if (!isNaN(parsed)) {
        if (parsed >= 14) effectiveApiLevel = 34;
        else if (parsed >= 13) effectiveApiLevel = 33;
        else effectiveApiLevel = 32;
      }
    }
  }

  console.log(`[权限请求] Android 相册权限 - API Level: ${effectiveApiLevel}`);

  if (effectiveApiLevel >= 34) {
    // Android 14+ 支持"允许有限访问"选项
    // 包含 READ_EXTERNAL_STORAGE 用于 HBuilderX 调试环境
    return [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.READ_EXTERNAL_STORAGE'
    ];
  } else if (effectiveApiLevel >= 33) {
    // Android 13 使用新的媒体权限
    // 包含 READ_EXTERNAL_STORAGE 用于 HBuilderX 调试环境
    return [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE'
    ];
  } else {
    // Android 12及以下使用存储权限
    return ['android.permission.READ_EXTERNAL_STORAGE'];
  }
}

/**
 * 通用函数：根据权限类型获取 Android 权限列表
 * 处理不同类型权限的版本差异
 */
function getAndroidPermissionsForType(type: PermissionType): string[] {
  switch (type) {
    case PermissionType.BLUETOOTH:
      return getAndroidBluetoothPermissions();
    case PermissionType.ALBUM:
      return getAndroidAlbumPermissions();
    default:
      return ANDROID_PERMISSIONS[type] || [];
  }
}

/**
 * 检查 Android 相册权限状态
 * 由于 uni.getAppAuthorizeSetting() 无法获取 Android 相册权限状态（返回 undefined）
 * 需要使用 plus.android 的方式检查
 *
 * 注意：
 * - Android 13+ 上 READ_EXTERNAL_STORAGE 已被弃用
 * - Android 14+ 引入 READ_MEDIA_VISUAL_USER_SELECTED 用于"允许有限访问"
 */
async function checkAndroidAlbumPermissionStatus(): Promise<PermissionStatus> {
  if (!AppInfo.isAndroidApp()) {
    return PermissionStatus.NOT_DETERMINED;
  }

  try {
    // 使用 plus.android 检查权限
    const main = plus.android.runtimeMainActivity();
    const ActivityCompat = plus.android.importClass('androidx.core.app.ActivityCompat') as any;
    const PackageManager = plus.android.importClass('android.content.pm.PackageManager') as any;

    if (!ActivityCompat || !PackageManager) {
      console.warn('[权限检查] ActivityCompat 或 PackageManager 不可用');
      return PermissionStatus.NOT_DETERMINED;
    }

    // 判断 Android 版本
    let apiLevel = AppInfo.androidApiLevel || 0;

    // 兜底：通过版本号判断（当 apiLevel 获取失败时）
    if (apiLevel === 0) {
      const versionStr = AppInfo.osVersion;
      if (versionStr) {
        const parsed = parseFloat(versionStr);
        if (!isNaN(parsed)) {
          if (parsed >= 14) apiLevel = 34;
          else if (parsed >= 13) apiLevel = 33;
          else apiLevel = 32;
        }
      }
      console.log(`[权限检查] API Level 通过版本号推断: ${apiLevel}`);
    }

    const isAndroid14Plus = apiLevel >= 34;
    const isAndroid13Plus = apiLevel >= 33;

    console.log(
      `[权限检查] Android API Level: ${apiLevel}, isAndroid13Plus: ${isAndroid13Plus}, isAndroid14Plus: ${isAndroid14Plus}`
    );

    // Android 14+ 检查逻辑：支持"允许有限访问"
    if (isAndroid14Plus) {
      // 检查完全访问权限
      const imagesGranted =
        ActivityCompat.checkSelfPermission(main, 'android.permission.READ_MEDIA_IMAGES') ===
        PackageManager.PERMISSION_GRANTED;
      const videoGranted =
        ActivityCompat.checkSelfPermission(main, 'android.permission.READ_MEDIA_VIDEO') ===
        PackageManager.PERMISSION_GRANTED;
      // 检查有限访问权限（Android 14+ 新增）
      const partialGranted =
        ActivityCompat.checkSelfPermission(
          main,
          'android.permission.READ_MEDIA_VISUAL_USER_SELECTED'
        ) === PackageManager.PERMISSION_GRANTED;

      console.log(
        `[权限检查] Android 14+ - READ_MEDIA_IMAGES: ${imagesGranted}, READ_MEDIA_VIDEO: ${videoGranted}, READ_MEDIA_VISUAL_USER_SELECTED: ${partialGranted}`
      );

      // 完全访问或有限访问都算已授权
      if ((imagesGranted && videoGranted) || partialGranted) {
        console.log(
          `[权限检查] Android 相册权限检查结果: 已授予${partialGranted && !imagesGranted ? '（有限访问）' : '（完全访问）'}`
        );
        return PermissionStatus.AUTHORIZED;
      }
    }
    // Android 13 检查逻辑
    else if (isAndroid13Plus) {
      const imagesGranted =
        ActivityCompat.checkSelfPermission(main, 'android.permission.READ_MEDIA_IMAGES') ===
        PackageManager.PERMISSION_GRANTED;
      const videoGranted =
        ActivityCompat.checkSelfPermission(main, 'android.permission.READ_MEDIA_VIDEO') ===
        PackageManager.PERMISSION_GRANTED;

      console.log(
        `[权限检查] Android 13 - READ_MEDIA_IMAGES: ${imagesGranted}, READ_MEDIA_VIDEO: ${videoGranted}`
      );

      if (imagesGranted && videoGranted) {
        console.log(`[权限检查] Android 相册权限检查结果: 全部已授予`);
        return PermissionStatus.AUTHORIZED;
      }
    }
    // Android 12及以下检查逻辑
    else {
      const storageGranted =
        ActivityCompat.checkSelfPermission(main, 'android.permission.READ_EXTERNAL_STORAGE') ===
        PackageManager.PERMISSION_GRANTED;

      console.log(`[权限检查] Android 12- READ_EXTERNAL_STORAGE: ${storageGranted}`);

      if (storageGranted) {
        console.log(`[权限检查] Android 相册权限检查结果: 已授予`);
        return PermissionStatus.AUTHORIZED;
      }
    }

    // 未授予
    console.log(`[权限检查] Android 相册权限检查结果: 未授予`);
    return PermissionStatus.NOT_DETERMINED;
  } catch (e) {
    console.warn('[权限检查] Android 相册权限检查失败:', e);
    return PermissionStatus.NOT_DETERMINED;
  }
}

/**
 * 检查权限状态
 */
export async function checkPermissionStatus(type: PermissionType): Promise<PermissionStatus> {
  const config = PERMISSION_CONFIG[type];
  console.log(`[权限检查] 开始检查${config.title}状态`);
  console.log(
    `[权限检查] 当前平台信息: os=${AppInfo.os}, isApp=${AppInfo.isApp()}, isAndroid=${AppInfo.isAndroidApp()}, isIOS=${AppInfo.isIOSApp()}, isHarmonyApp=${AppInfo.isHarmonyApp()}, isHarmonyRom=${AppInfo.isHarmonyRom()}`
  );

  try {
    // 蓝牙权限特殊处理
    if (type === PermissionType.BLUETOOTH) {
      const status = await checkBluetoothPermissionStatus();
      console.log(`[权限检查] ${config.title}状态: ${status}`);
      return status;
    }

    // Android 相册权限特殊处理（uni.getAppAuthorizeSetting 无法获取）
    if (type === PermissionType.ALBUM && AppInfo.isAndroidApp()) {
      const status = await checkAndroidAlbumPermissionStatus();
      console.log(`[权限检查] ${config.title}状态: ${status}`);
      return status;
    }

    // App 平台使用 getAppAuthorizeSetting
    if (AppInfo.isApp()) {
      const authSetting = uni.getAppAuthorizeSetting();

      // 录音权限使用 microphoneAuthorized，其他权限使用 {type}Authorized
      let key: string;
      if (type === PermissionType.RECORD) {
        key = 'microphoneAuthorized';
      } else {
        key = `${type}Authorized`;
      }

      // 使用类型断言访问动态属性
      const authStatus = (authSetting as any)[key];
      console.log(`[权限检查] App平台 ${config.title}授权状态: ${authStatus} (key: ${key})`);

      // 如果权限状态为 undefined，输出完整的 authSetting 对象以便调试
      if (authStatus === undefined) {
        console.log(
          `[权限检查] ${config.title}权限状态为 undefined，完整 authSetting:`,
          JSON.stringify(authSetting)
        );
      }

      if (authStatus === 'authorized') {
        console.log(`[权限检查] ${config.title}已授权`);
        return PermissionStatus.AUTHORIZED;
      } else if (authStatus === 'denied') {
        console.log(`[权限检查] ${config.title}已拒绝`);
        return PermissionStatus.DENIED;
      } else {
        console.log(`[权限检查] ${config.title}未确定`);
        return PermissionStatus.NOT_DETERMINED;
      }
    }

    // 小程序平台使用 getSetting
    if (!config.scope) {
      console.log(`[权限检查] ${config.title}无scope配置`);
      return PermissionStatus.NOT_DETERMINED;
    }

    return new Promise((resolve) => {
      uni.getSetting({
        success: (res) => {
          const authSetting = res.authSetting;
          const scopeKey = config.scope as string;

          // 使用类型断言访问动态属性
          const scopeStatus = (authSetting as any)[scopeKey];
          console.log(`[权限检查] 小程序 ${config.title}授权状态: ${scopeStatus}`);

          if (scopeStatus === true) {
            console.log(`[权限检查] ${config.title}已授权`);
            resolve(PermissionStatus.AUTHORIZED);
          } else if (scopeStatus === false) {
            console.log(`[权限检查] ${config.title}已拒绝`);
            resolve(PermissionStatus.DENIED);
          } else {
            console.log(`[权限检查] ${config.title}未确定`);
            resolve(PermissionStatus.NOT_DETERMINED);
          }
        },
        fail: (err) => {
          console.error(`[权限检查] ${config.title}检查失败:`, err);
          resolve(PermissionStatus.NOT_DETERMINED);
        }
      });
    });
  } catch (error) {
    console.error(`[权限检查] ${config.title}检查异常:`, error);
    return PermissionStatus.NOT_DETERMINED;
  }
}

/**
 * 检查蓝牙权限状态（特殊处理）
 *
 * 注意：Android 12+ 上，DCloud SDK 的 DeviceInfo.blueToothEnable() 方法
 * 会检查旧的 android.permission.BLUETOOTH 权限，但该权限在 Android 12+ 上
 * 不再被授予。因此在 Android 12+ 上，我们跳过 uni.getSystemSetting() 调用，
 * 直接返回 NOT_DETERMINED 让后续流程去请求新权限。
 */
async function checkBluetoothPermissionStatus(): Promise<PermissionStatus> {
  try {
    // iOS 平台处理
    if (AppInfo.isIOSApp()) {
      if (AppInfo.isApp()) {
        const authSetting = uni.getAppAuthorizeSetting();
        console.log('[权限检查] iOS蓝牙授权状态:', authSetting.bluetoothAuthorized);
        if (authSetting.bluetoothAuthorized === 'authorized') {
          return PermissionStatus.AUTHORIZED;
        } else if (authSetting.bluetoothAuthorized === 'denied') {
          return PermissionStatus.DENIED;
        } else {
          // 未确定状态，需要请求权限
          return PermissionStatus.NOT_DETERMINED;
        }
      }
      return PermissionStatus.NOT_DETERMINED;
    }

    // Android 12+ 特殊处理：使用 ActivityCompat.checkSelfPermission 检查权限
    if (AppInfo.isAndroidApp()) {
      const systemInfo = uni.getSystemInfoSync() as any;
      const osVersion = parseFloat(systemInfo.osVersion || '0');
      const apiLevel = systemInfo.osAndroidAPILevel || 0;

      if (apiLevel >= 31 || osVersion >= 12) {
        console.log('[权限检查] Android 12+，使用 ActivityCompat 检查蓝牙权限');
        try {
          const main = plus.android.runtimeMainActivity();
          const ActivityCompat = plus.android.importClass(
            'androidx.core.app.ActivityCompat'
          ) as any;
          const PackageManager = plus.android.importClass(
            'android.content.pm.PackageManager'
          ) as any;

          if (ActivityCompat && PackageManager) {
            // 检查 BLUETOOTH_SCAN 和 BLUETOOTH_CONNECT 权限
            const scanResult = ActivityCompat.checkSelfPermission(
              main,
              'android.permission.BLUETOOTH_SCAN'
            );
            const connectResult = ActivityCompat.checkSelfPermission(
              main,
              'android.permission.BLUETOOTH_CONNECT'
            );
            const scanGranted = scanResult === PackageManager.PERMISSION_GRANTED;
            const connectGranted = connectResult === PackageManager.PERMISSION_GRANTED;

            console.log(
              `[权限检查] Android 12+ BLUETOOTH_SCAN: ${scanGranted ? 'GRANTED' : 'NOT_GRANTED'}`
            );
            console.log(
              `[权限检查] Android 12+ BLUETOOTH_CONNECT: ${connectGranted ? 'GRANTED' : 'NOT_GRANTED'}`
            );

            if (scanGranted && connectGranted) {
              // 权限已授权，再检查蓝牙是否开启
              const BluetoothAdapter = plus.android.importClass(
                'android.bluetooth.BluetoothAdapter'
              ) as any;
              const adapter = BluetoothAdapter.getDefaultAdapter();
              if (adapter && adapter.isEnabled()) {
                console.log('[权限检查] Android 12+ 蓝牙权限已授权且蓝牙已开启');
                return PermissionStatus.AUTHORIZED;
              } else {
                // 权限已授权但蓝牙未开启，返回 UNAVAILABLE 触发开启流程
                console.log('[权限检查] Android 12+ 蓝牙权限已授权但蓝牙未开启');
                return PermissionStatus.UNAVAILABLE;
              }
            }
          }
        } catch (e) {
          console.warn('[权限检查] Android 12+ 蓝牙权限检查失败:', e);
        }
        return PermissionStatus.NOT_DETERMINED;
      }
    }

    // HarmonyOS NEXT 特殊处理：先检查权限授权状态，不依赖蓝牙开关
    // 鸿蒙在未授权时 uni.getSystemSetting().bluetoothEnabled 可能返回 false，
    // 不能据此判断 UNAVAILABLE，否则权限弹窗永远不会出现。
    if (AppInfo.isHarmonyApp()) {
      const authSetting = uni.getAppAuthorizeSetting();
      console.log('[权限检查] HarmonyOS 蓝牙授权状态:', authSetting.bluetoothAuthorized);
      if (authSetting.bluetoothAuthorized === 'authorized') {
        try {
          const sysSetting = uni.getSystemSetting();
          return sysSetting.bluetoothEnabled
            ? PermissionStatus.AUTHORIZED
            : PermissionStatus.UNAVAILABLE;
        } catch (e) {
          console.warn('[权限检查] HarmonyOS 检查蓝牙开关状态失败:', e);
          return PermissionStatus.AUTHORIZED;
        }
      } else if (authSetting.bluetoothAuthorized === 'denied') {
        return PermissionStatus.DENIED;
      } else {
        return PermissionStatus.NOT_DETERMINED;
      }
    }

    // Android 11 及以下：可以安全调用 uni.getSystemSetting()
    const systemSetting = uni.getSystemSetting();

    // Android 平台：先检查蓝牙是否开启
    if (!systemSetting.bluetoothEnabled) {
      return PermissionStatus.UNAVAILABLE;
    }

    // 2. 检查蓝牙权限
    if (AppInfo.isApp()) {
      const authSetting = uni.getAppAuthorizeSetting();
      if (authSetting.bluetoothAuthorized === 'authorized') {
        return PermissionStatus.AUTHORIZED;
      } else if (authSetting.bluetoothAuthorized === 'denied') {
        return PermissionStatus.DENIED;
      } else {
        return PermissionStatus.NOT_DETERMINED;
      }
    }

    // 小程序平台：尝试调用蓝牙 API 来判断
    return PermissionStatus.NOT_DETERMINED;
  } catch (error) {
    console.error('检查蓝牙权限状态失败:', error);
    return PermissionStatus.NOT_DETERMINED;
  }
}

/**
 * 请求 Android 权限
 * @param permissions Android 权限数组
 * @param permissionType 权限类型（用于再次检查权限状态）
 * @returns 1: 授权成功, 0: 临时拒绝（可再次请求）, -1: 永久拒绝（需去设置）
 */
async function requestAndroidPermission(
  permissions: string[],
  permissionType?: PermissionType
): Promise<number> {
  console.log('[权限请求] 开始请求Android权限:', permissions);

  return new Promise((resolve) => {
    if (AppInfo.isAndroidApp()) {
      // 检查 plus.android.requestPermissions 是否可用
      if (!plus || !plus.android || typeof plus.android.requestPermissions !== 'function') {
        console.error('[权限请求] plus.android.requestPermissions 不可用');
        resolve(0);
        return;
      }

      console.log('[权限请求] 调用 plus.android.requestPermissions');
      plus.android.requestPermissions(
        permissions,
        async function (resultObj) {
          console.log('[权限请求] Android权限请求回调结果:', resultObj);

          // 检查所有请求的权限是否都被授予
          const grantedSet = new Set(resultObj.granted || []);
          const allGranted = permissions.every((p) => grantedSet.has(p));

          if (allGranted) {
            console.log('[权限请求] 所有权限都已授予：', resultObj.granted);
            resolve(1); // 授权成功
            return;
          }

          // 检查是否有部分权限被授予
          if (resultObj.granted && resultObj.granted.length > 0) {
            console.log('[权限请求] 部分权限已授予：', resultObj.granted);
            const missingPermissions = permissions.filter((p) => !grantedSet.has(p));
            console.log('[权限请求] 缺少的权限：', missingPermissions);
          }

          // 检查是否有永久拒绝的权限
          if (resultObj.deniedAlways && resultObj.deniedAlways.length > 0) {
            console.log('[权限请求] 系统返回永久拒绝的权限：', resultObj.deniedAlways);

            // 检查是否有部分权限被授予（可能是蓝牙等多权限请求的情况）
            const hasGranted = resultObj.granted && resultObj.granted.length > 0;

            if (hasGranted && permissionType) {
              // 有部分权限被授予，但也有权限被永久拒绝
              // 需要检查核心权限是否已授予
              console.log('[权限请求] 部分权限被授予，部分被永久拒绝，再次检查权限状态');
              const actualStatus = await checkPermissionStatus(permissionType);
              console.log('[权限请求] 权限实际状态:', actualStatus);

              if (actualStatus === PermissionStatus.AUTHORIZED) {
                console.log('[权限请求] 核心权限已授权');
                resolve(1); // 授权成功
                return;
              } else if (actualStatus === PermissionStatus.NOT_DETERMINED) {
                // 某些权限类型（如相册）在 Android 上无法通过 getAppAuthorizeSetting 获取状态
                // 此时应该信任系统返回的 deniedAlways 结果
                console.log('[权限请求] 权限状态检查返回未确定，但系统返回永久拒绝，信任系统结果');
                resolve(-1); // 永久拒绝
                return;
              }
            }

            // 没有任何权限被授予，直接视为永久拒绝
            console.log('[权限请求] 确认为永久拒绝（用户勾选了"不再询问"或之前已永久拒绝）');
            resolve(-1); // 永久拒绝
            return;
          }
          // 检查是否有本次拒绝的权限
          else if (resultObj.deniedPresent && resultObj.deniedPresent.length > 0) {
            console.log('[权限请求] 本次拒绝的权限：', resultObj.deniedPresent);

            // Android 14+ "允许有限访问"场景：
            // READ_MEDIA_IMAGES 和 READ_MEDIA_VIDEO 可能在 deniedPresent 中
            // 但 READ_MEDIA_VISUAL_USER_SELECTED 可能已被授予
            // 需要检查实际权限状态
            if (permissionType) {
              const actualStatus = await checkPermissionStatus(permissionType);
              console.log('[权限请求] 检查实际权限状态:', actualStatus);
              if (actualStatus === PermissionStatus.AUTHORIZED) {
                console.log('[权限请求] 实际权限已授权（可能是有限访问）');
                resolve(1); // 授权成功
                return;
              }
            }

            resolve(0); // 临时拒绝（可再次请求）
            return;
          } else {
            // 其他情况：检查实际权限状态
            if (permissionType) {
              const actualStatus = await checkPermissionStatus(permissionType);
              console.log('[权限请求] 其他情况，检查实际权限状态:', actualStatus);
              if (actualStatus === PermissionStatus.AUTHORIZED) {
                console.log('[权限请求] 实际权限已授权');
                resolve(1); // 授权成功
                return;
              }
            }

            console.log('[权限请求] 其他情况，视为拒绝');
            resolve(0);
            return;
          }
        },
        function (error) {
          console.error('[权限请求] Android权限请求错误：', error.code, error.message);
          resolve(0); // 出错时返回拒绝
        }
      );
    } else {
      console.log('[权限请求] 非Android平台');
      resolve(0);
    }
  });
}

/**
 * iOS 权限请求回退方案
 * 当 Native.js 调用失败时（如真机调试环境），使用 uni-app API 触发系统权限请求
 * @param type 权限类型
 * @returns 1: 授权成功, 0: 拒绝
 */
async function requestIOSPermissionFallback(type: PermissionType): Promise<number> {
  console.log(`[权限请求] iOS使用回退方案请求${PERMISSION_CONFIG[type].title}`);

  return new Promise((resolve) => {
    switch (type) {
      case PermissionType.CAMERA:
        // 使用 uni.chooseImage 配合 camera 源触发相机权限请求
        // 这比 uni.scanCode 更可靠，因为它直接请求相机权限
        console.log('[权限请求] iOS相机权限回退方案：使用 chooseImage(camera) 触发权限请求');
        uni.chooseImage({
          count: 1,
          sourceType: ['camera'],
          success: () => {
            console.log('[权限请求] iOS相机权限回退方案：拍照成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] iOS相机权限回退方案：拍照失败', err);
            // 用户取消拍照不代表权限被拒绝
            if (err.errMsg && err.errMsg.includes('cancel')) {
              // 用户取消后，再次检查权限状态
              setTimeout(() => {
                checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                  console.log('[权限请求] iOS相机权限回退方案：取消后权限状态', status);
                  resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
                });
              }, 500);
            } else if (
              err.errMsg &&
              (err.errMsg.includes('auth') ||
                err.errMsg.includes('permission') ||
                err.errMsg.includes('deny'))
            ) {
              console.log('[权限请求] iOS相机权限回退方案：权限被拒绝');
              resolve(0);
            } else {
              // 其他错误，检查实际权限状态
              checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
              });
            }
          }
        });
        break;

      case PermissionType.LOCATION:
        // 使用 uni.getLocation 触发位置权限请求
        uni.getLocation({
          type: 'wgs84',
          success: () => {
            console.log('[权限请求] iOS位置权限回退方案：获取位置成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] iOS位置权限回退方案：获取位置失败', err);
            resolve(0);
          }
        });
        break;

      case PermissionType.RECORD:
        // 使用录音管理器触发麦克风权限请求
        const recorderManager = uni.getRecorderManager() as any;
        let resolved = false;

        // 恢复 AudioRecorderManager 事件监听
        // 必须在回退方案产生的 onStop 事件消化之后再恢复，否则 AudioRecorderManager 会收到幽灵 onStop
        const restoreAudioRecorderManager = () => {
          try {
            const instance = AudioRecorderManager.getInstanceIfExists();
            if (instance) {
              instance.reattachEvents();
            }
          } catch (e) {
            // 忽略恢复错误
          }
        };

        const onRecordStart = () => {
          if (!resolved) {
            resolved = true;
            console.log('[权限请求] iOS录音权限回退方案：录音开始，权限已授予');
            // 先注册临时 onStop 拦截幽灵录音，消化后再恢复 AudioRecorderManager
            recorderManager.onStop(() => {
              console.log('[权限请求] iOS录音权限回退方案：幽灵录音已停止，恢复事件监听');
              restoreAudioRecorderManager();
            });
            recorderManager.stop();
            resolve(1);
          }
        };

        const onRecordError = (err: any) => {
          if (!resolved) {
            resolved = true;
            console.log('[权限请求] iOS录音权限回退方案：录音失败', err);
            restoreAudioRecorderManager();
            resolve(0);
          }
        };

        recorderManager.onStart(onRecordStart);
        recorderManager.onError(onRecordError);

        // 开始录音以触发权限请求
        recorderManager.start({
          duration: 1000,
          format: 'mp3'
        });

        // 超时处理
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            recorderManager.onStop(() => {
              restoreAudioRecorderManager();
            });
            recorderManager.stop();
            console.log('[权限请求] iOS录音权限回退方案：超时');
            resolve(0);
          }
        }, 3000);
        break;

      case PermissionType.ALBUM:
        // 使用 uni.chooseImage 触发相册权限请求
        uni.chooseImage({
          count: 1,
          sourceType: ['album'],
          success: () => {
            console.log('[权限请求] iOS相册权限回退方案：选择图片成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] iOS相册权限回退方案：选择图片失败', err);
            // 用户取消选择不代表权限被拒绝，需要检查实际状态
            if (err.errMsg && err.errMsg.includes('cancel')) {
              checkPermissionStatus(PermissionType.ALBUM).then((status) => {
                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
              });
            } else {
              resolve(0);
            }
          }
        });
        break;

      case PermissionType.BLUETOOTH:
        // 蓝牙权限通过初始化蓝牙适配器触发
        uni.openBluetoothAdapter({
          success: () => {
            console.log('[权限请求] iOS蓝牙权限回退方案：蓝牙适配器打开成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] iOS蓝牙权限回退方案：蓝牙适配器打开失败', err);
            resolve(0);
          }
        });
        break;

      default:
        console.log('[权限请求] iOS回退方案：不支持的权限类型', type);
        resolve(0);
    }
  });
}

/**
 * 请求 iOS 权限
 * @param type 权限类型
 * @returns 1: 授权成功, 0: 拒绝
 */
async function requestIOSPermission(type: PermissionType): Promise<number> {
  return new Promise((resolve) => {
    if (AppInfo.isIOSApp()) {
      console.log('[权限请求] iOS开始请求权限，类型:', type);

      // 检查 plus.ios 是否可用
      if (typeof plus === 'undefined' || !plus.ios) {
        console.error('[权限请求] plus.ios 不可用，使用回退方案');
        requestIOSPermissionFallback(type).then(resolve);
        return;
      }

      try {
        switch (type) {
          case PermissionType.CAMERA:
            // 请求相机权限 - 直接使用回退方案更可靠
            console.log('[权限请求] iOS请求相机权限');
            // Native.js 调用 block 回调在真机调试时不稳定，直接使用 uni-app API
            requestIOSPermissionFallback(PermissionType.CAMERA).then(resolve);
            break;

          case PermissionType.LOCATION:
            // 请求位置权限 - 直接使用回退方案更可靠
            console.log('[权限请求] iOS请求位置权限');
            requestIOSPermissionFallback(PermissionType.LOCATION).then(resolve);
            break;

          case PermissionType.RECORD:
            // 请求录音权限 - 直接使用回退方案更可靠
            console.log('[权限请求] iOS请求录音权限');
            requestIOSPermissionFallback(PermissionType.RECORD).then(resolve);
            break;

          case PermissionType.BLUETOOTH:
            // iOS 蓝牙权限通过初始化蓝牙适配器触发系统权限弹窗
            console.log('[权限请求] iOS请求蓝牙权限');
            const authSetting = uni.getAppAuthorizeSetting();
            if (authSetting.bluetoothAuthorized === 'authorized') {
              console.log('[权限请求] iOS蓝牙权限已授权');
              resolve(1);
            } else if (authSetting.bluetoothAuthorized === 'denied') {
              console.log('[权限请求] iOS蓝牙权限已被拒绝');
              resolve(0);
            } else {
              // 未确定状态，通过初始化蓝牙适配器触发权限请求
              console.log('[权限请求] iOS蓝牙权限未确定，尝试初始化蓝牙适配器触发权限请求');
              uni.openBluetoothAdapter({
                success: () => {
                  console.log('[权限请求] iOS蓝牙适配器初始化成功，权限已授权');
                  resolve(1);
                },
                fail: (err: any) => {
                  console.log('[权限请求] iOS蓝牙适配器初始化失败:', err);
                  // 检查是否是权限问题
                  if (err.errCode === 10001) {
                    // 蓝牙未开启
                    console.log('[权限请求] iOS蓝牙未开启');
                    resolve(0);
                  } else {
                    // 其他错误，可能是权限被拒绝
                    // 再次检查权限状态
                    const newAuthSetting = uni.getAppAuthorizeSetting();
                    if (newAuthSetting.bluetoothAuthorized === 'authorized') {
                      resolve(1);
                    } else {
                      resolve(0);
                    }
                  }
                }
              });
            }
            break;

          case PermissionType.ALBUM:
            // 请求相册权限
            console.log('[权限请求] iOS请求相册权限');
            try {
              const PHPhotoLibrary = (plus.ios as any).import('PHPhotoLibrary');
              (plus.ios as any).invoke(
                PHPhotoLibrary,
                'requestAuthorization:',
                (status: number) => {
                  // status: 0=未确定, 1=受限, 2=拒绝, 3=授权
                  console.log('[权限请求] iOS相册权限请求结果：', status);
                  (plus.ios as any).deleteObject(PHPhotoLibrary);
                  const granted = status === 3;
                  resolve(granted ? 1 : 0);
                }
              );
            } catch (albumError) {
              console.error('[权限请求] iOS相册权限Native.js调用失败，尝试回退方案：', albumError);
              // 回退方案：使用 uni.chooseImage 触发系统权限请求
              requestIOSPermissionFallback(PermissionType.ALBUM).then(resolve);
            }
            break;

          default:
            console.log('[权限请求] iOS不支持的权限类型:', type);
            resolve(0);
        }
      } catch (error) {
        console.error('[权限请求] iOS权限请求错误：', error);
        resolve(0);
      }
    } else {
      console.log('[权限请求] 非iOS平台');
      resolve(0);
    }
  });
}

/**
 * 鸿蒙平台权限请求
 * 通过调用需要权限的 API 来触发系统权限请求弹窗
 * @param type 权限类型
 * @returns 1: 授权成功, 0: 拒绝, 2: 用户取消
 */
async function requestHarmonyPermission(type: PermissionType): Promise<number> {
  console.log('[权限请求] 鸿蒙平台开始请求权限，类型:', type);

  return new Promise((resolve) => {
    switch (type) {
      case PermissionType.CAMERA:
        console.log('[权限请求] 鸿蒙请求相机权限：使用 scanCode 触发');
        uni.scanCode({
          onlyFromCamera: true,
          success: (res: any) => {
            console.log('[权限请求] 鸿蒙相机权限：扫码成功，权限已授予');
            if (res && res.result) {
              _lastHarmonyScanResult = res.result;
              console.log('[权限请求] 鸿蒙相机权限：已保存扫码结果');
            }
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] 鸿蒙相机权限：扫码失败', err);
            _lastHarmonyScanResult = null;
            if (err.errMsg && err.errMsg.includes('cancel')) {
              console.log('[权限请求] 鸿蒙相机权限：用户取消扫码');
              setTimeout(() => {
                checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                  console.log('[权限请求] 鸿蒙相机权限：取消后权限状态', status);
                  if (status === PermissionStatus.AUTHORIZED) {
                    resolve(1);
                  } else {
                    resolve(2);
                  }
                });
              }, 500);
            } else if (
              err.errMsg &&
              (err.errMsg.includes('auth') ||
                err.errMsg.includes('permission') ||
                err.errMsg.includes('deny'))
            ) {
              console.log('[权限请求] 鸿蒙相机权限：权限被拒绝');
              resolve(0);
            } else {
              checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
              });
            }
          }
        });
        break;

      case PermissionType.LOCATION:
        console.log('[权限请求] 鸿蒙请求位置权限：使用 getLocation 触发');
        uni.getLocation({
          type: 'wgs84',
          success: () => {
            console.log('[权限请求] 鸿蒙位置权限：获取位置成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] 鸿蒙位置权限：获取位置失败', err);
            if (
              err.errMsg &&
              (err.errMsg.includes('auth') ||
                err.errMsg.includes('permission') ||
                err.errMsg.includes('deny'))
            ) {
              resolve(0);
            } else {
              checkPermissionStatus(PermissionType.LOCATION).then((status) => {
                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
              });
            }
          }
        });
        break;

      case PermissionType.RECORD: {
        console.log('[权限请求] 鸿蒙请求录音权限：使用 RecorderManager 触发');
        const recorderManager = uni.getRecorderManager();
        let resolved = false;

        const handleResult = (granted: boolean) => {
          if (resolved) return;
          resolved = true;
          try {
            recorderManager.stop();
          } catch (e) {
            // ignore
          }
          resolve(granted ? 1 : 0);
        };

        recorderManager.onStart(() => {
          console.log('[权限请求] 鸿蒙录音权限：录音开始，权限已授予');
          handleResult(true);
        });

        recorderManager.onError((err: any) => {
          console.log('[权限请求] 鸿蒙录音权限：录音失败', err);
          checkPermissionStatus(PermissionType.RECORD).then((status) => {
            handleResult(status === PermissionStatus.AUTHORIZED);
          });
        });

        recorderManager.start({ duration: 1000 });

        setTimeout(() => {
          if (!resolved) {
            checkPermissionStatus(PermissionType.RECORD).then((status) => {
              handleResult(status === PermissionStatus.AUTHORIZED);
            });
          }
        }, 5000);
        break;
      }

      case PermissionType.BLUETOOTH: {
        console.log('[权限请求] 鸿蒙请求蓝牙权限：使用 openBluetoothAdapter 触发');
        const authSetting = uni.getAppAuthorizeSetting();
        if (authSetting.bluetoothAuthorized === 'authorized') {
          console.log('[权限请求] 鸿蒙蓝牙权限已授权');
          resolve(1);
        } else {
          console.log(
            '[权限请求] 鸿蒙蓝牙权限状态:',
            authSetting.bluetoothAuthorized,
            '，尝试 openBluetoothAdapter 触发系统权限弹窗'
          );
          uni.openBluetoothAdapter({
            success: () => {
              console.log('[权限请求] 鸿蒙蓝牙适配器初始化成功，权限已授权');
              resolve(1);
            },
            fail: (err: any) => {
              console.log('[权限请求] 鸿蒙蓝牙适配器初始化失败:', err);
              if (err.errCode === 10001) {
                console.log('[权限请求] 鸿蒙蓝牙未开启');
              }
              const newAuthSetting = uni.getAppAuthorizeSetting();
              console.log('[权限请求] 鸿蒙蓝牙权限重新检查:', newAuthSetting.bluetoothAuthorized);
              resolve(newAuthSetting.bluetoothAuthorized === 'authorized' ? 1 : 0);
            }
          });
        }
        break;
      }

      case PermissionType.ALBUM:
        console.log('[权限请求] 鸿蒙请求相册权限：使用 chooseImage 触发');
        uni.chooseImage({
          count: 1,
          sourceType: ['album'],
          success: () => {
            console.log('[权限请求] 鸿蒙相册权限：选择图片成功，权限已授予');
            resolve(1);
          },
          fail: (err: any) => {
            console.log('[权限请求] 鸿蒙相册权限：选择图片失败', err);
            if (err.errMsg && err.errMsg.includes('cancel')) {
              checkPermissionStatus(PermissionType.ALBUM).then((status) => {
                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0);
              });
            } else {
              resolve(0);
            }
          }
        });
        break;

      default:
        console.log('[权限请求] 鸿蒙不支持的权限类型:', type);
        resolve(0);
    }
  });
}

/**
 * 请求权限
 */
export async function requestPermission(
  type: PermissionType,
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  const config = PERMISSION_CONFIG[type];
  console.log(`[权限请求] 尝试请求${config.title}`);
  console.log(
    `[权限请求] 当前平台信息: os=${AppInfo.os}, isApp=${AppInfo.isApp()}, isAndroid=${AppInfo.isAndroidApp()}, isIOS=${AppInfo.isIOSApp()}, isHarmonyApp=${AppInfo.isHarmonyApp()}, isHarmonyRom=${AppInfo.isHarmonyRom()}`
  );

  try {
    // 1. 检查当前权限状态
    const status = await checkPermissionStatus(type);

    // 如果已授权，直接返回成功，不显示 notify
    if (status === PermissionStatus.AUTHORIZED) {
      console.log(`[权限请求] ${config.title}已授权，直接返回`);
      return {
        granted: true,
        status: PermissionStatus.AUTHORIZED
      };
    }

    // 蓝牙权限特殊处理：权限已授权但蓝牙未开启
    // 显示预请求弹窗，让用户点击"一键开启"来开启蓝牙
    if (type === PermissionType.BLUETOOTH && status === PermissionStatus.UNAVAILABLE) {
      console.log(`[权限请求] 蓝牙权限已授权但蓝牙未开启，显示预请求弹窗`);

      // 显示预请求弹窗
      if (AppInfo.isAndroidApp()) {
        const userConfirmed = await showAndroidPreRequest(type);
        if (!userConfirmed) {
          console.log(`[权限请求] 用户取消开启蓝牙`);
          return {
            granted: false,
            status: PermissionStatus.UNAVAILABLE,
            message: '用户取消开启蓝牙'
          };
        }
      }

      // 用户点击"一键开启"后，直接开启蓝牙
      console.log(`[权限请求] 用户确认，开启蓝牙`);
      const enabled = await enableBluetooth();
      if (enabled) {
        console.log(`[权限请求] 蓝牙已成功开启`);
        return {
          granted: true,
          status: PermissionStatus.AUTHORIZED
        };
      } else {
        // 开启失败，显示提示让用户手动开启
        uni.showModal({
          title: $t('common.tip'),
          content: $t('permission.bluetooth_not_enabled'),
          showCancel: true,
          cancelText: $t('common.cancel'),
          confirmText: $t('common.go_to_setting'),
          success: (res) => {
            if (res.confirm) {
              openBluetoothSetting();
            }
          }
        });
        return {
          granted: false,
          status: PermissionStatus.UNAVAILABLE,
          message: '蓝牙未开启'
        };
      }
    }

    // 蓝牙权限特殊处理
    if (type === PermissionType.BLUETOOTH) {
      console.log(`[权限请求] ${config.title}使用特殊处理流程`);
      return await requestBluetoothPermission(notify, autoNavigateToSetting);
    }

    // 特殊处理：iOS App 平台下，如果已经拒绝，系统不会再次弹出权限确认框
    // 必须引导用户去系统设置页面手动开启
    if (AppInfo.isIOSApp() && status === PermissionStatus.DENIED && AppInfo.isApp()) {
      console.log(`[权限请求] iOS ${config.title}已处于拒绝状态，提示跳转设置`);
      if (notify) {
        notify.close();
        const messageType = autoNavigateToSetting
          ? NotifyMessageType.DENIED_NAVIGATE
          : NotifyMessageType.DENIED;
        notify.show(generateNotifyMessage(type, messageType));
      }
      if (autoNavigateToSetting) {
        setTimeout(() => {
          openPermissionSetting();
        }, 1500);
      }
      return {
        granted: false,
        status: PermissionStatus.DENIED,
        message: $t('permission.denied_setting')
      };
    }

    // 2. Android 预请求弹窗：在请求系统权限之前先向用户说明
    // 注：到这里时 status 一定不是 AUTHORIZED（已在上面提前返回）
    if (AppInfo.isAndroidApp()) {
      console.log(`[权限预请求] Android 显示 ${config.title} 预请求弹窗`);
      const userConfirmed = await showAndroidPreRequest(type);
      if (!userConfirmed) {
        console.log(`[权限预请求] 用户取消，不继续请求 ${config.title}`);
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.user_cancelled')
        };
      }
    }

    // 3. 显示权限说明（notify）
    if (notify) {
      console.log(`[权限请求] 显示${config.title}请求说明`);
      notify.show(generateNotifyMessage(type, NotifyMessageType.REQUESTING));
    }

    // 等待 notify 显示
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log(`[权限请求] 开始请求${config.title}`);

    // 3. 请求权限（添加超时保护）
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => {
        console.error(`[权限请求] ${config.title}请求超时（${REQUEST_TIMEOUT / 1000}秒）`);
        resolve(0); // 超时返回拒绝
      }, REQUEST_TIMEOUT);
      console.log(`[权限请求] 创建超时定时器，ID: ${timeoutId}`);
    });

    // 清理超时定时器的辅助函数
    const clearTimeoutIfNeeded = () => {
      if (timeoutId !== null) {
        console.log(`[权限请求] 清理超时定时器，ID: ${timeoutId}`);
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    try {
      if (AppInfo.isApp()) {
        // App 平台：根据平台调用相应的权限请求函数
        if (AppInfo.isAndroidApp()) {
          // Android 平台：主动请求权限
          // 注意：蓝牙权限已在前面特殊处理，这里不会是蓝牙权限
          // 相册权限需要根据 Android 版本选择不同的权限
          let permissions: string[];
          if (type === PermissionType.ALBUM) {
            permissions = getAndroidAlbumPermissions();
          } else {
            permissions = ANDROID_PERMISSIONS[type];
          }

          const result = await Promise.race([
            requestAndroidPermission(permissions, type),
            timeoutPromise
          ]);

          // 权限请求完成，清理超时定时器
          clearTimeoutIfNeeded();

          console.log(`[权限请求] Android ${config.title}请求结果:`, result);

          if (result === 1) {
            // 用户授权成功
            if (notify) {
              notify.close();
              notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS));
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else if (result === 0) {
            // 用户临时拒绝或超时
            if (notify) {
              notify.close();
              notify.show(generateNotifyMessage(type, NotifyMessageType.DENIED));
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.user_denied')
            };
          } else {
            // result === -1, 用户永久拒绝
            if (notify) {
              notify.close();
            }

            // 显示弹窗引导用户去设置中开启权限
            uni.showModal({
              title: $t('common.tip'),
              content:
                $t(`permission.${type}_denied_guide`) || $t('permission.permanently_denied_guide'),
              showCancel: !autoNavigateToSetting,
              cancelText: $t('common.cancel'),
              confirmText: $t('common.go_to_setting'),
              success: (res) => {
                if (res.confirm) {
                  openPermissionSetting();
                }
              }
            });

            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.permanently_denied')
            };
          }
        } else if (AppInfo.isIOSApp()) {
          // iOS 平台：主动请求权限（满足应用商店审核要求）
          const result = await Promise.race([requestIOSPermission(type), timeoutPromise]);

          // 权限请求完成，清理超时定时器
          clearTimeoutIfNeeded();

          console.log(`[权限请求] iOS ${config.title}请求结果:`, result);

          if (result === 1) {
            if (notify) {
              notify.close();
              notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS));
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else {
            // 拒绝或超时 → 根据参数决定是否跳转设置
            if (notify) {
              notify.close();
              const messageType = autoNavigateToSetting
                ? NotifyMessageType.DENIED_NAVIGATE
                : NotifyMessageType.DENIED;
              notify.show(generateNotifyMessage(type, messageType));
            }
            if (autoNavigateToSetting) {
              setTimeout(() => {
                openPermissionSetting();
              }, 1500);
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.denied_setting')
            };
          }
        } else if (AppInfo.isHarmonyApp()) {
          const result = await Promise.race([requestHarmonyPermission(type), timeoutPromise]);

          clearTimeoutIfNeeded();

          console.log(`[权限请求] 鸿蒙 ${config.title}请求结果:`, result);

          if (result === 1) {
            if (notify) {
              notify.close();
              notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS));
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else if (result === 2) {
            console.log('[权限请求] 鸿蒙：用户取消操作，不跳转设置');
            if (notify) {
              notify.close();
            }
            return {
              granted: false,
              status: PermissionStatus.NOT_DETERMINED,
              message: '用户取消'
            };
          } else {
            if (notify) {
              notify.close();
              const messageType = autoNavigateToSetting
                ? NotifyMessageType.DENIED_NAVIGATE
                : NotifyMessageType.DENIED;
              notify.show(generateNotifyMessage(type, messageType));
            }
            if (autoNavigateToSetting) {
              setTimeout(() => {
                openPermissionSetting();
              }, 1500);
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.denied_setting')
            };
          }
        } else {
          // 其他 App 平台
          console.error(`[权限请求] 不支持的App平台`);
          clearTimeoutIfNeeded();
          if (notify) {
            notify.close();
          }
          return {
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: $t('permission.unsupported_platform')
          };
        }
      } else {
        // 小程序平台：使用 uni.authorize
        clearTimeoutIfNeeded();
        console.log(`[权限请求] 小程序平台请求${config.title}`);
        return await authorizePermission(type, notify);
      }
    } catch (error: any) {
      // 异常情况下也要清理超时定时器
      clearTimeoutIfNeeded();
      console.error(`[权限请求] 请求${config.title}异常:`, error);
      // 关闭 notify
      if (notify) {
        try {
          notify.close();
        } catch (closeError) {
          console.error(`[权限请求] 关闭notify失败:`, closeError);
        }
      }
      return {
        granted: false,
        status: PermissionStatus.NOT_DETERMINED,
        message: error.message || $t('permission.request_failed')
      };
    }
  } catch (error: any) {
    console.error(`[权限请求] 请求${config.title}异常:`, error);
    // 关闭 notify
    if (notify) {
      try {
        notify.close();
      } catch (closeError) {
        console.error(`[权限请求] 关闭notify失败:`, closeError);
      }
    }
    return {
      granted: false,
      status: PermissionStatus.NOT_DETERMINED,
      message: error.message || $t('permission.request_failed')
    };
  }
}

/**
 * 使用 uni.authorize 请求权限（小程序平台）
 */
function authorizePermission(
  type: PermissionType,
  notify?: NotifyFunctions
): Promise<PermissionResult> {
  const config = PERMISSION_CONFIG[type];

  if (!config.scope) {
    return Promise.resolve({
      granted: false,
      status: PermissionStatus.NOT_DETERMINED,
      message: $t('permission.unsupported_type')
    });
  }

  return new Promise((resolve) => {
    uni.authorize({
      scope: config.scope as string,
      success: () => {
        if (notify) {
          notify.close();
          notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS));
        }
        resolve({
          granted: true,
          status: PermissionStatus.AUTHORIZED
        });
      },
      fail: (err) => {
        console.error('授权失败:', err);

        // 授权失败，引导用户到设置页面
        if (notify) {
          notify.close();
          notify.show(generateNotifyMessage(type, NotifyMessageType.DENIED_NAVIGATE));
        }

        setTimeout(() => {
          openPermissionSetting();
        }, 1500);

        resolve({
          granted: false,
          status: PermissionStatus.DENIED,
          message: '用户拒绝授权'
        });
      }
    });
  });
}

/**
 * 请求蓝牙权限（特殊处理）
 * 注意：Android 12+ 必须先请求权限才能调用蓝牙相关 API
 */
async function requestBluetoothPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  const config = PERMISSION_CONFIG[PermissionType.BLUETOOTH];
  console.log('[权限请求] 尝试请求蓝牙权限');

  try {
    // ===== Android 12+ 特殊处理：必须先请求权限再检查蓝牙状态 =====
    // 因为 Android 12+ 调用 BluetoothAdapter.isEnabled() 需要 BLUETOOTH_CONNECT 权限
    const osVersion = parseFloat(AppInfo.osVersion || '0');
    const isAndroid12Plus = AppInfo.isAndroidApp() && osVersion >= 12;

    if (isAndroid12Plus && AppInfo.isApp()) {
      console.log('[权限请求] Android 12+，先请求权限再检查蓝牙状态');

      // Android 预请求弹窗：在请求系统权限之前先向用户说明
      console.log('[权限预请求] Android 显示蓝牙权限预请求弹窗');
      const userConfirmed = await showAndroidPreRequest(PermissionType.BLUETOOTH);
      if (!userConfirmed) {
        console.log('[权限预请求] 用户取消，不继续请求蓝牙权限');
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.user_cancelled')
        };
      }

      // 显示权限说明
      if (notify) {
        notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.REQUESTING));
      }

      // 先请求权限
      const permissions = getAndroidBluetoothPermissions();
      console.log('[权限请求] Android 12+ 蓝牙权限列表:', permissions);

      const result = await requestAndroidPermission(permissions, PermissionType.BLUETOOTH);
      console.log('[权限请求] Android 12+ 权限请求结果:', result);

      if (result === 1) {
        // 权限授予成功，现在可以安全检查蓝牙状态
        try {
          const systemSetting = uni.getSystemSetting();
          if (!systemSetting.bluetoothEnabled) {
            console.log('[权限请求] 蓝牙未开启，尝试直接开启');
            if (notify) {
              notify.close();
            }

            // 尝试直接开启蓝牙
            const enabled = await enableBluetooth();
            if (enabled) {
              console.log('[权限请求] 蓝牙已成功开启');
              if (notify) {
                notify.show(
                  generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS)
                );
              }
              return {
                granted: true,
                status: PermissionStatus.AUTHORIZED
              };
            }

            // 开启失败，显示提示让用户手动开启
            uni.showModal({
              title: $t('common.tip'),
              content: $t('permission.bluetooth_not_enabled'),
              showCancel: true,
              cancelText: $t('common.cancel'),
              confirmText: $t('common.go_to_setting'),
              success: (res) => {
                if (res.confirm) {
                  openBluetoothSetting();
                }
              }
            });
            return {
              granted: false,
              status: PermissionStatus.UNAVAILABLE,
              message: '蓝牙未开启'
            };
          }
        } catch (e) {
          console.warn('[权限请求] 检查蓝牙状态失败，继续执行:', e);
        }

        if (notify) {
          notify.close();
          notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS));
        }
        return {
          granted: true,
          status: PermissionStatus.AUTHORIZED
        };
      } else if (result === 0) {
        // 用户临时拒绝
        if (notify) {
          notify.close();
          notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED));
        }
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.bluetooth_user_denied')
        };
      } else {
        // result === -1, 永久拒绝
        if (notify) {
          notify.close();
          const messageType = autoNavigateToSetting
            ? NotifyMessageType.DENIED_NAVIGATE
            : NotifyMessageType.DENIED;
          notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType));
        }
        if (autoNavigateToSetting) {
          setTimeout(() => {
            openPermissionSetting();
          }, 1500);
        }
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.bluetooth_permanently_denied')
        };
      }
    }
    // ===== Android 12+ 特殊处理结束 =====

    // 1. 检查蓝牙是否开启（仅对非 Android 12+ 有效）
    // iOS / HarmonyOS 平台：bluetoothEnabled 在权限未授权时可能返回 false，需要先请求权限
    if (!isAndroid12Plus) {
      const systemSetting = uni.getSystemSetting();
      if (!AppInfo.isIOSApp() && !AppInfo.isHarmonyApp() && !systemSetting.bluetoothEnabled) {
        console.log('[权限请求] 蓝牙未开启，尝试直接开启');
        if (notify) {
          notify.close();
        }

        // 尝试直接开启蓝牙
        const enabled = await enableBluetooth();
        if (enabled) {
          console.log('[权限请求] 蓝牙已成功开启');
          // 继续后续流程
        } else {
          // 开启失败，显示提示让用户手动开启
          uni.showModal({
            title: $t('common.tip'),
            content: $t('permission.bluetooth_not_enabled'),
            showCancel: true,
            cancelText: $t('common.cancel'),
            confirmText: $t('common.go_to_setting'),
            success: (res) => {
              if (res.confirm) {
                openBluetoothSetting();
              }
            }
          });

          return {
            granted: false,
            status: PermissionStatus.UNAVAILABLE,
            message: '蓝牙未开启'
          };
        }
      }
    }

    // 2. 检查是否已授权（避免不必要的请求）- 仅非 Android 12+
    if (AppInfo.isApp() && !isAndroid12Plus) {
      const authSetting = uni.getAppAuthorizeSetting();
      if (authSetting.bluetoothAuthorized === 'authorized') {
        console.log('[权限请求] 蓝牙权限已授权');
        return {
          granted: true,
          status: PermissionStatus.AUTHORIZED
        };
      }
    }

    // 3. 显示权限说明
    if (notify) {
      console.log('[权限请求] 显示蓝牙权限请求说明');
      notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.REQUESTING));
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log('[权限请求] 开始请求蓝牙权限');

    // 4. 请求蓝牙权限（添加超时保护）
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => {
        console.error('[权限请求] 蓝牙权限请求超时（10秒）');
        resolve(0); // 超时返回拒绝
      }, REQUEST_TIMEOUT);
      console.log(`[权限请求] 创建蓝牙权限超时定时器，ID: ${timeoutId}`);
    });

    // 清理超时定时器的辅助函数
    const clearTimeoutIfNeeded = () => {
      if (timeoutId !== null) {
        console.log(`[权限请求] 清理蓝牙权限超时定时器，ID: ${timeoutId}`);
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    try {
      if (AppInfo.isApp()) {
        // 根据平台主动请求权限
        if (AppInfo.isAndroidApp()) {
          // Android 平台：主动请求蓝牙权限
          const permissions = getAndroidBluetoothPermissions();
          console.log('[权限请求] Android蓝牙权限列表:', permissions);

          const result = await Promise.race([
            requestAndroidPermission(permissions, PermissionType.BLUETOOTH),
            timeoutPromise
          ]);

          // 权限请求完成，清理超时定时器
          clearTimeoutIfNeeded();

          console.log('[权限请求] Android蓝牙权限请求结果:', result);

          if (result === 1) {
            // 用户授权成功
            if (notify) {
              notify.close();
              notify.show(
                generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS)
              );
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else if (result === 0) {
            // 用户临时拒绝
            if (notify) {
              notify.close();
              notify.show(
                generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED)
              );
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.bluetooth_user_denied')
            };
          } else {
            // result === -1, 用户永久拒绝
            if (notify) {
              notify.close();
              const messageType = autoNavigateToSetting
                ? NotifyMessageType.DENIED_NAVIGATE
                : NotifyMessageType.DENIED;
              notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType));
            }
            if (autoNavigateToSetting) {
              setTimeout(() => {
                openPermissionSetting();
              }, 1500);
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.bluetooth_permanently_denied')
            };
          }
        } else if (AppInfo.isIOSApp()) {
          // iOS 平台：主动请求蓝牙权限
          const result = await Promise.race([
            requestIOSPermission(PermissionType.BLUETOOTH),
            timeoutPromise
          ]);

          // 权限请求完成，清理超时定时器
          clearTimeoutIfNeeded();

          console.log('[权限请求] iOS蓝牙权限请求结果:', result);

          if (result === 1) {
            if (notify) {
              notify.close();
              notify.show(
                generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS)
              );
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else {
            // 拒绝 → 根据参数决定是否跳转设置
            if (notify) {
              notify.close();
              const messageType = autoNavigateToSetting
                ? NotifyMessageType.DENIED_NAVIGATE
                : NotifyMessageType.DENIED;
              notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType));
            }
            if (autoNavigateToSetting) {
              setTimeout(() => {
                openPermissionSetting();
              }, 1500);
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.bluetooth_denied_setting')
            };
          }
        } else if (AppInfo.isHarmonyApp()) {
          const result = await Promise.race([
            requestHarmonyPermission(PermissionType.BLUETOOTH),
            timeoutPromise
          ]);

          clearTimeoutIfNeeded();

          console.log('[权限请求] 鸿蒙蓝牙权限请求结果:', result);

          if (result === 1) {
            if (notify) {
              notify.close();
              notify.show(
                generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS)
              );
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          } else {
            if (notify) {
              notify.close();
              const messageType = autoNavigateToSetting
                ? NotifyMessageType.DENIED_NAVIGATE
                : NotifyMessageType.DENIED;
              notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType));
            }
            if (autoNavigateToSetting) {
              setTimeout(() => {
                openPermissionSetting();
              }, 1500);
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: $t('permission.bluetooth_denied_setting')
            };
          }
        } else {
          // 其他 App 平台
          console.error('[权限请求] 不支持的App平台');
          clearTimeoutIfNeeded();
          if (notify) {
            notify.close();
          }
          return {
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: $t('permission.unsupported_platform')
          };
        }
      } else {
        // 小程序平台：需要通过调用 openBluetoothAdapter 来触发权限请求
        // 微信小程序会自动弹出系统权限请求对话框
        console.log('[权限请求] 小程序平台蓝牙权限，尝试通过 openBluetoothAdapter 触发');

        try {
          // 尝试打开蓝牙适配器，这会触发权限请求
          await new Promise<void>((resolve, reject) => {
            uni.openBluetoothAdapter({
              success: () => {
                console.log('[权限请求] 小程序蓝牙权限授权成功');
                resolve();
              },
              fail: (err: any) => {
                console.log('[权限请求] 小程序蓝牙权限失败:', err);
                reject(err);
              }
            });
          });

          clearTimeoutIfNeeded();
          if (notify) {
            notify.close();
          }
          return {
            granted: true,
            status: PermissionStatus.AUTHORIZED
          };
        } catch (btError: any) {
          clearTimeoutIfNeeded();
          const errMsg = btError?.errMsg || btError?.message || String(btError);
          console.log('[权限请求] 小程序蓝牙权限错误详情:', errMsg);

          // "already opened" 表示之前已经成功打开过，权限已授予
          if (errMsg.includes('already opened') || errMsg.includes('already open')) {
            console.log('[权限请求] 蓝牙适配器已打开，权限已授予');
            if (notify) {
              notify.close();
            }
            return {
              granted: true,
              status: PermissionStatus.AUTHORIZED
            };
          }

          // 蓝牙未开启
          if (
            errMsg.includes('not available') ||
            errMsg.includes('not turned on') ||
            errMsg.includes('未开启')
          ) {
            if (notify) {
              notify.close();
            }
            // 显示系统弹窗提示用户开启蓝牙
            uni.showModal({
              title: $t('common.tip'),
              content: $t('permission.bluetooth_not_enabled'),
              showCancel: true,
              cancelText: $t('common.cancel'),
              confirmText: $t('common.go_to_setting'),
              success: (res) => {
                if (res.confirm) {
                  openBluetoothSetting();
                }
              }
            });
            return {
              granted: false,
              status: PermissionStatus.UNAVAILABLE,
              message: '蓝牙未开启'
            };
          }

          // 权限被拒绝
          if (
            errMsg.includes('auth deny') ||
            errMsg.includes('permission') ||
            errMsg.includes('authorize')
          ) {
            if (notify) {
              notify.close();
              notify.show(
                generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED)
              );
            }
            return {
              granted: false,
              status: PermissionStatus.DENIED,
              message: '蓝牙权限被拒绝'
            };
          }

          // 其他错误，默认视为权限问题
          if (notify) {
            notify.close();
          }
          return {
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: errMsg
          };
        }
      }
    } catch (error: any) {
      // 异常情况下也要清理超时定时器
      clearTimeoutIfNeeded();
      console.error('[权限请求] 请求蓝牙权限异常:', error);
      // 关闭 notify
      if (notify) {
        try {
          notify.close();
        } catch (closeError) {
          console.error('[权限请求] 关闭notify失败:', closeError);
        }
      }
      return {
        granted: false,
        status: PermissionStatus.NOT_DETERMINED,
        message: error.message || $t('permission.bluetooth_request_failed')
      };
    }
  } catch (error: any) {
    // 外层异常处理
    console.error('[权限请求] 请求蓝牙权限外层异常:', error);
    if (notify) {
      try {
        notify.close();
      } catch (closeError) {
        console.error('[权限请求] 关闭notify失败:', closeError);
      }
    }
    return {
      granted: false,
      status: PermissionStatus.NOT_DETERMINED,
      message: error.message || '请求蓝牙权限失败'
    };
  }
}

/**
 * 打开权限设置页面
 */
export function openPermissionSetting(): void {
  try {
    if (AppInfo.isApp()) {
      // App 平台：打开应用权限设置
      uni.openAppAuthorizeSetting({
        success: () => {
          console.log('打开应用权限设置成功');
        },
        fail: (err) => {
          console.error('打开应用权限设置失败:', err);
          // 降级方案：尝试打开系统设置
          if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
            plus.runtime.openURL('app-settings:');
          }
        }
      });
    } else {
      // 小程序平台：打开设置页面
      uni.openSetting({
        success: () => {
          console.log('打开设置页面成功');
        },
        fail: (err) => {
          console.error('打开设置页面失败:', err);
        }
      });
    }
  } catch (error) {
    console.error('打开权限设置失败:', error);
  }
}

/**
 * 直接开启蓝牙（Android 平台）
 * 不弹出询问对话框，直接开启
 * @returns Promise<boolean> 是否成功开启蓝牙
 */
export async function enableBluetooth(): Promise<boolean> {
  if (!AppInfo.isAndroidApp()) {
    return false;
  }

  try {
    console.log('[蓝牙] 尝试直接开启蓝牙...');

    const BluetoothAdapter = plus.android.importClass('android.bluetooth.BluetoothAdapter') as any;
    const adapter = BluetoothAdapter.getDefaultAdapter();

    if (!adapter) {
      console.log('[蓝牙] 设备不支持蓝牙');
      return false;
    }

    if (adapter.isEnabled()) {
      console.log('[蓝牙] 蓝牙已经开启');
      return true;
    }

    // 直接调用 enable() 开启蓝牙（不弹出询问对话框）
    // 需要 BLUETOOTH_CONNECT 权限（Android 12+）或 BLUETOOTH_ADMIN 权限（Android 11及以下）
    console.log('[蓝牙] 调用 adapter.enable() 开启蓝牙');
    const result = adapter.enable();
    console.log('[蓝牙] enable() 返回:', result);

    // 等待蓝牙开启（最多等待 5 秒）
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (adapter.isEnabled()) {
        console.log('[蓝牙] 蓝牙已成功开启');
        return true;
      }
    }

    // 超时，检查最终状态
    const isEnabled = adapter.isEnabled();
    console.log('[蓝牙] 开启蓝牙结果:', isEnabled);
    return isEnabled;
  } catch (error) {
    console.error('[蓝牙] 开启蓝牙失败:', error);
    return false;
  }
}

/**
 * 打开蓝牙设置页面
 */
export function openBluetoothSetting(): void {
  try {
    if (AppInfo.isAndroidApp()) {
      // Android 平台：打开蓝牙设置
      const Intent = plus.android.importClass('android.content.Intent') as any;
      const Settings = plus.android.importClass('android.provider.Settings') as any;
      const intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
      const main = plus.android.runtimeMainActivity() as any;
      main.startActivity(intent);
      console.log('打开蓝牙设置成功');
    } else if (AppInfo.isIOSApp()) {
      // iOS 平台：打开蓝牙设置（需要跳转到系统设置）
      if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
        plus.runtime.openURL('App-Prefs:root=Bluetooth');
      }
    } else {
      // 其他平台：打开应用设置
      openPermissionSetting();
    }
  } catch (error) {
    console.error('打开蓝牙设置失败:', error);
    // 降级方案：打开应用设置
    openPermissionSetting();
  }
}

/**
 * 便捷方法：请求相机权限
 */
export async function requestCameraPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  return requestPermission(PermissionType.CAMERA, notify, autoNavigateToSetting);
}

/**
 * 便捷方法：请求位置权限
 */
export async function requestLocationPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  return requestPermission(PermissionType.LOCATION, notify, autoNavigateToSetting);
}

/**
 * 便捷方法：请求录音权限
 */
export async function requestRecordPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  return requestPermission(PermissionType.RECORD, notify, autoNavigateToSetting);
}

/**
 * 便捷方法：请求蓝牙权限
 */
export async function requestBluetoothPermissionWrapper(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  return requestPermission(PermissionType.BLUETOOTH, notify, autoNavigateToSetting);
}

/**
 * 便捷方法：请求相册权限
 */
export async function requestAlbumPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  return requestPermission(PermissionType.ALBUM, notify, autoNavigateToSetting);
}

/**
 * 便捷方法：同时请求相机和相册权限（合并预请求弹窗）
 * 用于扫码功能，避免弹出两次预请求弹窗
 */
export async function requestCameraAndAlbumPermission(
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<{ camera: PermissionResult; album: PermissionResult }> {
  // 1. 先检查权限状态
  const cameraStatus = await checkPermissionStatus(PermissionType.CAMERA);
  const albumStatus = await checkPermissionStatus(PermissionType.ALBUM);

  console.log(`[权限请求] 相机权限状态: ${cameraStatus}, 相册权限状态: ${albumStatus}`);

  // 如果两个权限都已授权，直接返回
  if (cameraStatus === PermissionStatus.AUTHORIZED && albumStatus === PermissionStatus.AUTHORIZED) {
    console.log('[权限请求] 相机和相册权限都已授权');
    return {
      camera: { granted: true, status: PermissionStatus.AUTHORIZED },
      album: { granted: true, status: PermissionStatus.AUTHORIZED }
    };
  }

  // 2. Android 显示合并的预请求弹窗
  const needCameraPreRequest = cameraStatus !== PermissionStatus.AUTHORIZED;
  const needAlbumPreRequest = albumStatus !== PermissionStatus.AUTHORIZED;

  if (AppInfo.isAndroidApp() && (needCameraPreRequest || needAlbumPreRequest)) {
    console.log('[权限预请求] Android 显示相机+相册合并预请求弹窗');

    const userConfirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: $t('permission_prerequest.camera_album_title'),
        content: $t('permission_prerequest.camera_album_desc'),
        showCancel: true,
        cancelText: $t('common.cancel'),
        confirmText: $t('permission_prerequest.confirm'),
        success: (res) => {
          if (res.confirm) {
            console.log('[权限预请求] 用户确认，继续请求相机和相册权限');
            resolve(true);
          } else {
            console.log('[权限预请求] 用户取消，不请求相机和相册权限');
            resolve(false);
          }
        },
        fail: () => {
          resolve(true);
        }
      });
    });

    if (!userConfirmed) {
      return {
        camera: {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.user_cancelled')
        },
        album: {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.user_cancelled')
        }
      };
    }
  }

  // 3. 请求相机权限（跳过预请求弹窗，因为已经显示了合并弹窗）
  let cameraResult: PermissionResult;
  if (cameraStatus === PermissionStatus.AUTHORIZED) {
    cameraResult = { granted: true, status: PermissionStatus.AUTHORIZED };
  } else {
    cameraResult = await requestPermissionWithoutPreRequest(
      PermissionType.CAMERA,
      notify,
      autoNavigateToSetting
    );
  }

  // 4. 请求相册权限（跳过预请求弹窗）
  let albumResult: PermissionResult;
  if (albumStatus === PermissionStatus.AUTHORIZED) {
    albumResult = { granted: true, status: PermissionStatus.AUTHORIZED };
  } else {
    // 相册权限不自动跳转设置，因为是可选功能
    albumResult = await requestPermissionWithoutPreRequest(PermissionType.ALBUM, notify, false);
  }

  return { camera: cameraResult, album: albumResult };
}

/**
 * 内部方法：请求权限但跳过预请求弹窗
 * 用于合并权限请求场景
 */
async function requestPermissionWithoutPreRequest(
  type: PermissionType,
  notify?: NotifyFunctions,
  autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
  const config = PERMISSION_CONFIG[type];
  console.log(`[权限请求] 尝试请求${config.title}（跳过预请求弹窗）`);

  // 检查权限状态
  const status = await checkPermissionStatus(type);
  console.log(`[权限请求] ${config.title}状态: ${status}`);

  // 已授权直接返回
  if (status === PermissionStatus.AUTHORIZED) {
    return { granted: true, status: PermissionStatus.AUTHORIZED };
  }

  // iOS 已拒绝需引导用户去设置
  if (AppInfo.isIOSApp() && status === PermissionStatus.DENIED && AppInfo.isApp()) {
    if (autoNavigateToSetting) {
      setTimeout(() => openPermissionSetting(), 1500);
    }
    return {
      granted: false,
      status: PermissionStatus.DENIED,
      message: $t('permission.denied_setting')
    };
  }

  // 显示请求说明
  if (notify) {
    notify.show(generateNotifyMessage(type, NotifyMessageType.REQUESTING));
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  // 请求权限
  const REQUEST_TIMEOUT = 60000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<number>((resolve) => {
    timeoutId = setTimeout(() => resolve(0), REQUEST_TIMEOUT);
  });

  const clearTimeoutIfNeeded = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  try {
    if (AppInfo.isAndroidApp()) {
      const permissions = getAndroidPermissionsForType(type);
      const result = await Promise.race([
        requestAndroidPermission(permissions, type),
        timeoutPromise
      ]);
      clearTimeoutIfNeeded();

      if (result === 1) {
        if (notify) notify.close();
        return { granted: true, status: PermissionStatus.AUTHORIZED };
      } else if (result === -1) {
        if (notify) notify.close();
        if (autoNavigateToSetting) {
          setTimeout(() => openPermissionSetting(), 1500);
        }
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.denied_setting')
        };
      } else {
        if (notify) notify.close();
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.denied')
        };
      }
    } else if (AppInfo.isIOSApp()) {
      const result = await Promise.race([requestIOSPermission(type), timeoutPromise]);
      clearTimeoutIfNeeded();

      if (result === 1) {
        if (notify) notify.close();
        return { granted: true, status: PermissionStatus.AUTHORIZED };
      } else {
        if (notify) notify.close();
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.denied')
        };
      }
    } else if (AppInfo.isHarmonyApp()) {
      const result = await Promise.race([requestHarmonyPermission(type), timeoutPromise]);
      clearTimeoutIfNeeded();

      console.log(`[权限请求] 鸿蒙 ${config.title}（无预请求）请求结果:`, result);

      if (result === 1) {
        if (notify) notify.close();
        return { granted: true, status: PermissionStatus.AUTHORIZED };
      } else if (result === 2) {
        if (notify) notify.close();
        return {
          granted: false,
          status: PermissionStatus.NOT_DETERMINED,
          message: '用户取消'
        };
      } else {
        if (notify) notify.close();
        if (autoNavigateToSetting) {
          setTimeout(() => openPermissionSetting(), 1500);
        }
        return {
          granted: false,
          status: PermissionStatus.DENIED,
          message: $t('permission.denied')
        };
      }
    }
  } catch (error) {
    clearTimeoutIfNeeded();
    console.error(`[权限请求] ${config.title}请求异常:`, error);
    if (notify) notify.close();
  }

  return {
    granted: false,
    status: PermissionStatus.DENIED,
    message: $t('permission.request_failed')
  };
}
