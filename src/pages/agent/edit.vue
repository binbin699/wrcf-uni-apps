<template>
  <wd-toast />
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="label required">{{ $t('edit_agent.agent_name') }}</text>
        <input
          class="input"
          v-model="formData.agentName"
          :placeholder="$t('edit_agent.agent_name_placeholder')"
          maxlength="20" />
      </view>

      <view class="form-item">
        <text class="label">{{ $t('edit_agent.agent_description') }}</text>
        <AgentPromptPolish
          v-model="formData.systemPrompt"
          class="agent-prompt-polish"
          placeholder-key="edit_agent.agent_description_placeholder"
        />
      </view>

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
            <text v-else-if="selectedLLM">
              {{ selectedLLM.displayName || selectedLLM.name }}
            </text>
            <text v-else-if="llmOptions.length === 0">
              {{ $t('edit_agent.llm_load_failed') }}
            </text>
            <text v-else>{{ $t('edit_agent.select_llm') }}</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">{{ $t('create_agent.chat_language') }}</text>
        <picker
          mode="selector"
          :range="chatLanguageOptions"
          range-key="label"
          :value="selectedChatLanguageIndex"
          @change="onChatLanguageChange">
          <view class="selector-trigger">
            <text>{{ selectedChatLanguage?.label || $t('create_agent.select_chat_language') }}</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">{{ $t('edit_agent.voice_type') }}</text>
        <view class="voice-selector-trigger" @click="showVoiceSelector">
          <text v-if="loadingVoices">{{ $t('common.loading') }}</text>
          <text v-else-if="selectedVoice">
            {{ selectedVoice.voiceName || selectedVoice.name }}
          </text>
          <text v-else-if="voiceOptions.length === 0">
            {{ $t('edit_agent.voice_load_failed') }}
          </text>
          <text v-else>{{ $t('edit_agent.select_voice') }}</text>
          <image class="arrow" src="/static/icons/right-arrow.svg" mode="aspectFit" />
        </view>
      </view>
    </view>

    <view class="actions">
      <button class="cancel-btn secondary" @click="goBack">{{ $t('common.cancel') }}</button>
      <button
        class="update-btn primary"
        @click="updateAgent"
        :disabled="!canUpdate"
        :loading="updating">
        {{ updating ? $t('edit_agent.updating') : $t('edit_agent.update_agent') }}
      </button>
    </view>

    <!-- 音色选择弹窗 -->
    <VoiceSelector
      :visible="voiceSelectorVisible"
      :voices="voiceOptions"
      :defaultVoice="selectedVoice"
      :fixedLanguage="currentVoiceLanguage"
      @close="hideVoiceSelector"
      @confirm="onVoiceSelected" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi, voiceApi } from '@/api/index.js';
import VoiceSelector from '@/components/VoiceSelector.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { onLoad } from '@dcloudio/uni-app';
import type { LLM, Voice } from '@/pages/agent/types';
import { relocalizeLLMOptions } from './llm';
import { getChatLanguageOptions, langCodeToVoiceLanguage } from './lang_opts';
import AgentPromptPolish from './components/AgentPromptPolish.vue';

const { t: $t, locale } = useI18n();
const toast = useToast();

// 响应式数据
const formData = ref({
  agentName: '',
  systemPrompt: '',
  ttsVoiceId: '',
  llmModelId: '',
  langCode: 'zh_CN',
  language: '中文'
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

// 对话语言选项
const chatLanguageOptions = computed(() => getChatLanguageOptions($t));

const selectedChatLanguageIndex = ref(0);
const selectedChatLanguage = computed(() => chatLanguageOptions.value[selectedChatLanguageIndex.value]);

// 当前选择的语言对应的音色语言代码（用于 VoiceSelector 强制筛选）
const currentVoiceLanguage = computed(() => langCodeToVoiceLanguage(formData.value.langCode));

// 编辑模式
const agentId = ref<string | null>(null);
const loadingAgent = ref(false);

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

  await loadLLMOptions();
  await loadVoiceOptions();
  await loadAgentData();
});

watch(
  () => locale.value,
  () => {
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
          }
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
  formData.value.langCode = chatLanguageOptions.value[e.detail.value].langCode;
  formData.value.language = chatLanguageOptions.value[e.detail.value].language;
  
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
  height: calc(100vh - var(--window-top));
  background-color: #ffffff;
}

.form-container {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  background: white;
  border-radius: 32rpx;
  padding: 48rpx 32rpx;
  margin: 32rpx;
}

.form-item {
  margin-bottom: 48rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.label.required::after {
  content: '*';
  color: var(--red-500, #fb3748);
}

.input {
  width: 100%;
  height: 96rpx;
  padding: 0 32rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  font-size: 32rpx;
  background: white;
  color: #171717;
  box-sizing: border-box;
}

.input:focus {
  border-color: #335CFF;
  background: white;
  outline: none;
}

.input::placeholder {
  color: #9ca3af;
  font-size: 32rpx;
}

/* 文本域容器与样式在 AgentPromptPolish 组件中定义 */

.picker-display,
.voice-selector-trigger,
.selector-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 96rpx;
  padding: 0 32rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  background: white url('/static/icons/right-arrow.svg') no-repeat right 32rpx center;
  background-size: 32rpx 32rpx;
  font-size: 32rpx;
  color: #111827;
  cursor: pointer;
  box-sizing: border-box;
}

.voice-selector-trigger:active,
.selector-trigger:active {
  background: #f2f2f7 url('/static/icons/right-arrow.svg') no-repeat right 32rpx center;
  background-size: 32rpx 32rpx;
}

.arrow {
  width: 32rpx;
  height: 32rpx;
}

.actions {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  padding-bottom: 32rpx;
  background: #ffffff;
}

.cancel-btn,
.update-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
}
</style>
