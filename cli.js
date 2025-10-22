#!/usr/bin/env node
/**
 * CLI for Google Calendar Obsidian Integration
 * Usage: node cli.js <date>
 */

const GoogleCalendarAPI = require('./googleCalendarAPI');

class CalendarCLI {
    constructor() {
        this.calendarAPI = new GoogleCalendarAPI();
    }

    /**
     * Format event time for display
     */
    formatTime(start) {
        try {
            let date;
            if (start.dateTime) {
                date = new Date(start.dateTime);
            } else if (start.date) {
                date = new Date(start.date);
            } else {
                return 'All Day';
            }
            
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return 'All Day';
        }
    }

    /**
     * Output events to stdout
     */
    outputEvents(events) {
        if (events.length === 0) {
            console.log('No events found for the selected date.');
            return;
        }

        events.forEach(event => {
            const time = this.formatTime(event.start);
            const name = event.summary || 'Untitled Event';
            const color = event.colorId || '1'; // Default to color 1 if no color specified
            
            // Mark boundary events for special formatting in template
            if (event.isBoundary) {
                console.log(`${time} - BOUNDARY:${name} - COLOR:${color}`);
            } else {
                console.log(`${time} - ${name} - COLOR:${color}`);
            }
        });
    }

    /**
     * Main CLI function
     */
    async run(dateString) {
        try {
            // Parse date
            const targetDate = new Date(dateString + 'T00:00:00');
            if (isNaN(targetDate.getTime())) {
                console.error('Invalid date format. Use YYYY-MM-DD');
                process.exit(1);
            }

            // Initialize API
            const success = await this.calendarAPI.initialize();
            if (!success) {
                console.error('Failed to initialize Google Calendar API');
                process.exit(1);
            }

            // Check authentication
            const isAuthenticated = await this.calendarAPI.isAuthenticated();
            if (!isAuthenticated) {
                console.error('Authentication required. Run: node main.js');
                process.exit(1);
            }

            // Get and output events
            const events = await this.calendarAPI.getEventsForCustomDay(targetDate);
            this.outputEvents(events);

        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
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

    const cli = new CalendarCLI();
    cli.run(args[0]);
}

module.exports = CalendarCLI;