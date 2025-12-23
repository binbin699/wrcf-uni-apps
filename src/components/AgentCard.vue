<template>
  <view class="agent-card-wrapper">
    <view
      class="agent-card"
      :class="{ swiped: isSwipeLeft }"
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
        <!-- <view class="agent-type">{{ agent.description || "智能助手" }}</view> -->
        <view class="agent-tag">
          {{ agent.isPublic ? $t('agent_card.public') : $t('agent_card.private') }}
        </view>
      </view>

      <view class="arrow-icon">
        <wd-icon name="arrow-right" size="20px" color="#999999"></wd-icon>
      </view>
    </view>

    <!-- 删除按钮 -->
    <view class="delete-button" @click="handleDelete">
      <text class="delete-text">{{ $t('common.delete') }}</text>
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
      isSwipeLeft: false,
      isSwiping: false
    };
  },
  methods: {
    handleClick() {
      // console.log("点击智能体", this.agent);
      if (!this.isSwiping && !this.isSwipeLeft) {
        this.$emit('click', this.agent);
      }
    },

    handleTouchStart(e) {
      if (!this.swipable) return;
      this.startX = e.touches[0].clientX;
      this.isSwiping = false;
    },

    handleTouchMove(e) {
      if (!this.swipable) return;
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.startX;

      if (Math.abs(deltaX) > 10) {
        this.isSwiping = true;
      }

      if (deltaX < 0 && Math.abs(deltaX) <= 80) {
        this.translateX = deltaX;
      }
    },

    handleTouchEnd(e) {
      if (!this.swipable) return;
      const currentX = e.changedTouches[0].clientX;
      const deltaX = currentX - this.startX;

      if (deltaX < -40) {
        // 左滑超过40px，显示删除按钮
        this.translateX = -80;
        this.isSwipeLeft = true;
      } else {
        // 回弹
        this.translateX = 0;
        this.isSwipeLeft = false;
      }

      setTimeout(() => {
        this.isSwiping = false;
      }, 100);
    },

    handleDelete() {
      this.$emit('delete', this.agent);
      // 重置状态
      this.translateX = 0;
      this.isSwipeLeft = false;
    }
  },
  computed: {
    getAvatarText() {
      if (!this.agent || !this.agent.agentName) return '';
      // 取名称的第一个字符作为头像文字
      return this.agent.agentName.charAt(0);
    }
  }
};
</script>

<style lang="scss" scoped>
.agent-card-wrapper {
  position: relative;
  overflow: hidden;
}

.agent-card {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background: #ffffff;
  transition: transform 0.3s ease;
  position: relative;
  z-index: 2;

  &:active {
    background: #f8f9fa;
  }
}

.delete-button {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: #FB3748;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.delete-text {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #ddefff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #91aed1;
  font-size: 16px;
  font-weight: 600;
}

.agent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: #222530;
  line-height: 1.3;
}

.agent-tag {
  font-size: 12px;
  color: #717784;
  line-height: 1.3;
}

.agent-type {
  font-size: 12px;
  color: #717784;
  line-height: 1.3;
}

.arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
</style>
