# sinon.js deep equal bug

This repo demonstrates via executable test cases that [sinon.js](https://github.com/sinonjs/sinon) `v4.x` breaks immediately when loaded and the global scope has a `document` property but without `createElement` method or not being an object.

## How to execute tests

Run `yarn` to install with locked in dependencies:

```
yarn
```

then run the tests via Node.js

```
node test.js
```

> NOTE: tested on Node v8.x LTS

## Reason

When sinon.js is loaded via a `require('sinon');` call in Node.js then its utility module `lib/sinon/util/core/deep-equal.js` is loaded immediately via several of its core API modules:

* `lib/sinon/match.js`
* `lib/sinon/mock.js`
* `lib/sinon/mock-expectation.js`
* `lib/sinon/call.js`
* `lib/sinon/spy.js`

The module `deep-equal.js` has a feature in its exported `deepEqual` method to determine if a comparable entity is a DOM node / element or not via its private `isElement` and `isDOMNode` methods.

```javascript
var div = typeof document !== 'undefined' && document.createElement('div');

function isDOMNode(obj) {
  var success = false;

  try {
    obj.appendChild(div);
    success = div.parentNode === obj;
  } catch (e) {
    return false;
  } finally {
    try {
      obj.removeChild(div);
    } catch (e) {
      // Remove failed, not much we can do about that
    }
  }

  return success;
}

function isElement(obj) {
  return div && obj && obj.nodeType === 1 && isDOMNode(obj);
}
```

The actual problem lies in the `var div = ...` line which executes immediately when the module is loaded into Node.js module cache.

## Test cases

The included test cases try to require `sinon` to test it in different contexts:

1. 'document' property does not exist in global scope
2. 'document' property exists in global scope and has 'createElement' method on it (like 'window.document' does in a browser)
3. 'document' property exists in global scope but does not have 'createElement' method on it
4. 'document' property exists in global scope but it is not an object

**NOTE**: interestingly it is not the `deep-equal.js` module that makes sinon.js break in the first place but the library [samsam](https://github.com/busterjs/samsam) which is in its dependency chain:

```
sinon.js -> formatio -> samsam
```

or

```
sinon.js -> nise -> formatio -> samsam
```

(see package dependencies in `yarn.lock`)

The code in `samsam` has an almost identical copy of the `isElement` method in `deep-equal.js`:

![samsam is failing](./samsam-failing.png?raw=true)

When `const div = ...` is moved to inside `isElement` method in `samsam` suddenly `deep-equal.js` starts failing:

![sinon is failing](./sinon-failing.png?raw=true)

## How it was discovered

This is possibly a bug in all existing sinon.js versions and would need a separate test setup for each.

I've manually tried and actually noticed the bug first in sinon.js `v1.17.7` when had a set up of `mocha`, `expect` and `sinon.js` running tests in pure Node.js (_not_ in the browser via Karma).

The following test suite was failing due to this bug:

```javascript
const sinon = require('sinon');

describe('test', () => {
  it('works', () => {
    expect(true).to.equal(true);
  });
});
```

and eventually it couldn't even get to the assertion part as `require('sinon');` was throwing an error before that could've happened.

After some debugging it turned out that a `document` property existed on the `global` variable in Node.js which represents the global scope (similarly to `window` in browsers) but this `document` property was just a plain (empty) `{}` object.

The existence of the `document` property in the global scope does not actually matter but only helped to discover the bug.

## Possible resolutions

The bug itself can be fixed quite simply just by _not_ running the following line plain inside the `deep-equal.js` module of sinon.js (and likewise in the `samsam` library):

```javascript
var div = typeof document !== 'undefined' && document.createElement('div');
```

which could actually be considered as bad pactice, for one at least because if the global scope changes for some reason (can happen quite easily in a `mocha` test environment where test cases are run in the very same scope ☠️ ) the value of `div` won't change i.e. can represent an invalid value, thus making `isElement` returning an incorrect value when called again after the change in context (e.g. a test case alters the global `document` object).

Rather than that, it could be moved inside the `isElement` and `isDOMNode` methods:

```javascript
function isDOMNode(obj) {
  var success = false;
  var div = typeof document !== 'undefined' && document.createElement('div');

  try {
    // ...
  }

  return success;
}

function isElement(obj) {
  var div = typeof document !== 'undefined' && document.createElement('div');
  return div && obj && obj.nodeType === 1 && isDOMNode(obj);
}
```

or simply just by being turned into a factory using the arrow syntax:

```javascript
var div = () =>
  typeof document !== 'undefined' && document.createElement('div');

function isDOMNode(obj) {
  var success = false;
  var el = div();

  try {
    obj.appendChild(el);
    success = el.parentNode === obj;
  } catch (e) {
    return false;
  } finally {
    try {
      obj.removeChild(el);
    } catch (e) {
      // Remove failed, not much we can do about that
    }
  }

  return success;
}

function isElement(obj) {
  const el = div();
  return el && obj && obj.nodeType === 1 && isDOMNode(obj);
}
```
