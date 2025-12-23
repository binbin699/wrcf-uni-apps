<script setup lang="ts">
// 尽早导入AppConfig以初始化
import { AppConfig } from '@/configs/';
import { watch, getCurrentInstance } from 'vue';
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { useUserStore, usePrivacyStore } from '@/store';
import { requestBluetoothPermissionsForAndroid12 } from '@/utils/bluetoothPermission';
import { ENV } from '@/const/env';

// 引入 ARMS SDK（H5 和 App 平台）
// #ifndef MP
import armsRum from '@/pkg/arms/rum-uniapp/es/index';
// #endif

const userStore = useUserStore();
const privacyStore = usePrivacyStore();
const { t: $t, locale } = useI18n();

const pageTitleKeyByRoute: Record<string, string> = {
  'pages/login/login': 'pages.login',
  'pages/login/register': 'pages.register',
  'pages/index/index': 'index.my_agents',
  'pages/agent/create': 'pages.create_agent',
  'pages/agent/edit': 'pages.edit_agent',
  'pages/profile/profile': 'pages.profile',
  'pages/device/device': 'pages.device',
  'pages/bluetooth-config/bluetooth-config': 'pages.bluetooth_config',
  'pages/mock-test/mock-test': 'pages.mock_test',
  'pages/square/square': 'pages.square',
  'pages/voice/clone': 'pages.voice_clone',
  'pages/voice/manage': 'pages.voice_manage',
  'pages/voice/bind-voiceprint': 'pages.bind_voiceprint',
  'pages/net-config/net-config': 'pages.net_config'
};

function applyLocaleResources() {
  try {
    uni.setTabBarItem({ index: 0, text: $t('tabbar.agent') });
    uni.setTabBarItem({ index: 1, text: $t('tabbar.create') });
    uni.setTabBarItem({ index: 2, text: $t('tabbar.square') });
    uni.setTabBarItem({ index: 3, text: $t('tabbar.profile') });
  } catch (error) {
    console.warn('Failed to update tab bar text', error);
  }

  try {
    updateNavigationBarTitle();
  } catch (error) {
    console.warn('Failed to update navigation title', error);
  }
}

function updateNavigationBarTitle() {
  try {
    const pages = getCurrentPages();
    const currentPage = pages?.[pages.length - 1];
    const route = currentPage?.route;
    const titleKey = route ? pageTitleKeyByRoute[route] : undefined;
    const title = titleKey ? $t(titleKey) : $t('app.global_title');
    uni.setNavigationBarTitle({ title });
  } catch (error) {
    console.warn('Failed to resolve navigation title', error);
  }
}

onLaunch(() => {
  console.log('App Launch');

  // #ifdef APP-PLUS
  // *** SecGuard 合规要求（仅 Android）***
  // 在 App 首次启动时，必须先检查隐私政策同意状态
  // 只有用户同意后才能进行任何网络请求或 SDK 初始化
  // 注意：APP-ANDROID 条件编译仅在 uts 文件中有效，这里使用运行时判断
  const systemInfo = uni.getSystemInfoSync();
  if (systemInfo.platform === 'android') {
    const hasAgreed = privacyStore.checkPrivacyAgreement();

    if (!hasAgreed) {
      // 用户未同意，不进行任何网络请求或 SDK 初始化
      // 隐私政策弹窗将在登录页面中显示
      console.log('[App] Android 用户未同意隐私政策，等待用户在登录页同意');
      // 只应用本地资源（不涉及网络请求）
      applyLocaleResources();
      return;
    }
  }
  // #endif

  // 用户已同意（或非 Android 平台），正常初始化
  console.log('[App] 正常初始化');

  // 初始化 ARMS 监控（在隐私政策检查之后）
  initArmsMonitoring();

  // Android 12+ 在 App 启动时立即请求蓝牙权限
  // 这样 SDK 后续调用蓝牙 API 时权限就已经授予了
  requestBluetoothPermissionsForAndroid12();

  userStore.initUserState();
  applyLocaleResources();
});
onShow(() => {
  // #ifdef APP-PLUS
  // App 端隐藏原生 tabBar，使用自定义 tabBar
  uni.hideTabBar({
    animation: false
  });
  // #endif
});

onHide(() => {
  console.log('App Hide');
});

watch(
  () => locale.value,
  () => {
    applyLocaleResources();
  }
);

/**
 * 初始化 ARMS 监控
 * 支持平台：H5、App (iOS/Android)
 * 不支持：小程序
 */
function initArmsMonitoring() {
  // #ifndef MP
  try {
    if (!ENV.VITE_ARMS_PID || !ENV.VITE_ARMS_ENDPOINT) {
      return;
    }

    const instance = getCurrentInstance();
    if (!instance) {
      console.warn('[ARMS] 无法获取 Vue 实例');
      return;
    }

    const app = instance.appContext.app;

    const config = {
      vue: app,
      pid: ENV.VITE_ARMS_PID,
      endpoint: ENV.VITE_ARMS_ENDPOINT,
      env: ENV.VITE_ARMS_ENV || 'prod',
      collectors: {
        api: true,
        jsError: true,
        consoleError: true
      },
      tracing: false,
    };

    armsRum.init(config);
    console.log('[ARMS] 监控初始化成功');
  } catch (error: any) {
    console.error('[ARMS] 监控初始化失败:', error?.message || error);
  }
  // #endif
}
</script>
<style>
@import './styles/index.css';
</style>
