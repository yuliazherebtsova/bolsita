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
  const normalized = normalizeTranscript(transcript);

  if (!normalized) {
    return { type: 'unknown' };
  }

  const addMatch = normalized.match(/^(?:добавь|добавить)(?:\s+в\s+список)?\s+(.+)$/u);
  if (addMatch?.[1]) {
    return {
      type: 'add',
      itemName: addMatch[1].trim(),
    };
  }

  const removeMatch = normalized.match(/^(?:удали|удалить|убери|убрать)\s+(.+)$/u);
  if (removeMatch?.[1]) {
    return {
      type: 'remove',
      itemName: removeMatch[1].trim(),
    };
  }

  return { type: 'unknown' };
}

function normalizeTranscript(value: string): string {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/[.,!?;:()[\]{}"'«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
