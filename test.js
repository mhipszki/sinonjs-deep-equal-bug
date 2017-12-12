/*
  These tests demonstrate that in sinon.js v4.x
  `lib/sinon/util/core/deep-equal.js` breaks immediately
  when loaded
  and the global scope has a `document` property without `createElement` method

  NOTE: interestingly it is not actually the `deep-equal.js` module that makes sinon.js break
        but the library `samsam` which is in its dependency chain:

        sinon.js -> formatio -> samsam
          or
        sinon.js -> nise -> formatio -> samsam

        the code in `samsam` has an almost identical copy of the `isElement` method in `deep-equal.js`

        when `const div = ...` is moved to inside `iselement` method in there, `deep-equal.js` starts failing

        (see screenshots)

  NOTE: this is possibly true for all sinon.js versions and would need a separate test setup for each
        manually tried and noticed the bug first in sinon.js v1.17.7
*/

const clearModule = require('clear-module');

const test = useCase => {
  process.stdout.write(`🔍  trying to require sinon.js when ${useCase}`);
  try {
    require('sinon');
    process.stdout.write(' ✅  succeeded\n\n');
  } catch (error) {
    process.stdout.write(' ❌  failed\n\n');
    console.log(error);
    console.log('');
  }
};

// USE CASE #1
// 'document' property does not exist in global scope
delete global.document;
test(`global.document is '${typeof global.document}'`);

// invalidate Node.js's module cache to be able to require again sinon.js during the next test run
clearModule.all();

// USE CASE #2
// 'document' property exists in global scope and has 'createElement' method on it (like 'window.document' does in a browser)
global.document = { createElement: () => {} };
test(
  `global.document is '${typeof global.document}' with 'createElement' method`
);

// invalidate Node.js's module cache to be able to require again sinon.js during the next test run
clearModule.all();

// USE CASE #3
// 'document' property exists in global scope but does not have 'createElement' method on it
global.document = {};
test(
  `global.document is '${typeof global.document}' without 'createElement' method`
);

// invalidate Node.js's module cache to be able to require again sinon.js during the next test run
clearModule.all();

// USE CASE #4
// 'document' property exists in global scope but it is not an object
global.document = 'not an object';
test(`global.document is '${typeof global.document}' (not an object)`);
