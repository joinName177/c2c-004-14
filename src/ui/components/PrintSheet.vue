<script setup lang="ts">
import { isCompressionActive, type PackingItem, type PackingPlan, type Risk, type Suitcase } from '../../core/models';
import { formatVolume } from '../format';
defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[] }>();
</script>

<template>
  <section class="print-sheet">
    <h1>行李箱空间规划单</h1>
    <p>{{ suitcase.length }} × {{ suitcase.width }} × {{ suitcase.height }} cm · 限重 {{ suitcase.maxWeight }} kg</p>
    <h2>{{ plan.name }}</h2>
    <p v-if="plan.savedVolume > 0">本次压缩节省体积 {{ formatVolume(plan.savedVolume) }}</p>
    <ol>
      <li v-for="item in items" :key="item.id">
        {{ plan.placements.some(p => p.itemId === item.id) ? '□' : '×' }} {{ item.name }} — {{ item.weight }} kg · 原尺寸 {{ item.length }}×{{ item.width }}×{{ item.height }} cm<template v-if="isCompressionActive(item)"> · 本次采用 {{ item.length }}×{{ item.width }}×{{ item.compressedHeight }} cm</template>
      </li>
    </ol>
    <h3>风险提示</h3>
    <p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ risk.message }}</p>
  </section>
</template>
