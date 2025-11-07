<%*
// Google Calendar Events Template
// HTML modal with date picker, defaults to previous day if before 5am

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
    // Execute CLI command
    const { exec } = require('child_process');
    const projectPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
    const command = `node cli.js "${targetDate}"`;

    const eventsOutput = await new Promise((resolve, reject) => {
        exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
            if (stderr) {
                console.log('CLI stderr:', stderr);
            }
            if (error) {
                reject(new Error(`Command failed: ${error.message}`));
            } else {
                console.log('CLI stdout lines:', stdout.split('\n').length);
                resolve(stdout);
            }
        });
    });

    // Format events
    if (eventsOutput && eventsOutput.trim()) {
        console.log('Formatting events from CLI output');
        const eventLines = eventsOutput.trim().split('\n');
        console.log('Event lines to format:', eventLines.length);

        const newEvents = formatEvents(eventLines);
        console.log('Formatted events length:', newEvents.length);
        console.log('First 100 chars of formatted:', newEvents.substring(0, 100));

        const result = await updateEventsIdempotently(newEvents);

        // Debug: show what we're returning
        if (result === '') {
            console.log('IDEMPOTENT: File was modified, returning empty string');
        } else {
            console.log('IDEMPOTENT: Returning', result.split('\n').length, 'lines to append');
        }

        return result;
    } else {
        console.log('No events output from CLI');
        return '*No events found for this date.*';
    }

} catch (error) {
    return `*Error: ${error.message}*`;
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
    // Get current file content
    const currentFile = app.vault.getAbstractFileByPath(tp.file.path(true));
    const currentContent = await app.vault.read(currentFile);
    const lines = currentContent.split('\n');

    console.log('=== IDEMPOTENT UPDATE DEBUG ===');
    console.log('Current file has', lines.length, 'lines');

    // Parse new events into a map keyed by time + event name
    const newEventsMap = new Map();
    const eventPattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*<span style="display: inline-block;[^>]*><\/span>\s*\*\*(.+?)\*\*/;

    newEventsText.split('\n').forEach((line, idx) => {
        const match = line.match(eventPattern);
        if (match) {
            const time = match[1].trim();
            const eventName = match[2].trim();
            const key = `${time}|${eventName}`;
            newEventsMap.set(key, line);
            console.log(`New event ${idx}: ${key}`);
        } else if (line.trim()) {
            console.log(`New line ${idx} NO MATCH: "${line.substring(0, 60)}"`);
        }
    });

    console.log(`\nParsed ${newEventsMap.size} new events`);

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

            console.log(`Existing line ${i}: ${key} - ${newEventsMap.has(key) ? 'UPDATING' : 'KEEPING'}`);

            // Replace with new event if it exists, otherwise keep old
            if (newEventsMap.has(key)) {
                updatedLines.push(newEventsMap.get(key));
            } else {
                updatedLines.push(line);
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

        // Replace file content
        console.log(`Modifying file with ${updatedLines.length} lines`);
        await app.vault.modify(currentFile, updatedLines.join('\n'));
        console.log('File modified successfully');
        return ''; // Return empty since we've updated the file
    } else {
        // No existing events, return new events to be appended
        console.log('No existing events found, returning new events to append');
        return newEventsText;
    }
}
%>
