export type Chunk = {
  id: number;
  text: string;
  token_count?: number;
  sentence_count?: number;
  start_pos?: number;
  end_pos?: number;
};

export class TextChunker {
  private chunkSize: number;
  private overlap: number;

  constructor(chunkSize: number = 1000, overlap: number = 200) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  chunkBySentences(text: string, maxChunkSize?: number): Chunk[] {
    const limit = maxChunkSize ?? this.chunkSize;
    const sentences = text.replace(/!/g, ".").replace(/\?/g, ".").split(".").map(s => s.trim()).filter(Boolean);
    const chunks: Chunk[] = [];
    let current: string[] = [];
    let size = 0;
    let id = 0;

    for (const sentence of sentences) {
      const sentSize = sentence.split(/\s+/).length;
      if (size + sentSize > limit && current.length) {
        chunks.push({ id, text: current.join('. ') + '.', sentence_count: current.length, token_count: size });
        id += 1;
        if (this.overlap > 0 && current.length > 1) {
          current = current.slice(-1);
          size = current[0].split(/\s+/).length;
        } else {
          current = [];
          size = 0;
        }
      }
      current.push(sentence);
      size += sentSize;
    }
    if (current.length) {
      chunks.push({ id, text: current.join('. ') + '.', sentence_count: current.length, token_count: size });
    }
    return chunks;
  }
}

