import { createI18n } from 'vue-i18n';
import zhHans from './zh-Hans.json';
import en from './en.json';
import ja from './ja.json';
import ru from './ru.json';
import { ref, type Ref } from 'vue';

const messages = {
  zh: zhHans,
  'zh-Hans': zhHans,
  en,
  ja,
  ru
};

type supportLang = 'zh-Hans' | 'en' | 'ja' | 'ru';

// 根据系统语言自动选择
const systemLocale = uni.getLocale();
const locale: Ref<supportLang> = ref(
  systemLocale === 'zh-Hans' || systemLocale === 'zh'
    ? 'zh-Hans'
    : systemLocale === 'ja' || systemLocale === 'ja-JP'
      ? 'ja'
      : systemLocale === 'ru' || systemLocale === 'ru-RU'
        ? 'ru'
        : 'en'
);

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
