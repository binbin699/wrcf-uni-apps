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
         let langCodeToUse = agent.config.langCode;
         
         // 如果 config.langCode 没有数据，则使用外层的 languageCode 作为备选
         if (!langCodeToUse && agent.languageCode) {
           langCodeToUse = agent.languageCode;
         }
         
         if (langCodeToUse) {
           // 兼容处理：langCode 可能是短格式（如"zh"），需要与完整格式（如"zh_CN"）匹配
           let idx = chatLanguageOptions.value.findIndex(l => l.langCode === langCodeToUse);
           
           // 如果没有精确匹配，尝试通过前缀匹配（短格式匹配）
           if (idx === -1 && langCodeToUse) {
             const shortCode = langCodeToUse.split('_')[0].toLowerCase();
             idx = chatLanguageOptions.value.findIndex(l => 
               l.langCode.split('_')[0].toLowerCase() === shortCode
             );
           }
           
           if (idx !== -1) {
             selectedChatLanguageIndex.value = idx;
             formData.value.langCode = chatLanguageOptions.value[idx].langCode;
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

