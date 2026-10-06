import { createSampleSnapshot } from '../core/sample-data';
import { canCompress, type PackingItem, type PackingSnapshot } from '../core/models';
import type { LoadResult, PlannerRepository } from '../ports/planner-repository.port';

const KEY = 'c2c-004.planner';

function normalizeItem(item: PackingItem): PackingItem {
  if (item.compressionEnabled && (!canCompress(item) || !(item.compressedHeight && item.compressedHeight > 0 && item.compressedHeight <= item.height))) {
    return { ...item, compressionEnabled: false };
  }
  return item;
}

function normalizeSnapshot(snapshot: PackingSnapshot): PackingSnapshot {
  return { ...snapshot, items: snapshot.items.map(normalizeItem) };
}

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private readonly storage: Storage) {}

  load(): LoadResult<PackingSnapshot> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return { value: createSampleSnapshot() };
    try {
      return { value: normalizeSnapshot(JSON.parse(raw) as PackingSnapshot) };
    } catch {
      return { value: createSampleSnapshot(), warning: '本地数据无法读取，已恢复示例。' };
    }
  }

  save(snapshot: PackingSnapshot): void {
    this.storage.setItem(KEY, JSON.stringify(snapshot));
  }
}
