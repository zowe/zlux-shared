

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

export class HtmlObfuscator {
  constructor() {
  }

  public findAndReplaceHTMLEntities(str: string): string {
    let regexHTMLEnd   = new RegExp('<\/[A-Za-z0-9]+\\s?>');
    let regexHTMLStart = new RegExp('<[A-Za-z0-9]+(\\s+\\S+.*)?>|<[A-Za-z0-9]+\\s?\/?>');

    var newString = str;

    for (var i = 0; i < str.length; i++) {
      if (str.charAt(i) == '<') {
        for (var j = i; j < str.length; j++) {
          if (str.charAt(j) == '>') {
            var tmpString = str.slice(i, j+1);
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
  }

  private replaceHTMLCharacters(str: string): string {
    var newString = str;

    newString = newString.replace('<', '&#60;');
    newString = newString.replace('>', '&#62;');
    newString = newString.replace('/', '&#47;');

    return newString;
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

