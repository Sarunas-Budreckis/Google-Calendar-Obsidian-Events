// Test if the debug function works in isolation
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, "debug.log");

function debug(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Log to console
    console.log('[TEST Template]', ...args);

    // Append to log file
    try {
        const logLine = `[${timestamp}] [TEST Template] ${message}\n`;
        fs.appendFileSync(logPath, logLine, 'utf8');
        console.log('Successfully wrote to log file');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

console.log('Starting test...');
debug('Test message 1');
debug('Test message 2 with object:', { test: 'value' });
debug('Test message 3');
console.log('Test complete');
