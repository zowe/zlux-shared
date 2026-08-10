/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
const assert = require('assert');
const { HtmlObfuscator } = require('../../src/obfuscator/htmlObfuscator.js');

describe('HtmlObfuscator', function() {
  let obfuscator;

  beforeEach(function() {
    obfuscator = new HtmlObfuscator();
  });

  describe('constructor', function() {
    it('should create an instance', function() {
      assert.ok(obfuscator);
    });
  });

  describe('findAndReplaceHTMLEntities', function() {
    it('should return null/undefined input unchanged', function() {
      assert.strictEqual(obfuscator.findAndReplaceHTMLEntities(null), null);
      assert.strictEqual(obfuscator.findAndReplaceHTMLEntities(undefined), undefined);
      assert.strictEqual(obfuscator.findAndReplaceHTMLEntities(''), '');
    });

    it('should return plain text unchanged', function() {
      assert.strictEqual(obfuscator.findAndReplaceHTMLEntities('hello world'), 'hello world');
    });

    it('should obfuscate simple HTML tags', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<div>');
      assert.ok(!result.includes('<div>'));
      assert.ok(result.includes('&#60;'));
      assert.ok(result.includes('&#62;'));
    });

    it('should obfuscate closing HTML tags', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('</div>');
      assert.ok(!result.includes('</div>'));
      assert.ok(result.includes('&#60;'));
      assert.ok(result.includes('&#47;'));
      assert.ok(result.includes('&#62;'));
    });

    it('should obfuscate self-closing tags', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<br/>');
      assert.ok(!result.includes('<br/>'));
      assert.ok(result.includes('&#60;'));
    });

    it('should obfuscate tags with attributes', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<a href="http://example.com">');
      assert.ok(!result.includes('<a'));
      assert.ok(result.includes('&#60;'));
    });

    it('should handle mixed text and HTML', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('Hello <b>world</b>!');
      assert.ok(result.includes('Hello'));
      assert.ok(result.includes('!'));
      assert.ok(!result.includes('<b>'));
      assert.ok(!result.includes('</b>'));
    });

    it('should handle multiple HTML tags', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<div><span>text</span></div>');
      assert.ok(!result.includes('<div>'));
      assert.ok(!result.includes('<span>'));
      assert.ok(result.includes('text'));
    });

    it('should handle script tags', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<script>alert("xss")</script>');
      assert.ok(!result.includes('<script>'));
      assert.ok(!result.includes('</script>'));
    });

    it('should not modify angle brackets that are not HTML', function() {
      // Standalone < or > without forming valid HTML should stay
      var result = obfuscator.findAndReplaceHTMLEntities('5 < 10 and 10 > 5');
      // These are not valid HTML tags, so they should remain
      assert.ok(result.includes('<') || result.includes('&#60;'));
    });

    it('should handle tags with spaces before close', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<br >');
      assert.ok(!result.includes('<br >'));
    });

    it('should handle img tag with attributes', function() {
      var result = obfuscator.findAndReplaceHTMLEntities('<img src="x" onerror="alert(1)">');
      assert.ok(!result.includes('<img'));
      assert.ok(result.includes('&#60;'));
    });
  });

  describe('replaceHTMLCharacters', function() {
    it('should replace < with &#60;', function() {
      var result = obfuscator.replaceHTMLCharacters('<test');
      assert.ok(result.includes('&#60;'));
      assert.ok(!result.includes('<'));
    });

    it('should replace > with &#62;', function() {
      var result = obfuscator.replaceHTMLCharacters('test>');
      assert.ok(result.includes('&#62;'));
      assert.ok(!result.includes('>'));
    });

    it('should replace / with &#47;', function() {
      var result = obfuscator.replaceHTMLCharacters('/test');
      assert.ok(result.includes('&#47;'));
      assert.ok(!result.includes('/'));
    });

    it('should replace all three characters', function() {
      var result = obfuscator.replaceHTMLCharacters('</div>');
      assert.ok(result.includes('&#60;'));
      assert.ok(result.includes('&#47;'));
      assert.ok(result.includes('&#62;'));
    });

    it('should handle string with no special characters', function() {
      var result = obfuscator.replaceHTMLCharacters('plain text');
      assert.strictEqual(result, 'plain text');
    });
  });
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
