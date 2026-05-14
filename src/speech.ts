export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

interface CompleteRecognitionOptions {
  handleTranscript(transcript: string): void;
  stopRecognition(): void;
}

export function completeRecognitionResult(results: SpeechRecognitionResultListLike, options: CompleteRecognitionOptions): void {
  const transcript = getTranscript(results);

  options.handleTranscript(transcript);
  options.stopRecognition();
}

export function getTranscript(results: SpeechRecognitionResultListLike): string {
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
