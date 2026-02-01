# Google Calendar Obsidian Integration

Fetch Google Calendar events and insert them into Obsidian notes with custom day boundaries based on your sleep schedule.

## Features

- **Sleep-Based Day Logic**: Day starts after the FIRST "Sleep" event > 2 hours, ends before your next one
- **Wake Up & Sleep Times**: Automatically shows when you wake up and go to sleep (grey color)
- **Dark Theme Colors**: Uses Google Calendar dark theme color scheme for all events
- **Custom Default Color**: Events without explicit colors use #00aaff (custom override)
- **Smart Date Picker**: HTML modal with native calendar picker, defaults to daily note date or today
- **Daily Note Integration**: Automatically detects daily notes and defaults to that date
- **Clean Output**: Direct event listing with color squares and no headers
- **CLI Support**: Run directly from terminal
- **Sleep Event Filtering**: Actual Sleep calendar events are excluded from logs (only boundary markers shown)

## Quick Setup

1. **Install**: `npm install`
2. **Configure**: Create `.env` with Google OAuth credentials (see below)
3. **Authenticate**:
   - **Obsidian/Templater** (non-interactive): Run the template once; an auth link is appended to the note. Click it, authorize, then re-run the template.
   - **Terminal**: `node main.js` and follow the prompt
4. **Setup Template**: See "Template Setup" section below
5. **Test**: `node setup-check.js`

### Environment Variables

Create `.env` file:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/oauth2callback
CALENDAR_ID=your_calendar_id
```

## Template Setup

The template file `GCalEventsList.md` exists in two locations and both are tracked by git:
- **Project folder**: `Google Calendar Obsidian Events/GCalEventsList.md` (source of truth)
- **Templates folder**: `Templates/GCalEventsList.md` (used by Obsidian Templater)

**Important**: After editing the template, you must manually copy it from the project folder to the Templates folder. Both files are tracked by the same git repository (vault-level) to ensure version control.

```powershell
# Copy updated template to Templates folder
Copy-Item "Google Calendar Obsidian Events\GCalEventsList.md" "Templates\GCalEventsList.md" -Force
```

## Usage

### In Obsidian

Create a button with the Buttons plugin:
- **Button Text**: "📅 Get Calendar Events"
- **Action**: "Templater: Insert Template"
- **Template**: Select `GCalEventsList`

### From Terminal

```bash
node cli.js 2024-10-22
```

## How It Works

**Smart Date Detection:**
- **Daily Notes**: If run from a file named like "2024-10-22" or "2024/10/22", defaults to that date
- **Regular Notes**: Defaults to today (or previous day if before 5am)
- **Manual Override**: Always allows selecting a different date in the picker

**Day Boundaries:**
- **Wake Up**: Time when the FIRST "Sleep" event > 2 hours **ended** on the target date (or midnight if none)
  - Looks for sleep events that END on the target date (handles overnight sleep correctly)
  - Example: Sleep from 11:45 PM (prev day) → 9:30 AM (target day) = Wake Up at 9:30 AM
- **Sleep**: Time when your next evening/nighttime "Sleep" event begins (after 6:00 PM, or next day if before 6:00 PM)
  - Excludes daytime naps (sleep events before 6:00 PM)
  - Defaults to 5:00 AM next day if no qualifying sleep event found
  - Example: Sleep at 11:45 PM on target date is used (not a 1:15 PM nap)
- **Events**: Only shows events between wake up and sleep times
- **Sleep Filtering**: Actual Sleep calendar events are excluded from the daily log (only boundary markers shown)

**Output Format:**

Clean event listing with color squares and wake up/sleep times:
```
08:30 AM - ⬛ **Wake Up**          (grey #7c7c7c)
10:15 AM - 🟩 **Meeting with Team** (dark theme colors)
02:00 PM - 🟨 **Lunch**            (dark theme colors)
01:00 AM - ⬛ **Sleep**             (grey #7c7c7c)
```

**Color Scheme:**
- **Wake Up/Sleep**: Grey (#7c7c7c) - hardcoded for boundary markers
- **Default Calendar Color**: Custom override (#00aaff) for events without explicit colors
- **Google Calendar Colors**: Dark theme variants for all numbered colors (1-11)
  - Color 1 (Lavender): #828bc2
  - Color 2 (Sage): #33b679
  - Color 3 (Grape): #9e69af
  - Color 4 (Flamingo): #e67c73
  - Color 5 (Banana): #f6bf26
  - Color 6 (Tangerine): #f4511e
  - Color 7 (Peacock): #039be5
  - Color 8 (Graphite): #616161
  - Color 9 (Blueberry): #3f51b5
  - Color 10 (Basil): #0b8043
  - Color 11 (Tomato): #d50000

## File Structure

This project uses a vault-level git repository with selective `.gitignore` to track:
- All files in the `Google Calendar Obsidian Events/` folder
- The template file `Templates/GCalEventsList.md`

```
Obsidian Vault/
├── .git/                                    # Git repository (vault level)
├── .gitignore                               # Tracks only GCal folder + template
├── Google Calendar Obsidian Events/
│   ├── main.js                              # Main application
│   ├── cli.js                               # CLI interface
│   ├── googleCalendarAPI.js                 # Google Calendar API
│   ├── dateUtils.js                         # Day boundary logic
│   ├── GCalEventsList.md                    # Template (source)
│   ├── package.json                         # Dependencies
│   └── .env                                 # OAuth credentials
└── Templates/
    └── GCalEventsList.md                    # Template (copy for Obsidian)
```

## Migration Scripts

Several migration scripts are available for updating existing daily notes:

- `migrate-colors.js` - Migrates old #a4bdfc colors to #00aaff (default override)
- `migrate-sleep-to-grey.js` - Updates Sleep events to grey color
- `migrate-wakeup-to-grey.js` - Updates Wake Up events to grey color
- `migrate-grey-to-darker-grey.js` - Changes grey from #e1e1e1 to #7c7c7c
- `migrate-to-dark-theme-colors.js` - Converts all colors from light to dark theme
- `fix-lavender-colors.js` - Re-fetches from Google Calendar to fix color 1 events
- `fix-lavender-to-828bc2.js` - Updates lavender from #8e8e8e to #828bc2

**Usage:**
```bash
cd "Google Calendar Obsidian Events"
node fix-lavender-to-828bc2.js
```

**Note**: After running migrations, reload Obsidian and re-run the template button on daily notes to ensure all events have the latest color scheme.

## Recent Bug Fixes (2025-11-11)

### Fixed: Incorrect Day End Time
**Problem**: Sleep boundary was showing 5:00 AM (default) instead of actual nighttime sleep time (e.g., 11:45 PM)

**Cause**: Code was looking for sleep events on the NEXT calendar day only, but sleep events often start on the same day in the evening

**Fix**: Updated `getDayEndTime()` to find sleep events that start after 6:00 PM on target date OR on the next day, properly excluding afternoon naps

### Fixed: Midnight Sleep Edge Case
**Problem**: When sleep starts at exactly midnight (12:00 AM next day), wake-up time showed as 12:00 AM instead of actual wake time (e.g., 9:30 AM)

**Cause**: `getDayStartTime()` was filtering sleep events by START date instead of END date, missing overnight sleep events

**Fix**: Updated to directly filter sleep events by their END date on the target date, properly handling overnight sleep

## Troubleshooting

- **Authentication**:
  - **Obsidian/Templater**: Re-run the template and click the auth link appended to the note
  - **Terminal**: Run `node main.js` to re-authenticate
- **Missing Events**: Check `CALENDAR_ID` in `.env`
- **Template Issues**: Ensure template is in Templater folder and reload Obsidian after updates
- **Setup Check**: Run `node setup-check.js` to diagnose issues
- **Wrong Colors**: Re-run the template button on affected daily notes to refresh with current color scheme
