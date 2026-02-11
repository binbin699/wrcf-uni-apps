<template>
  <wd-toast />
  <view class="home-container">
    <!-- 主要内容区域 -->
    <view class="content-area">
      <!-- 加载状态 -->
      <view class="loading-state" v-if="loading">
        <view class="loading-text">{{ $t('index.loading') }}</view>
      </view>

      <!-- 智能体列表区域 -->
      <view v-else class="agent-list-container">
        <!-- AI生成内容合规提示 -->
        <view class="ai-disclaimer">
          <text class="ai-disclaimer-text">{{ $t('index.ai_generated_disclaimer') }}</text>
        </view>
        
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
            <image class="empty-icon" src="/static/icons/agent-icon.png" mode="aspectFit"></image>
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
      :templateAble="selectedAgent?.isTemplate"
      @update:visible="showBindDrawer = $event"
      @success="handleBindSuccess"
      @error="handleBindError"
      @cancel="handleBindCancel" />

    <!-- 没有设备时的引导弹窗；测试阶段 isDev 时无论有无设备都先显示 -->
    <view v-if="showWelcomeGuide" class="welcome-overlay" :class="{ 'is-single': setupMode !== 'both' }">
      <view class="welcome-popup">
        <!-- 两种模式并行 (默认) -->
        <view v-if="setupMode === 'both'" class="welcome-content">
          <view class="welcome-title">{{ $t('welcome.guide_title') }}</view>
          <view class="welcome-actions">
            <view class="welcome-setup-options">
              <view class="welcome-setup-card" @click="handleStartSetup">
                <view class="welcome-setup-icon-wrapper qr">
                  <image class="welcome-setup-icon" src="/static/icons/scan-qrcode.svg" mode="aspectFit" />
                </view>
                <text class="welcome-setup-text">{{ $t('welcome.setup_qrcode') }}</text>
              </view>
              <view class="welcome-setup-card" @click="handleBluetoothSetup">
                <view class="welcome-setup-icon-wrapper bluetooth">
                  <image class="welcome-setup-icon" src="/static/icons/bluetooth.svg" mode="aspectFit" />
                </view>
                <text class="welcome-setup-text">{{ $t('welcome.setup_bluetooth') }}</text>
              </view>
            </view>
            <!-- #ifndef MP-WEIXIN -->
            <view class="welcome-help-link" @click="handleHelpClick">
              <text>{{ $t('profile.instructions_tutorials') }}</text>
            </view>
            <!-- #endif -->
            <view class="welcome-skip" @click="handleSkipSetup">
              <!-- #ifdef MP-WEIXIN -->
              {{ $t('welcome.skip_and_browse') }}
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              {{ $t('welcome.skip_for_now') }}
              <!-- #endif -->
            </view>
          </view>
        </view>

        <!-- 单个模式 (扫码或蓝牙) -->
        <view v-else class="welcome-content-single">
          <view class="welcome-icon-wrapper single" :class="setupMode">
            <image
              v-if="setupMode === 'qrcode'"
              class="welcome-setup-icon-large"
              src="/static/icons/scan-qrcode.svg"
              mode="aspectFit" />
            <image
              v-else
              class="welcome-setup-icon-large"
              src="/static/icons/bluetooth.svg"
              mode="aspectFit" />
          </view>
          <view class="welcome-title-single">{{ $t('welcome.guide_title') }}</view>
          <view class="welcome-actions-single">
            <view
              class="welcome-primary-btn"
              @click="setupMode === 'qrcode' ? handleStartSetup() : handleBluetoothSetup()">
              {{ setupMode === 'qrcode' ? $t('welcome.setup_qrcode') : $t('welcome.setup_bluetooth') }}
            </view>
            <!-- #ifndef MP-WEIXIN -->
            <view class="welcome-help-link single-mode" @click="handleHelpClick">
              <text>{{ $t('profile.instructions_tutorials') }}</text>
            </view>
            <!-- #endif -->
            <view class="welcome-skip-single" @click="handleSkipSetup">
              <!-- #ifdef MP-WEIXIN -->
              {{ $t('welcome.skip_and_browse') }}
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              {{ $t('welcome.skip_for_now') }}
              <!-- #endif -->
            </view>
          </view>
        </view>
      </view>
    </view>
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
import { agentApi, deviceApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import { onLoad, onShow, onPageScroll } from '@dcloudio/uni-app';
import { Agent } from './types';
import { useUserStore } from '@/store';
import { updateSquareTabBadge } from '@/utils/tabBarBadge';
import { useDeviceScan } from '@/utils/useDeviceScan';
import AgentCard from '@/components/AgentCard.vue';
import AgentBindDrawer from '@/components/AgentBindDrawer.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';

defineOptions({
  name: 'Home'
});

const { t: $t, locale } = useI18n();
const toast = useToast();
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
const isDev = process.env.NODE_ENV === 'development';
const showWelcomeGuide = ref(false);
const setupMode = APP_CONFIG.APP_SETUP_MODE || 'both';
let isCheckingDevice = false;
const PENDING_BIND_KEY = 'pendingBindAction';
type PendingBindAction = 'qrcode' | 'bluetooth';

// 生命周期钩子
function updateNavigationTitle() {
  uni.setNavigationBarTitle({ title: $t('index.my_agents') });
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
  await checkDeviceBinding();
  updateNavigationTitle();
});

onShow(() => {
  showBindDrawer.value = false;
  loadAgentList(false);
  checkDeviceBinding();
  updateNavigationTitle();
  updateSquareTabBadge();
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

async function checkDeviceBinding() {
  // #ifdef MP-WEIXIN
  // 小程序端：已有专门的落地页，index 页面不显示引导弹窗
  showWelcomeGuide.value = false;
  return;
  // #endif

  // #ifndef MP-WEIXIN
  // 非小程序端：未登录时不显示引导弹窗
  if (!userStore.isLoggedIn) {
    showWelcomeGuide.value = false;
    return;
  }
  // #endif

  if (isCheckingDevice) {
    return;
  }

  isCheckingDevice = true;
  try {
    const result = await deviceApi.getList();
    if (result?.code === 1000) {
      const devices = Array.isArray(result.data) ? result.data : [];
      showWelcomeGuide.value = devices.length === 0;
    } else {
      showWelcomeGuide.value = false;
      console.warn('获取设备列表失败:', result?.message);
    }
  } catch (error) {
    console.error('检查设备绑定状态失败', error);
    showWelcomeGuide.value = false;
  } finally {
    isCheckingDevice = false;
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
  toast.error({
    msg: data.message || $t('index.operation_failed'),
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
      toast.error({
        msg: `${$t('common.delete_failed_with_message')}: ${err.message || err.errMsg}`,
        duration: 2000
      });
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
  await scanAndBind({
    onScanSuccess: () => {
      showWelcomeGuide.value = false;
    }
  });
}

function handleBluetoothSetup() {
  if (!requireLoginForBind('bluetooth')) {
    return;
  }
  uni.navigateTo({
    url: PageMap[Pages.BluetoothConfig].url
  });
}

async function handleSkipSetup() {
  // #ifdef MP-WEIXIN
  // 小程序端：未登录时触发游客登录
  if (!isUserAuthenticated()) {
    toast.loading({ msg: '', cover: true });
    try {
      const success = await userStore.guestLogin();
      toast.close();
      if (success) {
        showWelcomeGuide.value = false;
        loadAgentList(false);
      }
    } catch (error) {
      toast.close();
      console.error('游客登录失败:', error);
    }
    return;
  }
  // #endif
  // 已登录时直接隐藏引导
  showWelcomeGuide.value = false;
}

function handleHelpClick() {
  uni.navigateTo({
    url: '/pages/profile/help'
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

.content-area {
  flex: 1;
  padding-bottom: calc(max(160rpx, 110rpx + env(safe-area-inset-bottom)));
}

.agent-list-container {
  width: 100%;
}

.ai-disclaimer {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8px 16px;
  gap: 10px;
  width: 100%;
  height: 36px;
  background: #F3F4F7;
  box-sizing: border-box;
}

.ai-disclaimer-text {
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 20px;
  display: flex;
  align-items: center;
  text-align: center;
  color: #98A5B8;
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
  gap: 24px;
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
  width: 120px;
  height: 120px;
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
  color: #60718B;
}

.empty-desc {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: #60718B;
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
  background: #3E5CEE;
  box-shadow: 0 4px 12px rgba(62, 92, 238, 0.3);
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
  color: #FFFFFF;
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
  background: #3E5CEE;
  border-radius: 12px;
  box-sizing: border-box;
  z-index: 998;
  box-shadow: 0 4px 12px rgba(62, 92, 238, 0.3);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
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
  color: #FFFFFF;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
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

.welcome-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding-bottom: 160rpx;
}

.welcome-popup {
  width: calc(100% - 120rpx);
  max-width: 640rpx;
}

.welcome-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 36rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 28rpx 72rpx rgba(37, 99, 235, 0.22);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  white-space: pre-line;
  text-align: center;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.welcome-setup-options {
  display: flex;
  width: 100%;
  gap: 24rpx;
  justify-content: center;
}

.welcome-setup-card {
  flex: 1;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  transition: all 0.2s ease;
  border: 1rpx solid #f1f5f9;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.welcome-setup-card:active {
  transform: scale(0.96);
  background: #f8fafc;
}

.welcome-setup-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
}

.welcome-setup-icon-wrapper.qr {
  background: linear-gradient(135deg, #10b981, #059669);
}

.welcome-setup-icon-wrapper.bluetooth {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.welcome-setup-icon {
  width: 48rpx;
  height: 48rpx;
}

.welcome-setup-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #334155;
}

/* 说明与教程链接样式 */
.welcome-help-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx 40rpx 8rpx;
  margin-top: 16rpx;
  color: #3b82f6;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.2s ease;
}

.welcome-help-link:active {
  opacity: 0.7;
}

.welcome-help-link.single-mode {
  margin-top: 8rpx;
  margin-bottom: 8rpx;
}

.welcome-help-icon {
  width: 32rpx;
  height: 32rpx;
}

.welcome-skip {
  color: #94a3b8;
  font-size: 26rpx;
  padding: 10rpx 40rpx;
}

/* 单个按钮布局样式 (来自 fork) */
.welcome-content-single {
  background: #ffffff;
  border-radius: 48rpx;
  padding: 80rpx 48rpx 60rpx;
  box-shadow: 0 32rpx 80rpx rgba(37, 99, 235, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-icon-wrapper.single {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 16rpx 32rpx rgba(0, 0, 0, 0.1);
}

.welcome-icon-wrapper.single.qrcode {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 16rpx 32rpx rgba(16, 185, 129, 0.25);
}

.welcome-icon-wrapper.single.bluetooth {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 16rpx 32rpx rgba(59, 130, 246, 0.25);
}

.welcome-setup-icon-large {
  width: 72rpx;
  height: 72rpx;
}

.welcome-title-single {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  white-space: pre-line;
  text-align: center;
  margin-bottom: 60rpx;
}

.welcome-actions-single {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-primary-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #ffffff;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 12rpx 24rpx rgba(37, 99, 235, 0.25);
  margin-bottom: 32rpx;
  transition: all 0.2s ease;
}

.welcome-primary-btn:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.welcome-skip-single {
  color: #94a3b8;
  font-size: 28rpx;
  padding: 10rpx 40rpx;
}

</style>
