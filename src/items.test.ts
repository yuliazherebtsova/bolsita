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
      name: 'хлеб',
      checked: false,
    });
    expect(result[0].id).toMatch(/^item-/);
    expect(typeof result[0].createdAt).toBe('number');
  });

  it.each(['Coca-Cola ZERO', 'молоко 3,2% (1 л)', 'M&M\'s', 'сыр  "Гауда"'])('preserves the entered name: %s', (name) => {
    expect(addItem([], name)[0].name).toBe(name);
  });

  it('ignores blank names', () => {
    expect(addItem([], '   ')).toEqual([]);
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

  it('sorts each group alphabetically, with checked items last, without mutating storage order', () => {
    const items = [
      existingItem({ id: '1', name: 'Яблоки' }),
      existingItem({ id: '2', name: 'Хлеб', checked: true }),
      existingItem({ id: '3', name: 'бананы' }),
      existingItem({ id: '4', name: 'абрикосы', checked: true }),
      existingItem({ id: '5', name: 'Молоко' }),
    ];

    expect(sortItems(items).map((item) => item.id)).toEqual(['3', '5', '1', '4', '2']);
    expect(items.map((item) => item.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('moves a checked item down and restores its alphabetical position when unchecked', () => {
    const items = [existingItem({ id: '1', name: 'бананы' }), existingItem({ id: '2', name: 'Яблоки' })];
    const checkedItems = toggleItem(items, '1');

    expect(sortItems(checkedItems).map((item) => item.id)).toEqual(['2', '1']);
    expect(sortItems(toggleItem(checkedItems, '1')).map((item) => item.id)).toEqual(['1', '2']);
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
  it('keeps data from the installed v1 app unchanged across upgrades', () => {
    const previousData = '[{"id":"old-1","name":"молоко 3,2%","checked":true,"createdAt":1000}]';
    const storage = new Map([['bolsita.items.v1', previousData]]);
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    const items = loadItems(adapter);
    expect(items).toEqual(JSON.parse(previousData));
    saveItems(adapter, items);
    expect(storage.get('bolsita.items.v1')).toBe(previousData);
    expect(storage.size).toBe(1);
  });

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
