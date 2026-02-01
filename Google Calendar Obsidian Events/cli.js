#!/usr/bin/env node
const GoogleCalendarAPI = require('./googleCalendarAPI');
const fsSync = require('fs');
const path = require('path');

const COLOR_MAP = {
    '1': '#828bc2', '2': '#33b679', '3': '#9e69af', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000'
};

class CalendarCLI {
    constructor() {
        this.calendarAPI = new GoogleCalendarAPI();
        this.logPath = path.join(__dirname, 'debug.log');
    }

    log(...args) {
        const now = new Date();
        // Convert to Central Time (America/Chicago)
        const timestamp = now.toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s*/, '$3-$1-$2 ') + ' CT';

        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        console.error(...args);

        try {
            const logLine = `[${timestamp}] [CLI] ${message}\n`;
            fsSync.appendFileSync(this.logPath, logLine, 'utf8');
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }

    formatTime(start) {
        try {
            const date = start.dateTime ? new Date(start.dateTime) :
                         start.date ? new Date(start.date) : null;

            if (!date) return 'All Day';

            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return 'All Day';
        }
    }

    getColorSquare(colorId, eventName = '') {
        // Hardcoded override: Sleep and Wake Up events should always be grey (#7c7c7c)
        const nameLower = eventName ? eventName.toLowerCase() : '';
        if (nameLower.includes('sleep') || nameLower.includes('wake up')) {
            return `<span style="display: inline-block; width: 12px; height: 12px; background-color: #7c7c7c; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
        }

        // Hardcoded override: events without explicit color (using default calendar color) should be #00aaff
        let color;
        if (!colorId || colorId === '') {
            color = '#00aaff';
        } else {
            color = COLOR_MAP[colorId] || COLOR_MAP['1'];
        }
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }

    formatEventLine(event) {
        const time = this.formatTime(event.start);
        const name = event.summary || 'Untitled Event';
        const color = event.colorId || '';  // Empty string for default calendar color
        const colorSquare = this.getColorSquare(color, name);
        return `${time} - ${colorSquare} **${name}**`;
    }

    outputEvents(events) {
        this.log(`\n=== CLI: Fetched ${events.length} events ===`);

        if (events.length === 0) {
            this.log('No events found for the selected date.');
            console.log('No events found for the selected date.');
            return;
        }

        events.forEach((event, idx) => {
            const time = this.formatTime(event.start);
            const name = event.summary || 'Untitled Event';
            const color = event.colorId || '';  // Empty string for default calendar color

            this.log(`  [${idx}] ${time} - ${name} (color:${color || 'default'}${event.isBoundary ? ', boundary' : ''})`);

            const prefix = event.isBoundary ? 'BOUNDARY:' : '';
            console.log(`${time} - ${prefix}${name} - COLOR:${color}`);
        });

        this.log('=== CLI: Done ===\n');
    }

    async run(dateString) {
        this.log(`\n========================================`);
        this.log(`=== NEW CLI EXECUTION: ${dateString} ===`);
        this.log(`========================================`);

        // Parse date
        const targetDate = new Date(dateString + 'T00:00:00');
        if (isNaN(targetDate.getTime())) {
            this.log('ERROR: Invalid date format');
            console.error('Invalid date format. Use YYYY-MM-DD');
            process.exit(1);
        }

        this.log(`Parsed date: ${targetDate.toISOString()}`);

        // Initialize API
        this.log('Initializing Google Calendar API...');
        const success = await this.calendarAPI.initialize();
        if (!success) {
            this.log('ERROR: Failed to initialize API');
            console.error('Failed to initialize Google Calendar API');
            process.exit(1);
        }

        this.log('API initialized successfully');

        // Get events
        this.log('Fetching events...');
        let events;
        try {
            events = await this.calendarAPI.getEventsForCustomDay(targetDate);
        } catch (error) {
            if (error && error.message === 'AUTH_PENDING') {
                this.log('Auth pending; link should be provided in output.');
                return;
            }
            throw error;
        }

        // Update file or output events
        this.outputEvents(events);
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node cli.js <date>');
        console.error('Example: node cli.js 2024-10-22');
        process.exit(1);
    }

    const date = args[0];
    const cli = new CalendarCLI();
    cli.run(date).catch(error => {
        console.error('CLI Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    });
}

module.exports = CalendarCLI;
