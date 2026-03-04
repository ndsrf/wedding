/**
 * Minimal ZIP file creator and parser
 *
 * Implements a subset of the ZIP format specification (PKWARE APPNOTE.TXT)
 * using only Node.js built-in modules (zlib for DEFLATE compression).
 *
 * Supports:
 * - DEFLATE compression (method 8) for writes
 * - STORE (method 0) and DEFLATE (method 8) for reads
 * - UTF-8 filenames
 */

import { deflateRawSync, inflateRawSync } from 'zlib';

// ============================================================================
// CRC-32
// ============================================================================

/** Pre-computed CRC-32 lookup table */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ============================================================================
// DOS date/time helpers
// ============================================================================

function toDosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

// ============================================================================
// ZIP writer
// ============================================================================

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Creates a ZIP archive buffer from an array of entries.
 * Uses DEFLATE compression for each entry.
 *
 * @param entries - Array of {name, data} objects
 * @returns Buffer containing the complete ZIP archive
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralDirParts: Buffer[] = [];
  let localOffset = 0;

  const { time: dosTime, date: dosDate } = toDosDateTime(new Date());

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const checksum = crc32(entry.data);
    const compressed = deflateRawSync(entry.data, { level: 6 });
    const uncompressedSize = entry.data.length;
    const compressedSize = compressed.length;

    // --- Local file header (30 bytes + filename) ---
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);  // Local file header signature
    local.writeUInt16LE(20, 4);           // Version needed to extract (2.0)
    local.writeUInt16LE(0x0800, 6);       // General purpose bit flag (UTF-8)
    local.writeUInt16LE(8, 8);            // Compression method: DEFLATE
    local.writeUInt16LE(dosTime, 10);     // Last mod file time
    local.writeUInt16LE(dosDate, 12);     // Last mod file date
    local.writeUInt32LE(checksum, 14);    // CRC-32
    local.writeUInt32LE(compressedSize, 18);   // Compressed size
    local.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);   // Filename length
    local.writeUInt16LE(0, 28);                // Extra field length
    nameBuf.copy(local, 30);

    // --- Central directory entry (46 bytes + filename) ---
    const cdEntry = Buffer.alloc(46 + nameBuf.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);  // Central directory signature
    cdEntry.writeUInt16LE(20, 4);           // Version made by
    cdEntry.writeUInt16LE(20, 6);           // Version needed
    cdEntry.writeUInt16LE(0x0800, 8);       // General purpose bit flag (UTF-8)
    cdEntry.writeUInt16LE(8, 10);           // Compression method: DEFLATE
    cdEntry.writeUInt16LE(dosTime, 12);     // Last mod file time
    cdEntry.writeUInt16LE(dosDate, 14);     // Last mod file date
    cdEntry.writeUInt32LE(checksum, 16);    // CRC-32
    cdEntry.writeUInt32LE(compressedSize, 20);   // Compressed size
    cdEntry.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    cdEntry.writeUInt16LE(nameBuf.length, 28);   // Filename length
    cdEntry.writeUInt16LE(0, 30);                // Extra field length
    cdEntry.writeUInt16LE(0, 32);                // File comment length
    cdEntry.writeUInt16LE(0, 34);                // Disk number start
    cdEntry.writeUInt16LE(0, 36);                // Internal file attributes
    cdEntry.writeUInt32LE(0, 38);                // External file attributes
    cdEntry.writeUInt32LE(localOffset, 42);      // Relative offset of local header
    nameBuf.copy(cdEntry, 46);

    localParts.push(local, compressed);
    centralDirParts.push(cdEntry);
    localOffset += local.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralDirParts);

  // --- End of central directory record (22 bytes) ---
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);         // End of central directory signature
  eocd.writeUInt16LE(0, 4);                   // Number of this disk
  eocd.writeUInt16LE(0, 6);                   // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8);      // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10);     // Total number of central directory records
  eocd.writeUInt32LE(centralDir.length, 12);  // Size of central directory
  eocd.writeUInt32LE(localOffset, 16);        // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([...localParts, centralDir, eocd]);
}

// ============================================================================
// ZIP reader
// ============================================================================

/**
 * Parses a ZIP archive buffer and returns a Map of filename -> Buffer.
 * Supports STORE (no compression) and DEFLATE.
 *
 * @param zipBuf - Buffer containing the ZIP archive
 * @returns Map of filename to file content buffer
 */
export function parseZip(zipBuf: Buffer): Map<string, Buffer> {
  const result = new Map<string, Buffer>();

  // Locate End of Central Directory (EOCD) record by scanning from the end
  let eocdOffset = -1;
  // The minimum size of a ZIP file is 22 bytes (EOCD only, no files)
  const searchStart = Math.max(0, zipBuf.length - 65558); // 22 + 65535 (max comment)
  for (let i = zipBuf.length - 22; i >= searchStart; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP: end of central directory record not found');
  }

  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuf.readUInt32LE(eocdOffset + 16);

  let pos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (zipBuf.readUInt32LE(pos) !== 0x02014b50) {
      throw new Error(`Invalid ZIP: central directory signature mismatch at offset ${pos}`);
    }

    const compressionMethod = zipBuf.readUInt16LE(pos + 10);
    const compressedSize = zipBuf.readUInt32LE(pos + 20);
    const nameLength = zipBuf.readUInt16LE(pos + 28);
    const extraLength = zipBuf.readUInt16LE(pos + 30);
    const commentLength = zipBuf.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(pos + 42);

    const name = zipBuf.toString('utf8', pos + 46, pos + 46 + nameLength);

    // Read from local file header to get data offset
    const localNameLength = zipBuf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zipBuf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;

    const compressedData = zipBuf.subarray(dataOffset, dataOffset + compressedSize);

    let data: Buffer;
    if (compressionMethod === 0) {
      // STORE - no compression
      data = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      // DEFLATE
      data = inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }

    result.set(name, data);

    // Advance to next central directory entry
    pos += 46 + nameLength + extraLength + commentLength;
  }

  return result;
}
