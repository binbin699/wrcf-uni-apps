<template>
  <wd-toast />
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
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
            :style="{ zIndex: isSquareBindGuideActive && index === 0 ? 10 : 1 }">
          <view class="agent-content">
            <!-- 左侧内容：名称、标签 -->
            <view class="agent-left">
              <view class="agent-header">
                <view class="agent-name">{{ agent.name }}</view>
                <view class="agent-tag">
                  <text class="tag-text">{{ getAgentTag(agent) }}</text>
                </view>
              </view>
            </view>
            <!-- 右侧内容：选择按钮 -->
            <view
                class="agent-right"
                :class="{ 'guide-highlight-wrapper': isSquareBindGuideActive && index === 0 }">
              <button
                  :id="index === 0 ? 'first-bind-btn' : ''"
                  class="config-btn-white"
                  :class="{
                  'guide-highlight': isSquareBindGuideActive && index === 0,
                  'guide-pulse': isSquareBindGuideActive && index === 0
                }"
                  @click="handleNavigateClick(agent, index)">
                <text class="btn-text-white">{{ $t('square.bind_devices') }}</text>
              </button>
              <view
                  v-if="isSquareBindGuideActive && index === 0"
                  class="square-guide-tooltip"
                  @click.stop>
                <text class="square-guide-tooltip-text">
                  {{ $t('guide.square_highlight_tip') }}
                </text>
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

    <!-- 新引导系统：蒙层提示（首次进入时显示） -->
    <view v-if="showOverlayGuide" class="overlay-guide" @click.stop>
      <view class="overlay-guide-mask"></view>
      <view class="overlay-guide-card">
        <!-- 背景光晕效果 -->
        <view class="overlay-guide-bg">
          <view class="overlay-guide-ellipse ellipse-1"></view>
          <view class="overlay-guide-ellipse ellipse-2"></view>
          <view class="overlay-guide-ellipse ellipse-3"></view>
          <view class="overlay-guide-ellipse ellipse-4"></view>
        </view>
        <view class="overlay-guide-content">
          <view class="overlay-guide-title">{{ $t('guide.overlay_title') }}</view>
          <rich-text class="overlay-guide-desc" :nodes="$t('guide.overlay_desc')"></rich-text>
          <view class="overlay-guide-illustration">
            <image src="/static/guide-illustration.png" mode="aspectFit" class="illustration-img" />
            <!-- 指向绑定按钮的箭头 -->
            <image
                src="/static/icons/arrow-pointer.svg"
                mode="aspectFit"
                class="illustration-arrow" />
          </view>
          <view class="overlay-guide-btn" @click.stop="handleOverlayDismiss">
            <text class="overlay-guide-btn-text">{{ $t('guide.overlay_action') }}</text>
          </view>
        </view>
        <!-- 三角形箭头 -->
        <view class="overlay-guide-arrow"></view>
      </view>
    </view>

    <!-- 新引导系统：第二个蒙层提示（点击第一个蒙层"知道了"后显示） -->
    <view v-if="showSecondOverlay" class="second-overlay" @click.stop>
      <!-- 蒙层 -->
      <view class="second-overlay-mask"></view>
      <!-- 绑定按钮高亮区域（在蒙层之上） -->
      <view
          v-if="highlightPosition && filteredAgents.length > 0"
          class="second-overlay-highlight"
          :style="{
          top: highlightPosition.top - 8 + 'px',
          left: highlightPosition.left - 8 + 'px'
        }"
          @click="handleNavigateClick(filteredAgents[0], 0)">
        <button class="config-btn-white highlight-btn">
          <text class="btn-text-white">{{ $t('square.bind_devices') }}</text>
        </button>
      </view>
      <!-- 信息条 -->
      <view
          class="second-overlay-card"
          :style="
          highlightPosition
            ? { top: highlightPosition.top + highlightPosition.height + 20 + 'px' }
            : {}
        ">
        <!-- 背景光晕效果 -->
        <view class="second-overlay-bg">
          <view class="second-overlay-ellipse ellipse-1"></view>
          <view class="second-overlay-ellipse ellipse-2"></view>
          <view class="second-overlay-ellipse ellipse-3"></view>
          <view class="second-overlay-ellipse ellipse-4"></view>
        </view>
        <view class="second-overlay-content">
          <view class="second-overlay-text">{{ $t('guide.second_overlay_text') }}</view>
          <view class="second-overlay-btn" @click.stop="handleSecondOverlayDismiss">
            <text class="second-overlay-btn-text">{{ $t('guide.overlay_action') }}</text>
          </view>
        </view>
      </view>
      <!-- 三角形箭头 -->
      <view
          class="second-overlay-arrow"
          :style="
          highlightPosition
            ? {
                left: highlightPosition.left + highlightPosition.width / 2 - 12 + 'px',
                top: highlightPosition.top + highlightPosition.height + 14 + 'px'
              }
            : {}
        "></view>
    </view>

    <!-- 信息提示条（固定在底部tab上方） -->
    <view v-if="showInfoBar" class="info-bar">
      <image src="/static/icons/bell.svg" class="info-bar-icon" />
      <rich-text class="info-bar-text" :nodes="$t('guide.info_bar_text')"></rich-text>
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

type SquareAgent = Agent & {
  name: string;
  description: string;
  voiceName: string;
  creatorName: string;
  modalTag: string;
  langCodes: string[];
};

const { t: $t } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);

// 响应式数据
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
const highlightPosition = ref<{ top: number; left: number; width: number; height: number } | null>(null);
const showInfoBar = ref<boolean>(false);

// 语言选择相关
const selectedLanguage = ref<string>('');
const showLanguagePicker = ref<boolean>(false);
const availableLanguages = ref<{ language: string; langCode: string }[]>([]);

// 计算属性
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

// 引导系统相关函数
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

function getFirstBindBtnPosition() {
  return new Promise<void>((resolve) => {
    uni
        .createSelectorQuery()
        .select('#first-bind-btn')
        .boundingClientRect((rect: any) => {
          if (rect) {
            highlightPosition.value = {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            };
          }
          resolve();
        })
        .exec();
  });
}

async function handleOverlayDismiss() {
  dismissSquareOverlay();
  showOverlayGuide.value = false;
  if (filteredAgents.value.length > 0) {
    await getFirstBindBtnPosition();
    showSecondOverlay.value = true;
  } else {
    showInfoBar.value = true;
  }
}

function handleSecondOverlayDismiss() {
  showSecondOverlay.value = false;
  showInfoBar.value = true;
}

// 生命周期钩子
onLoad(() => {
  loadPublicAgents();
  setStatusBarHeight();
});

onShow(() => {
  loadPublicAgents();
  refreshSquareGuideState();
  uni.hideTabBar({ animation: false });
});

// 基础方法
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

    if (res.code === 1000) {
      // 打印第一条数据的所有字段，确认主键字段名
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

        // 主键可能是 id 或 agentId，打印确认
        console.log('[Square] 映射数据 - id:', agent.id, 'agentId:', agent.agentId);

        return {
          ...agent,
          id: agent.id,                    // 数据库主键ID
          agentId: agent.agentId,          // 业务ID
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

function handleNavigateClick(agent: SquareAgent, index: number) {
  console.log('[Square] 点击选择按钮, agent:', agent);

  // 使用主键 id
  const fatherId = agent.id;
  console.log('[Square] 主键 id:', fatherId);
  console.log('[Square] 业务 agentId:', agent.agentId);

  if (isSquareBindGuideActive.value && index !== 0) {
    isSquareBindGuideActive.value = false;
    pendingGuideActivation.value = false;
  }

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
  transform: scale(0.98);
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
  background: rgba(255, 255, 255, 0.85);
  border-radius: 32rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.15);
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
  background: rgba(100, 100, 255, 0.06);
}

.language-option.active {
  background: rgba(100, 100, 255, 0.08);
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
  background: rgba(51, 92, 255, 0.9);
  color: white;
  box-shadow: 0 10rpx 30rpx rgba(147, 112, 219, 0.3);
  border: 2rpx solid rgba(51, 92, 255, 0.8);
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 32rpx;
  background: #ffffff;
  border-radius: 32rpx;
  position: relative;
}

.agent-card + .agent-card {
  margin-top: 24rpx;
}

.agent-content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 32rpx;
  width: 100%;
}

.agent-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24rpx;
  flex: 1;
  min-width: 0;
}

.agent-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  width: 100%;
}

.agent-name {
  font-style: normal;
  font-weight: 500;
  font-size: 36rpx;
  line-height: 52rpx;
  display: flex;
  align-items: center;
  color: #212730;
}

.agent-right {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  position: relative;
}

.agent-tag {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 6rpx 12rpx;
  gap: 20rpx;
  background: #f3f4f7;
  border-radius: 8rpx;
}

.tag-text {
  font-style: normal;
  font-weight: 400;
  font-size: 24rpx;
  line-height: 32rpx;
  display: flex;
  align-items: center;
  color: #60718b;
}

/* 白色按钮样式 */
.config-btn-white {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 16rpx;
  min-width: 128rpx;
  width: auto;
  height: 64rpx;
  background: #ffffff;
  border-radius: 16rpx;
  border: 2rpx solid var(--color-primary);
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-text-white {
  font-style: normal;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--color-primary);
}

.config-btn-white:active {
  transform: translateY(2rpx);
  background: #f5f5f5;
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
  box-shadow: 0 12rpx 32rpx var(--color-primary-alpha-25), 0 0 0 4rpx var(--color-primary-alpha-20) !important;
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
  box-shadow: 0 28rpx 72rpx var(--color-primary-alpha-25);
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
  color: var(--color-primary);
}

.square-guide-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 60rpx;
  border-width: 12rpx 12rpx 0 12rpx;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.96) transparent transparent transparent;
  filter: drop-shadow(0 8rpx 12rpx var(--color-primary-alpha-15));
}

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
  box-shadow: 0 18rpx 40rpx var(--color-primary-alpha-35);
}

.square-guide-skip {
  font-size: 24rpx;
  color: #64748b;
}

@keyframes guidePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(51, 92, 255, 0.45);
  }
  70% {
    box-shadow: 0 0 0 20rpx rgba(51, 92, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(51, 92, 255, 0);
  }
}

/* 蒙层提示样式 - 保持原有样式 */
.overlay-guide {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-guide-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
}

.overlay-guide-card {
  position: absolute;
  width: 548rpx;
  left: 50%;
  bottom: calc(200rpx + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  background: #e3efff;
  border-radius: 32rpx;
  overflow: hidden;
}

.overlay-guide-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.overlay-guide-ellipse {
  position: absolute;
  border-radius: 50%;
  filter: blur(70rpx);
}

.overlay-guide-ellipse.ellipse-1 {
  width: 250rpx;
  height: 250rpx;
  right: -50rpx;
  bottom: -32rpx;
  background: #def4ff;
}

.overlay-guide-ellipse.ellipse-2 {
  width: 274rpx;
  height: 274rpx;
  left: -94rpx;
  top: 202rpx;
  background: #ffffff;
  opacity: 0.34;
}

.overlay-guide-ellipse.ellipse-3 {
  width: 208rpx;
  height: 208rpx;
  left: -94rpx;
  top: -80rpx;
  background: #cbeeff;
  opacity: 0.34;
}

.overlay-guide-ellipse.ellipse-4 {
  width: 364rpx;
  height: 364rpx;
  right: -70rpx;
  top: -162rpx;
  background: #a8dfff;
  opacity: 0.5;
  filter: blur(82rpx);
}

.overlay-guide-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 40rpx;
  gap: 24rpx;
}

.overlay-guide-title {
  width: 100%;
  font-style: normal;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 48rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: #212730;
}

.overlay-guide-desc {
  width: 100%;
  font-style: normal;
  font-weight: 400;
  font-size: 26rpx;
  line-height: 40rpx;
  color: #36404f;
}

.overlay-guide-illustration {
  position: relative;
  width: 468rpx;
  height: 224rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.illustration-arrow {
  position: absolute;
  width: 52rpx;
  height: 56rpx;
  left: 300rpx;
  top: 98rpx;
}

.illustration-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.overlay-guide-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 24rpx;
  width: 240rpx;
  height: 56rpx;
  background: var(--color-primary);
  border-radius: 132rpx;
}

.overlay-guide-btn-text {
  font-style: normal;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: #ffffff;
}

.overlay-guide-arrow {
  position: absolute;
  width: 32rpx;
  height: 18rpx;
  right: 70rpx;
  bottom: -16rpx;
  background: #e1f1ff;
  clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
}

.second-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

.second-overlay-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
}

.second-overlay-highlight {
  position: fixed;
  z-index: 2001;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 16rpx;
}

.second-overlay-highlight .highlight-btn {
  margin: 0;
}

.second-overlay-card {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 548rpx;
  background: #e3efff;
  border-radius: 32rpx;
  overflow: hidden;
  z-index: 2001;
}

.second-overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.second-overlay-ellipse {
  position: absolute;
  border-radius: 50%;
  filter: blur(70rpx);
}

.second-overlay-ellipse.ellipse-1 {
  width: 208rpx;
  height: 208rpx;
  right: -70rpx;
  bottom: -80rpx;
  background: #def4ff;
}

.second-overlay-ellipse.ellipse-2 {
  width: 274rpx;
  height: 274rpx;
  left: -94rpx;
  bottom: -120rpx;
  background: #ffffff;
  opacity: 0.34;
}

.second-overlay-ellipse.ellipse-3 {
  width: 208rpx;
  height: 208rpx;
  left: -94rpx;
  top: -80rpx;
  background: #cbeeff;
  opacity: 0.34;
}

.second-overlay-ellipse.ellipse-4 {
  width: 364rpx;
  height: 364rpx;
  right: -70rpx;
  top: -162rpx;
  background: #a8dfff;
  opacity: 0.5;
  filter: blur(82rpx);
}

.second-overlay-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 40rpx;
  gap: 24rpx;
}

.second-overlay-text {
  width: 100%;
  font-style: normal;
  font-weight: 400;
  font-size: 26rpx;
  line-height: 40rpx;
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  color: #36404f;
}

.second-overlay-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 24rpx;
  width: 240rpx;
  height: 56rpx;
  background: var(--color-primary);
  border-radius: 132rpx;
}

.second-overlay-btn-text {
  font-style: normal;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: #ffffff;
}

.second-overlay-arrow {
  position: fixed;
  z-index: 2001;
  width: 24rpx;
  height: 14rpx;
  background: #cde9ff;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.info-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 160rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 32rpx;
  gap: 16rpx;
  min-height: 112rpx;
  background: #ededf9;
  z-index: 101;
}

.info-bar-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.info-bar-text {
  flex: 1;
  font-style: normal;
  font-weight: 400;
  font-size: 26rpx;
  line-height: 40rpx;
  color: var(--color-primary);
}
</style>
