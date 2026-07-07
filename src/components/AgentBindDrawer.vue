<template>
  <view class="agent-bind-drawer" :class="{ show: visible }" @click="handleMaskClick">
    <view class="drawer-content" @click.stop>
      <!-- 头部 -->
      <view class="drawer-header">
        <view class="header-title">{{ $t('agent_bind_drawer.select_device') }}</view>
        <view class="agent-info">
          <text class="agent-label">{{ $t('agent_bind_drawer.agent_label') }}</text>
          <text class="agent-name">{{ agent?.agentName || agent?.name || '' }}</text>
          <text v-if="configAble" class="config-link" @click="handleConfigClick">
            {{ $t('agent_bind_drawer.modify_config') }}
          </text>
        </view>
      </view>

      <!-- 设备列表 -->
      <view class="device-list" v-if="deviceList.length > 0">
        <view
          v-for="device in deviceList"
          :key="device.id"
          class="device-item"
          @click="selectDevice(device)">
          <view class="device-select">
            <view class="select-circle" :class="{ selected: selectedDeviceId === device.id }">
              <view v-if="selectedDeviceId === device.id" class="select-dot"></view>
            </view>
          </view>

          <view class="device-info">
            <view class="device-name">{{ device.deviceName }}</view>
            <view class="device-mac">MAC: {{ device.macAddress }}</view>
            <view v-if="device.agentName" class="device-bind-status">
              {{ $t('agent_bind_drawer.bound_label') }}{{ device.agentName }}
            </view>
          </view>
        </view>
      </view>

      <!-- 设备为空状态 -->
      <wd-status-tip
        v-else
        image="/static/icons/box.svg"
        :tip="$t('agent_bind_drawer.no_device')" />
      <wd-gap></wd-gap>

      <!-- 底部按钮 -->
      <view class="drawer-footer">
        <!-- 有设备时：显示取消和确定按钮 -->
        <template v-if="deviceList.length > 0">
          <button class="footer-btn cancel-btn" @click="handleCancel">
            {{ $t('agent_bind_drawer.cancel') }}
          </button>
          <button
            class="footer-btn confirm-btn"
            @click="handleConfirm"
            :disabled="!selectedDeviceId">
            {{ $t('agent_bind_drawer.confirm') }}
          </button>
        </template>

        <!-- 无设备时：根据 setupMode 显示不同按钮 -->
        <template v-else>
          <!-- both 模式：显示扫码添加和蓝牙添加两个按钮 -->
          <template v-if="setupMode === 'both'">
            <button class="footer-btn cancel-btn" @click="handleScanAdd">
              {{ $t('agent_bind_drawer.scan_add') }}
            </button>
            <button class="footer-btn confirm-btn" @click="handleBluetoothAdd">
              {{ $t('agent_bind_drawer.bluetooth_add') }}
            </button>
          </template>
          <!-- qrcode/bluetooth 模式：显示取消和添加设备 -->
          <template v-else>
            <button class="footer-btn cancel-btn" @click="handleCancel">
              {{ $t('agent_bind_drawer.cancel') }}
            </button>
            <button class="footer-btn confirm-btn" @click="handleAddDevice">
              {{ $t('agent_bind_drawer.add_device') }}
            </button>
          </template>
        </template>
      </view>
    </view>
  </view>
</template>

<script>
import { PageMap, Pages } from '@/utils/route';
import { agentApi, deviceApi } from '../api/index';
import { isRequestHandledError } from '@/utils/request-feedback';
import {
  requestCameraAndAlbumPermission,
  requestCameraPermission,
  checkPermissionStatus,
  PermissionType,
  PermissionStatus,
  openPermissionSetting
} from '@/utils/permission';
import { AppInfo } from '@/const';

const isQrcodeScanCameraOnly = () => APP_CONFIG.APP_QRCODE_SCAN_SOURCE === 'camera_only';

export default {
  name: 'AgentBindDrawer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    agent: {
      type: Object,
      default: {}
    },
    configAble: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedDeviceId: null,
      deviceList: [],
      loading: false
    };
  },
  computed: {
    setupMode() {
      return APP_CONFIG.APP_SETUP_MODE || 'both';
    }
  },
  methods: {
    selectDevice(device) {
      this.selectedDeviceId = device.id;
    },

    async loadDeviceList() {
      if (this.loading) return;

      this.loading = true;
      try {
        const result = await deviceApi.getList();
        if (result.code === 1000) {
          this.deviceList = result.data || [];
        } else {
          console.error(this.$t('agent_bind_drawer.get_device_list_failed') + ':', result.message);
          this.deviceList = [];
        }
      } catch (error) {
        console.error(this.$t('agent_bind_drawer.get_device_list_failed') + ':', error);
        this.deviceList = [];
      } finally {
        this.loading = false;
      }
    },

    async bindAgentToDevice() {
      // 优先使用 agentId (UUID格式)，数字 id 不是有效的绑定ID
      const agentId = this.agent?.agentId;

      if (!this.agent || !this.selectedDeviceId) {
        return {
          success: false,
          message: this.$t('agent_bind_drawer.params_incomplete')
        };
      }

      // 检查 agentId 是否有效（非空字符串）
      if (!agentId || agentId === '') {
        console.warn('[绑定] 智能体缺少有效的 agentId:', this.agent);
        return {
          success: false,
          message: this.$t('agent_bind_drawer.agent_data_invalid') || '智能体数据异常，请刷新后重试'
        };
      }

      try {
        const res = await agentApi.bind({
          deviceId: this.selectedDeviceId,
          agentId: agentId
        });

        if (res.code === 1000) {
          return {
            success: true,
            message: this.$t('agent_bind_drawer.bind_success')
          };
        } else {
          if (res.message.includes('设备已存在九宝平台')) {
            return {
              success: false,
              message: this.$t('agent_bind_drawer.device_exist')
            };
          }
          return {
            success: false,
            message: res.message || this.$t('agent_bind_drawer.bind_failed')
          };
        }
      } catch (error) {
        console.error(this.$t('agent_bind_drawer.bind_device_failed') + ':', error);

        if (isRequestHandledError(error)) {
          return {
            success: false,
            message: error.message,
            handledByRequest: true
          };
        }

        // 检查错误消息（兼容多种错误格式）
        const errorMsg =
          error?.message || error?.errMsg || (typeof error === 'string' ? error : '');

        // 处理特定错误
        if (errorMsg.includes('设备已存在九宝平台')) {
          return {
            success: false,
            message: this.$t('agent_bind_drawer.device_exist')
          };
        }

        // 超时错误
        if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
          return {
            success: false,
            message: this.$t('agent_bind_drawer.request_timeout') || '请求超时，请重试'
          };
        }

        // 其他错误，显示通用绑定失败消息
        return {
          success: false,
          message: this.$t('agent_bind_drawer.bind_failed')
        };
      }
    },

    async handleConfirm() {
      if (!this.selectedDeviceId) {
        this.$emit('error', {
          message: this.$t('agent_bind_drawer.please_select_device'),
          handledByRequest: false
        });
        return;
      }

      const selectedDevice = this.deviceList.find((d) => d.id === this.selectedDeviceId);

      const result = await this.bindAgentToDevice();

      if (result.success) {
        this.$emit('success', {
          agent: this.agent,
          device: selectedDevice,
          message: result.message
        });
        this.loadDeviceList();
      } else {
        this.$emit('error', {
          message: result.message,
          handledByRequest: Boolean(result.handledByRequest)
        });
      }
    },

    handleCancel() {
      this.$emit('cancel');
      this.$emit('update:visible', false);
    },

    handleMaskClick() {
      this.handleCancel();
    },

    handleConfigClick() {
      uni.navigateTo({
        url: `${PageMap[Pages.AgentEdit].url}?agentId=${this.agent.agentId}&id=${this.agent.id}`
      });
    },

    // 蓝牙添加设备
    handleBluetoothAdd() {
      uni.navigateTo({
        url: PageMap[Pages.BluetoothConfig].url + '?fromAddDevice=1'
      });
      this.$emit('update:visible', false);
    },

    // 扫码添加设备
    async handleScanAdd() {
      this.$emit('update:visible', false);

      try {
        // iOS 特殊处理
        if (uni.getSystemInfoSync().platform === 'ios') {
          const status = await checkPermissionStatus(PermissionType.CAMERA);
          if (status === PermissionStatus.DENIED) {
            uni.showModal({
              title: this.$t('common.tip'),
              content: this.$t('permission.camera_denied_guide'),
              confirmText: this.$t('common.go_to_setting'),
              cancelText: this.$t('common.cancel'),
              success: (res) => {
                if (res.confirm) {
                  openPermissionSetting();
                }
              }
            });
            return;
          }
        } else {
          // 非 iOS 平台：使用合并的预请求弹窗同时请求相机和相册权限
          const permissionResult = await requestCameraAndAlbumPermission(undefined, true);
          if (!permissionResult.camera.granted) {
            // 如果相机权限被拒绝，终止流程
            return;
          }
          // 相册权限是可选的，不影响扫码流程
        }

        // 扫码
        uni.scanCode({
          scanType: ['qrCode'],
          autoZoom: false,
          ...(isQrcodeScanCameraOnly() ? { onlyFromCamera: true } : {}),
          success: async (res) => {
            console.log('【扫码原始结果】:', res.result);

            // 解析二维码数据
            let qrcodeData;
            try {
              qrcodeData = JSON.parse(res.result);
              console.log('【解析成功】:', qrcodeData);
            } catch (error) {
              console.error('【JSON解析失败】:', error, res.result);
              uni.showToast({ title: '二维码格式错误', icon: 'none' });
              return;
            }

            const { m, s, v } = qrcodeData || {};
            if (!m) {
              uni.showToast({ title: '二维码缺少MAC地址', icon: 'none' });
              return;
            }
            if (!v) {
              uni.showToast({ title: '二维码不支持（缺少v）', icon: 'none' });
              return;
            }
            if (!v.startsWith('cf-')) {
              uni.showToast({ title: '仅支持CF设备', icon: 'none' });
              return;
            }

            const requestData = { m, s, v };
            console.log('【准备请求数据】:', requestData);

            try {
              uni.showLoading({ title: '绑定中...' });
              const result = await deviceApi.bindByQrcode(requestData);
              uni.hideLoading();

              if (result && result.code === 1000) {
                uni.showToast({ title: '绑定成功', icon: 'success', duration: 1500 });

                // 处理默认智能体提示
                const bind = result?.data?.defaultAgentBind;
                if (bind) {
                  let agentMsg = '';
                  if (bind.bound && bind.agentName) {
                    agentMsg = `已绑定智能体：${bind.agentName}`;
                  } else if (bind.reason === 'no_match') {
                    agentMsg = '未匹配到默认智能体';
                  } else if (bind.reason === 'error') {
                    agentMsg = '智能体绑定失败';
                  }
                  if (agentMsg) {
                    setTimeout(() => {
                      uni.showToast({ title: agentMsg, icon: 'none', duration: 2000 });
                    }, 1500);
                  }
                }

                // 跳转
                setTimeout(() => {
                  uni.navigateTo({
                    url: PageMap[Pages.NetConfig].url + '?bound=1&fromAddDevice=1'
                  });
                }, 3000);
              } else {
                throw new Error(result?.message || '绑定失败');
              }
            } catch (error) {
              uni.hideLoading();
              console.error('【绑定异常】:', error);
              uni.showToast({ title: error?.message || '绑定失败', icon: 'none' });
            }
          },
          fail: (err) => {
            if (err.errMsg !== 'scanCode:fail cancel') {
              console.error('【扫码失败】:', err);
              uni.showToast({ title: '扫码失败', icon: 'none' });
            }
          }
        });
      } catch (error) {
        console.error('扫码流程异常', error);
      }
    },

    // 添加设备（根据 setupMode 调用对应方法）
    handleAddDevice() {
      if (this.setupMode === 'bluetooth') {
        this.handleBluetoothAdd();
      } else {
        this.handleScanAdd();
      }
    }
  },

  mounted() {
    this.loadDeviceList();
  },

  watch: {
    visible(newVal) {
      if (newVal) {
        // 重置选择状态
        this.selectedDeviceId = null;
        // 重新加载设备列表
        this.loadDeviceList();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.agent-bind-drawer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;

  &.show {
    opacity: 1;
    visibility: visible;

    .drawer-content {
      transform: translateY(0);
    }
  }
}

.drawer-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 80vh;
  overflow-y: auto;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #222530;
  text-align: center;
  margin-bottom: 16rpx;
}

.agent-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.agent-label {
  font-size: 14px;
  color: #717784;
}

.agent-name {
  font-size: 14px;
  color: #222530;
  font-weight: 500;
}

.config-link {
  font-size: 14px;
  color: var(--color-primary);
  margin-left: 8px;
}

.device-list {
  margin-bottom: 32rpx;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.device-select {
  margin-right: 16px;
}

.select-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #d0d0d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--color-primary);
  }
}

.select-dot {
  width: 10px;
  height: 10px;
  background: var(--color-primary);
  border-radius: 50%;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 16px;
  font-weight: 500;
  color: #222530;
  margin-bottom: 4px;
}

.device-mac {
  font-size: 12px;
  color: #717784;
}

.device-bind-status {
  font-size: 12px;
  color: var(--color-primary);
  margin-top: 2px;
}

.empty-device-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  margin-bottom: 32px;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
  color: #8b8e9a;
  text-align: center;
}

.drawer-footer {
  display: flex;
  gap: 12px;
  padding: 16px 0;
}

.footer-btn {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 500;
  border: none;
}

.cancel-btn {
  background: #f2f5f8;
  color: #333333;
}

.confirm-btn {
  background: var(--color-primary);
  color: #ffffff;
}

.confirm-btn:disabled {
  background: var(--color-primary);
  opacity: 0.5;
}
</style>
