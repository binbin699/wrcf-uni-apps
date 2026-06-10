<template>
  <view class="modal-mask" v-if="visible" @click="closeModal">
    <view class="modal-content" @click.stop>
      <view class="modal-header">
        <text class="modal-title">{{ moduleData.title }}</text>
        <view class="close-btn" @click="closeModal">✕</view>
      </view>
      <view class="modal-body">
        <view class="detail-icon">
          <image :src="moduleData.icon" mode="aspectFill"></image>
        </view>
        <view class="detail-info">
          <text class="info-label">功能介绍</text>
          <text class="info-value">{{ moduleData.description }}</text>
        </view>
        <view class="detail-examples">
          <text class="examples-title">示例指令：</text>
          <view v-for="(example, index) in moduleData.examples" :key="index" class="example-item">
            {{ example }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  visible: boolean;
  moduleData: {
    title: string;
    icon: string;
    examples: string[];
    description?: string;
  };
}>();

const emit = defineEmits(['close']);

const closeModal = () => {
  emit('close');
};
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 85%;
  background-color: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #0b0a0a;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 20px;
}

.modal-body {
  padding: 20px;
}

.detail-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;

  image {
    width: 100%;
    height: 100%;
  }
}

.detail-info {
  margin-bottom: 20px;

  .info-label {
    font-size: 14px;
    color: #666;
    display: block;
    margin-bottom: 8px;
  }

  .info-value {
    font-size: 16px;
    color: #0b0a0a;
    line-height: 1.6;
  }
}

.detail-examples {
  .examples-title {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
    display: block;
  }

  .example-item {
    background-color: #f5f7fa;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    color: #0b0a0a;
    margin-bottom: 8px;
  }
}
</style>
