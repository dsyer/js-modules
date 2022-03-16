import tap from 'tap';
import { execSync } from 'child_process';
const test = tap.test;
const ok = tap.ok;

test('execute main.js', async () => {
	var logs = new String(execSync("node main.js 2022-03-23"));
	return ok(logs == 'Initialized months\nJanuary\nMarch\n', "Logs: " + logs);
});

test('execute main.mjs', async () => {
	var logs = new String(execSync("node main.mjs 2022-03-23"));
	return ok(logs == 'Initialized months\nJanuary\nMarch\n', "Logs: " + logs);
});