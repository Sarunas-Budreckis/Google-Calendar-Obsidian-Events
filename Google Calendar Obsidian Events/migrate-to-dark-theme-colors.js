#!/usr/bin/env node
// Migration script to update all Google Calendar colors from light theme to dark theme

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Color mapping: light theme -> dark theme
const COLOR_MIGRATIONS = {
    '#a4bdfc': '#8e8e8e', // Lavender
    '#7ae7bf': '#33b679', // Sage
    '#dbadff': '#9e69af', // Grape
    '#ff887c': '#e67c73', // Flamingo
    '#fbd75b': '#f6bf26', // Banana
    '#ffb878': '#f4511e', // Tangerine
    '#46d6db': '#039be5', // Peacock
    '#e1e1e1': '#616161', // Graphite
    '#5484ed': '#3f51b5', // Blueberry
    '#51b749': '#0b8043', // Basil
    '#dc2127': '#d50000'  // Tomato
};

async function migrateFile(filePath) {
    console.log(`Processing: ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf8');
    let updatedContent = content;
    let totalChanges = 0;

    // Replace each light theme color with dark theme color
    for (const [lightColor, darkColor] of Object.entries(COLOR_MIGRATIONS)) {
        const regex = new RegExp(`background-color: ${lightColor.replace('#', '\\#')};`, 'g');
        const matches = (updatedContent.match(regex) || []).length;
        if (matches > 0) {
            updatedContent = updatedContent.replace(regex, `background-color: ${darkColor};`);
            totalChanges += matches;
        }
    }

    if (totalChanges > 0) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        console.log(`  ✓ Updated ${totalChanges} color(s)`);
        return totalChanges;
    } else {
        console.log(`  - No colors to update`);
        return 0;
    }
}

async function main() {
    const dailyNotesPath = path.join(__dirname, '..', 'Daily Notes');

    console.log('=== Dark Theme Color Migration Script ===');
    console.log(`Updating all Google Calendar colors to dark theme\n`);
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
    console.log(`Total colors updated: ${totalUpdates}`);
}

main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});
