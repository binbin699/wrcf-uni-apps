<template>
  <wd-toast />
  <view class="container">
    <view class="agent-create-navbar">
      <view class="agent-create-status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="agent-create-nav-content" :style="{ height: navBarHeight + 'px' }">
        <view class="agent-create-nav-left">
          <view class="agent-create-nav-back" @click="handleBack">
            <view class="agent-create-nav-back-icon"></view>
          </view>
        </view>
        <text class="agent-create-nav-title">{{ $t('create_agent.page_title') }}</text>
        <view class="agent-create-nav-right"></view>
      </view>
    </view>

    <view class="form-container">
      <view class="form-item">
        <text class="label required">{{ $t('create_agent.agent_name') }}</text>
        <input
          class="input"
          v-model="formData.agentName"
          :placeholder="$t('create_agent.agent_name_placeholder')"
          maxlength="20" />
      </view>

      <view class="form-item">
        <text class="label">{{ $t('create_agent.agent_description') }}</text>
        <textarea
          class="textarea"
          v-model="formData.systemPrompt"
          :placeholder="$t('create_agent.agent_description_placeholder')"
          maxlength="2000"
          auto-height />
      </view>

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
            <text v-else-if="selectedLLM">
              {{ selectedLLM.displayName || selectedLLM.name }}
            </text>
            <text v-else-if="llmOptions.length === 0">
              {{ $t('create_agent.llm_load_failed') }}
            </text>
            <text v-else>{{ $t('create_agent.select_llm') }}</text>
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
        <text class="label">{{ $t('create_agent.voice_type') }}</text>
        <view class="selector-trigger" @click="showVoiceSelector">
          <text v-if="loadingVoices">{{ $t('common.loading') }}</text>
          <text v-else-if="selectedVoice">{{ selectedVoice.voiceName }}</text>
          <text v-else-if="voiceOptions.length === 0">
            {{ $t('create_agent.voice_load_failed') }}
          </text>
          <text v-else>{{ $t('create_agent.select_voice') }}</text>
        </view>
      </view>
    </view>

    <view class="actions">
      <button class="cancel-btn secondary" @click="handleCancel">
        {{ $t('common.cancel') }}
      </button>
      <button
        class="create-btn primary"
        @click="createAgent"
        :disabled="!canCreate"
        :loading="creating">
        {{ creating ? $t('create_agent.creating') : $t('create_agent.create_agent') }}
      </button>
    </view>

    <!-- 音色选择弹窗 -->
    <VoiceSelector
      :visible="voiceSelectorVisible"
      :voices="voiceOptions"
      :defaultVoice="selectedVoice"
      :isOnTabbarPage="true"
      :fixedLanguage="currentVoiceLanguage"
      @close="hideVoiceSelector"
      @confirm="onVoiceSelected" />
    
    <!-- 自定义 TabBar -->
    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi, voiceApi } from '@/api/index.js';
import VoiceSelector from '@/components/VoiceSelector.vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useToast } from '@/uni_modules/wot-design-uni';
import { onLoad, onShow } from '@dcloudio/uni-app';
import type { LLM, Voice } from '@/pages/agent/types';
import { PageMap, Pages } from '@/utils/route';
import { loadOptions } from './create';
import { relocalizeLLMOptions } from './llm';
import { getChatLanguageOptions, langCodeToVoiceLanguage } from './lang_opts';
import { updateSquareTabBadge } from '@/utils/tabBarBadge';

const { t: $t, locale } = useI18n();
const toast = useToast();

// 响应式数据
const formData = ref({
  agentName: '',
  systemPrompt: '',
  ttsVoiceId: '',
  llmModelId: '',
  langCode: '',      // 默认为空，用户必须手动选择
  language: ''       // 默认为空
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
const navContentStyle = computed(() => ({
  height: `${navBarHeight.value * 2}rpx`
}));

// 对话语言选项
const chatLanguageOptions = computed(() => getChatLanguageOptions($t));

const selectedChatLanguageIndex = ref<number | null>(null);  // 默认未选择
const selectedChatLanguage = computed(() => 
  selectedChatLanguageIndex.value !== null 
    ? chatLanguageOptions.value[selectedChatLanguageIndex.value] 
    : null
);

// 当前选择的语言对应的音色语言代码（用于 VoiceSelector 强制筛选）
const currentVoiceLanguage = computed(() => 
  formData.value.langCode ? langCodeToVoiceLanguage(formData.value.langCode) : ''
);

// 模板创建模式
const id = ref<number | null>(null);
const agentId = ref<string | null>(null);
const loadingAgent = ref(false);

// 计算属性
const canCreate = computed(() => {
  return (
    formData.value.agentName.trim().length > 0 &&
    formData.value.langCode &&           // 对话语言必须被选择
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

  await loadLLMOptions();
  await loadVoiceOptions();
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

onShow(async () => {
  // #ifdef APP-PLUS
  uni.hideTabBar({ animation: false });
  // #endif
  await checkTemplate();
  updateSquareTabBadge();
  // #ifdef APP-PLUS
  uni.hideTabBar({ animation: false });
  // #endif
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
      if (result.msg?.includes('没有权限')) {
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

    // 不再显示toast，因为request.ts已经处理了
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
        langCode: 'zh_CN',
        language: '中文',
      };
      selectedVoice.value = null;
      selectedLLMIndex.value = null;
      selectedLLM.value = null;
      selectedChatLanguageIndex.value = 0;

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } else {
      toast.warning({
        msg: result.message || $t('create_agent.create_failed'),
        duration: 2000
      });
    }
  } catch (error) {
    console.error('创建智能体失败:', error);
    // 不再显示toast，因为request.ts已经处理了
  } finally {
    creating.value = false;
  }
}

function handleBack() {
  uni.navigateBack({
    delta: 1,
    fail: () => {
      uni.switchTab({ url: PageMap[Pages.Index].url });
    }
  });
}

function handleCancel() {
  uni.switchTab({ url: PageMap[Pages.Index].url });
}
</script>

<style>
.container {
  padding: 0;
  min-height: calc(100vh - var(--window-top));
  background-color: #ffffff;
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
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e5e5;
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

.agent-create-nav-left,
.agent-create-nav-right {
  flex: 0 0 70rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
}

.agent-create-nav-right {
  justify-content: flex-end;
}

.agent-create-nav-back {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 56rpx;
  height: 100%;
  border-radius: 999px;
  padding-left: 6rpx;
}

.agent-create-nav-back-icon {
  width: 24rpx;
  height: 24rpx;
  border-left: 3rpx solid #1f2937;
  border-bottom: 3rpx solid #1f2937;
  transform: rotate(45deg);
  margin-left: 4rpx;
}

.agent-create-nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.textarea {
  width: 100%;
  min-height: 224rpx;
  padding: 26rpx 32rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  font-size: 32rpx;
  background: white;
  line-height: 1.4;
  color: #171717;
  box-sizing: border-box;
}

.textarea:focus {
  border-color: #335CFF;
  background: white;
  outline: none;
}

.textarea::placeholder {
  color: #9ca3af;
  font-size: 32rpx;
}

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
  box-sizing: border-box;
}

.selector-trigger:active {
  background: #f2f2f7 url('/static/icons/right-arrow.svg') no-repeat right 32rpx center;
  background-size: 32rpx 32rpx;
}

.actions {
  display: flex;
  padding: 32rpx;
  padding-bottom: 32rpx;
  background: #ffffff;
  gap: 24rpx;
}

.cancel-btn,
.create-btn {
  flex: 1 1 0;
  height: 96rpx;
  border-radius: 48rpx;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
