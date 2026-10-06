<script setup lang="ts">
import { computed } from 'vue';
import { compressedVolumeSaving, effectiveItemDimensions, formatVolume, isCompressionApplied, type PackingItem, type PackingPlan, type Risk, type Suitcase } from '../../core/models';

const props = defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[] }>();
const placementByItem = computed(() => new Map(props.plan.placements.map((placement) => [placement.itemId, placement])));
const dimensionsText = (item: PackingItem) => `${item.length}×${item.width}×${item.height} cm`;
const effectiveText = (item: PackingItem) => {
  const dimensions = effectiveItemDimensions(item);
  return `${dimensions.length}×${dimensions.width}×${dimensions.height} cm`;
};
</script>

<template>
  <section class="print-sheet">
    <h1>行李箱空间规划单</h1>
    <p>{{ suitcase.length }} × {{ suitcase.width }} × {{ suitcase.height }} cm · 限重 {{ suitcase.maxWeight }} kg</p>
    <h2>{{ plan.name }}</h2>
    <p>本次压缩节省体积：{{ formatVolume(plan.savedVolume) }}</p>
    <ol>
      <li v-for="item in items" :key="item.id">
        {{ placementByItem.has(item.id) ? '□' : '×' }} {{ item.name }} — {{ item.weight }} kg<br />
        原尺寸：{{ dimensionsText(item) }}；{{ placementByItem.has(item.id) ? '实际采用' : '本次计算' }}：{{ effectiveText(item) }}
        <template v-if="isCompressionApplied(item)">（{{ placementByItem.has(item.id) ? '压缩，节省' : '压缩，预计节省' }} {{ formatVolume(compressedVolumeSaving(item)) }}）</template>
        <template v-if="placementByItem.get(item.id)">；摆放尺寸：{{ placementByItem.get(item.id)?.dimensions.length }}×{{ placementByItem.get(item.id)?.dimensions.width }}×{{ placementByItem.get(item.id)?.dimensions.height }} cm</template>
      </li>
    </ol>
    <h3>风险提示</h3>
    <p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ risk.message }}</p>
  </section>
</template>
