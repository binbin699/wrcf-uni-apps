<template>
  <wd-popup 
    :model-value="visible" 
    @update:model-value="$emit('update:visible', $event)"
    position="bottom" 
    custom-style="border-radius: 32rpx 32rpx 0 0; overflow: hidden;">
    <view class="template-popup-content">
      <view class="popup-header">
        <text class="popup-title">{{ $t('create_agent.select_template') }}</text>
      </view>
      <view class="template-selector">
        <scroll-view scroll-y class="category-list">
          <view 
            v-for="cat in templateCategories" 
            :key="cat.value"
            class="category-item"
            :class="{ active: selectedTemplateLang === cat.value }"
            @click="$emit('selectCategory', cat.value)">
            <text class="category-text">{{ cat.label }}</text>
          </view>
          <view class="bottom-spacer"></view>
        </scroll-view>
        <scroll-view scroll-y class="template-list">
          <view v-if="loading" class="loading-state">
            <text>{{ $t('common.loading') }}</text>
          </view>
          <view v-else-if="filteredTemplates.length === 0" class="empty-state">
            <text>{{ $t('square.no_agents') }}</text>
          </view>
          <view 
            v-else
            v-for="item in filteredTemplates" 
            :key="item.agentId"
            class="template-item"
            @click="$emit('selectTemplate', item)">
            <text class="template-name">{{ item.agentName }}</text>
          </view>
          <view class="bottom-spacer"></view>
        </scroll-view>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface Props {
  visible: boolean;
  templateCategories: Array<{ label: string; value: string }>;
  filteredTemplates: any[];
  selectedTemplateLang: string;
  loading: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'selectCategory', lang: string): void;
  (e: 'selectTemplate', template: any): void;
}

defineProps<Props>();
defineEmits<Emits>();

const { t: $t } = useI18n();
</script>

<style scoped>
.template-popup-content {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 60vh;
}

.popup-header {
  padding: 36rpx 32rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: #ffffff;
  border-bottom: 2rpx solid #f8f9fa;
  border-radius: 36rpx 36rpx 0 0;
}

.popup-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111;
}

.template-selector {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.category-list {
  width: 220rpx;
  background: #f8f9fb;
  height: 100%;
}

.category-item {
  padding: 36rpx 28rpx;
  font-size: 28rpx;
  color: #777;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
}

.category-item.active {
  background: #ffffff;
  color: #3E5DEF;
  font-weight: 600;
}

.category-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 30%;
  height: 40%;
  width: 6rpx;
  background: #3E5DEF;
  border-radius: 0 4rpx 4rpx 0;
}

.template-list {
  flex: 1;
  height: 100%;
  background: #ffffff;
}

.bottom-spacer {
  height: calc(180rpx + env(safe-area-inset-bottom));
  width: 100%;
}

.bottom-spacer {
  height: calc(180rpx + env(safe-area-inset-bottom));
  width: 100%;
}

.template-item {
  padding: 36rpx 32rpx;
  border-bottom: 2rpx solid #f9f9f9;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.template-item:active {
  background: #f7f8fa;
}

.template-name {
  font-size: 30rpx;
  color: #1a1a1a;
  flex: 1;
}

.loading-state, 
.empty-state {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
</style>
