#!/usr/bin/env node
/**
 * CLI for Google Calendar Obsidian Integration
 * Usage: node cli.js <date>
 */

const GoogleCalendarAPI = require('./googleCalendarAPI');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CalendarCLI {
    constructor() {
        this.calendarAPI = new GoogleCalendarAPI();
        this.logPath = path.join(__dirname, 'debug.log');
    }

    /**
     * Log to both stderr and log file
     */
    log(...args) {
        const timestamp = new Date().toISOString();
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        // Log to stderr (shows as Notice in Obsidian)
        console.error(...args);

        // Append to log file
        try {
            const logLine = `[${timestamp}] [CLI] ${message}\n`;
            fsSync.appendFileSync(this.logPath, logLine, 'utf8');
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
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
        this.log(`\n=== CLI: Fetched ${events.length} events from Google Calendar ===`);

        if (events.length === 0) {
            this.log('No events found for the selected date.');
            console.log('No events found for the selected date.');
            return;
        }

        this.log('--- Events to output ---');
        events.forEach((event, idx) => {
            const time = this.formatTime(event.start);
            const name = event.summary || 'Untitled Event';
            const color = event.colorId || '1'; // Default to color 1 if no color specified

            this.log(`  [${idx}] ${time} - ${name} (color:${color}${event.isBoundary ? ', boundary' : ''})`);

            // Mark boundary events for special formatting in template
            if (event.isBoundary) {
                console.log(`${time} - BOUNDARY:${name} - COLOR:${color}`);
            } else {
                console.log(`${time} - ${name} - COLOR:${color}`);
            }
        });

        this.log('=== CLI: Done - output sent to stdout ===\n');
    }

    /**
     * Main CLI function
     */
    async run(dateString, filePath = null) {
        this.log(`\n========================================`);
        this.log(`=== NEW CLI EXECUTION: ${dateString} ===`);
        if (filePath) {
            this.log(`Target file: ${filePath}`);
        }
        this.log(`========================================`);

        try {
            // Parse date
            const targetDate = new Date(dateString + 'T00:00:00');
            if (isNaN(targetDate.getTime())) {
                this.log('ERROR: Invalid date format. Use YYYY-MM-DD');
                console.error('Invalid date format. Use YYYY-MM-DD');
                process.exit(1);
            }

            this.log(`Parsed date: ${targetDate.toISOString()}`);

            // Initialize API
            this.log('Initializing Google Calendar API...');
            const success = await this.calendarAPI.initialize();
            if (!success) {
                this.log('ERROR: Failed to initialize Google Calendar API');
                console.error('Failed to initialize Google Calendar API');
                process.exit(1);
            }

            this.log('API initialized successfully');

            // Get and output events (authentication will happen automatically if needed)
            this.log('Fetching events for custom day...');
            const events = await this.calendarAPI.getEventsForCustomDay(targetDate);

            // If file path provided, update file in place instead of outputting
            if (filePath) {
                await this.updateFileInPlace(events, filePath);
            } else {
                this.outputEvents(events);
            }

        } catch (error) {
            this.log(`FATAL ERROR: ${error.message}`);
            this.log(`Stack: ${error.stack}`);
            console.error('CLI Error:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
        }
    }

    /**
     * Update file in place with idempotent event replacement
     */
    async updateFileInPlace(events, filePath) {
        this.log('\n=== UPDATING FILE IN PLACE ===');
        this.log(`Reading file: ${filePath}`);

        try {
            // Read current file
            const currentContent = await fs.readFile(filePath, 'utf8');
            const lines = currentContent.split('\n');
            this.log(`File has ${lines.length} lines`);

            // Format new events
            const newEventsFormatted = this.formatEventsAsLines(events);
            this.log(`Generated ${newEventsFormatted.length} new event lines`);

            // Find existing event lines
            const eventPattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*><\/span>\s*\*\*(.+?)\*\*/;
            const existingEventIndices = [];

            this.log('\n--- Scanning for existing events ---');
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].match(eventPattern);
                if (match) {
                    existingEventIndices.push(i);
                    this.log(`  Found[line ${i}]: ${match[1]} - ${match[2]}`);
                }
            }

            this.log(`\nTotal existing events: ${existingEventIndices.length}`);

            if (existingEventIndices.length === 0) {
                this.log('No existing events - file will not be modified');
                console.log('NO_EXISTING_EVENTS');
                return;
            }

            // Replace existing events
            this.log('\n--- Replacing events ---');
            const updatedLines = [...lines];
            let replaced = 0, deleted = 0, added = 0;

            for (let i = 0; i < existingEventIndices.length; i++) {
                const lineIndex = existingEventIndices[i];

                if (i < newEventsFormatted.length) {
                    this.log(`  Replace line ${lineIndex}`);
                    updatedLines[lineIndex] = newEventsFormatted[i];
                    replaced++;
                } else {
                    this.log(`  Delete line ${lineIndex}`);
                    updatedLines[lineIndex] = null;
                    deleted++;
                }
            }

            // Filter out deleted lines
            const filteredLines = updatedLines.filter(line => line !== null);

            // Remove blank line immediately before first event (if exists)
            if (existingEventIndices.length > 0) {
                const firstEventIndex = existingEventIndices[0];
                // Adjust index for any deletions before the first event
                let adjustedIndex = firstEventIndex;
                for (let i = 0; i < firstEventIndex; i++) {
                    if (updatedLines[i] === null) adjustedIndex--;
                }

                // Check if line before first event is blank
                if (adjustedIndex > 0 && filteredLines[adjustedIndex - 1] === '') {
                    this.log(`  Removing blank line before first event at index ${adjustedIndex - 1}`);
                    filteredLines.splice(adjustedIndex - 1, 1);
                }
            }

            // Add extra new events if any
            if (newEventsFormatted.length > existingEventIndices.length) {
                const lastEventIndex = existingEventIndices[existingEventIndices.length - 1];
                let insertPosition = lastEventIndex;

                // Adjust for deletions
                for (let i = 0; i < lastEventIndex; i++) {
                    if (updatedLines[i] === null) insertPosition--;
                }
                insertPosition++;

                const extraEvents = newEventsFormatted.slice(existingEventIndices.length);
                filteredLines.splice(insertPosition, 0, ...extraEvents);
                added = extraEvents.length;
                this.log(`\n--- Added ${added} new events at position ${insertPosition} ---`);
            }

            // Write updated file
            this.log(`\n→ Writing file (${filteredLines.length} lines)`);
            // Preserve original file's trailing newline behavior
            const hasTrailingNewline = currentContent.endsWith('\n');
            const newContent = filteredLines.join('\n') + (hasTrailingNewline ? '\n' : '');
            await fs.writeFile(filePath, newContent, 'utf8');

            const summary = `${replaced} updated, ${deleted} deleted, ${added} added`;
            this.log(`=== SUCCESS: ${summary} ===\n`);
            console.log(`SUCCESS:${summary}`);

        } catch (error) {
            this.log(`ERROR updating file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Format events as markdown lines (without outputting)
     */
    formatEventsAsLines(events) {
        return events.map(event => {
            const time = this.formatTime(event.start);
            const name = event.summary || 'Untitled Event';
            const color = event.colorId || '1';
            const colorSquare = this.getColorSquare(color);

            return `${time} - ${colorSquare} **${name}**`;
        });
    }

    /**
     * Get color square HTML
     */
    getColorSquare(colorId) {
        const colors = {
            '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
            '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
            '9': '#5484ed', '10': '#51b749', '11': '#dc2127'
        };

        const color = colors[colorId] || colors['1'];
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node cli.js <date> [--file <path>]');
        console.error('Example: node cli.js 2024-10-22');
        console.error('Example: node cli.js 2024-10-22 --file "path/to/note.md"');
        process.exit(1);
    }

    const date = args[0];
    let filePath = null;

    // Check for --file argument
    const fileIndex = args.indexOf('--file');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
        filePath = args[fileIndex + 1];
    }

    const cli = new CalendarCLI();
    cli.run(date, filePath);
}

module.exports = CalendarCLI;