<!--智能体一级列表页面  公开数据-->
<template>
  <wd-toast />
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
        <!-- 右侧返回按钮 -->
        <view class="back-btna" @click="goBacks">
          <text class="back-text">返回</text>
          <image class="back-icona" src="/static/icons/arrow-left.svg" mode="aspectFit" />
        </view>
        <view class="language-selector-container" v-if="availableLanguages.length > 0">
          <view
              class="language-selector"
              :class="{ expanded: showLanguagePicker }"
              @click="showLanguagePicker = !showLanguagePicker">
            <view class="language-selector-inner">
              <text class="language-label">{{ selectedLanguageLabel }}</text>
            </view>
            <view class="language-arrow-wrapper" :class="{ rotated: showLanguagePicker }">
              <image class="language-arrow" src="/static/icons/arrow-down.svg" mode="aspectFit" />
            </view>
          </view>

          <!-- 语言下拉列表 -->
          <view class="language-dropdown" :class="{ show: showLanguagePicker }">
            <view class="language-dropdown-inner">
              <view
                  v-for="(lang, index) in availableLanguages"
                  :key="lang.langCode"
                  class="language-option"
                  :class="{ active: selectedLanguage === lang.langCode }"
                  :style="{ animationDelay: showLanguagePicker ? `${index * 30}ms` : '0ms' }"
                  @click.stop="selectLanguage(lang.langCode)">
                <view class="language-option-content">
                  <text class="language-option-text">{{ lang.language }}</text>
                </view>
                <view v-if="selectedLanguage === lang.langCode" class="language-check-wrapper">
                  <view class="language-check-circle">
                    <image class="language-check" src="/static/icons/check.svg" mode="aspectFit" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <text class="nav-title">{{ $t('square.title') }}</text>
      </view>
    </view>

    <!-- 点击外部关闭下拉框 -->
    <view
        v-if="showLanguagePicker"
        class="language-picker-overlay"
        @click="showLanguagePicker = false"></view>

    <!-- 内容区域 -->
    <scroll-view class="content-scroll" scroll-y="true">
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
            :style="{ zIndex: isSquareBindGuideActive && index === 0 ? 10 : 1 }"
            @click="handleNavigateClick(agent, index)">

          <!-- 左侧：完整图片区域 -->
          <view class="agent-image-wrapper">
            <image
                class="agent-image"
                :src="getAgentBgImage(agent)"
                mode="aspectFill" />
          </view>

          <!-- 右侧：渐变背景 + 文字内容 -->
          <view class="agent-content-wrapper">
            <view class="agent-name-art">{{ agent.name }}</view>
            <view class="agent-tag-art">
              <text class="tag-text-art">{{ getAgentTag(agent) }}</text>
            </view>
            <view class="agent-voice-art" v-if="agent.voiceName !== $t('square.default')">
              <text class="voice-text-art">{{ agent.voiceName }}</text>
            </view>
          </view>
        </view>
      </view>


      <view v-if="!loading && filteredAgents.length === 0" class="empty">
        <image class="empty-icon" src="/static/icons/box.svg" mode="aspectFit"></image>
        <text class="empty-text">
          {{ publicAgents.length === 0 ? $t('square.no_agents') : $t('square.no_search_results') }}
        </text>
      </view>
    </scroll-view>

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
// ... (您的 script 逻辑保持不变，无需修改)
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onShow } from '@dcloudio/uni-app';
// @ts-ignore
import { agentApi, deviceApi } from '../../api/index';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { Agent } from '../index/types.js';
import {
  isSquareOverlayDismissed,
  dismissSquareOverlay,
  resetUserGuideState
} from '@/utils/userGuide';
import {
  getChatLanguageOptions,
  backendLangToLangCode,
  getSystemLangCode,
  initLanguageDisplayNameCache
} from '../agent/lang_opts';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';

import bgImage5 from '@/static/5.png';
import bgImage6 from '@/static/6.png';
import bgImage7 from '@/static/7.png';
import bgImage8 from '@/static/8.png';
import bgImage9 from '@/static/9.png';
import bgImage10 from '@/static/10.png';
const bgImages = [bgImage5, bgImage6, bgImage7, bgImage8, bgImage9, bgImage10];

type SquareAgent = Agent & {
  name: string;
  description: string;
  voiceName: string;
  creatorName: string;
  modalTag: string;
  langCodes: string[];
};

// ==================== 常量配置 ====================
const SPECIAL_AGENT_ID = 7; // 特殊智能体ID：点击时跳转到指定页面
const SPECIAL_AGENT_PATH = '/pages/index/index'; // 预留的特殊页面路径

const { t: $t } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);

// ==================== 响应式数据 ====================
const allAgents = ref<SquareAgent[]>([]);
const publicAgents = ref<SquareAgent[]>([]);
const loading = ref<boolean>(false);
const selectedTag = ref<string>('');
const statusBarHeight = ref<number>(20);
const navBarHeight = ref<number>(44);
const showSquareGuidePrompt = ref<boolean>(false);
const isSquareBindGuideActive = ref<boolean>(false);
const pendingGuideActivation = ref<boolean>(false);

// 新引导系统状态
const showOverlayGuide = ref<boolean>(false);
const showSecondOverlay = ref<boolean>(false);
const showInfoBar = ref<boolean>(false);

// 语言选择相关
const selectedLanguage = ref<string>('');
const showLanguagePicker = ref<boolean>(false);
const availableLanguages = ref<{ language: string; langCode: string }[]>([]);

// ==================== 计算属性 ====================
const modelTags = computed(() => {
  const tags: { id: string; name: string }[] = [];
  const allModelTags = [
    { id: 'gpt4', name: $t('square.model.gpt4') },
    { id: 'gpt5', name: $t('square.model.gpt5') },
    { id: 'gpt-oss', name: $t('square.model.gpt-oss') },
    { id: 'qwen', name: $t('square.model.qwen') },
    { id: 'deepseek-v3', name: $t('square.model.deepseek-v3') },
    { id: 'deepseek', name: $t('square.model.deepseek') }
  ];
  const existingModalTags = new Set();
  publicAgents.value.forEach((agent) => {
    if (agent.modalTag) {
      existingModalTags.add(agent.modalTag);
    }
  });
  allModelTags.forEach((tag) => {
    if (existingModalTags.has(tag.id)) {
      tags.push(tag);
    }
  });
  return tags;
});

const filteredAgents = computed(() => {
  let filtered = publicAgents.value;
  if (selectedTag.value) {
    filtered = filtered.filter((agent) => {
      const modalTag = agent.modalTag || '';
      return modalTag === selectedTag.value;
    });
  }
  return filtered;
});

const selectedLanguageLabel = computed(() => {
  const found = availableLanguages.value.find((opt) => opt.langCode === selectedLanguage.value);
  return found ? found.language : $t('square.select_language');
});

// 监听 filteredAgents 变化
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

// ==================== 引导系统相关函数 ====================
async function refreshSquareGuideState() {
  try {
    const result = await deviceApi.getList();
    console.log('[refreshSquareGuideState] API result:', result);
    if (result.code === 1000 && Array.isArray(result.data)) {
      const hasUnboundDevice = result.data.some((device: any) => !device.agentName);
      if (hasUnboundDevice) {
        const overlayDismissed = isSquareOverlayDismissed();
        if (!overlayDismissed) {
          showOverlayGuide.value = true;
          showInfoBar.value = false;
        } else {
          showOverlayGuide.value = false;
          showInfoBar.value = true;
        }
        return;
      }
    }
  } catch (error) {
    console.warn('[refreshSquareGuideState] 获取设备列表失败:', error);
  }
  showSquareGuidePrompt.value = false;
  isSquareBindGuideActive.value = false;
  pendingGuideActivation.value = false;
  showOverlayGuide.value = false;
  showInfoBar.value = false;
}

// 返回上一页
function goBacks() {
  uni.switchTab({
    url: '/pages/device-status/device-status'
  });
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


// ==================== 生命周期钩子 ====================
onLoad(() => {
  loadPublicAgents();
  setStatusBarHeight();
});

onShow(() => {
  loadPublicAgents();
  refreshSquareGuideState();
  uni.hideTabBar({ animation: false });
});

// ==================== 基础方法 ====================
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
    await initLanguageDisplayNameCache();

    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const fatherId = currentPage?.$page?.options?.father;

    let res;
    if (fatherId) {
      res = await agentApi.getPublicAgentsXu(Number(fatherId));
      console.log('[Square] 获取子级智能体列表, fatherId:', fatherId, res);
    } else {
      res = await agentApi.getPublicAgents('all', 0);
      console.log('[Square] 获取所有公开助手:', res);
    }
    console.log('[Square] 获取公开助手列表111, res:', res.data);

    if (res.code === 1000) {
      if (res.data && res.data.length > 0) {
        console.log('[Square] 第一条数据字段:', Object.keys(res.data[0]));
        console.log('[Square] 第一条数据完整内容:', JSON.stringify(res.data[0]));
      }

      const modalKeyword = {
        gpt4: ['gpt4', 'gpt-4'],
        gpt5: ['gpt5', 'gpt-5'],
        'gpt-oss': ['gpt-oss'],
        qwen: ['qwen', '通义千问'],
        'deepseek-v3': ['deepseek-v3'],
        deepseek: ['deepseek']
      };

      allAgents.value = (res.data || []).map((agent: any) => {
        const llmModelName = agent.config?.llmModelName?.toLowerCase() || '';
        let modalTag = '';
        for (const [modalType, keywords] of Object.entries(modalKeyword)) {
          const hasKeyword = keywords.some((keyword) =>
              llmModelName.includes(keyword.toLowerCase())
          );
          if (hasKeyword) {
            modalTag = modalType;
            break;
          }
        }
        const langSource =
            agent.config?.langCode || (Array.isArray(agent.lang) ? agent.lang[0] : agent.lang) || '';
        const langCodes = langSource ? [backendLangToLangCode(langSource)] : [];

        console.log('[Square] 映射数据 - id:', agent.id, 'agentId:', agent.agentId);

        return {
          ...agent,
          id: agent.id,
          agentId: agent.agentId,
          name: agent.agentName,
          description: agent.description || agent.config?.systemPrompt || '',
          voiceName: agent.config?.voiceName || $t('square.default'),
          creatorName: agent.userName || $t('square.anonymous'),
          modalTag: modalTag,
          langCodes: langCodes
        } as SquareAgent;
      });

      await extractAvailableLanguages();
      if (!selectedLanguage.value) {
        initDefaultLanguage();
      }
      filterAgentsByLanguage();
    } else {
      console.warn('获取公开助手失败:', res.message);
    }
  } catch (error) {
    console.error('获取公开助手失败:', error);
  } finally {
    loading.value = false;
    refreshSquareGuideState();
  }
}

async function extractAvailableLanguages() {
  const langSet = new Set<string>();
  allAgents.value.forEach((agent) => {
    if (agent.langCodes && Array.isArray(agent.langCodes)) {
      agent.langCodes.forEach((langCode: string) => {
        langSet.add(langCode);
      });
    }
  });
  const allLangOptions = await getChatLanguageOptions();
  availableLanguages.value = allLangOptions
      .filter((opt) => langSet.has(opt.langCode))
      .map((opt) => ({ language: opt.language, langCode: opt.langCode }));
  console.log('[Square] 可用语言:', availableLanguages.value);
}

function initDefaultLanguage() {
  const systemLangCode = getSystemLangCode();
  const systemLangShort = systemLangCode.split('_')[0].toLowerCase();
  const matchedLang = availableLanguages.value.find((opt) => {
    const optLangShort = opt.langCode.split('_')[0].toLowerCase();
    return opt.langCode === systemLangCode || optLangShort === systemLangShort;
  });
  if (matchedLang) {
    selectedLanguage.value = matchedLang.langCode;
  } else {
    const englishLang = availableLanguages.value.find((opt) => {
      const optLangShort = opt.langCode.split('_')[0].toLowerCase();
      return opt.langCode === 'en_US' || opt.langCode === 'en' || optLangShort === 'en';
    });
    if (englishLang) {
      selectedLanguage.value = englishLang.langCode;
    } else if (availableLanguages.value.length > 0) {
      selectedLanguage.value = availableLanguages.value[0].langCode;
    }
  }
  console.log('[Square] 默认选择语言:', selectedLanguage.value);
}

function filterAgentsByLanguage() {
  if (!selectedLanguage.value) {
    publicAgents.value = allAgents.value;
    return;
  }
  publicAgents.value = allAgents.value.filter((agent) => {
    if (!agent.langCodes || !Array.isArray(agent.langCodes)) {
      return false;
    }
    return agent.langCodes.includes(selectedLanguage.value);
  });
  console.log('[Square] 筛选后智能体数量:', publicAgents.value.length);
}

function selectLanguage(langCode: string) {
  selectedLanguage.value = langCode;
  showLanguagePicker.value = false;
  filterAgentsByLanguage();
}

function selectTag(tagId: string) {
  selectedTag.value = tagId;
}

function getAgentTag(agent: SquareAgent) {
  const name = agent.name.toLowerCase();
  if (name === '嘟嘟熊') {
    return $t('square.ai_toy');
  }
  return $t('square.ai_assistant');
}

function getAgentBgImage(agent: SquareAgent) {
  // 如果agent有自定义bgImage字段则优先使用
  if (agent.bgImage) {
    return agent.bgImage;
  }

  // 根据智能体在列表中的索引循环使用 5.png ~ 8.png
  const agentIndex = filteredAgents.value.findIndex(a => a.id === agent.id);
  const imageIndex = agentIndex % 6; // 0,1,2,3 循环
  return bgImages[imageIndex];
}

/**
 * 处理卡片点击跳转
 * @param agent - 当前智能体对象
 * @param index - 在列表中的索引
 */
function handleNavigateClick(agent: SquareAgent, index: number) {
  console.log('[Square] 点击智能体卡片, agent:', agent);

  // 使用主键 id
  const fatherId = agent.id;
  console.log('[Square] 主键 id:', fatherId);
  console.log('[Square] 业务 agentId:', agent.agentId);

  // 如果是引导模式且不是第一个，则关闭引导
  if (isSquareBindGuideActive.value && index !== 0) {
    isSquareBindGuideActive.value = false;
    pendingGuideActivation.value = false;
  }

  // ==================== 特殊智能体跳转逻辑 ====================
  // 如果是ID为7的智能体，跳转到特殊页面
  if (fatherId === SPECIAL_AGENT_ID) {
    console.log('[Square] 检测到特殊智能体ID，跳转到特殊页面');
    navigateToSpecialPage(agent);
    return;
  }
  // ==================== 普通跳转逻辑 ====================

  getApp().globalData.fatherId = fatherId;

  uni.switchTab({
    url: '/pages/square/square',
    success: () => {
      console.log('[Square] 跳转成功, fatherId:', fatherId);
    },
    fail: (err) => {
      console.error('[Square] 跳转失败:', err);
      toast.error({ msg: '页面跳转失败，请重试' });
    }
  });
}

/**
 * 跳转到特殊页面（ID=7的智能体）
 * @param agent - 智能体对象
 */
function navigateToSpecialPage(agent: SquareAgent) {
  console.log('[Square] 执行特殊页面跳转, agentId:', agent.agentId, 'id:', agent.id);

  // 传递智能体信息到特殊页面
  getApp().globalData.fatherId = agent.id;
  getApp().globalData.specialAgentInfo = agent;

  // 跳转到特殊页面（使用.navigateTo而非switchTab）
  uni.switchTab({
    url: SPECIAL_AGENT_PATH,
    success: () => {
      console.log('[Square] 特殊页面跳转成功');
    },
    fail: (err) => {
      console.error('[Square] 特殊页面跳转失败:', err);
      toast.error({ msg: '页面跳转失败，请重试' });
    }
  });
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
  background: linear-gradient(180deg, var(--color-primary-bg) 0%, #ffffff 124.53%);
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

.nav-title {
  font-size: 18px;
  font-weight: 500;
  color: #0f172a;
  white-space: pre-line;
  text-align: center;
  line-height: 1.2;
}

.content-scroll {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  position: relative;
  z-index: 100;
  -webkit-overflow-scrolling: touch;
}

.language-selector-container {
  position: absolute;
  left: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 200;
}

.language-selector {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8rpx;
  height: 52rpx;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.language-selector:active {
  transform: scale(0.96);
}

.language-selector.expanded {
  opacity: 0.85;
}

.language-selector-inner {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.language-label {
  font-size: 28rpx;
  font-weight: 400;
  color: #212730;
}

.language-arrow-wrapper {
  width: 24rpx;
  height: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.language-arrow-wrapper.rotated {
  transform: rotate(180deg);
}

.language-arrow {
  width: 20rpx;
  height: 20rpx;
  opacity: 0.5;
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 16rpx);
  left: 0;
  width: 260rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 16rpx 64rpx var(--color-primary-alpha-15);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-8rpx);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 201;
}

.language-dropdown.show {
  max-height: 480rpx;
  opacity: 1;
  transform: translateY(0);
  overflow-y: auto;
}

.language-dropdown-inner {
  padding: 16rpx 0;
}

.language-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 40rpx;
  transition: all 0.2s ease;
  animation: optionFadeIn 0.3s ease forwards;
  opacity: 0;
  transform: translateY(-8rpx);
}

@keyframes optionFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.language-option:active {
  background: var(--color-primary-bg-hover);
}

.language-option.active {
  background: var(--color-primary-bg);
}

.language-option-content {
  flex: 1;
}

.language-option-text {
  font-size: 30rpx;
  color: #374151;
  font-weight: 400;
}

.language-option.active .language-option-text {
  color: var(--color-primary-dark);
  font-weight: 500;
}

.language-check-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.language-check-circle {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-dark);
  border-radius: 50%;
}

.language-check {
  width: 18rpx;
  height: 18rpx;
  filter: brightness(10);
}

.language-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  background: transparent;
}

.tag-container {
  margin-bottom: 32rpx;
  padding: 0 40rpx;
  width: 100%;
  box-sizing: border-box;
}

.tag-scroll {
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tag-scroll::-webkit-scrollbar {
  display: none;
}

.tag-list {
  display: flex;
  gap: 24rpx;
  padding: 0;
}

.tag-item {
  padding: 12rpx 40rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 100rpx;
  font-size: 28rpx;
  color: #6b7280;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  cursor: pointer;
}

.tag-item:active {
  transform: scale(0.95);
}

.tag-item.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 10rpx 30rpx var(--color-primary-shadow-light);
  border: 2rpx solid var(--color-primary);
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

/*
  核心修改：卡片布局改为 Flex Row (左图右文)
*/
.agent-card {
  display: flex;
  flex-direction: row; /* 横向排列 */
  align-items: stretch; /* 高度拉满 */
  position: relative;
  margin-bottom: 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  transition: transform 0.1s ease;
}

.agent-card:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 左侧图片区域 */
.agent-image-wrapper {
  width: 480rpx; /* 固定图片宽度 */
  flex-shrink: 0;
  position: relative;
}

.agent-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保持图片比例填充 */
  display: block;
}

/* 右侧内容区域 (渐变背景) */
.agent-content-wrapper {
  flex: 1; /* 占据剩余空间 */
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 模拟图中的淡蓝紫色渐变 */
  background: linear-gradient(135deg, #c9f8e8 15%, #9ff4da 20%, #91efd2 30%, #4ef4c1 35%);
  position: relative;
}

/* 文字样式微调以适配渐变背景 */
.agent-name-art {
  font-style: normal;
  font-weight: 700;
  font-size: 36rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: #ffffff;
  margin-bottom: 12rpx;
  text-shadow: none; /* 渐变背景下不需要重阴影 */
}

.agent-tag-art {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 16rpx;
}

.tag-text-art {
  font-style: normal;
  font-weight: 500;
  font-size: 24rpx;
  line-height: 36rpx;
  display: flex;
  align-items: center;
  color: #ffffff; /* 灰色文字 */
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.agent-voice-art {
  display: flex;
  align-items: center;
}

.voice-text-art {
  font-size: 22rpx;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.6);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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

/* 下方引导弹窗样式保持不变... */
.square-guide-popup {
  position: fixed;
  left: 50%;
  bottom: calc(200rpx + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: calc(100% - 120rpx);
  max-width: 640rpx;
  z-index: 1003;
}

.square-guide-content {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 36rpx;
  padding: 36rpx 40rpx;
  box-shadow: 0 28rpx 72rpx var(--color-primary-alpha-25);
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
  background: var(--color-primary);
  color: #ffffff;
  padding: 18rpx 44rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  box-shadow: 0 18rpx 40rpx var(--color-primary-shadow);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.square-guide-action:active {
  transform: scale(0.95);
  box-shadow: 0 12rpx 28rpx var(--color-primary-shadow);
}

.square-guide-skip {
  font-size: 24rpx;
  color: #64748b;
}


.back-btna {
  position: absolute;
  right: 8rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  width: 128rpx;
  height: 64rpx;
  border-radius: 16rpx;
  backdrop-filter: blur(10rpx);
  z-index: 200;
  white-space: nowrap;
  box-sizing: border-box;
}

.back-text {
  font-size: 28rpx;
  color: #01061c;
}

.back-icona {
  width: 28rpx;
  height: 28rpx;
}
</style>
