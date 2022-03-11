var month = require('./months.js');
const dateString = process.argv[2] ?? null;
console.log(month.monthFromDate(dateString));
