export interface ChatLanguageOption {
  label: string;
  language: string;
  langCode: string;
}

export function getChatLanguageOptions($t: (key: string) => string): ChatLanguageOption[] {
  return [
    { label: $t('create_agent.language_zh'), language: '中文', langCode: 'zh_CN' },
    { label: $t('create_agent.language_en'), language: '英文', langCode: 'en_US' },
    { label: $t('create_agent.language_ja'), language: '日语', langCode: 'ja_JP' },
    { label: $t('create_agent.language_ko'), language: '韩语', langCode: 'ko_KR' },
    { label: $t('create_agent.language_yue'), language: '粤语', langCode: 'yue_CN' },
    { label: $t('create_agent.language_ne'), language: '东北话', langCode: 'ne_CN' },
    { label: $t('create_agent.language_es'), language: '西班牙语', langCode: 'es_ES' },
    { label: $t('create_agent.language_de'), language: '德语', langCode: 'de_DE' },
    { label: $t('create_agent.language_fr'), language: '法语', langCode: 'fr_FR' },
    { label: $t('create_agent.language_hi'), language: '印地语', langCode: 'hi_IN' },
    { label: $t('create_agent.language_it'), language: '意大利语', langCode: 'it_IT' },
    { label: $t('create_agent.language_nl'), language: '荷兰语', langCode: 'nl_NL' },
    { label: $t('create_agent.language_pt'), language: '葡萄牙语', langCode: 'pt_PT' },
    { label: $t('create_agent.language_ru'), language: '俄语', langCode: 'ru_RU' },
    { label: $t('create_agent.language_tr'), language: '土耳其语', langCode: 'tr_TR' },
    { label: $t('create_agent.language_vi'), language: '越南语', langCode: 'vi_VN' },
    { label: $t('create_agent.language_km'), language: '柬埔寨语', langCode: 'km_KH' },
    { label: $t('create_agent.language_th'), language: '泰语', langCode: 'th_TH' },
    { label: $t('create_agent.language_id'), language: '印尼语', langCode: 'id_ID' },
    { label: $t('create_agent.language_mn'), language: '蒙古语', langCode: 'mn_MN' },
    { label: $t('create_agent.language_ar'), language: '阿拉伯语', langCode: 'ar_SA' },
    { label: $t('create_agent.language_pl'), language: '波兰语', langCode: 'pl_PL' },
    { label: $t('create_agent.language_uk'), language: '乌克兰语', langCode: 'uk_UA' },
    { label: $t('create_agent.language_bg'), language: '保加利亚语', langCode: 'bg_BG' },
    { label: $t('create_agent.language_ro'), language: '罗马尼亚语', langCode: 'ro_RO' },
    { label: $t('create_agent.language_hu'), language: '匈牙利语', langCode: 'hu_HU' },
    { label: $t('create_agent.language_ms'), language: '马来语', langCode: 'ms_MY' },
  ];
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
  };
  return mapping[langCode] || 'zh';
}

/**
 * 将后端返回的 lang 值（如 'zh-cn', 'en'）映射到前端 langCode（如 'zh_CN', 'en_US'）
 */
export function backendLangToLangCode(backendLang: string): string {
  const mapping: Record<string, string> = {
    'zh-cn': 'zh_CN',
    'zh-tw': 'zh_TW',
    'en': 'en_US',
    'ja': 'ja_JP',
    'ko': 'ko_KR',
    'yue': 'yue_CN',
    'ne': 'ne_CN',
    'es': 'es_ES',
    'de': 'de_DE',
    'fr': 'fr_FR',
    'hi': 'hi_IN',
    'it': 'it_IT',
    'nl': 'nl_NL',
    'pt': 'pt_PT',
    'ru': 'ru_RU',
    'tr': 'tr_TR',
    'vi': 'vi_VN',
    'km': 'km_KH',
    'th': 'th_TH',
    'id': 'id_ID',
    'mn': 'mn_MN',
    'ar': 'ar_SA',
    'pl': 'pl_PL',
    'uk': 'uk_UA',
    'bg': 'bg_BG',
    'ro': 'ro_RO',
    'hu': 'hu_HU',
    'ms': 'ms_MY',
  };
  return mapping[backendLang.toLowerCase()] || backendLang;
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
