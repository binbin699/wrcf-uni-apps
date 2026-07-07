import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IAuthLoginRes } from '@/api/types/login';
import { loginApi } from '@/api/login';
import { isAuthFailureError } from '@/utils/auth-error';

/**
 * Token存储键名
 */
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRES_KEY = 'token_expires';
const REFRESH_TOKEN_EXPIRES_KEY = 'refresh_token_expires';

/**
 * Token管理Store
 */
export const useTokenStore = defineStore(
  'token',
  () => {
    // 状态定义
    const accessToken = ref<string>('');
    const refreshToken = ref<string>('');
    const tokenExpires = ref<number>(0);
    const refreshTokenExpires = ref<number>(0);
    const isRefreshing = ref<boolean>(false);
    let sessionReadyPromise: Promise<boolean> | null = null;

    // 计算属性
    const isLoggedIn = computed(() => {
      return !!accessToken.value && !isTokenExpired.value;
    });

    const isTokenExpired = computed(() => {
      if (!accessToken.value || !tokenExpires.value) return true;
      return Date.now() >= tokenExpires.value * 1000;
    });

    const isRefreshTokenExpired = computed(() => {
      if (!refreshToken.value || !refreshTokenExpires.value) return true;
      return Date.now() >= refreshTokenExpires.value * 1000;
    });

    const canRefreshToken = computed(() => {
      return !!refreshToken.value && !isRefreshTokenExpired.value;
    });

    /**
     * 设置token信息
     */
    const setTokens = (authData: IAuthLoginRes) => {
      accessToken.value = authData.token;
      tokenExpires.value = Date.now() / 1000 + authData.expiresIn;

      if (authData.refreshToken) {
        refreshToken.value = authData.refreshToken;
        refreshTokenExpires.value = authData.refreshExpiresIn
          ? Date.now() / 1000 + authData.refreshExpiresIn
          : 0;
      }

      // 持久化存储
      uni.setStorageSync(TOKEN_KEY, accessToken.value);
      uni.setStorageSync(TOKEN_EXPIRES_KEY, tokenExpires.value);

      if (refreshToken.value) {
        uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken.value);
        uni.setStorageSync(REFRESH_TOKEN_EXPIRES_KEY, refreshTokenExpires.value);
      }
    };

    /**
     * 从本地存储恢复token
     */
    const restoreTokens = () => {
      try {
        const storedToken = uni.getStorageSync(TOKEN_KEY);
        const storedRefreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY);
        const storedTokenExpires = uni.getStorageSync(TOKEN_EXPIRES_KEY);
        const storedRefreshTokenExpires = uni.getStorageSync(REFRESH_TOKEN_EXPIRES_KEY);

        if (storedToken) {
          accessToken.value = storedToken;
          tokenExpires.value = storedTokenExpires || 0;
          refreshToken.value = storedRefreshToken || '';
          refreshTokenExpires.value = storedRefreshTokenExpires || 0;
        }
      } catch (error) {
        console.error('恢复token失败:', error);
        clearTokens();
      }
    };

    /**
     * 清除所有token
     */
    const clearTokens = () => {
      accessToken.value = '';
      refreshToken.value = '';
      tokenExpires.value = 0;
      refreshTokenExpires.value = 0;
      isRefreshing.value = false;

      // 清除本地存储
      uni.removeStorageSync(TOKEN_KEY);
      uni.removeStorageSync(REFRESH_TOKEN_KEY);
      uni.removeStorageSync(TOKEN_EXPIRES_KEY);
      uni.removeStorageSync(REFRESH_TOKEN_EXPIRES_KEY);
    };

    /**
     * 刷新token
     */
    const refreshAccessToken = async (): Promise<boolean> => {
      if (isRefreshing.value) {
        // 如果正在刷新，等待刷新完成
        return new Promise((resolve) => {
          const checkRefreshing = () => {
            if (!isRefreshing.value) {
              resolve(isLoggedIn.value);
            } else {
              setTimeout(checkRefreshing, 100);
            }
          };
          checkRefreshing();
        });
      }

      if (!canRefreshToken.value) {
        console.warn('无法刷新token: refresh token不存在或已过期');
        clearTokens();
        return false;
      }

      isRefreshing.value = true;

      try {
        console.log('开始刷新token...');
        const authData = await loginApi.refreshToken(refreshToken.value);

        setTokens(authData);
        console.log('token刷新成功');

        return true;
      } catch (error) {
        console.error('token刷新失败:', error);
        if (isAuthFailureError(error)) {
          clearTokens();
        }
        clearTokens();
        return false;
      } finally {
        isRefreshing.value = false;
      }
    };

    /**
     * 确保当前会话可用。
     * App 冷启动时先恢复本地凭证；若 access token 已过期但 refresh token 仍有效，
     * 则优先静默刷新，避免首批业务请求直接撞到 401。
     */
    const ensureSessionReady = async (): Promise<boolean> => {
      if (sessionReadyPromise) {
        return sessionReadyPromise;
      }

      sessionReadyPromise = (async () => {
        restoreTokens();

        if (!accessToken.value) {
          return false;
        }

        if (!isTokenExpired.value) {
          return true;
        }

        if (!canRefreshToken.value) {
          clearTokens();
          return false;
        }

        return refreshAccessToken();
      })().finally(() => {
        sessionReadyPromise = null;
      });

      return sessionReadyPromise;
    };

    /**
     * 获取有效的访问token
     * 如果token过期，自动尝试刷新
     */
    const getValidAccessToken = async (): Promise<string | null> => {
      if (!accessToken.value) {
        return null;
      }

      if (!isTokenExpired.value) {
        return accessToken.value;
      }

      // token过期，尝试刷新
      const refreshSuccess = await refreshAccessToken();
      return refreshSuccess ? accessToken.value : null;
    };

    /**
     * 检查token是否需要刷新
     * 在token过期前5分钟开始刷新
     */
    const shouldRefreshToken = computed(() => {
      if (!accessToken.value || !tokenExpires.value) return false;
      const fiveMinutesInMs = 5 * 60 * 1000;
      return Date.now() > tokenExpires.value * 1000 - fiveMinutesInMs;
    });

    /**
     * 预刷新token（在即将过期时主动刷新）
     */
    const preRefreshToken = async () => {
      if (shouldRefreshToken.value && canRefreshToken.value && !isRefreshing.value) {
        return await refreshAccessToken();
      }
    };

    // 初始化时恢复token
    restoreTokens();

    return {
      // 状态
      accessToken: computed(() => accessToken.value),
      refreshToken: computed(() => refreshToken.value),
      tokenExpires: computed(() => tokenExpires.value),
      refreshTokenExpires: computed(() => refreshTokenExpires.value),
      isRefreshing: computed(() => isRefreshing.value),

      // 计算属性
      isLoggedIn,
      isTokenExpired,
      isRefreshTokenExpired,
      canRefreshToken,
      shouldRefreshToken,

      // 方法
      setTokens,
      clearTokens,
      refreshAccessToken,
      ensureSessionReady,
      getValidAccessToken,
      preRefreshToken,
      restoreTokens
    };
  },
  {
    persist: true
  }
);
