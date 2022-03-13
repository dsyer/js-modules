import monthFromDate from './months.mjs';
const dateString = process.argv[2] ?? null;
console.log(monthFromDate(dateString));
