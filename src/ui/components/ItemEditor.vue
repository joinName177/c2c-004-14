<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { canCompress, type PackingItem } from '../../core/models';

const emit = defineEmits<{ add: [item: PackingItem] }>();
const draft = reactive({
  name: '',
  category: '衣物',
  length: 20,
  width: 15,
  height: 5,
  compressedHeight: 3.5,
  weight: 0.3,
  priority: 2 as 1|2|3,
  mustHave: false,
  fragile: false,
  compressionEnabled: false,
});
const compressionAllowed = computed(() => canCompress(draft));
const compressedHeightError = computed(() => draft.compressedHeight > 0 && draft.compressedHeight <= draft.height ? '' : '压缩高度必须大于 0 且不超过原高度');
const dimensionsError = computed(() => [draft.length, draft.width, draft.height, draft.weight].every((value) => value > 0) ? '' : '尺寸和重量必须大于 0');

watch(compressionAllowed, (allowed) => {
  if (!allowed) draft.compressionEnabled = false;
});

function submit() {
  if (dimensionsError.value || (compressionAllowed.value && compressedHeightError.value)) return;
  const name = draft.name.trim() || '未命名物品';
  emit('add', {
    ...draft,
    name,
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    compressionEnabled: compressionAllowed.value && draft.compressionEnabled,
    compressedHeight: compressionAllowed.value ? draft.compressedHeight : undefined,
  });
  draft.name = '';
}
</script>

<template>
  <form class="item-editor" data-testid="item-editor" @submit.prevent="submit">
    <input v-model="draft.name" aria-label="物品名称" placeholder="添加物品名称" />
    <select v-model="draft.category" aria-label="物品类别"><option>衣物</option><option>鞋履</option><option>数码</option><option>洗护</option><option>随身</option><option>预留</option><option>其他</option></select>
    <label class="dimension-input">长 <input v-model.number="draft.length" aria-label="物品长度" type="number" min="0.1" step="0.1" /></label>
    <label class="dimension-input">宽 <input v-model.number="draft.width" aria-label="物品宽度" type="number" min="0.1" step="0.1" /></label>
    <label class="dimension-input">原高 <input v-model.number="draft.height" aria-label="物品原始高度" type="number" min="0.1" step="0.1" /></label>
    <label class="dimension-input">重量 <input v-model.number="draft.weight" aria-label="物品重量" type="number" min="0.1" step="0.1" /></label>
    <label class="option-check"><input v-model="draft.mustHave" type="checkbox" /> 必带</label>
    <label class="option-check"><input v-model="draft.fragile" type="checkbox" /> 易碎</label>
    <label v-if="compressionAllowed" class="compression-edit">
      <span>压缩后高度</span>
      <input v-model.number="draft.compressedHeight" aria-label="压缩后高度" type="number" min="0.1" step="0.1" :max="draft.height" />
      <label><input v-model="draft.compressionEnabled" type="checkbox" /> 采用压缩</label>
    </label>
    <p v-if="dimensionsError" class="item-error" role="alert">{{ dimensionsError }}</p>
    <p v-else-if="compressionAllowed && compressedHeightError" class="item-error" role="alert">{{ compressedHeightError }}</p>
    <button type="submit">＋ 添加</button>
  </form>
</template>
