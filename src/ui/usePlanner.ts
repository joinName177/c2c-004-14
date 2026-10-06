import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import { canCompress, type PackingItem, type PackingSnapshot, type PlanMode, type Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }
type ConfirmCompression = (message: string) => boolean;

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive<PackingSnapshot>(loaded.value);
  const notice = ref(loaded.warning ?? '');
  const isStale = ref(false);
  const plans = ref(generatePlans(state.suitcase, state.items));
  const currentPlan = computed(() => plans.value[state.selectedPlan]);
  const risks = computed(() => detectRisks(currentPlan.value, state.suitcase, state.items));

  const save = () => repository.save(JSON.parse(JSON.stringify(state)) as PackingSnapshot);
  const markStale = () => { isStale.value = true; save(); };
  const replaceItem = (id: string, next: PackingItem) => {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = next;
  };

  function addItem(item: PackingItem) { state.items.push(item); markStale(); }
  function updateItem(id: string, patch: Partial<PackingItem>, confirm: ConfirmCompression = window.confirm): boolean {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return false;

    const current = state.items[index];
    const candidate = { ...current, ...patch } as PackingItem;
    const invalidCompressedHeight = patch.compressedHeight !== undefined
      && canCompress(candidate)
      && !(Number(candidate.compressedHeight) > 0 && Number(candidate.compressedHeight) <= candidate.height);
    if (invalidCompressedHeight) return false;

    const shouldDisableCompression = candidate.compressionEnabled && !canCompress(candidate);
    if (shouldDisableCompression && !confirm('该物品改为不允许压缩的类别或标记为易碎，是否停用压缩并重新计算？')) {
      return false;
    }

    const next = shouldDisableCompression ? { ...candidate, compressionEnabled: false } : candidate;
    replaceItem(id, next);
    if (shouldDisableCompression) regenerate(next.name);
    else markStale();
    return true;
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markStale(); }
  function setCompression(id: string, enabled: boolean): boolean {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const current = state.items[index];
    if (enabled && !canCompress(current)) return false;

    let compressedHeight = current.compressedHeight;
    if (enabled && (!(typeof compressedHeight === 'number' && compressedHeight > 0 && compressedHeight <= current.height))) {
      compressedHeight = Number(Math.max(current.height * 0.7, 0.1).toFixed(1));
    }
    replaceItem(id, { ...current, compressionEnabled: enabled, compressedHeight });
    regenerate(current.name);
    return true;
  }
  function regenerate(itemName?: string) {
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = itemName ? `已按${itemName}的压缩设置重新计算三套方案` : '三套方案已重新计算';
    save();
  }
  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  function resetSample() {
    const sample = createSampleSnapshot();
    Object.assign(state, sample);
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }

  return {
    state,
    notice,
    isStale,
    plans,
    currentPlan,
    risks,
    addItem,
    updateItem,
    setCompression,
    removeItem,
    updateSuitcase,
    regenerate,
    selectPlan,
    resetSample,
    print: () => printPort.print(),
  };
}
