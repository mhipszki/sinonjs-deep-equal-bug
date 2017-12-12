# sinon.js deep equal bug

This repo demonstrates via runnable tests that [sinon.js](https://github.com/sinonjs/sinon) `v4.x` breaks immediately when loaded and the global scope has a `document` property but without `createElement` method or not being an object.

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

* 'document' property exists in global scope and has 'createElement' method on it (like 'window.document' does in a browser)
* 'document' property exists in global scope but does not have 'createElement' method on it
* 'document' property exists in global scope but it is not an object

**NOTE**: interestingly it is not actually the `deep-equal.js` module that makes sinon.js break
but the library `samsam` which is in its dependency chain:

```
sinon.js -> formatio -> samsam
```

or

```
sinon.js -> nise -> formatio -> samsam
```

The code in `samsam` has an almost identical copy of the `isElement` method in `deep-equal.js`:

![samsam is failing](./samsam-failing.png?raw=true)

When `const div = ...` is moved to inside `isElement` method in `samsam` suddenly `deep-equal.js` starts failing:

![sinon is failing](./sinon-failing.png?raw=true)

**NOTE**: this is possibly true for all existing sinon.js versions and would need a separate test setup for each but I've manually tried and actually noticed the bug first in sinon.js `v1.17.7`
