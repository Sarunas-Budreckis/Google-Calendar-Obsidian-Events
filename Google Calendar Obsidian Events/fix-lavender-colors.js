#!/usr/bin/env node
// Script to fix lavender (color 1) events that were incorrectly migrated to #00aaff
// This re-fetches events from Google Calendar to determine the correct colors

const GoogleCalendarAPI = require('./googleCalendarAPI');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const COLOR_MAP = {
    '1': '#8e8e8e', '2': '#33b679', '3': '#9e69af', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000'
};

// Pattern to match event lines
const EVENT_PATTERN = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*background-color: (#[0-9a-fA-F]{6});[^>]*><\/span>\s*\*\*(.+?)\*\*/;

async function fixFile(filePath, calendarAPI) {
    const fileName = path.basename(filePath, '.md');
    console.log(`\nProcessing: ${fileName}`);

    // Try to parse date from filename (YYYY-MM-DD format)
    const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
        console.log('  - Skipping (not a date-formatted file)');
        return 0;
    }

    const targetDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00`);
    console.log(`  Fetching events for: ${targetDate.toISOString().split('T')[0]}`);

    // Fetch events from Google Calendar
    let events;
    try {
        events = await calendarAPI.getEventsForCustomDay(targetDate);
    } catch (error) {
        console.log(`  ! Error fetching events: ${error.message}`);
        return 0;
    }

    // Build a map of event name -> actual color from Google Calendar
    const eventColorMap = {};
    events.forEach(event => {
        if (event.summary && !event.isBoundary) {
            const colorId = event.colorId || '';
            eventColorMap[event.summary.trim()] = colorId;
        }
    });

    console.log(`  Found ${Object.keys(eventColorMap).length} events from Google Calendar`);

    // Read file and update colors
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let changes = 0;

    const updatedLines = lines.map(line => {
        const match = line.match(EVENT_PATTERN);
        if (!match) return line;

        const time = match[1];
        const currentColor = match[2];
        const eventName = match[3];

        // Skip Wake Up and Sleep boundary markers
        if (eventName === 'Wake Up' || eventName === 'Sleep') {
            return line;
        }

        // Check if this event exists in Google Calendar
        const actualColorId = eventColorMap[eventName];
        if (actualColorId === undefined) {
            // Event not found in Google Calendar, skip
            return line;
        }

        // Determine what the color SHOULD be
        let correctColor;
        if (actualColorId === '' || actualColorId === '1') {
            // For color 1 (Lavender), use dark theme color
            if (actualColorId === '1') {
                correctColor = COLOR_MAP['1']; // #8e8e8e
            } else {
                // Empty colorId = default calendar color
                correctColor = '#00aaff';
            }
        } else {
            correctColor = COLOR_MAP[actualColorId] || COLOR_MAP['1'];
        }

        // Update if current color is wrong
        if (currentColor !== correctColor) {
            const updatedLine = line.replace(
                `background-color: ${currentColor};`,
                `background-color: ${correctColor};`
            );
            console.log(`  ✓ ${eventName}: ${currentColor} → ${correctColor} (colorId: ${actualColorId || 'default'})`);
            changes++;
            return updatedLine;
        }

        return line;
    });

    if (changes > 0) {
        await fs.writeFile(filePath, updatedLines.join('\n'), 'utf8');
        return changes;
    }

    console.log('  - No changes needed');
    return 0;
}

async function main() {
    console.log('=== Fix Lavender Color Script ===');
    console.log('Re-fetching events from Google Calendar to determine correct colors\n');

    // Initialize Google Calendar API
    const calendarAPI = new GoogleCalendarAPI();

    try {
        await calendarAPI.initialize();
        console.log('✓ Google Calendar API initialized\n');
    } catch (error) {
        console.error('! Failed to initialize Google Calendar API:', error.message);
        console.error('  Make sure you have run "node main.js" to authenticate first.');
        process.exit(1);
    }

    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');
    console.log(`Searching for daily notes in: ${dailyNotesPath}\n`);

    // Find all .md files in Daily Notes folder
    const allFiles = fsSync.readdirSync(dailyNotesPath);
    const mdFiles = allFiles.filter(f => f.endsWith('.md'));
    const files = mdFiles.map(f => path.join(dailyNotesPath, f));

    console.log(`Found ${files.length} markdown files`);

    let totalChanges = 0;
    let filesChanged = 0;

    for (const file of files) {
        const count = await fixFile(file, calendarAPI);
        if (count > 0) {
            totalChanges += count;
            filesChanged++;
        }
    }

    console.log(`\n=== Fix Complete ===`);
    console.log(`Files changed: ${filesChanged}`);
    console.log(`Total events fixed: ${totalChanges}`);
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
