export interface ChatLanguageOption {
  label: string;
  language: string;
  langCode: string;
  voiceLanguage: string;
}

import { languageApi } from '@/api/index';

/**
 * langCode 到国际化 key 的映射表
 * 用于将 API 返回的 langCode 转换为国际化 key，生成 label
 */
const langCodeToI18nKeyMap: Record<string, string> = {
  'zh_CN': 'create_agent.language_zh',
  'en_US': 'create_agent.language_en',
  'ja_JP': 'create_agent.language_ja',
  'ko_KR': 'create_agent.language_ko',
  'yue_CN': 'create_agent.language_yue',
  'ne_CN': 'create_agent.language_ne',
  'es_ES': 'create_agent.language_es',
  'de_DE': 'create_agent.language_de',
  'fr_FR': 'create_agent.language_fr',
  'hi_IN': 'create_agent.language_hi',
  'it_IT': 'create_agent.language_it',
  'nl_NL': 'create_agent.language_nl',
  'pt_PT': 'create_agent.language_pt',
  'ru_RU': 'create_agent.language_ru',
  'tr_TR': 'create_agent.language_tr',
  'vi_VN': 'create_agent.language_vi',
  'km_KH': 'create_agent.language_km',
  'th_TH': 'create_agent.language_th',
  'id_ID': 'create_agent.language_id',
  'mn_MN': 'create_agent.language_mn',
  'ar_SA': 'create_agent.language_ar',
  'pl_PL': 'create_agent.language_pl',
  'uk_UA': 'create_agent.language_uk',
  'bg_BG': 'create_agent.language_bg',
  'ro_RO': 'create_agent.language_ro',
  'hu_HU': 'create_agent.language_hu',
  'ms_MY': 'create_agent.language_ms',
  'he_IL': 'create_agent.language_he',
};

/**
 * 硬编码的语言选项（兜底方案）
 */
function getHardcodedLanguageOptions($t: (key: string) => string): ChatLanguageOption[] {
  return [
    { label: $t('create_agent.language_zh'), language: '中文', langCode: 'zh_CN', voiceLanguage: 'zh' },
    { label: $t('create_agent.language_en'), language: '英文', langCode: 'en_US', voiceLanguage: 'en' },
    { label: $t('create_agent.language_ja'), language: '日语', langCode: 'ja_JP', voiceLanguage: 'ja' },
    { label: $t('create_agent.language_ko'), language: '韩语', langCode: 'ko_KR', voiceLanguage: 'ko' },
    { label: $t('create_agent.language_yue'), language: '粤语', langCode: 'yue_CN', voiceLanguage: 'yue' },
    { label: $t('create_agent.language_ne'), language: '东北话', langCode: 'ne_CN', voiceLanguage: 'ne' },
    { label: $t('create_agent.language_es'), language: '西班牙语', langCode: 'es_ES', voiceLanguage: 'es' },
    { label: $t('create_agent.language_de'), language: '德语', langCode: 'de_DE', voiceLanguage: 'de' },
    { label: $t('create_agent.language_fr'), language: '法语', langCode: 'fr_FR', voiceLanguage: 'fr' },
    { label: $t('create_agent.language_hi'), language: '印地语', langCode: 'hi_IN', voiceLanguage: 'hi' },
    { label: $t('create_agent.language_it'), language: '意大利语', langCode: 'it_IT', voiceLanguage: 'it' },
    { label: $t('create_agent.language_nl'), language: '荷兰语', langCode: 'nl_NL', voiceLanguage: 'nl' },
    { label: $t('create_agent.language_pt'), language: '葡萄牙语', langCode: 'pt_PT', voiceLanguage: 'pt' },
    { label: $t('create_agent.language_ru'), language: '俄语', langCode: 'ru_RU', voiceLanguage: 'ru' },
    { label: $t('create_agent.language_tr'), language: '土耳其语', langCode: 'tr_TR', voiceLanguage: 'tr' },
    { label: $t('create_agent.language_vi'), language: '越南语', langCode: 'vi_VN', voiceLanguage: 'vi' },
    { label: $t('create_agent.language_km'), language: '柬埔寨语', langCode: 'km_KH', voiceLanguage: 'km' },
    { label: $t('create_agent.language_th'), language: '泰语', langCode: 'th_TH', voiceLanguage: 'th' },
    { label: $t('create_agent.language_id'), language: '印尼语', langCode: 'id_ID', voiceLanguage: 'id' },
    { label: $t('create_agent.language_mn'), language: '蒙古语', langCode: 'mn_MN', voiceLanguage: 'mn' },
    { label: $t('create_agent.language_ar'), language: '阿拉伯语', langCode: 'ar_SA', voiceLanguage: 'ar' },
    { label: $t('create_agent.language_pl'), language: '波兰语', langCode: 'pl_PL', voiceLanguage: 'pl' },
    { label: $t('create_agent.language_uk'), language: '乌克兰语', langCode: 'uk_UA', voiceLanguage: 'uk' },
    { label: $t('create_agent.language_bg'), language: '保加利亚语', langCode: 'bg_BG', voiceLanguage: 'bg' },
    { label: $t('create_agent.language_ro'), language: '罗马尼亚语', langCode: 'ro_RO', voiceLanguage: 'ro' },
    { label: $t('create_agent.language_hu'), language: '匈牙利语', langCode: 'hu_HU', voiceLanguage: 'hu' },
    { label: $t('create_agent.language_ms'), language: '马来语', langCode: 'ms_MY', voiceLanguage: 'ms' },
    { label: $t('create_agent.language_he'), language: '希伯来语', langCode: 'he_IL', voiceLanguage: 'he' },
  ];
}

/**
 * 获取对话语言选项列表（异步）
 * 优先从 API 获取，失败时使用硬编码兜底
 */
let cachedChatLanguageOptions: ChatLanguageOption[] | null = null;

export async function getChatLanguageOptions($t: (key: string) => string): Promise<ChatLanguageOption[]> {
  if (cachedChatLanguageOptions) {
    return cachedChatLanguageOptions;
  }

  try {
    const res = await languageApi.getList();
    
    if (res.code === 1000 && res.data && Array.isArray(res.data) && res.data.length > 0) {
      // API 返回成功，转换为 ChatLanguageOption 格式
      const mapped = res.data.map((lang: { langCode: string; language: string; voiceLanguage?: string }) => {
        const i18nKey = langCodeToI18nKeyMap[lang.langCode];
        return {
          langCode: lang.langCode,
          language: lang.language,
          voiceLanguage: lang.voiceLanguage || langCodeToVoiceLanguage(lang.langCode), // 兜底：如果接口没有返回，使用硬编码转换
          label: i18nKey ? $t(i18nKey) : lang.language, // 如果映射表中没有，使用 language 作为 label
        };
      });
      cachedChatLanguageOptions = mapped;
      return mapped;
    }
  } catch (error) {
    // API 调用失败，静默失败，使用硬编码兜底
    console.warn('获取语言列表失败，使用硬编码兜底:', error);
  }
  
  // 硬编码兜底（原有逻辑），不写缓存，便于下次再尝试 API
  return getHardcodedLanguageOptions($t);
}

/**
 * 将 langCode 映射到 VoiceSelector 使用的简短语言代码
 * 用于实现对话语言与音色的强绑定
 */
export function langCodeToVoiceLanguage(langCode: string): string {
  const mapping: Record<string, string> = {
    'zh_CN': 'zh',
    'en_US': 'en',
    'es_ES': 'es',
    'ja_JP': 'ja',
    'ko_KR': 'ko',
    'yue_CN': 'yue',
    'ne_CN': 'ne',  // 东北话（方言）
    'de_DE': 'de',
    'fr_FR': 'fr',
    'hi_IN': 'hi',
    'it_IT': 'it',
    'nl_NL': 'nl',
    'pt_PT': 'pt',
    'ru_RU': 'ru',
    'tr_TR': 'tr',
    'vi_VN': 'vi',
    'km_KH': 'km',
    'th_TH': 'th',
    'id_ID': 'id',
    'mn_MN': 'mn',
    'ar_SA': 'ar',
    'pl_PL': 'pl',
    'uk_UA': 'uk',
    'bg_BG': 'bg',
    'ro_RO': 'ro',
    'hu_HU': 'hu',
    'ms_MY': 'ms',
    'he_IL': 'he',
  };
  return mapping[langCode] || 'zh';
}

/**
 * 将后端返回的 lang 或 langCode 值（如 'zh', 'en', 'ja_JP', 'zh-cn'）映射到前端标准 langCode
 */
export function backendLangToLangCode(backendLang: string): string {
  if (!backendLang) return 'zh_CN';

  // 标准化处理：转小写，将中划线转为下划线
  const normalized = backendLang.toLowerCase().replace('-', '_');

  const mapping: Record<string, string> = {
    'zh': 'zh_CN',
    'zh_cn': 'zh_CN',
    'zh_hans': 'zh_CN',
    'zh_tw': 'zh_TW',
    'zh_hant': 'zh_TW',
    'en': 'en_US',
    'en_us': 'en_US',
    'ja': 'ja_JP',
    'ja_jp': 'ja_JP',
    'ko': 'ko_KR',
    'ko_kr': 'ko_KR',
    'yue': 'yue_CN',
    'yue_cn': 'yue_CN',
    'ne': 'ne_CN',
    'ne_cn': 'ne_CN',
    'es': 'es_ES',
    'es_es': 'es_ES',
    'de': 'de_DE',
    'de_de': 'de_DE',
    'fr': 'fr_FR',
    'fr_fr': 'fr_FR',
    'hi': 'hi_IN',
    'hi_in': 'hi_IN',
    'it': 'it_IT',
    'it_it': 'it_IT',
    'nl': 'nl_NL',
    'nl_nl': 'nl_NL',
    'pt': 'pt_PT',
    'pt_pt': 'pt_PT',
    'ru': 'ru_RU',
    'ru_ru': 'ru_RU',
    'tr': 'tr_TR',
    'tr_tr': 'tr_TR',
    'vi': 'vi_VN',
    'vi_vn': 'vi_VN',
    'km': 'km_KH',
    'km_kh': 'km_KH',
    'th': 'th_TH',
    'th_th': 'th_TH',
    'id': 'id_ID',
    'id_id': 'id_ID',
    'mn': 'mn_MN',
    'mn_mn': 'mn_MN',
    'ar': 'ar_SA',
    'ar_sa': 'ar_SA',
    'pl': 'pl_PL',
    'pl_pl': 'pl_PL',
    'uk': 'uk_UA',
    'uk_ua': 'uk_UA',
    'bg': 'bg_BG',
    'bg_bg': 'bg_BG',
    'ro': 'ro_RO',
    'ro_ro': 'ro_RO',
    'hu': 'hu_HU',
    'hu_hu': 'hu_HU',
    'ms': 'ms_MY',
    'ms_my': 'ms_MY',
    'he': 'he_IL',
    'he_il': 'he_IL',
  };

  return mapping[normalized] || backendLang;
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
  } else if (systemLang.includes('zh') && (systemLang.includes('hant') || systemLang.includes('tw') || systemLang.includes('hk'))) {
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

  return 'en_US'; // 默认英文
}
