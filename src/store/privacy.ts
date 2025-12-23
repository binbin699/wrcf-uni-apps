import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 隐私政策同意状态管理 Store
 * 用于在应用启动时检测用户是否已同意隐私政策
 * 
 * 注意：此 Store 使用同步存储读取，不发起任何网络请求
 * 以满足 SecGuard 审核要求：在用户同意隐私政策之前不进行任何网络请求
 */
export const usePrivacyStore = defineStore(
  'privacy',
  () => {
    // 用户是否已同意隐私政策
    const hasAgreed = ref<boolean>(false);

    // 检查是否需要显示隐私政策弹窗
    const shouldShowPrivacyModal = computed(() => !hasAgreed.value);

    /**
     * 同步检查隐私政策同意状态
     * 在应用启动时调用，使用同步方法读取本地存储
     * 不发起任何网络请求
     */
    const checkPrivacyAgreement = (): boolean => {
      try {
        // 使用同步方法读取本地存储，避免异步操作
        const agreed = uni.getStorageSync('privacy_policy_agreed');
        hasAgreed.value = agreed === true || agreed === 'true';
        console.log('[隐私政策] 检查同意状态:', hasAgreed.value);
        return hasAgreed.value;
      } catch (error) {
        console.warn('[隐私政策] 读取存储失败:', error);
        hasAgreed.value = false;
        return false;
      }
    };

    /**
     * 用户同意隐私政策
     * 保存同意状态到本地存储
     */
    const agreePrivacyPolicy = (): void => {
      try {
        hasAgreed.value = true;
        uni.setStorageSync('privacy_policy_agreed', true);
        console.log('[隐私政策] 用户已同意');
      } catch (error) {
        console.error('[隐私政策] 保存同意状态失败:', error);
      }
    };

    /**
     * 用户拒绝隐私政策
     * 根据平台行为退出应用或提示用户
     */
    const rejectPrivacyPolicy = (): void => {
      console.log('[隐私政策] 用户拒绝');
      
      // #ifdef APP-PLUS
      // Android App：退出应用
      // 注意：APP-ANDROID 条件编译仅在 uts 文件中有效，需要运行时判断
      const systemInfo = uni.getSystemInfoSync();
      if (systemInfo.platform === 'android') {
        try {
          plus.runtime.quit();
        } catch (error) {
          console.error('[隐私政策] 退出应用失败:', error);
        }
      }
      // #endif
      
      // #ifdef MP-WEIXIN
      // 微信小程序：显示提示并退出小程序
      uni.showModal({
        title: '温馨提示',
        content: '您需要同意用户协议与隐私政策才能使用本应用',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          // 微信小程序可以调用 wx.exitMiniProgram（需要用户触发）
          // 这里只是提示，用户手动退出
        }
      });
      // #endif
      
      // #ifdef H5
      // H5：显示提示
      uni.showToast({
        title: '请同意隐私政策后使用',
        icon: 'none',
        duration: 2000
      });
      // #endif
    };

    /**
     * 重置隐私政策同意状态（仅用于调试）
     */
    const resetPrivacyAgreement = (): void => {
      try {
        hasAgreed.value = false;
        uni.removeStorageSync('privacy_policy_agreed');
        console.log('[隐私政策] 同意状态已重置');
      } catch (error) {
        console.error('[隐私政策] 重置状态失败:', error);
      }
    };

    return {
      // 状态
      hasAgreed: computed(() => hasAgreed.value),
      shouldShowPrivacyModal,

      // 方法
      checkPrivacyAgreement,
      agreePrivacyPolicy,
      rejectPrivacyPolicy,
      resetPrivacyAgreement
    };
  },
  {
    // 不使用 persist 插件，手动管理存储
    // 因为需要在 Pinia 初始化之前同步读取状态
    persist: false
  }
);
