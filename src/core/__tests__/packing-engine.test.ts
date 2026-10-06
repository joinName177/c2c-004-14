import { describe, expect, it } from 'vitest';
import { packItems, validateCompression, validateSuitcase } from '../packing-engine';
import type { PackingItem, Suitcase } from '../models';

const suitcase = (overrides: Partial<Suitcase> = {}): Suitcase => ({ length: 10, width: 8, height: 6, maxWeight: 10, ...overrides });
const item = (id: string, overrides: Partial<PackingItem> = {}): PackingItem => ({
  id, name: id, category: '衣物', length: 3, width: 2, height: 1, weight: 1, priority: 2, mustHave: false, ...overrides,
});

describe('validateSuitcase', () => {
  it('rejects each non-positive capacity', () => {
    expect(validateSuitcase(suitcase({ height: 0 }))).toContain('行李箱高度必须大于 0');
    expect(validateSuitcase(suitcase({ maxWeight: -1 }))).toContain('承重必须大于 0');
  });
});

describe('validateCompression', () => {
  it('requires a positive compressed height not exceeding the original', () => {
    expect(validateCompression(item('a', { compressedHeight: 0 }))).toContain('压缩高度必须大于 0');
    expect(validateCompression(item('a', { compressedHeight: -2 }))).toContain('压缩高度必须大于 0');
    expect(validateCompression(item('a', { height: 5, compressedHeight: 6 }))).toContain('压缩高度不能超过原高度');
    expect(validateCompression(item('a', { height: 5, compressedHeight: 5 }))).toEqual([]);
    expect(validateCompression(item('a'))).toEqual([]);
  });
});

describe('packItems', () => {
  it('allows total weight exactly at the suitcase limit', () => {
    const plan = packItems(suitcase({ maxWeight: 2 }), [item('a'), item('b')], 'comfort');
    expect(plan.placements).toHaveLength(2);
    expect(plan.totalWeight).toBe(2);
  });

  it('uses rotation when the original orientation does not fit', () => {
    const plan = packItems(suitcase({ length: 4, width: 3, height: 2 }), [item('rotated', { length: 2, width: 4, height: 3 })], 'comfort');
    expect(plan.placements[0]?.dimensions).toEqual({ length: 4, width: 3, height: 2 });
  });

  it('keeps placements inside bounds and non-overlapping', () => {
    const plan = packItems(suitcase(), [item('a'), item('b'), item('c')], 'comfort');
    expect(plan.placements.every((p) => p.x + p.dimensions.length <= 10 && p.y + p.dimensions.width <= 8 && p.z + p.dimensions.height <= 6)).toBe(true);
    expect(new Set(plan.placements.map((p) => `${p.x}:${p.y}:${p.z}`)).size).toBe(3);
  });

  it('returns deterministic coordinates and an unplaced reason', () => {
    const inputs = [item('a'), item('huge', { length: 30 })];
    expect(packItems(suitcase(), inputs, 'comfort')).toEqual(packItems(suitcase(), inputs, 'comfort'));
    expect(packItems(suitcase(), inputs, 'comfort').unplaced[0]?.reason).toContain('空间');
  });

  it('packs compressed clothing with the reduced height and reports saved volume', () => {
    const a = item('a', { length: 10, width: 8, height: 4 });
    const b = item('b', { length: 10, width: 8, height: 4, weight: 2, compressedHeight: 2, useCompression: true });
    const plan = packItems(suitcase(), [a, b], 'comfort');
    expect(plan.placements.map((p) => p.itemId).sort()).toEqual(['a', 'b']);
    expect(plan.placements.find((p) => p.itemId === 'b')?.z).toBe(4);
    expect(plan.totalWeight).toBe(3);
    expect(plan.savedVolume).toBe(10 * 8 * (4 - 2));
  });

  it('leaves the same item unplaced when compression is off', () => {
    const a = item('a', { length: 10, width: 8, height: 4 });
    const b = item('b', { length: 10, width: 8, height: 4, weight: 2, compressedHeight: 2 });
    const plan = packItems(suitcase(), [a, b], 'comfort');
    expect(plan.unplaced.map((entry) => entry.item.id)).toEqual(['b']);
    expect(plan.savedVolume).toBe(0);
  });

  it('ignores compression settings on fragile items', () => {
    const glass = item('glass', { height: 2, fragile: true, compressedHeight: 1, useCompression: true });
    const plan = packItems(suitcase(), [glass], 'comfort');
    expect(plan.usedVolume).toBe(3 * 2 * 2);
    expect(plan.savedVolume).toBe(0);
  });
});
