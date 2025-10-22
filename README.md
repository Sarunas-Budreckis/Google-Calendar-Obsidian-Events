# Google Calendar Obsidian Integration

A simple integration that fetches Google Calendar events and inserts them into Obsidian notes using Templater and the Buttons plugin.

## Features

- **Custom Day Logic**: Uses "Sleep" events to define day boundaries
- **Wake Up & Sleep Times**: Automatically adds wake up and sleep times based on your sleep schedule
- **Time Formatting**: Shows events with formatted times and bold names
- **Date Picker**: Interactive date selection in Obsidian
- **CLI Support**: Can be run directly from terminal

## Quick Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create `.env` file with your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   CALENDAR_ID=your_calendar_id
   ```

3. **Authenticate**:
   ```bash
   node main.js
   ```

4. **Copy Template**:
   Copy `GCalEventsList.md` to your Templater templates folder

5. **Test Setup**:
   ```bash
   node setup-check.js
   ```

## Usage

### In Obsidian

1. **Create Button**: Add a button using the Buttons plugin
2. **Button Configuration**:
   - **Button Text**: "📅 Get Calendar Events"
   - **Action**: "Templater: Insert Template"
   - **Template**: Select `GCalEventsList`

### From Terminal

```bash
node cli.js 2024-10-22
```

## File Structure

```
Google Calendar Obsidian Events/
├── main.js              # Main application
├── cli.js               # Command-line interface
├── googleCalendarAPI.js # Google Calendar API wrapper
├── dateUtils.js         # Custom day boundary logic
├── auth.js              # Authentication helper
├── setup-check.js       # Environment validation
├── package.json         # Dependencies
└── .env                 # Environment variables

Templates/
└── GCalEventsList.md    # Templater template
```

## Custom Day Logic

The integration defines a "day" based on "Sleep" events:
- **Start**: After the last "Sleep" event (or 12:01 AM)
- **End**: Before the first "Sleep" event the next day (or 5:00 AM)
- **Excludes**: All-day events
- **Includes**: Events that span across midnight

## Output Format

Events are formatted with wake up and sleep times:
```
- 08:30 AM - **Wake Up**
- 10:15 AM - **Event Name**
- 11:30 AM - **Another Event**
- 01:00 AM - **Sleep**
```

## Troubleshooting

- **Authentication Issues**: Run `node main.js` to re-authenticate
- **Missing Events**: Check your calendar ID in `.env`
- **Template Errors**: Ensure `GCalEventsList.md` is in your Templater templates folder