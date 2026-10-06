<script setup lang="ts">
import { nextTick } from 'vue';
import { canCompress, compressedVolumeSaving, formatVolume, isCompressionApplied, type PackingItem } from '../../core/models';

const props = defineProps<{ items: PackingItem[] }>();
const emit = defineEmits<{
  remove: [id: string];
  toggle: [id: string, mustHave: boolean];
  update: [id: string, patch: Partial<PackingItem>];
  compress: [id: string, enabled: boolean];
}>();

const categories = ['衣物', '鞋履', '数码', '洗护', '随身', '预留', '其他'];

async function updateField(id: string, field: 'category' | 'fragile' | 'compressedHeight', event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  let patch: Partial<PackingItem>;
  if (field === 'fragile') patch = { fragile: (target as HTMLInputElement).checked };
  else if (field === 'compressedHeight') patch = { compressedHeight: Number((target as HTMLInputElement).value) };
  else patch = { category: (target as HTMLSelectElement).value };
  emit('update', id, patch);
  await nextTick();
  const item = props.items.find((entry) => entry.id === id);
  if (!item) return;
  if (field === 'category' && (target as HTMLSelectElement).value !== item.category) (target as HTMLSelectElement).value = item.category;
  if (field === 'fragile' && (target as HTMLInputElement).checked !== Boolean(item.fragile)) (target as HTMLInputElement).checked = Boolean(item.fragile);
  if (field === 'compressedHeight' && Number((target as HTMLInputElement).value) !== item.compressedHeight) (target as HTMLInputElement).value = String(item.compressedHeight ?? '');
}

function compressionError(item: PackingItem) {
  if (!item.compressionEnabled || !canCompress(item)) return '';
  return typeof item.compressedHeight === 'number' && item.compressedHeight > 0 && item.compressedHeight <= item.height
    ? ''
    : '压缩高度必须大于 0 且不超过原高度';
}
</script>

<template>
  <div class="item-list">
    <article v-for="item in props.items" :key="item.id" class="item-row" :class="{ compressed: isCompressionApplied(item) }">
      <div class="item-icon">{{ item.category.slice(0, 1) }}</div>
      <div class="item-copy">
        <strong>{{ item.name }}</strong>
        <span>原尺寸 {{ item.length }}×{{ item.width }}×{{ item.height }} cm · {{ item.weight }} kg</span>
        <span v-if="isCompressionApplied(item)" class="compression-saving">压缩后 {{ item.length }}×{{ item.width }}×{{ item.compressedHeight }} cm · 预计节省 {{ formatVolume(compressedVolumeSaving(item)) }}</span>
        <span v-else-if="compressionError(item)" class="compression-error">{{ compressionError(item) }}</span>
      </div>
      <select class="row-category" :value="item.category" aria-label="物品类别" @change="updateField(item.id, 'category', $event)">
        <option v-for="category in categories" :key="category">{{ category }}</option>
      </select>
      <label class="row-check">易碎<input type="checkbox" :checked="Boolean(item.fragile)" @change="updateField(item.id, 'fragile', $event)" /></label>
      <label v-if="canCompress(item)" class="row-compression">
        <input type="checkbox" :checked="Boolean(item.compressionEnabled)" @change="emit('compress', item.id, ($event.target as HTMLInputElement).checked)" /> 压缩
        <input
          class="compressed-height"
          type="number"
          min="0.1"
          step="0.1"
          :max="item.height"
          :value="item.compressedHeight"
          aria-label="压缩后的高度"
          :disabled="!item.compressionEnabled"
          @change="updateField(item.id, 'compressedHeight', $event)"
        /> cm
      </label>
      <button class="must-button" :class="{ checked: item.mustHave }" type="button" @click="emit('toggle', item.id, !item.mustHave)">{{ item.mustHave ? '必带' : '可选' }}</button>
      <b class="priority">P{{ item.priority }}</b>
      <button class="icon-button" type="button" :aria-label="`删除 ${item.name}`" @click="emit('remove', item.id)">×</button>
    </article>
  </div>
</template>
