# JavaScript Modules Primer

A module system is a tool for encapsulating library code into self-contained chunks that explicitly and deliberately export their public API. JavaScript has had a few different module systems over the years, but things seem to have settled down a bit, and while some of the older attempts are sometimes still seen, there are 3 main options to consider if you are writing a JavaScript library.

1. The newest and shiniest module system is the standard one that is part of the language now: [ECMAScript Modules](https://nodejs.org/api/esm.html), sometimes referred to as ESM, or ES6. It is supported by all modern browsers and recent versions of Node.js.
2. Before ES6 existed a lot of effort went into [CommonJS](https://nodejs.org/api/modules.html). It was *the* module system for Node.js for some time, and nearly all JavaScript libraries support it now. It is not supported natively in the browser.
3. The last option which is worth considering is "no module system". It might upset the purists but often works pretty well in the browser, and a lot of libraries ship this way.

We are going to look at a simple example of each of those options, just to see how they work, and then we are going to change the focus to a specific challenge of supporting all 3 in the same library. To make it more interesting, the example for that exercise will have an asynchronous initializer - some work that has to be done before the library API works, but has to be done asynchronously (e.g. by loading some data from a file or remote endpoint). This will lead to some additional unpleasantness and compromises.

- [JavaScript Modules Primer](#javascript-modules-primer)
	- [Simple ES6 Example](#simple-es6-example)
		- [File Name Hack](#file-name-hack)
		- [Import Maps](#import-maps)
	- [Hello CommonJS](#hello-commonjs)
		- [File Name Hack](#file-name-hack-1)
	- [Browser Globals](#browser-globals)
	- [CommonJS and Browser Globals Together](#commonjs-and-browser-globals-together)
	- [An Asynchronous Initializer](#an-asynchronous-initializer)
		- [Implementation of Initializer](#implementation-of-initializer)
	- [Something That Works with CommonJS](#something-that-works-with-commonjs)
		- [Sort Of...](#sort-of)
		- [Push the Async Concerns up the Stack](#push-the-async-concerns-up-the-stack)
		- [Expose the Initializer](#expose-the-initializer)
	- [CommonJS with an ES6 Wrapper](#commonjs-with-an-es6-wrapper)
		- [Browserify](#browserify)
	- [ES6 Core with a CommonJS Wrapper](#es6-core-with-a-commonjs-wrapper)
	- [Conclusions](#conclusions)

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

You can also use this simple library in the browser in exactly the same way (start a webserver with `python -m http.server 8000` if you need it):

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

### Import Maps

Modern browsers don't justy support ES6, they also have a way to map the library script locations to their names. This means they can be used with the same `import` in Node.js and in the browser. An example for our simple library would be:

```html
<html>
    <body>
        <h2>Month</h2>
        <script type="importmap">
            {
                "imports": {
                    "hello": "./hello.js"
                }
            }
        </script>
        <script type="module">
            import hello from 'hello';
            console.log(hello.hello());
        </script>
    </body>
</html>
```

It doesn't look all that impressive yet because the module is not defined as 'hello' in Node.js. We could publish `hello.js` as `hello` by moving it to `node_modules/hello/index.js`, and then the exact same code can be used in the browser and on the server. That's what most JavaScript libraries do - they have module names not file paths, and Node.js searches for the right file to load at runtime.

## Hello CommonJS

Node.js provides a global `require()` function that you use to load a library using the CommonJS module loader. It wraps the module code with a [wrapper](https://nodejs.org/api/modules.html#the-module-wrapper) and then calls it:

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

We have to re-write our `hello.js`. One simple way to do that would be to add the `hello` function to the `exports`:

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

You can't use it in its current form in the browser because there is no `exports` global variable in the browser.

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

It works in Node.js because of the first branch testing the existence of `module`, and in the browser because of the second branch. There are a few extra lines of code on top of what you need for CommonJS, but it might be worth it for maximum convenience for your users that mainly code for the browser.

> NOTE: in this last example we used `module.exports` instead of just `exports`. It's the same object. Some libraries actually replace `module.exports` with a function, instead of an object. For example if `module.exports = hello` above you could assign `var hello = require('./hello.js')` and call `hello()` directly.

## An Asynchronous Initializer

To make things more interesting we want the library module to have an asynchonrous initializer. This is quite a common use case, and arises naturally when learning about WebAssembly. To show how it works we are going  to create a library that translates date strings into month names. The data for the month names could be hard-coded in the library and then it wouldn't need an asynchronous initializer, but instead we are going to load it from a file. Here's the structure of an ES6 library `months.mjs` that does this:

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

We don't need to wait for the initializer because the module loader did that for us. We don't even need to know that there is an initializer, so it's not part of the public API. We can run `main.js` on the command line like this:

```
$ node main.mjs 2022-03-23
Initialized months
January
March
```

### Implementation of Initializer

You can find the source code for a working implementation of `months.mjs` in [GitHub](https://github.com/dsyer/js-modules/blob/main/months.mjs). The basic ingredients are some code to load the data (the asynchronous part) and some code to define the exported `monthFromDate()`. We start by extracting the data loading part to a separate function :

```javascript
async function bytes(path) {
  // ... read a file and suck out the content as a byte[]
}

let init = async function () {
    const MONTHS = new TextDecoder().decode(await bytes('months.txt'))
        .split("\n")
        .filter(word => word.length > 0);
    console.log("Initialized months");
    monthFromDate = function(date) {
        // ... some defensive code in case date is empty
        return MONTHS[new Date(date).getMonth()];
    };
}
```

We want the `bytes()` function to work in the browser, loading the data from a remote endpoint, and in Node.js, loading from a local file. We can do that with `fetch` in the browser and the `fs` module in Node.js:

```javascript
async function bytes(path) {
  if (typeof fetch !== "undefined") {
    return await fetch(path).then(response => response.arrayBuffer());
  }
  return await import('fs').then(fs => fs.readFileSync(path));
}
```

Note the use of the "dynamic import" for 'fs'. We can't use `import 'fs'` because that doesn't work in the browser and there is no way to make it conditional.

## Something That Works with CommonJS

The ES6 implementation `months.mjs` is not a CommonJS module. We need something different if we want to support CommonJS. In fact, we need to face the ugly fact that CommonJS is not an asynchronous module loader.

### Sort Of...

We might start with this:

```javascript
let monthFromDate;

let init = async function () {
  // ... initialize the months and monthFromDate
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

Because `init()` is asynchronous it only looks like it works because there is a pause between the `require()` and the call to `monthFromDate()`. And it doesn't work in the browser at all. E.g. you might try:

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

The `init()` is asynchronous, so `monthFromDate()` is not available until it has finished:

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
$ cat > main.js
var month = require('./months.js')
month.monthFromDate('2022-03-23')
$ node main.js
/home/dsyer/dev/scratch/js-modules/main.js:2
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

That forces the user of the library to face the facts, but it seems like it should be unnecessary because `monthFromDate()` as originally implemented is not asynchronous.

### Expose the Initializer

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

The user code now looks like this in the REPL:

```javascript
> var month = require('./months.js')
undefined
> await month.init().then(() => console.log(month.monthFromDate('2022-03-23')))
Initialized months
January
March
```

or in a script:

```
$ cat main.js
var month = require('./months.js');
const dateString = process.argv[2] ?? null;
month.init().then(() => console.log(month.monthFromDate(dateString)));
$ node main.js 2022-03-23
Initialized months
January
March
```

## CommonJS with an ES6 Wrapper

Starting with the CommonJS version of `months.js`, which already works in Node.js and in the browser like this:

```html
<html>
    <body>
        <h2>Month</h2>
        <script src="months.js"></script>
        <script>
            init().then(() => console.log(monthFromDate("2022-03-23")));
        </script>
    </body>
</html>
```

We can try and wrap it in an ES6 module:

```javascript
var month = require('./months.js')

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
```

but it doesn't work because there is no `require()` function in an ES6 module.

There's one last thing to try -- we can implement a module loader. Here is the code to read the CommonJS module as a raw string, and use `Function` to evaluate it:

```javascript
let month = {};
var script;

if (typeof fetch === 'undefined') {
  script = await import('fs').then(fs => fs.readFileSync('./months.js', {encoding: 'utf8'}));
} else {
  script = await fetch('./months.js').then(response => response.text()));
}

Function('return function(module, exports) {\n' +
  script
  + '\n}')()({exports:month}, month);

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
```

This works in `main.mjs` and in the browser:

```javascript
<html>
    <body>
        <h2>Month</h2>
        <script type="module">
            import monthFromDate from './months.mjs';
            console.log(monthFromDate("2022-03-23"));
        </script>
    </body>
</html>
```

It would break if the module we required itself needed to `require()` another module. We could try and fix that by defining our own `require()` function using the code above, but sadly this will not work because it has to be asynchronous (as can be seen from the presence of `await`), while CommonJS `require()` is synchronous. In Node.js there is a "module" built-in package that saves the day:

```javascript
await import('module').then(module => globalThis.require = module.createRequire(import.meta.url));

let month = require('./months.js');

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
```

but this won't work in the browser.

### Browserify

There is a Node.js tool called [browserify](https://github.com/browserify/browserify) that we can use to build a `require()` function for the browser.

```
$ npm install --no-save browserify
$ node_modules/browserify/bin/cmd.js -r ./months.js -s bundle > bundle.js
```

Then in a browser you could do this:

```html
<html>
	<body>
		<h2>Bundle</h2>
		<script src="bundle.js"></script>
		<script>
			bundle.init().then(() => console.log(bundle.monthFromDate('2022-03-23')));
		</script>
	</body>
</html>
```

It works because the generated `bundle.js` defines a `require()` function to load the named modules by running the code in the input source files.

We can use that `bundle.js` in our ES6 wrapper:

```javascript
let month;
if (typeof fetch === 'undefined') {
  await import('module').then(module => globalThis.require = module.createRequire(import.meta.url));
  month = require('./months.js');
} else {
  await fetch('./bundle.js').then(response => response.text()).then(script =>
    month = Function(script + ';\nreturn bundle;')()
  );
}

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
```

This will work in Node.js and in the browser.

Another approach that works is to use browserify to define a global `require()` in the browser:

```
$ node_modules/browserify/bin/cmd.js -r ./months.js -r ./hello.js | sed -e 's,"/,"./,g' > bundle.js
```

> NOTE: We had to fix the generated code with `sed` because it strips the leading `.` from relative module names.

and then in `months.mjs`:

```javascript
if (typeof fetch === 'undefined') {
   await import('module').then(module => globalThis.require = module.createRequire(import.meta.url));
 } else {
   await fetch('./bundle.js').then(response => response.text()).then(script =>
    globalThis.require = Function(script  + ';\nreturn require;')()
   );
 }
 
let month = require('./months.js');

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
```


## ES6 Core with a CommonJS Wrapper

The slightly good news is that ES6 `import` is asynchronous by definition so if we re-arrange the library into an ES6 module `months.mjs` (same as at the beginning) users can just import it. I.e. ES6 users can still use it just like before but the common folk will need their own wrapper (`months.js`):

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

It works in the browser with the global namespace:

```html
<html>
    <body>
        <h2>Month</h2>
        <script src="./months.js"></script>
        <script>
            init().then(() => console.log(monthFromDate("2022-03-23")));
        </script>
    </body>
</html>
```

but it also works (better) as an ES6 module:

```html
<html>
    <body>
        <h2>Month</h2>
        <script type="module">
            import monthFromDate from "./months.mjs";
            console.log(monthFromDate("2022-03-23"));
        </script>
    </body>
</html>
```

## Conclusions

We learned about 3 different ways to load modules in Javascript, and saw how each of them works (or doesn't work) in Node.js and in the browser. ES6 is part of the language specification, and is fully asynchronous, which turns out to be an advantage. CommonJS and plain browser globals are synchronous and that creates problems for libraries with asynchronous initializers. To create such a library that works in both Node.js and the browser is a challenge, and involves compomises. We also looked at 2 different ways of supporting the same library for all 3 module loaders - it is preferable to write the main library in ES6 and provide a wrapper into the CommonJS and browser globals, otherwise some extra tooling has to be introduced to generate code for the browser.