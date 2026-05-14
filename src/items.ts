export const STORAGE_KEY = 'bolsita.items.v1';

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  createdAt: number;
}

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}

export function addItem(items: ShoppingItem[], rawName: string): ShoppingItem[] {
  const name = formatItemName(rawName);

  if (!name) {
    return items;
  }

  const normalizedName = normalizeItemName(name);
  const existing = items.find((item) => normalizeItemName(item.name) === normalizedName);

  if (existing) {
    return items.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            checked: false,
          }
        : item,
    );
  }

  return [
    ...items,
    {
      id: createItemId(),
      name,
      checked: false,
      createdAt: Date.now(),
    },
  ];
}

export function toggleItem(items: ShoppingItem[], itemId: string): ShoppingItem[] {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          checked: !item.checked,
        }
      : item,
  );
}

export function removeItem(items: ShoppingItem[], itemId: string): ShoppingItem[] {
  return items.filter((item) => item.id !== itemId);
}

export function removeItemByName(items: ShoppingItem[], rawName: string): ShoppingItem[] {
  const query = normalizeItemName(rawName);

  if (!query) {
    return items;
  }

  const exactIndex = items.findIndex((item) => normalizeItemName(item.name) === query);
  const fallbackIndex =
    exactIndex >= 0
      ? exactIndex
      : items.findIndex((item) => {
          const itemName = normalizeItemName(item.name);

          return itemName.includes(query) || query.includes(itemName);
        });

  if (fallbackIndex < 0) {
    return items;
  }

  return items.filter((_, index) => index !== fallbackIndex);
}

export function saveItems(storage: StorageAdapter, items: ShoppingItem[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadItems(storage: StorageAdapter): ShoppingItem[] {
  const value = storage.getItem(STORAGE_KEY);

  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isShoppingItem);
  } catch {
    return [];
  }
}

export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      return a.checked ? 1 : -1;
    }

    return a.createdAt - b.createdAt;
  });
}

export function normalizeItemName(value: string): string {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/[.,!?;:()[\]{}"'«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatItemName(value: string): string {
  const normalized = normalizeItemName(value);

  if (!normalized) {
    return '';
  }

  return `${normalized[0].toLocaleUpperCase('ru-RU')}${normalized.slice(1)}`;
}

function createItemId(): string {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.checked === 'boolean' &&
    typeof item.createdAt === 'number'
  );
}
