

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

export enum LogLevel {
  SEVERE,
  WARNING,
  INFO,
  FINE,
  FINER,
  FINEST,
}

export class ComponentLogger implements ZLUX.ComponentLogger {
  private parentLogger:Logger;
  private componentName:string;
  public SEVERE: number;
  public WARNING: number;
  public INFO: number;
  public FINE: number;
  public FINER: number;
  public FINEST: number;
  
  constructor(parentLogger:Logger,componentName:string){
    this.parentLogger = parentLogger;
    this.componentName = componentName;
    this.SEVERE = LogLevel.SEVERE;
    this.WARNING = LogLevel.WARNING;
    this.INFO = LogLevel.INFO;
    this.FINE = LogLevel.FINE;
    this.FINER = LogLevel.FINER;
    this.FINEST = LogLevel.FINEST;    
  }

  makeSublogger(componentNameSuffix:string): ComponentLogger {
    return new ComponentLogger(this.parentLogger,this.componentName+':'+componentNameSuffix);
  }

  log(minimumLevel:number, message:string):void { 
    this.parentLogger.log(this.componentName, minimumLevel, message);
  }

  severe(message:string):void { 
    this.parentLogger.log(this.componentName, LogLevel.SEVERE, message);
  }    
      
  info(message:string):void { 
    this.parentLogger.log(this.componentName, Logger.INFO, message);
  }

  warn(message:string):void { 
    this.parentLogger.log(this.componentName, Logger.WARNING, message);
  }

  debug(message:string):void { 
    this.parentLogger.log(this.componentName, Logger.FINE, message);
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
  private destinations: Array<(componentName:string, minimumLevel: LogLevel, message:string)=>void>;
  private configuration: {[key:string]:LogLevel};
  private componentLoggers:Map<string,ComponentLogger> = new Map();
  private previousPatterns: RegExpLevel[];
  private knownComponentNames:string[] = []; 
  public static SEVERE: number = LogLevel.SEVERE;
  public static WARNING: number = LogLevel.WARNING;
  public static INFO: number = LogLevel.INFO;
  public static FINE: number = LogLevel.FINE;
  public static FINER: number = LogLevel.FINER;
  public static FINEST: number = LogLevel.FINEST;
  
  constructor(){
    this.configuration = {};
    this.destinations = new Array<(componentName:string, minimumLevel: LogLevel, message:string)=>void>();    
    this.previousPatterns = new Array<RegExpLevel>();    
  }

  addDestination(destinationCallback:(componentName:string, minimumLevel: LogLevel, message:string)=>void):void {
    this.destinations.push(destinationCallback);
  }

  private shouldLogInternal(componentName:string, level:LogLevel):boolean{
    let configuredLevel:LogLevel|undefined = this.configuration[componentName];
    if (configuredLevel === undefined){
      configuredLevel = Logger.INFO;
    }
    return configuredLevel >= level;
  };

private consoleLogInternal(componentName:string,
                           minimumLevel:LogLevel,
                           message:string,
                           prependDate?:boolean,
                           prependName?:boolean,
                           prependLevel?:boolean):void {
    var formattedMessage = '[';
    if (prependDate) {
      var d = new Date();
      var msOffset = d.getTimezoneOffset()*60000;
      d.setTime(d.getTime()-msOffset);
      var dateString = d.toISOString();
      dateString = dateString.substring(0,dateString.length-1).replace('T',' ');
      formattedMessage += dateString+ ' ';
    }
    if (prependName) {
      formattedMessage += componentName+ ' ';
    }
    if (prependLevel) {
      formattedMessage += LogLevel[minimumLevel];
    }
    formattedMessage += "] - "+message;
    console.log(formattedMessage);
  };

  makeDefaultDestination(prependDate?:boolean, 
                                 prependName?:boolean, 
                                 prependLevel?:boolean): (x:string,y:LogLevel,z:string) => void {
    let theLogger:Logger = this;
    return function(componentName:string, minimumLevel:LogLevel, message:string){
      if (theLogger.shouldLogInternal(componentName, minimumLevel)){
        theLogger.consoleLogInternal(componentName,minimumLevel,message,prependDate,prependName,prependLevel);
      }
    };
  };

  log(componentName:string, minimumLevel:LogLevel, message:string):void{
    this.noteComponentNameInternal(componentName);
    this.destinations.forEach(function (destinationCallback:any){
        destinationCallback(componentName, minimumLevel, message);
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
    if (level >= LogLevel.SEVERE && level <= LogLevel.FINEST) {
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
      this.consoleLogInternal("<internal>",LogLevel.WARNING,'Logger created with identical component name to pre-existing logger. Messages overlap may occur.',true,false,true);
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

