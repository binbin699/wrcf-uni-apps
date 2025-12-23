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
  };
  return mapping[langCode] || 'zh';
}
