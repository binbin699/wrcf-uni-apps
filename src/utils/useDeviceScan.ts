import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { deviceApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import { updateSquareTabBadge } from '@/utils/tabBarBadge';
import {
    requestCameraAndAlbumPermission,
    checkPermissionStatus,
    PermissionType,
    PermissionStatus,
    openPermissionSetting
} from '@/utils/permission';
import { AppInfo } from '@/const';

export function useDeviceScan(options?: { toast?: any; showNotify?: any; closeNotify?: any }) {
    const { t: $t } = useI18n();
    const toast = options?.toast || useToast();
    const showNotify = options?.showNotify || useNotify().showNotify;
    const closeNotify = options?.closeNotify || useNotify().closeNotify;
    const isNavigating = ref(false);

    /**
     * 扫码并绑定设备
     * @param callbacks 回调函数集合
     */
    const scanAndBind = async (callbacks?: {
        onScanSuccess?: () => void; // 扫码成功后立即调用（例如隐藏引导页）
    }) => {
        if (isNavigating.value) return;
        isNavigating.value = true;

        try {
            if (uni.getSystemInfoSync().platform === 'ios') {
                const status = await checkPermissionStatus(PermissionType.CAMERA);
                if (status === PermissionStatus.DENIED) {
                    showNotify({
                        type: 'warning',
                        message: $t('permission.camera_denied_guide')
                    });
                    // 处理已拒绝的情况
                    uni.showModal({
                        title: $t('common.tip'),
                        content: $t('permission.camera_denied_guide'),
                        confirmText: $t('common.go_to_setting'),
                        cancelText: $t('common.cancel'),
                        success: (res) => {
                            if (res.confirm) {
                                openPermissionSetting();
                            }
                        }
                    });
                    isNavigating.value = false;
                    return;
                }
                // 对于 authorized 或 notDetermined，直接进行扫码
                // iOS 的 uni.scanCode 会自动触发第一次授权弹窗，且体验比 requestCameraPermission 的拍照回退更好
            } else {
                // 非 iOS 平台：使用合并的预请求弹窗同时请求相机和相册权限
                const permissionResult = await requestCameraAndAlbumPermission({
                    show: showNotify,
                    close: closeNotify
                }, true);

                if (!permissionResult.camera.granted) {
                    isNavigating.value = false;
                    return;
                }
                // 相册权限是可选的，不影响扫码流程
            }

            uni.scanCode({
                scanType: ['qrCode'],
                autoZoom: false,
                success: async (res) => {
                    // 提供回调钩子，例如在解析前隐藏引导页
                    if (callbacks?.onScanSuccess) {
                        callbacks.onScanSuccess();
                    }

                    // 解析二维码数据
                    let qrcodeData;
                    try {
                        qrcodeData = JSON.parse(res.result);
                    } catch (error) {
                        console.error('JSON解析错误:', error);
                        toast.warning({ msg: $t('net_config.invalid_qr'), duration: 2000 });
                        isNavigating.value = false;
                        return;
                    }

                    // 检查 s 和 m 字段是否存在
                    if (!qrcodeData || !qrcodeData.s || !qrcodeData.m) {
                        toast.warning({ msg: $t('net_config.invalid_qr'), duration: 2000 });
                        isNavigating.value = false;
                        return;
                    }

                    try {
                        toast.loading({ loadingType: 'ring', msg: $t('net_config.binding_device'), cover: true });

                        // 调用绑定设备接口
                        const result = await deviceApi.bindByQrcode(qrcodeData);
                        if (result && result.code === 1000) {
                            console.log('设备绑定成功', result);
                            // 绑定成功，更新Tab红点
                            updateSquareTabBadge();
                        } else {
                            throw new Error(result?.message || $t('net_config.device_bind_fail'));
                        }

                        toast.close();
                        toast.success({ msg: $t('net_config.device_bind_success'), duration: 2000, cover: true });

                        // 绑定成功，跳转到配网页面
                        setTimeout(() => {
                            uni.navigateTo({
                                url: PageMap[Pages.NetConfig].url + '?bound=1',
                                complete: () => {
                                    isNavigating.value = false;
                                }
                            });
                        }, 1500);
                    } catch (error: any) {
                        console.error('设备绑定失败:', error);
                        toast.close();
                        toast.warning({ msg: error.message || $t('net_config.device_bind_failed'), duration: 2000 });
                        isNavigating.value = false;
                    }
                },
                fail: (err) => {
                    isNavigating.value = false;
                    if (err.errMsg !== 'scanCode:fail cancel') {
                        console.error(err);
                    }
                }
            });
        } catch (error) {
            console.error('扫码流程异常', error);
            isNavigating.value = false;
        }
    };

    return {
        isNavigating,
        scanAndBind
    };
}
