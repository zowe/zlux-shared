
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
const logModule = require('../../src/logging/logger.js');
const assert = require('assert');
const sinon = require('../../src/logging/node_modules/sinon'); // Sinon is a library for spies, stubs, and mocks

/* ------- The test checks --------- */

describe('Logger Tests', function() {
  let warnSpy;
  let infoSpy;
  let logger = new logModule.Logger();
  logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true,"Test the logger"));

  beforeEach(function() { // Intercept console.log calls
    warnSpy = sinon.spy(console, 'warn');
    infoSpy = sinon.spy(console, 'log');
  });

  afterEach(function() { // Restore the original console.log function
    warnSpy.restore();
    infoSpy.restore();
  });

  it('should warn about duplicate component names', function() {
    testDuplicate(logger);
    assert(warnSpy.calledWithMatch(/Logger created with identical component name/)); // Check if the expected message was logged
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
                  // Convert function to a string representation
                  return '[Function: ' + (arg.name || 'anonymous') + ']';
              } else if (typeof arg === 'object') {
                  // Convert object to a JSON string
                  try {
                      return JSON.stringify(arg);
                  } catch (error) {
                      return '[Circular]';
                  }
              } else {
                  // Convert other types directly to string
                  return String(arg);
              }
          }).join(' ') // Join all arguments of a call into a single string
      ).join('\n'); // Join all calls into a single string, separated by new lines
  }
  
  const allArgsAsString = argsToString(infoSpy.args);
  assert(/Look at my string here it is , and my int 45 , and my boolean true/.test(allArgsAsString));
  assert(/\[Function: myfunction\]/.test(allArgsAsString));
  assert(/and finally my object {"message":"this should look familiar"/.test(allArgsAsString));
  });
});

/* ------- The test actions  --------- */

function testDuplicate(logger) {
  logger.makeComponentLogger('foo');
  logger.makeComponentLogger('foo');
  /* should print
    2021-03-18 13:01:08.808 <Test the logger:processID> userID WARN(_internal,simpleTest.js:15) Logger created with identical component name to pre-existing logger.
    _messages overlap may occur.

    Note: the timestamp, the processID and userID are replaced by actual values.
  */
}

function testInfo(logger) {
  let log = logger.makeComponentLogger('testInfo');
  try {
    log.info('FYI this worked');
  } catch (e) {
    console.log('testInfo failed, e='+e);
  }
  /* should print
    2021-03-18 13:01:08.810 <Test the logger:processID> userID INFO (testInfo,simpleTest.js:25) FYI this worked

    Note: the timestamp, the processID and userID are replaced by actual values.
  */
}

function testArguments(logger) {
  let log = logger.makeComponentLogger('testArguments');
  let mystring = 'here it is';
  let myint = 45;
  let myboolean = true;
  let myfunction = function(num1, num2) {return num1+num2;};
  let myobject = {message: 'this should look familiar', mystring: mystring, myint: myint, myfunction: myfunction, myboolean: myboolean};
  log.info('Look at my string', mystring, ', and my int', myint, ', and my boolean', myboolean, ', and my function', myfunction, ', and finally my object', myobject);
  /* should print
    2021-03-18 13:01:08.811 <Test the logger:processID> userID INFO (testArguments,simpleTest.js:42) Look at my string here it is , and my int 45 , and my boolean true , and my function function(num1, num2) {return num1+num2;} , and finally my object { message: 'this should look familiar',
    mystring: 'here it is',
    myint: 45,
    myfunction: [Function: myfunction],
    myboolean: true }

    Note: the timestamp, the processID and userID are replaced by actual values.  
  */
}

function runTests() {
  testDuplicate(logger);
  testInfo(logger);
  testArguments(logger);
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
