<template>
  <wd-toast />
  <wd-message-box />
  <view class="container">
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content" :style="{ height: navContentHeight + 'px' }">
        <view class="nav-side" @click="goBack">
          <wd-icon name="arrow-left" size="20px" color="#212730"></wd-icon>
        </view>
        <text class="nav-title">{{ $t('pages.device') }}</text>
        <view class="nav-side"></view>
      </view>
    </view>

    <view class="page-content" :style="{ paddingTop: statusBarHeight + navContentHeight + 'px' }">


    <!-- 设备列表 -->
    <view class="device-list" v-if="deviceList.length > 0">
      <template v-for="(device, index) in deviceList" :key="device.id">
        <view class="device-item" @click.stop="handleSelectDevice(device)">
          <!-- 左侧：设备信息 -->
          <view class="device-info">
            <!-- 设备名 + 绑定标签 -->
            <view class="device-name-row">
              <text class="device-name">{{ device.deviceName }}</text>
              <view class="device-tag" :class="device.agentName ? 'bound' : 'unbound'">
                <text class="device-tag-text">{{ device.agentName ? $t('device.bound') : $t('device.unbound') }}</text>
              </view>
            </view>
            <!-- 详情信息 -->
            <view class="device-details">
              <text class="device-mac">MAC:{{ device.macAddress }}</text>
              <text class="device-detail">{{ $t('device.bound_agent') }}：{{ device.agentName || $t('device.no_agent') }}</text>
            </view>
          </view>
          <!-- 右侧：删除按钮 -->
          <view class="delete-btn" @click.stop="deleteDevice(device)">
            <text class="delete-btn-text">{{ $t('device.delete_device') }}</text>
          </view>
        </view>
        <!-- 分割线（非最后一项） -->
        <view class="device-divider" v-if="index < deviceList.length - 1"></view>
      </template>
    </view>

    <!-- 空态 -->
    <view class="empty-state" v-else>
      <image class="empty-icon" src="/static/icons/no-device.svg" mode="aspectFit"></image>
      <text class="empty-text">{{ $t('device.no_devices') }}</text>
    </view>
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
import { useToast, useMessage } from '@/uni_modules/wot-design-uni';
import type { Device, VoiceprintRecord } from '@/pages/device/types';

const { t: $t, locale } = useI18n();
const toast = useToast();
const message = useMessage();

const deviceList = ref<Device[]>([]);
const loading = ref(false);
const selectDevice = ref<Device | null>(null);
const showVoiceprintPopup = ref(false);
const statusBarHeight = ref(44);
const navContentHeight = ref(44);
// 音频播放管理器
const audioPlayer = ref<AudioPlayerManager | null>(null);
const isPlaying = ref(false);

function updateNavigationTitle() {
  uni.setNavigationBarTitle({ title: $t('pages.device') });
}

function initNavigationMetrics() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 44;

  // #ifdef MP-WEIXIN
  const capsule = uni.getMenuButtonBoundingClientRect();
  navContentHeight.value = (capsule.top - statusBarHeight.value) * 2 + capsule.height;
  // #endif
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: PageMap[Pages.Profile].url });
  }
}

onLoad(() => {
  initNavigationMetrics();
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
  const deleteConfirmMsg = $t('device.delete_confirm_msg').replace('{name}', device.deviceName);

  message
    .confirm({
      title: $t('device.confirm_delete'),
      msg: deleteConfirmMsg,
      confirmButtonText: $t('common.confirm'),
      cancelButtonText: $t('common.cancel')
    })
    .then(async () => {
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
    })
    .catch(() => {
      // 用户取消删除
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
  background-color: #f4f5f9;
  display: flex;
  flex-direction: column;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 20;
  background: #fff;
}

.status-bar {
  width: 100%;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}

.nav-side {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #212730;
}

.page-content {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* ===== 设备列表 ===== */
.device-list {
  background: #fff;
  padding: 40rpx;
}

.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.device-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.device-name {
  font-size: 36rpx;
  font-weight: 500;
  color: #212730;
  line-height: 52rpx;
}

/* 绑定状态标签 */
.device-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.device-tag.bound {
  background: var(--color-primary-alpha-10, rgba(51, 92, 255, 0.05));
}

.device-tag.unbound {
  background: #f3f4f7;
}

.device-tag-text {
  font-size: 24rpx;
  line-height: 36rpx;
}

.device-tag.bound .device-tag-text {
  color: var(--color-primary);
}

.device-tag.unbound .device-tag-text {
  color: #60718b;
}

/* 设备详情文字 */
.device-details {
  display: flex;
  flex-direction: column;
}

.device-mac {
  font-size: 26rpx;
  color: #60718b;
  line-height: 40rpx;
}

.device-detail {
  font-size: 28rpx;
  color: #60718b;
  line-height: 44rpx;
}

/* 删除按钮（胶囊描边） */
.delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 16rpx;
  border: 1.6rpx solid var(--color-primary);
  border-radius: 96rpx;
  margin-left: 20rpx;
}

.delete-btn-text {
  font-size: 26rpx;
  color: var(--color-primary);
  line-height: 40rpx;
  white-space: nowrap;
}

/* 列表分割线 */
.device-divider {
  height: 1rpx;
  background: #e8e8e8;
  margin: 40rpx 0;
}

/* ===== 加载态 ===== */
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
  font-size: 28rpx;
  color: #60718b;
}

/* ===== 空态 ===== */
.empty-state {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-icon {
  width: 320rpx;
  height: 320rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #60718b;
  line-height: 44rpx;
}

/* ===== 声纹管理面板 ===== */
.voiceprint-popup {
  max-height: 80vh;
  min-height: 800rpx;
}

.voiceprint-header {
  text-align: center;
  padding: 40rpx 30rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.voiceprint-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #212730;
  margin-bottom: 16rpx;
}

.voiceprint-device-name {
  display: block;
  font-size: 28rpx;
  color: #60718b;
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
  color: #212730;
}

.voiceprint-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.voiceprint-detail {
  font-size: 26rpx;
  color: #60718b;
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
  color: #60718b;
  margin-bottom: 12rpx;
}

.voiceprint-empty .empty-desc {
  font-size: 26rpx;
  color: #60718b;
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
