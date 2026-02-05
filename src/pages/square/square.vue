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
            placeholder-style="color: #374151;"
            v-model="searchKeyword"
            @input="onSearchInput" />
        </view>
      </view>

      <!-- 语言选择下拉框 -->
      <view class="language-selector-container" v-if="availableLanguages.length > 0">
        <view
          class="language-selector"
          :class="{ expanded: showLanguagePicker }"
          @click="showLanguagePicker = !showLanguagePicker">
          <view class="language-selector-inner">
            <text class="language-icon">🌐</text>
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

      <!-- 点击外部关闭下拉框 -->
      <view
        v-if="showLanguagePicker"
        class="language-picker-overlay"
        @click="showLanguagePicker = false"></view>

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
            <!-- 左侧内容：名称、标签、描述 -->
            <view class="agent-left">
              <view class="agent-header">
                <view class="agent-name">{{ agent.name }}</view>
                <view class="agent-tag">
                  <text class="tag-text">{{ getAgentTag(agent) }}</text>
                </view>
              </view>
              <view class="agent-description">{{ agent.description }}</view>
            </view>
            <!-- 右侧内容：绑定按钮 -->
            <view
              class="agent-right"
              :class="{ 'guide-highlight-wrapper': isSquareBindGuideActive && index === 0 }">
              <button
                :id="index === 0 ? 'first-bind-btn' : ''"
                class="config-btn primary"
                :class="{
                  'guide-highlight': isSquareBindGuideActive && index === 0,
                  'guide-pulse': isSquareBindGuideActive && index === 0
                }"
                @click="handleGuideBindClick(agent, index)">
                <text class="btn-text">{{ $t('square.bind_device') }}</text>
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
            <image src="/static/guide-illustration.svg" mode="aspectFit" class="illustration-img" />
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
        @click="handleGuideBindClick(filteredAgents[0], 0)">
        <button class="config-btn primary highlight-btn">
          <text class="btn-text">{{ $t('square.bind_device') }}</text>
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
    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onLoad, onShow } from '@dcloudio/uni-app';
// @ts-ignore
import { agentApi, deviceApi } from '../../api/index';
import AgentBindDrawer from '../../components/AgentBindDrawer.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { Agent } from '../index/types.js';
import { Device } from '../device/types.js';
import {
  completeSquareBindGuide,
  isSquareOverlayDismissed,
  dismissSquareOverlay,
  resetUserGuideState
} from '@/utils/userGuide';
import { updateSquareTabBadge, showSquareBadge } from '@/utils/tabBarBadge';
import { getChatLanguageOptions, backendLangToLangCode, getSystemLangCode, initLanguageDisplayNameCache, type ChatLanguageOption } from '../agent/lang_opts';

type SquareAgent = Agent & {
  name: string;
  description: string;
  voiceName: string;
  creatorName: string;
  modalTag: string;
  langCodes: string[]; // 前端 langCode 格式的语言数组
};

const { t: $t } = useI18n();
const toast = useToast();

// 响应式数据
const allAgents = ref<SquareAgent[]>([]); // 所有智能体（从后端获取）
const publicAgents = ref<SquareAgent[]>([]); // 按语言筛选后的智能体
const showBindDrawer = ref<boolean>(false);
const selectedAgent = ref<SquareAgent | null>(null);
const loading = ref<boolean>(false);
const selectedDevice = ref<any>(null);
const searchKeyword = ref<string>('');
const selectedTag = ref<string>(''); // 空字符串表示不按模型筛选
const statusBarHeight = ref<number>(20);
const navBarHeight = ref<number>(44);
const showSquareGuidePrompt = ref<boolean>(false);
const isSquareBindGuideActive = ref<boolean>(false);
const pendingGuideActivation = ref<boolean>(false);

// 新引导系统状态
// 是否显示第一个蒙层提示（首次进入且有未绑定设备时显示）
const showOverlayGuide = ref<boolean>(false);
// 是否显示第二个蒙层提示（点击第一个蒙层"知道了"后显示）
const showSecondOverlay = ref<boolean>(false);
// 绑定按钮高亮框位置
const highlightPosition = ref<{ top: number; left: number; width: number; height: number } | null>(
  null
);
// 是否显示信息提示条（点击第二个蒙层"知道了"后显示，直到设备绑定智能体）
const showInfoBar = ref<boolean>(false);

// 语言选择相关
const selectedLanguage = ref<string>(''); // 选中的语言 langCode
const showLanguagePicker = ref<boolean>(false); // 是否显示语言选择器
const availableLanguages = ref<{ language: string; langCode: string }[]>([]); // 智能体中存在的语言选项

const modelTags = computed(() => {
  let tags: { id: string; name: string }[] = [];

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
  publicAgents.value.forEach((agent) => {
    if (agent.modalTag) {
      existingModalTags.add(agent.modalTag);
    }
  });

  // 只添加有对应 agent 的标签
  allModelTags.forEach((tag) => {
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

  // 标签过滤（如果选择了标签）
  if (selectedTag.value) {
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
    console.log('[refreshSquareGuideState] API result:', result);
    console.log('[refreshSquareGuideState] 设备列表:', result.data);
    if (result.code === 1000 && Array.isArray(result.data)) {
      const hasUnboundDevice = result.data.some((device: any) => !device.agentName);
      console.log('[refreshSquareGuideState] hasUnboundDevice:', hasUnboundDevice);
      if (hasUnboundDevice) {
        // 新引导系统逻辑
        const overlayDismissed = isSquareOverlayDismissed();
        console.log('[refreshSquareGuideState] overlayDismissed:', overlayDismissed);
        if (!overlayDismissed) {
          // 首次进入：显示蒙层提示和红点
          console.log('[refreshSquareGuideState] 显示蒙层提示和红点');
          showOverlayGuide.value = true;
          showInfoBar.value = false;
          showSquareBadge.value = true; // 显示红点
        } else {
          // 再次进入：只显示信息提示条，不显示红点
          console.log('[refreshSquareGuideState] 显示信息提示条');
          showOverlayGuide.value = false;
          showInfoBar.value = true;
          showSquareBadge.value = false; // 不显示红点
        }
        return;
      }
    }
  } catch (error) {
    console.warn('[refreshSquareGuideState] 获取设备列表失败:', error);
  }
  // 没有未绑定设备，隐藏所有引导
  showSquareGuidePrompt.value = false;
  isSquareBindGuideActive.value = false;
  pendingGuideActivation.value = false;
  showOverlayGuide.value = false;
  showInfoBar.value = false;
  showSquareBadge.value = false;
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

/**
 * 获取第一个绑定按钮的位置
 */
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

/**
 * 关闭第一个蒙层提示（点击"知道了"按钮）
 * - 第一个蒙层消失
 * - 红点消失
 * - 显示第二个蒙层（高亮绑定按钮）
 */
async function handleOverlayDismiss() {
  dismissSquareOverlay(); // 记录到本地存储
  showOverlayGuide.value = false;
  // 隐藏红点
  showSquareBadge.value = false;
  uni.hideTabBarRedDot({ index: 2 });

  // 获取第一个绑定按钮的位置，然后显示第二个蒙层
  if (filteredAgents.value.length > 0) {
    await getFirstBindBtnPosition();
    showSecondOverlay.value = true;
  } else {
    // 如果没有智能体，直接显示信息提示条
    showInfoBar.value = true;
  }
}

/**
 * 关闭第二个蒙层提示（点击"知道了"按钮）
 * - 第二个蒙层消失
 * - 信息提示条出现
 */
function handleSecondOverlayDismiss() {
  showSecondOverlay.value = false;
  showInfoBar.value = true;
}

/**
 * 关闭信息提示条
 */
function handleInfoBarDismiss() {
  showInfoBar.value = false;
}

// 生命周期钩子
onLoad(() => {
  loadPublicAgents();
  setStatusBarHeight();
});

onShow(() => {
  showBindDrawer.value = false;

  // TODO: 临时重置引导状态，需要测试时取消注释
  // resetUserGuideState();
  // console.log('[Square] 已重置用户引导状态');

  // 页面显示时刷新数据
  loadPublicAgents();
  refreshSquareGuideState();
  updateSquareTabBadge();
  // 隐藏系统 TabBar（解决微信小程序 iOS 双重导航栏问题）
  uni.hideTabBar({ animation: false });
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

    // 确保语言缓存已加载，以便 backendLangToLangCode 能正确映射
    await initLanguageDisplayNameCache();

    // 使用 language: all 获取所有公开智能体
    const res = await agentApi.getPublicAgents('all');
    console.log('[Square] 获取所有公开助手:', res);
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
      allAgents.value = (res.data || []).map((agent: Agent) => {
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

        // 优先使用 config 中的 langCode，因为它比顶级 lang 字段更稳定且始终存在
        const langSource =
          agent.config?.langCode || (Array.isArray(agent.lang) ? agent.lang[0] : agent.lang) || '';
        const langCodes = langSource ? [backendLangToLangCode(langSource)] : [];

        return {
          ...agent,
          id: agent.id,
          name: agent.agentName,
          description:
            agent.description || agent.config?.systemPrompt || $t('square.no_description'),
          voiceName: agent.config?.voiceName || $t('square.default'),
          creatorName: agent.userName || $t('square.anonymous'),
          agentId: agent.agentId,
          modalTag: modalTag,
          langCodes: langCodes // 转换为前端标准 langCode 数组
        } as SquareAgent;
      });

      // 提取所有智能体中存在的语言
      await extractAvailableLanguages();

      // 设置默认语言（如果还没有选择）
      if (!selectedLanguage.value) {
        initDefaultLanguage();
      }

      // 根据选择的语言筛选智能体
      filterAgentsByLanguage();
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

// 从所有智能体中提取存在的语言
async function extractAvailableLanguages() {
  const langSet = new Set<string>();

  // 收集所有智能体的语言
  allAgents.value.forEach((agent) => {
    if (agent.langCodes && Array.isArray(agent.langCodes)) {
      agent.langCodes.forEach((langCode: string) => {
        langSet.add(langCode);
      });
    }
  });

  // 获取完整的语言选项列表
  const allLangOptions = await getChatLanguageOptions();

  // 筛选出智能体中存在的语言，并映射为 { label, langCode } 格式
  availableLanguages.value = allLangOptions
    .filter((opt) => langSet.has(opt.langCode))
    .map((opt) => ({ language: opt.language, langCode: opt.langCode }));

  console.log('[Square] 可用语言:', availableLanguages.value);
}

// 初始化默认语言选择
function initDefaultLanguage() {
  const systemLangCode = getSystemLangCode();
  console.log('[Square] 系统语言:', systemLangCode);

  // 提取系统语言的短格式（zh_CN -> zh, en_US -> en）
  const systemLangShort = systemLangCode.split('_')[0].toLowerCase();

  // 检查系统语言是否在可用语言中（支持短格式和长格式匹配）
  const matchedLang = availableLanguages.value.find((opt) => {
    const optLangShort = opt.langCode.split('_')[0].toLowerCase();
    return opt.langCode === systemLangCode || optLangShort === systemLangShort;
  });

  if (matchedLang) {
    selectedLanguage.value = matchedLang.langCode;
  } else {
    // 回退到英文（支持 en 或 en_US 格式）
    const englishLang = availableLanguages.value.find((opt) => {
      const optLangShort = opt.langCode.split('_')[0].toLowerCase();
      return opt.langCode === 'en_US' || opt.langCode === 'en' || optLangShort === 'en';
    });
    if (englishLang) {
      selectedLanguage.value = englishLang.langCode;
    } else if (availableLanguages.value.length > 0) {
      // 如果连英文都没有，选择第一个可用语言
      selectedLanguage.value = availableLanguages.value[0].langCode;
    }
  }

  console.log('[Square] 默认选择语言:', selectedLanguage.value);
}

// 根据选择的语言筛选智能体
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

// 选择语言
function selectLanguage(langCode: string) {
  selectedLanguage.value = langCode;
  showLanguagePicker.value = false;
  filterAgentsByLanguage();
}

// 获取当前选中语言的显示名称
const selectedLanguageLabel = computed(() => {
  const found = availableLanguages.value.find((opt) => opt.langCode === selectedLanguage.value);
  return found ? found.language : $t('square.select_language');
});

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
  background: linear-gradient(180deg, #eff2ff 0%, #ffffff 124.53%);
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
  min-height: 88rpx;
  padding: 16rpx 0;
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

.search-box::before {
  content: '';
  position: absolute;
  left: 42rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 32rpx;
  height: 32rpx;
  background: url('/static/icons/search.svg') no-repeat center center;
  background-size: contain;
  z-index: 1;
  pointer-events: none;
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

/* 搜索框 placeholder 样式 - 与语言选择器文字颜色一致 */
.search-input::placeholder {
  color: #374151;
  opacity: 1;
}

/* 微信小程序 placeholder 样式 */
.search-input .uni-input-placeholder,
.search-input .input-placeholder {
  color: #374151;
}

/* 语言选择器样式 - 与搜索框风格统一 */
.language-selector-container {
  padding: 0 40rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 100;
}

.language-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 40rpx 0 42rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.1);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.language-selector:active {
  transform: scale(0.98);
}

.language-selector.expanded {
  border-color: rgba(100, 100, 255, 0.3);
  box-shadow: 0 16rpx 64rpx rgba(100, 100, 255, 0.15);
}

.language-selector-inner {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.language-icon {
  font-size: 32rpx;
  opacity: 0.7;
}

.language-label {
  font-size: 32rpx;
  font-weight: 400;
  color: #374151;
}

.language-arrow-wrapper {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.language-arrow-wrapper.rotated {
  transform: rotate(180deg);
}

.language-arrow {
  width: 24rpx;
  height: 24rpx;
  opacity: 0.5;
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 12rpx);
  left: 40rpx;
  right: 40rpx;
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
  z-index: 101;
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
  color: #2563eb;
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
  background: #2563eb;
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
  justify-content: center;
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

.agent-description {
  font-style: normal;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #60718b;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  width: 100%;
  word-wrap: break-word;
  word-break: break-all;
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
.config-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 16rpx;
  min-width: 128rpx;
  width: auto;
  height: 64rpx;
  background: #3e5def;
  border-radius: 16rpx;
  border: none;
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.btn-text {
  font-style: normal;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: #ffffff;
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
  color: #335cff;
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
  /* 非全面屏手机需要足够的基础高度避免被 tabbar 遮挡 */
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
  background: #335cff;
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

/* ========== 新引导系统样式 ========== */

/* 蒙层提示 */
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
  /* 使用 bottom 定位，避免在非全面屏手机上被遮挡 */
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
  width: 468rpx;
  height: 224rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
  background: #0166ff;
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

/* 第二个蒙层提示 */
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
  background: #0166ff;
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

/* 信息提示条（固定在底部tab上方） */
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
  z-index: 99;
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
  color: #3e5def;
}
</style>
