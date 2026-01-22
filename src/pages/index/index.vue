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
      <view v-else>
        <!-- 有智能体时显示列表 -->
        <view v-if="agentList.length > 0">
          <!-- AI生成内容合规提示 -->
          <view class="ai-disclaimer">
            <text class="ai-disclaimer-text">{{ $t('index.ai_generated_disclaimer') }}</text>
          </view>
          
          <!-- 创建智能体按钮 -->
          <view class="create-agent-wrapper">
            <view class="create-agent-btn" @click="handleCreateAgent">
              <image class="create-agent-icon" src="/static/icons/add-dark.svg" mode="aspectFit" />
              <text class="create-agent-text">{{ $t('index.create_agent') }}</text>
            </view>
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
        </view>

        <!-- 空状态 - 没有智能体时显示 -->
        <view v-else>
          <!-- AI生成内容合规提示 -->
          <view class="ai-disclaimer">
            <text class="ai-disclaimer-text">{{ $t('index.ai_generated_disclaimer') }}</text>
          </view>
          
          <view class="empty-state">
            <view class="empty-content">
              <view class="empty-icon-wrapper">
                <image class="empty-icon" src="/static/icons/agent-icon.png" mode="aspectFit"></image>
              </view>
              <view class="empty-text-wrapper">
                <view class="empty-title">{{ $t('index.no_agents') }}</view>
                <view class="empty-desc">{{ $t('index.no_agents_desc') }}</view>
              </view>
            </view>
            <!-- 创建智能体按钮 -->
            <view class="create-agent-wrapper">
              <view class="create-agent-btn" @click="handleCreateAgent">
                <image class="create-agent-icon" src="/static/icons/add-dark.svg" mode="aspectFit" />
                <text class="create-agent-text">{{ $t('index.create_agent') }}</text>
              </view>
            </view>
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

    <!-- 没有设备时的引导弹窗 -->
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
            <view class="welcome-skip" @click="handleSkipSetup">
              {{ $t('welcome.skip_for_now') }}
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
            <view class="welcome-skip-single" @click="handleSkipSetup">
              {{ $t('welcome.skip_for_now') }}
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- 自定义 TabBar -->
    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi, deviceApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import { onLoad, onShow } from '@dcloudio/uni-app';
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
const isDev = process.env.NODE_ENV === 'development';
const showWelcomeGuide = ref(false);
const setupMode = APP_CONFIG.APP_SETUP_MODE || 'both';
let isCheckingDevice = false;

// 生命周期钩子
function updateNavigationTitle() {
  uni.setNavigationBarTitle({ title: $t('index.my_agents') });
}

onLoad(async () => {
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
  if (!userStore.isLoggedIn) {
    showWelcomeGuide.value = false;
    return;
  }

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



function handleAgentClick(agent: Agent) {
  selectedAgent.value = agent;
  showBindDrawer.value = true;
}



function handleCreateAgent() {
  // 创建页面是 tabBar 页面，使用 switchTab 跳转
  uni.switchTab({
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
  uni.showModal({
    title: $t('common.confirm_delete'),
    content: `${$t('index.confirm_delete_agent')} ${agent.agentName}?`,
    success: (res) => {
      if (res.confirm) {
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
    }
  });
}

const { scanAndBind } = useDeviceScan({ toast, showNotify, closeNotify });

async function handleStartSetup() {
  await scanAndBind({
    onScanSuccess: () => {
      showWelcomeGuide.value = false;
    }
  });
}

function handleBluetoothSetup() {
  uni.navigateTo({
    url: PageMap[Pages.BluetoothConfig].url
  });
}

function handleSkipSetup() {
  // 用户选择跳过，隐藏引导
  showWelcomeGuide.value = false;
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

.ai-disclaimer {
  padding: 8px 16px;
  background-color: #F3F4F7;
}

.ai-disclaimer-text {
  font-size: 13px;
  color: #98A5B8;
  line-height: 20px;
}

.create-agent-wrapper {
  padding: 16px 20px;
  background: #ffffff;
}

.create-agent-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  gap: 4px;
  height: 40px;
  background: #F3F4F7;
  border-radius: 8px;
  box-sizing: border-box;
}

.create-agent-btn:active {
  opacity: 0.7;
}

.create-agent-icon {
  width: 16px;
  height: 16px;
}

.create-agent-text {
  font-weight: 500;
  font-size: 14px;
  line-height: 22px;
  color: #212730;
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
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  gap: 20px;
  padding-top: 160px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  gap: 16px;
  width: 358px;
  height: 180px;
  max-width: 100%;
  box-sizing: border-box;
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.empty-icon {
  width: 97px;
  height: 95px;
}

.empty-text-wrapper {
  width: 358px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: none;
}

.empty-title {
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: #60718B;
}

.empty-desc {
  font-weight: 400;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: #60718B;
}

.empty-state .create-agent-wrapper {
  width: 100%;
  max-width: 390px;
}

.empty-state .create-agent-btn {
  width: 350px;
  max-width: calc(100% - 40px);
  margin: 0 auto;
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
