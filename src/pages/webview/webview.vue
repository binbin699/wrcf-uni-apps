<template>
  <view class="webview-page">
    <web-view v-if="src" :src="src" :update-title="false" />
    <view class="empty" v-else>
      <text>{{ $t('webview.cannotOpenPage') }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const src = ref('');

onLoad((options: any) => {
  const p = options.src || options.url || options.u || '';
  if (p) {
    try {
      src.value = decodeURIComponent(p);
    } catch (e) {
      src.value = p;
    }
  }
});
</script>

<style>
.webview-page {
  width: 100%;
  height: 100vh;
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
