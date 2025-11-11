#!/usr/bin/env node
// One-time migration script to replace old #a4bdfc colors with #00aaff
// This fixes events that were rendered before the default color override was implemented

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function migrateFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Replace #a4bdfc with #00aaff in all event lines
    const updatedContent = content.replace(
        /background-color: #a4bdfc;/g,
        'background-color: #00aaff;'
    );

    if (originalContent !== updatedContent) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        const count = (originalContent.match(/background-color: #a4bdfc;/g) || []).length;
        console.log(`  ✓ Replaced ${count} occurrences`);
        return count;
    } else {
        console.log(`  - No changes needed`);
        return 0;
    }
}

async function main() {
    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');

    console.log('=== Color Migration Script ===');
    console.log(`Searching for daily notes in: ${dailyNotesPath}\n`);

    // Find all .md files in Daily Notes folder
    const allFiles = fsSync.readdirSync(dailyNotesPath);
    const mdFiles = allFiles.filter(f => f.endsWith('.md'));
    const files = mdFiles.map(f => path.join(dailyNotesPath, f));

    console.log(`Found ${files.length} markdown files\n`);

    let totalReplacements = 0;
    let filesChanged = 0;

    for (const file of files) {
        const count = await migrateFile(file);
        if (count > 0) {
            totalReplacements += count;
            filesChanged++;
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Files changed: ${filesChanged}`);
    console.log(`Total replacements: ${totalReplacements}`);
}

main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
