import { createI18n } from 'vue-i18n';
import zhHans from './zh-Hans.json';
// #ifndef MP-WEIXIN
import en from './en.json';
import ja from './ja.json';
import ru from './ru.json';
import kk from './kk.json';
import ko from './ko.json';
import ar from './ar.json';
import th from './th.json';
import es from './es.json';
import fr from './fr.json';
// #endif
import { ref, type Ref } from 'vue';

const messages = {
  zh: zhHans,
  'zh-Hans': zhHans,
  // #ifndef MP-WEIXIN
  en,
  ja,
  ru,
  kk,
  ko,
  ar,
  th,
  es,
  fr
  // #endif
};

type supportLang =
  | 'zh-Hans'
  // #ifndef MP-WEIXIN
  | 'en'
  | 'ja'
  | 'ru'
  | 'kk'
  | 'ko'
  | 'ar'
  | 'th'
  | 'es'
  | 'fr'
  // #endif
;

// 根据系统语言自动选择
const systemLocale = uni.getLocale();

function resolveLocale(systemLocale: string): supportLang {
  // #ifdef MP-WEIXIN
  return 'zh-Hans';
  // #endif

  // #ifndef MP-WEIXIN
  return systemLocale === 'zh-Hans' || systemLocale === 'zh'
    ? 'zh-Hans'
    : systemLocale === 'ja' || systemLocale === 'ja-JP'
      ? 'ja'
      : systemLocale === 'ru' || systemLocale === 'ru-RU'
        ? 'ru'
        : systemLocale === 'kk' || systemLocale === 'kk-KZ'
          ? 'kk'
          : systemLocale === 'ko' || systemLocale === 'ko-KR'
            ? 'ko'
            : systemLocale === 'ar' || systemLocale === 'ar-SA'
              ? 'ar'
              : systemLocale === 'th' || systemLocale === 'th-TH'
                ? 'th'
                : systemLocale === 'es' ||
                    systemLocale === 'es-ES' ||
                    systemLocale === 'es-MX' ||
                    systemLocale.startsWith('es-')
                  ? 'es'
                  : systemLocale === 'fr' ||
                      systemLocale === 'fr-FR' ||
                      systemLocale === 'fr-CA' ||
                      systemLocale.startsWith('fr-')
                    ? 'fr'
                    : 'en';
  // #endif
}

const locale: Ref<supportLang> = ref(resolveLocale(systemLocale));

console.log('systemLocale', systemLocale, 'locale', locale.value);

const i18n = createI18n({
  locale: locale.value, // 设置当前语言类型
  legacy: false, // 如果要支持compositionAPI，此项必须设置为false;
  globalInjection: true, // 全局注册$t方法
  messages
});

export function setLocale(lang: supportLang) {
  uni.setLocale(lang);
  i18n.global.locale.value = lang;
  locale.value = lang;
}

export function getLocale() {
  return locale.value;
}

setLocale(locale.value);

export default i18n;
