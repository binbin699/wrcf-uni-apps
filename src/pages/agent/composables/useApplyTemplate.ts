import { type Ref } from 'vue';
import { agentApi } from '@/api/index';
import type { ChatLanguageOption } from '../lang_opts';

export async function applyTemplateLogic(
  template: any,
  formData: Ref<{
    agentName: string;
    systemPrompt: string;
    langCode: string;
    language: string;
    llmModelId: string;
    ttsVoiceId: string;
  }>,
  llmOptions: Ref<any[]>,
  chatLanguageOptions: Ref<ChatLanguageOption[]>,
  voiceOptions: Ref<any[]>,
  selectedLLMIndex: Ref<number | null>,
  selectedLLM: Ref<any>,
  selectedChatLanguageIndex: Ref<number | null>,
  selectedVoice: Ref<any>,
  toast: any,
  $t: (key: string) => string
) {
  // 填入名称
  formData.value.agentName = template.agentName;
  
  // 加载详细数据并填入剩余字段
  try {
    toast.loading($t('common.loading'));
    // 使用 agentId 获取智能体详情
    const result = await agentApi.getInfo(template.agentId);
    if (result.code === 1000 && result.data) {
      const agent = result.data;
      if (agent.config) {
        formData.value.systemPrompt = agent.config.systemPrompt || '';
        
        // 模型
        if (agent.config.llmModelId) {
          const idx = llmOptions.value.findIndex(l => l.id === agent.config.llmModelId);
          if (idx !== -1) {
            selectedLLMIndex.value = idx;
            selectedLLM.value = llmOptions.value[idx];
            formData.value.llmModelId = agent.config.llmModelId;
          }
        }
        
        // 语言
        if (agent.config.langCode) {
          const idx = chatLanguageOptions.value.findIndex(l => l.langCode === agent.config.langCode);
          if (idx !== -1) {
            selectedChatLanguageIndex.value = idx;
            formData.value.langCode = agent.config.langCode;
            formData.value.language = chatLanguageOptions.value[idx].language;
          }
        }
        
        // 音色
        if (agent.config.ttsVoiceId) {
          const voice = voiceOptions.value.find(v => v.voiceId === agent.config.ttsVoiceId || v.id === agent.config.ttsVoiceId);
          if (voice) {
            selectedVoice.value = voice;
            formData.value.ttsVoiceId = voice.voiceId;
          }
        }
      }
    }
    toast.close();
  } catch (e) {
    console.error('Apply template failed', e);
    toast.close();
  }
}

