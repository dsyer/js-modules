let month = require('./months.js');

await month.init();

let monthFromDate = month.monthFromDate;

export {monthFromDate};
export default monthFromDate
