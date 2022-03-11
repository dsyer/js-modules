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

If you put the same code in HTML you can run it in the browser:

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