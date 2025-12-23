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

import type { NotifyProps } from '@/uni_modules/wot-design-uni/components/wd-notify/types'
import { AppConfig } from '@/configs'
import i18n from '@/locale';

const $t = i18n.global.t;

export const REQUEST_TIMEOUT = 20000;

/**
 * Notify 函数接口，包含 show 和 close 方法
 */
export interface NotifyFunctions {
    show: (option: NotifyProps | string) => void
    close: () => void
}

/**
 * Notify 消息类型
 */
enum NotifyMessageType {
    REQUESTING = 'requesting',      // 请求权限时
    SUCCESS = 'success',             // 授权成功
    DENIED = 'denied',               // 被拒绝（不跳转设置）
    DENIED_NAVIGATE = 'denied_nav'   // 被拒绝（会跳转设置）
}

/**
 * 权限类型枚举
 */
export enum PermissionType {
    CAMERA = 'camera', // 相机权限
    ALBUM = 'album', // 相册权限
    LOCATION = 'location', // 位置权限
    RECORD = 'record', // 录音权限
    BLUETOOTH = 'bluetooth', // 蓝牙权限
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
 * 权限请求结果
 */
export interface PermissionResult {
    granted: boolean // 是否已授权
    status: PermissionStatus // 权限状态
    message?: string // 错误信息
}

/**
 * 权限配置
 */
interface PermissionConfig {
    type: PermissionType
    scope?: string // uni.authorize 的 scope（小程序平台）
    title: string // 权限名称
    description: string // 权限用途说明
}

/**
 * 权限配置映射
 */
const PERMISSION_CONFIG: Record<PermissionType, PermissionConfig> = {
    [PermissionType.CAMERA]: {
        type: PermissionType.CAMERA,
        scope: 'scope.camera',
        // 允许获得您的{title}权限，以便{description}
        title: '相机权限',
        description: '扫描二维码，绑定设备'
    },
    [PermissionType.ALBUM]: {
        type: PermissionType.ALBUM,
        scope: 'scope.album',
        title: '相册权限',
        description: '扫描二维码，绑定设备'
    },
    [PermissionType.LOCATION]: {
        type: PermissionType.LOCATION,
        scope: 'scope.userLocation',
        title: '位置权限',
        description: '优化设备联网信号推荐'
    },
    [PermissionType.RECORD]: {
        type: PermissionType.RECORD,
        scope: 'scope.record',
        title: '麦克风权限',
        description: '录制音频，上传声纹信息'
    },
    [PermissionType.BLUETOOTH]: {
        type: PermissionType.BLUETOOTH,
        title: '蓝牙权限',
        description: '搜索附近的蓝牙设备进行配网'
    },

}

/**
 * 获取权限类型的 i18n 键
 * @param type 权限类型
 * @returns i18n 键前缀（如 "permission.camera"）
 */
function getPermissionI18nKey(type: PermissionType): string {
    return `permission.${type}_title`
}

/**
 * 获取权限描述的 i18n 键
 * @param type 权限类型
 * @returns i18n 键（如 "permission.camera_description"）
 */
function getPermissionDescriptionI18nKey(type: PermissionType): string {
    return `permission.${type}_description`
}

/**
 * 替换模板字符串中的占位符
 * @param template 模板字符串，包含 ${variableName} 格式的占位符
 * @param replacements 替换映射对象，键为变量名（不含 ${}），值为替换值
 * @returns 替换后的字符串
 */
function replaceTemplate(template: string, replacements: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(replacements)) {
        // 使用正则表达式替换 ${key} 格式的占位符
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
        result = result.replace(regex, value)
    }
    return result
}

/**
 * 生成权限相关的 notify 消息配置
 * @param type 权限类型
 * @param messageType 消息类型
 * @returns NotifyProps 配置对象
 */
function generateNotifyMessage(
    type: PermissionType,
    messageType: NotifyMessageType
): NotifyProps {
    const titleKey = getPermissionI18nKey(type)
    const descriptionKey = getPermissionDescriptionI18nKey(type)
    const title = $t(titleKey)
    const description = $t(descriptionKey)

    // 准备替换映射
    const replacements: Record<string, string> = {
        title,
        description
    }

    switch (messageType) {
        case NotifyMessageType.REQUESTING:
            // 请求时："允许获得您的相机权限，以便扫描二维码，绑定设备"
            return {
                type: 'primary',
                message: replaceTemplate($t('permission.requesting_template'), replacements),
                duration: 0  // 不自动关闭
            }

        case NotifyMessageType.SUCCESS:
            // 成功："相机权限授权成功"
            return {
                type: 'success',
                message: replaceTemplate($t('permission.success_template'), replacements),
                duration: 2000
            }

        case NotifyMessageType.DENIED:
            // 拒绝且不跳转："已拒绝相机权限，若要使用二维码配网服务请进入系统应用设置，允许对应权限"
            return {
                type: 'warning',
                message: replaceTemplate($t('permission.denied_template'), replacements),
                duration: 3000
            }

        case NotifyMessageType.DENIED_NAVIGATE:
            // 拒绝且自动跳转："已拒绝相机权限，即将跳转到设置页面"
            return {
                type: 'warning',
                message: replaceTemplate($t('permission.denied_navigate_template'), replacements),
                duration: 3000
            }

        default:
            return {
                type: 'primary',
                message: '',
                duration: 2000
            }
    }
}

/**
 * 检查是否为 App 平台 (Android + iOS + 鸿蒙)
 */
function isAppPlatform(): boolean {
    return AppConfig.platform === 'app'
}

/**
 * 检查是否为 Android 平台
 */
function isAndroid(): boolean {
    return AppConfig.os === 'android'
}

/**
 * 检查是否为 iOS 平台
 */
function isIOS(): boolean {
    return AppConfig.os === 'ios'
}

/**
 * 检查是否为鸿蒙平台
 */
function isHarmonyOS(): boolean {
    return AppConfig.os === 'harmony'
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
}

/**
 * 获取 Android 蓝牙权限列表（处理 Android 12+ 版本差异）
 * 注意：Android 12+ 必须请求 BLUETOOTH_SCAN 和 BLUETOOTH_CONNECT
 */
function getAndroidBluetoothPermissions(): string[] {
    // 直接使用 uni.getSystemInfoSync 获取系统信息（更可靠）
    let osVersion = 0
    let apiLevel = 0

    try {
        const systemInfo = uni.getSystemInfoSync() as any
        osVersion = parseFloat(systemInfo.osVersion || '0')
        apiLevel = systemInfo.osAndroidAPILevel || 0
        console.log('[蓝牙权限] 系统信息 - osVersion:', systemInfo.osVersion, 'apiLevel:', apiLevel)
    } catch (e) {
        console.warn('[蓝牙权限] 获取系统信息失败:', e)
    }

    // 兜底：使用 AppConfig
    if (osVersion === 0 && AppConfig.osVersion) {
        osVersion = parseFloat(AppConfig.osVersion)
    }
    if (apiLevel === 0 && AppConfig.androidApiLevel) {
        apiLevel = AppConfig.androidApiLevel
    }

    console.log('[蓝牙权限] 最终版本 - osVersion:', osVersion, 'apiLevel:', apiLevel)

    // Android 12+ (API Level 31+) 需要新蓝牙权限
    // 判断条件：API Level >= 31 或 osVersion >= 12
    const needNewPermissions = apiLevel >= 31 || osVersion >= 12

    console.log('[蓝牙权限] 需要新权限:', needNewPermissions)

    if (needNewPermissions) {
        // Android 12+ 使用新权限（不再需要旧权限）
        return [
            'android.permission.BLUETOOTH_SCAN',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
        ]
    } else {
        // Android 11 及以下使用旧权限
        return [
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_ADMIN',
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
        ]
    }
}

/**
 * 获取 Android 相册权限列表（处理 Android 13+ 版本差异）
 * Android 13+ 使用 READ_MEDIA_IMAGES
 * Android 12及以下使用 READ_EXTERNAL_STORAGE（maxSdkVersion=32）
 */
function getAndroidAlbumPermissions(): string[] {
    // Android 13+ (API Level 33+) 使用新的媒体权限
    let useNewPermission = false

    // 优先使用 API Level（更准确）
    if (AppConfig.androidApiLevel !== undefined) {
        // Android 13 = API Level 33
        useNewPermission = AppConfig.androidApiLevel >= 33
    } else {
        // 兜底：解析版本号字符串（如 "12"、"13"）
        const versionStr = AppConfig.osVersion
        if (versionStr) {
            const parsed = parseFloat(versionStr)
            if (!isNaN(parsed)) {
                // 版本号判断：Android 13+
                useNewPermission = parsed >= 13
            }
        }
    }

    if (useNewPermission) {
        // Android 13+ 使用新的媒体权限
        return ['android.permission.READ_MEDIA_IMAGES']
    } else {
        // Android 12及以下使用存储权限
        return ['android.permission.READ_EXTERNAL_STORAGE']
    }
}

/**
 * 检查权限状态
 */
export async function checkPermissionStatus(
    type: PermissionType
): Promise<PermissionStatus> {
    const config = PERMISSION_CONFIG[type]
    console.log(`[权限检查] 开始检查${config.title}状态`)
    console.log(`[权限检查] 当前平台信息: os=${AppConfig.os}, isAppPlatform=${isAppPlatform()}, isAndroid=${isAndroid()}, isIOS=${isIOS()}, isHarmonyOS=${isHarmonyOS()}`)

    try {
        // 蓝牙权限特殊处理
        if (type === PermissionType.BLUETOOTH) {
            const status = await checkBluetoothPermissionStatus()
            console.log(`[权限检查] ${config.title}状态: ${status}`)
            return status
        }

        // App 平台使用 getAppAuthorizeSetting
        if (isAppPlatform()) {
            const authSetting = uni.getAppAuthorizeSetting()

            // 录音权限使用 microphoneAuthorized，其他权限使用 {type}Authorized
            let key: string
            if (type === PermissionType.RECORD) {
                key = 'microphoneAuthorized'
            } else {
                key = `${type}Authorized`
            }

            // 使用类型断言访问动态属性
            const authStatus = (authSetting as any)[key]
            console.log(`[权限检查] App平台 ${config.title}授权状态: ${authStatus} (key: ${key})`)

            // 如果权限状态为 undefined，输出完整的 authSetting 对象以便调试
            if (authStatus === undefined) {
                console.log(`[权限检查] ${config.title}权限状态为 undefined，完整 authSetting:`, JSON.stringify(authSetting))
            }

            if (authStatus === 'authorized') {
                console.log(`[权限检查] ${config.title}已授权`)
                return PermissionStatus.AUTHORIZED
            } else if (authStatus === 'denied') {
                console.log(`[权限检查] ${config.title}已拒绝`)
                return PermissionStatus.DENIED
            } else {
                console.log(`[权限检查] ${config.title}未确定`)
                return PermissionStatus.NOT_DETERMINED
            }
        }

        // 小程序平台使用 getSetting
        if (!config.scope) {
            console.log(`[权限检查] ${config.title}无scope配置`)
            return PermissionStatus.NOT_DETERMINED
        }

        return new Promise((resolve) => {
            uni.getSetting({
                success: (res) => {
                    const authSetting = res.authSetting
                    const scopeKey = config.scope as string

                    // 使用类型断言访问动态属性
                    const scopeStatus = (authSetting as any)[scopeKey]
                    console.log(`[权限检查] 小程序 ${config.title}授权状态: ${scopeStatus}`)

                    if (scopeStatus === true) {
                        console.log(`[权限检查] ${config.title}已授权`)
                        resolve(PermissionStatus.AUTHORIZED)
                    } else if (scopeStatus === false) {
                        console.log(`[权限检查] ${config.title}已拒绝`)
                        resolve(PermissionStatus.DENIED)
                    } else {
                        console.log(`[权限检查] ${config.title}未确定`)
                        resolve(PermissionStatus.NOT_DETERMINED)
                    }
                },
                fail: (err) => {
                    console.error(`[权限检查] ${config.title}检查失败:`, err)
                    resolve(PermissionStatus.NOT_DETERMINED)
                }
            })
        })
    } catch (error) {
        console.error(`[权限检查] ${config.title}检查异常:`, error)
        return PermissionStatus.NOT_DETERMINED
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
        if (isIOS()) {
            if (isAppPlatform()) {
                const authSetting = uni.getAppAuthorizeSetting()
                console.log('[权限检查] iOS蓝牙授权状态:', authSetting.bluetoothAuthorized)
                if (authSetting.bluetoothAuthorized === 'authorized') {
                    return PermissionStatus.AUTHORIZED
                } else if (authSetting.bluetoothAuthorized === 'denied') {
                    return PermissionStatus.DENIED
                } else {
                    // 未确定状态，需要请求权限
                    return PermissionStatus.NOT_DETERMINED
                }
            }
            return PermissionStatus.NOT_DETERMINED
        }

        // Android 12+ 特殊处理：跳过 uni.getSystemSetting() 调用
        // 因为 DCloud SDK 内部会检查旧的 BLUETOOTH 权限，在 Android 12+ 上会失败
        if (isAndroid()) {
            const systemInfo = uni.getSystemInfoSync() as any
            const osVersion = parseFloat(systemInfo.osVersion || '0')
            const apiLevel = systemInfo.osAndroidAPILevel || 0

            if (apiLevel >= 31 || osVersion >= 12) {
                console.log('[权限检查] Android 12+，跳过 getSystemSetting，直接返回 NOT_DETERMINED')
                // 直接返回 NOT_DETERMINED，让后续流程去请求权限
                // 权限请求成功后再检查蓝牙状态
                return PermissionStatus.NOT_DETERMINED
            }
        }

        // Android 11 及以下：可以安全调用 uni.getSystemSetting()
        const systemSetting = uni.getSystemSetting()

        // Android 平台：先检查蓝牙是否开启
        if (!systemSetting.bluetoothEnabled) {
            return PermissionStatus.UNAVAILABLE
        }

        // 2. 检查蓝牙权限
        if (isAppPlatform()) {
            const authSetting = uni.getAppAuthorizeSetting()
            if (authSetting.bluetoothAuthorized === 'authorized') {
                return PermissionStatus.AUTHORIZED
            } else if (authSetting.bluetoothAuthorized === 'denied') {
                return PermissionStatus.DENIED
            } else {
                return PermissionStatus.NOT_DETERMINED
            }
        }

        // 小程序平台：尝试调用蓝牙 API 来判断
        return PermissionStatus.NOT_DETERMINED
    } catch (error) {
        console.error('检查蓝牙权限状态失败:', error)
        return PermissionStatus.NOT_DETERMINED
    }
}

/**
 * 请求 Android 权限
 * @param permissions Android 权限数组
 * @param permissionType 权限类型（用于再次检查权限状态）
 * @returns 1: 授权成功, 0: 临时拒绝（可再次请求）, -1: 永久拒绝（需去设置）
 */
async function requestAndroidPermission(permissions: string[], permissionType?: PermissionType): Promise<number> {
    console.log('[权限请求] 开始请求Android权限:', permissions)

    return new Promise((resolve) => {
        if (isAndroid()) {
            // 检查 plus.android.requestPermissions 是否可用
            if (!plus || !plus.android || typeof plus.android.requestPermissions !== 'function') {
                console.error('[权限请求] plus.android.requestPermissions 不可用')
                resolve(0)
                return
            }

            console.log('[权限请求] 调用 plus.android.requestPermissions')
            plus.android.requestPermissions(
                permissions,
                async function (resultObj) {
                    console.log('[权限请求] Android权限请求回调结果:', resultObj)

                    // 检查是否有授权的权限
                    if (resultObj.granted && resultObj.granted.length > 0) {
                        console.log('[权限请求] 已获取的权限：', resultObj.granted)
                        resolve(1) // 授权成功
                        return
                    }
                    // 检查是否有永久拒绝的权限
                    else if (resultObj.deniedAlways && resultObj.deniedAlways.length > 0) {
                        console.log('[权限请求] 系统返回永久拒绝的权限：', resultObj.deniedAlways)

                        // 当用户点击弹窗之外（没有明确同意或拒绝）时，系统可能返回 deniedAlways
                        // 但实际权限状态可能仍然是 NOT_DETERMINED，需要再次检查确认
                        if (permissionType) {
                            console.log('[权限请求] 再次检查权限状态以确认是否真的被永久拒绝')
                            const actualStatus = await checkPermissionStatus(permissionType)
                            console.log('[权限请求] 权限实际状态:', actualStatus)

                            if (actualStatus === PermissionStatus.NOT_DETERMINED) {
                                // 权限状态仍然是未确定，说明用户只是关闭了弹窗，不是真正的永久拒绝
                                console.log('[权限请求] 权限状态仍为未确定，视为临时拒绝（用户关闭了弹窗）')
                                resolve(0) // 临时拒绝（可再次请求）
                                return
                            } else if (actualStatus === PermissionStatus.DENIED) {
                                // 权限状态确实是已拒绝，确认为永久拒绝
                                console.log('[权限请求] 权限状态确认为已拒绝，确认为永久拒绝')
                                resolve(-1) // 永久拒绝
                                return
                            }
                        }

                        // 如果没有权限类型信息或检查失败，默认视为永久拒绝
                        console.log('[权限请求] 确认为永久拒绝（用户勾选了"不再询问"）')
                        resolve(-1) // 永久拒绝（用户勾选了"不再询问"）
                        return
                    }
                    // 检查是否有本次拒绝的权限
                    else if (resultObj.deniedPresent && resultObj.deniedPresent.length > 0) {
                        console.log('[权限请求] 本次拒绝的权限：', resultObj.deniedPresent)
                        resolve(0) // 临时拒绝（可再次请求）
                        return
                    }
                    else {
                        // 其他情况视为拒绝
                        console.log('[权限请求] 其他情况，视为拒绝')
                        resolve(0)
                        return
                    }
                },
                function (error) {
                    console.error('[权限请求] Android权限请求错误：', error.code, error.message)
                    resolve(0) // 出错时返回拒绝
                }
            )
        }
        else {
            console.log('[权限请求] 非Android平台')
            resolve(0)
        }
    })
}

/**
 * iOS 权限请求回退方案
 * 当 Native.js 调用失败时（如真机调试环境），使用 uni-app API 触发系统权限请求
 * @param type 权限类型
 * @returns 1: 授权成功, 0: 拒绝
 */
async function requestIOSPermissionFallback(type: PermissionType): Promise<number> {
    console.log(`[权限请求] iOS使用回退方案请求${PERMISSION_CONFIG[type].title}`)

    return new Promise((resolve) => {
        switch (type) {
            case PermissionType.CAMERA:
                // 使用 uni.chooseImage 配合 camera 源触发相机权限请求
                // 这比 uni.scanCode 更可靠，因为它直接请求相机权限
                console.log('[权限请求] iOS相机权限回退方案：使用 chooseImage(camera) 触发权限请求')
                uni.chooseImage({
                    count: 1,
                    sourceType: ['camera'],
                    success: () => {
                        console.log('[权限请求] iOS相机权限回退方案：拍照成功，权限已授予')
                        resolve(1)
                    },
                    fail: (err: any) => {
                        console.log('[权限请求] iOS相机权限回退方案：拍照失败', err)
                        // 用户取消拍照不代表权限被拒绝
                        if (err.errMsg && err.errMsg.includes('cancel')) {
                            // 用户取消后，再次检查权限状态
                            setTimeout(() => {
                                checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                                    console.log('[权限请求] iOS相机权限回退方案：取消后权限状态', status)
                                    resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0)
                                })
                            }, 500)
                        } else if (err.errMsg && (err.errMsg.includes('auth') || err.errMsg.includes('permission') || err.errMsg.includes('deny'))) {
                            console.log('[权限请求] iOS相机权限回退方案：权限被拒绝')
                            resolve(0)
                        } else {
                            // 其他错误，检查实际权限状态
                            checkPermissionStatus(PermissionType.CAMERA).then((status) => {
                                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0)
                            })
                        }
                    }
                })
                break

            case PermissionType.LOCATION:
                // 使用 uni.getLocation 触发位置权限请求
                uni.getLocation({
                    type: 'wgs84',
                    success: () => {
                        console.log('[权限请求] iOS位置权限回退方案：获取位置成功，权限已授予')
                        resolve(1)
                    },
                    fail: (err: any) => {
                        console.log('[权限请求] iOS位置权限回退方案：获取位置失败', err)
                        resolve(0)
                    }
                })
                break

            case PermissionType.RECORD:
                // 使用录音管理器触发麦克风权限请求
                const recorderManager = uni.getRecorderManager() as any
                let resolved = false

                // 清理监听器的辅助函数
                const cleanupListeners = () => {
                    try {
                        // 尝试移除监听器（如果 API 支持）
                        if (typeof recorderManager.offStart === 'function') {
                            recorderManager.offStart(onRecordStart)
                        }
                        if (typeof recorderManager.offError === 'function') {
                            recorderManager.offError(onRecordError)
                        }
                    } catch (e) {
                        // 忽略清理错误
                    }
                }

                const onRecordStart = () => {
                    if (!resolved) {
                        resolved = true
                        console.log('[权限请求] iOS录音权限回退方案：录音开始，权限已授予')
                        recorderManager.stop()
                        cleanupListeners()
                        resolve(1)
                    }
                }

                const onRecordError = (err: any) => {
                    if (!resolved) {
                        resolved = true
                        console.log('[权限请求] iOS录音权限回退方案：录音失败', err)
                        cleanupListeners()
                        resolve(0)
                    }
                }

                recorderManager.onStart(onRecordStart)
                recorderManager.onError(onRecordError)

                // 开始录音以触发权限请求
                recorderManager.start({
                    duration: 1000,
                    format: 'mp3'
                })

                // 超时处理
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true
                        recorderManager.stop()
                        cleanupListeners()
                        console.log('[权限请求] iOS录音权限回退方案：超时')
                        resolve(0)
                    }
                }, 3000)
                break

            case PermissionType.ALBUM:
                // 使用 uni.chooseImage 触发相册权限请求
                uni.chooseImage({
                    count: 1,
                    sourceType: ['album'],
                    success: () => {
                        console.log('[权限请求] iOS相册权限回退方案：选择图片成功，权限已授予')
                        resolve(1)
                    },
                    fail: (err: any) => {
                        console.log('[权限请求] iOS相册权限回退方案：选择图片失败', err)
                        // 用户取消选择不代表权限被拒绝，需要检查实际状态
                        if (err.errMsg && err.errMsg.includes('cancel')) {
                            checkPermissionStatus(PermissionType.ALBUM).then((status) => {
                                resolve(status === PermissionStatus.AUTHORIZED ? 1 : 0)
                            })
                        } else {
                            resolve(0)
                        }
                    }
                })
                break

            case PermissionType.BLUETOOTH:
                // 蓝牙权限通过初始化蓝牙适配器触发
                uni.openBluetoothAdapter({
                    success: () => {
                        console.log('[权限请求] iOS蓝牙权限回退方案：蓝牙适配器打开成功，权限已授予')
                        resolve(1)
                    },
                    fail: (err: any) => {
                        console.log('[权限请求] iOS蓝牙权限回退方案：蓝牙适配器打开失败', err)
                        resolve(0)
                    }
                })
                break

            default:
                console.log('[权限请求] iOS回退方案：不支持的权限类型', type)
                resolve(0)
        }
    })
}

/**
 * 请求 iOS 权限
 * @param type 权限类型
 * @returns 1: 授权成功, 0: 拒绝
 */
async function requestIOSPermission(type: PermissionType): Promise<number> {
    return new Promise((resolve) => {
        if (isIOS()) {
            console.log('[权限请求] iOS开始请求权限，类型:', type)

            // 检查 plus.ios 是否可用
            if (typeof plus === 'undefined' || !plus.ios) {
                console.error('[权限请求] plus.ios 不可用，使用回退方案')
                requestIOSPermissionFallback(type).then(resolve)
                return
            }

            try {
                switch (type) {
                    case PermissionType.CAMERA:
                        // 请求相机权限 - 直接使用回退方案更可靠
                        console.log('[权限请求] iOS请求相机权限')
                        // Native.js 调用 block 回调在真机调试时不稳定，直接使用 uni-app API
                        requestIOSPermissionFallback(PermissionType.CAMERA).then(resolve)
                        break

                    case PermissionType.LOCATION:
                        // 请求位置权限 - 直接使用回退方案更可靠
                        console.log('[权限请求] iOS请求位置权限')
                        requestIOSPermissionFallback(PermissionType.LOCATION).then(resolve)
                        break

                    case PermissionType.RECORD:
                        // 请求录音权限 - 直接使用回退方案更可靠
                        console.log('[权限请求] iOS请求录音权限')
                        requestIOSPermissionFallback(PermissionType.RECORD).then(resolve)
                        break

                    case PermissionType.BLUETOOTH:
                        // iOS 蓝牙权限通过初始化蓝牙适配器触发系统权限弹窗
                        console.log('[权限请求] iOS请求蓝牙权限')
                        const authSetting = uni.getAppAuthorizeSetting()
                        if (authSetting.bluetoothAuthorized === 'authorized') {
                            console.log('[权限请求] iOS蓝牙权限已授权')
                            resolve(1)
                        } else if (authSetting.bluetoothAuthorized === 'denied') {
                            console.log('[权限请求] iOS蓝牙权限已被拒绝')
                            resolve(0)
                        } else {
                            // 未确定状态，通过初始化蓝牙适配器触发权限请求
                            console.log('[权限请求] iOS蓝牙权限未确定，尝试初始化蓝牙适配器触发权限请求')
                            uni.openBluetoothAdapter({
                                success: () => {
                                    console.log('[权限请求] iOS蓝牙适配器初始化成功，权限已授权')
                                    resolve(1)
                                },
                                fail: (err: any) => {
                                    console.log('[权限请求] iOS蓝牙适配器初始化失败:', err)
                                    // 检查是否是权限问题
                                    if (err.errCode === 10001) {
                                        // 蓝牙未开启
                                        console.log('[权限请求] iOS蓝牙未开启')
                                        resolve(0)
                                    } else {
                                        // 其他错误，可能是权限被拒绝
                                        // 再次检查权限状态
                                        const newAuthSetting = uni.getAppAuthorizeSetting()
                                        if (newAuthSetting.bluetoothAuthorized === 'authorized') {
                                            resolve(1)
                                        } else {
                                            resolve(0)
                                        }
                                    }
                                }
                            })
                        }
                        break

                    case PermissionType.ALBUM:
                        // 请求相册权限
                        console.log('[权限请求] iOS请求相册权限')
                        try {
                            const PHPhotoLibrary = (plus.ios as any).import('PHPhotoLibrary')
                                ; (plus.ios as any).invoke(
                                    PHPhotoLibrary,
                                    'requestAuthorization:',
                                    (status: number) => {
                                        // status: 0=未确定, 1=受限, 2=拒绝, 3=授权
                                        console.log('[权限请求] iOS相册权限请求结果：', status)
                                            ; (plus.ios as any).deleteObject(PHPhotoLibrary)
                                        const granted = status === 3
                                        resolve(granted ? 1 : 0)
                                    }
                                )
                        } catch (albumError) {
                            console.error('[权限请求] iOS相册权限Native.js调用失败，尝试回退方案：', albumError)
                            // 回退方案：使用 uni.chooseImage 触发系统权限请求
                            requestIOSPermissionFallback(PermissionType.ALBUM).then(resolve)
                        }
                        break

                    default:
                        console.log('[权限请求] iOS不支持的权限类型:', type)
                        resolve(0)
                }
            } catch (error) {
                console.error('[权限请求] iOS权限请求错误：', error)
                resolve(0)
            }
        }
        else {
            console.log('[权限请求] 非iOS平台')
            resolve(0)
        }
    })
}

/**
 * 请求权限
 */
export async function requestPermission(
    type: PermissionType,
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    const config = PERMISSION_CONFIG[type]
    console.log(`[权限请求] 尝试请求${config.title}`)
    console.log(`[权限请求] 当前平台信息: os=${AppConfig.os}, isAppPlatform=${isAppPlatform()}, isAndroid=${isAndroid()}, isIOS=${isIOS()}, isHarmonyOS=${isHarmonyOS()}`)

    try {
        // 1. 检查当前权限状态
        const status = await checkPermissionStatus(type)

        // 如果已授权，直接返回成功，不显示 notify
        if (status === PermissionStatus.AUTHORIZED) {
            console.log(`[权限请求] ${config.title}已授权，直接返回`)
            return {
                granted: true,
                status: PermissionStatus.AUTHORIZED
            }
        }

        // 蓝牙权限特殊处理
        if (type === PermissionType.BLUETOOTH) {
            console.log(`[权限请求] ${config.title}使用特殊处理流程`)
            return await requestBluetoothPermission(notify, autoNavigateToSetting)
        }

        // 特殊处理：iOS App 平台下，如果已经拒绝，系统不会再次弹出权限确认框
        // 必须引导用户去系统设置页面手动开启
        if (isIOS() && status === PermissionStatus.DENIED && isAppPlatform()) {
            console.log(`[权限请求] iOS ${config.title}已处于拒绝状态，提示跳转设置`)
            if (notify) {
                notify.close()
                const messageType = autoNavigateToSetting
                    ? NotifyMessageType.DENIED_NAVIGATE
                    : NotifyMessageType.DENIED
                notify.show(generateNotifyMessage(type, messageType))
            }
            if (autoNavigateToSetting) {
                setTimeout(() => {
                    openPermissionSetting()
                }, 1500)
            }
            return {
                granted: false,
                status: PermissionStatus.DENIED,
                message: $t('permission.denied_setting')
            }
        }

        // 2. 显示权限说明（notify）
        if (notify) {
            console.log(`[权限请求] 显示${config.title}请求说明`)
            notify.show(generateNotifyMessage(type, NotifyMessageType.REQUESTING))
        }

        // 等待 notify 显示
        await new Promise((resolve) => setTimeout(resolve, 800))
        console.log(`[权限请求] 开始请求${config.title}`)

        // 3. 请求权限（添加超时保护）
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        const timeoutPromise = new Promise<number>((resolve) => {
            timeoutId = setTimeout(() => {
                console.error(`[权限请求] ${config.title}请求超时（${REQUEST_TIMEOUT / 1000}秒）`)
                resolve(0) // 超时返回拒绝
            }, REQUEST_TIMEOUT)
            console.log(`[权限请求] 创建超时定时器，ID: ${timeoutId}`)
        })

        // 清理超时定时器的辅助函数
        const clearTimeoutIfNeeded = () => {
            if (timeoutId !== null) {
                console.log(`[权限请求] 清理超时定时器，ID: ${timeoutId}`)
                clearTimeout(timeoutId)
                timeoutId = null
            }
        }

        try {
            if (isAppPlatform()) {
                // App 平台：根据平台调用相应的权限请求函数
                if (isAndroid()) {
                    // Android 平台：主动请求权限
                    // 注意：蓝牙权限已在前面特殊处理，这里不会是蓝牙权限
                    // 相册权限需要根据 Android 版本选择不同的权限
                    let permissions: string[]
                    if (type === PermissionType.ALBUM) {
                        permissions = getAndroidAlbumPermissions()
                    } else {
                        permissions = ANDROID_PERMISSIONS[type]
                    }

                    const result = await Promise.race([
                        requestAndroidPermission(permissions, type),
                        timeoutPromise
                    ])

                    // 权限请求完成，清理超时定时器
                    clearTimeoutIfNeeded()

                    console.log(`[权限请求] Android ${config.title}请求结果:`, result)

                    if (result === 1) {
                        // 用户授权成功
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS))
                        }
                        return {
                            granted: true,
                            status: PermissionStatus.AUTHORIZED
                        }
                    } else if (result === 0) {
                        // 用户临时拒绝或超时
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(type, NotifyMessageType.DENIED))
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.user_denied')
                        }
                    } else {
                        // result === -1, 用户永久拒绝
                        if (notify) {
                            notify.close()
                            const messageType = autoNavigateToSetting
                                ? NotifyMessageType.DENIED_NAVIGATE
                                : NotifyMessageType.DENIED
                            notify.show(generateNotifyMessage(type, messageType))
                        }
                        if (autoNavigateToSetting) {
                            setTimeout(() => {
                                openPermissionSetting()
                            }, 1500)
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.permanently_denied')
                        }
                    }
                } else if (isIOS()) {
                    // iOS 平台：主动请求权限（满足应用商店审核要求）
                    const result = await Promise.race([
                        requestIOSPermission(type),
                        timeoutPromise
                    ])

                    // 权限请求完成，清理超时定时器
                    clearTimeoutIfNeeded()

                    console.log(`[权限请求] iOS ${config.title}请求结果:`, result)

                    if (result === 1) {
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS))
                        }
                        return {
                            granted: true,
                            status: PermissionStatus.AUTHORIZED
                        }
                    } else {
                        // 拒绝或超时 → 根据参数决定是否跳转设置
                        if (notify) {
                            notify.close()
                            const messageType = autoNavigateToSetting
                                ? NotifyMessageType.DENIED_NAVIGATE
                                : NotifyMessageType.DENIED
                            notify.show(generateNotifyMessage(type, messageType))
                        }
                        if (autoNavigateToSetting) {
                            setTimeout(() => {
                                openPermissionSetting()
                            }, 1500)
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.denied_setting')
                        }
                    }
                } else if (isHarmonyOS()) {
                    // TODO: 鸿蒙平台权限请求适配（当前无鸿蒙用户，优先级低）
                    // 参考: https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/
                    // 鸿蒙 App 需要使用 UTSHarmony.requestSystemPermission()
                    console.warn(`[权限请求] 鸿蒙平台${config.title}请求暂未实现`)
                    clearTimeoutIfNeeded()
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: false,
                        status: PermissionStatus.NOT_DETERMINED,
                        message: 'TODO: 鸿蒙平台权限请求待适配'
                    }
                } else {
                    // 其他 App 平台
                    console.error(`[权限请求] 不支持的App平台`)
                    clearTimeoutIfNeeded()
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: false,
                        status: PermissionStatus.NOT_DETERMINED,
                        message: $t('permission.unsupported_platform')
                    }
                }
            } else {
                // 小程序平台：使用 uni.authorize
                clearTimeoutIfNeeded()
                console.log(`[权限请求] 小程序平台请求${config.title}`)
                return await authorizePermission(type, notify)
            }
        } catch (error: any) {
            // 异常情况下也要清理超时定时器
            clearTimeoutIfNeeded()
            console.error(`[权限请求] 请求${config.title}异常:`, error)
            // 关闭 notify
            if (notify) {
                try {
                    notify.close()
                } catch (closeError) {
                    console.error(`[权限请求] 关闭notify失败:`, closeError)
                }
            }
            return {
                granted: false,
                status: PermissionStatus.NOT_DETERMINED,
                message: error.message || $t('permission.request_failed')
            }
        }
    } catch (error: any) {
        console.error(`[权限请求] 请求${config.title}异常:`, error)
        // 关闭 notify
        if (notify) {
            try {
                notify.close()
            } catch (closeError) {
                console.error(`[权限请求] 关闭notify失败:`, closeError)
            }
        }
        return {
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: error.message || $t('permission.request_failed')
        }
    }
}

/**
 * 使用 uni.authorize 请求权限（小程序平台）
 */
function authorizePermission(
    type: PermissionType,
    notify?: NotifyFunctions
): Promise<PermissionResult> {
    const config = PERMISSION_CONFIG[type]

    if (!config.scope) {
        return Promise.resolve({
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: $t('permission.unsupported_type')
        })
    }

    return new Promise((resolve) => {
        uni.authorize({
            scope: config.scope as string,
            success: () => {
                if (notify) {
                    notify.close()
                    notify.show(generateNotifyMessage(type, NotifyMessageType.SUCCESS))
                }
                resolve({
                    granted: true,
                    status: PermissionStatus.AUTHORIZED
                })
            },
            fail: (err) => {
                console.error('授权失败:', err)

                // 授权失败，引导用户到设置页面
                if (notify) {
                    notify.close()
                    notify.show(generateNotifyMessage(type, NotifyMessageType.DENIED_NAVIGATE))
                }

                setTimeout(() => {
                    openPermissionSetting()
                }, 1500)

                resolve({
                    granted: false,
                    status: PermissionStatus.DENIED,
                    message: '用户拒绝授权'
                })
            }
        })
    })
}

/**
 * 请求蓝牙权限（特殊处理）
 * 注意：Android 12+ 必须先请求权限才能调用蓝牙相关 API
 */
async function requestBluetoothPermission(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    const config = PERMISSION_CONFIG[PermissionType.BLUETOOTH]
    console.log('[权限请求] 尝试请求蓝牙权限')

    try {
        // ===== Android 12+ 特殊处理：必须先请求权限再检查蓝牙状态 =====
        // 因为 Android 12+ 调用 BluetoothAdapter.isEnabled() 需要 BLUETOOTH_CONNECT 权限
        const osVersion = parseFloat(AppConfig.osVersion || '0')
        const isAndroid12Plus = isAndroid() && osVersion >= 12

        if (isAndroid12Plus && isAppPlatform()) {
            console.log('[权限请求] Android 12+，先请求权限再检查蓝牙状态')

            // 显示权限说明
            if (notify) {
                notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.REQUESTING))
            }

            // 先请求权限
            const permissions = getAndroidBluetoothPermissions()
            console.log('[权限请求] Android 12+ 蓝牙权限列表:', permissions)

            const result = await requestAndroidPermission(permissions, PermissionType.BLUETOOTH)
            console.log('[权限请求] Android 12+ 权限请求结果:', result)

            if (result === 1) {
                // 权限授予成功，现在可以安全检查蓝牙状态
                try {
                    const systemSetting = uni.getSystemSetting()
                    if (!systemSetting.bluetoothEnabled) {
                        console.log('[权限请求] 蓝牙未开启')
                        if (notify) {
                            notify.close()
                            notify.show({
                                type: 'warning',
                                message: $t('permission.bluetooth_not_enabled'),
                                duration: 3000
                            })
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.UNAVAILABLE,
                            message: '蓝牙未开启'
                        }
                    }
                } catch (e) {
                    console.warn('[权限请求] 检查蓝牙状态失败，继续执行:', e)
                }

                if (notify) {
                    notify.close()
                    notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS))
                }
                return {
                    granted: true,
                    status: PermissionStatus.AUTHORIZED
                }
            } else if (result === 0) {
                // 用户临时拒绝
                if (notify) {
                    notify.close()
                    notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED))
                }
                return {
                    granted: false,
                    status: PermissionStatus.DENIED,
                    message: $t('permission.bluetooth_user_denied')
                }
            } else {
                // result === -1, 永久拒绝
                if (notify) {
                    notify.close()
                    const messageType = autoNavigateToSetting
                        ? NotifyMessageType.DENIED_NAVIGATE
                        : NotifyMessageType.DENIED
                    notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType))
                }
                if (autoNavigateToSetting) {
                    setTimeout(() => {
                        openPermissionSetting()
                    }, 1500)
                }
                return {
                    granted: false,
                    status: PermissionStatus.DENIED,
                    message: $t('permission.bluetooth_permanently_denied')
                }
            }
        }
        // ===== Android 12+ 特殊处理结束 =====

        // 1. 检查蓝牙是否开启（仅对非 Android 12+ 有效）
        // iOS 平台：bluetoothEnabled 在权限未授权时可能返回 false，需要先请求权限
        if (!isAndroid12Plus) {
            const systemSetting = uni.getSystemSetting()
            if (!isIOS() && !systemSetting.bluetoothEnabled) {
                console.log('[权限请求] 蓝牙未开启')
                if (notify) {
                    notify.show({
                        type: 'warning',
                        message: $t('permission.bluetooth_not_enabled'),
                        duration: 3000
                    })
                }

                return {
                    granted: false,
                    status: PermissionStatus.UNAVAILABLE,
                    message: '蓝牙未开启'
                }
            }
        }

        // 2. 检查是否已授权（避免不必要的请求）- 仅非 Android 12+
        if (isAppPlatform() && !isAndroid12Plus) {
            const authSetting = uni.getAppAuthorizeSetting()
            if (authSetting.bluetoothAuthorized === 'authorized') {
                console.log('[权限请求] 蓝牙权限已授权')
                return {
                    granted: true,
                    status: PermissionStatus.AUTHORIZED
                }
            }
        }

        // 3. 显示权限说明
        if (notify) {
            console.log('[权限请求] 显示蓝牙权限请求说明')
            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.REQUESTING))
        }

        await new Promise((resolve) => setTimeout(resolve, 800))
        console.log('[权限请求] 开始请求蓝牙权限')

        // 4. 请求蓝牙权限（添加超时保护）
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        const timeoutPromise = new Promise<number>((resolve) => {
            timeoutId = setTimeout(() => {
                console.error('[权限请求] 蓝牙权限请求超时（10秒）')
                resolve(0) // 超时返回拒绝
            }, REQUEST_TIMEOUT)
            console.log(`[权限请求] 创建蓝牙权限超时定时器，ID: ${timeoutId}`)
        })

        // 清理超时定时器的辅助函数
        const clearTimeoutIfNeeded = () => {
            if (timeoutId !== null) {
                console.log(`[权限请求] 清理蓝牙权限超时定时器，ID: ${timeoutId}`)
                clearTimeout(timeoutId)
                timeoutId = null
            }
        }

        try {
            if (isAppPlatform()) {
                // 根据平台主动请求权限
                if (isAndroid()) {
                    // Android 平台：主动请求蓝牙权限
                    const permissions = getAndroidBluetoothPermissions()
                    console.log('[权限请求] Android蓝牙权限列表:', permissions)

                    const result = await Promise.race([
                        requestAndroidPermission(permissions, PermissionType.BLUETOOTH),
                        timeoutPromise
                    ])

                    // 权限请求完成，清理超时定时器
                    clearTimeoutIfNeeded()

                    console.log('[权限请求] Android蓝牙权限请求结果:', result)

                    if (result === 1) {
                        // 用户授权成功
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS))
                        }
                        return {
                            granted: true,
                            status: PermissionStatus.AUTHORIZED
                        }
                    } else if (result === 0) {
                        // 用户临时拒绝
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED))
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.bluetooth_user_denied')
                        }
                    } else {
                        // result === -1, 用户永久拒绝
                        if (notify) {
                            notify.close()
                            const messageType = autoNavigateToSetting
                                ? NotifyMessageType.DENIED_NAVIGATE
                                : NotifyMessageType.DENIED
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType))
                        }
                        if (autoNavigateToSetting) {
                            setTimeout(() => {
                                openPermissionSetting()
                            }, 1500)
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.bluetooth_permanently_denied')
                        }
                    }
                } else if (isIOS()) {
                    // iOS 平台：主动请求蓝牙权限
                    const result = await Promise.race([
                        requestIOSPermission(PermissionType.BLUETOOTH),
                        timeoutPromise
                    ])

                    // 权限请求完成，清理超时定时器
                    clearTimeoutIfNeeded()

                    console.log('[权限请求] iOS蓝牙权限请求结果:', result)

                    if (result === 1) {
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.SUCCESS))
                        }
                        return {
                            granted: true,
                            status: PermissionStatus.AUTHORIZED
                        }
                    } else {
                        // 拒绝 → 根据参数决定是否跳转设置
                        if (notify) {
                            notify.close()
                            const messageType = autoNavigateToSetting
                                ? NotifyMessageType.DENIED_NAVIGATE
                                : NotifyMessageType.DENIED
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, messageType))
                        }
                        if (autoNavigateToSetting) {
                            setTimeout(() => {
                                openPermissionSetting()
                            }, 1500)
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: $t('permission.bluetooth_denied_setting')
                        }
                    }
                } else if (isHarmonyOS()) {
                    // TODO: 鸿蒙平台蓝牙权限请求适配
                    console.warn('[权限请求] 鸿蒙平台蓝牙权限请求暂未实现')
                    clearTimeoutIfNeeded()
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: false,
                        status: PermissionStatus.NOT_DETERMINED,
                        message: 'TODO: 鸿蒙平台蓝牙权限请求待适配'
                    }
                } else {
                    // 其他 App 平台
                    console.error('[权限请求] 不支持的App平台')
                    clearTimeoutIfNeeded()
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: false,
                        status: PermissionStatus.NOT_DETERMINED,
                        message: $t('permission.unsupported_platform')
                    }
                }
            } else {
                // 小程序平台：需要通过调用 openBluetoothAdapter 来触发权限请求
                // 微信小程序会自动弹出系统权限请求对话框
                console.log('[权限请求] 小程序平台蓝牙权限，尝试通过 openBluetoothAdapter 触发')

                try {
                    // 尝试打开蓝牙适配器，这会触发权限请求
                    await new Promise<void>((resolve, reject) => {
                        uni.openBluetoothAdapter({
                            success: () => {
                                console.log('[权限请求] 小程序蓝牙权限授权成功')
                                resolve()
                            },
                            fail: (err: any) => {
                                console.log('[权限请求] 小程序蓝牙权限失败:', err)
                                reject(err)
                            }
                        })
                    })

                    clearTimeoutIfNeeded()
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: true,
                        status: PermissionStatus.AUTHORIZED
                    }
                } catch (btError: any) {
                    clearTimeoutIfNeeded()
                    const errMsg = btError?.errMsg || btError?.message || String(btError)
                    console.log('[权限请求] 小程序蓝牙权限错误详情:', errMsg)

                    // "already opened" 表示之前已经成功打开过，权限已授予
                    if (errMsg.includes('already opened') || errMsg.includes('already open')) {
                        console.log('[权限请求] 蓝牙适配器已打开，权限已授予')
                        if (notify) {
                            notify.close()
                        }
                        return {
                            granted: true,
                            status: PermissionStatus.AUTHORIZED
                        }
                    }

                    // 蓝牙未开启
                    if (errMsg.includes('not available') || errMsg.includes('not turned on') || errMsg.includes('未开启')) {
                        if (notify) {
                            notify.close()
                            notify.show({
                                type: 'warning',
                                message: $t('permission.bluetooth_not_enabled'),
                                duration: 3000
                            })
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.UNAVAILABLE,
                            message: '蓝牙未开启'
                        }
                    }

                    // 权限被拒绝
                    if (errMsg.includes('auth deny') || errMsg.includes('permission') || errMsg.includes('authorize')) {
                        if (notify) {
                            notify.close()
                            notify.show(generateNotifyMessage(PermissionType.BLUETOOTH, NotifyMessageType.DENIED))
                        }
                        return {
                            granted: false,
                            status: PermissionStatus.DENIED,
                            message: '蓝牙权限被拒绝'
                        }
                    }

                    // 其他错误，默认视为权限问题
                    if (notify) {
                        notify.close()
                    }
                    return {
                        granted: false,
                        status: PermissionStatus.NOT_DETERMINED,
                        message: errMsg
                    }
                }
            }
        } catch (error: any) {
            // 异常情况下也要清理超时定时器
            clearTimeoutIfNeeded()
            console.error('[权限请求] 请求蓝牙权限异常:', error)
            // 关闭 notify
            if (notify) {
                try {
                    notify.close()
                } catch (closeError) {
                    console.error('[权限请求] 关闭notify失败:', closeError)
                }
            }
            return {
                granted: false,
                status: PermissionStatus.NOT_DETERMINED,
                message: error.message || $t('permission.bluetooth_request_failed')
            }
        }
    } catch (error: any) {
        // 外层异常处理
        console.error('[权限请求] 请求蓝牙权限外层异常:', error)
        if (notify) {
            try {
                notify.close()
            } catch (closeError) {
                console.error('[权限请求] 关闭notify失败:', closeError)
            }
        }
        return {
            granted: false,
            status: PermissionStatus.NOT_DETERMINED,
            message: error.message || '请求蓝牙权限失败'
        }
    }
}

/**
 * 打开权限设置页面
 */
export function openPermissionSetting(): void {
    try {
        if (isAppPlatform()) {
            // App 平台：打开应用权限设置
            uni.openAppAuthorizeSetting({
                success: () => {
                    console.log('打开应用权限设置成功')
                },
                fail: (err) => {
                    console.error('打开应用权限设置失败:', err)
                    // 降级方案：尝试打开系统设置
                    if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
                        plus.runtime.openURL('app-settings:')
                    }
                }
            })
        } else {
            // 小程序平台：打开设置页面
            uni.openSetting({
                success: () => {
                    console.log('打开设置页面成功')
                },
                fail: (err) => {
                    console.error('打开设置页面失败:', err)
                }
            })
        }
    } catch (error) {
        console.error('打开权限设置失败:', error)
    }
}

/**
 * 便捷方法：请求相机权限
 */
export async function requestCameraPermission(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    return requestPermission(PermissionType.CAMERA, notify, autoNavigateToSetting)
}

/**
 * 便捷方法：请求位置权限
 */
export async function requestLocationPermission(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    return requestPermission(PermissionType.LOCATION, notify, autoNavigateToSetting)
}

/**
 * 便捷方法：请求录音权限
 */
export async function requestRecordPermission(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    return requestPermission(PermissionType.RECORD, notify, autoNavigateToSetting)
}

/**
 * 便捷方法：请求蓝牙权限
 */
export async function requestBluetoothPermissionWrapper(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    return requestPermission(PermissionType.BLUETOOTH, notify, autoNavigateToSetting)
}

/**
 * 便捷方法：请求相册权限
 */
export async function requestAlbumPermission(
    notify?: NotifyFunctions,
    autoNavigateToSetting: boolean = false
): Promise<PermissionResult> {
    return requestPermission(PermissionType.ALBUM, notify, autoNavigateToSetting)
}

