<template>
  <view v-if="visible" class="voice-selector-overlay" @click="handleOverlayClick">
    <view class="voice-selector-container" :style="containerStyles" @click.stop>
      <!-- 搜索栏和筛选 -->
      <view class="search-container" :class="{ 'mp-weixin-offset': isMpWeixin }">
        <view class="search-box">
          <image src="/static/icons/search.svg" class="search-icon" mode="aspectFit" />
          <input
            class="search-input"
            v-model="searchKeyword"
            :placeholder="$t('voice_selector.search_placeholder')"
            type="text"
            @input="onSearchInput" />
          <wd-icon
            v-if="searchKeyword"
            name="close-circle"
            size="32rpx"
            class="clear-icon"
            @click.stop="clearSearch" />
        </view>
      </view>

      <!-- 语言筛选 (非强绑定模式下显示) -->
      <view v-if="showLanguageFilter" class="language-filter-container">
        <scroll-view class="filter-scroll" scroll-x="true" show-scrollbar="false">
          <view class="filter-list">
            <view
              v-for="option in languageOptions"
              :key="option.code"
              class="filter-item"
              :class="{ active: selectedLanguage === option.code }"
              @click="selectLanguage(option.code)">
              {{ option.label }}
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 标签筛选 -->
      <view class="tag-container">
        <scroll-view class="filter-scroll" scroll-x="true" show-scrollbar="false">
          <view class="filter-list">
            <view
              v-for="tag in tags"
              :key="tag"
              class="filter-item"
              :class="{ active: selectedTag === tag }"
              @click="selectTag(tag)">
              {{ tag }}
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 音色列表 -->
      <scroll-view class="voice-list" scroll-y>
        <!-- 空状态提示 -->
        <view v-if="filteredVoices.length === 0" class="empty-state">
          <text class="empty-icon">🎵</text>
          <text class="empty-text">
            {{ selectedTag }}{{ $t('voice_selector.no_voice_category') }}
          </text>
          <text class="empty-hint">{{ $t('voice_selector.try_other_category') }}</text>
        </view>

        <!-- 音色项 -->
        <view
          v-for="voice in filteredVoices"
          :key="voice.voiceId"
          class="voice-item"
          :class="{
            selected: hasUserInteraction && selectedVoice && selectedVoice.voiceId === voice.voiceId
          }"
          @click="selectVoice(voice)">
          <view class="voice-left">
            <view class="voice-avatar">
              <image
                v-if="voice.header_image_url && voice.header_image_url !== ''"
                :src="voice.header_image_url"
                mode="aspectFill"
                class="avatar-image" />
              <view v-else class="default-avatar">
                <image src="/static/icons/voice-mic.svg" class="avatar-icon" mode="aspectFit" />
              </view>
            </view>
            <view class="voice-info">
              <view class="voice-name-container">
                <text class="voice-name">
                  {{ voice.voiceName || $t('voice_selector.unknown_voice') }}
                </text>
                <image
                  v-if="
                    hasUserInteraction &&
                    selectedVoice &&
                    selectedVoice.voiceId === voice.voiceId &&
                    voice.demo &&
                    voice.demo.startsWith('http')
                  "
                  src="/static/icons/voice-play.svg"
                  class="voice-play-icon"
                  :class="{
                    playing:
                      isPlaying &&
                      currentPlayingVoice &&
                      currentPlayingVoice.voiceId === voice.voiceId
                  }"
                  mode="aspectFit"
                  @click.stop="togglePlayDemo(voice)" />
              </view>
              <view class="voice-tags">
                <text v-for="tag in getDisplayTags(voice)" :key="tag" class="voice-tag">
                  {{ tag }}
                </text>
              </view>
            </view>
          </view>
          <view class="voice-actions">
            <image
              v-if="hasUserInteraction && selectedVoice && selectedVoice.voiceId === voice.voiceId"
              src="/static/icons/check.svg"
              class="action-icon selected-icon"
              mode="aspectFit" />
            <image
              v-else
              src="/static/icons/add.svg"
              class="action-icon plus-icon"
              mode="aspectFit"
              @click.stop="selectVoice(voice)" />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部固定按钮 -->
    <view class="bottom-fixed-actions" :style="bottomActionsStyle">
      <button class="cancel-btn secondary" @click="close()">
        {{ $t('voice_selector.cancel') }}
      </button>
      <button
        class="confirm-btn primary"
        :disabled="!hasUserInteraction || !selectedVoice"
        @click="confirm()">
        {{ $t('voice_selector.confirm_selection') }}
      </button>
    </view>
  </view>
</template>

<script>
import { AudioPlayerManager } from '../utils/audioPlayer.ts';
import wdIcon from '../uni_modules/wot-design-uni/components/wd-icon/wd-icon.vue';
import { useUserStore } from '@/store/user';
import { initLanguageDisplayNameCache, getLanguageDisplayName as getLangDisplayName, isLanguageCacheReady, getLanguagePriority } from '@/pages/agent/lang_opts';

export default {
  name: 'VoiceSelector',
  components: {
    wdIcon
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    voices: {
      type: Array,
      default: []
    },
    defaultVoice: {
      type: Object,
      default: null
    },
    isOnTabbarPage: {
      type: Boolean,
      default: false
    },
    // 强制使用的语言代码（如 'zh', 'en' 等）
    // 当传入此 prop 时，音色将被强制筛选为该语言，并隐藏语言筛选器
    fixedLanguage: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      selectedVoice: null,
      selectedTag: this.$t('voice_selector.all'),
      selectedLanguage: 'all',
      audioPlayer: null,
      isPlaying: false,
      currentPlayingVoice: null,
      searchKeyword: '',
      hasUserInteraction: false,
      userStore: useUserStore(),
      isMpWeixin: false,
      isAndroidApp: false,
      topSafeHeight: 0,
      bottomPaddingPx: 0,
      tabBarHidden: false,
      androidStatusBarPx: 0
    };
  },
  computed: {
    // 是否显示语言筛选器（非强绑定模式下显示）
    showLanguageFilter() {
      return !this.fixedLanguage && this.languageOptions.length > 1;
    },
    languageOptions() {
      const languageMap = new Map();

      if (Array.isArray(this.voices)) {
        this.voices.forEach((voice) => {
          this.extractLanguageCodes(voice).forEach((code) => {
            if (!languageMap.has(code)) {
              languageMap.set(code, this.getLanguageDisplayName(code));
            }
          });
        });
      }

      const baseOption = [{ code: 'all', label: this.$t('voice_selector.language_all') }];
      const languageEntries = Array.from(languageMap.entries()).map(([code, label]) => {
        return {
          code,
          label,
          priority: getLanguagePriority(code)
        };
      });

      languageEntries.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.label.localeCompare(b.label);
      });

      const languageOptions = languageEntries.map(({ code, label }) => ({ code, label }));
      return [...baseOption, ...languageOptions];
    },
    tags() {
      const baseTags = [
        this.$t('voice_selector.all'),
        this.$t('voice_selector.male'),
        this.$t('voice_selector.female'),
        this.$t('voice_selector.mine')
      ];
      const dynamicTags = new Set();

      if (this.voices && this.voices.length > 0) {
        this.voices.forEach((voice) => {
          const voiceTags = voice.config?.tags || {};
          if (voiceTags && typeof voiceTags === 'object') {
            // 添加年龄标签
            if (voiceTags.age === 'young') {
              dynamicTags.add(this.$t('voice_selector.young'));
            } else if (voiceTags.age === 'adult') {
              dynamicTags.add(this.$t('voice_selector.adult'));
            } else if (voiceTags.age === 'middle') {
              dynamicTags.add(this.$t('voice_selector.middle'));
            } else if (voiceTags.age === 'old') {
              dynamicTags.add(this.$t('voice_selector.old'));
            }

            // 添加风格标签
            if (voiceTags.styles && Array.isArray(voiceTags.styles)) {
              const styleMap = {
                acgn: this.$t('voice_selector.acgn'),
                tianmei: this.$t('voice_selector.sweet'),
                youhao: this.$t('voice_selector.friendly'),
                chenwen: this.$t('voice_selector.steady'),
                zhixing: this.$t('voice_selector.intellectual'),
                lengjing: this.$t('voice_selector.calm'),
                kailang: this.$t('voice_selector.cheerful'),
                zhishuai: this.$t('voice_selector.straightforward')
              };
              voiceTags.styles.forEach((style) => {
                if (styleMap[style]) {
                  dynamicTags.add(styleMap[style]);
                }
              });
            }

            // 添加场景标签
            if (voiceTags.scenes && Array.isArray(voiceTags.scenes)) {
              const sceneMap = {
                companion: this.$t('voice_selector.companion'),
                audiobook: this.$t('voice_selector.audiobook'),
                dialect: this.$t('voice_selector.dialect')
              };
              voiceTags.scenes.forEach((scene) => {
                if (sceneMap[scene]) {
                  dynamicTags.add(sceneMap[scene]);
                }
              });
            }
          }
        });
      }

      return [...baseTags, ...Array.from(dynamicTags)];
    },
    filteredVoices() {
      if (!this.voices || this.voices.length === 0) {
        return [];
      }

      let result = this.voices;

      if (this.selectedLanguage !== 'all') {
        result = result.filter((voice) =>
          this.extractLanguageCodes(voice).includes(this.selectedLanguage)
        );
      }

      // 先按标签筛选
      if (this.selectedTag !== this.$t('voice_selector.all')) {
        result = result.filter((voice) => {
          const voiceTags = voice.config?.tags || {};

          // 根据选中的标签过滤
          // 男声标签：必须有 gender === 'male'
          if (this.selectedTag === this.$t('voice_selector.male')) {
            return voiceTags.gender === 'male';
          }

          // 女声标签：必须有 gender === 'female'
          if (this.selectedTag === this.$t('voice_selector.female')) {
            return voiceTags.gender === 'female';
          }

          if (this.selectedTag === this.$t('voice_selector.mine')) {
            return voice.userId === this.userStore.userId;
          }

          // 处理动态标签过滤
          if (this.selectedTag === this.$t('voice_selector.young')) {
            return voiceTags.age === 'young';
          }

          if (this.selectedTag === this.$t('voice_selector.adult')) {
            return voiceTags.age === 'adult';
          }

          if (this.selectedTag === this.$t('voice_selector.middle')) {
            return voiceTags.age === 'middle';
          }

          if (this.selectedTag === this.$t('voice_selector.old')) {
            return voiceTags.age === 'old';
          }

          // 处理风格标签
          const styleMap = {};
          styleMap[this.$t('voice_selector.acgn')] = 'acgn';
          styleMap[this.$t('voice_selector.sweet')] = 'tianmei';
          styleMap[this.$t('voice_selector.friendly')] = 'youhao';
          styleMap[this.$t('voice_selector.steady')] = 'chenwen';
          styleMap[this.$t('voice_selector.intellectual')] = 'zhixing';
          styleMap[this.$t('voice_selector.calm')] = 'lengjing';
          styleMap[this.$t('voice_selector.cheerful')] = 'kailang';
          styleMap[this.$t('voice_selector.straightforward')] = 'zhishuai';

          if (styleMap[this.selectedTag]) {
            return voiceTags.styles && voiceTags.styles.includes(styleMap[this.selectedTag]);
          }

          // 处理场景标签
          const sceneMap = {};
          sceneMap[this.$t('voice_selector.companion')] = 'companion';
          sceneMap[this.$t('voice_selector.audiobook')] = 'audiobook';
          sceneMap[this.$t('voice_selector.dialect')] = 'dialect';

          if (sceneMap[this.selectedTag]) {
            return voiceTags.scenes && voiceTags.scenes.includes(sceneMap[this.selectedTag]);
          }

          // 其他未知标签，不显示
          return false;
        });
      }

      // 再按搜索关键词筛选
      if (this.searchKeyword && this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase();
        result = result.filter((voice) => {
          const name = (voice.voiceName || '').toLowerCase();
          return name.includes(keyword);
        });
      }

      return result;
    },
    containerStyles() {
      const styles = {};
      if (this.isMpWeixin && this.topSafeHeight > 0) {
        styles.paddingTop = `${this.topSafeHeight}px`;
        return styles;
      }

      if (this.isAndroidApp && this.androidStatusBarPx > 0) {
        styles.paddingTop = `${this.androidStatusBarPx}px`;
      }

      return styles;
    },
    bottomActionsStyle() {
      if (this.isMpWeixin) {
        return {
          paddingBottom: `${this.bottomPaddingPx}px`
        };
      }
      return {};
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        if (this.isMpWeixin) {
          this.computeMpSafeArea();
          this.hideTabBarIfNeeded();
        }
        this.selectedVoice = this.defaultVoice;
        // 重置用户交互标志
        this.hasUserInteraction = false;
        // 如果设置了强制语言，则使用该语言；否则显示全部
        this.selectedLanguage = this.fixedLanguage || 'all';
      } else {
        // 隐藏时停止播放
        this.stopAudio();
        this.showTabBarIfNeeded();
      }
    },
    defaultVoice(newVal) {
      this.selectedVoice = newVal;
    },
    isOnTabbarPage() {
      if (this.isMpWeixin) {
        this.computeMpSafeArea();
        this.hideTabBarIfNeeded();
      }
    }
  },
  async created() {
    if (!isLanguageCacheReady()) {
      await initLanguageDisplayNameCache();
    }
  },
  mounted() {
    // #ifdef MP-WEIXIN
    this.isMpWeixin = true;
    this.computeMpSafeArea();
    // #endif
    // #ifdef APP-PLUS
    try {
      const systemInfo = uni.getSystemInfoSync();
      const platform = (systemInfo.platform || '').toLowerCase();
      if (platform === 'android') {
        this.isAndroidApp = true;
        this.androidStatusBarPx = systemInfo.statusBarHeight || 24;
      }
    } catch (error) {
      console.warn('APP statusBar detection failed:', error);
    }
    // #endif
    // 初始化音频播放器
    this.audioPlayer = AudioPlayerManager.getInstance(
      { autoStop: true, loop: false },
      {
        onPlay: (audio) => {
          this.isPlaying = true;
          this.currentPlayingVoice = audio;
        },
        onStop: (audio) => {
          this.isPlaying = false;
          this.currentPlayingVoice = null;
        },
        onEnded: (audio) => {
          this.isPlaying = false;
          this.currentPlayingVoice = null;
        },
        onError: (error, audio) => {
          this.isPlaying = false;
          this.currentPlayingVoice = null;
          console.error('音频播放失败:', error);
          uni.showToast({
            title: this.$t('voice_selector.play_failed'),
            icon: 'none'
          });
        }
      }
    );
  },
  beforeDestroy() {
    // 组件销毁前清理音频资源
    this.cleanupAudio();
    this.showTabBarIfNeeded();
  },
  methods: {
    computeMpSafeArea() {
      if (!this.isMpWeixin) {
        return;
      }

      try {
        const systemInfo = uni.getSystemInfoSync();
        this.topSafeHeight = this.getSafeTopInset(systemInfo);

        const basePadding = uni.upx2px(20);
        this.bottomPaddingPx = basePadding + this.getSafeBottomInset(systemInfo);
      } catch (error) {
        this.topSafeHeight = 0;
        const basePadding = uni.upx2px(20);
        this.bottomPaddingPx = basePadding;
      }
    },
    hideTabBarIfNeeded() {
      if (!this.isMpWeixin || !this.isOnTabbarPage || this.tabBarHidden) {
        return;
      }

      try {
        uni.hideTabBar({ animation: false });
        this.tabBarHidden = true;
      } catch (error) {
        console.warn('hideTabBar failed:', error);
      }
    },
    showTabBarIfNeeded() {
      if (!this.isMpWeixin || !this.isOnTabbarPage || !this.tabBarHidden) {
        return;
      }

      try {
        uni.showTabBar({ animation: false });
      } catch (error) {
        console.warn('showTabBar failed:', error);
      } finally {
        this.tabBarHidden = false;
      }
    },
    getSafeTopInset(systemInfo) {
      if (systemInfo.safeAreaInsets && typeof systemInfo.safeAreaInsets.top === 'number') {
        return systemInfo.safeAreaInsets.top;
      }

      if (systemInfo.safeArea && typeof systemInfo.safeArea.top === 'number') {
        return systemInfo.safeArea.top;
      }

      if (typeof systemInfo.statusBarHeight === 'number') {
        return systemInfo.statusBarHeight;
      }

      return 0;
    },
    getSafeBottomInset(systemInfo) {
      if (systemInfo.safeAreaInsets && typeof systemInfo.safeAreaInsets.bottom === 'number') {
        return systemInfo.safeAreaInsets.bottom;
      }

      if (systemInfo.safeArea && typeof systemInfo.safeArea.bottom === 'number') {
        return systemInfo.screenHeight - systemInfo.safeArea.bottom;
      }

      return 0;
    },
    selectLanguage(code) {
      this.selectedLanguage = code;
    },
    extractLanguageCodes(voice) {
      const codes = new Set();
      const primary = this.normalizeLanguageCode(voice?.language);
      if (primary) {
        codes.add(primary);
      }

      const tagLanguages = voice?.config?.tags?.languages;
      if (Array.isArray(tagLanguages)) {
        tagLanguages.forEach((lang) => {
          const normalized = this.normalizeLanguageCode(lang);
          if (normalized) {
            codes.add(normalized);
          }
        });
      }

      return Array.from(codes);
    },
    normalizeLanguageCode(language) {
      if (!language || typeof language !== 'string') {
        return '';
      }

      const normalized = language.toLowerCase().replace(/_/g, '-');
      if (normalized.startsWith('cmn') || normalized.startsWith('zh')) {
        return 'zh';
      }
      if (normalized.startsWith('en')) {
        return 'en';
      }
      if (normalized.startsWith('ja') || normalized.startsWith('jp')) {
        return 'ja';
      }
      if (normalized.startsWith('yue') || normalized.startsWith('zh-yue')) {
        return 'yue';
      }
      if (normalized.startsWith('ko')) {
        return 'ko';
      }
      if (normalized.startsWith('es')) {
        return 'es';
      }
      if (normalized.startsWith('fr')) {
        return 'fr';
      }
      if (normalized.startsWith('de')) {
        return 'de';
      }
      if (normalized.startsWith('ru')) {
        return 'ru';
      }
      if (normalized.startsWith('pt')) {
        return 'pt';
      }
      if (normalized.startsWith('it')) {
        return 'it';
      }
      if (normalized.startsWith('vi')) {
        return 'vi';
      }
      if (normalized.startsWith('hi')) {
        return 'hi';
      }
      if (normalized.startsWith('tr')) {
        return 'tr';
      }
      if (normalized.startsWith('nl')) {
        return 'nl';
      }
      if (normalized.startsWith('ar')) {
        return 'ar';
      }
      if (normalized.startsWith('id')) {
        return 'id';
      }
      if (normalized.startsWith('in')) {
        return 'id';
      }
      if (normalized.startsWith('ms')) {
        return 'ms';
      }
      if (normalized.startsWith('th')) {
        return 'th';
      }
      if (normalized.startsWith('he') || normalized.startsWith('iw')) {
        return 'he';
      }
      if (normalized.startsWith('pl')) {
        return 'pl';
      }
      if (normalized.startsWith('sv')) {
        return 'sv';
      }
      if (normalized.startsWith('da')) {
        return 'da';
      }
      if (normalized.startsWith('fi')) {
        return 'fi';
      }
      if (normalized.startsWith('no') || normalized.startsWith('nb') || normalized.startsWith('nn')) {
        return 'no';
      }
      if (normalized.startsWith('cs')) {
        return 'cs';
      }
      if (normalized.startsWith('uk')) {
        return 'uk';
      }
      if (normalized.startsWith('ro')) {
        return 'ro';
      }
      if (normalized.startsWith('hu')) {
        return 'hu';
      }
      if (normalized.startsWith('el')) {
        return 'el';
      }
      if (normalized.startsWith('km')) {
        return 'km';
      }
      if (normalized.startsWith('ne')) {
        return 'ne';
      }

      return normalized;
    },
    getLanguageDisplayName(code) {
      if (!code) {
        return this.$t('voice_selector.language_unknown');
      }
      return getLangDisplayName(code, code.toUpperCase());
    },
    selectTag(tag) {
      this.selectedTag = tag;
    },
    onSearchInput(e) {
      this.searchKeyword = e.detail.value;
    },
    clearSearch() {
      this.searchKeyword = '';
    },
    selectVoice(voice) {
      // 切换音色时停止播放
      this.stopAudio();
      this.selectedVoice = voice;
      // 标记用户已进行交互
      this.hasUserInteraction = true;
    },
    togglePlayDemo(voice) {
      if (!voice.demo || !voice.demo.startsWith('http')) {
        return;
      }

      const audioItem = {
        id: voice.voiceId,
        src: voice.demo,
        name: voice.voiceName
      };

      // 如果当前正在播放相同的音频，则停止
      if (
        this.isPlaying &&
        this.currentPlayingVoice &&
        this.currentPlayingVoice.voiceId === voice.voiceId
      ) {
        this.stopAudio();
      } else {
        // 播放新音频
        this.playVoice(audioItem);
      }
    },
    playVoice(audioItem) {
      if (this.audioPlayer) {
        this.audioPlayer.play(audioItem);
      }
    },
    stopAudio() {
      if (this.audioPlayer) {
        this.audioPlayer.stop();
      }
    },
    cleanupAudio() {
      if (this.audioPlayer) {
        this.audioPlayer.cleanup();
        this.audioPlayer = null;
      }
      this.isPlaying = false;
      this.currentPlayingVoice = null;
    },
    getDisplayTags(voice) {
      if (!voice.config?.tags || typeof voice.config?.tags !== 'object') {
        return [this.$t('voice_selector.general')];
      }

      const tags = [];
      const voiceTags = voice.config?.tags || {};

      // 添加性别标签
      if (voiceTags.gender === 'male') {
        tags.push(this.$t('voice_selector.male'));
      } else if (voiceTags.gender === 'female') {
        tags.push(this.$t('voice_selector.female'));
      }

      // 添加年龄标签
      if (voiceTags.age === 'young') {
        tags.push(this.$t('voice_selector.young'));
      } else if (voiceTags.age === 'adult') {
        tags.push(this.$t('voice_selector.adult'));
      }

      // 添加风格标签
      if (voiceTags.styles && Array.isArray(voiceTags.styles) && voiceTags.styles.length > 0) {
        const styleMap = {
          acgn: this.$t('voice_selector.acgn'),
          tianmei: this.$t('voice_selector.sweet'),
          youhao: this.$t('voice_selector.friendly'),
          chenwen: this.$t('voice_selector.steady'),
          zhixing: this.$t('voice_selector.intellectual'),
          lengjing: this.$t('voice_selector.calm'),
          kailang: this.$t('voice_selector.cheerful'),
          zhishuai: this.$t('voice_selector.straightforward')
        };
        const style = voiceTags.styles[0];
        if (styleMap[style]) {
          tags.push(styleMap[style]);
        }
      }

      // 添加场景标签
      if (voiceTags.scenes && Array.isArray(voiceTags.scenes) && voiceTags.scenes.length > 0) {
        const sceneMap = {
          companion: this.$t('voice_selector.companion'),
          audiobook: this.$t('voice_selector.audiobook'),
          dialect: this.$t('voice_selector.dialect')
        };
        const scene = voiceTags.scenes[0];
        if (sceneMap[scene]) {
          tags.push(sceneMap[scene]);
        }
      }

      // 如果没有标签，返回默认
      if (tags.length === 0) {
        return [this.$t('voice_selector.general')];
      }

      return tags.slice(0, 3); // 最多显示3个标签
    },
    onAudioError({ error, audio }) {
      console.error('音频播放失败:', error);
      uni.showToast({
        title: this.$t('voice_selector.play_failed'),
        icon: 'none'
      });
    },
    handleOverlayClick() {
      this.close();
    },
    close() {
      // 关闭时停止播放
      this.stopAudio();
      this.$emit('close');
    },
    confirm() {
      if (this.selectedVoice) {
        this.$emit('confirm', this.selectedVoice);
      }
    }
  }
};
</script>

<style scoped>
.voice-selector-overlay {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.voice-selector-container {
  max-width: full;
  width: full;
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  animation: slideDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding-bottom: 200rpx;
  /* iOS 顶部安全区域适配 - 只使用 safe-area-inset-top */
  padding-top: 0;
  /* #ifndef MP-WEIXIN */
  padding-top: constant(safe-area-inset-top); /* iOS < 11.2 */
  padding-top: env(safe-area-inset-top); /* iOS >= 11.2 */
  /* #endif */
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.search-container {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.search-container.mp-weixin-offset {
  padding-right: calc(32rpx + 200rpx);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 0 24rpx;
  gap: 16rpx;
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  background: transparent;
  border: none;
  outline: none;
  height: 100%;
}

.search-input::placeholder {
  color: #999;
}

.clear-icon {
  flex-shrink: 0;
  opacity: 0.5;
  color: #999;
}

.language-filter-container {
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.language-filter-container .filter-list {
  padding: 12rpx 0;
}


.tag-container {
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: flex;
  padding: 16rpx 0;
  gap: 12rpx;
}

.filter-item {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
  font-weight: 400;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.filter-item.active {
  background: var(--color-primary);
  color: #fff;
}

.voice-list {
  width: 100%;
  flex: 1;
  padding: 16rpx 24rpx 32rpx;
  /* 底部预留空间，避免被固定按钮遮挡 */
  padding-bottom: 260rpx;
  padding-bottom: calc(260rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(260rpx + env(safe-area-inset-bottom));
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 28rpx;
  color: #999;
}

.voice-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #f0f0f0;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}

.voice-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.voice-avatar {
  width: 96rpx;
  height: 96rpx;
  margin-right: 28rpx;
  position: relative;
}

.avatar-image {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  border: 1rpx solid #e5e5e5;
}

.default-avatar {
  width: 96rpx;
  height: 96rpx;
  background: var(--color-primary-placeholder-bg);
  border-radius: 24rpx;
  overflow: hidden;
  position: relative;
}

.avatar-icon {
  width: 48rpx;
  height: 48rpx;
  position: absolute;
  left: 24rpx;
  top: 24rpx;
  color: var(--color-primary-placeholder-text);
}

.voice-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
  overflow: hidden;
}

.voice-name-container {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
  width: fit-content;
  max-width: 100%;
}

.voice-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400rpx;
  flex-shrink: 1;
}

.voice-play-icon {
  width: 40rpx;
  height: 42rpx;
  flex-shrink: 0;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.voice-play-icon:hover {
  opacity: 1;
  transform: scale(1.1);
}

.voice-play-icon.playing {
  opacity: 1;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.voice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  align-items: center;
}

.voice-tag {
  font-size: 24rpx;
  color: #6b7280;
  background: #f5f5f5;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 400;
  border: none;
  transition: all 0.2s ease;
}

.voice-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-icon {
  color: var(--color-primary);
}

.plus-icon {
  color: #94a3b8;
}

.bottom-fixed-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  /* iOS 全面屏底部安全区域适配 */
  /* #ifndef MP-WEIXIN */
  padding-bottom: 20rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  /* #endif */
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  gap: 24rpx;
  z-index: 1000;
  box-shadow: none;
}

.cancel-btn,
.confirm-btn {
  height: 96rpx;
  border-radius: 48rpx;
}
</style>
