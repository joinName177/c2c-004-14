import { describe, expect, it } from 'vitest';
import { effectiveDimensions, isCompressible, isCompressionActive, itemVolume, savedVolumeOf, suitcaseVolume, type PackingItem, type Suitcase } from '../models';

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

describe('compression helpers', () => {
  const clothing = (overrides: Partial<PackingItem> = {}): PackingItem => ({
    id: 'coat', name: '外套', category: '衣物', length: 10, width: 5, height: 4, weight: 1, priority: 2, mustHave: false, ...overrides,
  });

  it('uses the compressed height only when the toggle is on and the value is valid', () => {
    expect(effectiveDimensions(clothing({ compressedHeight: 2, useCompression: true })).height).toBe(2);
    expect(effectiveDimensions(clothing({ compressedHeight: 2, useCompression: false })).height).toBe(4);
    expect(effectiveDimensions(clothing({ compressedHeight: 9, useCompression: true })).height).toBe(4);
    expect(effectiveDimensions(clothing({ useCompression: true })).height).toBe(4);
  });

  it('never compresses electronics or fragile items', () => {
    expect(isCompressible(clothing())).toBe(true);
    expect(isCompressible(clothing({ category: '数码' }))).toBe(false);
    expect(isCompressible(clothing({ fragile: true }))).toBe(false);
    expect(isCompressionActive(clothing({ category: '数码', compressedHeight: 2, useCompression: true }))).toBe(false);
    expect(isCompressionActive(clothing({ fragile: true, compressedHeight: 2, useCompression: true }))).toBe(false);
  });

  it('keeps base dimensions and weight while only height and volume shrink', () => {
    const item = clothing({ compressedHeight: 1, useCompression: true });
    const dims = effectiveDimensions(item);
    expect(dims.length).toBe(10);
    expect(dims.width).toBe(5);
    expect(item.weight).toBe(1);
    expect(item.height).toBe(4);
    expect(savedVolumeOf(item)).toBe(10 * 5 * (4 - 1));
    expect(savedVolumeOf(clothing({ compressedHeight: 1, useCompression: false }))).toBe(0);
  });
});
