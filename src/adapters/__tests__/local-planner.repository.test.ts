import { beforeEach, describe, expect, it } from 'vitest';
import { LocalPlannerRepository } from '../local-planner.repository';
import { createSampleSnapshot } from '../../core/sample-data';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('LocalPlannerRepository', () => {
  const storage = new MemoryStorage();
  beforeEach(() => storage.clear());

  it('round trips a planning snapshot', () => {
    const repo = new LocalPlannerRepository(storage);
    const sample = createSampleSnapshot();
    const snapshot = { ...sample, suitcase: { ...sample.suitcase, length: 61 } };
    repo.save(snapshot);
    expect(repo.load().value.suitcase.length).toBe(61);
  });

  it('keeps original and compressed dimensions through a save/load round trip', () => {
    const repo = new LocalPlannerRepository(storage);
    const sample = createSampleSnapshot();
    const jacket = sample.items.find((item) => item.id === 'jacket');
    if (!jacket) throw new Error('jacket missing');
    jacket.compressedHeight = 3;
    jacket.useCompression = true;
    repo.save(sample);
    const loaded = repo.load().value.items.find((item) => item.id === 'jacket');
    expect(loaded?.height).toBe(5);
    expect(loaded?.compressedHeight).toBe(3);
    expect(loaded?.useCompression).toBe(true);
  });

  it('returns sample data when storage is empty', () => {
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.warning).toBeUndefined();
  });

  it('returns sample data and a warning for malformed JSON', () => {
    storage.setItem('c2c-004.planner', '{bad');
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.warning).toContain('已恢复示例');
  });
});
