import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  IUserInfoRes,
  IPasswordLoginForm,
  IPasswordRegisterForm,
  IMiniLoginParams,
  IEmailLoginForm,
  ISmsLoginParams
} from '@/api/types/login';
import { loginApi } from '@/api/login';
import { useTokenStore } from './token';

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: -1,
  nickname: '',
  avatar: '/static/logo.png',
  phone: '',
  gender: 0
};

/**
 * 用户信息管理Store
 * 参考unibest模式，管理用户登录状态和用户信息
 */
export const useUserStore = defineStore(
  'user',
  () => {
    // 状态定义
    const userInfo = ref<IUserInfoRes>({ ...userInfoState });
    const isLoading = ref<boolean>(false);
    const loginError = ref<string>('');

    // 获取token store实例
    const tokenStore = useTokenStore();

    // 计算属性
    const isLoggedIn = computed(() => {
      return tokenStore.isLoggedIn && !!userInfo.value;
    });

    const userId = computed(() => userInfo.value?.userId || 0);
    const nickname = computed(() => userInfo.value?.nickname || '');
    const avatar = computed(() => userInfo.value?.avatar || '');
    const phone = computed(() => userInfo.value?.phone || '');
    const gender = computed(() => userInfo.value?.gender || 0);

    /**
     * 设置用户信息
     */
    const setUserInfo = (info: IUserInfoRes) => {
      userInfo.value = info;
    };

    /**
     * 清除用户信息
     */
    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState };
      loginError.value = '';
    };

    /**
     * 退出登录
     */
    const logout = () => {
      tokenStore.clearTokens();
      clearUserInfo();
      console.log('退出登录成功');
    };

    /**
     * 谷歌登录（无账号自动注册）
     */
    const googleLogin = async (): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.googleLogin();
        console.log(auth, user);
        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('Google登录成功');
        return true;
      } catch (error: any) {
        console.error('Google登录失败:', error);
        loginError.value = error.message || 'Google登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 微信登录（APP授权登录）
     */
    const wxAppLogin = async (): Promise<boolean> => {
      console.log('=== 开始微信登录流程 ===');
      isLoading.value = true;
      loginError.value = '';

      try {
        console.log('调用微信授权接口...');
        const { auth, userInfo: user } = await loginApi.wxAppLogin();

        console.log('微信登录响应:', {
          hasAuth: !!auth,
          hasToken: !!auth?.token,
          hasRefreshToken: !!auth?.refreshToken,
          userId: user?.userId,
          nickname: user?.nickname,
          avatar: user?.avatar
        });

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('✅ 微信登录成功, userId:', user?.userId);
        return true;
      } catch (error: any) {
        console.error('❌ 微信登录失败，错误详情:', error);

        // 提取错误信息
        const errMsg = error.errMsg || error.message || '';
        console.log('错误信息:', {
          errMsg,
          errCode: error.errCode,
          code: error.code,
          fullError: error
        });

        // 检查是否是用户取消
        if (errMsg.includes('cancel') || errMsg.includes('取消') || errMsg.includes('user cancelled')) {
          console.log('用户取消了微信登录授权');
          loginError.value = 'user cancelled';
          return false;
        }

        console.error('微信登录失败原因:', errMsg || '未知错误');
        loginError.value = errMsg || '微信登录失败';
        return false;
      } finally {
        isLoading.value = false;
        console.log('=== 微信登录流程结束 ===');
      }
    };

    /**
     * Apple登录
     */
    const appleLogin = async (): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.appleLogin();
        tokenStore.setTokens(auth);
        setUserInfo(user);
        console.log('Apple登录成功');
        return true;
      } catch (error: any) {
        console.error('Apple登录失败:', error);
        // 检查是否是用户取消
        const errMsg = error.errMsg || error.message || '';
        if (errMsg.includes('cancel') || errMsg.includes('取消')) {
          loginError.value = 'user cancelled';
          return false;
        }

        loginError.value = errMsg || 'Apple登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 账号密码登录
     */
    const passwordLogin = async (loginForm: IPasswordLoginForm): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.passwordLogin(loginForm);

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('账号密码登录成功');
        return true;
      } catch (error: any) {
        console.error('账号密码登录失败:', error);
        loginError.value = error.message || '登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 邮箱密码登录
     */
    const emailLogin = async (loginForm: IEmailLoginForm): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.emailLogin(loginForm);

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('邮箱密码登录成功');
        return true;
      } catch (error: any) {
        console.error('邮箱密码登录失败:', error);
        loginError.value = error.message || '登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 小程序手机号登录
     */
    const miniPhoneLogin = async (params: IMiniLoginParams): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.miniPhoneLogin(params);

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('小程序手机号登录成功');
        return true;
      } catch (error: any) {
        console.error('小程序手机号登录失败:', error);
        loginError.value = error.message || '登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 账号密码注册
     */
    const register = async (registerForm: IPasswordRegisterForm): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.register(registerForm);

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('注册成功');
        return true;
      } catch (error: any) {
        console.error('注册失败:', error);
        loginError.value = error.message || '注册失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 短信登录
     */
    const smsLogin = async (params: ISmsLoginParams): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.smsLogin(params);
        tokenStore.setTokens(auth);
        setUserInfo(user);
        console.log('短信登录成功');
        return true;
      } catch (error: any) {
        console.error('短信登录失败:', error);
        loginError.value = error.message || '登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 游客登录
     */
    const guestLogin = async (): Promise<boolean> => {
      isLoading.value = true;
      loginError.value = '';

      try {
        const { auth, userInfo: user } = await loginApi.guestLogin();

        // 设置token和用户信息
        tokenStore.setTokens(auth);
        setUserInfo(user);

        console.log('游客登录成功');
        return true;
      } catch (error: any) {
        console.error('游客登录失败:', error);
        loginError.value = error.message || '游客登录失败';
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 获取用户信息
     */
    const fetchUserInfo = async (): Promise<boolean> => {
      if (!tokenStore.isLoggedIn) {
        console.warn('用户未登录，无法获取用户信息');
        return false;
      }

      isLoading.value = true;

      try {
        const user = await loginApi.getUserInfo();
        setUserInfo(user);
        console.log('获取用户信息成功');
        return true;
      } catch (error: any) {
        console.error('获取用户信息失败:', error);
        // 如果是token相关错误，清除登录状态
        if (error.code === 401 || error.code === 403) {
          logout();
        }
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 更新用户信息
     */
    const updateUserInfo = async (updates: Partial<IUserInfoRes>): Promise<boolean> => {
      if (!tokenStore.isLoggedIn) {
        console.warn('用户未登录，无法更新用户信息');
        return false;
      }

      isLoading.value = true;

      try {
        const updatedUser = await loginApi.updateUserInfo(updates);
        setUserInfo(updatedUser);
        console.log('更新用户信息成功');
        return true;
      } catch (error: any) {
        console.error('更新用户信息失败:', error);
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 更新密码
     */
    const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
      if (!tokenStore.isLoggedIn) {
        console.warn('用户未登录，无法更新密码');
        return false;
      }

      isLoading.value = true;

      try {
        await loginApi.updatePassword(oldPassword, newPassword);
        console.log('更新密码成功');
        return true;
      } catch (error: any) {
        console.error('更新密码失败:', error);
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 绑定手机号
     */
    const bindPhone = async (params: IMiniLoginParams): Promise<boolean> => {
      if (!tokenStore.isLoggedIn) {
        console.warn('用户未登录，无法绑定手机号');
        return false;
      }

      isLoading.value = true;

      try {
        await loginApi.bindPhone(params);
        // 绑定成功后重新获取用户信息
        await fetchUserInfo();
        console.log('绑定手机号成功');
        return true;
      } catch (error: any) {
        console.error('绑定手机号失败:', error);
        return false;
      } finally {
        isLoading.value = false;
      }
    };

    /**
     * 注销/删除账号
     */
    const delAccount = async (): Promise<void> => {
      if (!tokenStore.isLoggedIn) {
        throw new Error('用户未登录');
      }

      try {
        // 调用后端注销接口，只有 code===1000 才算成功
        const response = await loginApi.delAccount();

        // 检查响应码，只有 code===1000 才是成功
        if (response.code === 1000) {
          // 只有成功时才清除本地状态
          tokenStore.clearTokens();
          clearUserInfo();
          console.log('注销账号成功');
        } else {
          // 响应码不是1000，抛出错误，不清除本地状态
          throw new Error(response.message || '注销账号失败');
        }
      } catch (error) {
        console.error('调用注销接口失败:', error);
        // 重新抛出错误，让调用方处理，不清除本地状态
        throw error;
      }
    };

    /**
     * 检查登录状态并自动刷新token
     */
    const checkLoginStatus = async (): Promise<boolean> => {
      // 如果没有token，直接返回false
      if (!tokenStore.accessToken) {
        return false;
      }

      // 如果token过期但可以刷新，尝试刷新
      if (tokenStore.isTokenExpired && tokenStore.canRefreshToken) {
        const refreshSuccess = await tokenStore.refreshAccessToken();
        if (!refreshSuccess) {
          logout();
          return false;
        }
      }

      // 如果有token但没有用户信息，尝试获取用户信息
      if (tokenStore.isLoggedIn && !userInfo.value) {
        const fetchSuccess = await fetchUserInfo();
        if (!fetchSuccess) {
          await delAccount();
          return false;
        }
      }

      return isLoggedIn.value;
    };

    /**
     * 初始化用户状态
     * 应用启动时调用，恢复登录状态
     */
    const initUserState = async (): Promise<void> => {
      try {
        // 恢复token
        tokenStore.restoreTokens();

        // 检查登录状态
        await checkLoginStatus();
      } catch (error) {
        console.error('初始化用户状态失败:', error);
        logout();
      }
    };

    return {
      // 状态
      userInfo: computed(() => userInfo.value),
      isLoading: computed(() => isLoading.value),
      loginError: computed(() => loginError.value),

      // 计算属性
      isLoggedIn,
      userId,
      nickname,
      avatar,
      phone,
      gender,

      // 方法
      setUserInfo,
      clearUserInfo,
      passwordLogin,
      emailLogin,
      miniPhoneLogin,
      googleLogin,
      wxAppLogin,
      appleLogin,
      register,
      smsLogin,
      guestLogin,
      fetchUserInfo,
      updateUserInfo,
      updatePassword,
      bindPhone,
      logout,
      delAccount,
      checkLoginStatus,
      initUserState
    };
  },
  {
    persist: true
  }
);
