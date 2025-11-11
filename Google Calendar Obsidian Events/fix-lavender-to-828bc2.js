#!/usr/bin/env node
// Migration script to update lavender color from #8e8e8e to #828bc2

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function migrateFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Replace #8e8e8e with #828bc2
    const updatedContent = content.replace(
        /background-color: #8e8e8e;/g,
        'background-color: #828bc2;'
    );

    if (originalContent !== updatedContent) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        const count = (originalContent.match(/background-color: #8e8e8e;/g) || []).length;
        console.log(`  ✓ Replaced ${count} occurrences`);
        return count;
    } else {
        console.log(`  - No changes needed`);
        return 0;
    }
}

async function main() {
    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');

    console.log('=== Lavender Color Fix Script ===');
    console.log(`Updating lavender from #8e8e8e to #828bc2\n`);
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
