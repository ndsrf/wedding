/**
 * Pure text chunking utility.
 * Splits raw text into overlapping chunks respecting word boundaries.
 */

export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 100
): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end >= text.length) {
      // Last chunk: take the rest
      chunks.push(text.slice(start));
      break;
    }

    // Walk back to the nearest word boundary so we don't cut mid-word
    let boundary = end;
    while (boundary > start && !/\s/.test(text[boundary])) {
      boundary--;
    }
    // Use the boundary if we found whitespace; otherwise cut at chunkSize
    if (boundary > start) {
      end = boundary;
    }

    chunks.push(text.slice(start, end));

    // Advance, but always move forward by at least 1 to avoid infinite loops
    const next = end - overlap;
    start = next > start ? next : start + 1;
  }

  return chunks;
}
