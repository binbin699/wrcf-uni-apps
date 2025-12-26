<template>
  <view class="voice-manage-container">
    <!-- 顶部操作栏 -->
    <view class="top-action-bar">
      <view class="action-btn refresh-btn" :class="{ loading: loading }" @click="syncVoiceStatus">
        <image src="/static/icons/refresh-loop.svg" class="refresh-icon-img" mode="aspectFit" />
      </view>
      <view class="action-btn add-btn" @click="gotoVoiceClone">
        <view class="add-icon"></view>
      </view>
    </view>

    <!-- 音色列表 -->
    <view class="voices-section">
      <!-- 加载状态 -->
      <view v-if="loading" class="loading-wrapper">
        <wd-loading size="40px">
          <text class="loading-text">{{ $t('common.loading') }}</text>
        </wd-loading>
      </view>

      <!-- 空状态 -->
      <wd-status-tip
        v-else-if="myVoices.length === 0"
        image="search"
        :tip="$t('voice_manage.no_voices')" />

      <!-- 音色列表 -->
      <view v-else class="voices-list">
        <view v-for="voice in myVoices" :key="voice.id" class="voice-card">
          <!-- 删除按钮 -->
          <view class="delete-btn" @click.stop="deleteVoice(voice.voiceId)">
            <wd-icon name="delete" size="21px" color="#99A0AE" />
          </view>
          
          <!-- 卡片内容 -->
          <view class="card-content">
            <!-- 音色名称行 -->
            <view class="voice-name-row">
              <view class="voice-name-group">
                <text class="voice-name">{{ voice.voiceName }}</text>
                <view class="edit-icon" @click.stop="showRenameModal(voice)">
                  <image src="/static/icons/edit-pen.svg" class="edit-icon-img" mode="aspectFit" />
                </view>
                <view 
                  v-if="voice.state === 'Success' && (voice.demoUrl || voice.audioUrl)" 
                  class="play-icon" 
                  :class="{ playing: playingVoiceId === voice.voiceId }"
                  @click.stop="togglePlayDemo(voice)">
                  <!-- 静态图标 -->
                  <image v-if="playingVoiceId !== voice.voiceId" src="/static/icons/voice-play.svg" class="play-icon-img" mode="aspectFit" />
                  <!-- 播放中的声波动画 -->
                  <view v-else class="wave-animation">
                    <view class="wave-bar" style="animation-delay: 0s;"></view>
                    <view class="wave-bar" style="animation-delay: 0.15s;"></view>
                    <view class="wave-bar" style="animation-delay: 0.3s;"></view>
                    <view class="wave-bar" style="animation-delay: 0.45s;"></view>
                    <view class="wave-bar" style="animation-delay: 0.6s;"></view>
                  </view>
                </view>
              </view>
            </view>
            
            <!-- 标签行 -->
            <view class="tags-row">
              <view class="tag private-tag">
                <text class="tag-text">{{ voice.isPublic ? $t('voice_manage.public') : $t('voice_manage.private') }}</text>
              </view>
              <view class="tag status-tag" :class="getStatusClass(voice.state)">
                <text class="tag-text">{{ getStatusText(voice.state) }}</text>
              </view>
            </view>
            
            <!-- 更新时间 -->
            <text class="update-time">{{ $t('voice_manage.update_time') }}：{{ formatTime(voice.updateTime) }}</text>
          </view>
          
          <!-- 更新按钮区域 -->
          <view class="update-btn-wrapper">
            <view class="update-btn" @click="updateVoice(voice)">
              <text class="update-btn-text">{{ $t('voice_manage.update_voice') }}</text>
            </view>
          </view>
        </view>
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
          title: $t('voice_manage.play_failed'),
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

  // 设置当前播放的音色ID
  if (playingVoiceId.value === voice.voiceId) {
    playingVoiceId.value = null;
  } else {
    playingVoiceId.value = voice.voiceId;
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

// 获取状态样式类
function getStatusClass(state: VoiceState) {
  const classMap: Record<VoiceState, string> = {
    Init: 'status-init',
    Training: 'status-training',
    Success: 'status-success',
    Failed: 'status-failed'
  };
  return classMap[state] || 'status-init';
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

<style lang="scss" scoped>
.voice-manage-container {
  padding: 0 32rpx;
  background: #FFFFFF;
  min-height: 100vh;
}

/* 顶部操作栏 */
.top-action-bar {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  padding: 24rpx 0;
  gap: 24rpx;
}

.action-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 166rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn {
  background: #F2F5F8;
  
  &.loading {
    animation: spin 1s linear infinite;
  }
}

.refresh-icon-img {
  width: 54rpx;
  height: 54rpx;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.add-btn {
  background: #335CFF;
}

.add-icon {
  position: relative;
  width: 28rpx;
  height: 28rpx;
  
  &::before {
    content: '';
    position: absolute;
    width: 28rpx;
    height: 0;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-top: 4rpx solid #FFFFFF;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 28rpx;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-left: 4rpx solid #FFFFFF;
  }
}

/* 音色列表区域 */
.voices-section {
  padding: 20rpx 0;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #717784;
  margin-top: 20rpx;
}

.voices-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

/* 卡片样式 */
.voice-card {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 32rpx;
  gap: 8rpx;
  width: 100%;
  background: #FFFFFF;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
}

/* 删除按钮 */
.delete-btn {
  position: absolute;
  width: 56rpx;
  height: 56rpx;
  right: 32rpx;
  top: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 185rpx;
}

/* 卡片内容 */
.card-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16rpx;
  width: 100%;
}

/* 音色名称行 */
.voice-name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 40rpx;
}

.voice-name-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
}

.voice-name {
  height: 48rpx;
  font-weight: 600;
  font-size: 36rpx;
  line-height: 48rpx;
  display: flex;
  align-items: center;
  color: #0E121B;
  max-width: 300rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-icon-img {
  width: 48rpx;
  height: 48rpx;
}

.play-icon {
  width: 48rpx;
  height: 48rpx;
  min-width: 48rpx;
  min-height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 24rpx;
  cursor: pointer;
}

.play-icon-img {
  width: 40rpx;
  height: 40rpx;
  pointer-events: none;
}

/* 播放中的声波动画 */
.wave-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 40rpx;
}

.wave-bar {
  width: 4rpx;
  height: 100%;
  background: #335CFF;
  border-radius: 4rpx;
  animation: wave-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes wave-pulse {
  0% {
    transform: scaleY(0.3);
  }
  100% {
    transform: scaleY(1);
  }
}

/* 标签行 */
.tags-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16rpx;
}

.tag {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 6rpx 16rpx;
  gap: 20rpx;
  height: 44rpx;
  box-sizing: border-box;
}

.tag-text {
  font-weight: 400;
  font-size: 24rpx;
  line-height: 32rpx;
  display: flex;
  align-items: center;
}

.private-tag {
  background: #F2F5F8;
  border-radius: 8rpx;
  
  .tag-text {
    color: #717784;
  }
}

.status-tag {
  border-radius: 176rpx;
  
  &.status-success {
    background: #E0FAEC;
    .tag-text {
      color: #1FC16B;
    }
  }
  
  &.status-training {
    background: #EFEBFF;
    .tag-text {
      color: #7D52F4;
    }
  }
  
  &.status-failed {
    background: #FFEBEC;
    .tag-text {
      color: #FB3748;
    }
  }
  
  &.status-init {
    background: #F2F5F8;
    .tag-text {
      color: #717784;
    }
  }
}

/* 更新时间 */
.update-time {
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  color: #717784;
}

/* 更新按钮区域 */
.update-btn-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;
  margin-top: 12rpx;
}

.update-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 6rpx 26rpx;
  gap: 20rpx;
  width: 160rpx;
  height: 56rpx;
  background: #335CFF;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.update-btn-text {
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  display: flex;
  align-items: center;
  text-align: center;
  color: #FFFFFF;
}
</style>
