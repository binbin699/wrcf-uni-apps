import { agentApi, voiceApi } from '@/api/index';

type VoiceRow = {
  voiceId?: string;
  id?: string;
  voiceName?: string;
  name?: string;
};

type LlmRow = {
  id?: string;
  llmId?: string;
  modelId?: string;
  name?: string;
  llmName?: string;
  modelName?: string;
};

const DEFAULT_CAPABILITY_LABELS = new Set([
  '默认音色',
  '默认模型',
  '默認音色',
  '默認模型',
  'default voice',
  'default model',
  'default tts',
  'default llm',
  'デフォルト音声',
  'デフォルトモデル',
  '기본 음성',
  '기본 모델',
  'голос по умолчанию',
  'модель по умолчанию',
  'الصوت الافتراضي',
  'النموذج الافتراضي',
  'әдепкі дауыс',
  'әдепкі модель'
]);

function getCfgString(config: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = config?.[key];
  return typeof v === 'string' ? v : undefined;
}

function normalizeVoiceList(data: unknown): VoiceRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as VoiceRow[];
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.list)) return o.list as VoiceRow[];
    return Object.values(o) as VoiceRow[];
  }
  return [];
}

function normalizeLlmList(data: unknown): LlmRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as LlmRow[];
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.llm)) return o.llm as LlmRow[];
    if (Array.isArray(o.list)) return o.list as LlmRow[];
  }
  return [];
}

function pickVoiceLabel(v: VoiceRow): string {
  const n = v.voiceName || v.name;
  return typeof n === 'string' ? n : '';
}

function pickLlmLabel(l: LlmRow): string {
  const n = l.name || l.llmName || l.modelName;
  return typeof n === 'string' ? n : '';
}

/** 智能体广场：按 ID 查表；未命中时回退到配置中的 voiceName */
function resolveVoiceForSquareDisplay(
  config: Record<string, unknown> | undefined,
  voiceList: VoiceRow[]
): string {
  const ttsVoiceId = getCfgString(config, 'ttsVoiceId');
  if (ttsVoiceId) {
    const voice = voiceList.find((v) => v.voiceId === ttsVoiceId || v.id === ttsVoiceId);
    if (voice) {
      return pickVoiceLabel(voice);
    }
  }
  return getCfgString(config, 'voiceName')?.trim() ?? '';
}

/** 智能体广场：按 ID 查表；未命中时回退到配置中的 llmModelName */
function resolveLlmForSquareDisplay(
  config: Record<string, unknown> | undefined,
  llmList: LlmRow[]
): string {
  const llmModelId = getCfgString(config, 'llmModelId');
  if (llmModelId) {
    const llm = llmList.find(
      (l) => l.id === llmModelId || l.llmId === llmModelId || l.modelId === llmModelId
    );
    if (llm) {
      return pickLlmLabel(llm);
    }
  }
  return getCfgString(config, 'llmModelName')?.trim() ?? '';
}

/**
 * 过滤无信息量的占位文案（与「默认音色」等后端/模板占位区分）
 */
export function sanitizeCapabilityDisplayLabel(raw: string): string {
  const s = raw.trim();
  const normalized = s.toLocaleLowerCase();
  if (!s) return '';
  if (s.length <= 1) return '';
  if (DEFAULT_CAPABILITY_LABELS.has(normalized)) return '';
  if (/^(默认|默認)(音色|语音|聲音|声音|モデル|模型)?$/i.test(s)) return '';
  if (/^default(\s*(voice|model|tts|llm))?$/i.test(s)) return '';
  if (/^デフォルト/i.test(s)) return '';
  if (/^(未设置|未設定|未指定)/.test(s)) return '';
  if (/^(unknown|n\/a|na|none)$/i.test(s)) return '';
  return s;
}

export type TtsLlmResolvedPair = { ttsLabel: string; llmLabel: string };

/**
 * 批量解析多个智能体 config 的 TTS / LLM 展示名（音色列表、LLM 列表各请求一次）
 */
export async function resolveTtsLlmLabelsBatch(
  configs: ReadonlyArray<Record<string, unknown> | undefined>,
  options: { includeLlm?: boolean } = {}
): Promise<TtsLlmResolvedPair[]> {
  const includeLlm = options.includeLlm ?? true;
  let voiceList: VoiceRow[] = [];
  let llmList: LlmRow[] = [];

  const [voiceRes, llmRes] = await Promise.all([
    voiceApi.getList().catch(() => null),
    includeLlm ? agentApi.getLLMlist().catch(() => null) : Promise.resolve(null)
  ]);
  if (voiceRes && typeof voiceRes === 'object' && 'data' in voiceRes) {
    voiceList = normalizeVoiceList((voiceRes as { data?: unknown }).data);
  }
  if (llmRes && typeof llmRes === 'object' && 'data' in llmRes) {
    llmList = normalizeLlmList((llmRes as { data?: unknown }).data);
  }

  return configs.map((cfg) => ({
    ttsLabel: sanitizeCapabilityDisplayLabel(resolveVoiceForSquareDisplay(cfg, voiceList)),
    llmLabel: includeLlm
      ? sanitizeCapabilityDisplayLabel(resolveLlmForSquareDisplay(cfg, llmList))
      : ''
  }));
}

/**
 * 设备状态页：仅当存在对应 ID 且在列表中匹配成功时，回填 config.voiceName / config.llmModelName
 */
export async function enrichAgentConfigVoiceAndLlmFromIds(
  config: Record<string, unknown>
): Promise<void> {
  const ttsVoiceId = getCfgString(config, 'ttsVoiceId');
  const llmModelId = getCfgString(config, 'llmModelId');
  const needVoice = Boolean(ttsVoiceId);
  const needLlm = Boolean(llmModelId);
  if (!needVoice && !needLlm) {
    return;
  }

  let voiceList: VoiceRow[] = [];
  let llmList: LlmRow[] = [];

  const [voiceRes, llmRes] = await Promise.all([
    needVoice ? voiceApi.getList().catch(() => null) : Promise.resolve(null),
    needLlm ? agentApi.getLLMlist().catch(() => null) : Promise.resolve(null)
  ]);
  if (voiceRes && voiceRes.data !== undefined) {
    voiceList = normalizeVoiceList(voiceRes.data);
  }
  if (llmRes && llmRes.data !== undefined) {
    llmList = normalizeLlmList(llmRes.data);
  }

  if (needVoice && ttsVoiceId) {
    const voice = voiceList.find((v) => v.voiceId === ttsVoiceId || v.id === ttsVoiceId);
    if (voice) {
      const n = pickVoiceLabel(voice);
      if (n) {
        config.voiceName = n;
      }
    }
  }

  if (needLlm && llmModelId) {
    const llm = llmList.find(
      (l) => l.id === llmModelId || l.llmId === llmModelId || l.modelId === llmModelId
    );
    if (llm) {
      const n = pickLlmLabel(llm);
      if (n) {
        config.llmModelName = n;
      }
    }
  }
}
