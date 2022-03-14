if (typeof fetch === 'undefined') {
  await import('module').then(module => globalThis.require = module.createRequire(import.meta.url));
} else {
  await fetch('./bundle.js').then(response => response.text()).then(script =>
    globalThis.require = Function(script.replace('"/months.js"', '"./months.js"').replace('"/hello.js"', '"./hello.js"')  + ';\nreturn require;')()
  );
}


let month = require('./months.js');

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
