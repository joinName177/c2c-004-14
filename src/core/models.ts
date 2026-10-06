export type Dimensions = Readonly<{ length: number; width: number; height: number }>;
export type PlanMode = 'minimal' | 'comfort' | 'shopping';
export type RiskSeverity = 'critical' | 'warning' | 'info';

export interface Suitcase extends Dimensions {
  maxWeight: number;
}

export interface PackingItem extends Dimensions {
  id: string;
  name: string;
  category: string;
  weight: number;
  priority: 1 | 2 | 3;
  mustHave: boolean;
  fragile?: boolean;
  compressedHeight?: number;
  useCompression?: boolean;
}

export interface Placement {
  itemId: string;
  x: number;
  y: number;
  z: number;
  dimensions: Dimensions;
}

export interface PackingPlan {
  id: PlanMode;
  name: string;
  placements: Placement[];
  unplaced: Array<{ item: PackingItem; reason: string }>;
  totalWeight: number;
  usedVolume: number;
  savedVolume: number;
  capacityRatio: number;
}

export interface Risk {
  id: string;
  severity: RiskSeverity;
  title: string;
  message: string;
  itemId?: string;
}

export interface PackingSnapshot {
  suitcase: Suitcase;
  items: PackingItem[];
  selectedPlan: PlanMode;
}

export function itemVolume(item: Dimensions): number {
  return item.length * item.width * item.height;
}

export function suitcaseVolume(suitcase: Dimensions): number {
  return suitcase.length * suitcase.width * suitcase.height;
}

export const COMPRESSIBLE_CATEGORIES: readonly string[] = ['衣物'];

export function isCompressible(item: Pick<PackingItem, 'category' | 'fragile'>): boolean {
  return !item.fragile && COMPRESSIBLE_CATEGORIES.includes(item.category);
}

export function isCompressionActive(item: PackingItem): boolean {
  return Boolean(
    item.useCompression
    && isCompressible(item)
    && item.compressedHeight !== undefined
    && item.compressedHeight > 0
    && item.compressedHeight <= item.height,
  );
}

export function effectiveDimensions(item: PackingItem): Dimensions {
  return {
    length: item.length,
    width: item.width,
    height: isCompressionActive(item) && item.compressedHeight !== undefined ? item.compressedHeight : item.height,
  };
}

export function effectiveItemVolume(item: PackingItem): number {
  return itemVolume(effectiveDimensions(item));
}

export function savedVolumeOf(item: PackingItem): number {
  return isCompressionActive(item) ? itemVolume(item) - effectiveItemVolume(item) : 0;
}
