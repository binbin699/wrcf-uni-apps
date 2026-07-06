<template>
  <wd-toast />
  <view class="delete-account-page">
    <view class="info-card">
      <view class="title">{{ $t('profile.delete_account_title') }}</view>
      <scroll-view scroll-y class="notice-scroll">
        <view class="notice-section">
          <view class="section-title">{{ $t('profile.notice_section_1_title') }}</view>
          <text class="section-content">{{ $t('profile.notice_section_1_intro') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_1_item_1') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_1_item_2') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_1_item_3') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_1_item_4') }}</text>
        </view>

        <view class="notice-section">
          <view class="section-title">{{ $t('profile.notice_section_2_title') }}</view>
          <text class="section-content">{{ $t('profile.notice_section_2_intro') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_2_item_1') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_2_item_2') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_2_item_3') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_2_item_4') }}</text>
        </view>

        <view class="notice-section">
          <view class="section-title">{{ $t('profile.notice_section_3_title') }}</view>
          <text class="section-content">{{ $t('profile.notice_section_3_condition') }}</text>
          <text class="section-subtitle">{{ $t('profile.notice_section_3_process_title') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_3_step_1') }}</text>
          <text class="section-item">{{ $t('profile.notice_section_3_step_2') }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="action-card">
      <view class="agreement-row">
        <wd-checkbox v-model="isAgreed">
          {{ $t('profile.delete_account_agreement_label') }}
        </wd-checkbox>
      </view>
      <view class="action-buttons">
        <button class="secondary-btn" :disabled="isSubmitting" @click="handleBack">
          {{ $t('profile.delete_account_not_now') }}
        </button>
        <button
          class="danger-btn"
          :loading="isSubmitting"
          :disabled="isSubmitting || !isAgreed"
          @click="handleSubmit">
          {{ $t('profile.delete_account_submit') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/store/user';
import { PageMap, Pages } from '@/utils/route';
import { useToast } from '@/uni_modules/wot-design-uni/components/wd-toast';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { isRequestHandledError } from '@/utils/request-feedback';

const { t: $t } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);
const userStore = useUserStore();
const isSubmitting = ref(false);
const isAgreed = ref(false);

function handleBack() {
  if (isSubmitting.value) {
    return;
  }
  uni.navigateBack();
}

function handleSubmit() {
  if (isSubmitting.value) {
    return;
  }

  if (!isAgreed.value) {
    toast.warning({ msg: $t('profile.delete_account_agree_tip'), duration: 2500 });
    return;
  }

  uni.showModal({
    title: $t('profile.delete_account_confirm_title'),
    content: $t('profile.delete_account_confirm_content'),
    cancelText: $t('profile.delete_account_not_now'),
    confirmText: $t('profile.delete_account_submit'),
    success: async (res) => {
      if (!res.confirm) {
        return;
      }

      isSubmitting.value = true;
      toast.loading({ msg: $t('common.loading'), duration: 0, cover: true });

      try {
        await userStore.delAccount();
        toast.close();
        toast.success({ msg: $t('profile.delete_account_success'), duration: 2000, cover: true });
        setTimeout(() => {
          uni.reLaunch({
            url: PageMap[Pages.Login].url
          });
        }, 1500);
      } catch (error: any) {
        console.error('delAccount failed:', error);
        toast.close();

        if (isRequestHandledError(error)) {
          return;
        }

        // 提取后端返回的错误信息
        let errorMessage = $t('profile.delete_account_failed');
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.message) {
          errorMessage = error.response.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        toast.error({ msg: errorMessage, duration: 2500, cover: true });
      } finally {
        isSubmitting.value = false;
      }
    }
  });
}
</script>

<style>
.delete-account-page {
  height: 100vh;
  padding: 48rpx 40rpx;
  background: #f5f7fb;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.info-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.08);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.action-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 20rpx;
  flex-shrink: 0;
}

.notice-scroll {
  flex: 1;
  height: 0;
}

.notice-section {
  margin-bottom: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 8rpx;
}

.section-subtitle {
  font-size: 28rpx;
  font-weight: 600;
  color: #475569;
  margin-top: 8rpx;
}

.section-content {
  font-size: 28rpx;
  color: #475569;
  line-height: 1.6;
}

.section-item {
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.7;
  padding-left: 20rpx;
}

.action-card {
  display: flex;
  flex-direction: column;
}

.agreement-row {
  margin-bottom: 32rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid rgba(15, 23, 42, 0.06);
  color: #0f172a;
  font-size: 28rpx;
}

.action-buttons {
  display: flex;
  gap: 24rpx;
}

.danger-btn,
.secondary-btn {
  height: 96rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
  font-weight: 500;
  flex: 1;
}

.danger-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #f43f5e 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 16rpx 40rpx rgba(244, 63, 94, 0.35);
}

.secondary-btn {
  background: transparent;
  color: #475569;
  border: 2rpx solid rgba(148, 163, 184, 0.6);
}

.secondary-btn:disabled {
  opacity: 0.6;
}
</style>
