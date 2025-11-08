#!/usr/bin/env node
/**
 * Google Calendar Obsidian Integration - Main Script
 * Handles authentication and calendar querying
 */

const GoogleCalendarAPI = require('./googleCalendarAPI');
const DateUtils = require('./dateUtils');

class CalendarApp {
    constructor() {
        this.calendarAPI = new GoogleCalendarAPI();
    }

    /**
     * Parse date string to Date object
     */
    parseDate(dateString) {
        try {
            const date = new Date(dateString + 'T00:00:00');
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }
            return date;
        } catch (error) {
            console.error('Invalid date format. Please use YYYY-MM-DD format.');
            return null;
        }
    }

    /**
     * Query calendar and append events to note
     */
    async queryCalendarAndAppend(dateString = null) {
        try {
            let targetDate;
            
            if (dateString) {
                targetDate = this.parseDate(dateString);
                if (!targetDate) return;
            } else {
                // Interactive date selection
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                const dateInput = await new Promise(resolve => {
                    rl.question('Enter date (YYYY-MM-DD) or press Enter for today: ', resolve);
                });
                rl.close();

                if (dateInput.trim()) {
                    targetDate = this.parseDate(dateInput);
                    if (!targetDate) return;
                } else {
                    targetDate = new Date();
                }
            }

            // Initialize API
            const success = await this.calendarAPI.initialize();
            if (!success) {
                console.error('Failed to initialize Google Calendar API');
                return;
            }

            // Check authentication
            const isAuthenticated = await this.calendarAPI.isAuthenticated();
            if (!isAuthenticated) {
                console.error('Authentication required. Please run the authentication flow first.');
                return;
            }

            // Get events
            const events = await this.calendarAPI.getEventsForCustomDay(targetDate);
            
            if (events.length === 0) {
                console.log('No events found for the selected date.');
                return;
            }

            // Display events
            console.log(`\n📅 Events for ${targetDate.toLocaleDateString()}:`);
            console.log('=' .repeat(50));
            
            events.forEach(event => {
                const time = this.formatEventTime(event.start);
                const name = event.summary || 'Untitled Event';
                console.log(`${time} - ${name}`);
            });

        } catch (error) {
            console.error('Error querying calendar:', error.message);
        }
    }

    /**
     * Format event start time
     */
    formatEventTime(start) {
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
}

// Main execution
if (require.main === module) {
    const app = new CalendarApp();
    
    // Check if date provided as argument
    const args = process.argv.slice(2);
    const dateString = args.length > 0 ? args[0] : null;
    
    app.queryCalendarAndAppend(dateString).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Application error:', error.message);
        process.exit(1);
    });
}

module.exports = CalendarApp;