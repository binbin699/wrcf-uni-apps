/** 记忆模型 memModelId（与后端一致）。不包含未启用的 Memory_mem0ai */
export const MEM_MODEL_IDS = {
  NONE: 'Memory_nomem',
  LONG_TERM: 'Memory_long_term_memory',
  LOCAL_SHORT: 'Memory_mem_local_short'
} as const;

export type MemModelId = (typeof MEM_MODEL_IDS)[keyof typeof MEM_MODEL_IDS];

/** 选择器展示顺序：无记忆 → 长期记忆 → 本地短期记忆 */
export const MEM_MODEL_OPTION_ORDER: readonly MemModelId[] = [
  MEM_MODEL_IDS.NONE,
  MEM_MODEL_IDS.LONG_TERM,
  MEM_MODEL_IDS.LOCAL_SHORT
];

export function isMemModelId(value: string): value is MemModelId {
  return (MEM_MODEL_OPTION_ORDER as readonly string[]).includes(value);
}

/** 创建/更新表单字段 */
export interface AgentFormFields {
  agentName: string;
  systemPrompt: string;
  ttsVoiceId: string;
  llmModelId: string;
  memModelId: MemModelId;
  langCode: string;
  language: string;
}

/**
 * 组装创建/更新共用的基础字段（不含 memModelId）。
 */
function buildAgentBasePayload(form: AgentFormFields): Record<string, unknown> {
  return {
    agentName: form.agentName,
    systemPrompt: form.systemPrompt,
    ttsVoiceId: form.ttsVoiceId,
    llmModelId: form.llmModelId,
    langCode: form.langCode,
    language: form.language
  };
}

/**
 * 组装 /app/agent/create 请求体。
 * 创建时始终携带 memModelId（与灵矽 memModelId 取值一致，见 MEM_MODEL_IDS）。
 */
export function buildAgentWritePayload(form: AgentFormFields): Record<string, unknown> {
  const memModelId = isMemModelId(form.memModelId) ? form.memModelId : MEM_MODEL_IDS.NONE;

  return {
    ...buildAgentBasePayload(form),
    memModelId
  };
}

/**
 * 组装 /app/agent/updateConfig 请求体。
 * 灵矽更新接口约定：memModelId 不传则不更新；仅在用户修改记忆类型时携带，避免触发不必要的记忆容器同步。
 */
export function buildAgentUpdatePayload(
  form: AgentFormFields,
  initialMemModelId: MemModelId
): Record<string, unknown> {
  const payload = buildAgentBasePayload(form);
  const memModelId = isMemModelId(form.memModelId) ? form.memModelId : MEM_MODEL_IDS.NONE;

  if (memModelId !== initialMemModelId) {
    payload.memModelId = memModelId;
  }

  return payload;
}

export function resolveMemModelId(agent: {
  memModelId?: string;
  config?: { memModelId?: string };
}): MemModelId {
  const raw =
    typeof agent.memModelId === 'string' && agent.memModelId
      ? agent.memModelId
      : typeof agent.config?.memModelId === 'string' && agent.config.memModelId
        ? agent.config.memModelId
        : '';
  if (raw && isMemModelId(raw)) {
    return raw;
  }
  return MEM_MODEL_IDS.NONE;
}
