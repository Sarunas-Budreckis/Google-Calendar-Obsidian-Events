<%*
// Google Calendar Events Template
// HTML modal with date picker, defaults to previous day if before 5am

// Get default date (previous day if before 5am)
const now = new Date();
const defaultDate = now.getHours() < 5 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
const defaultDateString = defaultDate.getFullYear() + '-' + 
  String(defaultDate.getMonth() + 1).padStart(2, '0') + '-' + 
  String(defaultDate.getDate()).padStart(2, '0');

// Show date picker modal
const targetDate = await showDatePicker(defaultDateString);
if (!targetDate) return;

// Helper function to show date picker modal
async function showDatePicker(defaultDate) {
  // HTML template for date picker modal
  const modalHTML = `
    <style>
  #date-picker::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
</style>

<div style="padding: 20px;">
  <label style="display: block; margin-bottom: 10px; font-size: 14px;">
    Select date (press Enter for default):
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
            if (error) {
                reject(new Error(`Command failed: ${error.message}`));
            } else {
                resolve(stdout);
            }
        });
    });
    
    // Format events
    if (eventsOutput && eventsOutput.trim()) {
        return formatEvents(eventsOutput.trim().split('\n'));
    } else {
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
            const timePattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(.+)$/;
            const match = event.trim().match(timePattern);
            
            if (match) {
                const time = match[1];
                let name = match[2];
                
                // Remove BOUNDARY: prefix
                if (name.startsWith('BOUNDARY:')) {
                    name = name.replace('BOUNDARY:', '');
                }
                
                output += `${time} - **${name}**\n`;
            } else {
                output += `**${event.trim()}**\n`;
            }
        }
    });
    
    return output;
}
%>
