
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
const logModule = require('../../src/logging/logger.js');
const assert = require('assert');
const sinon = require('sinon');

/* ------- The test checks --------- */

describe('Logger Tests', function() {
  let warnSpy;
  let infoSpy;
  let logger = new logModule.Logger();
  logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true,"Test the logger"));

  beforeEach(function() {
    warnSpy = sinon.spy(console, 'warn');
    infoSpy = sinon.spy(console, 'log');
  });

  afterEach(function() {
    warnSpy.restore();
    infoSpy.restore();
  });

  it('should warn about duplicate component names', function() {
    testDuplicate(logger);
    assert(warnSpy.calledWithMatch(/Logger created with identical component name/));
  });

  it('should log informational messages correctly', function() {
    testInfo(logger);
    assert(infoSpy.calledWithMatch(/FYI this worked/));
  });

  it('should correctly log messages with various arguments', function() {
    testArguments(logger);
    
    function argsToString(args) {
      return args.map(callArgs => 
          callArgs.map(arg => {
              if (typeof arg === 'function') {
                  return '[Function: ' + (arg.name || 'anonymous') + ']';
              } else if (typeof arg === 'object') {
                  try {
                      return JSON.stringify(arg);
                  } catch (error) {
                      return '[Circular]';
                  }
              } else {
                  return String(arg);
              }
          }).join(' ')
      ).join('\n');
    }
  
    const allArgsAsString = argsToString(infoSpy.args);
    assert(/Look at my string here it is , and my int 45 , and my boolean true/.test(allArgsAsString));
    assert(/\[Function: myfunction\]/.test(allArgsAsString));
    assert(/and finally my object {"message":"this should look familiar","mystring":"here it is","myint":45,"myboolean":true}/.test(allArgsAsString));
  });
});

describe('Logger Module Exports', function() {
  it('should export Logger class', function() {
    assert.strictEqual(typeof logModule.Logger, 'function');
  });

  it('should export ComponentLogger class', function() {
    assert.strictEqual(typeof logModule.ComponentLogger, 'function');
  });

  it('should export LogLevel enum', function() {
    assert.ok(logModule.LogLevel);
    assert.strictEqual(logModule.LogLevel.CRITICAL, 0);
    assert.strictEqual(logModule.LogLevel.WARN, 1);
    assert.strictEqual(logModule.LogLevel.INFO, 2);
    assert.strictEqual(logModule.LogLevel.DEBUG, 3);
    assert.strictEqual(logModule.LogLevel.FINER, 4);
    assert.strictEqual(logModule.LogLevel.TRACE, 5);
  });
});

describe('Logger Class', function() {
  let logger;

  beforeEach(function() {
    logger = new logModule.Logger();
  });

  describe('constructor', function() {
    it('should create a Logger instance', function() {
      assert.ok(logger);
    });

    it('should initialize knownComponentNames as empty array', function() {
      assert.ok(Array.isArray(logger.knownComponentNames));
      assert.strictEqual(logger.knownComponentNames.length, 0);
    });

    it('should initialize destinations as empty array', function() {
      assert.ok(Array.isArray(logger.destinations));
      assert.strictEqual(logger.destinations.length, 0);
    });

    it('should initialize previousPatterns as empty array', function() {
      assert.ok(Array.isArray(logger.previousPatterns));
      assert.strictEqual(logger.previousPatterns.length, 0);
    });

    it('should accept offset parameter', function() {
      var offsetLogger = new logModule.Logger(5000);
      assert.ok(offsetLogger);
    });
  });

  describe('static log level constants', function() {
    it('should have CRITICAL = 0', function() {
      assert.strictEqual(logModule.Logger.CRITICAL, 0);
    });

    it('should have SEVERE = CRITICAL', function() {
      assert.strictEqual(logModule.Logger.SEVERE, logModule.Logger.CRITICAL);
    });

    it('should have WARN = 1', function() {
      assert.strictEqual(logModule.Logger.WARN, 1);
    });

    it('should have WARNING = WARN', function() {
      assert.strictEqual(logModule.Logger.WARNING, logModule.Logger.WARN);
    });

    it('should have INFO = 2', function() {
      assert.strictEqual(logModule.Logger.INFO, 2);
    });

    it('should have DEBUG = 3', function() {
      assert.strictEqual(logModule.Logger.DEBUG, 3);
    });

    it('should have FINE = DEBUG', function() {
      assert.strictEqual(logModule.Logger.FINE, logModule.Logger.DEBUG);
    });

    it('should have FINER = 4', function() {
      assert.strictEqual(logModule.Logger.FINER, 4);
    });

    it('should have TRACE = 5', function() {
      assert.strictEqual(logModule.Logger.TRACE, 5);
    });

    it('should have FINEST = TRACE', function() {
      assert.strictEqual(logModule.Logger.FINEST, logModule.Logger.TRACE);
    });
  });

  describe('addDestination', function() {
    it('should add a destination callback', function() {
      logger.addDestination(function() {});
      assert.strictEqual(logger.destinations.length, 1);
    });

    it('should support multiple destinations', function() {
      logger.addDestination(function() {});
      logger.addDestination(function() {});
      assert.strictEqual(logger.destinations.length, 2);
    });
  });

  describe('makeDefaultDestination', function() {
    it('should return a function', function() {
      var dest = logger.makeDefaultDestination(true, true, true, true, true);
      assert.strictEqual(typeof dest, 'function');
    });

    it('should accept processStringPrefix parameter', function() {
      var dest = logger.makeDefaultDestination(true, true, true, true, true, 'MYAPP');
      assert.strictEqual(typeof dest, 'function');
    });
  });

  describe('makeComponentLogger', function() {
    it('should return a ComponentLogger instance', function() {
      var compLogger = logger.makeComponentLogger('testComp');
      assert.ok(compLogger instanceof logModule.ComponentLogger);
    });

    it('should set default log level to INFO', function() {
      logger.makeComponentLogger('defaultLevel');
      assert.strictEqual(logger.configuration['defaultLevel'], logModule.LogLevel.INFO);
    });

    it('should return same logger for duplicate component name', function() {
      var log1 = logger.makeComponentLogger('dupComp');
      var log2 = logger.makeComponentLogger('dupComp');
      assert.strictEqual(log1, log2);
    });
  });

  describe('setLogLevelForComponentName', function() {
    it('should set log level for a component', function() {
      logger.makeComponentLogger('setLevel');
      logger.setLogLevelForComponentName('setLevel', logModule.LogLevel.DEBUG);
      assert.strictEqual(logger.configuration['setLevel'], logModule.LogLevel.DEBUG);
    });

    it('should not set level below CRITICAL', function() {
      logger.makeComponentLogger('belowMin');
      logger.setLogLevelForComponentName('belowMin', -1);
      assert.strictEqual(logger.configuration['belowMin'], logModule.LogLevel.INFO);
    });

    it('should not set level above TRACE', function() {
      logger.makeComponentLogger('aboveMax');
      logger.setLogLevelForComponentName('aboveMax', 99);
      assert.strictEqual(logger.configuration['aboveMax'], logModule.LogLevel.INFO);
    });
  });

  describe('setLogLevelForComponentPattern', function() {
    it('should set level for matching components', function() {
      logger.makeComponentLogger('org.zowe.foo');
      logger.makeComponentLogger('org.zowe.bar');
      logger.makeComponentLogger('com.other.baz');
      logger.setLogLevelForComponentPattern('org\\.zowe\\..*', logModule.LogLevel.DEBUG);
      assert.strictEqual(logger.configuration['org.zowe.foo'], logModule.LogLevel.DEBUG);
      assert.strictEqual(logger.configuration['org.zowe.bar'], logModule.LogLevel.DEBUG);
      assert.strictEqual(logger.configuration['com.other.baz'], logModule.LogLevel.INFO);
    });

    it('should apply pattern to future loggers via replayPatternsOnLogger', function() {
      logger.setLogLevelForComponentPattern('future\\..*', logModule.LogLevel.TRACE);
      logger.makeComponentLogger('future.component');
      assert.strictEqual(logger.configuration['future.component'], logModule.LogLevel.TRACE);
    });
  });

  describe('getComponentLevel', function() {
    it('should return configured level', function() {
      logger.makeComponentLogger('getLevel');
      assert.strictEqual(logger.getComponentLevel('getLevel'), logModule.LogLevel.INFO);
    });

    it('should return undefined for unknown component', function() {
      assert.strictEqual(logger.getComponentLevel('unknown'), undefined);
    });
  });

  describe('getConfig', function() {
    it('should return configuration object', function() {
      logger.makeComponentLogger('conf1');
      var config = logger.getConfig();
      assert.ok(config);
      assert.strictEqual(config['conf1'], logModule.LogLevel.INFO);
    });
  });

  describe('shouldLogInternal', function() {
    it('should return true when level is at or below configured level', function() {
      logger.makeComponentLogger('shouldLog');
      assert.strictEqual(logger.shouldLogInternal('shouldLog', logModule.LogLevel.CRITICAL), true);
      assert.strictEqual(logger.shouldLogInternal('shouldLog', logModule.LogLevel.WARN), true);
      assert.strictEqual(logger.shouldLogInternal('shouldLog', logModule.LogLevel.INFO), true);
    });

    it('should return false when level is above configured level', function() {
      logger.makeComponentLogger('shouldNotLog');
      assert.strictEqual(logger.shouldLogInternal('shouldNotLog', logModule.LogLevel.DEBUG), false);
      assert.strictEqual(logger.shouldLogInternal('shouldNotLog', logModule.LogLevel.TRACE), false);
    });

    it('should default to INFO for unknown component', function() {
      assert.strictEqual(logger.shouldLogInternal('unknownComp', logModule.LogLevel.INFO), true);
      assert.strictEqual(logger.shouldLogInternal('unknownComp', logModule.LogLevel.DEBUG), false);
    });
  });

  describe('log', function() {
    it('should call destination callbacks', function() {
      var called = false;
      var receivedComponent, receivedLevel;
      logger.addDestination(function(componentName, level) {
        called = true;
        receivedComponent = componentName;
        receivedLevel = level;
      });
      logger.log('myComp', logModule.LogLevel.INFO, 'test message');
      assert.strictEqual(called, true);
      assert.strictEqual(receivedComponent, 'myComp');
      assert.strictEqual(receivedLevel, logModule.LogLevel.INFO);
    });

    it('should call all destinations', function() {
      var count = 0;
      logger.addDestination(function() { count++; });
      logger.addDestination(function() { count++; });
      logger.log('comp', logModule.LogLevel.INFO, 'msg');
      assert.strictEqual(count, 2);
    });

    it('should track component name in knownComponentNames', function() {
      logger.addDestination(function() {});
      logger.log('newComp', logModule.LogLevel.INFO, 'msg');
      assert.ok(logger.knownComponentNames.includes('newComp'));
    });
  });

  describe('toggleV8Tracing', function() {
    it('should toggle V8 tracing', function() {
      var initial = logModule.Logger.useV8Tracing;
      var result = logger.toggleV8Tracing();
      assert.strictEqual(result, !initial);
      // Toggle back
      logger.toggleV8Tracing();
    });
  });
});

describe('ComponentLogger', function() {
  let logger;
  let compLogger;
  let logSpy;

  beforeEach(function() {
    logger = new logModule.Logger();
    logSpy = sinon.spy(console, 'log');
    sinon.spy(console, 'warn');
    sinon.spy(console, 'error');
    logger.addDestination(logger.makeDefaultDestination(true, true, true, true, true, 'TEST'));
    compLogger = logger.makeComponentLogger('testComponent');
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('log level properties', function() {
    it('should have CRITICAL level', function() {
      assert.strictEqual(compLogger.CRITICAL, logModule.LogLevel.CRITICAL);
    });

    it('should have SEVERE as alias for CRITICAL', function() {
      assert.strictEqual(compLogger.SEVERE, logModule.LogLevel.CRITICAL);
    });

    it('should have WARN level', function() {
      assert.strictEqual(compLogger.WARN, logModule.LogLevel.WARN);
    });

    it('should have WARNING as alias for WARN', function() {
      assert.strictEqual(compLogger.WARNING, logModule.LogLevel.WARN);
    });

    it('should have INFO level', function() {
      assert.strictEqual(compLogger.INFO, logModule.LogLevel.INFO);
    });

    it('should have DEBUG level', function() {
      assert.strictEqual(compLogger.DEBUG, logModule.LogLevel.DEBUG);
    });

    it('should have FINE as alias for DEBUG', function() {
      assert.strictEqual(compLogger.FINE, logModule.LogLevel.DEBUG);
    });

    it('should have FINER level', function() {
      assert.strictEqual(compLogger.FINER, logModule.LogLevel.FINER);
    });

    it('should have TRACE level', function() {
      assert.strictEqual(compLogger.TRACE, logModule.LogLevel.TRACE);
    });

    it('should have FINEST as alias for TRACE', function() {
      assert.strictEqual(compLogger.FINEST, logModule.LogLevel.TRACE);
    });
  });

  describe('logging methods', function() {
    it('info should log at INFO level', function() {
      compLogger.info('info message');
      assert(logSpy.calledWithMatch(/info message/));
    });

    it('warn should log at WARN level', function() {
      compLogger.warn('warn message');
      assert(console.warn.calledWithMatch(/warn message/));
    });

    it('critical should log at CRITICAL level', function() {
      compLogger.critical('critical message');
      assert(console.error.calledWithMatch(/critical message/));
    });

    it('severe should log at CRITICAL level', function() {
      compLogger.severe('severe message');
      assert(console.error.calledWithMatch(/severe message/));
    });

    it('debug should not log when level is INFO (default)', function() {
      compLogger.debug('debug message');
      assert(!logSpy.calledWithMatch(/debug message/));
    });

    it('debug should log when level is set to DEBUG', function() {
      logger.setLogLevelForComponentName('testComponent', logModule.LogLevel.DEBUG);
      compLogger.debug('debug now visible');
      assert(logSpy.calledWithMatch(/debug now visible/));
    });

    it('trace should not log when level is INFO (default)', function() {
      compLogger.trace('trace message');
      assert(!logSpy.calledWithMatch(/trace message/));
    });

    it('trace should log when level is set to TRACE', function() {
      logger.setLogLevelForComponentName('testComponent', logModule.LogLevel.TRACE);
      compLogger.trace('trace now visible');
      assert(logSpy.calledWithMatch(/trace now visible/));
    });
  });

  describe('makeSublogger', function() {
    it('should create a sublogger with combined name', function() {
      var sub = compLogger.makeSublogger('sub1');
      assert.ok(sub);
      assert.strictEqual(sub.componentName, 'testComponent:sub1');
    });

    it('should inherit parent logger reference', function() {
      var sub = compLogger.makeSublogger('sub2');
      assert.strictEqual(sub.parentLogger, logger);
    });
  });

  describe('message substitution', function() {
    it('should substitute message key with message text', function() {
      var messages = { 'MSG001': 'This is message one' };
      var msgLogger = logger.makeComponentLogger('msgComp', messages);
      msgLogger.info('MSG001');
      assert(logSpy.calledWithMatch(/MSG001 - This is message one/));
    });

    it('should not substitute when key is not in messages', function() {
      var messages = { 'MSG001': 'This is message one' };
      var msgLogger = logger.makeComponentLogger('msgComp2', messages);
      msgLogger.info('not a key');
      assert(logSpy.calledWithMatch(/not a key/));
    });
  });

  describe('_setMessages', function() {
    it('should update messages table', function() {
      var newMessages = { 'NEW001': 'New message' };
      compLogger._setMessages(newMessages);
      assert.strictEqual(compLogger._messages, newMessages);
    });

    it('should propagate to subloggers', function() {
      var sub = compLogger.makeSublogger('propSub');
      var newMessages = { 'NEW002': 'Propagated' };
      compLogger._setMessages(newMessages);
      assert.strictEqual(sub._messages, newMessages);
    });
  });
});

/* ------- The test actions  --------- */

function testDuplicate(logger) {
  logger.makeComponentLogger('foo');
  logger.makeComponentLogger('foo');
}

function testInfo(logger) {
  let log = logger.makeComponentLogger('testInfo');
  try {
    log.info('FYI this worked');
  } catch (e) {
    console.log('testInfo failed, e='+e);
  }
}

function testArguments(logger) {
  let log = logger.makeComponentLogger('testArguments');
  let mystring = 'here it is';
  let myint = 45;
  let myboolean = true;
  let myfunction = function(num1, num2) {return num1+num2;};
  let myobject = {message: 'this should look familiar', mystring: mystring, myint: myint, myfunction: myfunction, myboolean: myboolean};
  log.info('Look at my string', mystring, ', and my int', myint, ', and my boolean', myboolean, ', and my function', myfunction, ', and finally my object', myobject);
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
