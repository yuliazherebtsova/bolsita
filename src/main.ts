import './styles.css';

import {
  addItem,
  loadItems,
  normalizeItemName,
  removeItem,
  removeItemByName,
  saveItems,
  sortItems,
  toggleItem,
  type ShoppingItem,
} from './items';
import { parseVoiceCommand } from './voice';

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('App root was not found.');
}

const app = appRoot;

let items = loadItems(window.localStorage);
let highlightedId: string | null = null;
let voiceStatus = 'Готово';
let isListening = false;
let recognition: SpeechRecognitionInstance | null = null;

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Сегодня</p>
        <h1>Bolsita</h1>
      </div>
      <div class="counter" aria-live="polite">
        <strong data-active-count>0</strong>
        <span data-active-label>активных</span>
      </div>
    </header>

    <main class="shopping-area">
      <ul class="item-list" data-items aria-label="Список покупок"></ul>
      <div class="empty-state" data-empty-state hidden>
        <p>Список пуст</p>
        <span>Добавьте первый товар</span>
      </div>
    </main>

    <section class="composer" aria-label="Добавление товара">
      <form class="add-form" data-add-form>
        <label class="visually-hidden" for="new-item">Новый товар</label>
        <input id="new-item" name="item" type="text" autocomplete="off" placeholder="Новый товар" data-item-input />
        <button class="icon-button add-button" type="submit" aria-label="Добавить товар" title="Добавить">
          ${plusIcon()}
        </button>
      </form>
      <button class="mic-button" type="button" data-mic-button aria-label="Голосовой ввод" title="Голосовой ввод">
        ${micIcon()}
      </button>
      <p class="voice-status" data-voice-status aria-live="polite">Готово</p>
    </section>
  </div>
`;

const itemList = requireElement<HTMLUListElement>('[data-items]');
const activeCount = requireElement<HTMLElement>('[data-active-count]');
const activeLabel = requireElement<HTMLElement>('[data-active-label]');
const emptyState = requireElement<HTMLElement>('[data-empty-state]');
const addForm = requireElement<HTMLFormElement>('[data-add-form]');
const itemInput = requireElement<HTMLInputElement>('[data-item-input]');
const micButton = requireElement<HTMLButtonElement>('[data-mic-button]');
const voiceStatusElement = requireElement<HTMLElement>('[data-voice-status]');

addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addFromText(itemInput.value);
  itemInput.value = '';
  itemInput.focus();
});

itemList.addEventListener('change', (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
    return;
  }

  items = toggleItem(items, target.dataset.itemId ?? '');
  persistAndRender();
});

itemList.addEventListener('click', (event) => {
  const deleteButton = (event.target as Element).closest<HTMLButtonElement>('[data-delete-id]');

  if (!deleteButton) {
    return;
  }

  items = removeItem(items, deleteButton.dataset.deleteId ?? '');
  persistAndRender();
});

micButton.addEventListener('click', () => {
  if (!recognition) {
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    recognition.start();
  } catch {
    voiceStatus = 'Повторите через секунду';
    render();
  }
});

setupSpeechRecognition();
registerServiceWorker();
render();

function addFromText(rawName: string): void {
  const name = normalizeItemName(rawName);

  if (!name) {
    voiceStatus = 'Введите товар';
    render();
    return;
  }

  items = addItem(items, name);
  const target = items.find((item) => normalizeItemName(item.name) === name);
  highlightedId = target?.id ?? null;
  voiceStatus = `Добавлено: ${name}`;
  persistAndRender();
  clearHighlightSoon();
}

function requireElement<TElement extends Element>(selector: string): TElement {
  const element = app.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Required UI element was not found: ${selector}`);
  }

  return element;
}

function persistAndRender(): void {
  saveItems(window.localStorage, items);
  render();
}

function render(): void {
  const sortedItems = sortItems(items);
  const activeItems = items.filter((item) => !item.checked).length;

  activeCount.textContent = String(activeItems);
  activeLabel.textContent = pluralizeItems(activeItems);
  emptyState.hidden = sortedItems.length > 0;
  voiceStatusElement.textContent = voiceStatus;
  micButton.classList.toggle('is-listening', isListening);
  micButton.setAttribute('aria-pressed', String(isListening));

  itemList.innerHTML = sortedItems.map((item) => itemTemplate(item)).join('');
}

function itemTemplate(item: ShoppingItem): string {
  const checked = item.checked ? 'checked' : '';
  const checkedClass = item.checked ? ' is-checked' : '';
  const highlightedClass = highlightedId === item.id ? ' is-highlighted' : '';
  const safeName = escapeHtml(item.name);

  return `
    <li class="item-row${checkedClass}${highlightedClass}">
      <label class="check-control">
        <input type="checkbox" data-item-id="${item.id}" ${checked} aria-label="Отметить ${safeName}" />
        <span aria-hidden="true">${checkIcon()}</span>
      </label>
      <span class="item-name">${safeName}</span>
      <button class="icon-button delete-button" type="button" data-delete-id="${item.id}" aria-label="Удалить ${safeName}" title="Удалить">
        ${trashIcon()}
      </button>
    </li>
  `;
}

function setupSpeechRecognition(): void {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

  if (!Recognition) {
    recognition = null;
    micButton.disabled = true;
    voiceStatus = 'Голос недоступен в этом браузере';
    return;
  }

  recognition = new Recognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    voiceStatus = 'Слушаю...';
    render();
  };

  recognition.onend = () => {
    isListening = false;
    render();
  };

  recognition.onerror = (event) => {
    isListening = false;
    voiceStatus = speechErrorMessage(event.error);
    render();
  };

  recognition.onresult = (event) => {
    const transcript = getTranscript(event.results);
    handleVoiceTranscript(transcript);
  };
}

function handleVoiceTranscript(transcript: string): void {
  const heardText = normalizeItemName(transcript);
  const command = parseVoiceCommand(transcript);

  if (command.type === 'add') {
    addFromText(command.itemName);
    return;
  }

  if (command.type === 'remove') {
    const beforeLength = items.length;
    items = removeItemByName(items, command.itemName);
    voiceStatus =
      items.length < beforeLength ? `Удалено: ${command.itemName}` : `Не найдено: ${command.itemName}. Услышала: ${heardText || transcript}`;
    persistAndRender();
    return;
  }

  voiceStatus = heardText ? `Не поняла: ${heardText}` : 'Речь не распознана';
  render();
}

function getTranscript(results: SpeechRecognitionResultListLike): string {
  const transcriptParts: string[] = [];

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const alternative = result?.[0]?.transcript;

    if (alternative) {
      transcriptParts.push(alternative);
    }
  }

  return transcriptParts.join(' ').trim();
}

function speechErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Разрешите микрофон';
  }

  if (error === 'no-speech') {
    return 'Речь не услышана';
  }

  if (error === 'network') {
    return 'Нужна сеть для распознавания';
  }

  return 'Не удалось распознать';
}

function clearHighlightSoon(): void {
  window.setTimeout(() => {
    highlightedId = null;
    render();
  }, 900);
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }

  const serviceWorkerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, window.location.origin);

  navigator.serviceWorker.register(serviceWorkerUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
    voiceStatus = 'Офлайн-режим подключится позже';
    render();
  });
}

function pluralizeItems(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'активный';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'активных';
  }

  return 'активных';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plusIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  `;
}

function micIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  `;
}

function trashIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 15h10l1-15" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  `;
}

function checkIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 12 4 4 10-10" />
    </svg>
  `;
}
