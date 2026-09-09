

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/


// https://console.spec.whatwg.org/#logger
// consider formatting ideas
// consider grouping ideas 
// time/data/functionname/linenumber
// maybe polyfill from https://www.stacktracejs.com/#!/docs/stacktrace-js 

declare var process: {pid: number,
                     geteuid: any};
var componentLoggers: Map<string, ComponentLogger>; // Because each componentLogger is accessible through its parent logger at run-time, and componentLoggers 
// are not truly private with 'private', we use a local variable here to store each of them privately
type MessageTable = any;

export enum LogLevel {
  CRITICAL,
  WARN,
  INFO,
  DEBUG,
  FINER,
  TRACE,
}

export class ComponentLogger implements ZLUX.ComponentLogger {
  private parentLogger:Logger;
  private componentName:string;
  private _messages: MessageTable;
  //for keeping them in sync
  private _subLoggers: ComponentLogger[];
  public SEVERE: number;
  public CRITICAL: number;
  public WARN: number;
  public WARNING: number;
  public INFO: number;
  public FINE: number;
  public DEBUG: number;
  public FINER: number;
  public FINEST: number;
  public TRACE: number;
  
  constructor(parentLogger:Logger, componentName:string, messages?: MessageTable){
    this.parentLogger = parentLogger;
    this.componentName = componentName;
    this.CRITICAL = LogLevel.CRITICAL;
    this.SEVERE = LogLevel.CRITICAL;
    this.WARNING = LogLevel.WARN;
    this.WARN = LogLevel.WARN;
    this.INFO = LogLevel.INFO;
    this.FINE = LogLevel.DEBUG;
    this.DEBUG = LogLevel.DEBUG;    
    this.FINER = LogLevel.FINER;
    this.FINEST = LogLevel.TRACE;
    this.TRACE = LogLevel.TRACE;
    this._messages = messages;
    this._subLoggers = [];
  }

  public _setMessages(table: MessageTable) {
    this._messages = table;
    this._subLoggers.forEach(sublogger => sublogger._messages = table);
  }

  makeSublogger(componentNameSuffix:string): ComponentLogger {
    const subLogger = new ComponentLogger(this.parentLogger, this.componentName+':'+componentNameSuffix, this._messages);
    this._subLoggers.push(subLogger);
    return subLogger;
  }

  /**
   * Expands a message ID into "<id> - <message table text>" when the first loggable
   * item names an entry in this logger's message table.
   *
   * The lookup is restricted to own properties so that inherited Object members
   * ('constructor', 'toString', ...) cannot be mistaken for message definitions.
   */
  private applyMessageTable(loggableItems:any[]):any[] {
    const firstLoggableItem = loggableItems[0];
    if (this._messages
        && Object.prototype.hasOwnProperty.call(this._messages, firstLoggableItem)
        && this._messages[firstLoggableItem]) {
      loggableItems[0] = firstLoggableItem + " - " + this._messages[firstLoggableItem];
    }
    return loggableItems;
  }

  log(minimumLevel:number, ...loggableItems:any[]):void {
    this.parentLogger.log(this.componentName, minimumLevel, ...this.applyMessageTable(loggableItems));
  }

  severe(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, LogLevel.CRITICAL, ...this.applyMessageTable(loggableItems));
  }
  
  critical(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, LogLevel.CRITICAL, ...this.applyMessageTable(loggableItems));
  }    
  
  info(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.INFO, ...this.applyMessageTable(loggableItems));
  }

  warn(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.WARN, ...this.applyMessageTable(loggableItems));
  }

  debug(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.DEBUG, ...this.applyMessageTable(loggableItems));
  }

  trace(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.TRACE, ...this.applyMessageTable(loggableItems));
  }  

}

class RegExpLevel {
  constructor(
    public regex: RegExp,
    public level: LogLevel
  ){
  }
}

export class Logger implements ZLUX.Logger {
  private destinations: Array<(componentName:string, minimumLevel: LogLevel, ...loggableItems:any[])=>void>;
  private configuration: {[key:string]:LogLevel};
  private previousPatterns: RegExpLevel[];
  private knownComponentNames:string[] = []; 
  public static SEVERE: number = LogLevel.CRITICAL;
  public static CRITICAL: number = LogLevel.CRITICAL;
  public static WARNING: number = LogLevel.WARN;
  public static WARN: number = LogLevel.WARN;
  public static INFO: number = LogLevel.INFO;
  public static DEBUG: number = LogLevel.DEBUG;
  public static FINE: number = LogLevel.DEBUG;
  public static FINER: number = LogLevel.FINER;
  public static FINEST: number = LogLevel.TRACE;
  public static TRACE: number = LogLevel.TRACE;
  private static processString: string;
  private static processStringPrefix: string;
  private static username: string = 'N/A';
  private static euid?: number;
  private static os?: any;
  private static offsetMs: number = 0;
  private static seperator: string = '/';
  private static useV8Tracing: boolean = false;
  private static nodeUtil: any;
  /**
   * C0 control characters plus DEL, excluding TAB (\x09) and LF (\x0A).
   * Escaping these stops ANSI/terminal escape sequences and lone CRs from reaching
   * an operator's terminal or overwriting part of a written record.
   */
  private static controlCharacters: RegExp = /[\x00-\x08\x0B-\x1F\x7F]/g;
  /**
   * Prepended to every continuation line of a record. Log readers - including the
   * Zowe service logging standard in zowe-install-packaging bin/libs/common - treat
   * a line as a new, already-formatted record only when it begins with a timestamp.
   * Marking continuations guarantees no embedded newline can forge a record.
   */
  private static continuationPrefix: string = '  | ';
  
  constructor(offsetMs: number = 0){
    componentLoggers = new Map();
    this.configuration = {};
    Logger.offsetMs = offsetMs;
    this.destinations = new Array<(componentName:string, minimumLevel: LogLevel, ...loggableItems:any[])=>void>();    
    this.previousPatterns = new Array<RegExpLevel>();
    this.updateProcessString();
  }

  private updateProcessString(){
    let defaultPrefix: string = 'ZWED';
    if (!Logger.processString || !!Logger.processStringPrefix) {
      if (Logger.processStringPrefix){
        defaultPrefix = Logger.processStringPrefix;
      }
      let runningInNode = new Function(`try { return this === global; } catch (error) { return false; }`);
      if (runningInNode()) {
        Logger.useV8Tracing = true;
        Logger.processString = `<${defaultPrefix}:${process.pid}> `;
        Logger.os = require('os');
        //Resolved through a variable so bundlers do not record 'util' as a static
        //dependency. A browser bundle would otherwise have to declare a stub for it
        //(resolve.fallback), which would mean changing every consumer's build config;
        //this branch never runs outside node in any case. Validated at the point of
        //use in formatLoggableItems.
        //Browser bundles resolve this to an empty stub (resolve.fallback), so the
        //result is validated at the point of use in formatLoggableItems rather than
        //trusted here. This branch only runs under node.
        Logger.nodeUtil = require('util');

        if (Logger.os.platform() == 'win32') {
          Logger.seperator = '\\';
        }
        try {
          Logger.username = Logger.os.userInfo().username;
        } catch (e) {
          //OK
          let platform = Logger.os.platform();
          if (platform != 'win32' && platform != 'android') {
            Logger.euid = process.geteuid();
          }
        }
      } else {
        Logger.processString = `<${defaultPrefix}:> `;
      }
    }
  }

  toggleV8Tracing() {
    Logger.useV8Tracing = !Logger.useV8Tracing;
    return Logger.useV8Tracing;
  }

  _setBrowserUsername(username:string) {
    //browser check
    if (!Logger.os && (username.length > 0)) {
      Logger.username = username;
    }
  }

  addDestination(destinationCallback:(componentName:string, minimumLevel: LogLevel, ...loggableItems:any[])=>void):void {
    this.destinations.push(destinationCallback);
  }

  private shouldLogInternal(componentName:string, level:LogLevel):boolean{
    let configuredLevel:LogLevel|undefined = this.configuration[componentName];
    if (configuredLevel === undefined){
      configuredLevel = Logger.INFO;
    }
    return configuredLevel >= level;
  };

  private static createPrependingStrings(prependLevel?: boolean,
                                         prependProcess?: boolean,
                                         prependUser?: boolean): string[] {
    let formatting = '';
    if (prependProcess) {
      formatting += Logger.processString;
    }
    if (prependUser) {
      if (Logger.username) {
        formatting += `${Logger.username} `;
      } else {
        formatting += `${Logger.euid} `;
      }
    }
    if (prependLevel) {
        return [
          `${formatting}${LogLevel[0]} `,
          `${formatting}${LogLevel[1]} `,
          `${formatting}${LogLevel[2]} `,
          `${formatting}${LogLevel[3]} `,
          `${formatting}${LogLevel[4]} `,
          `${formatting}${LogLevel[5]} `,
        ];
    } else {
      return [
        `${formatting} `,
        `${formatting} `,
        `${formatting} `,
        `${formatting} `,
        `${formatting} `,
        `${formatting} `,
      ];
    }    
  }
  
  /**
   * Replaces control characters with printable escapes, leaving TAB and LF intact.
   * LF is preserved here so that legitimately multi-line content (message table
   * entries, error stacks) still renders across lines; it is neutralized later by
   * the continuation prefix applied to the finished record.
   */
  private static escapeControlCharacters(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(Logger.controlCharacters, function(character: string): string {
      const code: number = character.charCodeAt(0);
      return '\\x' + (code < 16 ? '0' : '') + code.toString(16).toUpperCase();
    });
  }

  private static sanitizeLoggableItem(item: any): any {
    return (typeof item === 'string') ? Logger.escapeControlCharacters(item) : item;
  }

  /**
   * Sanitizes a value used inside the record prefix. Component names can come from
   * request parameters, so they must not be able to introduce line breaks.
   */
  private static sanitizeToken(text: string): string {
    return Logger.escapeControlCharacters(String(text)).replace(/\n/g, '\\n');
  }

  private static stringifyValue(value: any): string {
    if (value instanceof Error) {
      return value.stack ? value.stack : `${value.name}: ${value.message}`;
    }
    try {
      const serialized = JSON.stringify(value);
      return (serialized === undefined) ? String(value) : serialized;
    } catch (e) {
      return String(value);
    }
  }

  /**
   * Minimal util.format stand-in for browsers, where the node 'util' module is absent.
   */
  private static formatWithoutNode(loggableItems: any[]): string {
    if (loggableItems.length === 0) {
      return '';
    }
    let output: string;
    let nextIndex: number = 0;
    if (typeof loggableItems[0] === 'string') {
      nextIndex = 1;
      output = loggableItems[0].replace(/%[sdifjoO%]/g, function(directive: string): string {
        if (directive === '%%') {
          return '%';
        }
        if (nextIndex >= loggableItems.length) {
          return directive;
        }
        const value: any = loggableItems[nextIndex++];
        switch (directive) {
          case '%d':
          case '%i':
            return String(parseInt(value, 10));
          case '%f':
            return String(parseFloat(value));
          case '%s':
            return (typeof value === 'string') ? value : Logger.stringifyValue(value);
          default:
            return Logger.stringifyValue(value);
        }
      });
    } else {
      output = '';
    }
    for (let i = nextIndex; i < loggableItems.length; i++) {
      const value: any = loggableItems[i];
      const rendered: string = (typeof value === 'string') ? value : Logger.stringifyValue(value);
      output += (output.length ? ' ' : '') + rendered;
    }
    return output;
  }

  private static formatLoggableItems(loggableItems: any[]): string {
    //Checked per call rather than assumed: a browser bundle resolves 'util' to an
    //empty stub, and treating that as usable would throw on every log call.
    if (Logger.nodeUtil && (typeof Logger.nodeUtil.format === 'function')) {
      return Logger.nodeUtil.format(...loggableItems);
    }
    return Logger.formatWithoutNode(loggableItems);
  }

  private consoleLogInternal(componentName:string,
                             minimumLevel:LogLevel,
                             prependingString:string,
                             prependDate?:boolean,
                             prependName?:boolean,
                             ...loggableItems:any[]):void {
    var formatting = '';
    if (prependDate) {
      var d = new Date();
      d.setTime(d.getTime()-Logger.offsetMs);
      var dateString = d.toISOString();
      dateString = dateString.substring(0,dateString.length-1).replace('T',' ');
      formatting += `${dateString} `;
    }
    formatting+=prependingString;
    //v8 tracing only intended for v8 browsers & nodejs. Not likely to work elsewhere, so defaults to off for web code.
    //Inspired from https://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
    //API def: https://v8.dev/docs/stack-trace-api
    if (prependName && Logger.useV8Tracing) {
      let originalFunc = (Error as any).prepareStackTrace;
      let callerFunction = '';
      let callerLine = '';
      try {
        let err:any = new Error();

        (Error as any).prepareStackTrace = function (_err: Error, stack: any) {
          return stack;
        };
        if (err.stack.shift){
          let thisFile = err.stack.shift().getFileName();
          while (err.stack.length) {
            let stackEntry = err.stack.shift();
            callerFunction = stackEntry.getFileName();
            if (callerFunction && (callerFunction != thisFile)) {
              callerFunction=callerFunction.substring(callerFunction.lastIndexOf(Logger.seperator)+1);
              callerLine=stackEntry.getLineNumber();
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`Error on stack analysis, ${e}`);
      }      
      (Error as any).prepareStackTrace = originalFunc; 
      formatting+=`(${Logger.sanitizeToken(componentName)},${Logger.sanitizeToken(callerFunction)}:${Logger.sanitizeToken(callerLine)}) `;
    } else if (prependName) {
      formatting+=`(${Logger.sanitizeToken(componentName)},:) `;
    }
    //Render the record here rather than handing console.* a template plus trailing
    //arguments. This yields the whole record so continuation marking can be applied
    //below, and keeps the prefix - which carries user and component names - from ever
    //being read as a format template (MVD-7855).
    //Note: a directive inside the first loggable item is still a template. Call sites
    //must not interpolate untrusted data into it; pass it as an argument instead.
    const message = Logger.formatLoggableItems((loggableItems || []).map(Logger.sanitizeLoggableItem));
    //Mark continuation lines so that no embedded newline can produce a line that
    //looks like an independent, correctly-prefixed log record.
    const record = (formatting + message).replace(/\n/g, '\n' + Logger.continuationPrefix);
    if (minimumLevel === LogLevel.CRITICAL) {
      console.error(record);
    } else if (minimumLevel === LogLevel.WARN) {
      console.warn(record);
    } else {
      console.log(record);
    }

  };

  makeDefaultDestination(prependDate?:boolean, 
                         prependName?:boolean, 
                         prependLevel?:boolean,
                         prependProcess?:boolean,
                         prependUser?:boolean,
                         processStringPrefix?:string): (x:string,y:LogLevel,z:string) => void {
    let theLogger:Logger = this;
    if (processStringPrefix){
      Logger.processStringPrefix = processStringPrefix;
      this.updateProcessString();
    }
    return function(componentName:string, minimumLevel:LogLevel, ...loggableItems:any[]){
      let prependingStrings: string[] = Logger.createPrependingStrings(prependLevel, prependProcess, prependUser);
      if (theLogger.shouldLogInternal(componentName, minimumLevel)){
        theLogger.consoleLogInternal(componentName,minimumLevel,prependingStrings[minimumLevel],prependDate,prependName,
                                     ...loggableItems);
      }
    };
  };

  log(componentName:string, minimumLevel:LogLevel, ...loggableItems:any[]):void{
    this.noteComponentNameInternal(componentName);
    this.destinations.forEach(function (destinationCallback:any){
        destinationCallback(componentName, minimumLevel, ...loggableItems);
      });
  };

  setLogLevelForComponentPattern(componentNamePattern:string, level:LogLevel):void{
    let theLogger:Logger = this;
    let componentNameArray:any[] = Object.keys(this.configuration);
    var regex = new RegExp(componentNamePattern);
    this.previousPatterns.push(new RegExpLevel(regex, level));
    componentNameArray.filter(function(componentName) {
      return regex.test(componentName);
    }).forEach(function(componentName) {
      theLogger.configuration[componentName] = level;
    });
  };

  setLogLevelForComponentName(componentName:string, level:LogLevel|number):void{
    if (level >= LogLevel.CRITICAL && level <= LogLevel.TRACE) {
      this.configuration[componentName] = level;
    }
  }

  getComponentLevel(componentName:string):LogLevel{
    return this.configuration[componentName];
  }

  getConfig():any{
    return this.configuration;
  }

  private noteComponentNameInternal(componentName:string):void{
    if (!this.knownComponentNames.find( (name) => name == componentName)){
      this.knownComponentNames.push(componentName);
    }
  };

  private replayPatternsOnLogger(componentName:string): boolean{
    for (let i = this.previousPatterns.length-1; i>-1; i--) {
      var pattern = this.previousPatterns[i];
      if (pattern.regex.test(componentName)) {
        this.setLogLevelForComponentName(componentName, pattern.level);
        return true;
      }
    }
    return false;
  }

  makeComponentLogger(componentName:string, _messages?: MessageTable):ComponentLogger{
    let componentLogger:ComponentLogger|undefined = componentLoggers.get(componentName);
    if (componentLogger){
      this.consoleLogInternal("_internal",LogLevel.WARN,
                              `${Logger.processString}${Logger.username} ${LogLevel[1]}`,
                              true,true,
                              'Logger created with identical component name to pre-existing logger. _messages overlap may occur.');
    } else {
      if (_messages) {
        componentLogger = new ComponentLogger(this, componentName, _messages);
      } else {
        componentLogger = new ComponentLogger(this, componentName);
      }
      this.configuration[componentName] = LogLevel.INFO;
      componentLoggers.set(componentName, componentLogger as ComponentLogger);
      this.replayPatternsOnLogger(componentName);
    }
    return componentLogger;
  }

}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

