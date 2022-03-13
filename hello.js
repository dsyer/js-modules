(function () {
	let msg = 'Hello World';
	let hello = function () {
		return msg;
	}
	if (typeof module !== 'undefined' && module.exports)
		module.exports.hello = hello;
	else
		this.hello = hello
})()
