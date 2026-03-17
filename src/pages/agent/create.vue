<template>
  <wd-toast />
  <view class="container">
    <view class="agent-create-navbar">
      <view class="agent-create-status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="agent-create-nav-content" :style="{ height: navBarHeight + 'px' }">
        <view class="agent-create-nav-left" @click="handleBack">
          <wd-icon name="arrow-left" size="44rpx" color="#0f172a" />
        </view>
        <text class="agent-create-nav-title">{{ $t('create_agent.page_title') }}</text>
        <view class="agent-create-nav-right">
          <!-- 右侧空白占位 -->
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-content">
      <!-- Card 1: Agent Name (inline layout) -->
      <view class="card name-card">
        <view class="form-item name-item">
          <view class="label-row">
            <text class="label">{{ $t('create_agent.agent_name') }}</text>
            <text class="required-star">*</text>
          </view>
          <input
            class="input name-input"
            v-model="formData.agentName"
            :placeholder="$t('create_agent.agent_name_placeholder')"
            placeholder-class="input-placeholder"
            maxlength="20" />
          <text class="use-template-btn" @click="openTemplateModal">
            {{ $t('create_agent.use_template') }}
          </text>
        </view>
      </view>

      <!-- Card 2: Description -->
      <view class="card desc-card">
        <view class="form-item">
          <text class="label">{{ $t('create_agent.agent_description') }}</text>
          <AgentPromptPolish
            v-model="formData.systemPrompt"
            class="agent-prompt-polish"
            placeholder-key="create_agent.agent_description_placeholder" />
        </view>
      </view>

      <!-- Card 3: Settings (Model, Language, Voice) -->
      <view class="card">
        <view class="form-item">
          <text class="label">{{ $t('create_agent.llm_type') }}</text>
          <picker
            @click="handleLLMPickerClick"
            mode="selector"
            :range="llmOptions"
            range-key="displayName"
            :value="selectedLLMIndex"
            @change="onLLMChange">
            <view class="selector-trigger">
              <text v-if="loadingLLMs">{{ $t('common.loading') }}</text>
              <text v-else-if="selectedLLM" class="value-text">
                {{ selectedLLM.displayName || selectedLLM.name }}
              </text>
              <text v-else-if="llmOptions.length === 0" class="placeholder-text">
                {{ $t('create_agent.llm_load_failed') }}
              </text>
              <text v-else class="placeholder-text">{{ $t('create_agent.select_llm') }}</text>
              <view class="arrow-icon"></view>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">{{ $t('create_agent.chat_language') }}</text>
          <picker
            mode="selector"
            :range="chatLanguageOptions"
            range-key="language"
            :value="selectedChatLanguageIndex"
            @change="onChatLanguageChange">
            <view class="selector-trigger">
              <text v-if="loadingLanguages">{{ $t('common.loading') }}</text>
              <text v-else-if="selectedChatLanguage" class="value-text">
                {{ selectedChatLanguage.language }}
              </text>
              <text v-else class="placeholder-text">
                {{ $t('create_agent.select_chat_language') }}
              </text>
              <view class="arrow-icon"></view>
            </view>
          </picker>
        </view>

        <view class="form-item last-item">
          <text class="label">{{ $t('create_agent.voice_type') }}</text>
          <view class="selector-trigger" @click="showVoiceSelector">
            <text v-if="loadingVoices">{{ $t('common.loading') }}</text>
            <text v-else-if="selectedVoice" class="value-text">{{ selectedVoice.voiceName }}</text>
            <text v-else-if="voiceOptions.length === 0" class="placeholder-text">
              {{ $t('create_agent.voice_load_failed') }}
            </text>
            <text v-else class="placeholder-text">{{ $t('create_agent.select_voice') }}</text>
            <view class="arrow-icon"></view>
          </view>
        </view>
      </view>

      <!-- Buttons moved inside scroll-view -->
      <view class="actions-inline">
        <button
          class="create-btn"
          hover-class="none"
          @click="createAgent"
          :disabled="!canCreate || creating"
          :loading="creating">
          {{ creating ? $t('create_agent.creating') : $t('create_agent.create') }}
        </button>
        <!-- <button 
          class="cancel-btn" 
          hover-class="none"
          @click="handleCancel"
          :disabled="creating">
          {{ $t('common.cancel') }}
        </button> -->
      </view>

      <!-- Spacer for bottom balance -->
      <view class="bottom-spacer-small"></view>
    </scroll-view>

    <!-- 模板选择弹窗 -->
    <AgentTemplateSelector
      v-model:visible="templateModalVisible"
      :template-categories="templateCategories"
      :filtered-templates="filteredTemplates"
      :selected-template-lang="selectedTemplateLang"
      :loading="loadingTemplates"
      @select-category="selectTemplateCategory"
      @select-template="handleApplyTemplate" />

    <!-- 音色选择弹窗 -->
    <VoiceSelector
      :visible="voiceSelectorVisible"
      :voices="voiceOptions"
      :defaultVoice="selectedVoice"
      :isOnTabbarPage="false"
      :fixedLanguage="currentVoiceLanguage"
      @close="hideVoiceSelector"
      @confirm="onVoiceSelected" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi, voiceApi } from '@/api/index';
import VoiceSelector from '@/components/VoiceSelector.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { onLoad, onShow, onHide } from '@dcloudio/uni-app';
import type { LLM, Voice } from '@/pages/agent/types';
import { PageMap, Pages } from '@/utils/route';
import { loadOptions } from './create';
import { relocalizeLLMOptions } from './llm';
import {
  getChatLanguageOptions,
  langCodeToVoiceLanguage,
  type ChatLanguageOption
} from './lang_opts';
import AgentPromptPolish from './components/AgentPromptPolish.vue';
import { useTemplateSelector } from './composables/useTemplateSelector';
import { applyTemplateLogic } from './composables/useApplyTemplate';
import AgentTemplateSelector from './components/AgentTemplateSelector.vue';

const { t: $t, locale } = useI18n();
const toast = useToast();

// 响应式数据
const formData = ref({
  agentName: '',
  systemPrompt: '',
  ttsVoiceId: '',
  llmModelId: '',
  langCode: '', // 默认为空，用户必须手动选择
  language: '' // 默认为空
});

const creating = ref(false);
const loadingVoices = ref(true);
const loadingLLMs = ref(true);
const llmOptions = ref<Array<LLM & { rawName?: string; displayName?: string }>>([]);
const selectedLLM = ref<(LLM & { rawName?: string; displayName?: string }) | null>(null);
const selectedLLMIndex = ref<number | null>(null);
const selectedVoice = ref<Voice | null>(null);
const voiceOptions = ref<Voice[]>([]);
const voiceSelectorVisible = ref(false);
const statusBarHeight = ref(44);
const navBarHeight = ref(44);

// 使用模板选择 composable
const {
  templateModalVisible,
  templateCategories,
  filteredTemplates,
  loadingTemplates,
  selectedTemplateLang,
  openTemplateModal,
  selectTemplateCategory
} = useTemplateSelector(formData, $t, toast);
const navContentStyle = computed(() => ({
  height: `${navBarHeight.value * 2}rpx`
}));

// 对话语言选项
const chatLanguageOptions = ref<ChatLanguageOption[]>([]);
const loadingLanguages = ref(false);

const selectedChatLanguageIndex = ref<number | null>(null); // 默认未选择
const selectedChatLanguage = computed(() =>
  selectedChatLanguageIndex.value !== null
    ? chatLanguageOptions.value[selectedChatLanguageIndex.value]
    : null
);

// 加载语言选项
async function loadLanguageOptions() {
  try {
    loadingLanguages.value = true;
    chatLanguageOptions.value = await getChatLanguageOptions();
  } catch (error) {
    console.error('加载语言选项失败:', error);
  } finally {
    loadingLanguages.value = false;
  }
}

// 当前选择的语言对应的音色语言代码（用于 VoiceSelector 强制筛选）
const currentVoiceLanguage = computed(() => {
  if (!formData.value.langCode) return '';

  // 从已加载的语言选项中查找对应的 voiceLanguage
  const selectedLang = chatLanguageOptions.value.find(
    (lang) => lang.langCode === formData.value.langCode
  );

  // 如果找到了，直接使用 voiceLanguage；否则使用兜底函数
  return selectedLang?.voiceLanguage || langCodeToVoiceLanguage(formData.value.langCode);
});

// 模板创建模式
const id = ref<number | null>(null);
const agentId = ref<string | null>(null);
const loadingAgent = ref(false);

// 计算属性
const canCreate = computed(() => {
  return (
    formData.value.agentName.trim().length > 0 &&
    formData.value.langCode && // 对话语言必须被选择
    selectedVoice.value &&
    selectedLLM.value &&
    voiceOptions.value.length > 0 &&
    llmOptions.value.length > 0 &&
    !creating.value &&
    !loadingVoices.value &&
    !loadingLLMs.value
  );
});

// 生命周期钩子
onLoad(async (options: any) => {
  setStatusBarHeight();
  // 设置页面标题
  uni.setNavigationBarTitle({
    title: $t('create_agent.page_title')
  });

  await loadLanguageOptions();
  await loadLLMOptions();
  await loadVoiceOptions();
});

watch(
  () => locale.value,
  async () => {
    if (llmOptions.value.length === 0) {
      return;
    }
    const localized = relocalizeLLMOptions(llmOptions.value, $t);
    llmOptions.value = localized;

    if (selectedLLMIndex.value !== null) {
      selectedLLM.value = localized[selectedLLMIndex.value] ?? null;
    } else if (selectedLLM.value) {
      const matchedIndex = localized.findIndex((item) => item.id === selectedLLM.value?.id);
      selectedLLMIndex.value = matchedIndex !== -1 ? matchedIndex : null;
      selectedLLM.value = matchedIndex !== -1 ? localized[matchedIndex] : null;
    }
  }
);

onShow(async () => {
  // 隐藏系统 TabBar（解决微信小程序 iOS 双重导航栏问题）
  uni.hideTabBar({ animation: false });
  await checkTemplate();
});

onHide(() => {
  // 离开页面时立即关闭弹窗，避免切回时才消失的奇怪感
  if (templateModalVisible.value) {
    templateModalVisible.value = false;
  }
});

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

async function checkTemplate() {
  const pageOptions = loadOptions();
  if (pageOptions.agentId) {
    //  以智能体为模板创建
    id.value = pageOptions.id;
    agentId.value = pageOptions.agentId;
    console.log('以智能体为模板 agentId:', agentId.value, 'id:', id.value);

    await loadAgentData();
  }
}

// 加载智能体数据
async function loadAgentData() {
  try {
    loadingAgent.value = true;
    const result = await agentApi.getInfo(id.value);

    if (result.code === 1000 && result.data) {
      const agent = result.data;
      formData.value.agentName = agent.agentName || '';

      // 从config中获取配置信息
      if (agent.config) {
        formData.value.systemPrompt = agent.config.systemPrompt || '';

        // 设置LLM选择
        if (agent.config.llmModelId && llmOptions.value.length > 0) {
          const llmIndex = llmOptions.value.findIndex(
            (llm: LLM) => llm.id === agent.config.llmModelId
          );
          if (llmIndex !== -1) {
            selectedLLMIndex.value = llmIndex;
            selectedLLM.value = llmOptions.value[llmIndex];
            formData.value.llmModelId = llmOptions.value[llmIndex].id;
          }
        }

        // 设置音色选择
        if (agent.config.ttsVoiceId && voiceOptions.value.length > 0) {
          const voice = voiceOptions.value.find(
            (v: Voice) => v.voiceId === agent.config.ttsVoiceId || v.id === agent.config.ttsVoiceId
          );
          // 若可见对应音色，则选中该音色
          if (voice && (voice.voiceId || voice.id)) {
            selectedVoice.value = voice;
            formData.value.ttsVoiceId = voice.voiceId;
            // 否则选中第一个音色
          } else if (voiceOptions.value.length > 0) {
            selectedVoice.value = voiceOptions.value[0];
            formData.value.ttsVoiceId = voiceOptions.value[0].voiceId;
          }
        }
      }
    } else {
      if (result.message?.includes('没有权限')) {
        toast.error({
          msg: $t('edit_agent.no_permission'),
          duration: 2000
        });
      } else {
        toast.error({
          msg: $t('edit_agent.load_agent_failed'),
          duration: 2000
        });
      }
    }
  } catch (error) {
    console.error('加载智能体数据失败:', error);
  } finally {
    loadingAgent.value = false;
  }
}
// 加载llm选项
async function loadLLMOptions() {
  try {
    loadingLLMs.value = true;
    const result = await agentApi.getLLMlist();

    if (result.code === 1000 && result.data.llm && result.data.llm.length > 0) {
      llmOptions.value = relocalizeLLMOptions(result.data.llm, $t);

      // 选中第一个
      if (llmOptions.value.length > 0) {
        selectedLLMIndex.value = 0;
        selectedLLM.value = llmOptions.value[0];
        formData.value.llmModelId = llmOptions.value[0].id;
      }
    }
  } catch (error) {
    llmOptions.value = [];
    selectedLLMIndex.value = null;
    selectedLLM.value = null;
    formData.value.llmModelId = '';

    toast.warning({
      msg: $t('create_agent.llm_load_failed_retry'),
      duration: 2000
    });
  } finally {
    loadingLLMs.value = false;
  }
}

// 加载音色选项
async function loadVoiceOptions() {
  try {
    loadingVoices.value = true;
    const result = await voiceApi.getVisibleVoices();
    if (result.code === 1000 && result.data.voices && result.data.voices.length > 0) {
      voiceOptions.value = result.data.voices
        // 保留平台音色与状态为Success的自定义音色
        .filter((v: Voice) => !v.customVoice || v.state === 'Success')
        .map((item: Voice) => ({
          ...item,
          demo: item.demoUrl
        }));

      // 不再自动选中第一个音色，用户必须手动选择
    } else {
      // 如果接口失败，清空音色选项
      voiceOptions.value = [];
      selectedVoice.value = null;
      formData.value.ttsVoiceId = '';

      toast.warning({
        msg: $t('create_agent.voice_load_failed_retry'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('加载音色列表失败:', error);

    // 网络错误时清空音色选项
    voiceOptions.value = [];
    selectedVoice.value = null;
    formData.value.ttsVoiceId = '';
  } finally {
    loadingVoices.value = false;
  }
}

function showVoiceSelector() {
  console.log('showVoiceSelector', voiceOptions.value);
  if (loadingVoices.value) return;

  // 必须先选择对话语言
  if (!formData.value.langCode) {
    toast.warning({
      msg: $t('create_agent.select_language_first'),
      duration: 2000
    });
    return;
  }

  // 如果音色选项为空，重新加载
  if (voiceOptions.value.length === 0) {
    loadVoiceOptions();
    return;
  }

  voiceSelectorVisible.value = true;
}

function hideVoiceSelector() {
  voiceSelectorVisible.value = false;
}

function onVoiceSelected(voice: Voice) {
  selectedVoice.value = voice;
  formData.value.ttsVoiceId = voice.voiceId;
  voiceSelectorVisible.value = false;
}

function onLLMChange(e: { detail: { value: number } }) {
  console.log('选择的LLM:', e.detail.value);
  selectedLLMIndex.value = e.detail.value;
  selectedLLM.value = llmOptions.value[e.detail.value];
  formData.value.llmModelId = llmOptions.value[e.detail.value].id;
}

function onChatLanguageChange(e: { detail: { value: number } }) {
  console.log('选择的对话语言:', e.detail.value);
  selectedChatLanguageIndex.value = e.detail.value;
  const selected = chatLanguageOptions.value[e.detail.value];
  formData.value.langCode = selected.langCode;
  formData.value.language = selected.language;

  // 语言改变时，重置当前选择的音色，让用户重新选择对应该语言的音色
  selectedVoice.value = null;
  formData.value.ttsVoiceId = '';
}

function handleLLMPickerClick() {
  console.log('handleLLMPickerClick');
  if (loadingLLMs.value) return;
  if (llmOptions.value.length === 0) {
    loadLLMOptions();
    return;
  }
}

async function createAgent() {
  if (!canCreate.value) return;

  creating.value = true;

  try {
    const result = await agentApi.create(formData.value);

    if (result.code === 1000) {
      toast.success({
        msg: $t('create_agent.create_success'),
        duration: 2000,
        cover: true
      });

      // 清理表单数据
      formData.value = {
        agentName: '',
        systemPrompt: '',
        ttsVoiceId: '',
        llmModelId: '',
        langCode: '',
        language: ''
      };
      selectedVoice.value = null;
      selectedLLMIndex.value = null;
      selectedLLM.value = null;
      selectedChatLanguageIndex.value = null;

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      toast.warning({
        msg: result.message || $t('create_agent.create_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('创建智能体失败:', error);
  } finally {
    creating.value = false;
  }
}

function handleCancel() {
  uni.navigateBack();
}

// 返回上一页
function handleBack() {
  uni.navigateBack();
}

// 处理模板应用
async function handleApplyTemplate(template: any) {
  templateModalVisible.value = false;
  await applyTemplateLogic(
    template,
    formData,
    llmOptions,
    chatLanguageOptions,
    voiceOptions,
    selectedLLMIndex,
    selectedLLM,
    selectedChatLanguageIndex,
    selectedVoice,
    toast,
    $t
  );
}
</script>

<style>
.container {
  padding: 0;
  min-height: calc(100vh - var(--window-top));
  background: linear-gradient(180deg, var(--color-primary-bg) 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 安卓端如果 env() 为 0，padding 会过小，强制保底 48rpx */
@media screen and (min-width: 0px) {
  .container {
    padding-bottom: calc(max(48rpx, 32rpx + env(safe-area-inset-bottom)));
  }
}

.agent-create-navbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--color-primary-bg); /* Match page gradient top */
}

.agent-create-status-bar {
  width: 100%;
}

.agent-create-nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  position: relative;
}

.agent-create-nav-left {
  flex: 0 0 120rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  padding-left: 8rpx;
}

.agent-create-nav-right {
  flex: 0 0 120rpx; /* Increased to fit icons */
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}

.agent-create-nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #0f172a;
}

.scroll-content {
  flex: 1;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.02);
}

.form-item {
  margin-bottom: 32rpx;
}
.form-item:last-child {
  margin-bottom: 0;
}
.card .form-item.last-item {
  margin-bottom: 0;
}

/* Name Card: Inline layout - label and input on same row */
.name-card {
  padding: 28rpx 32rpx;
}
.name-card .name-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 0;
}
.name-card .label-row {
  margin-bottom: 0;
  margin-right: 16rpx;
  flex-shrink: 0;
  height: 48rpx;
  display: flex;
  align-items: center;
}
.name-card .name-input {
  flex: 1;
  text-align: left;
  height: 48rpx;
  line-height: 48rpx;
  display: flex;
  align-items: center;
}

/* Description Card */
.desc-card .label {
  margin-bottom: 16rpx;
}

/* 覆盖 AgentPromptPolish 组件中的样式，使其字体和光标颜色一致 */
.desc-card .agent-prompt-polish .textarea {
  min-height: 120rpx;
  font-size: 30rpx;
  line-height: 1.5;
  color: #1a1a1a;
  caret-color: var(--color-primary-caret);
}

/* 移除对组件内部 wrapper 的强制边框覆盖（如果需要），
   由于组件自带边框，这里我们可以让它在卡片内更自然地呈现 */
.desc-card .agent-prompt-polish .textarea-wrapper {
  border-color: #f1f5f9; /* 稍微淡化一下组件的边框，更符合 card 整体风格 */
}

.desc-card .agent-prompt-polish .textarea::placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

.label-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 16rpx;
}
.label-row .label {
  margin-bottom: 0;
}

.required-star {
  color: #ff4d4f;
  margin-left: 8rpx;
  font-size: 30rpx;
}

/* Modern Input Styles - No background for Name and Description cards */
.input {
  width: 100%;
  height: auto;
  min-height: 48rpx;
  padding: 0;
  border-radius: 0;
  font-size: 30rpx;
  background: transparent;
  color: #1a1a1a;
  box-sizing: border-box;
  caret-color: var(--color-primary-caret);
  border: none;
}
.input-placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

/* textarea 样式已在 AgentPromptPolish 组件中定义 */

.selector-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 96rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #f7f8fa;
  font-size: 30rpx;
  box-sizing: border-box;
}
.selector-trigger:active {
  background: #eff0f4;
}

.value-text {
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.placeholder-text {
  color: #c0c4cc;
  font-size: 28rpx;
}

.arrow-icon {
  width: 32rpx;
  height: 32rpx;
  background: url('@/static/icons/right-arrow.svg') no-repeat center;
  background-size: contain;
  opacity: 0.4;
}

.bottom-spacer {
  height: 280rpx;
}

.actions-inline {
  padding: 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.bottom-spacer-small {
  height: 48rpx;
}

.use-template-btn {
  font-size: 26rpx;
  color: var(--color-primary);
  margin-left: 16rpx;
  background: var(--color-primary-bg);
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  font-weight: 500;
  flex-shrink: 0;
}
.use-template-btn:active {
  opacity: 0.7;
}

.create-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--color-primary);
  color: #ffffff !important;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.create-btn::after {
  border: none;
}
.create-btn[disabled],
.create-btn[loading] {
  background: var(--color-primary-disabled) !important;
  color: rgba(255, 255, 255, 0.8) !important;
  opacity: 1;
}
.create-btn:active {
  transform: scale(0.98);
  background: var(--color-primary);
  color: #ffffff !important;
}

.cancel-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--color-primary-secondary-bg);
  color: var(--color-primary-secondary-text);
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cancel-btn::after {
  border: none;
}
.cancel-btn[disabled] {
  background: var(--color-primary-disabled-bg) !important;
  color: var(--color-primary-disabled-text) !important;
  opacity: 1;
}
.cancel-btn:active {
  transform: scale(0.98);
  background: var(--color-primary-secondary-bg);
  color: var(--color-primary-secondary-text) !important;
}
</style>
