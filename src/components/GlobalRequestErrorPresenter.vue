<template>
  <wd-toast
    :selector="GLOBAL_REQUEST_ERROR_SELECTOR"
    custom-class="global-request-error-toast"
  />
</template>

<script setup lang="ts">
import { useToast } from '@/uni_modules/wot-design-uni';
import { GLOBAL_REQUEST_ERROR_SELECTOR } from '@/utils/request-feedback';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';

const toast = useToast(GLOBAL_REQUEST_ERROR_SELECTOR);
useGlobalRequestErrorToast(toast);
</script>

<style scoped>
:deep(.global-request-error-toast) {
  --wot-toast-max-width: 620rpx;
  --wot-toast-padding: 24rpx 28rpx;
  --wot-toast-radius: 24rpx;
  --wot-toast-bg: rgba(15, 23, 42, 0.94);
  --wot-toast-line-height: 40rpx;
  --wot-toast-fs: 28rpx;
  --wot-toast-icon-size: 44rpx;
  --wot-toast-icon-margin-right: 18rpx;
  --wot-toast-icon-margin-bottom: 0;
  --wot-toast-with-icon-min-width: 0;
  box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.08);
}

:deep(.global-request-error-toast.wd-toast--with-icon) {
  align-items: flex-start;
}

:deep(.global-request-error-toast .wd-toast__icon) {
  flex-shrink: 0;
  margin-top: 2rpx;
}

:deep(.global-request-error-toast .wd-toast__msg) {
  flex: 1;
}
</style>
