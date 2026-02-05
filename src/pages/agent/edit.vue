<template>
  <wd-toast />
  <view class="container">
    <view class="agent-create-navbar">
      <view class="agent-create-status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="agent-create-nav-content" :style="{ height: navBarHeight + 'px' }">
        <view class="agent-create-nav-left">
          <view class="back-btn" @click="goBack">
            <wd-icon name="chevron-left" custom-class="back-icon" />
          </view>
        </view>
        <text class="agent-create-nav-title">{{ $t('edit_agent.page_title') }}</text>
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
            <text class="label">{{ $t('edit_agent.agent_name') }}</text>
            <text class="required-star">*</text>
          </view>
          <input
            class="input name-input"
            v-model="formData.agentName"
            :placeholder="$t('edit_agent.agent_name_placeholder')"
            placeholder-class="input-placeholder"
            maxlength="20" />
          <text class="use-template-btn" @click="openTemplateModal">{{ $t('create_agent.use_template') }}</text>
        </view>
      </view>

      <!-- Card 2: Description -->
      <view class="card desc-card">
        <view class="form-item">
          <text class="label">{{ $t('edit_agent.agent_description') }}</text>
          <AgentPromptPolish
            v-model="formData.systemPrompt"
            class="agent-prompt-polish"
            placeholder-key="edit_agent.agent_description_placeholder"
          />
        </view>
      </view>

      <!-- Card 3: Settings (Model, Language, Voice) -->
      <view class="card">
        <view class="form-item">
          <text class="label">{{ $t('edit_agent.llm_type') }}</text>
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
                {{ $t('edit_agent.llm_load_failed') }}
              </text>
              <text v-else class="placeholder-text">{{ $t('edit_agent.select_llm') }}</text>
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
              <text v-else-if="selectedChatLanguage" class="value-text">{{ selectedChatLanguage.language }}</text>
              <text v-else class="placeholder-text">{{ $t('create_agent.select_chat_language') }}</text>
              <view class="arrow-icon"></view>
            </view>
          </picker>
        </view>

        <view class="form-item last-item">
          <text class="label">{{ $t('edit_agent.voice_type') }}</text>
          <view class="selector-trigger" @click="showVoiceSelector">
            <text v-if="loadingVoices">{{ $t('common.loading') }}</text>
            <text v-else-if="selectedVoice" class="value-text">{{ selectedVoice.voiceName || selectedVoice.name }}</text>
            <text v-else-if="voiceOptions.length === 0" class="placeholder-text">
              {{ $t('edit_agent.voice_load_failed') }}
            </text>
            <text v-else class="placeholder-text">{{ $t('edit_agent.select_voice') }}</text>
            <view class="arrow-icon"></view>
          </view>
        </view>
      </view>

      <!-- Buttons moved inside scroll-view -->
      <view class="actions-inline">
        <button
          class="update-btn"
          hover-class="none"
          @click="updateAgent"
          :disabled="!canUpdate || updating"
          :loading="updating">
          {{ updating ? $t('edit_agent.updating') : $t('edit_agent.update_agent') }}
        </button>
        <button
          class="cancel-btn"
          hover-class="none"
          @click="goBack"
          :disabled="updating">
          {{ $t('common.cancel') }}
        </button>
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
import { onLoad } from '@dcloudio/uni-app';
import type { LLM, Voice } from '@/pages/agent/types';
import { relocalizeLLMOptions } from './llm';
import { getChatLanguageOptions, langCodeToVoiceLanguage, type ChatLanguageOption } from './lang_opts';
import AgentPromptPolish from './components/AgentPromptPolish.vue';
import { useTemplateSelector } from './composables/useTemplateSelector';
import { applyTemplateLogic } from './composables/useApplyTemplate';
import AgentTemplateSelector from './components/AgentTemplateSelector.vue';
import WdIcon from '@/uni_modules/wot-design-uni/components/wd-icon/wd-icon.vue';

const { t: $t, locale } = useI18n();
const toast = useToast();

// 响应式数据
const formData = ref({
  agentName: '',
  systemPrompt: '',
  ttsVoiceId: '',
  llmModelId: '',
  langCode: '',      // 改为空字符串，由 loadAgentData() 设置
  language: ''
});

const updating = ref(false);
const loadingVoices = ref(true);
const loadingLLMs = ref(true);
const llmOptions = ref<Array<LLM & { rawName?: string; displayName?: string }>>([]);
const selectedLLM = ref<(LLM & { rawName?: string; displayName?: string }) | null>(null);
const selectedLLMIndex = ref<number | null>(null);
const selectedVoice = ref<any | null>(null);
const voiceOptions = ref<any[]>([]);
const voiceSelectorVisible = ref(false);
const statusBarHeight = ref(44);
const navBarHeight = ref(44);

// 对话语言选项
const chatLanguageOptions = ref<ChatLanguageOption[]>([]);
const loadingLanguages = ref(false);

const selectedChatLanguageIndex = ref<number | null>(null);  // 改为 null，与创建页一致
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
    lang => lang.langCode === formData.value.langCode
  );
  
  // 如果找到了，直接使用 voiceLanguage；否则使用兜底函数
  return selectedLang?.voiceLanguage || langCodeToVoiceLanguage(formData.value.langCode);
});

// 编辑模式
const agentId = ref<string | null>(null);
const loadingAgent = ref(false);

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

// 计算属性
const canUpdate = computed(() => {
  return (
    formData.value.agentName.trim().length > 0 &&
    selectedVoice.value &&
    selectedLLM.value &&
    voiceOptions.value.length > 0 &&
    llmOptions.value.length > 0 &&
    !updating.value &&
    !loadingVoices.value &&
    !loadingLLMs.value
  );
});

// 生命周期钩子
onLoad(async (options: any) => {
  setStatusBarHeight();
  
  // 编辑模式必须有agentId
  if (!options.agentId) {
    toast.error({
      msg: $t('edit_agent.missing_agent_id'),
      duration: 2000
    });
    uni.navigateBack();
    return;
  }

  agentId.value = options.agentId;
  console.log('编辑智能体 agentId:', agentId.value);

  // 设置页面标题
  uni.setNavigationBarTitle({
    title: $t('edit_agent.page_title')
  });

  await loadLanguageOptions();
  await loadLLMOptions();
  await loadVoiceOptions();
  await loadAgentData();
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

// 加载智能体数据
async function loadAgentData() {
  try {
    loadingAgent.value = true;
    
    if (!agentId.value) {
      toast.error({
        msg: $t('edit_agent.missing_agent_id'),
        duration: 2000
      });
      return;
    }
    
    const result = await agentApi.getInfo(agentId.value);

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
            (v: any) => v.voiceId === agent.config.ttsVoiceId || v.id === agent.config.ttsVoiceId
          );
          if (voice && (voice.voiceId || voice.id)) {
            selectedVoice.value = voice;
            formData.value.ttsVoiceId = voice.voiceId || String(voice.id || '');
          }
        }

        // 设置对话语言
        if (agent.config.langCode) {
          formData.value.langCode = agent.config.langCode;
          formData.value.language = agent.config.language || '中文';
          const langIndex = chatLanguageOptions.value.findIndex(
            (lang) => lang.langCode === agent.config.langCode
          );
          if (langIndex !== -1) {
            selectedChatLanguageIndex.value = langIndex;
          } else {
            selectedChatLanguageIndex.value = null;
          }
        } else {
          // 如果没有 langCode，设置为 null
          selectedChatLanguageIndex.value = null;
        }
      }
    } else {
      toast.error({
        msg: $t('edit_agent.load_agent_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('加载智能体数据失败:', error);
    // 不再显示toast，因为request.ts已经处理了
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

      if (llmOptions.value.length > 0 && selectedLLMIndex.value === null) {
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

    toast.error({
      msg: $t('edit_agent.llm_load_failed_retry'),
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
        .map((item: any) => ({
          ...item,
          demo: item.demo || item.demoUrl || item.audioUrl || ''
        }));
    } else {
      // 如果接口失败，清空音色选项
      voiceOptions.value = [];
      selectedVoice.value = null;
      formData.value.ttsVoiceId = '';

      toast.warning({
        msg: $t('edit_agent.voice_load_failed_retry'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('加载音色列表失败:', error);

    // 网络错误时清空音色选项
    voiceOptions.value = [];
    selectedVoice.value = null;
    formData.value.ttsVoiceId = '';

    // 不再显示toast，因为request.ts已经处理了
  } finally {
    loadingVoices.value = false;
  }
}

function showVoiceSelector() {
  if (loadingVoices.value) return;

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

function onVoiceSelected(voice: any) {
  selectedVoice.value = voice;
  formData.value.ttsVoiceId = voice.voiceId || String((voice as any).id || '');
  voiceSelectorVisible.value = false;
}

function onLLMChange(e: { detail: { value: number } }) {
  console.log('选择的LLM:', e.detail.value);
  selectedLLMIndex.value = e.detail.value;
  selectedLLM.value = llmOptions.value[e.detail.value];
  formData.value.llmModelId = llmOptions.value[e.detail.value].id;
}

function handleLLMPickerClick() {
  console.log('handleLLMPickerClick');
  if (loadingLLMs.value) return;
  if (llmOptions.value.length === 0) {
    loadLLMOptions();
    return;
  }
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

async function updateAgent() {
  if (!canUpdate.value) return;

  updating.value = true;

  try {
    const result = await agentApi.updateConfig({
      agentId: agentId.value,
      ...formData.value
    });

    if (result.code === 1000) {
      toast.success({
        msg: $t('edit_agent.update_success'),
        duration: 2000,
        cover: true
      });

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } else {
      toast.warning({
        msg: result.message || $t('edit_agent.update_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('更新智能体失败:', error);
    // 不再显示toast，因为request.ts已经处理了
  } finally {
    updating.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

// 一键润色逻辑已抽离到 AgentPromptPolish 组件中
</script>

<style>
.container {
  padding: 0;
  min-height: calc(100vh - var(--window-top));
  background: linear-gradient(180deg, #EFF2FF 0%, #FFFFFF 100%);
  display: flex;
  flex-direction: column;
  padding-bottom: calc(104rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 安卓端如果 env() 为 0，padding 会过小，强制保底 160rpx */
@media screen and (min-width: 0px) {
  .container {
    padding-bottom: calc(max(160rpx, 104rpx + env(safe-area-inset-bottom)));
  }
}

.agent-create-navbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: #EFF2FF; /* Match page gradient top */
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
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
}

.back-icon {
  font-size: 40rpx;
  color: #0f172a;
}

.agent-create-nav-right {
  flex: 0 0 120rpx;
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
  caret-color: #5b75fb;
}

.desc-card .agent-prompt-polish .textarea-wrapper {
  border-color: #f1f5f9;
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
  caret-color: #5b75fb;
  border: none;
}
.input-placeholder {
  color: #c0c4cc;
  font-size: 28rpx;
}

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
  color: #3E5DEF;
  margin-left: 16rpx;
  background: #F0F3FF;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  font-weight: 500;
  flex-shrink: 0;
}
.use-template-btn:active {
  opacity: 0.7;
}

.cancel-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: #E8ECFF;
  color: #7A8BFF;
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
  background: #F5F7FF !important;
  color: #B2BDFF !important;
  opacity: 1;
}
.cancel-btn:active {
  transform: scale(0.98);
  background: #E8ECFF;
  color: #7A8BFF !important;
}

.update-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: #3E5DEF;
  color: #ffffff !important;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.update-btn::after {
  border: none;
}
.update-btn[disabled], .update-btn[loading] {
  background: #9EB0FF !important;
  color: rgba(255, 255, 255, 0.8) !important;
  opacity: 1;
}
.update-btn:active {
  transform: scale(0.98);
  background: #3E5DEF;
  color: #ffffff !important;
}
</style>
