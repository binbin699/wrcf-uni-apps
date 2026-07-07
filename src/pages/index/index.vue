<template>
  <wd-toast />
  <view class="home-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
        <!-- 返回按钮 -->
        <view class="nav-back-btn" @click="handleBack">
          <image class="back-icon"  mode="aspectFit" />
        </view>
        <text class="nav-title">{{ $t('index.my_agents') }}</text>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <view class="content-area">

      <!-- 智能体列表区域 -->
      <view  class="agent-list-container">
        <!-- 统一的智能体列表 -->
        <view class="agent-list">
          <AgentCard
              v-for="agent in agentList"
              :key="agent.id"
              :agent="agent"
              :swipable="agent.userId === userStore.userId"
              @click="handleAgentClick(agent)"
              @delete="handleAgentDelete" />
        </view>

        <!-- 如果列表为空但仍在渲染（理论上被外部 v-else-if 挡住，但为了保险） -->
        <view class="empty-state" v-if="agentList.length === 0">
          <view class="empty-content">
            <image class="empty-icon" src="@/img/baize.png" mode="aspectFit"></image>
            <view class="empty-text">
              <view class="empty-title">{{ $t('index.no_agents') }}</view>
              <view class="empty-desc">{{ $t('index.no_agents_desc') }}</view>
            </view>
          </view>
          <view class="empty-btn primary" @click="handleCreateAgent">
            <image class="empty-btn-icon" src="/static/icons/add.svg" mode="aspectFit"></image>
            <text class="empty-btn-text">{{ $t('create_agent.create') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 设备绑定抽屉 -->
    <AgentBindDrawer
        :visible="showBindDrawer"
        :agent="selectedAgent"
        :configAble="userStore.userId === selectedAgent?.userId"
        @update:visible="showBindDrawer = $event"
        @success="handleBindSuccess"
        @error="handleBindError"
        @cancel="handleBindCancel" />

    <!-- 浮动创建按钮（有智能体时显示，滚动时收起） -->
    <view
        class="fab-btn"
        :class="{ 'fab-collapsed': isScrolling }"
        v-if="agentList.length > 0"
        @click="handleCreateAgent">
      <image class="fab-btn-icon" src="/static/icons/add.svg" mode="aspectFit"></image>
      <text class="fab-btn-text">{{ $t('create_agent.create') }}</text>
    </view>

    <!-- 自定义 TabBar -->
    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import { onLoad, onShow, onPageScroll } from '@dcloudio/uni-app';
import { Agent } from './types';
import { useUserStore } from '@/store';
import { useDeviceScan } from '@/utils/useDeviceScan';
import AgentCard from '@/components/AgentCard.vue';
import AgentBindDrawer from '@/components/AgentBindDrawer.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { isRequestHandledError } from '@/utils/request-feedback';

defineOptions({
  name: 'Home'
});

const { t: $t, locale } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);
const { showNotify, closeNotify } = useNotify();

// 使用用户store
const userStore = useUserStore();

// 响应式数据
const agentList = ref<Agent[]>([]);
const showBindDrawer = ref(false);
const selectedAgent = ref<Agent | null>(null);
const loading = ref(false);
const isScrolling = ref(false);
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
const PENDING_BIND_KEY = 'pendingBindAction';
type PendingBindAction = 'qrcode' | 'bluetooth';

// 导航栏高度相关
const statusBarHeight = ref<number>(20);
const navBarHeight = ref<number>(44);

// 生命周期钩子
function updateNavigationTitle() {
  // 不再需要设置原生导航栏标题
}

onLoad(async () => {
  // #ifndef MP-WEIXIN
  // App 端：未登录时跳转登录页
  if (!userStore.isLoggedIn) {
    uni.redirectTo({
      url: PageMap[Pages.Login].url
    });
    return;
  }
  // #endif
  await loadAgentList(true);
  setStatusBarHeight();
  updateNavigationTitle();
});

onShow(() => {
  showBindDrawer.value = false;
  loadAgentList(false);
  updateNavigationTitle();
  // 隐藏系统 TabBar（解决微信小程序 iOS 双重导航栏问题）
  uni.hideTabBar({ animation: false });
});

watch(
    () => locale.value,
    () => {
      updateNavigationTitle();
    }
);

// 页面滚动监听（用于控制 FAB 按钮收起/展开）
onPageScroll((e: { scrollTop: number }) => {
  handleScroll(e);
});

// onShareAppMessage(() => {
//   console.log('page share');
//   return {
//     title: '分享标题',
//     path: '/pages/index/index'
//   };
// });

async function loadAgentList(showLoading = false) {
  if (showLoading) {
    loading.value = true;
  }

  try {
    const result = await agentApi.getRelatedAgents();

    if (result.code === 1000 && result.data) {
      agentList.value = result.data || [];
    } else {
      agentList.value = [];
      console.warn('获取智能体列表失败', result.message);
    }
  } catch (error) {
    console.error('加载智能体列表失败', error);
    agentList.value = [];
    // 不再显示toast，因为 request.ts 已经处理
  } finally {
    if (showLoading) {
      loading.value = false;
    }
  }
}

// 滚动处理函数
function handleScroll(e: { scrollTop: number }) {
  // 开始滚动时，收起按钮
  isScrolling.value = true;

  // 清除之前的定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer);
  }

  // 停止滚动后 300ms 恢复按钮
  scrollTimer = setTimeout(() => {
    isScrolling.value = false;
  }, 300);
}

function handleBack() {
  uni.switchTab({
    url: '/pages/square/super_square'
  });
}

function setStatusBarHeight() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 20;
  const isAndroid = systemInfo.platform === 'android';
  try {
    const menuButtonInfo =
        typeof uni.getMenuButtonBoundingClientRect === 'function'
            ? uni.getMenuButtonBoundingClientRect()
            : null;
    if (menuButtonInfo && menuButtonInfo.height) {
      const topGap = menuButtonInfo.top - statusBarHeight.value;
      navBarHeight.value = menuButtonInfo.height + Math.max(topGap, 0) * 2;
    } else {
      navBarHeight.value = isAndroid ? 48 : 44;
    }
  } catch (error) {
    navBarHeight.value = isAndroid ? 48 : 44;
  }
}

function handleAgentClick(agent: Agent) {
  selectedAgent.value = agent;
  showBindDrawer.value = true;
}

function handleCreateAgent() {
  uni.navigateTo({
    url: PageMap[Pages.AgentCreate].url
  });
}

function handleBindSuccess(data: any) {
  toast.success({
    msg: $t('index.bind_success'),
    duration: 2000,
    zIndex: 2005
  });
  showBindDrawer.value = false;
  console.log('设备绑定成功 index', data);
  loadAgentList(false);
}

function handleBindError(data: any) {
  console.error('绑定失败:', data);
  if (data?.handledByRequest) {
    return;
  }

  toast.warning({
    msg: data?.message || $t('index.operation_failed'),
    duration: 2000,
    zIndex: 2005
  });
}

function handleBindCancel() {
  showBindDrawer.value = false;
}

function handleAgentDelete(agent: Agent) {
  // 直接执行删除，确认弹窗已在 AgentCard 组件中处理
  agentApi
      .deleteAgent(agent.agentId)
      .then(async (res: any) => {
        if (res.code === 1000) {
          toast.success({
            msg: $t('common.delete_success'),
            duration: 2000
          });
          await loadAgentList(false); // 刷新智能体列表
        } else if (res.code === 1001) {
          toast.warning({
            msg: `${$t('common.failed_with_message')}: ${res.message || res.errMsg}`,
            duration: 2000
          });
        } else {
          toast.error({
            msg: res.message || $t('common.delete_failed'),
            duration: 2000
          });
        }
      })
      .catch((err: any) => {
        console.error('删除失败:', err);
        if (!isRequestHandledError(err)) {
          toast.error({
            msg: `${$t('common.delete_failed_with_message')}: ${err.message || err.errMsg}`,
            duration: 2000
          });
        }
      });
}

const { scanAndBind } = useDeviceScan({ toast, showNotify, closeNotify });

// 判断用户是否真正登录（有有效token且有真实用户信息）
function isUserAuthenticated(): boolean {
  return userStore.isLoggedIn && userStore.userId > 0;
}

// 校验登录状态，未登录则记录待执行动作并跳转登录页（仅小程序端校验）
function requireLoginForBind(action: PendingBindAction): boolean {
  // #ifdef MP-WEIXIN
  if (!isUserAuthenticated()) {
    uni.setStorageSync(PENDING_BIND_KEY, action);
    uni.navigateTo({
      url: PageMap[Pages.Login].url
    });
    return false;
  }
  // #endif
  return true;
}

async function handleStartSetup() {
  if (!requireLoginForBind('qrcode')) {
    return;
  }
  await scanAndBind({ fromAddDevice: true });
}

function handleBluetoothSetup() {
  if (!requireLoginForBind('bluetooth')) {
    return;
  }
  uni.navigateTo({
    url: PageMap[Pages.BluetoothConfig].url + '?fromAddDevice=1'
  });
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.custom-navbar {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: transparent;
  flex-shrink: 0;
}

.status-bar {
  height: 0;
}

.nav-content {
  min-height: 88rpx;
  padding: 16rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.nav-back-btn {
  position: absolute;
  left: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  cursor: pointer;
}

.back-icon {
  width: 32rpx;
  height: 32rpx;
  transform: rotate(180deg);
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.nav-back-btn:active .back-icon {
  opacity: 1;
}
.back-icon {
  width: 24rpx;
  height: 24rpx;
  border-left: 4rpx solid #000;
  border-bottom: 4rpx solid #000;
  transform: rotate(45deg);
}


.nav-title {
  font-size: 18px;
  font-weight: 500;
  color: #0f172a;
  white-space: pre-line;
  text-align: center;
  line-height: 1.2;
}

.content-area {
  flex: 1;
  padding-bottom: calc(max(160rpx, 110rpx + env(safe-area-inset-bottom)));
}

.agent-list-container {
  width: 100%;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #222530;
  margin: 16px 16px 20px 16px;
  text-align: center;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 0px;
  padding-bottom: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0px;
  gap: 120px;
  width: 358px;
  height: 258px;
  margin: 0 auto;
  margin-top: 154px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0px;
  gap: 16px;
  width: 358px;
  height: 180px;
  flex: none;
  order: 0;
  align-self: stretch;
  flex-grow: 0;
}

.empty-icon {
  width: 220px;
  height: 220px;
  flex: none;
  order: 0;
  flex-grow: 0;
}

.empty-text {
  width: 358px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: none;
  order: 1;
  align-self: stretch;
  flex-grow: 0;
}

.empty-title {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: #60718b;
}

.empty-desc {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: #60718b;
}

.empty-btn {
  min-width: 96px;
  height: 54px;
  border-radius: 12px;
  padding: 16px 19px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #10b981;
  box-shadow: 0 4px 12px var(--color-primary-alpha-25);
  box-sizing: border-box;
  transition: all 0.2s ease;
  flex: none;
  order: 1;
  flex-grow: 0;
}

.empty-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.empty-btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.empty-btn-text {
  height: 22px;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 22px;
  color: #ffffff;
  white-space: nowrap;
  flex: none;
  order: 1;
  flex-grow: 0;
}

/* 浮动创建按钮（FAB） */
.fab-btn {
  position: fixed;
  right: 24px;
  /* 设计稿：距离 tab bar 顶部 24px，tab bar 高度约 98px */
  bottom: calc(98px + 24px + env(safe-area-inset-bottom));
  min-width: 54px;
  height: 54px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 19px;
  background: #10b981;
  border-radius: 12px;
  box-sizing: border-box;
  z-index: 998;
  box-shadow: 0 4px 12px var(--color-primary-alpha-25);
  transition:
      all 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.15s ease;
  overflow: hidden;
}

/* 滚动时收起为圆形图标按钮 */
.fab-btn.fab-collapsed {
  width: 54px;
  padding: 16px;
  gap: 0;
}

.fab-btn:active {
  transform: scale(0.95);
}

.fab-btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-btn.fab-collapsed .fab-btn-icon {
  transform: scale(1.1);
}

.fab-btn-text {
  height: 22px;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 22px;
  color: #ffffff;
  white-space: nowrap;
  opacity: 1;
  transition:
      opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 收起时隐藏文字 */
.fab-btn.fab-collapsed .fab-btn-text {
  opacity: 0;
  max-width: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 36px;
  text-align: center;
}

.loading-text {
  font-size: 16px;
  color: #8b8e9a;
  line-height: 1.5;
}

/* 空状态页面 - 没有智能体时显示 */
.empty-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 40px 20px;
  text-align: center;
}

.empty-page-icon {
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.empty-page-title {
  font-size: 18px;
  font-weight: 600;
  color: #222530;
  margin-bottom: 8px;
}

.empty-page-desc {
  font-size: 14px;
  color: #8b8e9a;
  line-height: 1.5;
}

.template-grid {
  padding: 16px;
}

.template-hint {
  font-size: 16px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.4;
}
</style>
