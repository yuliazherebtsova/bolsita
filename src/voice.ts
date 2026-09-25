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
  const text = cleanupItemName(transcript);

  if (!text) {
    return { type: 'unknown' };
  }

  const addMatch = text.match(/^(?:добавь|добавить|купи|купить)(?:\s+в\s+список)?(?:[\s,]+(.*))?$/iu);
  if (addMatch) {
    const itemName = cleanupItemName(addMatch[1] ?? '');
    return itemName ? { type: 'add', itemName } : { type: 'unknown' };
  }

  const removeMatch = text.match(/^(?:удали|удалить|убери|убрать)(?:[\s,]+(.*))?$/iu);
  if (removeMatch) {
    const itemName = cleanupItemName(removeMatch[1] ?? '');
    return itemName ? { type: 'remove', itemName } : { type: 'unknown' };
  }

  if (looksLikeUnsupportedCommand(text)) {
    return { type: 'unknown' };
  }

  return {
    type: 'add',
    itemName: text,
  };
}

function cleanupItemName(value: string): string {
  return value
    .replace(/(^|[\s,]+)пожалуйста(?=[\s,.!?;:]|$)[\s,]*/giu, ' ')
    .replace(/^[\s,.!?;:]+|[\s,.!?;:]+$/gu, '');
}

function looksLikeUnsupportedCommand(value: string): boolean {
  return /^(?:что|как|где|когда|почему|зачем|покажи|открой|очисти|сбрось)(?:\s|$)/iu.test(value);
}
