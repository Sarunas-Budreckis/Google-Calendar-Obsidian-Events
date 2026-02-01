<%*
const GCAL_BLOCK_START = '<!-- GCAL_EVENTS_START -->';
const GCAL_BLOCK_END = '<!-- GCAL_EVENTS_END -->';
const DAILY_NOTE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
const TIME_PATTERN = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(.+?)\s*-\s*COLOR:(\d*)$/;
const PROJECT_PATH = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
const COLOR_MAP = {
    '1': '#828bc2', '2': '#33b679', '3': '#9e69af', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000'
};

const debug = (...args) => console.log('[GCal Template]', ...args);
debug('=== NEW TEMPLATE EXECUTION STARTED ===');

const targetDate = await showDatePicker(getDefaultDateString());
if (!targetDate) return;

try {
    const eventsOutput = await runCli(targetDate);
    if (!eventsOutput || !eventsOutput.trim()) {
        new Notice('[GCal] No events found', 3000);
        return '';
    }

    const formatted = formatEvents(eventsOutput.trim().split('\n'));
    scheduleCleanupDuplicateLogs();
    return buildEventsSection(formatted);
} catch (error) {
    debug(`Error: ${error.message}`);
    new Notice(`[GCal Error] ${error.message}`, 10000);
    return '';
}

function getDefaultDateString() {
    const dailyDate = parseDailyNoteDate(tp.file.title);
    const date = dailyDate || getTodayAdjusted();
    return formatDate(date);
}

function parseDailyNoteDate(title) {
    if (!DAILY_NOTE_RE.test(title)) return null;
    const parts = title.replace(/\//g, '-').split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    return isNaN(date.getTime()) ? null : date;
}

function getTodayAdjusted() {
    const now = new Date();
    return now.getHours() < 5 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function showDatePicker(defaultDate) {
    const isDailyNote = DAILY_NOTE_RE.test(tp.file.title);
    const labelText = isDailyNote
        ? `Select date (press Enter for ${defaultDate}):`
        : 'Select date (press Enter for default):';

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

async function runCli(dateString) {
    const { exec } = require('child_process');
    const command = `node cli.js "${dateString}"`;
    debug(`Executing: ${command}`);

    return new Promise((resolve, reject) => {
        exec(command, { cwd: PROJECT_PATH }, (error, stdout, stderr) => {
            debug(`stdout: ${stdout}`);
            debug(`stderr: ${stderr}`);

            const authUrl = extractAuthUrl(stdout, stderr);
            if (authUrl) {
                insertAuthBlock(authUrl);
                resolve('');
                return;
            }

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
}

function formatEvents(lines) {
    let output = '';
    for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.trim().match(TIME_PATTERN);
        if (!match) {
            output += `**${line.trim()}**\n`;
            continue;
        }
        const time = match[1];
        let name = match[2];
        const colorId = match[3];
        if (name.startsWith('BOUNDARY:')) {
            name = name.replace('BOUNDARY:', '');
        }
        const colorSquare = getColorSquare(colorId, name);
        output += `${time} - ${colorSquare} **${name}**\n`;
    }
    return output;
}

function buildEventsSection(formattedEvents) {
    return [GCAL_BLOCK_START, formattedEvents.trimEnd(), GCAL_BLOCK_END].join('\n');
}

function extractAuthUrl(stdout, stderr) {
    const combined = `${stdout || ''}\n${stderr || ''}`;
    for (const line of combined.split('\n')) {
        if (line.startsWith('AUTH_URL:')) {
            return line.slice('AUTH_URL:'.length).trim();
        }
    }
    return null;
}

function insertAuthBlock(authUrl) {
    const currentFile = app.vault.getAbstractFileByPath(tp.file.path(true));
    const block = [GCAL_BLOCK_START, `Open Google Auth: [Open Google Auth](${authUrl})`, GCAL_BLOCK_END].join('\n');

    app.vault.read(currentFile).then((content) => {
        const spacer = content.endsWith('\n') ? '' : '\n';
        const updated = content + spacer + block + '\n';
        app.vault.modify(currentFile, updated);
    }).catch((error) => {
        debug(`Error inserting auth block: ${error.message}`);
    });
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

            let updated = content;
            for (let i = blocks.length - 1; i >= 1; i--) {
                const [s, e] = blocks[i];
                updated = updated.slice(0, s) + updated.slice(e);
            }

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

function getColorSquare(colorId, eventName = '') {
    const nameLower = eventName ? eventName.toLowerCase() : '';
    if (nameLower.includes('sleep') || nameLower.includes('wake up')) {
        return `<span style="display: inline-block; width: 12px; height: 12px; background-color: #7c7c7c; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
    }

    const color = colorId ? (COLOR_MAP[colorId] || COLOR_MAP['1']) : '#00aaff';
    return `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border-radius: 2px; margin-right: 6px; vertical-align: middle;"></span>`;
}
%>
<!-- GCAL_EVENTS_START -->
Open Google Auth: [Open Google Auth](https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly&response_type=code&client_id=572188547705-1n3eb88aoedt0pk6mfqv6o82hutmbjc6.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Foauth2callback)
<!-- GCAL_EVENTS_END -->
