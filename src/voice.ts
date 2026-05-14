export type VoiceCommand =
  | {
      type: 'add';
      itemName: string;
    }
  | {
      type: 'remove';
      itemName: string;
    }
  | {
      type: 'unknown';
    };

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const normalized = cleanupItemName(transcript);

  if (!normalized) {
    return { type: 'unknown' };
  }

  const addMatch = normalized.match(/^(?:добавь|добавить|купи|купить)(?:\s+в\s+список)?\s+(.+)$/u);
  if (addMatch?.[1]) {
    return {
      type: 'add',
      itemName: cleanupItemName(addMatch[1]),
    };
  }

  const removeMatch = normalized.match(/^(?:удали|удалить|убери|убрать)\s+(.+)$/u);
  if (removeMatch?.[1]) {
    return {
      type: 'remove',
      itemName: cleanupItemName(removeMatch[1]),
    };
  }

  if (looksLikeUnsupportedCommand(normalized)) {
    return { type: 'unknown' };
  }

  return {
    type: 'add',
    itemName: cleanupItemName(normalized),
  };
}

function cleanupItemName(value: string): string {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/[.,!?;:()[\]{}"'«»]/g, ' ')
    .replace(/(^|\s)пожалуйста(?=\s|$)/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeUnsupportedCommand(value: string): boolean {
  return /^(?:что|как|где|когда|почему|зачем|покажи|открой|очисти|сбрось)(?:\s|$)/u.test(value);
}
