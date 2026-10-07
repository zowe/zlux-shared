

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const HTML_ENTITY_MAP: { [char: string]: string } = {
  '&': '&#38;',
  '<': '&#60;',
  '>': '&#62;',
  '"': '&#34;',
  "'": '&#39;',
  '/': '&#47;',
};

const HTML_ENTITY_REGEX = /[&<>"'\/]/g;

export class HtmlObfuscator {
  constructor() {
  }

  public findAndReplaceHTMLEntities(str: string): string {
    if (!str) {
      return str;
    }

    return str.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITY_MAP[char]);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

