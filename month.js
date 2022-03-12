var month = require('./months.js');
const dateString = process.argv[2] ?? null;
month.init().then(() => console.log(month.monthFromDate(dateString)));
