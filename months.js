let monthFromDate;
let MONTHS;
let calledInit = false;

async function bytes(path) {
  if (typeof fetch !== "undefined") {
    return await fetch(path).then(response => response.arrayBuffer());
  }
  return await import('fs').then(fs => fs.readFileSync(path));
}

let init = async function () {
  if (!calledInit) {
    calledInit = true;
    MONTHS = new TextDecoder().decode(await bytes('months.txt'))
      .split("\n")
      .filter(word => word.length > 0);
    console.log("Initialized months");
  }
}

monthFromDate = async function (date) {
  await init();
  if (!date) {
    date = null;
  }
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return MONTHS[date.getMonth()];
}

if (typeof module !== 'undefined' && module.exports)
  module.exports.monthFromDate = monthFromDate;
else
  this.monthFromDate = monthFromDate;
