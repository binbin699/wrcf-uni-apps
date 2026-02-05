<script setup lang="ts">
import { watch, getCurrentInstance } from 'vue';
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/store';
import { requestBluetoothPermissionsForAndroid12 } from '@/utils/bluetoothPermission';

// 引入 ARMS SDK（H5 和 App 平台）
// #ifndef MP
import armsRum from '@/pkg/arms/rum-uniapp/es/index';
// #endif

const userStore = useUserStore();
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

  // 初始化 ARMS 监控
  initArmsMonitoring();

  // Android 12+ 蓝牙权限请求已移至蓝牙配网页面
  // 在用户实际使用蓝牙功能时才请求（带预请求弹窗说明）
  // requestBluetoothPermissionsForAndroid12();

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
    if (!APP_CONFIG.ARMS_PID || !APP_CONFIG.ARMS_ENDPOINT) {
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
      pid: APP_CONFIG.ARMS_PID,
      endpoint: APP_CONFIG.ARMS_ENDPOINT,
      env: APP_CONFIG.ARMS_ENV || 'prod',
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
