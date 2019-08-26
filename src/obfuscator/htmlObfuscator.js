"use strict";
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var HtmlObfuscator = /** @class */ (function () {
    function HtmlObfuscator() {
    }
    HtmlObfuscator.prototype.findAndReplaceHTMLEntities = function (str) {
        if (!str) {
            return str;
        }
        var regexHTMLEnd = new RegExp('<\/[A-Za-z0-9]+\\s?>');
        var regexHTMLStart = new RegExp('<[A-Za-z0-9]+(\\s+\\S+.*)?>|<[A-Za-z0-9]+\\s?\/?>');
        var newString = str;
        for (var i = 0; i < str.length; i++) {
            if (str.charAt(i) == '<') {
                for (var j = i; j < str.length; j++) {
                    if (str.charAt(j) == '>') {
                        var tmpString = str.slice(i, j + 1);
                        if (regexHTMLStart.test(tmpString) || regexHTMLEnd.test(tmpString)) {
                            var tmpString2 = tmpString;
                            tmpString2 = this.replaceHTMLCharacters(tmpString2);
                            newString = newString.replace(tmpString, tmpString2);
                            i = j;
                            break;
                        }
                    }
                }
            }
        }
        return newString;
    };
    HtmlObfuscator.prototype.replaceHTMLCharacters = function (str) {
        var newString = str;
        newString = newString.replace('<', '&#60;');
        newString = newString.replace('>', '&#62;');
        newString = newString.replace('/', '&#47;');
        return newString;
    };
    return HtmlObfuscator;
}());
exports.HtmlObfuscator = HtmlObfuscator;
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
//# sourceMappingURL=htmlObfuscator.js.map