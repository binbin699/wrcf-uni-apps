import { type Ref } from 'vue';
import { agentApi } from '@/api/index';
import type { ChatLanguageOption } from '../lang_opts';
import { MEM_MODEL_OPTION_ORDER, resolveMemModelId, type AgentFormFields } from '../mem_model';

export async function applyTemplateLogic(
  template: any,
  formData: Ref<AgentFormFields>,
  llmOptions: Ref<any[]>,
  chatLanguageOptions: Ref<ChatLanguageOption[]>,
  voiceOptions: Ref<any[]>,
  selectedLLMIndex: Ref<number | null>,
  selectedLLM: Ref<any>,
  selectedChatLanguageIndex: Ref<number | null>,
  selectedVoice: Ref<any>,
  selectedMemoryIndex: Ref<number>,
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

      const memId = resolveMemModelId(agent);
      const memIdx = MEM_MODEL_OPTION_ORDER.indexOf(memId);
      const idx = memIdx !== -1 ? memIdx : 0;
      selectedMemoryIndex.value = idx;
      formData.value.memModelId = MEM_MODEL_OPTION_ORDER[idx];

      if (agent.config) {
        formData.value.systemPrompt = agent.config.systemPrompt || '';

        // 模型
        if (agent.config.llmModelId) {
          const idxLlm = llmOptions.value.findIndex((l) => l.id === agent.config.llmModelId);
          if (idxLlm !== -1) {
            selectedLLMIndex.value = idxLlm;
            selectedLLM.value = llmOptions.value[idxLlm];
            formData.value.llmModelId = agent.config.llmModelId;
          }
        }

        // 语言
        let langCodeToUse = agent.config.langCode;

        // 如果 config.langCode 没有数据，则使用外层的 languageCode 作为备选
        if (!langCodeToUse && agent.languageCode) {
          langCodeToUse = agent.languageCode;
        }

        if (langCodeToUse) {
          // 兼容处理：langCode 可能是短格式（如"zh"），需要与完整格式（如"zh_CN"）匹配
          let idxLang = chatLanguageOptions.value.findIndex((l) => l.langCode === langCodeToUse);

          // 如果没有精确匹配，尝试通过前缀匹配（短格式匹配）
          if (idxLang === -1 && langCodeToUse) {
            const shortCode = langCodeToUse.split('_')[0].toLowerCase();
            idxLang = chatLanguageOptions.value.findIndex(
              (l) => l.langCode.split('_')[0].toLowerCase() === shortCode
            );
          }

          if (idxLang !== -1) {
            selectedChatLanguageIndex.value = idxLang;
            formData.value.langCode = chatLanguageOptions.value[idxLang].langCode;
            formData.value.language = chatLanguageOptions.value[idxLang].language;
          }
        }

        // 音色
        if (agent.config.ttsVoiceId) {
          const voice = voiceOptions.value.find(
            (v) => v.voiceId === agent.config.ttsVoiceId || v.id === agent.config.ttsVoiceId
          );
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
