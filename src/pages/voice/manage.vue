<template>
  <view class="voice-manage-container">
    <wd-gap></wd-gap>
    <!-- 操作按钮 -->
    <view class="action-section">
      <wd-button type="primary" size="large" block icon="add-outline" @click="gotoVoiceClone">
        {{ $t('voice_manage.create_new_voice') }}
      </wd-button>

      <wd-button
        type="info"
        size="large"
        icon="refresh"
        :loading="loading"
        @click="syncVoiceStatus">
        {{ $t('common.refresh') }}
      </wd-button>
    </view>

    <wd-divider />

    <!-- 音色列表 -->
    <view class="voices-section">
      <!-- 加载状态 -->
      <wd-loading v-if="loading" size="40px">
        <text class="loading-text">{{ $t('common.loading') }}</text>
      </wd-loading>

      <!-- 空状态 -->
      <wd-status-tip
        v-else-if="myVoices.length === 0"
        image="search"
        :tip="$t('voice_manage.no_voices')" />

      <!-- 音色列表 -->
      <view v-else class="voices-list">
        <wd-card v-for="voice in myVoices" :key="voice.id" class="voice-card">
          <view class="voice-header">
            <view class="voice-info">
              <view class="voice-title-row">
                <text class="voice-name">{{ voice.voiceName }}</text>
                <view class="voice-badges">
                  <wd-tag :type="getStatusTagType(voice.state)" round>
                    {{ getStatusText(voice.state) }}
                  </wd-tag>
                  <wd-tag :type="voice.isPublic ? 'success' : 'default'" round>
                    {{ voice.isPublic ? $t('voice_manage.public') : $t('voice_manage.private') }}
                  </wd-tag>
                </view>
              </view>
            </view>
            <view class="voice-header-actions" @click.stop>
              <wd-icon
                v-if="voice.demoUrl || voice.audioUrl"
                name="/static/icons/voice-play.svg"
                size="24px"
                @click.stop="togglePlayDemo(voice)"></wd-icon>
              <wd-icon name="delete" size="22px" @click="deleteVoice(voice.voiceId)"></wd-icon>
            </view>
          </view>

          <view class="voice-content">
            <text class="update-time">
              <wd-icon name="time" size="14px" />
              {{ $t('voice_manage.update_time') }}: {{ formatTime(voice.updateTime) }}
            </text>
          </view>

          <view class="voice-actions">
            <wd-button type="primary" size="medium" icon="edit-outline" @click="updateVoice(voice)">
              {{ $t('voice_manage.update_voice') }}
            </wd-button>

            <wd-button type="info" size="medium" icon="edit" @click="showRenameModal(voice)">
              {{ $t('voice_manage.rename') }}
            </wd-button>
          </view>
        </wd-card>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// todo
// @ts-ignore
import { voiceApi } from '@/api/index.js';
import { PageMap, Pages } from '@/utils/route';
import { ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import AudioPlayerManager from '@/utils/audioPlayer';
import { TagType } from '@/uni_modules/wot-design-uni/components/wd-tag/types';

const { t: $t } = useI18n();

type VoiceState = 'Init' | 'Training' | 'Success' | 'Failed';

type Voice = {
  audioUrl: string;
  createTime: string;
  demoUrl?: string;
  id: number;
  isPublic: boolean;
  language: string;
  remark?: string;
  state: VoiceState;
  syncTime: string;
  tenantId: null;
  updateTime: string;
  userId: number;
  userName: string;
  voiceId: string;
  voiceName: string;
};

const myVoices = ref<Voice[]>([]);
const loading = ref(false);
// 当前播放的音色ID
const playingVoiceId = ref<string | null>(null);
// 音频播放状态
const isPlaying = ref(false);
// 音频播放管理器
const audioPlayer = ref<AudioPlayerManager | null>(null);

onLoad(() => {
  initAudioManager();
  loadMyVoices();
});

onShow(() => {
  // 从音色复刻页面返回时刷新列表
  loadMyVoices();
});

onUnload(() => {
  // 页面卸载时的清理工作
  cleanup();
});

// 初始化音频播放管理器
function initAudioManager() {
  audioPlayer.value = AudioPlayerManager.getInstance(
    {
      autoStop: true,
      loop: false,
      volume: 1
    },
    {
      onPlay: (audio) => {
        isPlaying.value = true;
        console.log('音频开始播放:', audio);
      },
      onStop: (audio) => {
        isPlaying.value = false;
        playingVoiceId.value = null;
        console.log('音频停止播放:', audio);
      },
      onEnded: (audio) => {
        isPlaying.value = false;
        playingVoiceId.value = null;
        console.log('音频播放结束:', audio);
      },
      onError: (error, audio) => {
        isPlaying.value = false;
        playingVoiceId.value = null;
        console.error('音频播放失败:', error);
        uni.showToast({
          title: $t('voice_manage.play_failed') || '播放失败',
          icon: 'none'
        });
      }
    }
  );
}

// 清理资源
function cleanup() {
  if (audioPlayer.value) {
    audioPlayer.value.cleanup();
  }
  isPlaying.value = false;
  playingVoiceId.value = null;
}

// 跳转到音色复刻页面
function gotoVoiceClone() {
  uni.navigateTo({
    url: PageMap[Pages.VoiceClone].url
  });
}

// 加载我的音色列表
async function loadMyVoices() {
  loading.value = true;
  try {
    const result = await voiceApi.getMyVoices();
    if (result.code === 1000) {
      myVoices.value = result.data.voices || [];
    } else {
      console.error('加载音色列表失败:', result.message);
      // 不再显示toast，因为request.ts已经处理了
    }
  } catch (error) {
    console.error('加载音色列表失败:', error);
    // 不再显示toast，因为request.ts已经处理了
  } finally {
    loading.value = false;
  }
}

// 刷新音色列表（不同步状态，避免覆盖用户自定义的音色名称）
async function syncVoiceStatus() {
  loading.value = true;
  try {
    // 只刷新列表，不调用 sync 接口
    // sync 接口会用平台返回的名称覆盖用户自定义的名称
    await loadMyVoices();
  } catch (error) {
    console.error('刷新音色列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 重新训练音色（保留方法以便后续拓展）
function retrainVoice(voice: Voice) {
  uni.navigateTo({
    url: `${PageMap[Pages.VoiceClone].url}?retrain=1&voiceId=${
      voice.voiceId
    }&voiceName=${encodeURIComponent(voice.voiceName)}`
  });
}

// 切换公开状态（保留方法以便后续拓展）
async function togglePublic(voice: Voice) {
  try {
    uni.showLoading({ title: $t('voice_manage.setting') });
    const result = await voiceApi.setVoicePublic(voice.voiceId, !voice.isPublic);
    uni.hideLoading();

    if (result.code === 1000) {
      voice.isPublic = !voice.isPublic;
      uni.showToast({
        title: voice.isPublic ? $t('voice_manage.set_public') : $t('voice_manage.set_private'),
        icon: 'success'
      });
    } else {
      throw new Error(result.message || $t('voice_manage.set_failed'));
    }
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({
      title: error?.message || $t('voice_manage.set_failed'),
      icon: 'none'
    });
  }
}

// 删除音色
async function deleteVoice(voiceId: string) {
  uni.showModal({
    title: $t('voice_manage.confirm_delete'),
    content: $t('voice_manage.delete_warning'),
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: $t('voice_manage.deleting') });
          const result = await voiceApi.removeVoice(voiceId);
          uni.hideLoading();

          if (result.code === 1000) {
            uni.showToast({
              title: $t('voice_manage.delete_success'),
              icon: 'success'
            });
            loadMyVoices();
          } else {
            throw new Error(result.message || $t('voice_manage.delete_failed'));
          }
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error?.message || $t('voice_manage.delete_failed'),
            icon: 'none'
          });
        }
      }
    }
  });
}

// 切换播放演示音频
async function togglePlayDemo(voice: Voice) {
  console.log('切换播放演示音频，音色数据:', voice);
  console.log('音色demoUrl:', voice.demoUrl);
  console.log('当前播放ID:', playingVoiceId.value, '音色ID:', voice.voiceId);

  if (!audioPlayer.value) {
    console.error('音频播放管理器未初始化');
    return;
  }

  // 获取音频URL，优先使用demoUrl，其次使用audioUrl
  const audioUrl = voice.demoUrl || voice.audioUrl;
  if (!audioUrl) {
    uni.showToast({
      title: $t('voice_manage.no_voice_demo'),
      icon: 'none'
    });
    return;
  }

  audioPlayer.value.toggle({ src: audioUrl, name: voice.voiceName });
}

// 获取状态标签类型
function getStatusTagType(state: VoiceState) {
  const typeMap: Record<VoiceState, TagType> = {
    Init: 'default',
    Training: 'warning',
    Success: 'success',
    Failed: 'danger'
  };
  return typeMap[state] || 'default';
}

// 更新音色
function updateVoice(voice: Voice) {
  uni.navigateTo({
    url: `${PageMap[Pages.VoiceClone].url}?mode=edit&voiceId=${
      voice.voiceId
    }&voiceName=${encodeURIComponent(voice.voiceName)}`
  });
}

// 格式化时间
function formatTime(timestamp: string) {
  if (!timestamp) return '-';
  // 处理iOS兼容性问题，将"yyyy-MM-dd HH:mm:ss"格式转换为"yyyy/MM/dd HH:mm:ss"
  let dateStr = timestamp;
  if (typeof timestamp === 'string' && timestamp.includes('-')) {
    dateStr = timestamp.replace(/-/g, '/');
  }
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 获取状态文本
function getStatusText(state: VoiceState) {
  const statusMap = {
    Init: $t('voice_manage.status_init'),
    Training: $t('voice_manage.status_training'),
    Success: $t('voice_manage.status_success'),
    Failed: $t('voice_manage.status_failed')
  };
  return statusMap[state] || state;
}

// 显示修改名称对话框
function showRenameModal(voice: Voice) {
  uni.showModal({
    title: $t('voice_manage.rename_voice'),
    editable: true,
    placeholderText: $t('voice_manage.enter_new_name'),
    content: voice.voiceName,
    success: async (res) => {
      if (res.confirm) {
        const newVoiceName = res.content?.trim() || '';

        if (!newVoiceName) {
          uni.showToast({
            title: $t('voice_manage.enter_voice_name'),
            icon: 'none'
          });
          return;
        }

        if (newVoiceName === voice.voiceName) {
          return;
        }

        try {
          uni.showLoading({ title: $t('voice_manage.renaming') });
          const result = await voiceApi.update({
            id: voice.id,
            voiceName: newVoiceName
          });
          uni.hideLoading();

          if (result.code === 1000) {
            uni.showToast({
              title: $t('voice_manage.rename_success'),
              icon: 'success'
            });
            loadMyVoices();
          } else {
            throw new Error(result.message || $t('voice_manage.rename_failed'));
          }
        } catch (error: any) {
          uni.hideLoading();
          uni.showToast({
            title: error.message || $t('voice_manage.rename_failed'),
            icon: 'none'
          });
        }
      }
    }
  });
}
</script>

<style scoped>
.voice-manage-container {
  padding-left: 20rpx;
  padding-right: 20rpx;
  background: #f8f9fa;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
}

/* 操作区域 */
.action-section {
  display: flex;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

/* 音色列表区域 */
.voices-section {
  background: white;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.loading-text {
  font-size: 30rpx;
  color: #999;
  margin-top: 20rpx;
}

.empty-desc {
  display: block;
  font-size: 28rpx;
  color: #ccc;
  line-height: 1.5;
}

.voices-list {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.voice-card {
  margin-bottom: 20rpx;
}

.voice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.voice-header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.voice-info {
  flex: 1;
}

.voice-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: nowrap;
  overflow: hidden;
}

.voice-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200rpx;
}

.voice-badges {
  display: flex;
  gap: 8rpx;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
}

.voice-content {
  margin: 20rpx 0;
}

.update-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.voice-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  flex-wrap: wrap;
}
</style>
