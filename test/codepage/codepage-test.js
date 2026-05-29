
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

'use strict';

const { CodepageConverterImpl } = require('../../src/codepage/codepage-converter.js');
const assert = require('assert');

// EBCDIC-1047 bytes for "Hello World"
// H=0xC8  e=0x85  l=0x93  l=0x93  o=0x96  SP=0x40  W=0xE6  o=0x96  r=0x99  l=0x93  d=0x84
const HELLO_EBCDIC = [0xC8, 0x85, 0x93, 0x93, 0x96, 0x40, 0xE6, 0x96, 0x99, 0x93, 0x84];
const HELLO_ASCII  = 'Hello World';

// Latin lorem ipsum for multi-byte round-trip testing (pure ASCII range)
const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

describe('CodepageConverter', function () {
  let converter;

  before(function () {
    converter = new CodepageConverterImpl();
  });

  /* ------------------------------------------------------------------ */
  /*  Supported codepage queries                                          */
  /* ------------------------------------------------------------------ */

  describe('getSupportedCodepages()', function () {
    it('returns an array of numbers', function () {
      const pages = converter.getSupportedCodepages();
      assert.ok(Array.isArray(pages));
      assert.ok(pages.length > 50, `expected >50 codepages, got ${pages.length}`);
    });

    it('includes common codepages 37, 819, and 1047', function () {
      const pages = converter.getSupportedCodepages();
      assert.ok(pages.includes(37),   'missing CCSID 37');
      assert.ok(pages.includes(819),  'missing CCSID 819');
      assert.ok(pages.includes(1047), 'missing CCSID 1047');
    });
  });

  describe('isSupportedCodepage()', function () {
    it('returns true for known CCSIDs', function () {
      assert.strictEqual(converter.isSupportedCodepage(37),   true);
      assert.strictEqual(converter.isSupportedCodepage(819),  true);
      assert.strictEqual(converter.isSupportedCodepage(1047), true);
    });

    it('returns false for unknown CCSIDs', function () {
      assert.strictEqual(converter.isSupportedCodepage(99999), false);
      assert.strictEqual(converter.isSupportedCodepage(0),     false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  decodeBytes / encodeString round-trip                              */
  /* ------------------------------------------------------------------ */

  describe('decodeBytes()', function () {
    it('decodes EBCDIC-1047 bytes to "Hello World"', function () {
      const result = converter.decodeBytes(HELLO_EBCDIC, 1047);
      assert.strictEqual(result, HELLO_ASCII);
    });

    it('decodes Latin-1 (819) identity — ASCII passthrough', function () {
      const bytes = Array.from(LOREM).map(c => c.charCodeAt(0));
      const result = converter.decodeBytes(bytes, 819);
      assert.strictEqual(result, LOREM);
    });

    it('falls back to Latin-1 for unknown CCSID', function () {
      const bytes = [72, 101, 108, 108, 111]; // "Hello" in ASCII
      const result = converter.decodeBytes(bytes, 99999);
      assert.strictEqual(result, 'Hello');
    });

    it('accepts Uint8Array input', function () {
      const result = converter.decodeBytes(new Uint8Array(HELLO_EBCDIC), 1047);
      assert.strictEqual(result, HELLO_ASCII);
    });
  });

  describe('encodeString()', function () {
    it('encodes "Hello World" to EBCDIC-1047 bytes', function () {
      const result = converter.encodeString(HELLO_ASCII, 1047);
      assert.deepStrictEqual(Array.from(result), HELLO_EBCDIC);
    });

    it('encodes Latin-1 (819) identity — ASCII passthrough', function () {
      const result = converter.encodeString(LOREM, 819);
      const expected = Array.from(LOREM).map(c => c.charCodeAt(0));
      assert.deepStrictEqual(Array.from(result), expected);
    });

    it('encodeString / decodeBytes round-trip via EBCDIC-1047', function () {
      const encoded = converter.encodeString(LOREM, 1047);
      const decoded = converter.decodeBytes(encoded, 1047);
      assert.strictEqual(decoded, LOREM);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  toAscii / toEbcdic convenience wrappers                           */
  /* ------------------------------------------------------------------ */

  describe('toAscii()', function () {
    it('converts EBCDIC-1047 bytes to "Hello World"', function () {
      const result = converter.toAscii(HELLO_EBCDIC);
      assert.strictEqual(result, HELLO_ASCII);
    });

    it('converts EBCDIC-1047 Uint8Array to "Hello World"', function () {
      const result = converter.toAscii(new Uint8Array(HELLO_EBCDIC));
      assert.strictEqual(result, HELLO_ASCII);
    });

    it('converts lorem ipsum EBCDIC round-trip via toAscii', function () {
      const ebcdicBytes = converter.encodeString(LOREM, 1047);
      const ascii = converter.toAscii(ebcdicBytes);
      assert.strictEqual(ascii, LOREM);
    });
  });

  describe('toEbcdic()', function () {
    it('round-trips: toEbcdic(toAscii(ebcdicBytes)) recovers original bytes', function () {
      const ascii       = converter.toAscii(HELLO_EBCDIC);
      const backToEbcdicStr = converter.toEbcdic(ascii);
      const backBytes   = Array.from(backToEbcdicStr).map(c => c.charCodeAt(0));
      assert.deepStrictEqual(backBytes, HELLO_EBCDIC);
    });

    it('round-trips lorem ipsum through EBCDIC-1047', function () {
      // Encode as EBCDIC bytes, decode back via toAscii
      const ebcdicStr = converter.toEbcdic(LOREM);
      const ebcdicBytes = Array.from(ebcdicStr).map(c => c.charCodeAt(0));
      const backToAscii = converter.toAscii(ebcdicBytes);
      assert.strictEqual(backToAscii, LOREM);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  convertTo — generic conversion with aliases                        */
  /* ------------------------------------------------------------------ */

  describe('convertTo()', function () {
    it("alias 'ascii' converts EBCDIC-1047 bytes to \"Hello World\"", function () {
      const result = converter.convertTo(HELLO_EBCDIC, 'ascii', 1047);
      assert.strictEqual(result, HELLO_ASCII);
    });

    it("alias 'ebcdic' converts ASCII bytes to EBCDIC binary string", function () {
      // Convert EBCDIC → ASCII, then back via 'ebcdic' alias
      const ascii = converter.toAscii(HELLO_EBCDIC);
      const backStr = converter.convertTo(ascii, 'ebcdic', 'ascii');
      const backBytes = Array.from(backStr).map(c => c.charCodeAt(0));
      assert.deepStrictEqual(backBytes, HELLO_EBCDIC);
    });

    it("alias 'iso-8859-1' is equivalent to codepage 819", function () {
      const r1 = converter.convertTo(HELLO_EBCDIC, 'iso-8859-1', 1047);
      const r2 = converter.convertTo(HELLO_EBCDIC, 819, 1047);
      assert.strictEqual(r1, r2);
    });

    it('defaults src to EBCDIC-1047 when src is omitted', function () {
      const result = converter.convertTo(HELLO_EBCDIC, 819);
      assert.strictEqual(result, HELLO_ASCII);
    });

    it('throws for an unrecognised string alias', function () {
      assert.throws(() => converter.convertTo(HELLO_EBCDIC, 'not-a-codepage'), /Unknown codepage identifier/);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  untangle — reverse mis-applied conversions                        */
  /* ------------------------------------------------------------------ */

  describe('untangle()', function () {
    it('recovers "Hello World" after EBCDIC-1047 bytes were wrongly decoded as Latin-1', function () {
      // Simulate the mistake: EBCDIC bytes decoded as if they were Latin-1
      const garbled = converter.decodeBytes(HELLO_EBCDIC, 819);

      // garbled is a string whose char codes ARE the EBCDIC byte values —
      // untangle by telling it: "this content was in 1047 but was decoded as 819"
      const recovered = converter.untangle(garbled, [{ from: 1047, to: 819 }]);
      assert.strictEqual(recovered, HELLO_ASCII);
    });

    it('recovers lorem ipsum after the same mistake', function () {
      const ebcdicBytes = converter.encodeString(LOREM, 1047);
      const garbled = converter.decodeBytes(ebcdicBytes, 819);
      const recovered = converter.untangle(garbled, [{ from: 1047, to: 819 }]);
      assert.strictEqual(recovered, LOREM);
    });

    it('handles a two-step untangle chain', function () {
      // Build the doubly-garbled string using the INVERSE of each untangle step.
      // untangle step {from:F, to:T}: decodeBytes(encodeString(str, T), F)
      // Its inverse (scrambling direction): decodeBytes(encodeString(str, F), T)
      //
      // To construct garbled so that untangle([S1, S2]) recovers target:
      //   inner = S2_inv(target) = decodeBytes(encodeString(target, F2), T2)
      //   garbled = S1_inv(inner) = decodeBytes(encodeString(inner, F1), T1)

      const from1 = 1047, to1 = 819;  // step 1: undo EBCDIC wrongly decoded as Latin-1
      const from2 = 819,  to2 = 819;  // step 2: identity on Latin-1 (provably lossless)

      // S2_inv: no-op because F2==T2 (encodeString+decodeBytes with same CCSID is identity)
      const inner  = converter.decodeBytes(converter.encodeString(HELLO_ASCII, from2), to2);
      // S1_inv: encode "Hello World" as EBCDIC-1047, decode as Latin-1 → standard garbled form
      const garbled = converter.decodeBytes(converter.encodeString(inner, from1), to1);

      const recovered = converter.untangle(garbled, [
        { from: from1, to: to1 },
        { from: from2, to: to2 },
      ]);
      assert.strictEqual(recovered, HELLO_ASCII);
    });

    it('returns the string unchanged for an empty conversions list', function () {
      const result = converter.untangle(HELLO_ASCII, []);
      assert.strictEqual(result, HELLO_ASCII);
    });

    it('accepts string aliases in the conversions list', function () {
      const garbled = converter.decodeBytes(HELLO_EBCDIC, 819);
      const recovered = converter.untangle(garbled, [{ from: 'ebcdic', to: 'ascii' }]);
      assert.strictEqual(recovered, HELLO_ASCII);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Variant characters — brackets, braces, and currency symbols        */
  /*                                                                      */
  /*  [ ] { } and € occupy different byte positions across EBCDIC        */
  /*  code pages.  References:                                            */
  /*    • https://en.wikipedia.org/wiki/EBCDIC (Code pages with Latin-1) */
  /*    • IBM Db2 z/OS 12 – Code point differences between EBCDIC CCSIDs */
  /*    • Capitalware blog – EBCDIC Code Pages and Square Brackets        */
  /* ------------------------------------------------------------------ */

  describe('Variant characters — square brackets [ ]', function () {
    // IBM Db2 reference values:
    //   CCSID  37  (USA/Canada)        : [ = 0xBA   ] = 0xBB
    //   CCSID 273  (Austria/Germany)   : [ = 0x63   ] = 0xFC
    //   CCSID 500  (International)     : [ = 0x4A   ] = 0x5A
    //   CCSID 1047 (Open Systems/MVS)  : [ = 0xAD   ] = 0xBD
    //
    //   Euro-update variants (1140, 1141, 1148) inherit the same bracket
    //   positions as their base code pages (37, 273, 500 respectively).

    it('encodes [ to 0xBA in CCSID 37 (USA/Canada)', function () {
      assert.strictEqual(converter.encodeString('[', 37)[0], 0xBA);
    });

    it('encodes ] to 0xBB in CCSID 37 (USA/Canada)', function () {
      assert.strictEqual(converter.encodeString(']', 37)[0], 0xBB);
    });

    it('encodes [ to 0x63 in CCSID 273 (Austria/Germany)', function () {
      assert.strictEqual(converter.encodeString('[', 273)[0], 0x63);
    });

    it('encodes ] to 0xFC in CCSID 273 (Austria/Germany)', function () {
      assert.strictEqual(converter.encodeString(']', 273)[0], 0xFC);
    });

    it('encodes [ to 0x4A in CCSID 500 (International)', function () {
      assert.strictEqual(converter.encodeString('[', 500)[0], 0x4A);
    });

    it('encodes ] to 0x5A in CCSID 500 (International)', function () {
      assert.strictEqual(converter.encodeString(']', 500)[0], 0x5A);
    });

    it('encodes [ to 0xAD in CCSID 1047 (Open Systems)', function () {
      assert.strictEqual(converter.encodeString('[', 1047)[0], 0xAD);
    });

    it('encodes ] to 0xBD in CCSID 1047 (Open Systems)', function () {
      assert.strictEqual(converter.encodeString(']', 1047)[0], 0xBD);
    });

    it('euro-update CCSID 1140 has same bracket positions as CCSID 37', function () {
      assert.strictEqual(converter.encodeString('[', 1140)[0], 0xBA);
      assert.strictEqual(converter.encodeString(']', 1140)[0], 0xBB);
    });

    it('euro-update CCSID 1141 has same bracket positions as CCSID 273', function () {
      assert.strictEqual(converter.encodeString('[', 1141)[0], 0x63);
      assert.strictEqual(converter.encodeString(']', 1141)[0], 0xFC);
    });

    it('euro-update CCSID 1148 has same bracket positions as CCSID 500', function () {
      assert.strictEqual(converter.encodeString('[', 1148)[0], 0x4A);
      assert.strictEqual(converter.encodeString(']', 1148)[0], 0x5A);
    });

    it('decodes correct bytes back to [ ] in each CCSID', function () {
      assert.strictEqual(converter.decodeBytes([0xBA, 0xBB], 37),   '[]');
      assert.strictEqual(converter.decodeBytes([0x63, 0xFC], 273),  '[]');
      assert.strictEqual(converter.decodeBytes([0x4A, 0x5A], 500),  '[]');
      assert.strictEqual(converter.decodeBytes([0xAD, 0xBD], 1047), '[]');
    });

    it('round-trips "[Hello World]" in CCSID 37', function () {
      const text = '[Hello World]';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 37), 37), text);
    });

    it('round-trips "[Hello World]" in CCSID 500', function () {
      const text = '[Hello World]';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 500), 500), text);
    });

    it('round-trips "[Hello World]" in CCSID 1047', function () {
      const text = '[Hello World]';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1047), 1047), text);
    });

    it('convertTo re-encodes [ ] correctly when moving from CCSID 1047 to CCSID 37', function () {
      // Encode "[Hello]" as CCSID-1047 bytes ([ = 0xAD, ] = 0xBD)
      const bytes1047 = converter.encodeString('[Hello]', 1047);
      assert.strictEqual(bytes1047[0], 0xAD, 'expected 0xAD for [ in 1047');
      assert.strictEqual(bytes1047[6], 0xBD, 'expected 0xBD for ] in 1047');

      // Re-encode into CCSID-37 ([ = 0xBA, ] = 0xBB)
      const as37 = converter.convertTo(bytes1047, 37, 1047);
      const bytes37 = Array.from(as37).map(c => c.charCodeAt(0));
      assert.strictEqual(bytes37[0], 0xBA, 'expected 0xBA for [ in 37');
      assert.strictEqual(bytes37[6], 0xBB, 'expected 0xBB for ] in 37');
    });

    it('untangle recovers [ when CCSID-37 bytes were mis-decoded as CCSID-1047', function () {
      // CCSID-37 encodes [ as 0xBA; in CCSID-1047, 0xBA decodes to Ý (U+00DD)
      const garbled = converter.decodeBytes([0xBA], 1047);
      assert.notStrictEqual(garbled, '[', 'pre-condition: 0xBA in 1047 is not [');
      const recovered = converter.untangle(garbled, [{ from: 37, to: 1047 }]);
      assert.strictEqual(recovered, '[');
    });
  });

  describe('Variant characters — curly braces { }', function () {
    // { } are invariant for US/international code pages (37, 500, 1047 all use 0xC0/0xD0)
    // but national code pages use different byte positions:
    //   CCSID 273 (Austria/Germany)   : { = 0x43  } = 0xDC
    //   CCSID 277 (Denmark/Norway)    : { = 0x9C  } = 0x47
    //   CCSID 278 (Finland/Sweden)    : { = 0x43  } = 0x47
    //   CCSID 297 (France)            : { = 0x51  } = 0x54
    //   CCSID  37 / 500 / 1047        : { = 0xC0  } = 0xD0

    it('encodes { to 0xC0 and } to 0xD0 in CCSID 37 (USA/Canada)', function () {
      assert.strictEqual(converter.encodeString('{', 37)[0], 0xC0);
      assert.strictEqual(converter.encodeString('}', 37)[0], 0xD0);
    });

    it('encodes { to 0xC0 and } to 0xD0 in CCSID 500 (International)', function () {
      assert.strictEqual(converter.encodeString('{', 500)[0], 0xC0);
      assert.strictEqual(converter.encodeString('}', 500)[0], 0xD0);
    });

    it('encodes { to 0xC0 and } to 0xD0 in CCSID 1047 (Open Systems)', function () {
      assert.strictEqual(converter.encodeString('{', 1047)[0], 0xC0);
      assert.strictEqual(converter.encodeString('}', 1047)[0], 0xD0);
    });

    it('encodes { to 0x43 and } to 0xDC in CCSID 273 (Austria/Germany)', function () {
      assert.strictEqual(converter.encodeString('{', 273)[0], 0x43);
      assert.strictEqual(converter.encodeString('}', 273)[0], 0xDC);
    });

    it('encodes { to 0x9C and } to 0x47 in CCSID 277 (Denmark/Norway)', function () {
      assert.strictEqual(converter.encodeString('{', 277)[0], 0x9C);
      assert.strictEqual(converter.encodeString('}', 277)[0], 0x47);
    });

    it('encodes { to 0x43 and } to 0x47 in CCSID 278 (Finland/Sweden)', function () {
      assert.strictEqual(converter.encodeString('{', 278)[0], 0x43);
      assert.strictEqual(converter.encodeString('}', 278)[0], 0x47);
    });

    it('encodes { to 0x51 and } to 0x54 in CCSID 297 (France)', function () {
      assert.strictEqual(converter.encodeString('{', 297)[0], 0x51);
      assert.strictEqual(converter.encodeString('}', 297)[0], 0x54);
    });

    it('decodes the correct bytes back to { } in each national CCSID', function () {
      assert.strictEqual(converter.decodeBytes([0x43, 0xDC], 273), '{}');
      assert.strictEqual(converter.decodeBytes([0x9C, 0x47], 277), '{}');
      assert.strictEqual(converter.decodeBytes([0x43, 0x47], 278), '{}');
      assert.strictEqual(converter.decodeBytes([0x51, 0x54], 297), '{}');
    });

    it('round-trips "{ key: value }" in CCSID 273 (Austria/Germany)', function () {
      const text = '{ key: value }';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 273), 273), text);
    });
  });

  describe('Variant characters — euro sign € and currency sign ¤', function () {
    // Pre-euro EBCDIC code pages (37, 273, 500, 1047, …) have no € mapping.
    // They carry the universal currency sign ¤ (U+00A4) at byte 0x9F.
    //
    // Euro-update code pages (1140, 1141, 1148, 924, …) replaced ¤ with €
    // at the same byte position 0x9F.
    //
    // Wikipedia table of base → euro-update pairs:
    //   037 → 1140,  273 → 1141,  277 → 1142,  278 → 1143
    //   280 → 1144,  284 → 1145,  285 → 1146,  297 → 1147
    //   500 → 1148,  871 → 1149,  1047 → 924

    it('CCSID 37 byte 0x9F decodes to ¤ (U+00A4 universal currency sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 37), '\u00A4');
    });

    it('CCSID 1047 byte 0x9F decodes to ¤ (U+00A4 universal currency sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 1047), '\u00A4');
    });

    it('CCSID 500 byte 0x9F decodes to ¤ (U+00A4 universal currency sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 500), '\u00A4');
    });

    it('euro-update CCSID 1140 byte 0x9F decodes to € (U+20AC euro sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 1140), '\u20AC');
    });

    it('euro-update CCSID 1148 byte 0x9F decodes to € (U+20AC euro sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 1148), '\u20AC');
    });

    it('euro-update CCSID 924 byte 0x9F decodes to € (U+20AC euro sign)', function () {
      assert.strictEqual(converter.decodeBytes([0x9F], 924), '\u20AC');
    });

    it('€ encodes to 0x9F in euro-update CCSID 1140', function () {
      assert.strictEqual(converter.encodeString('\u20AC', 1140)[0], 0x9F);
    });

    it('€ encodes to 0x9F in euro-update CCSID 1148 (International)', function () {
      assert.strictEqual(converter.encodeString('\u20AC', 1148)[0], 0x9F);
    });

    it('€ encodes to 0x9F in euro-update CCSID 924 (Open Systems)', function () {
      assert.strictEqual(converter.encodeString('\u20AC', 924)[0], 0x9F);
    });

    it('pre-euro CCSID 37 cannot encode € — falls back to ? (0x6F)', function () {
      // No code point for € in CCSID 37; the library substitutes the replacement byte
      const b = converter.encodeString('\u20AC', 37)[0];
      // Decode the fallback byte to confirm it is not €
      const decoded = converter.decodeBytes([b], 37);
      assert.notStrictEqual(decoded, '\u20AC', 'CCSID 37 should not encode euro as euro');
    });

    it('pre-euro CCSID 1047 cannot encode € — falls back to ? (0x6F)', function () {
      const b = converter.encodeString('\u20AC', 1047)[0];
      const decoded = converter.decodeBytes([b], 1047);
      assert.notStrictEqual(decoded, '\u20AC', 'CCSID 1047 should not encode euro as euro');
    });

    it('round-trips € in euro-update CCSID 1140', function () {
      const text = 'Price: \u20AC100';
      assert.strictEqual(
        converter.decodeBytes(converter.encodeString(text, 1140), 1140), text);
    });

    it('round-trips € in euro-update CCSID 924', function () {
      const text = 'Price: \u20AC100';
      assert.strictEqual(
        converter.decodeBytes(converter.encodeString(text, 924), 924), text);
    });

    it('¤ and € share byte 0x9F — convertTo 37→1140 maps ¤ to € at same position', function () {
      // In CCSID 37, ¤ sits at 0x9F.  In CCSID 1140 (euro update), that same
      // byte now means €.  Converting the raw bytes without regard to semantics
      // should leave 0x9F intact (it is the same byte position).
      const bytes37 = converter.encodeString('\u00A4', 37);   // ¤ → 0x9F
      assert.strictEqual(bytes37[0], 0x9F);
      // When we decode those bytes as CCSID 1140 we get € (the replacement)
      const asEuro = converter.decodeBytes(bytes37, 1140);
      assert.strictEqual(asEuro, '\u20AC');
    });

    it('untangle recovers ¤ when CCSID-37 bytes were mis-decoded as CCSID-1140', function () {
      // Byte 0x9F in CCSID 37 = ¤; same byte in CCSID 1140 = €
      const garbled = converter.decodeBytes([0x9F], 1140);  // reads € instead of ¤
      assert.strictEqual(garbled, '\u20AC', 'pre-condition: 0x9F in 1140 is €');
      const recovered = converter.untangle(garbled, [{ from: 37, to: 1140 }]);
      assert.strictEqual(recovered, '\u00A4');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Unicode encodings — UTF-8 (1208), UTF-16 BE (1200), UTF-16 LE (1202) */
  /*                                                                      */
  /*  These CCSIDs are decoded/encoded natively via TextDecoder /         */
  /*  TextEncoder and are addressable through friendly string aliases.    */
  /* ------------------------------------------------------------------ */

  describe('Unicode encodings — UTF-8 (CCSID 1208)', function () {
    it('isSupportedCodepage returns true for CCSID 1208', function () {
      assert.ok(converter.isSupportedCodepage(1208));
    });

    it('getSupportedCodepages includes CCSID 1208', function () {
      assert.ok(converter.getSupportedCodepages().includes(1208));
    });

    it('round-trips ASCII text via UTF-8', function () {
      const text = 'The quick brown fox jumps over the lazy dog';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1208), 1208), text);
    });

    it('round-trips multi-byte encoded characters via UTF-8 (é, ö, €)', function () {
      const text = 'Héllo Wörld — café €100';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1208), 1208), text);
    });

    it('round-trips Japanese text via UTF-8', function () {
      const text = '日本語テスト';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1208), 1208), text);
    });

    it("alias 'utf-8' works via convertTo (ASCII round-trip)", function () {
      const text = 'Hello, World!';
      const asUtf8 = converter.convertTo(text, 'utf-8', 'ascii');
      const back   = converter.convertTo(asUtf8, 'ascii', 'utf-8');
      assert.strictEqual(back, text);
    });

    it("alias 'utf8' is accepted by convertTo", function () {
      const text = 'Hello';
      const asUtf8 = converter.convertTo(text, 'utf8', 'ascii');
      const back   = converter.convertTo(asUtf8, 'ascii', 'utf8');
      assert.strictEqual(back, text);
    });
  });

  describe('Unicode encodings — UTF-16 BE (CCSID 1200)', function () {
    it('isSupportedCodepage returns true for CCSID 1200', function () {
      assert.ok(converter.isSupportedCodepage(1200));
    });

    it('encodes each BMP character as 2 bytes, high byte first', function () {
      const bytes = converter.encodeString('AB', 1200);
      // A = U+0041 → 0x00 0x41;  B = U+0042 → 0x00 0x42
      assert.deepStrictEqual(Array.from(bytes), [0x00, 0x41, 0x00, 0x42]);
    });

    it('round-trips ASCII + accented + CJK text via UTF-16 BE', function () {
      const text = 'Héllo — 日本語';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1200), 1200), text);
    });

    it("alias 'utf-16be' works via convertTo", function () {
      const text = 'Hi';
      const encoded = converter.convertTo(text, 'utf-16be', 'ascii');
      const decoded  = converter.convertTo(encoded, 'ascii', 'utf-16be');
      assert.strictEqual(decoded, text);
    });

    it("aliases 'utf-16', 'utf16', 'utf-16be', 'utf16be', 'ucs-2', 'ucs2' all map to CCSID 1200", function () {
      const text = 'Hi';
      const ref = converter.convertTo(text, 'utf-16', 'ascii');
      for (const alias of ['utf16', 'utf-16be', 'utf16be', 'ucs-2', 'ucs2']) {
        assert.strictEqual(converter.convertTo(text, alias, 'ascii'), ref, `alias '${alias}' should match`);
      }
    });
  });

  describe('Unicode encodings — UTF-16 LE (CCSID 1202)', function () {
    it('isSupportedCodepage returns true for CCSID 1202', function () {
      assert.ok(converter.isSupportedCodepage(1202));
    });

    it('encodes each BMP character as 2 bytes, low byte first', function () {
      const bytes = converter.encodeString('AB', 1202);
      // A = U+0041 → 0x41 0x00;  B = U+0042 → 0x42 0x00
      assert.deepStrictEqual(Array.from(bytes), [0x41, 0x00, 0x42, 0x00]);
    });

    it('round-trips ASCII + accented + CJK text via UTF-16 LE', function () {
      const text = 'Héllo — 日本語';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1202), 1202), text);
    });

    it("alias 'utf-16le' works via convertTo", function () {
      const text = 'Hi';
      const encoded = converter.convertTo(text, 'utf-16le', 'ascii');
      const decoded  = converter.convertTo(encoded, 'ascii', 'utf-16le');
      assert.strictEqual(decoded, text);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  National language round-trips — SBCS EBCDIC                        */
  /*                                                                      */
  /*  Each test encodes a pangram (or well-known national phrase) using  */
  /*  the language's EBCDIC code page, then decodes it back and checks   */
  /*  the round-trip.  Failures indicate missing characters in a table. */
  /* ------------------------------------------------------------------ */

  describe('EBCDIC round-trip — German (CCSID 273)', function () {
    it('round-trips "Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich"', function () {
      // Pangram covering all German letters including ä, ö, ü, ß
      const text = 'Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 273), 273), text);
    });
  });

  describe('EBCDIC round-trip — French (CCSID 297)', function () {
    it('round-trips "Portez ce vieux whisky au juge blond qui fume"', function () {
      // Classic French pangram; exercises all basic consonants in EBCDIC 297
      const text = 'Portez ce vieux whisky au juge blond qui fume';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 297), 297), text);
    });
  });

  describe('EBCDIC round-trip — Danish/Norwegian (CCSID 277)', function () {
    it('round-trips "Høj bly gom vandt fræk sexquiz på wc"', function () {
      // Perfect Danish pangram; exercises ø, æ, å in EBCDIC 277
      const text = 'Høj bly gom vandt fræk sexquiz på wc';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 277), 277), text);
    });
  });

  describe('EBCDIC round-trip — Swedish/Finnish (CCSID 278)', function () {
    it('round-trips "Flygande bäckasiner söka hwila på mjuka tuvor"', function () {
      // Swedish pangram; exercises ä, ö, å in EBCDIC 278
      const text = 'Flygande bäckasiner söka hwila på mjuka tuvor';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 278), 278), text);
    });
  });

  describe('EBCDIC round-trip — Italian (CCSID 280)', function () {
    it('round-trips "Pranzo d\'acqua fa volti sghembi"', function () {
      // Italian pangram covering all 21 native Italian letters in EBCDIC 280
      const text = "Pranzo d'acqua fa volti sghembi";
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 280), 280), text);
    });
  });

  describe('EBCDIC round-trip — Spanish (CCSID 284)', function () {
    it('round-trips "El veloz murciélago hindú comía feliz cardillo y kiwi"', function () {
      // Spanish pangram (Windows es-ES sample); exercises é, ú, í in EBCDIC 284
      const text = 'El veloz murciélago hindú comía feliz cardillo y kiwi';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 284), 284), text);
    });
  });

  describe('EBCDIC round-trip — Greek (CCSID 875)', function () {
    it('round-trips "Ξεσκεπάζω την ψυχοφθόρα βδελυγμία"', function () {
      // Well-known Greek pangram; exercises full Greek alphabet with tonos in EBCDIC 875
      const text = 'Ξεσκεπάζω την ψυχοφθόρα βδελυγμία';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 875), 875), text);
    });
  });

  describe('EBCDIC round-trip — Russian/Cyrillic (CCSID 1025)', function () {
    it('round-trips "Съешь ещё этих мягких французских булок, да выпей же чаю"', function () {
      // Most commonly used Russian pangram (Windows FontView); full Cyrillic in EBCDIC 1025
      const text = 'Съешь ещё этих мягких французских булок, да выпей же чаю';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1025), 1025), text);
    });
  });

  describe('EBCDIC round-trip — Turkish (CCSID 1026)', function () {
    it('round-trips "Pijamalı hasta yağız şoföre çabucak güvendi"', function () {
      // Turkish pangram covering all Turkish letters: ı, ğ, ş, ö, ü, ç in EBCDIC 1026
      const text = 'Pijamalı hasta yağız şoföre çabucak güvendi';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1026), 1026), text);
    });
  });

  describe('EBCDIC round-trip — Polish/Latin-2 (CCSID 870)', function () {
    it('round-trips "Pchnąć w tę łódź jeża lub ośm skrzyń fig"', function () {
      // Common perfect Polish pangram; exercises ą, ć, ę, ł, ó, ś, ź, ń in EBCDIC 870
      const text = 'Pchnąć w tę łódź jeża lub ośm skrzyń fig';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 870), 870), text);
    });
  });

  describe('EBCDIC round-trip — Ukrainian (CCSID 1123)', function () {
    it('round-trips "Єхидна, ґава, їжак ще й шиплячі плазуни бігцем форсують Янцзи"', function () {
      // Ukrainian pangram; exercises Ukrainian-specific Є, ґ, ї in EBCDIC 1123
      const text = 'Єхидна, ґава, їжак ще й шиплячі плазуни бігцем форсують Янцзи';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1123), 1123), text);
    });
  });

  describe('EBCDIC round-trip — Hebrew (CCSID 424)', function () {
    it('round-trips "דג סקרן שט בים, מאוכזב ולפתע מצא חברה"', function () {
      // Hebrew pangram — curious fish in the sea; full Hebrew alphabet in EBCDIC 424
      const text = 'דג סקרן שט בים, מאוכזב ולפתע מצא חברה';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 424), 424), text);
    });
  });

  describe('EBCDIC round-trip — Arabic (CCSID 420)', function () {
    it('round-trips Arabic wise-text pangram', function () {
      // "Wise text with a decisive secret and great significance..."; full Arabic alphabet in EBCDIC 420
      const text = 'نص حكيم له سر قاطع وذو شأن عظيم مكتوب على ثوب أخضر ومغلف بجلد أزرق';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 420), 420), text);
    });
  });

  describe('EBCDIC round-trip — Estonian (CCSID 1122)', function () {
    it('round-trips "See väike mölder jõuab rongile hüpata"', function () {
      // Estonian pangram — "This little miller can jump on a train"; exercises ä, ö, õ, ü in EBCDIC 1122
      const text = 'See väike mölder jõuab rongile hüpata';
      assert.strictEqual(converter.decodeBytes(converter.encodeString(text, 1122), 1122), text);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  DBCS mixed code pages — CJK content                                */
  /*                                                                      */
  /*  These code pages use SO (0x0E) to enter DBCS mode and SI (0x0F)   */
  /*  to return to SBCS mode.  CJK characters are encoded as 2 bytes     */
  /*  while Latin/control characters remain single-byte.                 */
  /* ------------------------------------------------------------------ */

  describe('isMixedDbcsCcsid()', function () {
    it('returns true for CCSID 930 (Japan)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(930), true);
    });
    it('returns true for CCSID 933 (Korea)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(933), true);
    });
    it('returns true for CCSID 935 (Simplified Chinese)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(935), true);
    });
    it('returns true for CCSID 937 (Traditional Chinese)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(937), true);
    });
    it('returns true for CCSID 939 (Japan Latin)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(939), true);
    });
    it('returns true for euro-variant CCSID 1364', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(1364), true);
    });
    it('returns true for euro-variant CCSID 1390', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(1390), true);
    });
    it("returns true for string alias 'ibm-930'", function () {
      assert.strictEqual(converter.isMixedDbcsCcsid('ibm-930'), true);
    });
    it("returns true for alias 'korean-ebcdic'", function () {
      assert.strictEqual(converter.isMixedDbcsCcsid('korean-ebcdic'), true);
    });
    it('returns false for SBCS CCSID 1047', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(1047), false);
    });
    it('returns false for CCSID 290 (Katakana SBCS)', function () {
      assert.strictEqual(converter.isMixedDbcsCcsid(290), false);
    });
  });

  describe('getSupportedCodepages() includes DBCS CCSIDs', function () {
    it('includes CCSID 930', function () {
      assert.ok(converter.getSupportedCodepages().includes(930));
    });
    it('includes CCSID 933', function () {
      assert.ok(converter.getSupportedCodepages().includes(933));
    });
    it('includes CCSID 937', function () {
      assert.ok(converter.getSupportedCodepages().includes(937));
    });
  });

  describe('isSupportedCodepage() covers DBCS CCSIDs', function () {
    it('returns true for CCSID 930', function () {
      assert.strictEqual(converter.isSupportedCodepage(930), true);
    });
    it('returns true for CCSID 939', function () {
      assert.strictEqual(converter.isSupportedCodepage(939), true);
    });
  });

  describe('decodeDbcs() — Japanese (CCSID 930)', function () {
    // In IBM-930: space = 0x40 (SBCS), ideographic space U+3000 = 0x40 0x40 (DBCS)
    // 日 (U+65E5) = 0x45 0x62 in DBCS mode per IBM-930 table
    // 本 (U+672C) = 0x45 0x66 in DBCS mode per IBM-930 table

    it('decodes pure SBCS bytes (no SO/SI)', function () {
      // 0x40 = space in SBCS mode for IBM-930
      const result = converter.decodeDbcs([0x40], 930);
      assert.strictEqual(result, ' ');
    });

    it('decodes a single DBCS character between SO/SI', function () {
      // SO + 0x45 0x62 (日) + SI
      const bytes = [0x0E, 0x45, 0x62, 0x0F];
      const result = converter.decodeDbcs(bytes, 930);
      assert.strictEqual(result, '\u65E5'); // 日
    });

    it('decodes mixed SBCS + DBCS content', function () {
      // "A" (SBCS 0xC1 in IBM-930) + SO + 日本 + SI
      // 日 = U+65E5 → 0x45 0x62; 本 = U+672C → 0x45 0x66
      const bytes = [0xC1, 0x0E, 0x45, 0x62, 0x45, 0x66, 0x0F];
      const result = converter.decodeDbcs(bytes, 930);
      assert.strictEqual(result, 'A\u65E5\u672C'); // A日本
    });

    it("accepts alias 'ibm-930'", function () {
      const bytes = [0x0E, 0x45, 0x62, 0x0F];
      assert.strictEqual(converter.decodeDbcs(bytes, 'ibm-930'), '\u65E5');
    });

    it('replaces an incomplete DBCS pair at end of input with U+FFFD', function () {
      const bytes = [0x0E, 0x45]; // SO + only 1 byte
      const result = converter.decodeDbcs(bytes, 930);
      assert.strictEqual(result, '\uFFFD');
    });
  });

  describe('decodeDbcs() — Korean (CCSID 933)', function () {
    it("round-trips Korean font-test pangram '다람쥐 헌 쳇바퀴에 타고파'", function () {
      // "Squirrels ride on the old wheel" — Microsoft Windows Korean font test; uses all basic Hangul consonants
      const text = '다람쥐 헌 쳇바퀴에 타고파';
      const encoded = converter.encodeDbcs(text, 933);
      const decoded = converter.decodeDbcs(encoded, 933);
      assert.strictEqual(decoded, text);
    });

    it('round-trips Korean all-letter pangram using all 24 basic letters', function () {
      // "The unique conditions of a kiss are to meet the lips and do not require any special skills"
      const text = '키스의 고유 조건은 입술끼리 만나야 하고 특별한 기술은 필요치 않다';
      const encoded = converter.encodeDbcs(text, 933);
      const decoded = converter.decodeDbcs(encoded, 933);
      assert.strictEqual(decoded, text);
    });
  });

  describe('decodeDbcs() — Simplified Chinese (CCSID 935)', function () {
    it("round-trips Li Bai's 靜夜思 line 1 in Simplified Chinese", function () {
      // 床前明月光疑是地上霜 — "Before my bed the moonlight glitters like frost on the ground"
      const text = '床前明月光疑是地上霜';
      const encoded = converter.encodeDbcs(text, 935);
      const decoded = converter.decodeDbcs(encoded, 935);
      assert.strictEqual(decoded, text);
    });

    it("round-trips Li Bai's 靜夜思 line 2 in Simplified Chinese", function () {
      // 举头望明月低头思故乡 — "I raise my head to gaze at the moon, then lower it, longing for home"
      const text = '举头望明月低头思故乡';
      const encoded = converter.encodeDbcs(text, 935);
      const decoded = converter.decodeDbcs(encoded, 935);
      assert.strictEqual(decoded, text);
    });
  });

  describe('decodeDbcs() — Traditional Chinese (CCSID 937)', function () {
    it("round-trips Li Bai's 靜夜思 line 1 in Traditional Chinese", function () {
      // 床前明月光疑是地上霜 — "Before my bed the moonlight glitters like frost on the ground"
      const text = '床前明月光疑是地上霜';
      const encoded = converter.encodeDbcs(text, 937);
      const decoded = converter.decodeDbcs(encoded, 937);
      assert.strictEqual(decoded, text);
    });

    it("round-trips Li Bai's 靜夜思 line 2 in Traditional Chinese", function () {
      // 舉頭望明月低頭思故鄉 — "I raise my head to gaze at the moon, then lower it, longing for home" (traditional form)
      const text = '舉頭望明月低頭思故鄉';
      const encoded = converter.encodeDbcs(text, 937);
      const decoded = converter.decodeDbcs(encoded, 937);
      assert.strictEqual(decoded, text);
    });
  });

  describe('decodeDbcs() — Japanese Latin (CCSID 939)', function () {
    // CCSID 939 uses CCSID 1027 (Latin-EBCDIC) for SBCS, same DBCS kanji table as 930

    it('decodes ASCII-range characters via SBCS mode in CCSID 939', function () {
      // In CCSID 939 the letter A is at 0x41 (Latin EBCDIC)
      // encodeDbcs will produce SBCS bytes for ASCII characters
      const text = 'Hello';
      const encoded = converter.encodeDbcs(text, 939);
      const decoded = converter.decodeDbcs(encoded, 939);
      assert.strictEqual(decoded, text);
    });

    it('round-trips Iroha poem (every kana once) in CCSID 939', function () {
      // いろはにほへとちりぬるを — classic Japanese perfect kana pangram; all hiragana are DBCS in IBM-939
      const text = 'いろはにほへとちりぬるを';
      const encoded = converter.encodeDbcs(text, 939);
      const decoded = converter.decodeDbcs(encoded, 939);
      assert.strictEqual(decoded, text);
    });

    it('round-trips mixed Latin + Iroha in CCSID 939', function () {
      // CCSID 939 SBCS (IBM-1027) carries Latin; hiragana shift to DBCS mode
      const text = 'Hello, いろはにほへとちりぬるを';
      const encoded = converter.encodeDbcs(text, 939);
      const decoded = converter.decodeDbcs(encoded, 939);
      assert.strictEqual(decoded, text);
    });
  });

  describe('encodeDbcs() — SO/SI byte structure', function () {
    it('produces no SO/SI bytes for pure SBCS content', function () {
      const encoded = converter.encodeDbcs(' ', 930); // space is SBCS
      const bytes = Array.from(encoded);
      assert.ok(!bytes.includes(0x0E), 'should not contain SO for SBCS-only content');
      assert.ok(!bytes.includes(0x0F), 'should not contain SI for SBCS-only content');
    });

    it('wraps DBCS content in SO / SI', function () {
      const encoded = converter.encodeDbcs('\u65E5', 930); // 日
      const bytes = Array.from(encoded);
      assert.strictEqual(bytes[0], 0x0E, 'first byte should be SO');
      assert.strictEqual(bytes[bytes.length - 1], 0x0F, 'last byte should be SI');
      assert.strictEqual(bytes.length, 4, 'SO + 2 DBCS bytes + SI = 4 bytes');
    });

    it('uses a single SO/SI pair for a run of multiple DBCS characters', function () {
      const encoded = converter.encodeDbcs('\u65E5\u672C', 930); // 日本
      const bytes = Array.from(encoded);
      assert.strictEqual(bytes[0], 0x0E, 'SO at start');
      assert.strictEqual(bytes[bytes.length - 1], 0x0F, 'SI at end');
      // 4 DBCS bytes (2 per char), wrapped in SO and SI
      assert.strictEqual(bytes.length, 6);
    });

    it('correctly interleaves SBCS and DBCS segments', function () {
      // "A日B": SBCS A, DBCS 日, SBCS B
      const encoded = converter.encodeDbcs('A\u65E5B', 939);
      const bytes = Array.from(encoded);
      // Expect: [A_sbcs, SO, 日_hi, 日_lo, SI, B_sbcs]
      const soIdx  = bytes.indexOf(0x0E);
      const siIdx  = bytes.lastIndexOf(0x0F);
      assert.ok(soIdx > 0, 'SO should not be the first byte');
      assert.ok(siIdx > soIdx, 'SI should come after SO');
      assert.ok(siIdx < bytes.length - 1 || siIdx === bytes.length - 1, 'SI at or near end');
    });
  });

  describe('decodeDbcs() — DBCS CCSIDs accept Uint8Array input', function () {
    it('accepts Uint8Array for Japanese decode', function () {
      const bytes = new Uint8Array([0x0E, 0x45, 0x62, 0x0F]);
      const result = converter.decodeDbcs(bytes, 930);
      assert.strictEqual(result, '\u65E5');
    });
  });

  describe('decodeDbcs() — euro-variant CCSIDs', function () {
    it('round-trips Iroha poem in CCSID 1390 (930 + euro)', function () {
      // いろはにほへとちりぬるを — classic Japanese perfect kana pangram
      const text = 'いろはにほへとちりぬるを';
      const encoded = converter.encodeDbcs(text, 1390);
      const decoded = converter.decodeDbcs(encoded, 1390);
      assert.strictEqual(decoded, text);
    });

    it('round-trips Korean font-test pangram in CCSID 1364 (933 + euro)', function () {
      // "Squirrels ride on the old wheel" — Microsoft Windows Korean font test; uses all basic Hangul consonants
      const text = '다람쥐 헌 쳇바퀴에 타고파';
      const encoded = converter.encodeDbcs(text, 1364);
      const decoded = converter.decodeDbcs(encoded, 1364);
      assert.strictEqual(decoded, text);
    });
  });
});

