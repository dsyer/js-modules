var month = require('./months.js');
month.init().then(() => console.log(month.monthFromDate('2022-03-23')));
