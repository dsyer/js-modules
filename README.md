
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

```
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

But that's also kind of a hack, and it won't help you support CommonJS users with your library.