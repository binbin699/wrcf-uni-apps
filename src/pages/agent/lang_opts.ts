export interface ChatLanguageOption {
  language: string;
  langCode: string;
  voiceLanguage: string;
}

import { languageApi } from '@/api/index';

/**
 * 获取对话语言选项列表（异步）
 * 接口通过 Accept-Language 自动返回国际化的 language 字段
 */
export async function getChatLanguageOptions(): Promise<ChatLanguageOption[]> {
  try {
    const res = await languageApi.getList();
    
    if (res.code === 1000 && res.data && Array.isArray(res.data) && res.data.length > 0) {
      // API 返回成功，转换为 ChatLanguageOption 格式
      const mapped = res.data.map((lang: { langCode: string; language: string; voiceLanguage: string }) => {
        return {
          langCode: lang.langCode,
          language: lang.language,
          voiceLanguage: lang.voiceLanguage,
        };
      });
      return mapped;
    }
  } catch (error) {
    console.error('获取语言列表失败:', error);
  }
  
  // 如果 API 失败，返回空数组
  return [];
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
