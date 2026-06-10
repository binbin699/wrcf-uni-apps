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
    <!-- 新增弹框 -->
    <DetailModal
        :visible="showModal"
        :moduleData="currentModuleData"
        @close="showModal = false"
    />
    <!-- 功能模块列表 -->
    <view class="module-list">
      <view
          v-for="(module, index) in currentModuleList"
          :key="index"
          class="module-card"
          @click="handleModuleClick(module)"
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
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import DetailModal from '@/video/components/DetailModal.vue';


// 弹框控制
const showModal = ref(false);
const currentModuleData = ref({
  title: '',
  icon: '',
  examples: [],
  description: ''
});

// 点击模块卡片
const handleModuleClick = (module: any) => {
  currentModuleData.value = {
    title: module.title,
    icon: module.icon,
    examples: module.examples,
    description: `${module.title}功能，为您提供${module.title.includes('故事') ? '精彩故事' :
        module.title.includes('笑话') ? '欢乐时光' :
            module.title.includes('成语') ? '成语练习' :
                module.title.includes('阅读') ? '优质阅读' :
                    module.title.includes('英语') ? '英语学习' :
                        module.title.includes('翻译') ? '翻译服务' :
                            module.title.includes('古诗') ? '古诗欣赏' :
                                module.title.includes('数学') ? '数学运算' :
                                    module.title.includes('天气') ? '天气信息' :
                                        module.title.includes('节日') ? '节日查询' :
                                            module.title.includes('知识') ? '知识科普' :
                                                module.title.includes('为什么') ? '科学解答' :
                                                    module.title.includes('新闻') ? '新闻资讯' :
                                                        module.title.includes('体育') ? '体育信息' :
                                                            module.title.includes('财经') ? '财经动态' :
                                                                module.title.includes('科技') ? '科技新闻' : '相关服务'}`
  };
  showModal.value = true;
};

// 标签数据
const tabs = ref([
  { name: '娱乐', id: 'entertainment' },
  { name: '学习', id: 'learning' },
  { name: '生活', id: 'life' },
  { name: '新闻', id: 'news' }
]);

// 当前选中标签
const currentTab = ref(0);

// 当前显示的图片
const currentBanner = ref('/static/strategy/5.png');

// 图片数据 - 按标签分类
const bannerData = ref({
  entertainment: '/static/strategy/5.png',
  learning: '/static/strategy/6.png',
  life: '/static/strategy/7.png',
  news: '/static/strategy/8.png'
});

// 功能模块数据 - 按标签分类
const moduleData = ref({
  entertainment: [
    {
      title: '神奇故事',
      icon: '/static/strategy/a.png',
      examples: ['九宝九宝，我想听童话故事', '九宝九宝，给我讲一个睡前故事吧']
    },
    {
      title: '开心一笑',
      icon: '/static/strategy/b.png',
      examples: ['九宝九宝，我想听笑话', '九宝九宝，来个段子']
    },
    {
      title: '成语游戏',
      icon: '/static/strategy/c.png',
      examples: ['九宝九宝，我们玩成语接龙', '九宝九宝，一起玩成语接龙']
    }
  ],
  learning: [
    {
      title: '绘本阅读',
      icon: '/static/strategy/d.png',
      examples: ['九宝九宝，陪我读书吧', '九宝九宝，我们一起看书吧']
    },
    {
      title: '英语练习',
      icon: '/static/strategy/e.png',
      examples: ['九宝九宝，我们一起练英语吧', '九宝九宝，陪我练英语口语']
    },
    {
      title: '外文翻译',
      icon: '/static/strategy/f.png',
      examples: ['九宝九宝，梨子这个单词用英文怎么说？', '九宝九宝，用英文帮我翻译"我爱你"这句话']
    },
    {
      title: '古诗朗诵',
      icon: '/static/strategy/g.png',
      examples: ['九宝九宝，朗诵《出师表》', '九宝九宝，背诵古诗《大风歌》']
    },
    {
      title: '数学运算',
      icon: '/static/strategy/h.png',
      examples: ['九宝九宝，2的4次方是多少？', '九宝九宝，1+2等于几？']
    }
  ],
  life: [
    {
      title: '天气冷暖',
      icon: '/static/strategy/o.png',
      examples: ['九宝九宝，今天天气怎么样？', '九宝九宝，今天气温怎么样？建议我穿什么衣服？']
    },
    {
      title: '节日日历',
      icon: '/static/strategy/k.png',
      examples: ['九宝九宝，今年中秋节是几月几号？', '九宝九宝，今年农历7月7日是阳历什么时候？']
    },
    {
      title: '知识百科',
      icon: '/static/strategy/l.png',
      examples: ['九宝九宝，世界上最北边的城市是哪个？', '九宝九宝，世界上最大的瀑布是哪个？在哪个国家？']
    },
    {
      title: '十万个为什么',
      icon: '/static/strategy/m.png',
      examples: ['九宝九宝，为什么动物需要睡觉？', '九宝九宝，为什么天空和海洋都是蓝色的？']
    }
  ],
  news: [
    {
      title: '今日新闻',
      icon: '/static/strategy/n.png',
      examples: ['九宝九宝，今天有什么新闻？', '九宝九宝，最近有什么新鲜事？']
    },
    {
      title: '体育赛事',
      icon: '/static/strategy/l.png',
      examples: ['九宝九宝，下一届的奥运会在什么时候举办？', '九宝九宝，NBA今天有什么比赛？']
    },
    {
      title: '财经资讯',
      icon: '/static/strategy/a.png',
      examples: ['九宝九宝，优必选今天的股价咋样？', '九宝九宝，美元最新汇率是多少？']
    },
    {
      title: '科技动态',
      icon: '/static/strategy/d.png',
      examples: ['九宝九宝，最近有什么科技大事件？', '九宝九宝，帮我查查最近的人工智能新进展。']
    }
  ]
});

// 当前显示的功能模块
const currentModuleList = ref(moduleData.value[tabs.value[currentTab.value].id]);

// 页面加载逻辑
onLoad(() => {
  console.log('指令大全页面加载');
});

// 切换标签
const switchTab = (index: number) => {
  currentTab.value = index;
  const tabId = tabs.value[index].id;

  // 更新图片和功能模块数据
  currentBanner.value = bannerData.value[tabId];
  currentModuleList.value = moduleData.value[tabId];
};
</script>

<style scoped lang="scss">

.banner-swiper {
  height: 150px;
  margin: 0 16px 16px;
  border-radius: 12px;
  overflow: hidden;

  .banner-image {
    width: 100%;
    height: 100%;
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


.page-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);

  .back-btn {
    padding: 8px;
    .iconfont {
      font-size: 24px;
      color: #0e0e0e;
    }
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #100f0f;
  }

  .placeholder {
    width: 40px;
  }
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


.banner-swiper {
  height: 180px;
  margin: 0 16px 16px;
  border-radius: 12px;
  overflow: hidden;

  .banner-image {
    width: 100%;
    height: 100%;
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

    .module-icon {
      width: 65px;
      height: 65px;
      border-radius: 50%;
      background-color: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;

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
</style>
