export interface DbcsEntry {
    /** SBCS decode table: index = raw byte, value = Unicode codepoint. */
    sbcs: Uint16Array;
    /** Sorted 2-byte DBCS keys (high byte << 8 | low byte). */
    keys: Uint16Array;
    /** Unicode codepoints parallel to keys. */
    vals: Uint16Array;
}
/** Mixed EBCDIC_STATEFUL DBCS tables, keyed by IBM CCSID number. */
export declare const dbcsTables: Record<number, DbcsEntry>;
