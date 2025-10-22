<%*
// Google Calendar Events Template - Fixed version
// This template uses child_process with proper working directory

// Date selection options for user
const dateOptions = [
    "Today",
    "Yesterday", 
    "2 days ago",
    "3 days ago",
    "4 days ago",
    "5 days ago",
    "6 days ago",
    "1 week ago",
    "Custom date..."
];

// Show date picker using Templater's suggester
const selectedOption = await tp.system.suggester(dateOptions, dateOptions);

if (!selectedOption) {
    // User cancelled
    return;
}

let targetDate;

// Calculate the target date based on selection
if (selectedOption === "Custom date...") {
    // Prompt for custom date
    const customDate = await tp.system.prompt("Enter date (YYYY-MM-DD):");
    if (!customDate) {
        return; // User cancelled
    }
    targetDate = customDate;
} else {
    // Calculate date based on selection
    const today = new Date();
    const dateMap = {
        "Today": 0,
        "Yesterday": 1,
        "2 days ago": 2,
        "3 days ago": 3,
        "4 days ago": 4,
        "5 days ago": 5,
        "6 days ago": 6,
        "1 week ago": 7
    };
    
    const daysAgo = dateMap[selectedOption];
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() - daysAgo);
    
    // Format as YYYY-MM-DD
    targetDate = targetDateObj.getFullYear() + '-' + 
                String(targetDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                String(targetDateObj.getDate()).padStart(2, '0');
}

try {
    // Use child_process.exec with proper working directory
    const { exec } = require('child_process');
    
    const projectPath = "C:\\Users\\Sarunas Budreckis\\Documents\\Obsidian Vaults\\Sarunas Obsidian Vault\\Google Calendar Obsidian Events";
    const command = `node cli.js "${targetDate}"`;
    
    console.log('Executing command in directory:', projectPath);
    console.log('Command:', command);
    
    const eventsOutput = await new Promise((resolve, reject) => {
        exec(command, { 
            cwd: projectPath,
            env: { ...process.env, NODE_ENV: 'production' }
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('Command error:', error);
                console.error('Stderr:', stderr);
                reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
    
    if (eventsOutput && eventsOutput.trim()) {
        // Parse the events
        const eventsList = eventsOutput.trim().split('\n');
        
        // Add a header with the date
        const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString();
        let output = `## 📅 Calendar Events - ${formattedDate}\n\n`;
        
        // Add each event as a list item with time and bold title
        eventsList.forEach(event => {
            if (event.trim()) {
                // Parse the time and event name from the CLI output
                // Format: "04:00 PM - Event Name" or "04:00 PM - BOUNDARY:Wake Up"
                const timePattern = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(.+)$/;
                const match = event.trim().match(timePattern);
                if (match) {
                    const time = match[1];
                    let name = match[2];
                    
                    // Handle boundary events (Wake Up and Sleep)
                    if (name.startsWith('BOUNDARY:')) {
                        name = name.replace('BOUNDARY:', '');
                        if (name === 'Wake Up') {
                            output += `- ${time} - **${name}**\n`;
                        } else if (name === 'Sleep') {
                            output += `- ${time} - **${name}**\n`;
                        }
                    } else {
                        // Regular event
                        output += `- ${time} - **${name}**\n`;
                    }
                } else {
                    // No time pattern found, just bold the whole thing
                    output += `- **${event.trim()}**\n`;
                }
            }
        });
        
        // Add some spacing
        output += '\n';
        
        // Return the content
        return output;
        
    } else {
        // No events found
        const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString();
        return `## 📅 Calendar Events - ${formattedDate}\n\n*No events found for this date.*\n\n`;
    }
    
} catch (error) {
    // Handle errors gracefully
    return `## ❌ Calendar Events - Error\n\n*Failed to fetch calendar events: ${error.message}*\n\n*Please check that the Google Calendar integration is properly set up.*\n\n`;
}
%>
