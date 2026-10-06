import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import type { PackingItem, PackingSnapshot, PlanMode, Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

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
  const recalculate = (message: string) => {
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = message;
    save();
  };

  function addItem(item: PackingItem) { state.items.push(item); markStale(); }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    markStale();
  }
  function updateItemAndRecalculate(id: string, patch: Partial<PackingItem>, message = '已重新计算三套方案') {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    recalculate(message);
  }
  function setCompression(id: string, patch: Partial<PackingItem>) {
    updateItemAndRecalculate(id, patch, '已按压缩设置重新计算三套方案');
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markStale(); }
  function regenerate() { recalculate('三套方案已重新计算'); }
  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  function resetSample() {
    const sample = createSampleSnapshot();
    Object.assign(state, sample);
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }

  return { state, notice, isStale, plans, currentPlan, risks, addItem, updateItem, updateItemAndRecalculate, setCompression, removeItem, updateSuitcase, regenerate, selectPlan, resetSample, print: () => printPort.print() };
}
