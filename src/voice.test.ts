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

  it('strips the command and speech punctuation without changing item casing', () => {
    expect(parseVoiceCommand('Добавь в список Сыр!')).toEqual({
      type: 'add',
      itemName: 'Сыр',
    });
  });

  it.each(['Coca-Cola ZERO', 'Молоко 3,2% (1 л)', "M&M's"])('preserves product punctuation: %s', (name) => {
    expect(parseVoiceCommand(`ДОБАВЬ ${name}`)).toEqual({ type: 'add', itemName: name });
  });

  it('handles polite speech punctuation without altering the product', () => {
    expect(parseVoiceCommand('Добавь, пожалуйста, Молоко 3,2%.')).toEqual({ type: 'add', itemName: 'Молоко 3,2%' });
    expect(parseVoiceCommand('УБЕРИ Coca-Cola ZERO')).toEqual({ type: 'remove', itemName: 'Coca-Cola ZERO' });
    expect(parseVoiceCommand('Добавь пожалуйста')).toEqual({ type: 'unknown' });
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
