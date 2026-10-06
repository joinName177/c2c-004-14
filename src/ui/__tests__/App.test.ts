import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import App from '../App.vue';
import { LocalPlannerRepository } from '../../adapters/local-planner.repository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function render() {
  let printCount = 0;
  const wrapper = mount(App, { props: {
    repository: new LocalPlannerRepository(new MemoryStorage()),
    printPort: { print: () => { printCount += 1; } },
  } });
  return { wrapper, getPrintCount: () => printCount };
}

describe('Luggage planner App', () => {
  it('renders sample luggage and catches invalid dimensions', async () => {
    const { wrapper } = render();
    expect(wrapper.text()).toContain('行李箱空间规划师');
    expect(wrapper.text()).toContain('轻薄外套');
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('行李箱长度必须大于 0');
  });

  it('adds and deletes an item', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('新物品');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('新物品');
    await wrapper.get('[aria-label="删除 新物品"]').trigger('click');
    expect(wrapper.text()).not.toContain('新物品');
  });

  it('selects a plan and highlights the same item in both projections', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    expect(wrapper.get('[data-plan="shopping"]').classes()).toContain('active');
    const jacket = wrapper.findAll('[data-item-id="jacket"]');
    expect(jacket.length).toBe(2);
    await jacket[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
  });

  it('delegates printing through the print port', async () => {
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('compresses clothing and shows saved volume in plans, metrics and print sheet', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="压缩 轻薄外套"]').setValue(true);
    await wrapper.get('[aria-label="轻薄外套 压缩后高度"]').setValue('3');
    expect(wrapper.text()).toContain('本次采用高 3 cm · 节省 1.4 L');
    expect(wrapper.text()).toContain('压缩节省');
    expect(wrapper.text()).toContain('节省 1.4 L');
    expect(wrapper.text()).toContain('原尺寸 30×24×5 cm · 本次采用 30×24×3 cm');
    expect(wrapper.text()).toContain('本次压缩节省体积 1.4 L');
  });

  it('rejects a compressed height outside the original height', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="压缩 轻薄外套"]').setValue(true);
    const heightInput = wrapper.get('[aria-label="轻薄外套 压缩后高度"]');
    await heightInput.setValue('0');
    expect(wrapper.text()).toContain('压缩高度必须大于 0');
    await heightInput.setValue('9');
    expect(wrapper.text()).toContain('压缩高度不能超过原高度');
    expect(wrapper.text()).not.toContain('本次采用高 9 cm');
  });

  it('asks before disabling compression when the category no longer allows it', async () => {
    const { wrapper } = render();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await wrapper.get('[aria-label="压缩 轻薄外套"]').setValue(true);
    const select = wrapper.get('[aria-label="修改 轻薄外套 类别"]');
    await select.setValue('数码');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[aria-label="压缩 轻薄外套"]').exists()).toBe(true);
    confirmSpy.mockReturnValue(true);
    await select.setValue('数码');
    expect(wrapper.find('[aria-label="压缩 轻薄外套"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('已停用压缩并重新计算三套方案');
    confirmSpy.mockRestore();
  });

  it('asks before disabling compression when the item is marked fragile', async () => {
    const { wrapper } = render();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await wrapper.get('[aria-label="压缩 轻薄外套"]').setValue(true);
    await wrapper.get('[aria-label="标记 轻薄外套 易碎"]').setValue(true);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[aria-label="压缩 轻薄外套"]').exists()).toBe(false);
    confirmSpy.mockRestore();
  });
});
