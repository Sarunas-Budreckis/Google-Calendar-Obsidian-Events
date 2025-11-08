const fs = require('fs').promises;
const path = require('path');

// Simulate the updateEventsIdempotently function
async function updateEventsIdempotently(newEventsText, currentContent) {
    const lines = currentContent.split('\n');

    console.log('=== IDEMPOTENT UPDATE DEBUG ===');
    console.log('Current file has', lines.length, 'lines');

    // Parse new events into an array preserving order
    const newEventsArray = [];
    const eventPattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*><\/span>\s*\*\*(.+?)\*\*/;

    newEventsText.split('\n').forEach((line, idx) => {
        const match = line.match(eventPattern);
        if (match) {
            newEventsArray.push(line);
            console.log(`New event ${idx}: ${line}`);
        }
    });

    console.log(`\nParsed ${newEventsArray.length} new events`);

    // Find all existing event lines
    const existingEventIndices = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(eventPattern);
        if (match) {
            existingEventIndices.push(i);
            console.log(`Existing event line ${i}: ${line}`);
        }
    }

    console.log(`\nFound ${existingEventIndices.length} existing event lines`);

    // If no existing events found, return null to indicate append mode
    if (existingEventIndices.length === 0) {
        console.log('No existing events found, returning null (append mode)');
        return null;
    }

    console.log('Matching lines found, updating in place...');

    // Replace existing events with new ones one by one
    const updatedLines = [...lines];
    let newEventIndex = 0;

    for (let i = 0; i < existingEventIndices.length; i++) {
        const lineIndex = existingEventIndices[i];

        if (newEventIndex < newEventsArray.length) {
            // Replace old line with new event
            console.log(`Replacing line ${lineIndex} with new event ${newEventIndex}`);
            updatedLines[lineIndex] = newEventsArray[newEventIndex];
            newEventIndex++;
        } else {
            // No more new events, delete this old line
            console.log(`Deleting old line ${lineIndex} (no more new events)`);
            updatedLines[lineIndex] = null; // Mark for deletion
        }
    }

    // Remove null entries (deleted old lines)
    const filteredLines = updatedLines.filter(line => line !== null);

    // If there are extra new events, add them after the last existing event
    if (newEventIndex < newEventsArray.length) {
        const lastEventIndex = existingEventIndices[existingEventIndices.length - 1];
        console.log(`Adding ${newEventsArray.length - newEventIndex} extra new events after line ${lastEventIndex}`);

        // Find the position in filtered lines (accounting for deletions)
        let insertPosition = lastEventIndex;
        for (let i = 0; i < lastEventIndex; i++) {
            if (updatedLines[i] === null) {
                insertPosition--;
            }
        }
        insertPosition++; // Insert after the last event

        // Insert remaining new events
        const remainingEvents = newEventsArray.slice(newEventIndex);
        filteredLines.splice(insertPosition, 0, ...remainingEvents);
        console.log(`Inserted ${remainingEvents.length} new events at position ${insertPosition}`);
    }

    console.log(`Modified file will have ${filteredLines.length} lines`);
    return filteredLines.join('\n');
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
