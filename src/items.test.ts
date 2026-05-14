import { describe, expect, it } from 'vitest';

import {
  addItem,
  loadItems,
  removeItemByName,
  saveItems,
  sortItems,
  toggleItem,
  type ShoppingItem,
} from './items';

const existingItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 'item-1',
  name: 'Хлеб',
  checked: false,
  createdAt: 1000,
  ...overrides,
});

describe('shopping item operations', () => {
  it('adds a trimmed item with stable shape', () => {
    const result = addItem([], ' хлеб ');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Хлеб',
      checked: false,
    });
    expect(result[0].id).toMatch(/^item-/);
    expect(typeof result[0].createdAt).toBe('number');
  });

  it('does not duplicate existing items and restores them to active state', () => {
    const result = addItem([existingItem({ checked: true })], 'хлеб');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'item-1',
      name: 'Хлеб',
      checked: false,
    });
  });

  it('toggles checked state by id', () => {
    const result = toggleItem([existingItem()], 'item-1');

    expect(result[0].checked).toBe(true);
  });

  it('keeps item order when checked state changes', () => {
    const items = [
      existingItem({ id: 'item-1', name: 'Хлеб', createdAt: 1000 }),
      existingItem({ id: 'item-2', name: 'Молоко', createdAt: 2000 }),
      existingItem({ id: 'item-3', name: 'Сыр', createdAt: 3000 }),
    ];

    const checkedItems = toggleItem(items, 'item-1');

    expect(sortItems(checkedItems).map((item) => item.id)).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('removes the closest item by normalized name', () => {
    const items = [
      existingItem({ id: 'item-1', name: 'Белый хлеб' }),
      existingItem({ id: 'item-2', name: 'Молоко' }),
    ];

    const result = removeItemByName(items, 'хлеб');

    expect(result).toEqual([items[1]]);
  });
});

describe('shopping item storage', () => {
  it('saves and loads items from localStorage-compatible storage', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const items = [existingItem()];

    saveItems(adapter, items);

    expect(loadItems(adapter)).toEqual(items);
  });

  it('falls back to an empty list when stored JSON is invalid', () => {
    const adapter = {
      getItem: () => '{invalid',
      setItem: () => undefined,
    };

    expect(loadItems(adapter)).toEqual([]);
  });
});
