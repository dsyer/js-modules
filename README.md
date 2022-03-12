

- [ES6 with File Name Hack](#es6-with-file-name-hack)
- [Module Types](#module-types)
- [Something That Works with CommonJS](#something-that-works-with-commonjs)
	- [Sort Of...](#sort-of)
	- [Push the Async Concerns up the Stack](#push-the-async-concerns-up-the-stack)
	- [Make the User Pay](#make-the-user-pay)
- [ES6 Core with a CommonJS Wrapper](#es6-core-with-a-commonjs-wrapper)

## ES6 with File Name Hack
If you don't have a `package.json` you can use `.mjs` as a file extension and share code between Node.js and the browser.
Here is `month.mjs`:

```javascript
import monthFromDate from './months.mjs';
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
```

and here it is running on the command line:

```
$ node month.mjs 2022-03-23
Initialized months
January
March
```

If you put the same code in HTML you can run it in the browser (you can start a webserver with `python -m http.server 8000` if you need it):

```html
<html>
	<body>
		<h2>Month</h2>
		<script type="importmap">
			{
				"imports": {
					"months": "./months.mjs"
				}
			}
		</script>
		<script type="module">
			import monthFromDate from 'months';
			console.log(monthFromDate("2022-03-23"));
		</script>
	</body>
</html>
```

We wrote the library module intentionally to have an asynchonrous initializer:

```javascript
let monthFromDate;

let init = async function () {
	// .. do something asynchronus here using await and/or promises
	monthFromDate = function(date) {...}
}

await init();
export default monthFromDate;
```

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

Node.js wraps CommonJS modules with a [wrapper](https://nodejs.org/api/modules.html#the-module-wrapper):

```javascript
(function(exports, require, module, __filename, __dirname) {
// Module code actually lives in here
});
```

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