<template>
  <view class="agent-card-wrapper" :style="{ height: cardHeight + 'px' }">
    <!-- 红色删除背景层 -->
    <view 
      class="delete-background" 
      :style="{ width: deleteWidth + 'px' }">
      <view class="delete-icon-wrapper">
        <image class="delete-icon" src="/static/icons/delete.svg" mode="aspectFit" />
      </view>
    </view>

    <!-- 卡片内容层 -->
    <view
      class="agent-card"
      :class="{ 'no-transition': isDragging }"
      @click="handleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      :style="{ transform: `translateX(${translateX}px)` }">
      <view class="agent-avatar">
        <image v-if="agent?.avatar" :src="agent.avatar" class="avatar-image" mode="aspectFill" />
        <view v-else class="avatar-placeholder">
          <text class="avatar-text">{{ getAvatarText }}</text>
        </view>
      </view>

      <view class="agent-info">
        <view class="agent-name">{{ agent.agentName }}</view>
        <view class="agent-tag">
          {{ agent.isPublic ? $t('agent_card.public') : $t('agent_card.private') }}
        </view>
      </view>

      <view class="arrow-icon">
        <wd-icon name="arrow-right" size="20px" color="#999999"></wd-icon>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view class="confirm-overlay" v-if="showConfirmDialog" @click="cancelDelete">
      <view class="confirm-dialog" @click.stop>
        <view class="confirm-content">
          <view class="confirm-title">{{ $t('common.confirm_delete') }}</view>
          <view class="confirm-message">{{ deleteConfirmMessage }}</view>
        </view>
        <view class="confirm-buttons">
          <view class="confirm-btn cancel-btn" @click="cancelDelete">
            {{ $t('common.cancel') }}
          </view>
          <view class="confirm-btn confirm-btn-primary" @click="confirmDelete">
            {{ $t('common.confirm') }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AgentCard',
  props: {
    agent: {
      type: Object,
      required: true
    },
    swipable: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      startX: 0,
      translateX: 0,
      isDragging: false,
      isSwiping: false,
      isDeleting: false,
      showConfirmDialog: false,
      cardWidth: 390, // 默认宽度，会在 mounted 时更新
      cardHeight: 80,
      deleteThreshold: 0.5 // 滑动超过 50% 宽度触发删除
    };
  },
  computed: {
    getAvatarText() {
      if (!this.agent || !this.agent.agentName) return '';
      return this.agent.agentName.charAt(0);
    },
    deleteConfirmMessage() {
      // 直接拼接确认消息，确保智能体名称正确显示
      const prefix = this.$t('common.delete_agent_prefix');
      const suffix = this.$t('common.delete_agent_suffix');
      return `${prefix}${this.agent.agentName}${suffix}`;
    },
    // 红色背景宽度（跟随滑动距离）
    deleteWidth() {
      return Math.abs(this.translateX);
    }
  },
  mounted() {
    // 获取卡片实际宽度
    this.$nextTick(() => {
      const query = uni.createSelectorQuery().in(this);
      query.select('.agent-card-wrapper').boundingClientRect(rect => {
        if (rect) {
          this.cardWidth = rect.width;
        }
      }).exec();
    });
  },
  methods: {
    handleClick() {
      if (!this.isSwiping && !this.isDeleting && this.translateX === 0) {
        this.$emit('click', this.agent);
      }
    },

    handleTouchStart(e) {
      if (!this.swipable) return;
      this.startX = e.touches[0].clientX;
      this.isDragging = true;
      this.isSwiping = false;
    },

    handleTouchMove(e) {
      if (!this.swipable || !this.isDragging) return;
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.startX;

      if (Math.abs(deltaX) > 10) {
        this.isSwiping = true;
      }

      // 只允许向左滑动，最大滑动到整个卡片宽度
      if (deltaX < 0) {
        this.translateX = Math.max(deltaX, -this.cardWidth);
      } else if (this.translateX < 0) {
        // 允许向右滑动回弹
        this.translateX = Math.min(0, this.translateX + (currentX - this.startX));
        this.startX = currentX;
      }
    },

    handleTouchEnd(e) {
      if (!this.swipable) return;
      this.isDragging = false;
      
      const swipeRatio = Math.abs(this.translateX) / this.cardWidth;
      
      if (swipeRatio >= this.deleteThreshold) {
        // 滑动超过阈值，展示删除动画然后弹出确认框
        this.translateX = -this.cardWidth;
        setTimeout(() => {
          this.showConfirmDialog = true;
        }, 200);
      } else {
        // 回弹
        this.translateX = 0;
      }

      setTimeout(() => {
        this.isSwiping = false;
      }, 100);
    },

    cancelDelete() {
      this.showConfirmDialog = false;
      // 收起滑动
      this.translateX = 0;
    },

    confirmDelete() {
      this.showConfirmDialog = false;
      this.isDeleting = true;
      this.$emit('delete', this.agent);
      setTimeout(() => {
        this.translateX = 0;
        this.isDeleting = false;
      }, 100);
    }
  }
};
</script>

<style lang="scss" scoped>
.agent-card-wrapper {
  position: relative;
  overflow: hidden;
  min-height: 80px;
}

/* 红色删除背景 */
.delete-background {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  background: #EC6D5A;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  min-width: 0;
}

.delete-icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  width: 24px;
  height: 24px;
}

.agent-card {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #ffffff;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  z-index: 2;
  min-height: 80px;
  box-sizing: border-box;

  &.no-transition {
    transition: none;
  }

  &:active {
    background: #f8f9fa;
  }
}

.agent-avatar {
  width: 44px;
  height: 44px;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 78.5714px;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 78.5714px;
  background: #DDEFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #91AED1;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
  line-height: 22px;
}

.agent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.agent-name {
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
  line-height: 22px;
  color: #222530;
}

.agent-tag {
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 17px;
  color: #60718B;
}

.arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

/* 删除确认弹窗 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  width: 315px;
  background: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.confirm-content {
  padding: 24px 20px;
  text-align: center;
}

.confirm-title {
  font-style: normal;
  font-weight: 500;
  font-size: 17px;
  line-height: 24px;
  color: #222530;
  margin-bottom: 8px;
}

.confirm-message {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  color: #6B7E9C;
}

.confirm-buttons {
  display: flex;
  border-top: 1px solid #E5E5E5;
}

.confirm-btn {
  flex: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  font-weight: 500;
  font-size: 17px;
  line-height: 24px;
  
  &:active {
    background: #F5F5F5;
  }
}

.cancel-btn {
  color: #222530;
  border-right: 1px solid #E5E5E5;
}

.confirm-btn-primary {
  color: #6B7E9C;
}
</style>
