/**
 * Map from CCSID number to a 256-entry decoding table.
 * Index = raw byte value (0–255), value = Unicode code point.
 */
export declare const ccsidTables: Readonly<Record<number, Uint16Array>>;
