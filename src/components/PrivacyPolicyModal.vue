<template>
  <!-- 隐私政策弹窗 - SecGuard 合规要求 -->
  <view v-if="visible" class="privacy-modal-overlay">
    <view class="privacy-modal" @click.stop>
      <!-- 标题 -->
      <view class="modal-header">
        <text class="modal-title">{{ $t('privacy_modal.title') }}</text>
      </view>

      <!-- 内容 -->
      <view class="modal-content">
        <scroll-view scroll-y class="content-scroll">
          <text class="content-text">{{ $t('privacy_modal.content') }}</text>
          
          <!-- 协议链接 -->
          <view class="links-container">
            <text class="link-text" @click="openTerms">{{ $t('login.user_agreement') }}</text>
            <text class="link-separator">{{ $t('login.terms_and') }}</text>
            <text class="link-text" @click="openPrivacy">{{ $t('login.privacy_policy') }}</text>
          </view>

          <text class="content-summary">{{ $t('privacy_modal.summary') }}</text>
        </scroll-view>
      </view>

      <!-- 操作按钮 -->
      <view class="modal-actions">
        <button class="btn-disagree" @click="handleDisagree">
          {{ $t('privacy_modal.disagree') }}
        </button>
        <button class="btn-agree" @click="handleAgree">
          {{ $t('privacy_modal.agree') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { AppConfig } from '@/configs/';
import { usePrivacyStore } from '@/store/privacy';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'agree'): void;
  (e: 'disagree'): void;
}>();

const { t: $t } = useI18n();
const privacyStore = usePrivacyStore();

/**
 * 打开外部链接
 */
function openExternal(src: string) {
  const encoded = encodeURIComponent(src);
  uni.navigateTo({ url: '/pages/webview/webview?src=' + encoded });
}

/**
 * 打开用户协议
 */
function openTerms() {
  openExternal(AppConfig.current.TERMS_URL);
}

/**
 * 打开隐私政策
 */
function openPrivacy() {
  openExternal(AppConfig.current.PRIVACY_URL);
}

/**
 * 用户同意
 */
function handleAgree() {
  privacyStore.agreePrivacyPolicy();
  emit('agree');
}

/**
 * 用户不同意
 */
function handleDisagree() {
  emit('disagree');
  privacyStore.rejectPrivacyPolicy();
}
</script>

<style scoped>
.privacy-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 40rpx;
}

.privacy-modal {
  width: 100%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 40rpx 32rpx 24rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}

.modal-content {
  padding: 24rpx 32rpx;
  max-height: 500rpx;
}

.content-scroll {
  max-height: 450rpx;
}

.content-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.8;
  display: block;
}

.links-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0 24rpx;
  padding: 10rpx 0;
  background: transparent;
}

.link-text {
  font-size: 28rpx;
  color: #007AFF;
  /* 移除下划线让界面更清爽，依靠颜色区分链接 */
  text-decoration: none; 
  padding: 8rpx 12rpx;
  font-weight: 500;
}

.link-separator {
  font-size: 28rpx;
  color: #666666;
  margin: 0 8rpx;
}

.content-summary {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  display: block;
  margin-top: 16rpx;
}

.modal-actions {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.btn-disagree,
.btn-agree {
  flex: 1;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 32rpx;
  border: none;
  border-radius: 0;
  background: transparent;
}

.btn-disagree {
  color: #999999;
  border-right: 1rpx solid #f0f0f0;
}

.btn-disagree::after {
  border: none;
}

.btn-agree {
  color: #007AFF;
  font-weight: 600;
}

.btn-agree::after {
  border: none;
}

/* 按钮点击效果 */
.btn-disagree:active {
  background: #f5f5f5;
}

.btn-agree:active {
  background: #f0f7ff;
}
</style>
