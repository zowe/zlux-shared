
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { ccsidTables } from './ccsid-tables';
import { dbcsTables, DbcsEntry } from './dbcs-ccsid-tables';

// String aliases for commonly used codepages.
// Every EBCDIC CCSID has an 'ibm-<N>' alias per IBM naming conventions.
const CODEPAGE_ALIASES: Readonly<Record<string, number>> = {
  // ---- Named aliases ----
  'ebcdic':       1047,
  'ebcdic-1047':  1047,
  'ascii':        819,
  'latin-1':      819,
  'latin1':       819,
  'iso-8859-1':   819,

  // ---- EBCDIC: ibm-<N> aliases (all single-byte EBCDIC CCSIDs in tables) ----
  // Classic national/regional code pages
  'ibm-37':    37,   // USA, Canada, Australia, New Zealand, Portugal, Brazil, South Africa
  'ibm-273':   273,  // Austria, Germany
  'ibm-274':   274,  // Belgium
  'ibm-275':   275,  // Brazil
  'ibm-277':   277,  // Denmark, Norway
  'ibm-278':   278,  // Finland, Sweden
  'ibm-280':   280,  // Italy
  'ibm-282':   282,  // Portugal
  'ibm-284':   284,  // Latin America, Spain
  'ibm-285':   285,  // Ireland, United Kingdom
  'ibm-290':   290,  // Japanese Katakana (single-byte)
  'ibm-297':   297,  // France
  'ibm-420':   420,  // Arabic
  'ibm-424':   424,  // Hebrew
  'ibm-425':   425,  // Arabic (extended)
  'ibm-500':   500,  // International
  'ibm-833':   833,  // Korean (single-byte)
  'ibm-838':   838,  // Thai
  'ibm-870':   870,  // Latin-2 (Central Europe)
  'ibm-871':   871,  // Iceland
  'ibm-875':   875,  // Greek
  'ibm-880':   880,  // Cyrillic
  // Open Systems / euro-update
  'ibm-924':   924,  // Latin-1 with Euro (Open Systems, 1047 euro update)
  'ibm-1025':  1025, // Cyrillic
  'ibm-1026':  1026, // Turkish
  'ibm-1027':  1027, // Japanese Latin (single-byte)
  'ibm-1047':  1047, // Open Systems (MVS C compiler)
  'ibm-1112':  1112, // Baltic
  'ibm-1122':  1122, // Estonian
  'ibm-1123':  1123, // Ukrainian
  // Euro-update code pages (base → euro: 037→1140, 273→1141, … 1047→924)
  'ibm-1140':  1140, // USA/Canada + Euro
  'ibm-1141':  1141, // Austria/Germany + Euro
  'ibm-1142':  1142, // Denmark/Norway + Euro
  'ibm-1143':  1143, // Finland/Sweden + Euro
  'ibm-1144':  1144, // Italy + Euro
  'ibm-1145':  1145, // Latin America/Spain + Euro
  'ibm-1146':  1146, // Ireland/UK + Euro
  'ibm-1147':  1147, // France + Euro
  'ibm-1148':  1148, // International + Euro
  'ibm-1149':  1149, // Iceland + Euro
  // Further euro/extended regional updates
  'ibm-1153':  1153, // Latin-2 + Euro (870 update)
  'ibm-1154':  1154, // Cyrillic + Euro (1025 update)
  'ibm-1155':  1155, // Turkish + Euro (1026 update)
  'ibm-1156':  1156, // Baltic + Euro (1112 update)
  'ibm-1157':  1157, // Estonian + Euro (1122 update)
  'ibm-1158':  1158, // Ukrainian + Euro (1123 update)
  'ibm-1159':  1159, // Korean + Euro (833 update)
  'ibm-1160':  1160, // Thai + Euro (838 update)
  'ibm-1165':  1165, // Vietnamese
  // Specialised / large CCSID numbers
  'ibm-4971':  4971, // Arabic (ISO-8 based EBCDIC)
  'ibm-5123':  5123, // Japanese Katakana + Euro (290 update)
  'ibm-8482':  8482, // Japanese Latin + Euro (1027 update)
  'ibm-12712': 12712, // Hebrew (bidirectional) + Euro
  'ibm-28709': 28709, // Traditional Chinese (single-byte)

  // ---- Unicode encodings (handled natively via TextDecoder/TextEncoder) ----
  'utf-8':    1208, // Unicode UTF-8
  'utf8':     1208,
  'utf-16':   1200, // Unicode UTF-16 big-endian
  'utf16':    1200,
  'utf-16be': 1200,
  'utf16be':  1200,
  'ucs-2':    1200,
  'ucs2':     1200,
  'utf-16le': 1202, // Unicode UTF-16 little-endian
  'utf16le':  1202,

  // ---- DBCS mixed (EBCDIC_STATEFUL) code pages ----
  'ibm-930':                   930,  // Japan MIX (290 Katakana + DBCS kanji)
  'japanese-ebcdic':           930,  // Alias for IBM-930
  'ibm-933':                   933,  // Korea MIX
  'korean-ebcdic':             933,  // Alias for IBM-933
  'ibm-935':                   935,  // Simplified Chinese MIX
  'simplified-chinese-ebcdic': 935,  // Alias for IBM-935
  'ibm-937':                   937,  // Traditional Chinese MIX
  'traditional-chinese-ebcdic':937,  // Alias for IBM-937
  'ibm-939':                   939,  // Japan MIX (1027 Latin + DBCS kanji)
  'japanese-latin-ebcdic':     939,  // Alias for IBM-939
  'ibm-1364':                  1364, // Korea MIX + Euro
  'ibm-1371':                  1371, // Traditional Chinese MIX + Euro
  'ibm-1388':                  1388, // Simplified Chinese MIX + Euro
  'ibm-1390':                  1390, // Japan MIX + Euro (930 variant)
  'ibm-1399':                  1399, // Japan MIX + Euro (939 variant)
};

function _resolveCodepage(id: number | string): number {
  if (typeof id === 'number') { return id; }
  const lower = id.toLowerCase();
  if (lower in CODEPAGE_ALIASES) { return CODEPAGE_ALIASES[lower]; }
  const n = Number(id);
  if (isNaN(n)) { throw new Error(`Unknown codepage identifier: "${id}"`); }
  return n;
}

// Lazily-computed encode tables: unicode codepoint -> byte value.
// Built on first use for each CCSID.
const _encodeTables: Record<number, Map<number, number>> = {};

// Lazily-computed DBCS encode tables: unicode codepoint -> 2-byte packed key.
// Built on first use for each mixed CCSID.
const _dbcsEncodeTables: Record<number, Map<number, number>> = {};

// Unicode CCSIDs handled natively via TextDecoder/TextEncoder.
const UNICODE_CCSID_ENCODING: Readonly<Record<number, string>> = {
  1200: 'utf-16be', // UTF-16 big-endian
  1202: 'utf-16le', // UTF-16 little-endian
  1208: 'utf-8',    // UTF-8
};

function getEncodeTable(ccsid: number): Map<number, number> | undefined {
  const decode = ccsidTables[ccsid];
  if (!decode) { return undefined; }
  if (!_encodeTables[ccsid]) {
    const m = new Map<number, number>();
    for (let b = 0; b < 256; b++) {
      const cp = decode[b];
      if (cp !== 0xFFFD && !m.has(cp)) { m.set(cp, b); }
    }
    _encodeTables[ccsid] = m;
  }
  return _encodeTables[ccsid];
}

function getDbcsEncodeTable(ccsid: number): Map<number, number> {
  if (!_dbcsEncodeTables[ccsid]) {
    const entry = dbcsTables[ccsid];
    const m = new Map<number, number>();
    for (let i = 0; i < entry.keys.length; i++) {
      const cp = entry.vals[i];
      if (!m.has(cp)) { m.set(cp, entry.keys[i]); }
    }
    _dbcsEncodeTables[ccsid] = m;
  }
  return _dbcsEncodeTables[ccsid];
}

/** Binary-search decode of a 2-byte DBCS key. Returns U+FFFD if not found. */
function dbcsDecode(entry: DbcsEntry, key: number): number {
  let lo = 0, hi = entry.keys.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const k = entry.keys[mid];
    if (k === key) { return entry.vals[mid]; }
    if (k < key) { lo = mid + 1; } else { hi = mid - 1; }
  }
  return 0xFFFD;
}

/**
 * Interface for codepage (CCSID) conversion utilities, available at runtime
 * as ZoweZLUX.codepageConverter.
 *
 * All single-byte codepages listed in ccsidTables are supported.
 * Input and output strings use the JS binary-string idiom: each character's
 * code point equals the raw byte value (0–255) in the relevant codepage.
 */
export interface CodepageConverter {
  /**
   * Convert content from one codepage to another.
   * Returns a binary JS string where each char's code point is the
   * destination-codepage byte value.
   *
   * @param content  Source bytes as Uint8Array, number[], or binary JS string.
   * @param dest     Destination codepage (number or alias such as 'ascii', 'ebcdic').
   * @param src      Source codepage. Defaults to 1047 (EBCDIC Open Systems).
   */
  convertTo(content: string | Uint8Array | number[], dest: number | string, src?: number | string): string;

  /** Convert EBCDIC-1047 bytes to ISO-8859-1 / ASCII. */
  toAscii(content: string | Uint8Array | number[]): string;

  /** Convert ISO-8859-1 / ASCII bytes to EBCDIC-1047. */
  toEbcdic(content: string | Uint8Array | number[]): string;

  /**
   * Undo a chain of mistakenly applied codepage conversions.
   *
   * Each entry describes one conversion that was wrongly applied:
   *   { from: originalCodepage, to: wronglyAppliedCodepage }
   *
   * Example — content was EBCDIC-1047 but decoded as Latin-1 (819):
   *   untangle(garbled, [{ from: 1047, to: 819 }])
   *
   * Multiple steps are undone in the order listed.
   */
  untangle(content: string, appliedConversions: Array<{ from: number | string; to: number | string }>): string;

  /**
   * Decode raw bytes to a JS string using the given single-byte codepage.
   * Unmapped bytes become U+FFFD. Unknown codepage falls back to Latin-1.
   */
  decodeBytes(bytes: Uint8Array | number[], ccsid: number): string;

  /**
   * Encode a JS string to bytes using the given single-byte codepage.
   * Characters with no mapping become the codepage's substitute byte
   * (0x3F '?' for ASCII-family, 0x6F '?' for EBCDIC-family).
   */
  encodeString(text: string, ccsid: number): Uint8Array;

  /** Returns all codepage numbers for which single-byte tables are available. */
  getSupportedCodepages(): number[];

  /** Returns true if the given codepage has a single-byte table available. */
  isSupportedCodepage(ccsid: number): boolean;

  /**
   * Returns true if the given CCSID is a mixed DBCS (EBCDIC_STATEFUL) code page
   * that uses SO (0x0E) / SI (0x0F) shift bytes to switch between SBCS and DBCS modes.
   */
  isMixedDbcsCcsid(ccsid: number | string): boolean;

  /**
   * Decode a byte sequence that may contain DBCS (double-byte) characters.
   * Handles SO (0x0E) / SI (0x0F) shift bytes for EBCDIC_STATEFUL mixed code pages.
   * For non-DBCS CCSIDs, falls back to decodeBytes().
   *
   * @param bytes  Source bytes (Uint8Array or number[])
   * @param ccsid  Mixed DBCS CCSID number or alias (e.g. 930, 'ibm-930')
   */
  decodeDbcs(bytes: Uint8Array | number[], ccsid: number | string): string;

  /**
   * Encode a Unicode string to a mixed DBCS byte sequence.
   * Characters that map to the SBCS portion are encoded without SO/SI.
   * Characters that require DBCS are wrapped in SO (0x0E) ... SI (0x0F).
   * For non-DBCS CCSIDs, falls back to encodeString().
   *
   * @param text   Source string
   * @param ccsid  Mixed DBCS CCSID number or alias
   */
  encodeDbcs(text: string, ccsid: number | string): Uint8Array;
}

export class CodepageConverterImpl implements CodepageConverter {

  decodeBytes(bytes: Uint8Array | number[], ccsid: number): string {
    const unicodeEncoding = UNICODE_CCSID_ENCODING[ccsid];
    if (unicodeEncoding) {
      const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as number[]);
      return new TextDecoder(unicodeEncoding).decode(buf);
    }
    const table = ccsidTables[ccsid];
    if (!table) {
      // Unknown CCSID — fall back to Latin-1 (ISO-8859-1) identity mapping
      return Array.from(bytes as number[]).map(b => String.fromCharCode(b)).join('');
    }
    const chars: string[] = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      chars[i] = String.fromCharCode(table[(bytes as Uint8Array)[i]]);
    }
    return chars.join('');
  }

  encodeString(text: string, ccsid: number): Uint8Array {
    if (ccsid === 1208) { return new TextEncoder().encode(text); }
    if (ccsid === 1200) {
      const out = new Uint8Array(text.length * 2);
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        out[i * 2]     = (c >>> 8) & 0xFF;
        out[i * 2 + 1] = c & 0xFF;
      }
      return out;
    }
    if (ccsid === 1202) {
      const out = new Uint8Array(text.length * 2);
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        out[i * 2]     = c & 0xFF;
        out[i * 2 + 1] = (c >>> 8) & 0xFF;
      }
      return out;
    }
    const enc = getEncodeTable(ccsid);
    const out = new Uint8Array(text.length);
    // Pick a reasonable substitute byte: '?' in ASCII (0x3F) or EBCDIC (0x6F)
    const sub = enc ? (enc.get(0x003F) ?? (enc.get(0x006F) ?? 0x3F)) : 0x3F;
    for (let i = 0; i < text.length; i++) {
      const cp = text.charCodeAt(i);
      out[i] = enc ? (enc.get(cp) ?? sub) : (cp < 256 ? cp : sub);
    }
    return out;
  }

  convertTo(content: string | Uint8Array | number[], dest: number | string, src: number | string = 1047): string {
    const srcId = _resolveCodepage(src);
    const destId = _resolveCodepage(dest);

    // Normalise input to a byte array
    let srcBytes: Uint8Array | number[];
    if (typeof content === 'string') {
      // Binary string idiom: each char's code point IS the source byte value
      const arr = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) {
        arr[i] = content.charCodeAt(i) & 0xFF;
      }
      srcBytes = arr;
    } else {
      srcBytes = content;
    }

    // src bytes → Unicode → dest bytes → binary string
    const unicode = this.decodeBytes(srcBytes, srcId);
    const destBytes = this.encodeString(unicode, destId);
    return Array.from(destBytes).map(b => String.fromCharCode(b)).join('');
  }

  toAscii(content: string | Uint8Array | number[]): string {
    return this.convertTo(content, 819, 1047);
  }

  toEbcdic(content: string | Uint8Array | number[]): string {
    return this.convertTo(content, 1047, 819);
  }

  untangle(content: string, appliedConversions: Array<{ from: number | string; to: number | string }>): string {
    let str = content;
    for (const step of appliedConversions) {
      const fromId = _resolveCodepage(step.from);
      const toId   = _resolveCodepage(step.to);
      // Reverse the mis-applied conversion: encode back to 'to' bytes, decode properly using 'from'
      str = this.decodeBytes(this.encodeString(str, toId), fromId);
    }
    return str;
  }

  getSupportedCodepages(): number[] {
    const sbcs = Object.keys(ccsidTables).map(Number);
    const dbcs = Object.keys(dbcsTables).map(Number);
    const unicode = Object.keys(UNICODE_CCSID_ENCODING).map(Number);
    return Array.from(new Set([...sbcs, ...dbcs, ...unicode])).sort((a, b) => a - b);
  }

  isSupportedCodepage(ccsid: number): boolean {
    return ccsid in ccsidTables || ccsid in dbcsTables || ccsid in UNICODE_CCSID_ENCODING;
  }

  isMixedDbcsCcsid(ccsid: number | string): boolean {
    return _resolveCodepage(ccsid) in dbcsTables;
  }

  decodeDbcs(bytes: Uint8Array | number[], ccsid: number | string): string {
    const id = _resolveCodepage(ccsid);
    const entry = dbcsTables[id];
    if (!entry) {
      // Not a mixed DBCS page — fall back to SBCS decode
      return this.decodeBytes(bytes as Uint8Array, id);
    }

    const SO = 0x0E, SI = 0x0F;
    const chars: string[] = [];
    let i = 0;
    let dbcsMode = false;
    const src = bytes as Uint8Array;

    while (i < src.length) {
      const b = src[i];
      if (b === SO) {
        dbcsMode = true;
        i++;
      } else if (b === SI) {
        dbcsMode = false;
        i++;
      } else if (dbcsMode) {
        // Consume two bytes as one DBCS character
        if (i + 1 < src.length) {
          const key = (b << 8) | src[i + 1];
          chars.push(String.fromCharCode(dbcsDecode(entry, key)));
          i += 2;
        } else {
          // Incomplete DBCS pair at end of input
          chars.push('\uFFFD');
          i++;
        }
      } else {
        chars.push(String.fromCharCode(entry.sbcs[b]));
        i++;
      }
    }
    return chars.join('');
  }

  encodeDbcs(text: string, ccsid: number | string): Uint8Array {
    const id = _resolveCodepage(ccsid);
    const entry = dbcsTables[id];
    if (!entry) {
      // Not a mixed DBCS page — fall back to SBCS encode
      return this.encodeString(text, id);
    }

    const SO = 0x0E, SI = 0x0F;
    const dbcsEnc = getDbcsEncodeTable(id);

    // Build a reverse SBCS lookup: unicode -> byte
    const sbcsEnc = new Map<number, number>();
    for (let b = 0; b < 256; b++) {
      const cp = entry.sbcs[b];
      if (cp !== 0xFFFD && !sbcsEnc.has(cp)) { sbcsEnc.set(cp, b); }
    }

    const out: number[] = [];
    let inDbcs = false;

    for (let i = 0; i < text.length; i++) {
      const cp = text.charCodeAt(i);

      // Prefer SBCS if available (shorter encoding, no SO/SI overhead)
      const sbcsByte = sbcsEnc.get(cp);
      if (sbcsByte !== undefined) {
        if (inDbcs) {
          out.push(SI);
          inDbcs = false;
        }
        out.push(sbcsByte);
        continue;
      }

      // Try DBCS
      const dbcsKey = dbcsEnc.get(cp);
      if (dbcsKey !== undefined) {
        if (!inDbcs) {
          out.push(SO);
          inDbcs = true;
        }
        out.push(dbcsKey >> 8, dbcsKey & 0xFF);
        continue;
      }

      // Unmappable character — use DBCS substitute 0xFE 0xFE
      if (!inDbcs) {
        out.push(SO);
        inDbcs = true;
      }
      out.push(0xFE, 0xFE);
    }

    if (inDbcs) { out.push(SI); }
    return new Uint8Array(out);
  }
}

/** Singleton instance, exposed as ZoweZLUX.codepageConverter at runtime. */
export const codepageConverter: CodepageConverter = new CodepageConverterImpl();
