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
    untangle(content: string, appliedConversions: Array<{
        from: number | string;
        to: number | string;
    }>): string;
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
export declare class CodepageConverterImpl implements CodepageConverter {
    decodeBytes(bytes: Uint8Array | number[], ccsid: number): string;
    encodeString(text: string, ccsid: number): Uint8Array;
    convertTo(content: string | Uint8Array | number[], dest: number | string, src?: number | string): string;
    toAscii(content: string | Uint8Array | number[]): string;
    toEbcdic(content: string | Uint8Array | number[]): string;
    untangle(content: string, appliedConversions: Array<{
        from: number | string;
        to: number | string;
    }>): string;
    getSupportedCodepages(): number[];
    isSupportedCodepage(ccsid: number): boolean;
    isMixedDbcsCcsid(ccsid: number | string): boolean;
    decodeDbcs(bytes: Uint8Array | number[], ccsid: number | string): string;
    encodeDbcs(text: string, ccsid: number | string): Uint8Array;
}
/** Singleton instance, exposed as ZoweZLUX.codepageConverter at runtime. */
export declare const codepageConverter: CodepageConverter;
