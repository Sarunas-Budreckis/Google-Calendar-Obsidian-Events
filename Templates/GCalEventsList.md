<%*
// Google Calendar Events Template
// HTML modal with date picker, defaults to previous day if before 5am

// Debug helper - logs to Obsidian Console only
// (File logging via fs.appendFileSync doesn't work in Templater due to sandboxing)
function debug(...args) {
    console.log('[GCal Template]', ...args);
}

debug('=== NEW TEMPLATE EXECUTION STARTED ===');

// Get default date - check if we're in a daily note
let defaultDate;

// Check if current file is a daily note (common patterns: YYYY-MM-DD, YYYY/MM/DD, etc.)
const currentFile = tp.file.title;
const dailyNotePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;

if (dailyNotePattern.test(currentFile)) {
    // We're in a daily note, use that date
    const dateStr = currentFile.replace(/\//g, '-');
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        // Ensure proper formatting (YYYY-MM-DD)
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        defaultDate = new Date(`${year}-${month}-${day}T00:00:00`);
    } else {
        // Fallback to today if parsing fails
        defaultDate = new Date();
    }
} else {
    // Not a daily note, use today (previous day if before 5am)
    const now = new Date();
    defaultDate = now.getHours() < 5 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
}

const defaultDateString = defaultDate.getFullYear() + '-' + 
  String(defaultDate.getMonth() + 1).padStart(2, '0') + '-' + 
  String(defaultDate.getDate()).padStart(2, '0');

// Show date picker modal
const targetDate = await showDatePicker(defaultDateString);
if (!targetDate) return;

// Helper function to show date picker modal
async function showDatePicker(defaultDate) {
  // HTML template for date picker modal
  // Determine label text based on context
  const isDailyNote = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(tp.file.title);
  const labelText = isDailyNote ? 
    `Select date (press Enter for ${defaultDate}):` : 
    'Select date (press Enter for default):';

  const modalHTML = `
    <style>
  #date-picker::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
</style>

<div style="padding: 20px;">
  <label style="display: block; margin-bottom: 10px; font-size: 14px;">
    ${labelText}
  </label>
  <div style="position: relative; display: inline-block; width: 100%;">
    <input 
      type="date" 
      id="date-picker" 
      value="${defaultDate}"
      
      onclick="this.showPicker()"
      style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal);"
    />
  </div>
  <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
    <button id="cancel-btn" style="padding: 6px 16px;">Cancel</button>
    <button id="confirm-btn" style="padding: 6px 16px; background: var(--interactive-accent); color: var(--text-on-accent);">Confirm</button>
  </div>
</div>
  `;

  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;';
    
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999;';
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    const dateInput = modal.querySelector('#date-picker');
    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');
    
    const cleanup = () => {
      backdrop.remove();
      modal.remove();
    };
    
    const confirm = () => {
      resolve(dateInput.value);
      cleanup();
    };
    
    const cancel = () => {
      resolve(null);
      cleanup();
    };
    
    setTimeout(() => dateInput.focus(), 100);
    
    dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') cancel();
    });
    
    confirmBtn.addEventListener('click', confirm);
    cancelBtn.addEventListener('click', cancel);
    backdrop.addEventListener('click', cancel);
  });
}

try {
    // Execute CLI command with --file parameter to update in place
    const { exec } = require('child_process');
    const path = require('path');
    const projectPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
    const vaultPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault";

    // Get vault-relative path and convert to absolute path
    const vaultRelativePath = tp.file.path(true);
    const absoluteFilePath = path.join(vaultPath, vaultRelativePath);

    const command = `node cli.js "${targetDate}" --file "${absoluteFilePath}"`;

    debug(`Executing: ${command}`);

    const result = await new Promise((resolve, reject) => {
        exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
            debug(`stdout: ${stdout}`);
            debug(`stderr: ${stderr}`);

            if (error) {
                const errorMsg = `CLI failed: ${error.message}`;
                debug(errorMsg);
                new Notice(`[GCal Error] ${errorMsg}`, 10000);
                reject(new Error(errorMsg));
                return;
            }

            // Check stdout for result
            const output = stdout.trim();

            if (output.startsWith('SUCCESS:')) {
                const summary = output.substring(8); // Remove "SUCCESS:" prefix
                debug(`Success: ${summary}`);
                new Notice(`[GCal] ${summary}`, 4000);
                resolve(''); // Return empty - file was updated
            } else if (output === 'NO_EXISTING_EVENTS') {
                debug('No existing events found - need to append');
                // Fall back to append mode - CLI outputs event data
                reject(new Error('APPEND_MODE'));
            } else {
                debug(`Unexpected output: ${output}`);
                new Notice('[GCal] File updated', 3000);
                resolve('');
            }
        });
    });

    return result;

} catch (error) {
    if (error.message === 'APPEND_MODE') {
        // No existing events - run CLI again in output mode and append
        debug('Running in append mode...');

        const { exec } = require('child_process');
        const projectPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
        const command = `node cli.js "${targetDate}"`;

        const eventsOutput = await new Promise((resolve, reject) => {
            exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });

        if (eventsOutput && eventsOutput.trim()) {
            const eventLines = eventsOutput.trim().split('\n');
            const formatted = formatEvents(eventLines);
            new Notice(`[GCal] Appending ${eventLines.length} events`, 3000);
            return formatted;
        } else {
            new Notice('[GCal] No events found', 3000);
            return '*No events found for this date.*';
        }
    } else {
        // Other errors - show notice but don't append anything
        debug(`Error: ${error.message}`);
        new Notice(`[GCal Error] ${error.message}`, 10000);
        return ''; // Return empty string to avoid appending error text
    }
}

// Helper function to format events
function formatEvents(eventsList) {
    let output = '';
    
    eventsList.forEach(event => {
        if (event.trim()) {
            // Parse time, name, and color from CLI output
            // Format: "04:00 PM - Event Name - COLOR:1" or "04:00 PM - BOUNDARY:Wake Up - COLOR:1"
            const timePattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(.+?)\s*-\s*COLOR:(\d+)$/;
            const match = event.trim().match(timePattern);
            
            if (match) {
                const time = match[1];
                let name = match[2];
                const colorId = match[3];
                
                // Remove BOUNDARY: prefix
                if (name.startsWith('BOUNDARY:')) {
                    name = name.replace('BOUNDARY:', '');
                }
                
                // Get color square HTML
                const colorSquare = getColorSquare(colorId);
                
                output += `${time} - ${colorSquare} **${name}**\n`;
            } else {
                // Fallback for events without proper format
                output += `**${event.trim()}**\n`;
            }
        }
    });
    
    return output;
}

// Helper function to get color square HTML
function getColorSquare(colorId) {
    // Hardcoded override: events without explicit color (using default calendar color) should be #00aaff
    if (!colorId || colorId === '') {
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: #00aaff; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }

    const colors = {
        '1': '#a4bdfc', // Blue
        '2': '#7ae7bf', // Green
        '3': '#dbadff', // Purple
        '4': '#ff887c', // Red
        '5': '#fbd75b', // Yellow
        '6': '#ffb878', // Orange
        '7': '#46d6db', // Teal
        '8': '#e1e1e1', // Gray
        '9': '#5484ed', // Dark Blue
        '10': '#51b749', // Dark Green
        '11': '#dc2127'  // Dark Red
    };

    const color = colors[colorId] || colors['1']; // Default to blue if color not found

    return `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
}

// Helper function to update events idempotently
async function updateEventsIdempotently(newEventsText) {
    debug('=== Starting Idempotent Update ===');

    // Get current file content
    const currentFile = app.vault.getAbstractFileByPath(tp.file.path(true));
    const currentContent = await app.vault.read(currentFile);
    const lines = currentContent.split('\n');
    debug(`File has ${lines.length} total lines`);

    // Parse new events into an array preserving order
    const newEventsArray = [];
    const eventPattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*><\/span>\s*\*\*(.+?)\*\*/;

    debug('--- Parsing NEW events from GCal ---');
    newEventsText.split('\n').forEach((line, idx) => {
        const match = line.match(eventPattern);
        if (match) {
            const time = match[1];
            const name = match[2];
            newEventsArray.push(line);
            debug(`  New[${idx}]: ${time} - ${name}`);
        }
    });
    debug(`Total NEW events: ${newEventsArray.length}`);

    // Find all existing event lines
    const existingEventIndices = [];
    debug('\n--- Finding EXISTING event lines in file ---');
    debug(`Pattern: ${eventPattern.toString()}`);
    debug(`Checking ${lines.length} lines...`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if line might be an event (contains time pattern)
        const hasTime = /^\d{1,2}:\d{2}\s*[AP]M/.test(line);
        const hasSpan = line.includes('<span');
        const hasBold = line.includes('**');

        if (hasTime || hasSpan || hasBold) {
            debug(`Line ${i} (potential match):`);
            debug(`  Content: "${line.substring(0, 100)}${line.length > 100 ? '...' : ''}"`);
            debug(`  Has time: ${hasTime}, Has span: ${hasSpan}, Has bold: ${hasBold}`);
        }

        const match = line.match(eventPattern);
        if (match) {
            const time = match[1];
            const name = match[2];
            existingEventIndices.push(i);
            debug(`  ✓ MATCHED[line ${i}]: ${time} - ${name}`);
        } else if (hasTime || hasSpan || hasBold) {
            debug(`  ✗ NO MATCH (pattern didn't match)`);
        }
    }

    debug(`\nTotal EXISTING events found: ${existingEventIndices.length}`);

    if (existingEventIndices.length === 0) {
        debug('\n*** No existing events found ***');
        debug('--- ALL lines in file (first 30) ---');
        lines.slice(0, 30).forEach((line, idx) => {
            debug(`Line ${idx}: "${line}"`);
        });
        debug('=================================\n');
    }

    // If no existing events found, append new events as usual
    if (existingEventIndices.length === 0) {
        debug('→ MODE: Appending all events (no existing events)');
        new Notice(`[GCal] Appending ${newEventsArray.length} events`, 3000);
        return newEventsText;
    }

    debug('→ MODE: Updating events in place');

    // Replace existing events with new ones one by one
    const updatedLines = [...lines];
    let newEventIndex = 0;
    let replaced = 0;
    let deleted = 0;

    debug('--- Performing replacements ---');
    for (let i = 0; i < existingEventIndices.length; i++) {
        const lineIndex = existingEventIndices[i];

        if (newEventIndex < newEventsArray.length) {
            // Replace old line with new event
            const oldMatch = lines[lineIndex].match(eventPattern);
            const newMatch = newEventsArray[newEventIndex].match(eventPattern);
            debug(`  Replace line ${lineIndex}: "${oldMatch[1]} - ${oldMatch[2]}" → "${newMatch[1]} - ${newMatch[2]}"`);

            updatedLines[lineIndex] = newEventsArray[newEventIndex];
            newEventIndex++;
            replaced++;
        } else {
            // No more new events, delete this old line
            const oldMatch = lines[lineIndex].match(eventPattern);
            debug(`  DELETE line ${lineIndex}: "${oldMatch[1]} - ${oldMatch[2]}" (no more new events)`);
            updatedLines[lineIndex] = null; // Mark for deletion
            deleted++;
        }
    }
    debug(`Replaced: ${replaced}, Deleted: ${deleted}`);

    // Remove null entries (deleted old lines)
    const filteredLines = updatedLines.filter(line => line !== null);

    // If there are extra new events, add them after the last existing event
    let added = 0;
    if (newEventIndex < newEventsArray.length) {
        const lastEventIndex = existingEventIndices[existingEventIndices.length - 1];
        debug(`--- Adding ${newEventsArray.length - newEventIndex} extra new events ---`);

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
        remainingEvents.forEach((event, idx) => {
            const match = event.match(eventPattern);
            debug(`  ADD at position ${insertPosition + idx}: "${match[1]} - ${match[2]}"`);
        });
        filteredLines.splice(insertPosition, 0, ...remainingEvents);
        added = remainingEvents.length;
    }

    // Replace file content
    debug(`\n→ Writing updated file (${filteredLines.length} lines)`);
    await app.vault.modify(currentFile, filteredLines.join('\n'));

    // Show summary
    const summary = [];
    if (replaced > 0) summary.push(`${replaced} updated`);
    if (deleted > 0) summary.push(`${deleted} deleted`);
    if (added > 0) summary.push(`${added} added`);
    debug(`=== Summary: ${summary.join(', ')} ===\n`);
    new Notice(`[GCal] Events: ${summary.join(', ')}`, 4000);

    return ''; // Return empty since we've updated the file
}
%>
