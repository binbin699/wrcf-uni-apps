export interface ChatLanguageOption {
  language: string;
  langCode: string;
  voiceLanguage: string;
}

import { languageApi } from '@/api/index';
import { getLocale } from '@/locale';

type SupportedLocale = 'zh-Hans' | 'en' | 'ja' | 'ru' | 'kk' | 'ko' | 'ar' | 'th' | 'es' | 'fr';

const LANGUAGE_DISPLAY_NAMES: Record<string, Partial<Record<SupportedLocale, string>>> = {
  ar_SA: {
    'zh-Hans': '阿拉伯语',
    en: 'Arabic',
    ja: 'アラビア語',
    ru: 'Арабский',
    kk: 'Араб тілі',
    ko: '아랍어',
    ar: 'العربية',
    th: 'ภาษาอาหรับ',
    es: 'Árabe',
    fr: 'Arabe',
  },
  bg_BG: {
    'zh-Hans': '保加利亚语',
    en: 'Bulgarian',
    ja: 'ブルガリア語',
    ru: 'Болгарский',
    kk: 'Болгар тілі',
    ko: '불가리아어',
    ar: 'البلغارية',
    th: 'ภาษาบัลแกเรีย',
    es: 'Búlgaro',
    fr: 'Bulgare',
  },
  de_DE: {
    'zh-Hans': '德语',
    en: 'German',
    ja: 'ドイツ語',
    ru: 'Немецкий',
    kk: 'Неміс тілі',
    ko: '독일어',
    ar: 'الألمانية',
    th: 'ภาษาเยอรมัน',
    es: 'Alemán',
    fr: 'Allemand',
  },
  en_US: {
    'zh-Hans': '英语',
    en: 'English',
    ja: '英語',
    ru: 'Английский',
    kk: 'Ағылшын тілі',
    ko: '영어',
    ar: 'الإنجليزية',
    th: 'ภาษาอังกฤษ',
    es: 'Inglés',
    fr: 'Anglais',
  },
  es_ES: {
    'zh-Hans': '西班牙语',
    en: 'Spanish',
    ja: 'スペイン語',
    ru: 'Испанский',
    kk: 'Испан тілі',
    ko: '스페인어',
    ar: 'الإسبانية',
    th: 'ภาษาสเปน',
    es: 'Español',
    fr: 'Espagnol',
  },
  fr_FR: {
    'zh-Hans': '法语',
    en: 'French',
    ja: 'フランス語',
    ru: 'Французский',
    kk: 'Француз тілі',
    ko: '프랑스어',
    ar: 'الفرنسية',
    th: 'ภาษาฝรั่งเศส',
    es: 'Francés',
    fr: 'Français',
  },
  hu_HU: {
    'zh-Hans': '匈牙利语',
    en: 'Hungarian',
    ja: 'ハンガリー語',
    ru: 'Венгерский',
    kk: 'Мажар тілі',
    ko: '헝가리어',
    ar: 'الهنغارية',
    th: 'ภาษาฮังการี',
    es: 'Húngaro',
    fr: 'Hongrois',
  },
  id_ID: {
    'zh-Hans': '印度尼西亚语',
    en: 'Indonesian',
    ja: 'インドネシア語',
    ru: 'Индонезийский',
    kk: 'Индонезия тілі',
    ko: '인도네시아어',
    ar: 'الإندونيسية',
    th: 'ภาษาอินโดนีเซีย',
    es: 'Indonesio',
    fr: 'Indonésien',
  },
  it_IT: {
    'zh-Hans': '意大利语',
    en: 'Italian',
    ja: 'イタリア語',
    ru: 'Итальянский',
    kk: 'Итальян тілі',
    ko: '이탈리아어',
    ar: 'الإيطالية',
    th: 'ภาษาอิตาลี',
    es: 'Italiano',
    fr: 'Italien',
  },
  ja_JP: {
    'zh-Hans': '日语',
    en: 'Japanese',
    ja: '日本語',
    ru: 'Японский',
    kk: 'Жапон тілі',
    ko: '일본어',
    ar: 'اليابانية',
    th: 'ภาษาญี่ปุ่น',
    es: 'Japonés',
    fr: 'Japonais',
  },
  kk_KZ: {
    'zh-Hans': '哈萨克语',
    en: 'Kazakh',
    ja: 'カザフ語',
    ru: 'Казахский',
    kk: 'Қазақ тілі',
    ko: '카자흐어',
    ar: 'الكازاخية',
    th: 'ภาษาคาซัค',
    es: 'Kazajo',
    fr: 'Kazakh',
  },
  ko_KR: {
    'zh-Hans': '韩语',
    en: 'Korean',
    ja: '韓国語',
    ru: 'Корейский',
    kk: 'Корей тілі',
    ko: '한국어',
    ar: 'الكورية',
    th: 'ภาษาเกาหลี',
    es: 'Coreano',
    fr: 'Coréen',
  },
  ms_MY: {
    'zh-Hans': '马来语',
    en: 'Malay',
    ja: 'マレー語',
    ru: 'Малайский',
    kk: 'Малай тілі',
    ko: '말레이어',
    ar: 'الماليزية',
    th: 'ภาษามาเลย์',
    es: 'Malayo',
    fr: 'Malais',
  },
  pt_PT: {
    'zh-Hans': '葡萄牙语',
    en: 'Portuguese',
    ja: 'ポルトガル語',
    ru: 'Португальский',
    kk: 'Португал тілі',
    ko: '포르투갈어',
    ar: 'البرتغالية',
    th: 'ภาษาโปรตุเกส',
    es: 'Portugués',
    fr: 'Portugais',
  },
  ro_RO: {
    'zh-Hans': '罗马尼亚语',
    en: 'Romanian',
    ja: 'ルーマニア語',
    ru: 'Румынский',
    kk: 'Румын тілі',
    ko: '루마니아어',
    ar: 'الرومانية',
    th: 'ภาษาโรมาเนีย',
    es: 'Rumano',
    fr: 'Roumain',
  },
  ru_RU: {
    'zh-Hans': '俄语',
    en: 'Russian',
    ja: 'ロシア語',
    ru: 'Русский',
    kk: 'Орыс тілі',
    ko: '러시아어',
    ar: 'الروسية',
    th: 'ภาษารัสเซีย',
    es: 'Ruso',
    fr: 'Russe',
  },
  th_TH: {
    'zh-Hans': '泰语',
    en: 'Thai',
    ja: 'タイ語',
    ru: 'Тайский',
    kk: 'Тай тілі',
    ko: '태국어',
    ar: 'التايلاندية',
    th: 'ภาษาไทย',
    es: 'Tailandés',
    fr: 'Thaï',
  },
  vi_VN: {
    'zh-Hans': '越南语',
    en: 'Vietnamese',
    ja: 'ベトナム語',
    ru: 'Вьетнамский',
    kk: 'Вьетнам тілі',
    ko: '베트남어',
    ar: 'الفيتنامية',
    th: 'ภาษาเวียดนาม',
    es: 'Vietnamita',
    fr: 'Vietnamien',
  },
  zh_CN: {
    'zh-Hans': '中文',
    en: 'Chinese',
    ja: '中国語',
    ru: 'Китайский',
    kk: 'Қытай тілі',
    ko: '중국어',
    ar: 'الصينية',
    th: 'ภาษาจีน',
    es: 'Chino',
    fr: 'Chinois',
  },
  zh_TW: {
    'zh-Hans': '繁体中文',
    en: 'Traditional Chinese',
    ja: '繁体字中国語',
    ru: 'Традиционный китайский',
    kk: 'Дәстүрлі қытай тілі',
    ko: '번체 중국어',
    ar: 'الصينية التقليدية',
    th: 'ภาษาจีนตัวเต็ม',
    es: 'Chino tradicional',
  }
};

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
  return (languageCache || []).map((option) => ({
    ...option,
    language: getLocalizedLanguageName(option.langCode, option.language)
  }));
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

  // 短格式匹配（如 'zh' 匹配 'zh_CN'，'ja' 匹配 'ja_JP'）
  const shortCode = normalized.split('_')[0];
  if (languageCache) {
    const match = languageCache.find(
      (opt) => opt.langCode.split('_')[0].toLowerCase() === shortCode
    );
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
  } else if (systemLang.includes('kk')) {
    return 'kk_KZ';
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

function resolveSupportedLocale(): SupportedLocale {
  const locale = getLocale();
  if (
    locale === 'zh-Hans' ||
    locale === 'en' ||
    locale === 'ja' ||
    locale === 'ru' ||
    locale === 'kk' ||
    locale === 'ko' ||
    locale === 'ar' ||
    locale === 'th' ||
    locale === 'es' ||
    locale === 'fr'
  ) {
    return locale;
  }
  return 'en';
}

function resolveLanguageMetaByLangCode(langCode: string): ChatLanguageOption | undefined {
  if (!langCode || !languageCache) {
    return undefined;
  }

  const normalizedLangCode = backendLangToLangCode(langCode);

  return languageCache.find((opt) => opt.langCode === normalizedLangCode);
}

export function getLocalizedLanguageName(langCode: string, fallback?: string): string {
  if (!langCode) {
    return fallback || '';
  }

  const normalizedLangCode = backendLangToLangCode(langCode);
  const locale = resolveSupportedLocale();
  const localized = LANGUAGE_DISPLAY_NAMES[normalizedLangCode]?.[locale];

  if (localized) {
    return localized;
  }

  const backendLabel = resolveLanguageMetaByLangCode(normalizedLangCode)?.language;
  return backendLabel || fallback || normalizedLangCode;
}

export function getLanguageDisplayNameByLangCode(langCode: string, fallback?: string): string {
  return getLocalizedLanguageName(langCode, fallback);
}

export function getLanguageDisplayName(voiceCode: string, fallback?: string): string {
  if (!voiceCode) {
    return fallback || '';
  }

  if (languageCache) {
    const found = languageCache.find((opt) => opt.voiceLanguage === voiceCode);
    if (found) {
      return getLocalizedLanguageName(found.langCode, found.language);
    }
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
