
# JavaScript Modules

A module system is a tool for encapsulating library code into self-contained chunks that explicitly and deliberately export their public API. JavaScript has had a few different module systems over the years, but things seem to have settled down a bit, and while some of the older attempts are sometimes still seen, there are 3 main options to consider if you are writing a JavaScript library.

1. The newest and shiniest module system is the standard one that is part of the language now: ECMAScript Modules, sometimes referred to as ESM, or ES6. It is supported by all modern browsers and recent versions of Node.js.
2. Before ES6 existed a lot of effort went into CommonJS. It was *the* module system for Node.js for some time, and nearly all JavaScript libraries support it now. It is not supported natively in the browser.
3. The last option which is worth considering is "no module system". It might upset the purists often works pretty well in the browser, and a lot of libraries that are aimed at the browser ship this way.

We are going to look at a simple example of each of those options, just to see how they work, and then we are going to change the focus to a specific challenge of supporting all 3 in the same library. To make it more interesting the example for that exercise will have an asynchronous initializer - some work that has to be done before the library API works, but has to be done asynchronously (e.g. by loading some data from a file or remote endpoint).

- [JavaScript Modules](#javascript-modules)
	- [Simple ES6 Example](#simple-es6-example)
		- [File Name Hack](#file-name-hack)
	- [Hello CommonJS](#hello-commonjs)
		- [File Name Hack](#file-name-hack-1)
	- [Browser Globals](#browser-globals)
	- [CommonJS and Browser Globals Together](#commonjs-and-browser-globals-together)
	- [An Asynchronous Initializer](#an-asynchronous-initializer)
	- [Module Types](#module-types)
	- [Something That Works with CommonJS](#something-that-works-with-commonjs)
		- [Sort Of...](#sort-of)
		- [Push the Async Concerns up the Stack](#push-the-async-concerns-up-the-stack)
		- [Make the User Pay](#make-the-user-pay)
	- [ES6 Core with a CommonJS Wrapper](#es6-core-with-a-commonjs-wrapper)

## Simple ES6 Example

Here is a simple ES6 module - it defines a function and exports it. We could put it in a file and call it `hello.js`:

```javascript
let hello = function() {
  return 'Hello World';
}
export hello
```

You can use it in Node.js as it is but only if you run with a `package.json` that has `type=module`:

```javascript
$ cat package.json
{"type":"module"}
$ node
> var hello = await import('./hello.js')
> hello()
'Hello World'
```

If you make a `main.js` you can import the module, choosing which of its public API features to expose, and then use it. You don't need the `await` that we used in the REPL because ES6 module imports are by definition asynchronous:

```javascript
import hello from './hello.js'
console.log(hello())
```

and we then run it on the command line:

```
$ node main.js
Hello World
```

You can also use our simple library in the browser in exactly the same way (start a webserver with `python -m http.server 8000` if you need it):

```html
<html>
  <body>
    <h2>Month</h2>
    <script type="module">
      import hello from './hello.js';
      console.log(hello());
    </script>
  </body>
</html>
```

### File Name Hack

With Node.js if you don't have a `package.json` you can use `.mjs` as a file extension. So rename all your `.js` files as `.mjs` and things just work with ES6. But not with CommonJS (it's one or the other).

## Hello CommonJS

Node.js provides a global `require()` function that you use to load a library. It wraps the module code with a [wrapper](https://nodejs.org/api/modules.html#the-module-wrapper):

```javascript
(function(exports, require, module, __filename, __dirname) {
// Module code actually lives in here
});
```
The parameters are:

* `exports` are the public API of the module
* `require` can be used to pull in other dependencies
* `module` is a subset of `exports`
* `__filename` and `__dirname` are convenience variables containing the path to the module being loaded

We have to re-write our `hello.js`. One way to do that would be simply to add the `hello` function to the `exports`:

```javascript
let hello = function() {
  return 'Hello World';
}
exports.hello = hello
```

Using it looks like this:

```javascript
$ node
> var hello = require('./hello.js');
> hello.hello()
'Hello World'
```

You can't use it in its current form in the browser because there is no `exports` global variable nin the browser.

### File Name Hack

Node.js recognises `.cjs` as a file extension for CommonJS modules. Thus you can override the behaviour in `package.json` and make sure that a modules can be loaded with `require()` and not `import`.

## Browser Globals

What many libraries do in the browser is simply add their public API to the global ("window") namespace. For example:

```javascript
let hello = function() {
  return 'Hello World';
}
```

The `hello` function is in the global namespace so it can be used in a different `<script/>` element in the browser:

```html
<html>

<body>
  <h2>Hello</h2>
  <script src="./hello.js"></script>
  <script>
    console.log(hello());
  </script>
</body>

</html>
```

To encapsulate its internal details a library will often wrap its code in a function and then call it. Then you can be more selective about which parts to expose globally. For example:

```javascript
(function() {
  let msg = 'Hello World';
  let hello = function () {
    return msg;
  }
  this.hello = hello;
})()
```

The assignment to `this` is to the window (global) namespace so it can be used in another `<script/>`. If we load this library into a `<script/>` it will expose `hello` but hide `msg`.

## CommonJS and Browser Globals Together

It is quite common to ship a library that is intended for use in both Node.js and in the browser. That's why you might see logic like this:

```javascript
(function() {
  let msg = 'Hello World';
  let hello = function () {
    return msg;
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports.hello = hello;
  else
    this.hello = hello
})()
```

and it works in Node.js because of the first branch testing the existence of `module`, and in the browser because of the second branch. There are a few extra lines of code on top of what you need for CommonJS, but it might be worth it for maximum convenience for your users that mainly code for the browser.

> NOTE: in this last example we used `module.exports` instead of just `exports`. It's the same object. Some libraries actually replace `module.exports` with a function, instead of an object. For example if `module.exports = hello` above you could assign `var hello = require('./hello.js')` and call `hello()` directly.

## An Asynchronous Initializer

To make things more interesting we want the library module to have an asynchonrous initializer. This is quite a common use case, and arose naturally for me when learning about WebAssembly. We are going  to create a library that translates date strings into month names. The data for the month names could be hard-coded in the library and than it wouldn't need an asynchronous initializer, but instead we are going to load it from a file. Here's the structure of an ES6 library `months.mjs` that does this:

```javascript
let monthFromDate;

let init = async function () {
  // .. do something asynchronus here using await and/or promises
  monthFromDate = function(date) {...}
}

await init();
export default monthFromDate;
```

We can `await init()` at the end of the module because by definition the module is loaded asynchronously. A `main.mjs` could be written very simply as

```javascript
import monthFromDate from './months.mjs';
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
```

We don't need to wait for the initializer because the module did that for us. We don't even need to know that there is an initializer - it's not part of the public API. We can run it on the command line like this:

```
$ node main.mjs 2022-03-23
Initialized months
January
March
```

> NOTE: You can find the source code for a working implementation of `months.js` in [GitHub](https://github.com/dsyer/js-modules).

## Module Types

If you change the name of the JS files to `*.js` it still works in the browser, but it's super ugly in Node.js:

```
$ node month.js 2022-03-23
(node:3860291) Warning: To load an ES module, set "type": "module" in the package.json or use the .mjs extension.
(Use `node --trace-warnings ...` to show where the warning was created)
/home/dsyer/dev/scratch/js-modules/months.js:33
await init();
^^^^^

SyntaxError: await is only valid in async functions and the top level bodies of modules
    at Object.compileFunction (node:vm:352:18)
    at wrapSafe (node:internal/modules/cjs/loader:1031:15)
    at Module._compile (node:internal/modules/cjs/loader:1065:27)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1153:10)
    at Module.load (node:internal/modules/cjs/loader:981:32)
    at Function.Module._load (node:internal/modules/cjs/loader:822:12)
    at ModuleWrap.<anonymous> (node:internal/modules/esm/translators:190:29)
    at ModuleJob.run (node:internal/modules/esm/module_job:185:25)
    at async Promise.all (index 0)
    at async ESMLoader.import (node:internal/modules/esm/loader:281:24)
```

You can rescue it just by adding `type=module` to `package.json`:

```
$ cat > package.json
{"type":"module"}
js-modules$ node month.js 2022-03-23
Initialized months
January
March
```

It even works in the REPL:

```javascript
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var month = await import('./months.js')
Initialized months
January
undefined
> month.monthFromDate("2022-03-23")
'March'
```

But that's also kind of a hack, and it won't help you support CommonJS users with your library:

```javascript
> var month = require('./months.js')
Uncaught:
Error [ERR_REQUIRE_ESM]: require() of ES Module /home/dsyer/dev/scratch/js-modules/months.js not supported.
Instead change the require of months.js in null to a dynamic import() which is available in all CommonJS modules.
    at __node_internal_captureLargerStackTrace (node:internal/errors:464:5)
    at new NodeError (node:internal/errors:371:5)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1128:19)
    at Module.load (node:internal/modules/cjs/loader:981:32)
    at Function.Module._load (node:internal/modules/cjs/loader:822:12)
    at Module.require (node:internal/modules/cjs/loader:1005:19)
    at require (node:internal/modules/cjs/helpers:102:18) {
  code: 'ERR_REQUIRE_ESM'
}
```

## Something That Works with CommonJS

### Sort Of...

So something that sort of works for our library is:

```javascript
let monthFromDate;

let init = async function () {
  // ... initialize the months
  exports.monthFromDate = monthFromDate;
}

init();
```

It works, but only sort of:

```
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var month = require('./months.js')
undefined
> Initialized months
January

> month.monthFromDate('2022-03-23')
'March'
```

Because `init()` is asynchronous it only works because there is a pause between the `require()` and the call to `monthFromDate()`. And it doesn't work in the browser at all because `require` and `exports` are not defined. E.g. you might try:

```html
<html>
  <body>
    <h2>Month</h2>
    <script src="./months.js"></script>
    <script>
      console.log(monthFromDate("2022-03-23"));
    </script>
  </body>
</html>
```

But that doesn't work, even though the `init()` function runs:

```
[x] Uncaught TypeError: monthFromDate is not a function
    at month.html:6
Initialized months
January
[x] Uncaught (in promise) ReferenceError: exports is not defined
    at init (months.js:29)
```

We can rescue it partially by adding some logic before trying to access `exports`:

```javascript
let monthFromDate;

let init = async function () {
  // ... initialize the months
  if (typeof module !== 'undefined' && module.exports)
    exports.monthFromDate = monthFromDate;
  else
    this.monthFromDate = monthFromDate;
}

init();
```

or we could add a parameter to the `init()` function:

```javascript
let month

let init = async function (exports) {
  // ... 
  exports.monthFromDate = monthFromDate;
}

if (typeof module !== 'undefined' && module.exports)
  init(module.exports);
else
  init(this)
```

But `init()` is still asynchronous, so `monthFromDate()` is not available until it has finished:

```
[x] Uncaught TypeError: monthFromDate is not a function
    at month.html:6
(anonymous) @ month.html:6
Initialized months
January
> monthFromDate('2022-03-23')
'March'
```

No doubt we could find a way to wait for the initialization to finish, but that would expose the details of our library to its users. We had the same problem in Node.js but we didn't see it in the REPL because of the delay while we typed the call to `monthFromDate()`:

```javascript
$ cat > month.js
var month = require('./months.js')
month.monthFromDate('2022-03-23')
$ node month.js 2022-03-23
/home/dsyer/dev/scratch/js-modules/month.js:3
console.log(month.monthFromDate(dateString));
                  ^

TypeError: month.monthFromDate is not a function
    at Object.<anonymous> (/home/dsyer/dev/scratch/js-modules/month.js:3:19)
    at Module._compile (node:internal/modules/cjs/loader:1101:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1153:10)
    at Module.load (node:internal/modules/cjs/loader:981:32)
    at Function.Module._load (node:internal/modules/cjs/loader:822:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)
    at node:internal/main/run_main_module:17:47
```

### Push the Async Concerns up the Stack

One solution might be to make `monthFromDate()` asynchronous. E.g.

```javascript
$ node
Welcome to Node.js v16.13.1.
Type ".help" for more information.
> var month = require('./months.js')
undefined
> await month.monthFromDate('2022-03-23')
Initialized months
January
'March'
```

and in the browser:

```html
<html>
  <body>
    <h2>Month</h2>
    <script src="./months.js"></script>
    <script>
      monthFromDate('2022-03-23').then(value => console.log(value));
    </script>
  </body>
</html>
```

That forces the user of the library to face the facts, but it seems like it should be unnecessary because `monthFromDate()` as originally implemented is not asynchronous. FWIW it seems to be the most common implementation choice for CommonJS modules in the wild. And it works.

### Make the User Pay

We have an asynchronous `init()` function, and the user is going to have to know about it. Sigh:

```javascript
let initFunc = async function(exports) {
  // ... all the code from the old library
  return init().then(
    () => {
      exports.monthFromDate = monthFromDate;
      return exports;
    }
  )
} 

if (typeof module !== 'undefined' && module.exports)
  module.exports.init = () => initFunc(exports)
else
  this.init = () => initFunc(this)
```

The user code now looks like this:

```javascript
> var month = require('./months.js')
undefined
> await month.init().then(() => console.log(month.monthFromDate('2022-03-23')))
Initialized months
January
March
```

or

```
$ cat month.js
var month = require('./months.js');
const dateString = process.argv[2] ?? null;
month.init().then(() => console.log(month.monthFromDate(dateString)));
$ node month.js 2022-03-23
Initialized months
January
March
```

## ES6 Core with a CommonJS Wrapper

The slightly good news is that ES6 `import` is asynchronous by definition so users can just import and go if we re-arrange the library into an ES6 module `months.mjs` (same as at the beginning). ES6 users can still use it just like before but the common folk will need their own wrapper (`months.js`):

```javascript
let initFunc = async function (exports) {
  return import('./months.mjs').then(
    months => {
      exports.monthFromDate = months.monthFromDate;
      return exports;
    }
  )
}

if (typeof module !== 'undefined' && module.exports)
  module.exports.init = () => initFunc(exports)
else
  this.init = () => initFunc(window)
```

Then they can deal with the asynchronous initializer explicitly:

```javascript
> var month = require('./months.js')
> await month.init().then(() => console.log(month.monthFromDate('2022-03-23')))
Initialized months
January
March
```