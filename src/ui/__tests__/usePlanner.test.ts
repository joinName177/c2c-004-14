import { describe, expect, it } from 'vitest';
import { createSampleSnapshot } from '../../core/sample-data';
import { usePlanner } from '../usePlanner';
import type { PackingSnapshot } from '../../core/models';
import type { PlannerRepository } from '../../ports/planner-repository.port';

class MemoryRepository implements PlannerRepository {
  saved?: PackingSnapshot;
  constructor(private snapshot = createSampleSnapshot()) {}
  load() { return { value: structuredClone(this.snapshot) }; }
  save(snapshot: PackingSnapshot) { this.saved = structuredClone(snapshot); }
}

describe('usePlanner', () => {
  it('adds, updates and removes items while marking results stale', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const initial = planner.state.items.length;
    planner.addItem({ id: 'new', name: '帽子', category: '衣物', length: 12, width: 12, height: 5, weight: 0.2, priority: 2, mustHave: false });
    expect(planner.state.items).toHaveLength(initial + 1);
    expect(planner.isStale.value).toBe(true);
    planner.updateItem('new', { name: '遮阳帽' });
    expect(planner.state.items.find((item) => item.id === 'new')?.name).toBe('遮阳帽');
    planner.removeItem('new');
    expect(planner.state.items).toHaveLength(initial);
  });

  it('regenerates plans and persists the selected mode', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 12 });
    expect(planner.isStale.value).toBe(true);
    planner.regenerate();
    planner.selectPlan('shopping');
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.shopping.name).toBe('购物版');
    expect(repository.saved?.selectedPlan).toBe('shopping');
  });

  it('recalculates immediately while retaining the original height when compression is switched', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    const jacket = planner.state.items.find((item) => item.id === 'jacket')!;
    expect(jacket.height).toBe(5);
    expect(jacket.compressedHeight).toBe(3);
    expect(planner.plans.value.comfort.savedVolume).toBeGreaterThan(0);

    expect(planner.setCompression('jacket', false)).toBe(true);
    const uncompressed = planner.state.items.find((item) => item.id === 'jacket')!;
    expect(uncompressed.compressionEnabled).toBe(false);
    expect(uncompressed.height).toBe(5);
    expect(uncompressed.compressedHeight).toBe(3);
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.comfort.savedVolume).toBe(0);
  });

  it('keeps compression when changing to an ineligible category is cancelled', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    const outcome = planner.updateItem('jacket', { category: '数码' }, () => false);
    const jacket = planner.state.items.find((item) => item.id === 'jacket')!;
    expect(outcome).toBe(false);
    expect(jacket.category).toBe('衣物');
    expect(jacket.compressionEnabled).toBe(true);
    expect(planner.isStale.value).toBe(false);
  });

  it('disables compression and recalculates after confirming an ineligible change', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    const outcome = planner.updateItem('jacket', { fragile: true }, () => true);
    const jacket = planner.state.items.find((item) => item.id === 'jacket')!;
    expect(outcome).toBe(true);
    expect(jacket.fragile).toBe(true);
    expect(jacket.compressionEnabled).toBe(false);
    expect(planner.isStale.value).toBe(false);
  });

  it('refuses compression for digital items', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    expect(planner.setCompression('camera', true)).toBe(false);
    expect(planner.state.items.find((item) => item.id === 'camera')?.compressionEnabled).not.toBe(true);
  });

  it('rejects compressed heights outside the original height', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    expect(planner.updateItem('jacket', { compressedHeight: 6 })).toBe(false);
    expect(planner.state.items.find((item) => item.id === 'jacket')?.compressedHeight).toBe(3);
  });
});
