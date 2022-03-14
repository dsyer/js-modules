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