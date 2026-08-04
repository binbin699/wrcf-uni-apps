<template>
  <view class="mock-test">
    <view class="header">
      <text class="title">{{ $t('mock.test_title') }}</text>
      <text class="subtitle">{{ $t('mock.test_desc') }}</text>
    </view>

    <view class="test-section">
      <view class="section-title">
        <text class="title-icon">🧪</text>
        <text class="title-text">{{ $t('mock.mock_function_test') }}</text>
      </view>

      <view class="test-item" @click="addRandomDevice">
        <view class="item-icon">📱</view>
        <view class="item-content">
          <text class="item-title">{{ $t('mock.add_random_device') }}</text>
          <text class="item-desc">{{ $t('mock.add_random_device_desc') }}</text>
        </view>
        <text class="item-arrow">→</text>
      </view>

      <view class="test-item" @click="addDeviceByMac">
        <view class="item-icon">📱</view>
        <view class="item-content">
          <text class="item-title">指定mac添加mock设备</text>
        </view>
        <text class="item-arrow">→</text>
      </view>
    </view>

    <view class="info-section">
      <text class="info-title">Set Locale</text>
      <!-- #ifndef MP-WEIXIN -->
      <view class="info-item">
        <text class="info-value" @click="() => setLocale('en')">en</text>
      </view>
      <!-- #endif -->
      <view class="info-item">
        <text class="info-value" @click="() => setLocale('zh-Hans')">zh-Hans</text>
      </view>
    </view>

    <view class="usage-section">
      <view class="section-title">
        <text class="title-icon">📖</text>
        <text class="title-text">{{ $t('mock.usage_instructions') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { onLoad } from '@dcloudio/uni-app';
// @ts-ignore
import { deviceApi } from '../../api/index';
import { setLocale } from '@/locale/index';

const { t: $t } = useI18n();

// 生命周期钩子
onLoad(() => {
  console.log('Mock测试页面加载');
});

async function addDevice(mac: string) {
  const deviceInfo = {
    deviceName: generateRandomDeviceName(),
    macAddress: mac,
    deviceType: 'test_device',
    version: '1.0.0'
  };

  try {
    await registerDevice(deviceInfo);
    uni.showToast({
      title: `设备 ${deviceInfo.deviceName} 添加成功`,
      icon: 'success',
      duration: 2000
    });
  } catch (error) {
    console.error('添加设备失败:', error);
    uni.showToast({
      title: '添加设备失败',
      icon: 'error',
      duration: 2000
    });
  }
}

async function addRandomDevice() {
  const randomMac = generateRandomMacAddress();
  await addDevice(randomMac);
}

async function addDeviceByMac() {
  uni.showModal({
    title: '添加设备',
    content: '请输入设备MAC地址',
    editable: true,
    placeholderText: '例如: AA:BB:CC:DD:EE:FF',
    success: async (res) => {
      if (res.confirm && res.content) {
        const mac = res.content.trim().toUpperCase();
        // 简单验证MAC地址格式
        const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
        if (macRegex.test(mac)) {
          await addDevice(mac);
        } else {
          uni.showToast({
            title: 'MAC地址格式不正确',
            icon: 'error',
            duration: 2000
          });
        }
      }
    }
  });
}

function generateRandomDeviceName() {
  const prefixes = ['智能音箱', '语音助手', '小助手', '智能设备'];
  const suffixes = ['Pro', 'Max', 'Mini', 'Lite', 'Plus'];
  const numbers = Math.floor(Math.random() * 1000);

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix}_${suffix}_${numbers}`;
}

function generateRandomMacAddress() {
  const chars = '0123456789ABCDEF';
  let mac = '';

  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':';
    mac += chars.charAt(Math.floor(Math.random() * chars.length));
    mac += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return mac;
}

async function registerDevice(deviceInfo: any) {
  try {
    const result = await deviceApi.add(deviceInfo);

    if (result.code === 1000) {
      console.log('设备注册成功:', result.data);
      return result.data;
    } else {
      throw new Error(result.message || '设备注册失败');
    }
  } catch (error) {
    console.error('设备注册API调用失败:', error);
    throw error;
  }
}
</script>

<style lang="scss" scoped>
.mock-test {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 32rpx;
}

.header {
  text-align: center;
  margin-bottom: 48rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
}

.test-section,
.info-section,
.usage-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.title-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.test-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  transition: all 0.3s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:active {
    background: #e9ecef;
    transform: scale(0.98);
  }
}

.item-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
}

.item-content {
  flex: 1;
}

.item-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.item-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}

.item-arrow {
  font-size: 32rpx;
  color: #999;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  font-size: 28rpx;
  color: #666;
  min-width: 240rpx;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  flex: 1;
  word-break: break-all;

  &.online {
    color: #52c41a;
  }

  &.offline {
    color: #ff4d4f;
  }

  &.unknown {
    color: #faad14;
  }
}

.test-server-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;

  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 8rpx rgba(24, 144, 255, 0.3);
  }
}

.btn-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}

.usage-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.usage-item {
  display: flex;
  align-items: flex-start;
}

.usage-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  background: #1890ff;
  border-radius: 50%;
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.usage-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  padding-top: 8rpx;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .mock-test {
    padding: 24rpx;
  }

  .title {
    font-size: 42rpx;
  }

  .subtitle {
    font-size: 26rpx;
  }

  .test-section,
  .info-section,
  .usage-section {
    padding: 24rpx;
    margin-bottom: 24rpx;
  }

  .title-text {
    font-size: 30rpx;
  }

  .test-item {
    padding: 20rpx;
  }

  .item-title {
    font-size: 30rpx;
  }

  .item-desc {
    font-size: 22rpx;
  }

  .info-label,
  .info-value {
    font-size: 26rpx;
  }

  .test-server-btn {
    height: 64rpx;
  }

  .btn-text {
    font-size: 26rpx;
  }

  .usage-text {
    font-size: 26rpx;
  }
}
</style>
