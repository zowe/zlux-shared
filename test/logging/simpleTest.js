const logModule = require('../../src/logging/logger.js');

function testDuplicate(logger) {
  logger.makeComponentLogger('foo');
  logger.makeComponentLogger('foo');
  /* should print

     [2018-11-29 17:54:43.395 WARNING] - Logger created with identical component name to pre-existing logger. Messages overlap may occur.
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

     [2018-11-29 17:54:43.400 testInfo INFO] - FYI this worked
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

     [2018-11-29 17:54:43.401 testArguments INFO] - Look at my string here it is , and my int 45 , and my boolean true , and my function function(num1, num2) {return num1+num2;} , and finally my object { message: 'this should look familiar',
     mystring: 'here it is',
     myint: 45,
     myfunction: [Function: myfunction],
     myboolean: true }

   */
}

function runTests() {
  let logger = new logModule.Logger();
  logger.addDestination(logger.makeDefaultDestination(true,true,true));
  testDuplicate(logger);
  testInfo(logger);
  testArguments(logger);
}

runTests();
