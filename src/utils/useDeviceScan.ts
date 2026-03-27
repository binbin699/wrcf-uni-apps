import { ref } from 'vue';
import i18n from '@/locale';
// @ts-ignore
import { deviceApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import {
  requestCameraAndAlbumPermission,
  checkPermissionStatus,
  PermissionType,
  PermissionStatus,
  openPermissionSetting
} from '@/utils/permission';
import { AppInfo } from '@/const';

export function useDeviceScan(options?: { toast?: any; showNotify?: any; closeNotify?: any }) {
  // 安全获取 $t，避免非 setup 上下文调用 useI18n 引发错误
  const $t = (key: string) => (i18n?.global?.t ? i18n.global.t(key) : key);
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
      // 小程序端：仅检查已拒绝，其余情况直接调 uni.scanCode（由扫码页触发授权，避免登录后自动续接时预请求失败）
      const isMiniProgram = !AppInfo.isApp();
      const isIOS = uni.getSystemInfoSync().platform === 'ios';
      if (isMiniProgram || isIOS) {
        const status = await checkPermissionStatus(PermissionType.CAMERA);
        if (status === PermissionStatus.DENIED) {
          showNotify({
            type: 'warning',
            message: $t('permission.camera_denied_guide')
          });
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
      } else {
        // App 非 iOS：使用合并的预请求弹窗同时请求相机和相册权限
        const permissionResult = await requestCameraAndAlbumPermission(
          {
            show: showNotify,
            close: closeNotify
          },
          true
        );

        if (!permissionResult.camera.granted) {
          isNavigating.value = false;
          return;
        }
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

          // 检查 m 字段是否存在
          if (!qrcodeData || !qrcodeData.m) {
            toast.warning({ msg: $t('net_config.invalid_qr'), duration: 2000 });
            isNavigating.value = false;
            return;
          }

          try {
            toast.loading({
              loadingType: 'ring',
              msg: $t('net_config.binding_device'),
              cover: true
            });

            // 调用绑定设备接口
            const result = await deviceApi.bindByQrcode({ m: qrcodeData.m });
            if (result && result.code === 1000) {
              console.log('设备绑定成功', result);
            } else {
              throw new Error(result?.message || $t('net_config.device_bind_fail'));
            }

            toast.close();

            // 构建成功提示：设备绑定成功，追加默认智能体绑定结果
            let successMsg = $t('net_config.device_bind_success');
            const bind = result?.data?.defaultAgentBind;
            if (bind?.bound && bind.agentName) {
              successMsg += '\n' + $t('device.default_agent_bound').replace('{name}', bind.agentName);
            } else if (bind?.reason === 'no_match') {
              successMsg += '\n' + $t('device.default_agent_no_match');
            } else if (bind?.reason === 'error') {
              successMsg += '\n' + $t('device.default_agent_bind_failed');
            }

            toast.success({
              msg: successMsg,
              duration: 2500,
              cover: true
            });

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
            console.error('[扫码绑定/bindByQrcode] 失败:', error);
            toast.close();
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
