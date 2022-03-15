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
