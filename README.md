# Google Calendar Obsidian Integration

Fetch Google Calendar events and insert them into Obsidian notes with custom day boundaries based on your sleep schedule.

## Features

- **Sleep-Based Day Logic**: Day starts after your last "Sleep" event, ends before your next one
- **Wake Up & Sleep Times**: Automatically shows when you wake up and go to sleep
- **Smart Date Picker**: HTML modal with native calendar picker, defaults to daily note date or today
- **Daily Note Integration**: Automatically detects daily notes and defaults to that date
- **Clean Output**: Direct event listing with color squares and no headers
- **CLI Support**: Run directly from terminal

## Quick Setup

1. **Install**: `npm install`
2. **Configure**: Create `.env` with Google OAuth credentials (see below)
3. **Authenticate**: `node main.js`
4. **Setup Template**: See "Template Setup" section below
5. **Test**: `node setup-check.js`

### Environment Variables

Create `.env` file:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
CALENDAR_ID=your_calendar_id
```

## Template Setup

### Option 1: Hard Link (Recommended)

Keep all code in one directory while making the template available to Obsidian:

```powershell
# Run as Administrator
cd "C:\Users\YourName\Documents\Obsidian Vaults\YourVault\Templates"
New-Item -ItemType HardLink -Path "GCalEventsList.md" -Target "..\Google Calendar Obsidian Events\GCalEventsList.md"
```

**Benefits:**
- Single source of truth for the template
- Changes automatically sync to Obsidian
- Template is version controlled with your code

### Option 2: Manual Copy

Copy `GCalEventsList.md` to your Templater templates folder whenever you make changes.

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
- **Wake Up**: Time when your last "Sleep" event ended (or 12:01 AM)
- **Sleep**: Time when your next "Sleep" event begins (or 5:00 AM next day)
- **Events**: Only shows events between wake up and sleep times

**Output Format:**

Clean event listing with color squares and wake up/sleep times:
```
08:30 AM - 🟦 **Wake Up**
10:15 AM - 🟩 **Meeting with Team**
02:00 PM - 🟨 **Lunch**
01:00 AM - 🟦 **Sleep**
```

## File Structure

```
Google Calendar Obsidian Events/
├── main.js              # Main application
├── cli.js               # CLI interface
├── googleCalendarAPI.js # Google Calendar API
├── dateUtils.js         # Day boundary logic
├── GCalEventsList.md    # Templater template
├── package.json         # Dependencies
└── .env                 # OAuth credentials
```

## Troubleshooting

- **Authentication**: Run `node main.js` to re-authenticate
- **Missing Events**: Check `CALENDAR_ID` in `.env`
- **Template Issues**: Ensure template is in Templater folder or hard linked
- **Setup Check**: Run `node setup-check.js` to diagnose issues