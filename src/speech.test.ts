import { describe, expect, it, vi } from 'vitest';

import { completeRecognitionResult, type SpeechRecognitionResultListLike } from './speech';

const resultList = (transcript: string): SpeechRecognitionResultListLike => ({
  length: 1,
  item: () => ({
    isFinal: true,
    length: 1,
    item: () => ({ transcript }),
    0: { transcript },
  }),
  0: {
    isFinal: true,
    length: 1,
    item: () => ({ transcript }),
    0: { transcript },
  },
});

describe('completeRecognitionResult', () => {
  it('handles the transcript and stops recognition after a result', () => {
    const handleTranscript = vi.fn();
    const stopRecognition = vi.fn();

    completeRecognitionResult(resultList('добавь хлеб'), {
      handleTranscript,
      stopRecognition,
    });

    expect(handleTranscript).toHaveBeenCalledWith('добавь хлеб');
    expect(stopRecognition).toHaveBeenCalledOnce();
  });
});
