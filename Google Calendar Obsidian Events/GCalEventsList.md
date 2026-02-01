<%*
// Google Calendar Events Template
// HTML modal with date picker, defaults to previous day if before 5am

// Debug helper - logs to Obsidian Console only
// (File logging via fs.appendFileSync doesn't work in Templater due to sandboxing)
function debug(...args) {
    console.log('[GCal Template]', ...args);
}

debug('=== NEW TEMPLATE EXECUTION STARTED ===');

const GCAL_BLOCK_START = '<!-- GCAL_EVENTS_START -->';
const GCAL_BLOCK_END = '<!-- GCAL_EVENTS_END -->';

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
    // Execute CLI command WITHOUT --file parameter (CLI will just output event data)
    const { exec } = require('child_process');
    const projectPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
    const command = `node cli.js "${targetDate}"`;

    debug(`Executing: ${command}`);

    const eventsOutput = await new Promise((resolve, reject) => {
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

            resolve(stdout);
        });
    });

    if (!eventsOutput || !eventsOutput.trim()) {
        new Notice('[GCal] No events found', 3000);
        return '*No events found for this date.*';
    }

    // Parse CLI output into formatted event lines
    const eventLines = eventsOutput.trim().split('\n');
    const formatted = formatEvents(eventLines);

    scheduleCleanupDuplicateLogs();
    return buildEventsSection(formatted);

} catch (error) {
    // Handle errors
    debug(`Error: ${error.message}`);
    new Notice(`[GCal Error] ${error.message}`, 10000);
    return ''; // Return empty string to avoid appending error text
}

// Helper function to format events
function formatEvents(eventsList) {
    let output = '';

    eventsList.forEach(event => {
        if (event.trim()) {
            // Parse time, name, and color from CLI output
            // Format: "04:00 PM - Event Name - COLOR:1" or "04:00 PM - BOUNDARY:Wake Up - COLOR:" (empty for default)
            const timePattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(.+?)\s*-\s*COLOR:(\d*)$/;
            const match = event.trim().match(timePattern);

            if (match) {
                const time = match[1];
                let name = match[2];
                const colorId = match[3];  // Can be empty string for default calendar color

                // Remove BOUNDARY: prefix
                if (name.startsWith('BOUNDARY:')) {
                    name = name.replace('BOUNDARY:', '');
                }

                // Get color square HTML (pass event name for Sleep detection)
                const colorSquare = getColorSquare(colorId, name);

                output += `${time} - ${colorSquare} **${name}**\n`;
            } else {
                // Fallback for events without proper format
                output += `**${event.trim()}**\n`;
            }
        }
    });

    return output;
}

function buildEventsSection(formattedEvents) {
    const sectionLines = [];
    sectionLines.push(GCAL_BLOCK_START);
    sectionLines.push(formattedEvents.trimEnd());
    sectionLines.push(GCAL_BLOCK_END);
    return sectionLines.join('\n');
}

function scheduleCleanupDuplicateLogs() {
    const currentFile = app.vault.getAbstractFileByPath(tp.file.path(true));
    setTimeout(async () => {
        try {
            const content = await app.vault.read(currentFile);
            const blocks = [];
            let start = 0;
            while (true) {
                const startIdx = content.indexOf(GCAL_BLOCK_START, start);
                if (startIdx === -1) break;
                const endIdx = content.indexOf(GCAL_BLOCK_END, startIdx);
                if (endIdx === -1) break;
                blocks.push([startIdx, endIdx + GCAL_BLOCK_END.length]);
                start = endIdx + GCAL_BLOCK_END.length;
            }
            if (blocks.length <= 1) return;

            // Keep the first (most recent, because button prepends)
            let updated = content;
            for (let i = blocks.length - 1; i >= 1; i--) {
                const [s, e] = blocks[i];
                updated = updated.slice(0, s) + updated.slice(e);
            }

            // Keep a single newline after the kept block; trim only if double
            const keepEnd = blocks[0][1];
            if (updated.slice(keepEnd, keepEnd + 2) === '\n\n') {
                updated = updated.slice(0, keepEnd) + updated.slice(keepEnd + 1);
            }
            await app.vault.modify(currentFile, updated);
        } catch (error) {
            debug(`Error cleaning duplicate logs: ${error.message}`);
        }
    }, 300);
}
// Helper function to get color square HTML
function getColorSquare(colorId, eventName = '') {
    // Hardcoded override: Sleep and Wake Up events should always be grey (#7c7c7c)
    const nameLower = eventName ? eventName.toLowerCase() : '';
    if (nameLower.includes('sleep') || nameLower.includes('wake up')) {
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: #7c7c7c; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }

    // Hardcoded override: events without explicit color (using default calendar color) should be #00aaff
    if (!colorId || colorId === '') {
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: #00aaff; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }

    const colors = {
        '1': '#828bc2', // Lavender (dark theme)
        '2': '#33b679', // Sage (dark theme)
        '3': '#9e69af', // Grape (dark theme)
        '4': '#e67c73', // Flamingo (dark theme)
        '5': '#f6bf26', // Banana (dark theme)
        '6': '#f4511e', // Tangerine (dark theme)
        '7': '#039be5', // Peacock (dark theme)
        '8': '#616161', // Graphite (dark theme)
        '9': '#3f51b5', // Blueberry (dark theme)
        '10': '#0b8043', // Basil (dark theme)
        '11': '#d50000'  // Tomato (dark theme)
    };

    const color = colors[colorId] || colors['1']; // Default to blue if color not found

    return `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
}

%>
