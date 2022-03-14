require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"./hello.js":[function(require,module,exports){
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

},{}],"./months.js":[function(require,module,exports){
let MONTHS;
let monthFromDate;

let calledInit = false;

async function bytes(path) {
  if (typeof fetch !== "undefined") {
    return await fetch(path).then(response => response.arrayBuffer());
  }
  return await import('fs').then(fs => fs.readFileSync(path));
}

let initFunc = async function (exports) {
  if (!calledInit) {
    calledInit = true;
    MONTHS = new TextDecoder().decode(await bytes('months.txt'))
      .split("\n")
      .filter(word => word.length > 0);
    console.log("Initialized months");
    monthFromDate = function(date) {
      if (!date) {
        date = null;
      }
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      return MONTHS[date.getMonth()];
    };
    console.log(monthFromDate());
    exports.monthFromDate = monthFromDate;
    exports.MONTHS = MONTHS;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  exports.init = () => initFunc(exports);
}
else {
  window.init = () => initFunc(window);
}

console.log(require('./hello.js').hello());

},{"./hello.js":"./hello.js"}]},{},[]);
