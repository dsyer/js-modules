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