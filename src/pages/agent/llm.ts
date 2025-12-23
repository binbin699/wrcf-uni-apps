import type { LLM } from './types';

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

type InternalLLM = LLM & {
  rawName?: string;
  displayName?: string;
};

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  'square.qwen_turbo_realtime': 'Qwen 3 Realtime',
  'square.qwen_turbo_fast': 'Qwen 3 Turbo',
  'square.model.qwen': 'Qwen',
  'square.model.doubao-1.5-pro': 'Doubao 1.5 Pro',
  'square.model.doubao-1.6': 'Doubao 1.6'
};

type MappingEntry = {
  pattern: RegExp;
  key: keyof typeof FALLBACK_TRANSLATIONS;
};

const NAME_MAPPINGS: MappingEntry[] = [
  { pattern: /通义千问\s*3\s*实时版/i, key: 'square.qwen_turbo_realtime' },
  { pattern: /通义千问\s*3\s*极速版/i, key: 'square.qwen_turbo_fast' },
  { pattern: /通义千问3/i, key: 'square.model.qwen' },
  { pattern: /通义千问/i, key: 'square.model.qwen' },
  { pattern: /豆包1\.5-pro/i, key: 'square.model.doubao-1.5-pro' },
  { pattern: /豆包1\.6/i, key: 'square.model.doubao-1.6' }
];

export function localizeLLMOption(option: LLM, t: TranslateFn): InternalLLM {
  const rawName = String((option as InternalLLM).rawName ?? option?.name ?? '').trim();
  const localizedName = translateLLMName(rawName, t);

  return {
    ...(option as InternalLLM),
    rawName,
    displayName: localizedName
  };
}

export function translateLLMName(name: string, t: TranslateFn): string {
  if (!name) {
    return name;
  }

  for (const entry of NAME_MAPPINGS) {
    if (entry.pattern.test(name)) {
      const translated = t(entry.key as string, {});
      if (translated && translated !== entry.key) {
        return translated;
      }
      return FALLBACK_TRANSLATIONS[entry.key] ?? name;
    }
  }

  return name;
}

export function relocalizeLLMOptions(options: LLM[], t: TranslateFn): InternalLLM[] {
  return options.map((option) => localizeLLMOption(option, t));
}
