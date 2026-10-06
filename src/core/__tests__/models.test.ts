import { describe, expect, it } from 'vitest';
import {
  canCompress,
  compressedVolumeSaving,
  effectiveItemDimensions,
  formatVolume,
  isCompressionApplied,
  itemVolume,
  suitcaseVolume,
  type PackingItem,
  type Suitcase,
} from '../models';

describe('volume helpers', () => {
  it('multiplies an item dimensions in centimeters', () => {
    const item = { length: 10, width: 4, height: 3 } as PackingItem;
    expect(itemVolume(item)).toBe(120);
  });

  it('multiplies suitcase internal dimensions', () => {
    const suitcase = { length: 50, width: 30, height: 20 } as Suitcase;
    expect(suitcaseVolume(suitcase)).toBe(30_000);
  });
});

describe('clothing compression', () => {
  const clothing = (overrides: Partial<PackingItem> = {}): PackingItem => ({
    id: 'shirt',
    name: '衬衫',
    category: '衣物',
    length: 30,
    width: 20,
    height: 10,
    weight: 0.5,
    priority: 2,
    mustHave: false,
    ...overrides,
  });

  it('allows compression only for non-fragile clothing', () => {
    expect(canCompress(clothing())).toBe(true);
    expect(canCompress(clothing({ category: '数码' }))).toBe(false);
    expect(canCompress(clothing({ fragile: true }))).toBe(false);
  });

  it('keeps original dimensions and calculates only height-based savings when applied', () => {
    const item = clothing({ compressedHeight: 4, compressionEnabled: true });
    expect(isCompressionApplied(item)).toBe(true);
    expect(item.height).toBe(10);
    expect(effectiveItemDimensions(item)).toEqual({ length: 30, width: 20, height: 4 });
    expect(compressedVolumeSaving(item)).toBe(30 * 20 * 6);
  });

  it('rejects compressed heights outside the original height', () => {
    expect(isCompressionApplied(clothing({ compressedHeight: 0, compressionEnabled: true }))).toBe(false);
    expect(isCompressionApplied(clothing({ compressedHeight: 11, compressionEnabled: true }))).toBe(false);
    expect(formatVolume(1440)).toBe('1.4 L');
  });
});
