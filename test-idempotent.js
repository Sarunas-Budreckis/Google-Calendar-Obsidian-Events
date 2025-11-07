const fs = require('fs').promises;
const path = require('path');

// Simulate the updateEventsIdempotently function
async function updateEventsIdempotently(newEventsText, currentContent) {
    const lines = currentContent.split('\n');

    // Parse new events into a map keyed by time + event name
    const newEventsMap = new Map();
    const eventPattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*><\/span>\s*\*\*(.+?)\*\*/;

    newEventsText.split('\n').forEach(line => {
        const match = line.match(eventPattern);
        if (match) {
            const time = match[1].trim();
            const eventName = match[2].trim();
            const key = `${time}|${eventName}`;
            newEventsMap.set(key, line);
            console.log(`New event: ${time} - ${eventName}`);
        }
    });

    console.log(`\nParsed ${newEventsMap.size} new events\n`);

    // Process existing content line by line
    let hasEvents = false;
    const updatedLines = [];
    const processedKeys = new Set();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(eventPattern);

        if (match) {
            hasEvents = true;
            const time = match[1].trim();
            const eventName = match[2].trim();
            const key = `${time}|${eventName}`;
            processedKeys.add(key);

            console.log(`Found existing event: ${time} - ${eventName}`);

            // Replace with new event if it exists, otherwise keep old
            if (newEventsMap.has(key)) {
                updatedLines.push(newEventsMap.get(key));
                console.log(`  -> Updated with new data`);
            } else {
                updatedLines.push(line);
                console.log(`  -> Kept old data (not in new events)`);
            }
        } else {
            updatedLines.push(line);
        }
    }

    console.log(`\nProcessed ${processedKeys.size} existing events`);
    console.log(`Has events: ${hasEvents}`);

    // If events were found and updated, replace the file content
    if (hasEvents) {
        // Add any new events that weren't in the original content
        const newEventLines = [];
        for (const [key, eventLine] of newEventsMap) {
            if (!processedKeys.has(key)) {
                newEventLines.push(eventLine);
                console.log(`New event to add: ${key}`);
            }
        }

        console.log(`\n${newEventLines.length} new events to add`);

        if (newEventLines.length > 0) {
            // Find where to insert new events (after last existing event)
            let insertIndex = -1;
            for (let i = updatedLines.length - 1; i >= 0; i--) {
                if (updatedLines[i].match(eventPattern)) {
                    insertIndex = i + 1;
                    break;
                }
            }

            console.log(`Insert index: ${insertIndex}`);

            if (insertIndex > 0) {
                updatedLines.splice(insertIndex, 0, ...newEventLines);
            }
        }

        return updatedLines.join('\n');
    } else {
        // No existing events, return new events to be appended
        return null;
    }
}

async function test() {
    const dailyNotePath = path.join(__dirname, '..', 'Daily Notes', '2025-11-05.md');
    const currentContent = await fs.readFile(dailyNotePath, 'utf8');

    // Simulate fetching new events (use the same data)
    const newEventsText = `10:15 AM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #a4bdfc; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Wake Up**
10:15 AM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #fbd75b; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Phone**
10:45 AM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #7ae7bf; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Update Calendar Batch - Call Logs**
11:15 AM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #5484ed; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **GitHub / Claude Code Configuration**
12:00 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #5484ed; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Google Calendar Management Detailed Requirements**
05:15 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #fbd75b; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Phone**
05:30 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #a4bdfc; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Call George - Austin Plans, Gyms, Biking, El Paso Plans, Matthew Discussion**
07:00 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #7ae7bf; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **GCal Color Definitions - Details, Connections, Examples, Paragraphs, Future Changes**
09:00 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #a4bdfc; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Call Mom - 5 Types of Wealth, Estera Gossip, I'm Good at Everything Structured, El Paso Plans**
10:15 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #a4bdfc; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Reflect / Add to Calendar**
10:30 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #5484ed; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Create Epics / Stories for GCal App**
11:15 PM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #7ae7bf; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Obsidian Daily Note**
01:00 AM - <span style="display: inline-block; width: 12px; height: 12px; background-color: #a4bdfc; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span> **Sleep**`;

    console.log('=== TESTING IDEMPOTENT UPDATE ===\n');

    const result = await updateEventsIdempotently(newEventsText, currentContent);

    if (result) {
        console.log('\n=== FILE WOULD BE MODIFIED ===');
        console.log(`Original lines: ${currentContent.split('\n').length}`);
        console.log(`Updated lines: ${result.split('\n').length}`);

        // Count event lines in result
        const eventCount = result.split('\n').filter(line =>
            line.match(/^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span/)
        ).length;
        console.log(`Event lines in result: ${eventCount}`);
    } else {
        console.log('\n=== NO EVENTS FOUND - WOULD APPEND ===');
    }
}

test().catch(console.error);
