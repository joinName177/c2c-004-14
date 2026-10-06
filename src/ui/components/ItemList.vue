<script setup lang="ts">
import { reactive } from 'vue';
import { isCompressible, isCompressionActive, savedVolumeOf, type PackingItem } from '../../core/models';
import { validateCompression } from '../../core/packing-engine';
import { formatVolume } from '../format';

defineProps<{ items: PackingItem[] }>();
const emit = defineEmits<{
  remove: [id: string];
  toggle: [id: string, mustHave: boolean];
  update: [id: string, patch: Partial<PackingItem>, recalculate: boolean];
  compression: [id: string, patch: Partial<PackingItem>];
}>();

const categories = ['衣物', '鞋履', '数码', '洗护', '随身', '其他'];
const heightErrors = reactive<Record<string, string>>({});

function onCategoryChange(item: PackingItem, event: Event) {
  const select = event.target as HTMLSelectElement;
  const category = select.value;
  if (item.useCompression && !isCompressible({ ...item, category })) {
    if (window.confirm(`「${item.name}」的新类别不支持压缩，确认停用压缩并重新计算？`)) {
      emit('update', item.id, { category, useCompression: false }, true);
    } else {
      select.value = item.category;
    }
    return;
  }
  emit('update', item.id, { category }, false);
}

function onFragileChange(item: PackingItem, event: Event) {
  const checkbox = event.target as HTMLInputElement;
  const fragile = checkbox.checked;
  if (fragile && item.useCompression) {
    if (window.confirm(`「${item.name}」标记为易碎后不能继续压缩，确认停用压缩并重新计算？`)) {
      emit('update', item.id, { fragile, useCompression: false }, true);
    } else {
      checkbox.checked = false;
    }
    return;
  }
  emit('update', item.id, { fragile }, false);
}

function onCompressionToggle(item: PackingItem, event: Event) {
  const useCompression = (event.target as HTMLInputElement).checked;
  const patch: Partial<PackingItem> = { useCompression };
  if (useCompression && item.compressedHeight === undefined) patch.compressedHeight = item.height;
  emit('compression', item.id, patch);
}

function onCompressedHeight(item: PackingItem, event: Event) {
  const input = event.target as HTMLInputElement;
  const compressedHeight = Number(input.value);
  const [error] = validateCompression({ ...item, compressedHeight });
  if (error) {
    heightErrors[item.id] = error;
    return;
  }
  delete heightErrors[item.id];
  emit('compression', item.id, { compressedHeight });
}
</script>

<template>
  <div class="item-list">
    <article v-for="item in items" :key="item.id" class="item-row">
      <div class="item-main">
        <div class="item-icon">{{ item.category.slice(0, 1) }}</div>
        <div class="item-copy">
          <strong>{{ item.name }}</strong>
          <span>{{ item.length }}×{{ item.width }}×{{ item.height }} cm · {{ item.weight }} kg</span>
          <span v-if="isCompressionActive(item)" class="compression-note">本次采用高 {{ item.compressedHeight }} cm · 节省 {{ formatVolume(savedVolumeOf(item)) }}</span>
        </div>
        <button class="must-button" :class="{ checked: item.mustHave }" type="button" @click="emit('toggle', item.id, !item.mustHave)">{{ item.mustHave ? '必带' : '可选' }}</button>
        <b class="priority">P{{ item.priority }}</b>
        <button class="icon-button" type="button" :aria-label="`删除 ${item.name}`" @click="emit('remove', item.id)">×</button>
      </div>
      <div class="item-controls">
        <label>类别
          <select :value="item.category" :aria-label="`修改 ${item.name} 类别`" @change="onCategoryChange(item, $event)">
            <option v-for="category in categories" :key="category">{{ category }}</option>
          </select>
        </label>
        <label class="check"><input type="checkbox" :checked="Boolean(item.fragile)" :aria-label="`标记 ${item.name} 易碎`" @change="onFragileChange(item, $event)" />易碎</label>
        <template v-if="isCompressible(item)">
          <label class="check"><input type="checkbox" :checked="Boolean(item.useCompression)" :aria-label="`压缩 ${item.name}`" @change="onCompressionToggle(item, $event)" />压缩</label>
          <label v-if="item.useCompression">压缩后高度
            <input type="number" min="0.1" step="0.5" :value="item.compressedHeight ?? item.height" :aria-label="`${item.name} 压缩后高度`" @change="onCompressedHeight(item, $event)" />
          </label>
          <span v-if="item.useCompression && heightErrors[item.id]" class="field-error">{{ heightErrors[item.id] }}</span>
        </template>
      </div>
    </article>
  </div>
</template>
