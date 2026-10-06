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
  compressionEnabled?: boolean;
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

export function canCompress(item: Pick<PackingItem, 'category' | 'fragile'>): boolean {
  return item.category === '衣物' && !item.fragile;
}

export function isCompressionApplied(item: PackingItem): boolean {
  return item.compressionEnabled === true
    && canCompress(item)
    && typeof item.compressedHeight === 'number'
    && item.compressedHeight > 0
    && item.compressedHeight <= item.height;
}

export function effectiveItemHeight(item: PackingItem): number {
  return isCompressionApplied(item) ? Number(item.compressedHeight) : item.height;
}

export function effectiveItemDimensions(item: PackingItem): Dimensions {
  return { length: item.length, width: item.width, height: effectiveItemHeight(item) };
}

export function itemVolume(item: Dimensions): number {
  return item.length * item.width * item.height;
}

export function compressedVolumeSaving(item: PackingItem): number {
  if (!isCompressionApplied(item)) return 0;
  return item.length * item.width * (item.height - Number(item.compressedHeight));
}

export function suitcaseVolume(suitcase: Dimensions): number {
  return suitcase.length * suitcase.width * suitcase.height;
}

export function formatVolume(volume: number): string {
  return volume >= 1000 ? `${(volume / 1000).toFixed(1)} L` : `${Math.round(volume)} cm³`;
}
