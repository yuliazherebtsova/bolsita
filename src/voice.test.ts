import { describe, expect, it } from 'vitest';

import { parseVoiceCommand } from './voice';

describe('parseVoiceCommand', () => {
  it('parses add commands with item name', () => {
    expect(parseVoiceCommand('добавь хлеб')).toEqual({
      type: 'add',
      itemName: 'хлеб',
    });
    expect(parseVoiceCommand('добавить молоко')).toEqual({
      type: 'add',
      itemName: 'молоко',
    });
  });

  it('parses polite and imperative add variants', () => {
    expect(parseVoiceCommand('добавь пожалуйста хлеб')).toEqual({
      type: 'add',
      itemName: 'хлеб',
    });
    expect(parseVoiceCommand('купи сыр пожалуйста')).toEqual({
      type: 'add',
      itemName: 'сыр',
    });
  });

  it('parses add-to-list commands and normalizes punctuation and casing', () => {
    expect(parseVoiceCommand('Добавь в список Сыр!')).toEqual({
      type: 'add',
      itemName: 'сыр',
    });
  });

  it('treats a bare recognized item as an add command', () => {
    expect(parseVoiceCommand('хлеб')).toEqual({
      type: 'add',
      itemName: 'хлеб',
    });
  });

  it('parses remove commands with item name', () => {
    expect(parseVoiceCommand('удали хлеб')).toEqual({
      type: 'remove',
      itemName: 'хлеб',
    });
    expect(parseVoiceCommand('убери молоко.')).toEqual({
      type: 'remove',
      itemName: 'молоко',
    });
  });

  it('returns unknown for empty or unsupported commands', () => {
    expect(parseVoiceCommand('')).toEqual({ type: 'unknown' });
    expect(parseVoiceCommand('что купить')).toEqual({ type: 'unknown' });
    expect(parseVoiceCommand('покажи список')).toEqual({ type: 'unknown' });
  });
});
