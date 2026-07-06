<template>
  <view class="agent-prompt-polish">
    <view class="textarea-wrapper">
      <textarea
        class="textarea"
        v-model="localPrompt"
        :placeholder="$t(placeholderKey)"
        maxlength="2000"
        auto-height
      />

      <view class="polish-container">
        <!-- 初始/可用/不可用状态 -->
        <view
          v-if="polishState === 'idle'"
          class="polish-btn"
          :class="{
            active: canPolish,
            disabled: !canPolish
          }"
          @click="handlePolish"
        >
          <text class="polish-icon">✨</text>
          <text>{{ $t('create_agent.one_click_polish') }}</text>
        </view>

        <!-- 请求中状态 -->
        <view
          v-else-if="polishState === 'requesting'"
          class="polish-btn requesting"
        >
          <text class="polish-icon rotate">✨</text>
          <text>{{ requestingText }}</text>
        </view>

        <!-- 完成状态 -->
        <view
          v-else-if="polishState === 'completed'"
          class="polish-btn-group"
        >
          <view class="small-btn restore-btn" @click="handleRestore">
            <text>{{ $t('create_agent.polish_restore') }}</text>
          </view>
          <view class="small-btn retry-btn" @click="handlePolish">
            <text class="polish-icon">✨</text>
            <text>{{ $t('create_agent.polish_retry') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import { agentApi } from '@/api/index';
import { useToast } from '@/uni_modules/wot-design-uni';
import {
  getRequestErrorMessage,
  isRequestHandledError
} from '@/utils/request-feedback';

const props = defineProps<{
  modelValue: string;
  placeholderKey: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'polishStateChange', state: 'idle' | 'requesting' | 'completed'): void;
}>();

const { t: $t } = useI18n();
const toast = useToast();

const localPrompt = ref(props.modelValue);

// 一键润色相关状态
const polishState = ref<'idle' | 'requesting' | 'completed'>('idle');
const requestingTextIndex = ref(0);
const elapsedSeconds = ref(0);
const requestingTexts = [
  $t('create_agent.polish_requesting_1'),
  $t('create_agent.polish_requesting_2')
];
const originalPrompt = ref('');
let requestingTimer: ReturnType<typeof setInterval> | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

const requestingText = computed(() => {
  const base = requestingTexts[requestingTextIndex.value];
  if (polishState.value === 'requesting' && elapsedSeconds.value > 0) {
    return `${base} (${elapsedSeconds.value}s)`;
  }
  return base;
});
const canPolish = computed(() => localPrompt.value.trim().length >= 5);

/** 兼容后端多种润色结果字段 */
function resolveOptimizedPrompt(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data !== 'object') return '';

  const record = data as Record<string, unknown>;
  const candidates = [record.prompt, record.optimizedPrompt, record.systemPrompt];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

// 与父组件双向同步
watch(
  () => props.modelValue,
  (v) => {
    if (v !== localPrompt.value) {
      localPrompt.value = v;
    }
    // 当外部将值清空时（如创建成功后重置表单），重置润色状态
    if (!v || v.trim() === '') {
      polishState.value = 'idle';
      originalPrompt.value = '';
    }
  }
);

watch(localPrompt, (v) => {
  emit('update:modelValue', v);
});

watch(polishState, (s) => {
  emit('polishStateChange', s);
});

async function handlePolish() {
  const content = localPrompt.value.trim();

  if (content.length < 5) {
    toast.warning({
      msg: $t('create_agent.polish_min_length_hint'),
      duration: 2000
    });
    return;
  }

  if (polishState.value === 'idle') {
    originalPrompt.value = localPrompt.value;
  }

  polishState.value = 'requesting';
  requestingTextIndex.value = 0;
  elapsedSeconds.value = 0;

  if (requestingTimer) clearInterval(requestingTimer);
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);
  requestingTimer = setInterval(() => {
    requestingTextIndex.value =
      (requestingTextIndex.value + 1) % requestingTexts.length;
  }, 2000);

  try {
    const result = await agentApi.optimizePrompt({ prompt: content });

    const optimizedPrompt = resolveOptimizedPrompt(result.data);
    if (result.code === 1000 && optimizedPrompt) {
      localPrompt.value = optimizedPrompt;
      polishState.value = 'completed';
      return;
    }

    console.error('[一键润色] 响应异常:', result);
    throw new Error(result.message || $t('create_agent.polish_failed'));
  } catch (error) {
    const msg = getRequestErrorMessage(error, $t('create_agent.polish_failed'));
    console.error('[一键润色] 失败:', msg, error);
    if (!isRequestHandledError(error)) {
      toast.error(msg);
    }
    polishState.value = 'idle';
  } finally {
    if (requestingTimer) {
      clearInterval(requestingTimer);
      requestingTimer = null;
    }
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }
}

function handleRestore() {
  localPrompt.value = originalPrompt.value;
  polishState.value = 'idle';
}

onUnmounted(() => {
  if (requestingTimer) {
    clearInterval(requestingTimer);
    requestingTimer = null;
  }
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
});
</script>

<style scoped>
.agent-prompt-polish .textarea-wrapper {
  position: relative;
  width: 100%;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  background: white;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.agent-prompt-polish .textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 26rpx 32rpx 10rpx 32rpx;
  font-size: 32rpx;
  background: transparent;
  line-height: 1.4;
  color: #171717;
  box-sizing: border-box;
  border: none;
}

.agent-prompt-polish .textarea-wrapper:focus-within {
  border-color: var(--color-primary);
}

.agent-prompt-polish .textarea::placeholder {
  color: #9ca3af;
  font-size: 32rpx;
}

/* 润色按钮容器 */
.agent-prompt-polish .polish-container {
  padding: 12rpx 16rpx 16rpx 16rpx;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.agent-prompt-polish .polish-container .polish-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #9ca3af;
  background: #f3f4f6;
  transition: all 0.2s ease;
  border: none;
}

.agent-prompt-polish .polish-container .polish-btn .polish-icon,
.agent-prompt-polish .polish-container .small-btn .polish-icon {
  font-size: 28rpx;
}

.agent-prompt-polish .polish-container .polish-btn.active {
  color: var(--color-primary);
  background: var(--color-primary-alpha-10);
}

.agent-prompt-polish .polish-container .polish-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.agent-prompt-polish .polish-container .polish-btn.requesting {
  color: var(--color-primary);
  background: var(--color-primary-alpha-10);
}

.agent-prompt-polish .polish-container .polish-btn-group {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.agent-prompt-polish .polish-container .polish-btn-group .small-btn.restore-btn {
  color: #6b7280;
  background: #f3f4f6;
}

.agent-prompt-polish .polish-container .polish-btn-group .small-btn.restore-btn:active {
  background: #e5e7eb;
}

.agent-prompt-polish .polish-container .polish-btn-group .small-btn.retry-btn {
  color: var(--color-primary);
  background: var(--color-primary-alpha-10);
}

.agent-prompt-polish .polish-container .polish-btn-group .small-btn.retry-btn:active {
  background: var(--color-primary-alpha-20);
}

.agent-prompt-polish .polish-icon.rotate {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.agent-prompt-polish .polish-container .polish-btn-group .small-btn {
  display: flex;
  align-items: center;
  justify-content: center; /* 确保内容水平居中 */
  gap: 6rpx;
  padding: 10rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  transition: all 0.2s ease;
  border: none;
  height: 48rpx; /* 固定高度，确保两个按钮一致 */
  box-sizing: border-box; /* 确保 padding 包含在 height 内 */
}
</style>
