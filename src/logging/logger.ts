

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
process; /* get rid of TS error */

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
  
  constructor(parentLogger:Logger,componentName:string){
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
  }

  makeSublogger(componentNameSuffix:string): ComponentLogger {
    return new ComponentLogger(this.parentLogger,this.componentName+':'+componentNameSuffix);
  }

  log(minimumLevel:number, ...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, minimumLevel, ...loggableItems);
  }

  severe(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, LogLevel.CRITICAL, ...loggableItems);
  }
  
  critical(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, LogLevel.CRITICAL, ...loggableItems);
  }    
  
  info(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.INFO, ...loggableItems);
  }

  warn(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.WARN, ...loggableItems);
  }

  debug(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.DEBUG, ...loggableItems);
  }

  trace(...loggableItems:any[]):void { 
    this.parentLogger.log(this.componentName, Logger.TRACE, ...loggableItems);
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
  private componentLoggers:Map<string,ComponentLogger> = new Map();
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
  private static username: string = 'N/A';
  private static euid?: number;
  private static os?: any;
  private static offsetMs: number = 0;
  private static seperator: string = '/';
  private static useV8Tracing: boolean = false;
  
  constructor(offsetMs: number = 0){
    this.configuration = {};
    Logger.offsetMs = offsetMs;
    this.destinations = new Array<(componentName:string, minimumLevel: LogLevel, ...loggableItems:any[])=>void>();    
    this.previousPatterns = new Array<RegExpLevel>();
    if (!Logger.processString) {
      let runningInNode = new Function(`try { return this === global; } catch (error) { return false; }`);
      if (runningInNode()) {
        Logger.useV8Tracing = true;
        Logger.processString = `<ZWED:${process.pid}> `;
        Logger.os = require('os');
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
        Logger.processString = `<ZWED:> `;
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

        (Error as any).prepareStackTrace = function (err: Error, stack: any) {
          err;
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
      formatting+=`(${componentName},${callerFunction}:${callerLine}) `;
    } else if (prependName) {
      formatting+=`(${componentName},:) `;
    }
    if (minimumLevel === LogLevel.CRITICAL) {
      console.error(formatting, ...loggableItems);
    } else if (minimumLevel === LogLevel.WARN) {
      console.warn(formatting, ...loggableItems);
    } else {
      console.log(formatting, ...loggableItems);
    }
    
  };

  makeDefaultDestination(prependDate?:boolean, 
                         prependName?:boolean, 
                         prependLevel?:boolean,
                         prependProcess?:boolean,
                         prependUser?:boolean): (x:string,y:LogLevel,z:string) => void {
    let theLogger:Logger = this;
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

  makeComponentLogger(componentName:string):ComponentLogger{
    let componentLogger:ComponentLogger|undefined = this.componentLoggers.get(componentName);
    if (componentLogger){
      this.consoleLogInternal("_internal",LogLevel.WARN,
                              `${Logger.processString}${Logger.username} ${LogLevel[1]}`,
                              true,true,
                              'Logger created with identical component name to pre-existing logger. Messages overlap may occur.');
    } else {
      componentLogger = new ComponentLogger(this,componentName);
      this.configuration[componentName] = LogLevel.INFO;
      this.componentLoggers.set(componentName,componentLogger as ComponentLogger);
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

