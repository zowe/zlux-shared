
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
const logModule = require('../../src/logging/logger.js');

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
  let logger = new logModule.Logger();
  logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true,"Test the logger"));
  testDuplicate(logger);
  testInfo(logger);
  testArguments(logger);
}

runTests();

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
