export interface ChatLanguageOption {
  language: string;
  langCode: string;
  voiceLanguage: string;
}

import { languageApi } from '@/api/index';

// ============ 语言缓存服务（简化版）============

let languageCache: ChatLanguageOption[] | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureCacheLoaded(): Promise<void> {
  if (languageCache !== null) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await languageApi.getList();

      if (res.code === 1000 && res.data && Array.isArray(res.data) && res.data.length > 0) {
        languageCache = res.data.map(
          (lang: { langCode: string; language: string; voiceLanguage: string }) => ({
            langCode: lang.langCode,
            language: lang.language,
            voiceLanguage: lang.voiceLanguage
          })
        );
        return;
      }
    } catch (error) {
      console.error('获取语言列表失败:', error);
    }

    languageCache = [];
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function getChatLanguageOptions(): Promise<ChatLanguageOption[]> {
  await ensureCacheLoaded();
  return languageCache || [];
}

export function langCodeToVoiceLanguage(langCode: string): string {
  if (!langCode) return 'zh';
  // langCode 和 voiceLanguage 相同，直接返回短格式
  const shortCode = langCode.split('_')[0].toLowerCase();
  return shortCode || 'zh';
}

export function backendLangToLangCode(backendLang: string): string {
  if (!backendLang) return 'zh_CN';

  const normalized = backendLang.toLowerCase().replace('-', '_');

  // 精确匹配
  if (languageCache) {
    const exact = languageCache.find((opt) => opt.langCode.toLowerCase() === normalized);
    if (exact) return exact.langCode;
  }

  // 短格式匹配
  const shortCode = normalized.split('_')[0];
  if (languageCache) {
    const match = languageCache.find((opt) => opt.langCode === shortCode);
    if (match) return match.langCode;
  }

  return backendLang;
}

/**
 * 获取系统语言对应的 langCode
 */
export function getSystemLangCode(): string {
  const systemInfo = uni.getSystemInfoSync();
  const systemLang = (systemInfo.language || 'zh-Hans').toLowerCase();

  // 映射系统语言到 langCode
  if (systemLang.includes('zh') && (systemLang.includes('hans') || systemLang.includes('cn'))) {
    return 'zh_CN';
  } else if (
    systemLang.includes('zh') &&
    (systemLang.includes('hant') || systemLang.includes('tw') || systemLang.includes('hk'))
  ) {
    return 'zh_TW';
  } else if (systemLang.includes('en')) {
    return 'en_US';
  } else if (systemLang.includes('ja')) {
    return 'ja_JP';
  } else if (systemLang.includes('ko')) {
    return 'ko_KR';
  } else if (systemLang.includes('es')) {
    return 'es_ES';
  } else if (systemLang.includes('de')) {
    return 'de_DE';
  } else if (systemLang.includes('fr')) {
    return 'fr_FR';
  } else if (systemLang.includes('ru')) {
    return 'ru_RU';
  } else if (systemLang.includes('pt')) {
    return 'pt_PT';
  } else if (systemLang.includes('it')) {
    return 'it_IT';
  } else if (systemLang.includes('ar')) {
    return 'ar_SA';
  } else if (systemLang.includes('th')) {
    return 'th_TH';
  } else if (systemLang.includes('vi')) {
    return 'vi_VN';
  } else if (systemLang.includes('id')) {
    return 'id_ID';
  } else if (systemLang.includes('bg')) {
    return 'bg_BG';
  } else if (systemLang.includes('ro')) {
    return 'ro_RO';
  } else if (systemLang.includes('hu')) {
    return 'hu_HU';
  } else if (systemLang.includes('ms')) {
    return 'ms_MY';
  }

  return 'en_US';
}

export async function initLanguageDisplayNameCache(): Promise<void> {
  await ensureCacheLoaded();
}

export function getLanguageDisplayNameByLangCode(langCode: string, fallback?: string): string {
  if (!langCode) return fallback || '';
  if (languageCache) {
    const found = languageCache.find((opt) => opt.langCode === langCode);
    if (found) return found.language;
  }
  return fallback || langCode;
}

export function getLanguageDisplayName(voiceCode: string, fallback?: string): string {
  if (!voiceCode) {
    return fallback || '';
  }

  if (languageCache) {
    const found = languageCache.find((opt) => opt.voiceLanguage === voiceCode);
    if (found) return found.language;
  }

  return fallback || voiceCode.toUpperCase();
}

export function isLanguageCacheReady(): boolean {
  return languageCache !== null;
}

export function clearLanguageDisplayNameCache(): void {
  languageCache = null;
}

export function getLanguagePriority(voiceLanguageCode: string): number {
  if (!voiceLanguageCode || !languageCache) {
    return Number.MAX_SAFE_INTEGER;
  }
  const index = languageCache.findIndex((opt) => opt.voiceLanguage === voiceLanguageCode);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}
