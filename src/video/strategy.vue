<template>
  <view class="page-container">
    <!-- 标签切换栏 -->
    <scroll-view scroll-x class="tab-bar">
      <view
          v-for="(tab, index) in tabs"
          :key="index"
          :class="['tab-item', currentTab === index ? 'active' : '']"
          @click="switchTab(index)"
      >
        {{ tab.name }}
      </view>
    </scroll-view>

    <!-- 图片展示区域 -->
    <view class="banner-container">
      <image :src="currentBanner" mode="aspectFill" class="banner-image"></image>
    </view>

    <!-- 功能模块列表 -->
    <view class="module-list">
      <view
          v-for="(module, index) in currentModuleList"
          :key="index"
          class="module-card"
          @click="openDetail(module)"
      >
        <view class="module-icon">
          <image :src="module.icon" mode="aspectFill"></image>
        </view>
        <view class="module-content">
          <text class="module-title">{{ module.title }}</text>
          <view class="module-examples">
            <text v-for="(example, exIndex) in module.examples" :key="exIndex" class="example-text">
              "{{ example }}"
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 详情弹窗 -->
    <view v-if="showDetail" class="detail-modal" @click="closeDetail">
      <view class="detail-modal-content" @click.stop>
        <!-- 头部 -->
        <view class="detail-header">
          <view class="detail-icon-wrap">
            <image :src="detailData.icon" mode="aspectFill" class="detail-icon"></image>
          </view>
          <view class="detail-title-wrap">
            <text class="detail-title">{{ detailData.title }}</text>
            <text class="detail-desc">{{ detailData.description }}</text>
          </view>
          <view class="detail-close" @click="closeDetail">
            <text class="close-icon">×</text>
          </view>
        </view>

        <!-- 示例指令 -->
        <view class="detail-examples">
          <view class="examples-title">
            <text>💡 示例指令</text>
          </view>
          <view v-for="(example, idx) in detailData.examples" :key="idx" class="example-item">
            <text class="example-text">{{ example }}</text>
          </view>
        </view>

        <!-- 观看教学视频按钮 -->
        <view v-if="detailData.videoUrl" class="watch-video-btn-wrap">
          <view class="watch-video-btn" @click.stop="watchVideo">
            <text class="watch-video-icon">▶</text>
            <text class="watch-video-text">观看教学视频</text>
          </view>
        </view>
        <view v-else class="no-video-wrap">
          <text class="no-video-text">暂无教学视频</text>
        </view>
      </view>
    </view>

    <!-- 全屏视频播放 -->
    <view v-if="showVideoPlayer" class="video-player-modal" @click="closeVideoPlayer">
      <view class="video-player-content" @click.stop>
        <view class="video-player-header">
          <text class="video-player-title">{{ currentVideoTitle }}</text>
          <view class="video-player-close" @click="closeVideoPlayer">
            <text class="close-icon">×</text>
          </view>
        </view>
        <video
            class="video-player"
            :src="currentVideoUrl"
            controls
            autoplay
            object-fit="contain"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @ended="onVideoEnded"
            @error="onVideoError"
        ></video>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

// 视频服务器路径
const VIDEO_SERVER_DOMAIN = 'https://wrcfmo.cn/';
const VIDEO_STORAGE_PATH = '/static_in/video/';

// 详情弹窗
const showDetail = ref(false);
const detailData = ref({
  title: '',
  icon: '',
  examples: [],
  description: '',
  videoUrl: ''
});

// 视频播放
const showVideoPlayer = ref(false);
const currentVideoUrl = ref('');
const currentVideoTitle = ref('');

// 模块与视频映射（已全部覆盖）
const moduleVideoMap: Record<string, string> = {
  '心灵治愈': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}aa.mp4`,
  '亲子关系': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}bb.mp4`,
  '自信培养': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}cc.mp4`,
  '情绪管理': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}dd.mp4`,
  '推销助手': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}ee.mp4`,
  '开心一笑': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}ff.mp4`,
  '英语练习': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}gg.mp4`,
  '成语接龙': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}ll.mp4`,
  '古诗朗诵': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}oo.mp4`,
  '绘本阅读': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}pp.mp4`,
  '外文翻译': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}qq.mp4`,
  '知识百科': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}rr.mp4`,
  '十万个为什么': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}ss.mp4`,
  '新闻资讯': `${VIDEO_SERVER_DOMAIN}${VIDEO_STORAGE_PATH}tt.mp4`
};

// 模块描述（按新功能重新编写）
const moduleDescriptionMap: Record<string, string> = {
  '心灵治愈': '让九宝为你讲述温暖的治愈故事，抚慰心灵。',
  '亲子关系': '九宝为你提供亲子沟通建议，增进家庭关系。',
  '自信培养': '九宝帮你培养自信心，给你积极的鼓励。',
  '情绪管理': '九宝教你如何管理情绪，保持心情愉悦。',
  '推销助手': '九宝帮你撰写推销话术，提升销售技巧。',
  '开心一笑': '九宝为你带来欢笑，分享笑话和段子。',
  '英语练习': '九宝陪你练英语口语，提升语言能力。',
  '成语接龙': '九宝和你玩成语接龙，学习中华文化。',
  '古诗朗诵': '九宝为你朗诵经典古诗，感受诗词之美。',
  '绘本阅读': '九宝陪你读绘本，培养阅读习惯。',
  '外文翻译': '九宝帮你翻译多国语言，轻松交流。',
  '知识百科': '九宝为你解答各类百科知识。',
  '十万个为什么': '九宝满足你的好奇心，解答各种为什么。',
  '新闻资讯': '九宝为你播报最新新闻资讯。'
};

// 打开详情
function openDetail(module: any) {
  const videoUrl = moduleVideoMap[module.title] || '';

  detailData.value = {
    title: module.title,
    icon: module.icon,
    examples: module.examples,
    description: moduleDescriptionMap[module.title] || '这是一个很棒的功能模块！',
    videoUrl: videoUrl
  };

  showDetail.value = true;
}

// 关闭详情
function closeDetail() {
  showDetail.value = false;
  detailData.value = {
    title: '',
    icon: '',
    examples: [],
    description: '',
    videoUrl: ''
  };
}

// 观看视频
function watchVideo() {
  if (!detailData.value.videoUrl) {
    uni.showToast({
      title: '该功能暂无教学视频',
      icon: 'none'
    });
    return;
  }

  currentVideoUrl.value = detailData.value.videoUrl;
  currentVideoTitle.value = `${detailData.value.title} - 教学视频`;
  showVideoPlayer.value = true;
}

// 关闭视频
function closeVideoPlayer() {
  showVideoPlayer.value = false;
  currentVideoUrl.value = '';
  currentVideoTitle.value = '';
}

function onVideoPlay() {
  console.log('视频开始播放');
}

function onVideoPause() {
  console.log('视频暂停');
}

function onVideoEnded() {
  console.log('视频播放结束');
  closeVideoPlayer();
}

function onVideoError(e: any) {
  const video = e.target || e.currentTarget;
  let errorMsg = '未知错误';
  let errorCode = -1;
  if (video && video.error) {
    errorCode = video.error.code;
    errorMsg = video.error.message || `媒体错误码: ${errorCode}`;
  }
  console.error('视频播放错误 - 错误码:', errorCode, '详细信息:', errorMsg);

  uni.showToast({
    title: `播放失败 (${errorCode})`,
    icon: 'none',
    duration: 2000
  });

  closeVideoPlayer();
}

// 标签数据
const tabs = ref([
  { name: '情感与社交', id: 'entertainment' },
  { name: '语言与文学', id: 'learning' },
  { name: '知识与视野', id: 'life' },
]);

const currentTab = ref(0);
const currentBanner = ref('/static/strategy/5.png');

const bannerData = ref({
  entertainment: '/static/strategy/5.png',
  learning: '/static/strategy/6.png',
  life: '/static/strategy/7.png',
});

// 按新分类重新组织模块数据
const moduleData = ref({
  entertainment: [
    {
      title: '心灵治愈',
      icon: '/static/strategy/a.png',
      examples: ['九宝九宝，给我讲个治愈的故事', '九宝九宝，我想听温暖的故事']
    },
    {
      title: '亲子关系',
      icon: '/static/strategy/b.png',
      examples: ['九宝九宝，怎样和孩子更好沟通？', '九宝九宝，给我一些亲子互动建议']
    },
    {
      title: '自信培养',
      icon: '/static/strategy/c.png',
      examples: ['九宝九宝，怎样培养孩子的自信？', '九宝九宝，给我一些鼓励孩子的话']
    },
    {
      title: '情绪管理',
      icon: '/static/strategy/d.png',
      examples: ['九宝九宝，我心情不好怎么办？', '九宝九宝，怎样帮助孩子管理情绪？']
    },
    {
      title: '推销助手',
      icon: '/static/strategy/e.png',
      examples: ['九宝九宝，帮我写一个推销话术', '九宝九宝，怎样向客户介绍产品？']
    },
    {
      title: '开心一笑',
      icon: '/static/strategy/f.png',
      examples: ['九宝九宝，讲个笑话给我听', '九宝九宝，来个段子']
    }
  ],

  learning: [
    {
      title: '英语练习',
      icon: '/static/strategy/g.png',
      examples: ['九宝九宝，我们一起练英语吧', '九宝九宝，陪我练英语口语']
    },
    {
      title: '成语接龙',
      icon: '/static/strategy/h.png',
      examples: ['九宝九宝，我们玩成语接龙', '九宝九宝，一起玩成语接龙']
    },
    {
      title: '古诗朗诵',
      icon: '/static/strategy/o.png',
      examples: ['九宝九宝，朗诵《静夜思》', '九宝九宝，背诵古诗《春晓》']
    },
    {
      title: '绘本阅读',
      icon: '/static/strategy/k.png',
      examples: ['九宝九宝，陪我读书吧', '九宝九宝，我们一起看书吧']
    },
    {
      title: '外文翻译',
      icon: '/static/strategy/l.png',
      examples: ['九宝九宝，苹果用英文怎么说？', '九宝九宝，翻译"你好"成英文']
    }
  ],

  life: [
    {
      title: '知识百科',
      icon: '/static/strategy/m.png',
      examples: ['九宝九宝，世界上最长的河流是哪条？', '九宝九宝，最大的海洋是什么？']
    },
    {
      title: '十万个为什么',
      icon: '/static/strategy/n.png',
      examples: ['九宝九宝，为什么天空是蓝色的？', '九宝九宝，为什么树叶会变黄？']
    },
    {
      title: '新闻资讯',
      icon: '/static/strategy/c.png',  // 使用 p.png，若不存在可替换为已有图标
      examples: ['九宝九宝，今天有什么新闻？', '九宝九宝，最近有什么大事？']
    }
  ]
});

const currentModuleList = ref(moduleData.value[tabs.value[currentTab.value].id]);

onLoad(() => {
  console.log('指令大全页面加载');
});

const switchTab = (index: number) => {
  currentTab.value = index;
  const tabId = tabs.value[index].id;
  currentBanner.value = bannerData.value[tabId];
  currentModuleList.value = moduleData.value[tabId];
};
</script>

<style scoped lang="scss">
.page-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 40rpx;
}

.tab-bar {
  white-space: nowrap;
  background-color: #ffffff;
  padding: 12px 0 12px 20px;
  margin-bottom: 16px;

  .tab-item {
    display: inline-block;
    padding: 8px 24px;
    font-size: 16px;
    color: #0b0a0a;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;

    &.active {
      color: #10b981;
      border-bottom-color: #10b981;
    }
  }
}

.banner-container {
  height: 150px;
  margin: 0 16px 16px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #e8f4ff;

  .banner-image {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.module-list {
  padding: 0 16px;

  .module-card {
    display: flex;
    align-items: center;
    background-color: #ffffff;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

    &:active {
      opacity: 0.85;
    }

    .module-icon {
      width: 65px;
      height: 65px;
      border-radius: 50%;
      background-color: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;

      image {
        width: 65px;
        height: 65px;
      }
    }

    .module-content {
      flex: 1;

      .module-title {
        font-size: 18px;
        font-weight: 600;
        color: #0b0a0a;
        margin-bottom: 8px;
      }

      .module-examples {
        .example-text {
          display: block;
          font-size: 14px;
          color: #080909;
          margin-bottom: 4px;
        }
      }
    }
  }
}

/* ===== 详情弹窗 ===== */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-modal-content {
  width: 100%;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
  position: relative;

  .detail-icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 20rpx;
    flex-shrink: 0;
    background: #f0f2f5;

    .detail-icon {
      width: 100%;
      height: 100%;
    }
  }

  .detail-title-wrap {
    flex: 1;

    .detail-title {
      font-size: 38rpx;
      font-weight: 700;
      color: #1a1a1a;
      display: block;
      margin-bottom: 8rpx;
    }

    .detail-desc {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
      display: block;
    }
  }

  .detail-close {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .close-icon {
      font-size: 48rpx;
      color: #999;
      line-height: 1;
    }
  }
}

.detail-examples {
  margin-bottom: 28rpx;

  .examples-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #101;
  }
}


.watch-video-btn-wrap {
  margin-top: 16rpx;
}

.watch-video-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(16, 185, 129, 0.3);

  .watch-video-icon {
    font-size: 36rpx;
    color: #fff;
    margin-right: 12rpx;
  }

  .watch-video-text {
    font-size: 30rpx;
    color: #fff;
    font-weight: 600;
  }
}

.no-video-wrap {
  margin-top: 16rpx;
  text-align: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;

  .no-video-text {
    font-size: 26rpx;
    color: #999;
  }
}

/* ===== 全屏视频播放器 ===== */
.video-player-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.video-player-content {
  width: 100%;
  max-width: 700rpx;
  background: #000000;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.5);
}

.video-player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: rgba(0, 0, 0, 0.9);

  .video-player-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #ffffff;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .video-player-close {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 20rpx;
    flex-shrink: 0;

    .close-icon {
      font-size: 48rpx;
      color: #ffffff;
      line-height: 1;
    }
  }
}

.video-player {
  width: 100%;
  height: 400rpx;
  display: block;
}
</style>