#!/usr/bin/env node
// Migration script to update Sleep and Wake Up events from light grey (#e1e1e1) to darker grey (#7c7c7c)

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function migrateFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let changeCount = 0;

    const updatedLines = lines.map(line => {
        // Check if line contains Sleep or Wake Up event with light grey color
        if ((line.includes('**Sleep**') || line.includes('**Wake Up**')) &&
            line.includes('background-color: #e1e1e1;')) {
            changeCount++;
            return line.replace(
                'background-color: #e1e1e1;',
                'background-color: #7c7c7c;'
            );
        }
        return line;
    });

    if (changeCount > 0) {
        const newContent = updatedLines.join('\n');
        await fs.writeFile(filePath, newContent, 'utf8');
        console.log(`  ✓ Updated ${changeCount} event(s)`);
        return changeCount;
    } else {
        console.log(`  - No events to update`);
        return 0;
    }
}

async function main() {
    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');

    console.log('=== Grey Color Migration Script ===');
    console.log(`Updating Sleep/Wake Up from #e1e1e1 to #7c7c7c\n`);
    console.log(`Searching for daily notes in: ${dailyNotesPath}\n`);

    // Find all .md files in Daily Notes folder
    const allFiles = fsSync.readdirSync(dailyNotesPath);
    const mdFiles = allFiles.filter(f => f.endsWith('.md'));
    const files = mdFiles.map(f => path.join(dailyNotesPath, f));

    console.log(`Found ${files.length} markdown files\n`);

    let totalUpdates = 0;
    let filesChanged = 0;

    for (const file of files) {
        const count = await migrateFile(file);
        if (count > 0) {
            totalUpdates += count;
            filesChanged++;
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Files changed: ${filesChanged}`);
    console.log(`Total events updated: ${totalUpdates}`);
}

main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
