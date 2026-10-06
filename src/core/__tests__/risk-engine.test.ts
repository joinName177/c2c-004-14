import { describe, expect, it } from 'vitest';
import { detectRisks } from '../risk-engine';
import type { PackingItem, PackingPlan, Suitcase } from '../models';

const suitcase: Suitcase = { length: 10, width: 8, height: 6, maxWeight: 10 };
const item = (id: string, overrides: Partial<PackingItem> = {}): PackingItem => ({ id, name: id, category: '其他', length: 2, width: 2, height: 2, weight: 1, priority: 2, mustHave: false, ...overrides });
const basePlan = (): PackingPlan => ({ id: 'comfort', name: '舒适版', placements: [], unplaced: [], totalWeight: 0, usedVolume: 0, savedVolume: 0, capacityRatio: 0 });

describe('detectRisks', () => {
  it('reports overweight and high volume', () => {
    const plan = { ...basePlan(), totalWeight: 11, usedVolume: 460, capacityRatio: 0.96 };
    expect(detectRisks(plan, suitcase, []).map((risk) => risk.id)).toEqual(expect.arrayContaining(['overweight', 'high-volume']));
  });

  it('reports an oversized unplaced item', () => {
    const huge = item('huge', { length: 11 });
    const plan = { ...basePlan(), unplaced: [{ item: huge, reason: '没有可用的连续空间' }] };
    expect(detectRisks(plan, suitcase, [huge]).some((risk) => risk.id === 'oversized-huge')).toBe(true);
  });

  it('checks oversized against the compressed height when compression is active', () => {
    const coat = item('coat', { category: '衣物', length: 2, width: 2, height: 11, compressedHeight: 5, useCompression: true });
    const compressedPlan = { ...basePlan(), unplaced: [{ item: coat, reason: '没有可用的连续空间' }] };
    expect(detectRisks(compressedPlan, suitcase, [coat]).some((risk) => risk.id === 'oversized-coat')).toBe(false);
    const raw = item('raw', { category: '衣物', length: 2, width: 2, height: 11 });
    const rawPlan = { ...basePlan(), unplaced: [{ item: raw, reason: '没有可用的连续空间' }] };
    expect(detectRisks(rawPlan, suitcase, [raw]).some((risk) => risk.id === 'oversized-raw')).toBe(true);
  });

  it('reports fragile items with a box stacked above', () => {
    const glass = item('glass', { fragile: true });
    const top = item('top');
    const plan = { ...basePlan(), placements: [
      { itemId: 'glass', x: 0, y: 0, z: 0, dimensions: { length: 2, width: 2, height: 2 } },
      { itemId: 'top', x: 0, y: 0, z: 2, dimensions: { length: 2, width: 2, height: 2 } },
    ] };
    expect(detectRisks(plan, suitcase, [glass, top]).some((risk) => risk.id === 'fragile-glass')).toBe(true);
  });

  it('reports heavy items placed high', () => {
    const heavy = item('heavy', { weight: 4 });
    const plan = { ...basePlan(), placements: [{ itemId: 'heavy', x: 0, y: 0, z: 4, dimensions: { length: 2, width: 2, height: 2 } }] };
    expect(detectRisks(plan, suitcase, [heavy]).some((risk) => risk.id === 'high-heavy')).toBe(true);
  });

  it('marks an omitted must-have item as critical', () => {
    const required = item('passport', { mustHave: true });
    const plan = { ...basePlan(), unplaced: [{ item: required, reason: '空间不足' }] };
    expect(detectRisks(plan, suitcase, [required])).toContainEqual(expect.objectContaining({ id: 'missing-passport', severity: 'critical' }));
  });
});
