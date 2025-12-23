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
          <text v-if="templateAble" class="config-link" @click="handleTemplateClick">
            {{ $t('agent_bind_drawer.as_template') }}
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
        <button class="footer-btn cancel-btn" @click="handleCancel">
          {{ $t('agent_bind_drawer.cancel') }}
        </button>
        <!-- 有设备时显示确定按钮 -->
        <button
          v-if="deviceList.length > 0"
          class="footer-btn confirm-btn"
          @click="handleConfirm"
          :disabled="!selectedDeviceId">
          {{ $t('agent_bind_drawer.confirm') }}
        </button>
        <!-- 无设备时显示添加设备按钮 -->
        <button
          v-else
          class="footer-btn confirm-btn"
          @click="handleAddDevice">
          {{ $t('agent_bind_drawer.add_device') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { PageMap, Pages } from '@/utils/route';
import { agentApi, deviceApi } from '../api/index.js';
import { gotoCreateAgentBy } from '@/pages/agent/create';
import { ENV } from '@/const/env';

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
    },
    templateAble: {
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
      if (!this.agent || !this.selectedDeviceId) {
        return {
          success: false,
          message: this.$t('agent_bind_drawer.params_incomplete')
        };
      }

      try {
        const res = await agentApi.bind({
          deviceId: this.selectedDeviceId,
          agentId: this.agent.agentId
        });

        if (res.code === 1000) {
          return {
            success: true,
            message: this.$t('agent_bind_drawer.bind_success')
          };
        } else {
          if (res.message.includes('设备已存在灵矽平台')) {
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
        return {
          success: false,
          message: this.$t('agent_bind_drawer.network_error')
        };
      }
    },

    async handleConfirm() {
      if (!this.selectedDeviceId) {
        this.$emit('error', {
          message: this.$t('agent_bind_drawer.please_select_device')
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
          message: result.message
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

    handleTemplateClick() {
      gotoCreateAgentBy(this.agent);
    },

    handleAddDevice() {
      const setupMode = ENV.VITE_APP_SETUP_MODE || 'both';
      // 跳转到添加设备/网络配置页面
      const url =
        setupMode === 'bluetooth'
          ? PageMap[Pages.BluetoothConfig].url
          : PageMap[Pages.NetConfig].url;

      uni.navigateTo({
        url: url
      });
      this.$emit('update:visible', false);
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
  color: #335CFF;
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
    border-color: #335cff;
  }
}

.select-dot {
  width: 10px;
  height: 10px;
  background: #335cff;
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
  color: #335cff;
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
  background: #F2F5F8;
  color: #333333;
}

.confirm-btn {
  background: #335CFF;
  color: #ffffff;
}

.confirm-btn:disabled {
  background: #335CFF;
  opacity: 0.5;
}
</style>
