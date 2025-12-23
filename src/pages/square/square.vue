<template>
  <wd-toast />
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
        <text class="nav-title">{{ $t('square.title') }}</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content-scroll" scroll-y="true">
      <!-- 搜索框 -->
      <view class="search-container">
        <view class="search-box">
          <input
            class="search-input"
            :placeholder="$t('square.search')"
            v-model="searchKeyword"
            @input="onSearchInput" />
        </view>
      </view>

      <!-- 标签分类 -->
      <view class="tag-container">
        <scroll-view class="tag-scroll" scroll-x="true" show-scrollbar="false">
          <view class="tag-list">
            <view
              v-for="tag in modelTags"
              :key="tag.id"
              class="tag-item"
              :class="{ active: selectedTag === tag.id }"
              @click="selectTag(tag.id)">
              {{ tag.name }}
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="agent-list">
        <view
          v-for="(agent, index) in filteredAgents"
          :key="agent.id"
          class="agent-card"
          :style="{ zIndex: isSquareBindGuideActive && index === 0 ? 10 : 1 }">
          <view class="agent-info">
            <view class="agent-name">{{ agent.name }}</view>
            <view class="agent-description">{{ agent.description }}</view>
            <view class="agent-actions">
              <view class="left-content">
                <view class="agent-tag">
                  <text class="tag-text">{{ getAgentTag(agent) }}</text>
                </view>
              </view>
              <view class="right-content" :class="{ 'guide-highlight-wrapper': isSquareBindGuideActive && index === 0 }">
                <button
                  class="config-btn primary"
                  :class="{ 'guide-highlight': isSquareBindGuideActive && index === 0, 'guide-pulse': isSquareBindGuideActive && index === 0 }"
                  @click="handleGuideBindClick(agent, index)">
                  <image src="/static/icons/setting.svg" alt="" class="btn-icon" />
                  <text class="btn-text">{{ $t('square.bind_device') }}</text>
                </button>
                <view
                  v-if="isSquareBindGuideActive && index === 0"
                  class="square-guide-tooltip"
                  @click.stop>
                  <text class="square-guide-tooltip-text">{{ $t('guide.square_highlight_tip') }}</text>
                  <view class="square-guide-tooltip-actions">
                    <view class="square-guide-tooltip-skip" @click.stop="skipSquareBindGuide">
                      {{ $t('guide.square_highlight_skip') }}
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">
        <text>{{ $t('common.loading') }}</text>
      </view>

      <view v-if="!loading && filteredAgents.length === 0" class="empty">
        <image class="empty-icon" src="/static/icons/box.svg" mode="aspectFit"></image>
        <text class="empty-text">
          {{ publicAgents.length === 0 ? $t('square.no_agents') : $t('square.no_search_results') }}
        </text>
      </view>
    </scroll-view>

    <!-- 设备绑定抽屉 -->
    <AgentBindDrawer
      :visible="showBindDrawer"
      :agent="selectedAgent"
      @update:visible="showBindDrawer = $event"
      @success="handleBindSuccess"
      @error="handleBindError"
      @cancel="handleBindCancel" />

    <view v-if="showSquareGuidePrompt" class="square-guide-popup" @click.stop>
      <view class="square-guide-content">
        <view class="square-guide-title">{{ $t('guide.square_prompt_title') }}</view>
        <view class="square-guide-desc">{{ $t('guide.square_prompt_desc') }}</view>
        <view class="square-guide-actions">
          <view class="square-guide-action" @click.stop="startSquareBindGuide">
            {{ $t('guide.square_prompt_action') }}
          </view>
          <view class="square-guide-skip" @click.stop="skipSquareBindGuide">
            {{ $t('guide.square_prompt_skip') }}
          </view>
        </view>
      </view>
    </view>
    
    <!-- 自定义 TabBar -->
    <CustomTabBar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onShow } from '@dcloudio/uni-app';
// @ts-ignore
import { agentApi, deviceApi } from '../../api/index.js';
import AgentBindDrawer from '../../components/AgentBindDrawer.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { Agent } from '../index/types.js';
import { Device } from '../device/types.js';
import { completeSquareBindGuide } from '@/utils/userGuide';
import { updateSquareTabBadge } from '@/utils/tabBarBadge';

type SquareAgent = Agent & {
  name: string;
  description: string;
  voiceName: string;
  creatorName: string;
  modalTag: string;
};

const { t: $t } = useI18n();
const toast = useToast();

// 响应式数据
const publicAgents = ref<SquareAgent[]>([]);
const showBindDrawer = ref<boolean>(false);
const selectedAgent = ref<SquareAgent | null>(null);
const loading = ref<boolean>(false);
const selectedDevice = ref<any>(null);
const searchKeyword = ref<string>('');
const selectedTag = ref<string>('all');
const statusBarHeight = ref<number>(20);
const navBarHeight = ref<number>(44);
const showSquareGuidePrompt = ref<boolean>(false);
const isSquareBindGuideActive = ref<boolean>(false);
const pendingGuideActivation = ref<boolean>(false);

const modelTags = computed(() => {
  let tags = [{ id: 'all', name: $t('square.all') }];
  
  // 定义所有可能的模型标签
  const allModelTags = [
    { id: 'gpt4', name: $t('square.model.gpt4') },
    { id: 'gpt5', name: $t('square.model.gpt5') },
    { id: 'gpt-oss', name: $t('square.model.gpt-oss') },
    { id: 'qwen', name: $t('square.model.qwen') },
    { id: 'deepseek-v3', name: $t('square.model.deepseek-v3') },
    { id: 'deepseek', name: $t('square.model.deepseek') }
  ];

  // 获取所有 agent 的 modalTag 集合
  const existingModalTags = new Set();
  publicAgents.value.forEach(agent => {
    if (agent.modalTag) {
      existingModalTags.add(agent.modalTag);
    }
  });

  // 只添加有对应 agent 的标签
  allModelTags.forEach(tag => {
    if (existingModalTags.has(tag.id)) {
      tags.push(tag);
    }
  });

  return tags;
});
// 计算属性
const filteredAgents = computed(() => {
  let filtered = publicAgents.value;
  // console.log("pub agents", publicAgents.value);
  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    filtered = filtered.filter(
      (agent) =>
        agent.name.toLowerCase().includes(keyword) ||
        (agent.description && agent.description.toLowerCase().includes(keyword))
    );
  }

  // 标签过滤
  if (selectedTag.value !== 'all') {
    filtered = filtered.filter((agent) => {
      const modalTag = agent.modalTag || '';
      return modalTag === selectedTag.value;
    });
  }

  return filtered;
});

watch(
  filteredAgents,
  (agents) => {
    if (pendingGuideActivation.value && agents.length > 0) {
      isSquareBindGuideActive.value = true;
      pendingGuideActivation.value = false;
    }
  },
  { immediate: true }
);

async function refreshSquareGuideState() {
  try {
    // 检查是否有未绑定智能体的设备
    const result = await deviceApi.getList();
    if (result.code === 1000 && Array.isArray(result.data)) {
      const hasUnboundDevice = result.data.some((device: any) => !device.agentName);
      if (hasUnboundDevice) {
        if (!isSquareBindGuideActive.value) {
          showSquareGuidePrompt.value = true;
        }
        return;
      }
    }
  } catch (error) {
    console.warn('[refreshSquareGuideState] 获取设备列表失败:', error);
  }
  // 没有未绑定设备，隐藏引导
  showSquareGuidePrompt.value = false;
  isSquareBindGuideActive.value = false;
  pendingGuideActivation.value = false;
}

function startSquareBindGuide() {
  showSquareGuidePrompt.value = false;
  if (filteredAgents.value.length > 0) {
    isSquareBindGuideActive.value = true;
  } else {
    pendingGuideActivation.value = true;
  }
}

function skipSquareBindGuide() {
  showSquareGuidePrompt.value = false;
  if (isSquareBindGuideActive.value) {
    isSquareBindGuideActive.value = false;
    pendingGuideActivation.value = false;
  }
}

// 生命周期钩子
onLoad(() => {
  loadPublicAgents();
  setStatusBarHeight();
});

onShow(() => {
  showBindDrawer.value = false;
  // 页面显示时刷新数据
  loadPublicAgents();
  refreshSquareGuideState();
  updateSquareTabBadge();
  // #ifdef APP-PLUS
  uni.hideTabBar({ animation: false });
  // #endif
});

// 方法
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

async function loadPublicAgents() {
  try {
    loading.value = true;
    const res = await agentApi.getPublicAgents();
    // console.log(" 获取公开助手:", res);
    if (res.code === 1000) {
      // 定义模型关键词映射
      const modalKeyword = {
        gpt4: ['gpt4', 'gpt-4'],
        gpt5: ['gpt5', 'gpt-5'],
        'gpt-oss': ['gpt-oss'],
        qwen: ['qwen', '通义千问'],
        'deepseek-v3': ['deepseek-v3'],
        deepseek: ['deepseek']
      };

      // 处理后端返回的数据结构
      publicAgents.value = (res.data || []).map((agent: Agent) => {
        const llmModelName = agent.config?.llmModelName?.toLowerCase() || '';
        let modalTag = '';

        // 检查 llmModelName 是否包含某个 modalKeyword，并设置对应的 modalTag
        for (const [modalType, keywords] of Object.entries(modalKeyword)) {
          const hasKeyword = keywords.some((keyword) =>
            llmModelName.includes(keyword.toLowerCase())
          );

          if (hasKeyword) {
            modalTag = modalType;
            break;
          }
        }

        return {
          ...agent,
          id: agent.id,
          name: agent.agentName,
          description:
            agent.description || agent.config?.systemPrompt || $t('square.no_description'),
          voiceName: agent.config?.voiceName || $t('square.default'),
          creatorName: agent.userName || $t('square.anonymous'),
          agentId: agent.agentId,
          modalTag: modalTag
        } as SquareAgent;
      });
    } else {
      console.warn('获取公开助手失败:', res.message);
    }
  } catch (error) {
    console.error('获取公开助手失败:', error);
    // 不再显示toast，因为request.ts已经处理了
  } finally {
    loading.value = false;
    refreshSquareGuideState();
  }
}

function onSearchInput() {
  // 搜索输入处理，computed会自动更新filteredAgents
}

function selectTag(tagId: string) {
  selectedTag.value = tagId;
}

function getModelTagFromName(llmModelName: string) {
  if (!llmModelName) return 'all';
  return llmModelName;
}

function getAgentTag(agent: SquareAgent) {
  // todo
  // 根据智能体名称返回相应的标签
  const name = agent.name.toLowerCase();
  if (name === '嘟嘟熊') {
    return $t('square.ai_toy');
  }

  return $t('square.ai_assistant');
}

function showBindPopup(agent: SquareAgent) {
  selectedAgent.value = agent;
  selectedDevice.value = null;
  showBindDrawer.value = true;
}

function handleGuideBindClick(agent: SquareAgent, index: number) {
  if (isSquareBindGuideActive.value && index !== 0) {
    isSquareBindGuideActive.value = false;
    pendingGuideActivation.value = false;
  }
  showBindPopup(agent);
}

function hideBindPopup() {
  showBindDrawer.value = false;
  selectedAgent.value = null;
  selectedDevice.value = null;
}

function selectDevice(device: Device) {
  selectedDevice.value = device;
}

async function bindAgentToDevice() {
  if (!selectedAgent.value || !selectedDevice.value) {
    return;
  }

  try {
    const res = await agentApi.bind({
      deviceId: selectedDevice.value.id,
      agentId: selectedAgent.value.agentId
    });

    if (res.code === 1000) {
      toast.success({
        msg: $t('square.config_success'),
        duration: 2000
      });
      hideBindPopup();
      // 刷新数据
      // loadPublicAgents();
      // loadDevices();
    } else {
      toast.warning({
        msg: res.message || $t('square.config_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('配置失败:', error);
    // 不再显示toast，因为request.ts已经处理了
  }
}

const handleBindSuccess = (data: any) => {
  console.log('设备绑定成功', data);
  showBindDrawer.value = false;
  completeSquareBindGuide();
  isSquareBindGuideActive.value = false;
  pendingGuideActivation.value = false;
  showSquareGuidePrompt.value = false;
  toast.success({
    msg: data.message || $t('square.bind_success'),
    duration: 2000,
    zIndex: 2005
  });
  loadPublicAgents();
  updateSquareTabBadge(); // 更新红点状态
};

function handleBindError(data: any) {
  console.log('设备绑定失败', data);
  toast.warning({
    msg: data.message || $t('square.operation_failed'),
    duration: 2000,
    zIndex: 2005
  });
}

function handleBindCancel() {
  console.log('取消设备绑定');
  showBindDrawer.value = false;
}
</script>

<style scoped>
.page-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(max(160rpx, 104rpx + env(safe-area-inset-bottom)));
  box-sizing: border-box;
  background: linear-gradient(
    135deg,
    rgba(161, 140, 209, 0.4) 0%,
    rgba(143, 211, 244, 0.4) 50%,
    rgba(251, 194, 235, 0.4) 100%
  );
}

.page-container::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0.4;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top right, #fbc2eb66 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.page-container::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  opacity: 0.3;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at bottom left, #8fd3f44d 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* 自定义导航栏样式 */
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
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.nav-title {
  font-size: 18px;
  font-weight: 500;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.content-scroll {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  position: relative;
  z-index: 2;
}

/* 搜索框样式 */
.search-container {
  padding: 40rpx 40rpx 24rpx 40rpx;
  margin-bottom: 0;
  width: 100%;
  box-sizing: border-box;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input::before {
  content: '';
  position: absolute;
  left: 42rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 32rpx;
  height: 32rpx;
  background: url('/static/icons/search.svg') no-repeat center center;
  background-size: cover;
}

.search-input {
  width: 100%;
  height: 96rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40rpx;
  padding: 0 40rpx 0 104rpx;
  font-size: 32rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  color: #374151;
}

/* 标签样式 */
.tag-container {
  margin-bottom: 32rpx;
  padding: 0 40rpx;
  width: 100%;
  box-sizing: border-box;
}

.tag-scroll {
  white-space: nowrap;
}

.tag-list {
  display: flex;
  gap: 24rpx;
  padding: 0;
}

.tag-item {
  padding: 12rpx 40rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 100rpx;
  font-size: 28rpx;
  color: #6b7280;
  white-space: nowrap;
  transition: all 0.3s;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
}

.tag-item.active {
  background: rgba(37, 99, 235, 0.9);
  color: white;
  box-shadow: 0 10rpx 30rpx rgba(147, 112, 219, 0.3);
  border: 2rpx solid rgba(37, 99, 235, 0.8);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
}

.agent-list {
  display: flex;
  flex-direction: column;
  padding: 0 40rpx 40rpx 40rpx;
  width: 100%;
  box-sizing: border-box;
}

.agent-card {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 40rpx;
  padding: 32rpx 40rpx;
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  transition: all 0.3s ease;
  align-items: stretch;
  position: relative;
}

.agent-card + .agent-card {
  margin-top: 32rpx;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  text-align: left;
}

.agent-description {
  font-size: 14px;
  color: #78716c;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  padding-top: 24rpx;
  margin-bottom: 24rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  text-align: justify;
  width: 100%;
  max-width: calc(100% - 32rpx);
  box-sizing: border-box;
  word-wrap: break-word;
  word-break: break-all;
}

.agent-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.left-content {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.right-content {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  position: relative;
}

.agent-tag {
  padding: 6rpx 16rpx;
  background: #e1e4ea;
  border-radius: 8rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  word-wrap: break-word;
  white-space: normal;
  width: fit-content;
}

.tag-text {
  font-size: 24rpx;
  color: #6b7280;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.config-btn {
  min-width: 240rpx;
  width: auto;
  height: 72rpx;
  border-radius: 100rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  font-weight: 400;
  box-shadow: 0 10rpx 30rpx rgba(67, 105, 254, 0.3);
  border: 2rpx solid rgba(37, 99, 235, 0.8);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  position: relative;
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}
.btn-text {
  text-align: center;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: white;
  font-weight: 400;
}

.config-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 5rpx 15rpx rgba(67, 105, 254, 0.2);
}

.loading {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 28rpx;
  color: #717784;
}

.guide-highlight-wrapper {
  position: relative;
}

.guide-highlight {
  position: relative !important;
  box-shadow:
    0 12rpx 32rpx rgba(37, 99, 235, 0.3),
    0 0 0 4rpx rgba(37, 99, 235, 0.2) !important;
}

.guide-pulse {
  animation: guidePulse 1.6s ease-in-out infinite;
}

.square-guide-tooltip {
  position: absolute;
  bottom: calc(100% + 30rpx);
  right: 0;
  min-width: 400rpx;
  max-width: 500rpx;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 32rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 28rpx 72rpx rgba(37, 99, 235, 0.22);
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  z-index: 1005;
}

.square-guide-tooltip-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.5;
}

.square-guide-tooltip-actions {
  display: flex;
  justify-content: flex-end;
}

.square-guide-tooltip-skip {
  font-size: 24rpx;
  color: #335CFF;
}

.square-guide-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 60rpx;
  border-width: 12rpx 12rpx 0 12rpx;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.96) transparent transparent transparent;
  filter: drop-shadow(0 8rpx 12rpx rgba(37, 99, 235, 0.15));
}

.square-guide-popup {
  position: fixed;
  left: 50%;
  bottom: calc(max(180rpx, 130rpx + env(safe-area-inset-bottom)));
  transform: translateX(-50%);
  width: calc(100% - 120rpx);
  max-width: 640rpx;
  z-index: 1003;
}

.square-guide-content {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 36rpx;
  padding: 36rpx 40rpx;
  box-shadow: 0 28rpx 72rpx rgba(37, 99, 235, 0.22);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.square-guide-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
}

.square-guide-desc {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.5;
}

.square-guide-actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.square-guide-action {
  background: #335CFF;
  color: #ffffff;
  padding: 18rpx 44rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  box-shadow: 0 18rpx 40rpx rgba(37, 99, 235, 0.32);
}

.square-guide-skip {
  font-size: 24rpx;
  color: #64748b;
}

@keyframes guidePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45);
  }
  70% {
    box-shadow: 0 0 0 20rpx rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    background: rgba(0, 0, 0, 0);
  }
  to {
    opacity: 1;
    background: rgba(0, 0, 0, 0.5);
  }
}

.close-btn {
  font-size: 40rpx;
  color: #999;
}

.device-list {
  max-height: 400rpx;
  overflow-y: auto;
  margin-bottom: 30rpx;
}

.device-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
}

.device-item:last-child {
  border-bottom: none;
}

.device-item.active {
  background: #f0f9ff;
}

.device-info {
  margin-left: 20rpx;
  flex: 1;
}

.device-name {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 5rpx;
}

.device-mac {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 5rpx;
}

.device-status {
  display: block;
  font-size: 22rpx;
  color: #07c160;
}

.popup-actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
