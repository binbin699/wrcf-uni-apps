<!-- 鸿蒙端首次打开时的隐私政策弹窗，与微信/安卓端行为一致 -->
<template>
  <!-- #ifdef APP-HARMONY -->
  <view v-if="visible" class="privacy-overlay">
    <view class="privacy-dialog">
      <view class="privacy-title">{{ isSecond ? $t('privacy.second.title') : $t('privacy.title') }}</view>
      <scroll-view scroll-y class="privacy-content">
        <text class="privacy-message" v-if="isSecond">
          {{ introText }}
          <text class="privacy-link" @click="openTerms">{{ termsLinkText }}</text>
          {{ andText }}
          <text class="privacy-link" @click="openPrivacy">{{ privacyLinkText }}</text>
          {{ footerText }}
        </text>
        <text class="privacy-message" v-else>
          {{ introText }}
          <text class="privacy-link" @click="openTerms">{{ termsLinkText }}</text>
          {{ andText }}
          <text class="privacy-link" @click="openPrivacy">{{ privacyLinkText }}</text>
          {{ footerBefore }}<text class="privacy-agree">{{ footerAgree }}</text>{{ footerAfter }}
        </text>
      </scroll-view>
      <view class="privacy-actions">
        <button class="privacy-btn refuse" @click="handleRefuse">
          {{ isSecond ? $t('privacy.second.buttonRefuse') : $t('privacy.buttonRefuse') }}
        </button>
        <button class="privacy-btn accept" @click="handleAccept">
          {{ isSecond ? $t('privacy.second.buttonAccept') : $t('privacy.buttonAccept') }}
        </button>
      </view>
    </view>
  </view>
  <!-- #endif -->
  <!-- #ifndef APP-HARMONY -->
  <view v-if="false" />
  <!-- #endif -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const PRIVACY_AGREED_KEY = 'privacy_agreed_harmony';

const { t: $t } = useI18n();
// 用户协议与隐私政策 URL 复用 app.config.ts（APP_CONFIG.TERMS_URL / PRIVACY_URL）
const termsUrl = typeof APP_CONFIG !== 'undefined' ? (APP_CONFIG.TERMS_URL || '') : '';
const privacyUrl = typeof APP_CONFIG !== 'undefined' ? (APP_CONFIG.PRIVACY_URL || '') : '';

const introText = computed(() =>
  $t(isSecond.value ? 'privacy.second.messageIntro' : 'privacy.messageIntro')
);
const termsLinkText = computed(() => $t('privacy.termsLink'));
const andText = computed(() => $t('privacy.and'));
const privacyLinkText = computed(() => $t('privacy.privacyLink'));
const footerText = computed(() => $t('privacy.second.messageFooter'));
const footerBefore = computed(() => $t('privacy.messageFooterBefore'));
const footerAgree = computed(() => $t('privacy.messageFooterAgree'));
const footerAfter = computed(() => $t('privacy.messageFooterAfter'));

function openTerms() {
  if (termsUrl && (termsUrl.startsWith('http://') || termsUrl.startsWith('https://'))) {
    uni.navigateTo({ url: '/pages/webview/webview?src=' + encodeURIComponent(termsUrl) });
  }
}
function openPrivacy() {
  if (privacyUrl && (privacyUrl.startsWith('http://') || privacyUrl.startsWith('https://'))) {
    uni.navigateTo({ url: '/pages/webview/webview?src=' + encodeURIComponent(privacyUrl) });
  }
}

// 鸿蒙端默认显示，onMounted 时若已同意再关闭，避免首屏不弹
const visible = ref(true);
const isSecond = ref(false);

onMounted(() => {
  // #ifdef APP-HARMONY
  try {
    const agreed = uni.getStorageSync(PRIVACY_AGREED_KEY);
    if (agreed === '1' || agreed === true) {
      visible.value = false;
    }
  } catch (e) {
    // 读取失败时保留显示弹窗
  }
  // #endif
});

function handleAccept() {
  uni.setStorageSync(PRIVACY_AGREED_KEY, '1');
  visible.value = false;
  isSecond.value = false;
}

function handleRefuse() {
  if (isSecond.value) {
    // #ifdef APP-PLUS || APP-HARMONY
    try {
      if (typeof plus !== 'undefined' && plus.runtime && typeof plus.runtime.quit === 'function') {
        plus.runtime.quit();
      }
    } catch (e) {
      console.warn('Exit app not supported:', e);
    }
    // #endif
    visible.value = false;
  } else {
    isSecond.value = true;
  }
}
</script>

<style lang="scss" scoped>
.privacy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.privacy-dialog {
  width: 100%;
  max-width: 600rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
}

.privacy-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32rpx;
  text-align: center;
}

.privacy-content {
  flex: 1;
  max-height: 480rpx;
  margin-bottom: 50rpx;

}

.privacy-message {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.privacy-link {
  color: var(--color-primary);
  text-decoration: underline;
}

.privacy-agree {
  color: #1d4ed8;
  font-weight: 600;
}

.privacy-actions {
  display: flex;
  gap: 24rpx;
  justify-content: center;
}

.privacy-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  border-radius: 40rpx;
  border: none;
}

.privacy-btn.refuse {
  background: #f5f5f5;
  color: #999;
}

.privacy-btn.accept {
  background: var(--color-primary);
  color: #fff;
}
</style>
