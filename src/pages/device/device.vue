<template>
  <wd-toast />
  <view class="container">
    <!-- 加载态 -->
    <view class="loading-state" v-if="loading">
      <text class="loading-text">{{ $t('device.loading') }}</text>
    </view>

    <!-- 设备列表 -->
    <view class="device-list" v-else-if="deviceList.length > 0">
      <view class="device-item" v-for="device in deviceList" :key="device.id" @click.stop="handleSelectDevice(device)">
        <view class="device-info">
          <view class="device-header">
            <text class="device-name">{{ device.deviceName }}</text>
            <view class="header-actions" @click.stop>
              <wd-button type="icon" icon="delete" @click="deleteDevice(device)"></wd-button>
            </view>
          </view>
          <text class="device-mac">MAC: {{ device.macAddress }}</text>
          <text class="device-agent" v-if="device.agentName">
            {{ $t('device.bound_agent') }}: {{ device.agentName }}
          </text>
          <text class="device-agent unbound" v-else>
            {{ $t('device.bound_agent') }}: {{ $t('device.unbound') }}
          </text>
          <!-- TODO: 绑定时间和方法显示功能待修复，暂时隐藏
          <text class="device-remark" v-if="device.remark">
            {{ $t('device.remark') }}: {{ getLocalizedRemark(device.remark) }}
          </text>
          -->
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view class="empty-state" v-else>
      <image class="empty-icon" src="/static/icons/box.svg" mode="aspectFit"></image>
      <text class="empty-text">{{ $t('device.no_devices') }}</text>
      <text class="empty-desc">{{ $t('device.no_devices_desc') }}</text>
    </view>
  </view>

  <!-- 声纹管理面板 -->
  <wd-root-portal>
    <wd-popup v-model="showVoiceprintPopup" position="bottom" custom-class="voiceprint-popup" @close="handleClose">
      <!-- 顶部标题区域 -->
      <view class="voiceprint-header">
        <text class="voiceprint-title">{{ $t('device.voiceprint_management') }}</text>
        <text class="voiceprint-device-name">{{ selectDevice?.deviceName }}</text>
      </view>

      <!-- 内容区域 -->
      <view class="voiceprint-content">
        <!-- 有声纹记录时显示声纹信息 -->
        <view v-if="selectDevice?.voiceprintRecords && selectDevice.voiceprintRecords.length > 0"
          class="voiceprint-info">
          <view v-for="(record, index) in selectDevice.voiceprintRecords" :key="index" class="voiceprint-item">
            <view class="voiceprint-item-header">
              <text class="voiceprint-name">{{ record.voice_name }}</text>
              <view class="voiceprint-actions">
                <wd-icon name="/static/icons/voice-play.svg" v-if="record.voice_url"
                  @click.stop="togglePlayDemo(record)"></wd-icon>
              </view>
            </view>
            <view class="voiceprint-details">
              <!-- <text class="voiceprint-detail">{{ $t('device.voiceprint.threshold') }}: {{ record.threshold }}</text> -->
              <text class="voiceprint-detail">
                {{ $t('device.voiceprint.created_at') }}: {{ formatDate(record.created_at) }}
              </text>
              <!-- <text class="voiceprint-detail">{{ $t('device.voiceprint.status') }}: {{ record.status }}</text> -->
            </view>
          </view>
        </view>

        <!-- 无声纹记录时显示空态 -->
        <wd-status-tip v-else image="/static/icons/box.svg" :tip="$t('device.no_voiceprints')" />
      </view>

      <!-- 底部操作按钮 -->
      <wd-row :gutter="24">
        <wd-col :span="12">
          <wd-button type="warning" size="large" block plain :disabled="!hasVoiceprint" @click="unbindVoiceprint"
            class="action-button">
            {{ $t('device.voiceprint.unbind_current') }}
          </wd-button>
        </wd-col>
        <wd-col :span="12">
          <wd-button type="primary" size="large" block @click="bindNewVoiceprint" class="action-button">
            {{ $t('device.voiceprint.bind_new') }}
          </wd-button>
        </wd-col>
      </wd-row>
    </wd-popup>
  </wd-root-portal>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
// todo
// @ts-ignore
import { deviceApi } from '@/api/index';
import { ref, computed, watch } from 'vue';
import AudioPlayerManager from '@/utils/audioPlayer';
import { Pages, PageMap } from '@/utils/route';
import { useToast } from '@/uni_modules/wot-design-uni';
import type { Device, VoiceprintRecord } from '@/pages/device/types';

const { t: $t, locale } = useI18n();
const toast = useToast();

const deviceList = ref<Device[]>([]);
const loading = ref(false);
const selectDevice = ref<Device | null>(null);
const showVoiceprintPopup = ref(false);
// 音频播放管理器
const audioPlayer = ref<AudioPlayerManager | null>(null);
const isPlaying = ref(false);

function updateNavigationTitle() {
  uni.setNavigationBarTitle({ title: $t('pages.device') });
}

onLoad(() => {
  initAudioManager();
  loadDeviceList();
  updateNavigationTitle();
});
onShow(() => {
  loadDeviceList();
  updateNavigationTitle();
});

watch(
  () => locale.value,
  () => {
    updateNavigationTitle();
  }
);

// 初始化音频播放管理器
function initAudioManager() {
  audioPlayer.value = AudioPlayerManager.getInstance(
    {
      autoStop: true,
      loop: false,
      volume: 1
    },
    {
      onPlay: (audio) => {
        isPlaying.value = true;
        console.log('音频开始播放:', audio);
      },
      onStop: (audio) => {
        isPlaying.value = false;
        console.log('音频停止播放:', audio);
      },
      onEnded: (audio) => {
        isPlaying.value = false;
        console.log('音频播放结束:', audio);
      },
      onError: (error, audio) => {
        isPlaying.value = false;
        console.error('音频播放失败:', error);
        toast.warning({ msg: $t('device.voiceprint.play_failed'), duration: 2000, zIndex: 2005 });
      }
    }
  );
}

async function loadDeviceList() {
  try {
    loading.value = true;
    // 使用deviceApi获取设备列表
    // 注意：服务端返回的 agentName 已经过 join 处理，直接使用即可。
    // 不在客户端调用 agentApi.getInfo 做二次校验，原因：
    //   该接口仅对用户自己创建的智能体有权限，对公开/他人智能体会返回非 1000，
    //   导致绑定了公开智能体的设备被错误地显示为"未绑定"。
    const result = await deviceApi.getList();
    if (result.code === 1000) {
      deviceList.value = Array.isArray(result.data) ? result.data : [];
    }
  } catch (error) {
    console.error('获取设备列表失败:', error);
  } finally {
    loading.value = false;
  }
}

function deleteDevice(device: Device) {
  uni.showModal({
    title: $t('device.confirm_delete'),
    content: `${$t('device.confirm_delete_device')} ${device.deviceName}?`,
    cancelText: $t('common.cancel'),
    confirmText: $t('common.confirm'),
    success: async (res) => {
      if (res.confirm) {
        try {
          // 使用deviceApi删除设备
          const result = await deviceApi.remove({ id: device.id });
          if (result.code === 1000) {
            toast.success({ msg: $t('device.delete_success'), duration: 2000, zIndex: 2005 });
            showVoiceprintPopup.value = false;
            selectDevice.value = null;
            // 重新加载列表
            loadDeviceList();
          } else {
            console.log('删除设备失败:', result);
            toast.warning({
              msg: result.message || $t('device.delete_failed'),
              duration: 2000,
              zIndex: 2005
            });
          }
        } catch (error) {
          console.error('删除设备失败:', error);
          toast.warning({ msg: $t('device.delete_failed'), duration: 2000, zIndex: 2005 });
        }
      }
    }
  });
}

function handleSelectDevice(device: Device) {
  if (!APP_CONFIG.APP_USE_VOICEPRINT) return;
  selectDevice.value = device;
  showVoiceprintPopup.value = true;
}

function handleClose() {
  showVoiceprintPopup.value = false;
}

// 计算属性：判断是否有声纹
const hasVoiceprint = computed(() => {
  return selectDevice.value?.voiceprintRecords && selectDevice.value.voiceprintRecords.length > 0;
});

/**
 * 绑定方式标识符映射
 * 从中文绑定方式 → 语义标识符（用于 i18n key）
 */
const methodIdentifiers: Record<string, string> = {
  'Wi-Fi': 'wifi',
  'Wi-Fi 绑定': 'wifi',
  '蓝牙': 'bluetooth',
  '蓝牙 绑定': 'bluetooth',
  '二维码': 'qrcode',
  '二维码 绑定': 'qrcode',
  'QrCode绑定': 'qrcode',
  'QrCode': 'qrcode'
};

function getLocalizedRemark(remark?: string): string {
  if (!remark) return '';

  // 1. 如果已经是 i18n key，直接翻译
  if (remark.startsWith('device.')) {
    return $t(remark);
  }

  // 2. 匹配 "已通过 XXX 绑定" 格式
  const simpleMatch = remark.match(/^已通过\s+(.+?)\s+绑定$/);
  if (simpleMatch) {
    const method = simpleMatch[1];
    const methodId = methodIdentifiers[method] || methodIdentifiers[`${method} 绑定`];
    if (methodId) {
      return $t(`device.remark_bound_via_${methodId}`);
    }
  }

  // 3. 匹配 "绑定时间: xxx, 绑定方式: yyy" 格式
  const fullMatch = remark.match(/^绑定时间:\s*(.+?),\s*绑定方式:\s*(.+)$/);
  if (fullMatch) {
    const [, time, method] = fullMatch;
    const methodId = methodIdentifiers[method] || 'unknown';
    // 使用 i18n 格式化
    return $t('device.remark_bound_full', {
      time,
      method: $t(`device.remark_method_${methodId}`)
    });
  }

  // 4. 未知格式，原样返回
  return remark;
}

// 格式化日期
function formatDate(date: Date | string) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 播放声纹
function togglePlayDemo(record: VoiceprintRecord) {
  audioPlayer.value?.toggle({ src: record.voice_url, name: record.voice_name });
}

// 绑定新声纹
function bindNewVoiceprint() {
  if (!selectDevice.value) return;

  if (hasVoiceprint.value) {
    uni.showModal({
      title: $t('device.voiceprint.multiple_voiceprint'),
      content: $t('device.voiceprint.multiple_voiceprint_content'),
      showCancel: false
    });
  } else {
    uni.navigateTo({
      url: `${PageMap[Pages.BindVoiceprint].url}?deviceId=${selectDevice.value.id}`
    });
  }
}

// 解绑声纹
function unbindVoiceprint() {
  console.log('解绑声纹', selectDevice.value);
  if (!hasVoiceprint.value) return;

  uni.showModal({
    title: $t('device.voiceprint.confirm_unbind'),
    content: $t('device.voiceprint.confirm_unbind_content'),
    cancelText: $t('common.cancel'),
    confirmText: $t('common.confirm'),
    success: (res) => {
      if (res.confirm) {
        if (!selectDevice.value) return;
        deviceApi
          .unbindVoiceprint({
            deviceId: selectDevice.value.id,
            voiceId: selectDevice.value!.voiceprintRecords![0].voice_id
          })
          .then((result: any) => {
            if (result.code === 1000) {
              toast.success({ msg: $t('device.voiceprint.unbind_success'), duration: 2000 });
              showVoiceprintPopup.value = false;
              selectDevice.value = null;
              // 刷新设备列表
              loadDeviceList();
            } else {
              console.log('解绑声纹失败:', result);
              toast.warning({
                msg: result.message || $t('device.voiceprint.unbind_failed'),
                duration: 2000
              });
            }
          });
      }
    }
  });
}
</script>

<style>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.device-list {
  margin-top: 30rpx;
  margin-bottom: 30rpx;
}

.device-item {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-left: 30rpx;
  margin-right: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.device-header {
  margin-bottom: 15rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.device-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #222530;
}

.delete-btn {
  width: 40rpx;
  height: 40rpx;
  padding: 8rpx;
}

.device-mac {
  display: block;
  font-size: 28rpx;
  color: #717784;
  margin-bottom: 12rpx;
}

.device-agent {
  display: block;
  font-size: 28rpx;
  color: #335cff;
  margin-bottom: 12rpx;
}

.device-agent.unbound {
  color: #8b8e9a;
}

.device-remark {
  display: block;
  font-size: 28rpx;
  color: #8b8e9a;
}

.loading-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 32rpx;
  color: #717784;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
  opacity: 0.6;
}

.empty-text {
  display: block;
  font-size: 32rpx;
  color: #717784;
  margin-bottom: 15rpx;
}

.empty-desc {
  display: block;
  font-size: 32rpx;
  color: #717784;
}

.bluetooth-config-section {
  margin-top: 30rpx;
}

.config-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.config-card.disabled {
  opacity: 0.6;
}

.config-icon {
  font-size: 60rpx;
  margin-right: 30rpx;
}

.config-info {
  flex: 1;
}

.config-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.config-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.voiceprint-popup {
  max-height: 80vh;
  min-height: 800rpx;
}

/* 声纹管理面板样式 */
.voiceprint-header {
  text-align: center;
  padding: 40rpx 30rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.voiceprint-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #222530;
  margin-bottom: 16rpx;
}

.voiceprint-device-name {
  display: block;
  font-size: 28rpx;
  color: #717784;
}

.voiceprint-content {
  flex: 1;
  padding: 30rpx;
  min-height: 400rpx;
}

.voiceprint-info {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.voiceprint-item {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.voiceprint-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.voiceprint-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #222530;
}

.voiceprint-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.voiceprint-detail {
  font-size: 26rpx;
  color: #717784;
}

.voiceprint-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80rpx 30rpx;
}

.voiceprint-empty .empty-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.voiceprint-empty .empty-text {
  font-size: 30rpx;
  color: #717784;
  margin-bottom: 12rpx;
}

.voiceprint-empty .empty-desc {
  font-size: 26rpx;
  color: #8b8e9a;
}

.voiceprint-actions {
  padding: 30rpx;
}

.action-button {
  margin-bottom: 20rpx;
}

.action-button:last-child {
  margin-bottom: 0;
}
</style>
