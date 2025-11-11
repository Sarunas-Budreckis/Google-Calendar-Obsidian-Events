#!/usr/bin/env node
// Migration script to update all Wake Up events to grey color (#e1e1e1)

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function migrateFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    const lines = content.split('\n');
    let changeCount = 0;

    const updatedLines = lines.map(line => {
        // Check if line contains "Wake Up" event with a color span
        if (line.includes('**Wake Up**') && line.includes('background-color:')) {
            // Replace any color with grey for Wake Up events
            const updatedLine = line.replace(
                /background-color: #[0-9a-fA-F]{6};/,
                'background-color: #e1e1e1;'
            );
            if (updatedLine !== line) {
                changeCount++;
            }
            return updatedLine;
        }
        return line;
    });

    if (changeCount > 0) {
        const newContent = updatedLines.join('\n');
        await fs.writeFile(filePath, newContent, 'utf8');
        console.log(`  ✓ Updated ${changeCount} Wake Up event(s)`);
        return changeCount;
    } else {
        console.log(`  - No Wake Up events to update`);
        return 0;
    }
}

async function main() {
    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');

    console.log('=== Wake Up Color Migration Script ===');
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
    console.log(`Total Wake Up events updated: ${totalUpdates}`);
}

main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
