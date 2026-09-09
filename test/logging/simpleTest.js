
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
  /* Since MVD-7855 the logger renders the record itself and hands console a single
     string, so trailing objects arrive here already inspected rather than live. The
     bytes written to the log are unchanged - this is the same util.inspect rendering
     console would have produced - but the assertion can no longer rely on the helper
     above JSON-stringifying a live object. Note the inspected form also retains
     myfunction, which JSON.stringify used to drop silently. */
  assert(/and finally my object \{/.test(allArgsAsString));
  assert(/message: 'this should look familiar'/.test(allArgsAsString));
  assert(/myfunction: \[Function: myfunction\]/.test(allArgsAsString));
  assert(/myboolean: true/.test(allArgsAsString));
  });
});

/* ------- MVD-7855: log injection / forging regression tests --------- */

describe('Logger log injection (MVD-7855)', function() {
  /* A record always begins with a timestamp; log readers, including the Zowe service
     logging standard in zowe-install-packaging bin/libs/common, rely on that to tell
     a new record from a continuation. No attacker-supplied text may produce a line
     that matches this at column 0. */
  const RECORD_START = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
  const FORGED = '\n2026-01-01 00:00:00.000 <ZWED:1> zwesvusr INFO (a,b:1) User=admin: login SUCCESS';

  let logSpy;
  let warnSpy;
  let logger = new logModule.Logger();
  logger.addDestination(logger.makeDefaultDestination(true, true, true, true, true, 'Test the logger'));

  beforeEach(function() {
    warnSpy = sinon.spy(console, 'warn');
    logSpy = sinon.spy(console, 'log');
  });

  afterEach(function() {
    warnSpy.restore();
    logSpy.restore();
  });

  function linesOf(spy) {
    return spy.args.map(callArgs => String(callArgs[0])).join('\n').split('\n');
  }

  function continuationLines(spy) {
    return linesOf(spy).filter((line, index) => index > 0);
  }

  it('does not let a CR-LF in the first loggable item forge a record', function() {
    logger.makeComponentLogger('injectFirstItem').info(`User bob${FORGED}, denied`);
    const forged = continuationLines(logSpy).filter(line => RECORD_START.test(line));
    assert.strictEqual(forged.length, 0, 'attacker text produced a forged record: ' + forged);
  });

  it('does not let a CR-LF in a substituted argument forge a record', function() {
    // The message-ID style used across zlux-server-framework: the template is trusted,
    // the substituted value is not.
    logger.makeComponentLogger('injectArgument').info('User=%s called %s', 'dave', `/ok${FORGED}`);
    const forged = continuationLines(logSpy).filter(line => RECORD_START.test(line));
    assert.strictEqual(forged.length, 0, 'attacker argument produced a forged record: ' + forged);
  });

  it('does not let a component name inject a line break into the record prefix', function() {
    logger.makeComponentLogger(`evil${FORGED}`).info('hello');
    const forged = continuationLines(logSpy).filter(line => RECORD_START.test(line));
    assert.strictEqual(forged.length, 0, 'component name produced a forged record: ' + forged);
  });

  it('escapes ANSI and other control characters', function() {
    logger.makeComponentLogger('escapeControls').info('start \x1b[31m \x07 \r end');
    const output = linesOf(logSpy).join('\n');
    assert(!/\x1b/.test(output), 'ESC survived into the record');
    assert(!/\x07/.test(output), 'BEL survived into the record');
    assert(!/\r/.test(output), 'CR survived into the record');
    assert(/\\x1B/.test(output), 'ESC was not escaped printably');
  });

  it('still renders legitimate multi-line messages, as marked continuations', function() {
    const log = logger.makeComponentLogger('multiLine', {
      'ZWED0021W': 'Missing parameters.\nHTTP Port given: %s\nHTTPS Port given: %s'
    });
    log.warn('ZWED0021W', 8543, 8544);
    const lines = linesOf(warnSpy);
    assert.strictEqual(lines.length, 3, 'expected three rendered lines, got ' + lines.length);
    assert(/HTTP Port given: 8543/.test(lines[1]));
    assert(/HTTPS Port given: 8544/.test(lines[2]));
    assert(!RECORD_START.test(lines[1]), 'continuation line looks like a new record');
    assert(!RECORD_START.test(lines[2]), 'continuation line looks like a new record');
  });

  it('still substitutes message table parameters', function() {
    const log = logger.makeComponentLogger('substitution', {
      'ZWED0197I': 'User=%s: service called: %s'
    });
    log.info('ZWED0197I', 'alice', '/plugins/x');
    assert(/ZWED0197I - User=alice: service called: \/plugins\/x/.test(linesOf(logSpy).join('\n')));
  });

  it('does not resolve inherited Object properties as message definitions', function() {
    const log = logger.makeComponentLogger('inheritedLookup', { 'ZWED0001I': 'a real message' });
    log.info('toString');
    const output = linesOf(logSpy).join('\n');
    assert(!/toString - /.test(output), 'inherited property was treated as a message definition');
  });

  /* The Desktop runs this logger in the browser, where node's util is unavailable and
     the built-in formatter is used instead. That path never executes under mocha, so
     force it here. 'private' in TypeScript is compile-time only, so the static is
     reachable at runtime. */
  describe('browser formatting fallback', function() {
    let savedNodeUtil;

    beforeEach(function() {
      savedNodeUtil = logModule.Logger.nodeUtil;
      logModule.Logger.nodeUtil = undefined;
    });

    afterEach(function() {
      logModule.Logger.nodeUtil = savedNodeUtil;
    });

    it('substitutes directives and escapes injected newlines', function() {
      logger.makeComponentLogger('browserSubstitution')
        .info('User=%s called %s', 'dave', `/ok${FORGED}`);
      const lines = linesOf(logSpy);
      assert(/User=dave called \/ok/.test(lines[0]), 'substitution failed: ' + lines[0]);
      const forged = lines.filter((line, index) => index > 0 && RECORD_START.test(line));
      assert.strictEqual(forged.length, 0, 'attacker argument produced a forged record: ' + forged);
    });

    it('renders %% literally and appends unmatched arguments', function() {
      logger.makeComponentLogger('browserExtras').info('100%% done', 'extra');
      assert(/100% done extra/.test(linesOf(logSpy).join('\n')));
    });

    it('leaves directives alone when arguments run out', function() {
      logger.makeComponentLogger('browserShortArgs').info('a=%s b=%s', 'one');
      assert(/a=one b=%s/.test(linesOf(logSpy).join('\n')));
    });

    it('falls back rather than throwing when util resolves to an empty stub', function() {
      // resolve.fallback maps 'util' to an empty module in the browser bundle. A
      // truthiness-only check would treat {} as usable and throw on every log call.
      logModule.Logger.nodeUtil = {};
      logger.makeComponentLogger('browserStubbedUtil').info('value=%s', 'ok');
      assert(/value=ok/.test(linesOf(logSpy).join('\n')));
    });
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
